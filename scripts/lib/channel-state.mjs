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

export const MAX_BACKUPS = 3;

/**
 * Décide du sort d'une chaîne qui a une adresse principale et des adresses de secours (`backups`).
 *
 * `results` : une entrée par adresse, dans l'ordre [principale, ...secours], chacune { url, result }.
 *  - la principale marche (ok) → inchangée ; les secours morts de façon définitive sont retirés ;
 *  - la principale est KO mais une secours marche → la secours est PROMUE, la chaîne survit (l'ancienne
 *    principale est gardée en secours seulement si son échec est passager) ;
 *  - rien ne marche → règle des deux échecs sur la principale (decideChannel), secours conservées.
 * Une adresse « bloquée par pays » passe après les adresses réellement lisibles mais avant la mort de la chaîne.
 *
 * @param {Record<string, any>} ch
 * @param {Array<{ url: string, result: { status: 'ok'|'geo'|'dead', reason: string, retryable?: boolean } }>} results
 * @param {string} now
 */
export function decideWithBackups(ch, results, now) {
  const [primary, ...others] = results;
  const keepBackup = (r) => !(r.result.status === 'dead' && r.result.retryable === false);
  const rank = (r) => (r.result.status === 'ok' ? 0 : r.result.status === 'geo' ? 1 : 2);

  // Meilleure adresse : la première lisible ; à défaut, la première bloquée par pays ; en cas d'égalité, l'ordre d'origine.
  const best = [...results].sort((a, b) => rank(a) - rank(b))[0];
  if (rank(best) === 2) {
    // Aucune adresse ne répond : règle des deux échecs sur la principale, en gardant les secours non définitivement mortes.
    const backups = others.filter(keepBackup).map((r) => r.url);
    const verdict = decideChannel(ch, primary.result, now);
    if (verdict.entry) {
      if (backups.length) verdict.entry.backups = backups.slice(0, MAX_BACKUPS);
      else delete verdict.entry.backups;
    }
    return verdict;
  }

  const rest = results
    .filter((r) => r.url !== best.url && keepBackup(r))
    .map((r) => r.url)
    .slice(0, MAX_BACKUPS);
  const base = { ...ch, url: best.url };
  if (rest.length) base.backups = rest;
  else delete base.backups;
  return decideChannel(base, best.result, now);
}
