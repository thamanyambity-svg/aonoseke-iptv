/**
 * Orchestrateur des agents IA — Smart-Stream Ad Matrix.
 *
 * UN seul cron Vercel (limites de plan) qui : (1) rafraîchit un snapshot
 * d'audience, puis lance les 4 agents. Chaque agent ANALYSE et PROPOSE via
 * `agent_propose` — RÈGLE D'OR : aucun n'exécute d'action ; tout passe par la
 * validation admin dans la Console IA (`admin_resolve_agent_proposal`).
 *
 *  - Sentinel  : anti-fraude (ad_events : rafales IP/signature, CTR anormal) → quarantine_events
 *  - Yield     : tarification dynamique (audience_snapshots, formule P_opt) → set_weight
 *  - Swarm     : bascule d'audience (part mobile en hausse) → migrate_channel
 *  - Context   : déclencheur météo (Open-Meteo, gratuit/sans clé) → creative_swap
 *
 * Sécurité : Vercel Cron (Authorization: Bearer CRON_SECRET) ; Supabase service_role.
 * @module /api/agents-run
 */

const SB_URL = process.env.SUPABASE_URL;
const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
const LAMBDA = 0.6;            // sensibilité Yield
const YIELD_DEV = 0.15;       // déviation d'audience déclenchant Yield (15%)
const SWARM_SHIFT = 0.15;     // hausse de part mobile déclenchant Swarm
const CLICK_BURST = 20;       // seuil rafale Sentinel
const SUSPICIOUS_CTR = 0.25;
const MIN_IMPR_CTR = 50;

function H(extra = {}) {
  return { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, ...extra };
}
async function sel(path) {
  const r = await fetch(`${SB_URL}/rest/v1/${path}`, { headers: H() });
  if (!r.ok) throw new Error(`select ${path} ${r.status}`);
  return r.json();
}
async function rpc(fn, body) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers: H({ 'Content-Type': 'application/json' }), body: JSON.stringify(body || {}),
  });
  if (!r.ok) throw new Error(`rpc ${fn} ${r.status}`);
  return r.json();
}
const propose = (p) => rpc('agent_propose', p);

/** Campagnes déjà proposées (pending) par un agent → évite les doublons. */
async function pendingSet(agent) {
  const rows = await sel(`agent_proposals?status=eq.pending&agent=eq.${agent}&select=target_campaign_id`);
  return new Set(rows.map((r) => r.target_campaign_id));
}

// ── Sentinel ────────────────────────────────────────────────────────────────
async function runSentinel(active) {
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const events = await sel(`ad_events?created_at=gte.${since}&suspect=eq.false&select=campaign_id,event_type,ip,signature`);
  const by = new Map();
  for (const e of events) {
    if (!e.campaign_id) continue;
    let c = by.get(e.campaign_id);
    if (!c) { c = { imp: 0, clk: 0, ip: new Map(), sig: new Map() }; by.set(e.campaign_id, c); }
    if (e.event_type === 'impression') c.imp++;
    else if (e.event_type === 'click') {
      c.clk++;
      if (e.ip) c.ip.set(e.ip, (c.ip.get(e.ip) || 0) + 1);
      if (e.signature) c.sig.set(e.signature, (c.sig.get(e.signature) || 0) + 1);
    }
  }
  const seen = await pendingSet('sentinel');
  let n = 0;
  for (const [cid, c] of by) {
    if (seen.has(cid)) continue;
    const topIp = [...c.ip.values()].sort((a, b) => b - a)[0] || 0;
    const topSig = [...c.sig.values()].sort((a, b) => b - a)[0] || 0;
    const ctr = c.imp > 0 ? c.clk / c.imp : 0;
    let reason = null, count = 0, conf = 0;
    if (topIp >= CLICK_BURST) { reason = `rafale de ${topIp} clics d'une même IP`; count = topIp; conf = 0.9; }
    else if (topSig >= CLICK_BURST) { reason = `rafale de ${topSig} clics de même signature`; count = topSig; conf = 0.88; }
    else if (c.imp >= MIN_IMPR_CTR && ctr > SUSPICIOUS_CTR) { reason = `CTR anormal ${(ctr * 100).toFixed(0)}%`; count = c.clk; conf = 0.78; }
    if (!reason) continue;
    await propose({ p_agent: 'sentinel', p_kind: 'quarantine_events', p_title: `Quarantaine de ~${count} clics suspects`,
      p_summary: `Anomalie : ${reason}. Quarantaine (réversible) recommandée avant le rapport client.`,
      p_payload: { event_type: 'click', count, reason }, p_target_campaign_id: cid, p_confidence: conf });
    n++;
  }
  return n;
}

// ── Yield Management ────────────────────────────────────────────────────────
async function runYield(active, snaps) {
  if (snaps.length < 4) return 0;
  const vNow = snaps[0].active_devices;
  const rest = snaps.slice(1);
  const vAvg = rest.reduce((s, x) => s + x.active_devices, 0) / rest.length;
  if (vAvg <= 0) return 0;
  const dev = (vNow - vAvg) / vAvg;
  if (Math.abs(dev) < YIELD_DEV) return 0;
  const seen = await pendingSet('yield');
  let n = 0;
  for (const c of active.slice(0, 5)) {
    if (seen.has(c.id)) continue;
    const w = Math.max(1, Math.min(100, Math.round(c.weight * (1 + LAMBDA * dev))));
    if (w === c.weight) continue;
    const pct = (dev * 100).toFixed(0);
    await propose({ p_agent: 'yield', p_kind: 'set_weight',
      p_title: `${dev > 0 ? 'Hausse' : 'Baisse'} de poids ${c.weight}→${w} · ${c.name}`,
      p_summary: `Audience ${pct}% vs moyenne (V=${vNow} / V̄=${vAvg.toFixed(0)}). P_opt = P_base × (1 + ${LAMBDA}·${(dev).toFixed(2)}) → poids ${w}.`,
      p_payload: { weight: w, prev: c.weight, deviation: Number(dev.toFixed(3)) }, p_target_campaign_id: c.id, p_confidence: Math.min(0.92, 0.6 + Math.abs(dev)) });
    n++;
  }
  return n;
}

// ── Swarm Delivery (bascule mobile) ─────────────────────────────────────────
async function runSwarm(active, snaps) {
  if (snaps.length < 4) return 0;
  const share = (s) => (s.active_devices > 0 ? s.mobile / s.active_devices : 0);
  const now = share(snaps[0]);
  const rest = snaps.slice(1);
  const avg = rest.reduce((s, x) => s + share(x), 0) / rest.length;
  if (now - avg < SWARM_SHIFT) return 0;
  const seen = await pendingSet('swarm');
  let n = 0;
  for (const c of active.slice(0, 3)) {
    if (seen.has(c.id)) continue;
    await propose({ p_agent: 'swarm', p_kind: 'migrate_channel',
      p_title: `Recibler mobile (+${((now - avg) * 100).toFixed(0)} pts) · ${c.name}`,
      p_summary: `Part d'audience mobile en hausse (${(now * 100).toFixed(0)}% vs ${(avg * 100).toFixed(0)}% en moyenne). Recibler la campagne vers les contenus mobiles pour suivre les spectateurs.`,
      p_payload: { to: 'mobile', categories: ['Mobile', 'Sport', 'Info'] }, p_target_campaign_id: c.id, p_confidence: 0.7 });
    n++;
  }
  return n;
}

// ── Contextualisation (météo Open-Meteo, gratuit/sans clé) ───────────────────
async function runContext(active) {
  let rain = false, mm = 0;
  try {
    const r = await fetch('https://api.open-meteo.com/v1/forecast?latitude=-4.32&longitude=15.31&current=precipitation,weather_code');
    const w = await r.json();
    mm = w?.current?.precipitation ?? 0;
    const code = w?.current?.weather_code ?? 0;
    rain = mm > 0 || [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99].includes(code);
  } catch { return 0; }
  if (!rain) return 0;
  const seen = await pendingSet('context');
  let n = 0;
  for (const c of active.slice(0, 3)) {
    if (seen.has(c.id)) continue;
    await propose({ p_agent: 'context', p_kind: 'creative_swap',
      p_title: `Variante « pluie » · ${c.name}`,
      p_summary: `Pluie détectée sur Kinshasa (${mm} mm, flux Open-Meteo). Basculer sur une créa adaptée « pluie/intérieur » — historiquement plus performante par mauvais temps.`,
      p_payload: { variant: 'rain', zone: 'Kinshasa', precipitation_mm: mm }, p_target_campaign_id: c.id, p_confidence: 0.64 });
    n++;
  }
  return n;
}

export default async function handler(req, res) {
  const secret = process.env.CRON_SECRET;
  if (secret && (req.headers.authorization || '') !== `Bearer ${secret}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  if (!SB_URL || !SB_KEY) return res.status(200).json({ ok: true, reason: 'supabase non configuré' });

  const out = { snapshot: null, sentinel: 0, yield: 0, swarm: 0, context: 0, errors: [] };
  try { out.snapshot = (await rpc('record_audience_snapshot', {})); } catch (e) { out.errors.push('snapshot: ' + e.message); }

  let active = [], snaps = [];
  try { active = await sel('campaigns?status=eq.active&select=id,name,weight&order=weight.desc&limit=10'); } catch (e) { out.errors.push('campaigns: ' + e.message); }
  try { snaps = await sel('audience_snapshots?select=active_devices,mobile,desktop,tv,taken_at&order=taken_at.desc&limit=24'); } catch (e) { out.errors.push('snapshots: ' + e.message); }

  for (const [k, fn] of [['sentinel', () => runSentinel(active)], ['yield', () => runYield(active, snaps)],
    ['swarm', () => runSwarm(active, snaps)], ['context', () => runContext(active)]]) {
    try { out[k] = await fn(); } catch (e) { out.errors.push(`${k}: ${e.message}`); }
  }

  return res.status(200).json({ ok: true, ...out, active_campaigns: active.length, snapshots: snaps.length });
}
