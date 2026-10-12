/**
 * Décide du sort d'une chaîne après une vérification (voir stream-status.mjs).
 *
 * Échec définitif (result.retryable === false) : retrait immédiat.
 * Règle des deux échecs pour les autres (panne réseau, délai, 5xx) : retirée seulement après DEUX vérifications mortes de suite
 * (≈ 6 h d'écart). Au premier échec elle est gardée, marquée `failedChecks: 1` ; un succès (ok ou
 * bloquée par pays) remet le compteur à zéro. Évite de perdre des chaînes vivantes sur une panne
 * passagère ou un délai dépassé.
 */

export const MAX_FAILED_CHECKS = 2;

const MARKERS = ['geoBlocked', 'geoReason', 'verified', 'failedChecks', 'lastFailReason', 'lastFailAt'];

/** @param {Record<string, unknown>} ch */
function withoutMarkers(ch) {
  const out = { ...ch };
  for (const k of MARKERS) delete out[k];
  return out;
}

/**
 * @param {Record<string, any>} ch  chaîne telle qu'elle est dans playlist.json
 * @param {{ status: 'ok' | 'geo' | 'dead', reason: string }} result
 * @param {string} now  date ISO du passage
 * @returns {{ bucket: 'ok' | 'geo' | 'pending' | 'dead', entry: Record<string, any> | null }}
 */
export function decideChannel(ch, result, now) {
  if (result.status === 'ok') {
    return { bucket: 'ok', entry: { ...withoutMarkers(ch), verified: true, verifiedAt: now } };
  }
  if (result.status === 'geo') {
    return {
      bucket: 'geo',
      entry: { ...withoutMarkers(ch), geoBlocked: true, geoReason: result.reason, verifiedAt: now },
    };
  }
  // Échec DÉFINITIF (DRM, flux terminé, 404, segment illisible, pas de CORS…) : retrait immédiat, inutile d'attendre.
  if (result.retryable === false) return { bucket: 'dead', entry: null };
  const failedChecks = (Number.isInteger(ch.failedChecks) ? ch.failedChecks : 0) + 1;
  if (failedChecks >= MAX_FAILED_CHECKS) return { bucket: 'dead', entry: null };
  // Premier échec : on garde la chaîne telle quelle (statut précédent conservé) en notant l'échec.
  return {
    bucket: 'pending',
    entry: { ...ch, failedChecks, lastFailReason: result.reason, lastFailAt: now },
  };
}
