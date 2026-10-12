/**
 * Relais http → https pour les flux HLS de la playlist (voir api/_relay-lib.js).
 *
 * GET /api/relay?u=<adresse http://… encodée>
 *  - n'accepte que les serveurs http:// présents dans public/playlist.json (liste embarquée au déploiement) ;
 *  - listes de lecture (.m3u8) : lues puis réécrites pour que segments et variantes repassent par ici ;
 *  - segments : transmis en flux, plafonnés, mis en cache par le CDN pour que plusieurs spectateurs d'une
 *    même chaîne ne coûtent qu'une lecture du serveur d'origine ;
 *  - redirections suivies à la main (3 max) et revérifiées contre la liste ;
 *  - limite par IP en mémoire (garde-fou, pas une protection forte).
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import {
  allowedOriginsFrom,
  parseTarget,
  rewriteManifest,
  isManifest,
  MAX_MANIFEST_BYTES,
  MAX_SEGMENT_BYTES,
} from './_relay-lib.js';

const UPSTREAM_TIMEOUT_MS = 12000;
const RATE_LIMIT_PER_MIN = 900;
const ipHits = new Map();

let cached = null; // { origins, at }
async function getAllowedOrigins() {
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.origins;
  const file = join(process.cwd(), 'public', 'playlist.json');
  const origins = allowedOriginsFrom(JSON.parse(await readFile(file, 'utf8')));
  cached = { origins, at: Date.now() };
  return origins;
}

function rateOk(ip) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < 60000);
  if (hits.length >= RATE_LIMIT_PER_MIN) return false;
  hits.push(now);
  ipHits.set(ip, hits);
  if (ipHits.size > 5000) ipHits.clear();
  return true;
}

/** Adresse à interroger : l'hôte vient de NOTRE liste (jamais de la chaîne reçue), seuls chemin et paramètres viennent de la demande. */
function upstreamHref(target, allowed) {
  for (const origin of allowed) {
    if (origin === target.origin) return `${origin}${target.pathname}${target.search}`;
  }
  return null;
}

async function fetchUpstream(target, allowed, range) {
  let current = target;
  for (let hop = 0; hop < 4; hop++) {
    const href = upstreamHref(current, allowed);
    if (!href) return null;
    // nosemgrep: faux positif SSRF — l'hôte de `href` vient de la liste des serveurs de la playlist (upstreamHref),
    // jamais de la demande ; seuls chemin et paramètres sont libres. Cas refusés testés : src/utils/__tests__/relay.test.ts.
    const res = await fetch(href, {
      redirect: 'manual',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36',
        Accept: '*/*',
        ...(range ? { Range: range } : {}),
      },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get('location')) {
      const next = parseTarget(new URL(res.headers.get('location'), current).href, allowed);
      if (!next) return null;
      current = next;
      continue;
    }
    return { res, finalUrl: current };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
  if (!rateOk(ip)) return res.status(429).json({ error: 'Rate limit exceeded' });

  let allowed;
  try {
    allowed = await getAllowedOrigins();
  } catch {
    return res.status(500).json({ error: 'Playlist indisponible' });
  }
  const raw = Array.isArray(req.query?.u) ? req.query.u[0] : req.query?.u;
  const target = parseTarget(raw, allowed);
  if (!target) return res.status(400).json({ error: 'Adresse non autorisée' });

  let upstream;
  try {
    upstream = await fetchUpstream(target, allowed, req.headers.range);
  } catch {
    return res.status(504).json({ error: 'Le serveur du flux ne répond pas' });
  }
  if (!upstream) return res.status(502).json({ error: 'Redirection refusée' });
  const { res: up, finalUrl } = upstream;
  if (!up.ok && up.status !== 206) {
    res.setHeader('Cache-Control', 'public, s-maxage=5');
    return res.status(up.status === 404 || up.status === 403 || up.status === 451 ? up.status : 502).json({ error: `Flux : HTTP ${up.status}` });
  }

  const contentType = up.headers.get('content-type') || '';
  const declared = Number(up.headers.get('content-length') || 0);

  if (/\.m3u8?($|\?)/i.test(finalUrl.href) || /mpegurl/i.test(contentType)) {
    if (declared > MAX_MANIFEST_BYTES) return res.status(502).json({ error: 'Liste trop volumineuse' });
    const text = await up.text();
    if (text.length > MAX_MANIFEST_BYTES || !isManifest(contentType, finalUrl.href, text)) {
      return res.status(502).json({ error: 'Liste de lecture invalide' });
    }
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'public, s-maxage=2, stale-while-revalidate=4');
    return res.status(200).send(rewriteManifest(text, finalUrl.href));
  }

  if (declared > MAX_SEGMENT_BYTES) return res.status(502).json({ error: 'Segment trop volumineux' });
  res.status(up.status);
  res.setHeader('Content-Type', contentType || 'application/octet-stream');
  for (const h of ['content-length', 'content-range', 'accept-ranges']) {
    const v = up.headers.get(h);
    if (v) res.setHeader(h, v);
  }
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=30');
  if (req.method === 'HEAD' || !up.body) return res.end();

  let sent = 0;
  const cap = new Transform({
    transform(chunk, _enc, cb) {
      sent += chunk.length;
      if (sent > MAX_SEGMENT_BYTES) return cb(new Error('Segment trop volumineux'));
      cb(null, chunk);
    },
  });
  Readable.fromWeb(up.body)
    .on('error', () => res.destroy())
    .pipe(cap)
    .on('error', () => res.destroy())
    .pipe(res);
}
