/**
 * Vercel Cron — vérification d'uptime des sites de l'annuaire.
 *
 * Déclenché par le cron défini dans vercel.json. Côté serveur, donc
 * AUCUNE restriction CORS : on ping réellement chaque site.
 *
 * - Lit /sites.json depuis le déploiement courant
 * - Teste chaque URL (HEAD puis GET fallback, timeout 8s)
 * - Si Supabase est configuré (SUPABASE_URL + SUPABASE_SERVICE_KEY),
 *   écrit le statut dans la table `site_status` (upsert)
 * - Renvoie un résumé JSON
 *
 * Sécurité : Vercel Cron envoie l'en-tête `Authorization: Bearer ${CRON_SECRET}`
 * si CRON_SECRET est défini dans les variables d'env.
 */

const TIMEOUT_MS = 8000;

async function ping(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    // HEAD d'abord (léger), GET en secours si HEAD non supporté
    let res = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (res.status >= 400) {
      res = await fetch(url, { method: 'GET', redirect: 'follow', signal: controller.signal });
    }
    clearTimeout(timer);
    return res.status < 500 ? 'online' : 'offline';
  } catch {
    clearTimeout(timer);
    return 'offline';
  }
}

export default async function handler(req, res) {
  // Vérification du secret cron (optionnelle mais recommandée)
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const base = `${proto}://${host}`;

  let sites = [];
  try {
    const r = await fetch(`${base}/sites.json`);
    sites = await r.json();
  } catch (err) {
    res.status(500).json({ error: 'cannot load sites.json', detail: String(err) });
    return;
  }

  const results = await Promise.all(
    sites.map(async (s) => ({ id: s.id, url: s.url, status: await ping(s.url) })),
  );

  // Écriture Supabase (si configuré)
  const SB_URL = process.env.SUPABASE_URL;
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  let persisted = false;
  if (SB_URL && SB_KEY) {
    try {
      await fetch(`${SB_URL}/rest/v1/site_status`, {
        method: 'POST',
        headers: {
          apikey: SB_KEY,
          Authorization: `Bearer ${SB_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(
          results.map((r) => ({
            site_id: r.id,
            status: r.status,
            checked_at: new Date().toISOString(),
          })),
        ),
      });
      persisted = true;
    } catch {
      /* on renvoie quand même les résultats */
    }
  }

  const online = results.filter((r) => r.status === 'online').length;
  res.status(200).json({
    checked: results.length,
    online,
    offline: results.length - online,
    persisted,
    results,
  });
}
