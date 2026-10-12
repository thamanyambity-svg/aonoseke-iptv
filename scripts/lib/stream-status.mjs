/**
 * Classe le résultat de la vérification d'un flux HLS en trois états :
 *   - 'ok'   : manifest HLS valide ;
 *   - 'geo'  : le serveur répond mais refuse l'accès (HTTP 403 / 451, ou message « indisponible dans
 *              votre pays ») — la chaîne marche probablement dans son pays d'origine : on la GARDE, signalée ;
 *   - 'dead' : flux disparu (404/410/5xx, domaine introuvable, connexion refusée, certificat invalide,
 *              délai dépassé, contenu qui n'est pas du HLS) — on la retire.
 *
 * La vérification tourne depuis un serveur GitHub (États-Unis) : tout refus 403/451 y est donc d'abord
 * un blocage par pays ou par origine, pas une preuve que la chaîne est morte.
 */

const GEO_MESSAGE =
  /block access from your country|not available in your (country|region|location|area)|unavailable in your (country|region|location|area)|geo[-_ ]?(block|restrict|fenc)|outside (of )?(the )?(allowed )?(country|region)|only available (in|to|for)|not (allowed|permitted) in your (country|region)/i;

/** Codes HTTP traités comme « accès refusé » (blocage par pays ou par origine). */
const GEO_HTTP = new Set([403, 451]);

const DNS_CODES = new Set(['ENOTFOUND', 'EAI_AGAIN', 'ENODATA']);
const TLS_CODES = new Set([
  'CERT_HAS_EXPIRED', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'ERR_TLS_CERT_ALTNAME_INVALID', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
]);

/** @param {number} status @param {string} body */
export function classifyHttp(status, body = '') {
  const text = String(body).slice(0, 800);
  if (status >= 200 && status < 300) {
    if (text.includes('#EXTM3U') || text.includes('#EXT-X')) return { status: 'ok', reason: 'HLS valide' };
    if (GEO_MESSAGE.test(text)) return { status: 'geo', reason: 'message « indisponible dans votre pays »' };
    return { status: 'dead', reason: 'réponse qui n\'est pas un flux HLS' };
  }
  if (GEO_HTTP.has(status)) {
    return {
      status: 'geo',
      reason: GEO_MESSAGE.test(text) ? `HTTP ${status} + message de blocage par pays` : `HTTP ${status} (accès refusé)`,
    };
  }
  return { status: 'dead', reason: `HTTP ${status}` };
}

/** @param {unknown} err */
export function classifyError(err) {
  const e = /** @type {{ name?: string, code?: string, cause?: { code?: string } }} */ (err ?? {});
  const code = e.cause?.code ?? e.code ?? '';
  if (e.name === 'TimeoutError' || e.name === 'AbortError' || code === 'UND_ERR_CONNECT_TIMEOUT' || code === 'ETIMEDOUT') {
    return { status: 'dead', reason: 'délai dépassé' };
  }
  if (DNS_CODES.has(code)) return { status: 'dead', reason: 'domaine introuvable' };
  if (code === 'ECONNREFUSED') return { status: 'dead', reason: 'connexion refusée' };
  if (TLS_CODES.has(code)) return { status: 'dead', reason: 'certificat invalide' };
  return { status: 'dead', reason: code ? `erreur réseau (${code})` : 'erreur réseau' };
}

/**
 * Vérifie un flux et renvoie { status, reason, code? }.
 * @param {string} url
 * @param {{ timeoutMs?: number, fetchImpl?: typeof fetch }} [opts]
 */
export async function checkStream(url, { timeoutMs = 7000, fetchImpl = fetch } = {}) {
  try {
    const res = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(timeoutMs),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    let body = '';
    try { body = (await res.text()).slice(0, 800); } catch { /* corps illisible */ }
    return { ...classifyHttp(res.status, body), code: res.status };
  } catch (err) {
    return classifyError(err);
  }
}
