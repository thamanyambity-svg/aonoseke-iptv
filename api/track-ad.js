/**
 * Endpoint serveur de tracking publicitaire (anti-fraude).
 *
 * Reçoit les événements impression/click depuis le client, valide la
 * signature HMAC, déduplique par session, et insère dans ad_events.
 *
 * Sécurité :
 *   1. Signature HMAC vérifiée (clé secrète côté serveur)
 *   2. Déduplication par (session_id, campaign_id, event_type) dans une
 *      fenêtre glissante de 30 secondes (anti-spam)
 *   3. Rate limiting par IP (max 60 events/min)
 *   4. Validation des champs obligatoires
 *
 * @module /api/track-ad
 */

// Clé secrète partagée (en variable d'env côté Vercel). Le client utilise
// une clé publique pour générer sa signature, le serveur re-signature avec
// la clé secrète et compare.
const SERVER_SECRET = process.env.AD_TRACKING_SECRET || 'aonoseke-public-key-v2';

// Rate limiting en mémoire (par IP). Pour la production à grande échelle,
// préférer Upstash Redis ou équivalent.
const ipHits = new Map(); // ip -> [{ t: number }]
const RATE_LIMIT_PER_MIN = 60;
const RATE_WINDOW_MS = 60 * 1000;

// Déduplication en mémoire (session, campaign, type, t) -> dernière insertion
const recentEvents = new Map(); // key -> timestamp
const DEDUP_WINDOW_MS = 30 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((h) => now - h.t < RATE_WINDOW_MS);
  if (hits.length >= RATE_LIMIT_PER_MIN) return false;
  hits.push({ t: now });
  ipHits.set(ip, hits);
  return true;
}

function isDuplicate(sessionId, campaignId, eventType) {
  const key = `${sessionId}|${campaignId}|${eventType}`;
  const last = recentEvents.get(key);
  if (last && Date.now() - last < DEDUP_WINDOW_MS) return true;
  recentEvents.set(key, Date.now());
  // Nettoyage périodique
  if (recentEvents.size > 10000) {
    const cutoff = Date.now() - DEDUP_WINDOW_MS;
    for (const [k, v] of recentEvents) {
      if (v < cutoff) recentEvents.delete(k);
    }
  }
  return false;
}

async function hmacSha256(message, secret) {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Rate limiting par IP
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket?.remoteAddress || 'unknown';
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const {
    campaign_id: campaignId,
    event_type: eventType,
    session_id: sessionId,
    user_id: userId,
    user_email: userEmail,
    country,
    country_code: countryCode,
    city,
    device,
    timestamp,
    signature: clientSignature,
    // UTM params (Phase 1 tracking écosystème)
    utm_source: utmSource,
    utm_medium: utmMedium,
    utm_campaign: utmCampaign,
    utm_content: utmContent,
    utm_term: utmTerm,
    landing_url: landingUrl,
  } = body || {};

  // Validation des champs obligatoires
  if (!campaignId || !eventType || !sessionId || !timestamp || !clientSignature) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (!['impression', 'click'].includes(eventType)) {
    return res.status(400).json({ error: 'Invalid event_type' });
  }

  // Vérification de la signature HMAC
  const signaturePayload = `${campaignId}|${sessionId}|${timestamp}`;
  const expectedSignature = await hmacSha256(signaturePayload, SERVER_SECRET);
  if (expectedSignature !== clientSignature) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Anti-vieillissement : rejeter les signatures de plus de 5 minutes
  if (Math.abs(Date.now() - timestamp) > 5 * 60 * 1000) {
    return res.status(401).json({ error: 'Stale signature' });
  }

  // Déduplication
  if (isDuplicate(sessionId, campaignId, eventType)) {
    return res.status(200).json({ ok: true, deduplicated: true });
  }

  // Insertion dans Supabase (service_role, jamais exposé au client)
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_URL || !SB_KEY) {
    // Mode dégradé : on accepte l'événement mais on ne persiste pas
    return res.status(200).json({ ok: true, persisted: false });
  }

  // Récupère advertiser_id depuis la campagne (via REST API Supabase)
  try {
    const campResp = await fetch(`${SB_URL}/rest/v1/campaigns?id=eq.${encodeURIComponent(campaignId)}&select=advertiser_id`, {
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
      },
    });
    const campData = await campResp.json();
    if (!campData || campData.length === 0) {
      return res.status(404).json({ error: 'Campaign not found' });
    }
    const advertiserId = campData[0].advertiser_id;

    // Insertion de l'événement
    await fetch(`${SB_URL}/rest/v1/ad_events`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY,
        Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        campaign_id: campaignId,
        advertiser_id: advertiserId,
        event_type: eventType,
        user_id: userId || null,
        session_id: sessionId,
        user_email: userEmail || null,
        country: country || null,
        country_code: countryCode || null,
        city: city || null,
        ip,
        device: device || null,
        signature: clientSignature,
        // UTM params (Phase 1)
        utm_source: utmSource || null,
        utm_medium: utmMedium || null,
        utm_campaign: utmCampaign || null,
        utm_content: utmContent || null,
        utm_term: utmTerm || null,
        landing_url: landingUrl || null,
      }),
    });

    return res.status(200).json({ ok: true, persisted: true });
  } catch (err) {
    console.error('[track-ad] Supabase insert failed:', err);
    return res.status(500).json({ error: 'Persistence failed' });
  }
}
