/**
 * Vérification « jouable pour de vrai » d'un flux HLS (bien plus stricte que stream-status.checkStream) :
 *   1. la liste de lecture répond et c'est du HLS ;
 *   2. si c'est une liste maître, on suit la première variante ;
 *   3. la liste de lecture n'est pas terminée (#EXT-X-ENDLIST), pas protégée par DRM (SAMPLE-AES, Widevine,
 *      FairPlay), et sa clé AES-128 éventuelle est accessible ;
 *   4. le PREMIER SEGMENT est réellement lisible (HTTP 200/206 et vrais octets vidéo/audio : TS, fMP4, AAC) ;
 *   5. le serveur autorise le navigateur à lire le flux (en-tête CORS) pour le site web ET pour l'appli Android.
 *
 * Résultat { status: 'ok' | 'geo' | 'dead', reason, retryable, cors } :
 *   - retryable = true pour un simple échec réseau/délai (pas une preuve que le flux est mort) ;
 *   - cors = { web, app } : l'origine est-elle autorisée.
 */
import { classifyHttp, classifyError } from './stream-status.mjs';

export const WEB_ORIGIN = 'https://iptv-web-player-aonoseke-drc.vercel.app';
export const APP_ORIGIN = 'https://localhost'; // origine de la WebView Capacitor (androidScheme: https)

const MAX_PLAYLIST_BYTES = 300_000;

/** CORS : '*' ou l'origine exacte. */
export function corsAllows(acao, origin) {
  return acao === '*' || acao === origin;
}

function resolveUrl(ref, base) {
  try { return new URL(ref, base).href; } catch { return null; }
}

/** Lit au plus `max` octets du corps (puis annule le reste) — évite de télécharger un segment entier. */
async function readHead(res, max) {
  const reader = res.body?.getReader?.();
  if (!reader) return new Uint8Array(0);
  const chunks = [];
  let total = 0;
  try {
    while (total < max) {
      const { done, value } = await reader.read();
      if (done || !value) break;
      chunks.push(value);
      total += value.length;
    }
  } finally {
    try { await reader.cancel(); } catch { /* déjà fermé */ }
  }
  const out = new Uint8Array(Math.min(total, max));
  let off = 0;
  for (const c of chunks) {
    const take = Math.min(c.length, out.length - off);
    out.set(c.subarray(0, take), off);
    off += take;
    if (off >= out.length) break;
  }
  return out;
}

/** Reconnaît de vrais octets média : TS (0x47 toutes les 188 octets), fMP4, AAC/ID3. */
export function looksLikeMedia(bytes) {
  if (!bytes || bytes.length < 8) return false;
  if (bytes[0] === 0x47 && (bytes.length < 189 || bytes[188] === 0x47)) return true; // MPEG-TS
  const tag = String.fromCharCode(...bytes.subarray(4, 8));
  if (['ftyp', 'styp', 'moof', 'moov', 'sidx'].includes(tag)) return true; // fMP4
  if (String.fromCharCode(...bytes.subarray(0, 3)) === 'ID3') return true; // audio avec ID3
  if (bytes[0] === 0xff && (bytes[1] & 0xf0) === 0xf0) return true; // AAC ADTS / MP3
  return false;
}

/** Première ligne d'URI (non commentaire) d'une liste de lecture. */
function firstUri(lines) {
  return lines.find((l) => l && !l.startsWith('#'));
}

export async function deepCheckStream(url, { timeoutMs = 9000, fetchImpl = fetch } = {}) {
  const cors = { web: false, app: false };
  const get = (u, origin, extra = {}) =>
    fetchImpl(u, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0', Origin: origin, ...extra },
    });
  // 5xx / 429 / 408 : panne probablement passagère → « à réessayer » ; le reste (404, DRM, CORS…) est définitif.
  const fail = (status, reason, extra = {}) => ({
    status,
    reason,
    retryable: status === 'dead' && (extra.code >= 500 || extra.code === 429 || extra.code === 408),
    cors,
    ...extra,
  });

  try {
    // 1. Liste de lecture (origine web) + test CORS de l'appli en parallèle
    const [res, resApp] = await Promise.all([
      get(url, WEB_ORIGIN),
      get(url, APP_ORIGIN).catch(() => null),
    ]);
    const code = res.status;
    const text = (await readHead(res, MAX_PLAYLIST_BYTES).then((b) => new TextDecoder().decode(b))) || '';
    if (resApp) { try { await resApp.body?.cancel(); } catch { /* ok */ } }
    const first = classifyHttp(code, text);
    if (first.status !== 'ok') return fail(first.status, first.reason, { code });
    let corsWeb = corsAllows(res.headers.get('access-control-allow-origin'), WEB_ORIGIN);
    let corsApp = !!resApp && corsAllows(resApp.headers.get('access-control-allow-origin'), APP_ORIGIN);

    // 2. Liste maître → première variante
    let playlistUrl = res.url || url;
    let lines = text.split(/\r?\n/).map((l) => l.trim());
    if (lines.some((l) => l.startsWith('#EXT-X-STREAM-INF'))) {
      const i = lines.findIndex((l) => l.startsWith('#EXT-X-STREAM-INF'));
      const variant = lines.slice(i + 1).find((l) => l && !l.startsWith('#'));
      const vUrl = variant ? resolveUrl(variant, playlistUrl) : null;
      if (!vUrl) return fail('dead', 'liste maître sans variante', { code });
      const vres = await get(vUrl, WEB_ORIGIN);
      const vtext = new TextDecoder().decode(await readHead(vres, MAX_PLAYLIST_BYTES));
      const vc = classifyHttp(vres.status, vtext);
      if (vc.status !== 'ok') return fail(vc.status === 'geo' ? 'geo' : 'dead', `variante : ${vc.reason}`, { code: vres.status });
      corsWeb = corsWeb && corsAllows(vres.headers.get('access-control-allow-origin'), WEB_ORIGIN);
      playlistUrl = vres.url || vUrl;
      lines = vtext.split(/\r?\n/).map((l) => l.trim());
    }

    // 3. Liste de segments : terminée ? DRM ? clé ?
    if (lines.some((l) => l.startsWith('#EXT-X-ENDLIST'))) return fail('dead', 'flux terminé (ENDLIST)', { code });
    const keyLine = lines.find((l) => l.startsWith('#EXT-X-KEY') && !/METHOD=NONE/i.test(l));
    if (keyLine) {
      const method = /METHOD=([A-Z0-9-]+)/i.exec(keyLine)?.[1]?.toUpperCase();
      const keyFormat = /KEYFORMAT="([^"]+)"/i.exec(keyLine)?.[1]?.toLowerCase();
      if (method === 'SAMPLE-AES' || method === 'SAMPLE-AES-CTR' || method === 'SAMPLE-AES-CENC' || (keyFormat && keyFormat !== 'identity')) {
        return fail('dead', 'protégé par DRM (illisible sans licence)', { code });
      }
      const keyUri = /URI="([^"]+)"/i.exec(keyLine)?.[1];
      const keyUrl = keyUri ? resolveUrl(keyUri, playlistUrl) : null;
      if (keyUrl) {
        const kres = await get(keyUrl, WEB_ORIGIN);
        const kbytes = await readHead(kres, 64);
        if (kres.status === 403 || kres.status === 451) return fail('geo', `clé de déchiffrement refusée (HTTP ${kres.status})`, { code: kres.status });
        if (!kres.ok || kbytes.length < 16) return fail('dead', 'clé de déchiffrement inaccessible', { code: kres.status });
        corsWeb = corsWeb && corsAllows(kres.headers.get('access-control-allow-origin'), WEB_ORIGIN);
      }
    }

    // 4. Premier segment réellement lisible
    const extinf = lines.findIndex((l) => l.startsWith('#EXTINF'));
    const segRef = extinf >= 0 ? firstUri(lines.slice(extinf + 1)) : undefined;
    const segUrl = segRef ? resolveUrl(segRef, playlistUrl) : null;
    if (!segUrl) return fail('dead', 'aucun segment dans la liste', { code });
    const sres = await get(segUrl, WEB_ORIGIN, { Range: 'bytes=0-4095' });
    if (sres.status === 403 || sres.status === 451) return fail('geo', `segment refusé (HTTP ${sres.status})`, { code: sres.status });
    if (!(sres.status === 200 || sres.status === 206)) return fail('dead', `segment : HTTP ${sres.status}`, { code: sres.status });
    const head = await readHead(sres, 4096);
    if (!looksLikeMedia(head)) return fail('dead', 'segment illisible (pas de vidéo)', { code: sres.status });
    corsWeb = corsWeb && corsAllows(sres.headers.get('access-control-allow-origin'), WEB_ORIGIN);

    // 5. CORS
    cors.web = corsWeb;
    cors.app = corsApp;
    if (!corsWeb && !corsApp) return { status: 'dead', reason: 'pas d\'autorisation CORS (illisible dans le navigateur et l\'appli)', retryable: false, cors, code };
    if (!corsWeb) return { status: 'dead', reason: 'CORS refusé pour le site web', retryable: false, cors, code };
    if (!corsApp) return { status: 'dead', reason: 'CORS refusé pour l\'appli Android', retryable: false, cors, code };
    return { status: 'ok', reason: 'lecture vérifiée (liste, segment, CORS)', retryable: false, cors, code };
  } catch (err) {
    const c = classifyError(err);
    return { status: 'dead', reason: c.reason, retryable: true, cors };
  }
}
