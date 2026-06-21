/**
 * Agent Sentinel — détection d'anomalies de clics/vues (anti-fraude).
 *
 * Job serveur (Vercel Cron). Scanne les `ad_events` récents, détecte les
 * anomalies (rafales de clics même IP/signature = bot/rejeu, CTR impossible),
 * et — conformément à la RÈGLE D'OR — N'EXÉCUTE AUCUNE ACTION : il crée des
 * propositions via `agent_propose` (kind='quarantine_events') que l'admin
 * validera ou rejettera dans la Console IA. La quarantaine réelle (flag
 * ad_events.suspect) n'a lieu qu'au clic VALIDER, côté serveur.
 *
 * Sécurité : déclenché par Vercel Cron (Authorization: Bearer CRON_SECRET) ;
 * accès Supabase via service_role (REST), jamais exposé au client.
 *
 * @module /api/agent-sentinel
 */

const WINDOW_HOURS = 24;            // fenêtre d'analyse
const MIN_CLICKS_BURST = 20;       // seuil rafale par (campagne, IP) ou (campagne, signature)
const SUSPICIOUS_CTR = 0.25;       // CTR > 25% avec volume suffisant = anormal
const MIN_IMPRESSIONS_FOR_CTR = 50;

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;

function sbHeaders(extra = {}) {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...extra };
}

async function sbSelect(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: sbHeaders() });
  if (!r.ok) throw new Error(`Supabase select ${r.status}`);
  return r.json();
}

async function agentPropose(payload) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/agent_propose`, {
    method: 'POST',
    headers: sbHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!r.ok) throw new Error(`agent_propose ${r.status}`);
  return r.json();
}

export default async function handler(req, res) {
  // 1. Auth cron (si CRON_SECRET défini)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SB_URL || !SB_KEY) {
    return res.status(200).json({ ok: true, scanned: false, reason: 'supabase non configuré' });
  }

  const since = new Date(Date.now() - WINDOW_HOURS * 3600 * 1000).toISOString();

  // 2. Charger les events récents non encore quarantinés
  let events;
  try {
    events = await sbSelect(
      `ad_events?created_at=gte.${since}&suspect=eq.false&select=campaign_id,event_type,ip,signature`,
    );
  } catch (err) {
    return res.status(500).json({ error: 'load events failed', detail: String(err) });
  }

  // 3. Agrégation par campagne
  const byCampaign = new Map();
  for (const e of events) {
    if (!e.campaign_id) continue;
    let c = byCampaign.get(e.campaign_id);
    if (!c) { c = { impressions: 0, clicks: 0, ipClicks: new Map(), sigClicks: new Map() }; byCampaign.set(e.campaign_id, c); }
    if (e.event_type === 'impression') c.impressions++;
    else if (e.event_type === 'click') {
      c.clicks++;
      if (e.ip) c.ipClicks.set(e.ip, (c.ipClicks.get(e.ip) || 0) + 1);
      if (e.signature) c.sigClicks.set(e.signature, (c.sigClicks.get(e.signature) || 0) + 1);
    }
  }

  // 4. Ne pas reproposer ce qui est déjà en attente
  let pending = [];
  try {
    pending = await sbSelect(`agent_proposals?agent=eq.sentinel&status=eq.pending&select=target_campaign_id`);
  } catch { /* on continue sans dédoublonnage si l'appel échoue */ }
  const alreadyProposed = new Set(pending.map((p) => p.target_campaign_id));

  // 5. Détection + génération de propositions (jamais d'action directe)
  const created = [];
  for (const [campaignId, c] of byCampaign) {
    if (alreadyProposed.has(campaignId)) continue;

    const topIp = [...c.ipClicks.entries()].sort((a, b) => b[1] - a[1])[0];
    const topSig = [...c.sigClicks.entries()].sort((a, b) => b[1] - a[1])[0];
    const ctr = c.impressions > 0 ? c.clicks / c.impressions : 0;

    let reason = null;
    let count = 0;
    let confidence = 0;
    if (topIp && topIp[1] >= MIN_CLICKS_BURST) {
      reason = `rafale de ${topIp[1]} clics depuis une même IP`;
      count = topIp[1]; confidence = 0.9;
    } else if (topSig && topSig[1] >= MIN_CLICKS_BURST) {
      reason = `rafale de ${topSig[1]} clics de même signature (rejeu probable)`;
      count = topSig[1]; confidence = 0.88;
    } else if (c.impressions >= MIN_IMPRESSIONS_FOR_CTR && ctr > SUSPICIOUS_CTR) {
      reason = `CTR anormal ${(ctr * 100).toFixed(0)}% (${c.clicks} clics / ${c.impressions} impressions)`;
      count = c.clicks; confidence = 0.78;
    }
    if (!reason) continue;

    try {
      await agentPropose({
        p_agent: 'sentinel',
        p_kind: 'quarantine_events',
        p_title: `Quarantaine de ~${count} clics suspects`,
        p_summary: `Anomalie détectée : ${reason}. Mise en quarantaine (réversible) recommandée avant la génération du rapport client, pour préserver la pureté des KPI commerciaux.`,
        p_payload: { event_type: 'click', count, reason },
        p_target_campaign_id: campaignId,
        p_confidence: confidence,
      });
      created.push({ campaignId, reason, count });
    } catch (err) {
      console.error('[sentinel] propose failed', err);
    }
  }

  return res.status(200).json({
    ok: true,
    window_hours: WINDOW_HOURS,
    events_scanned: events.length,
    campaigns_analyzed: byCampaign.size,
    proposals_created: created.length,
    created,
  });
}
