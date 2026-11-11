/**
 * Quarantaine des chaînes retirées.
 *
 * Une chaîne retirée par la vérification n'est pas forcément morte pour toujours : un serveur peut être éteint
 * quelques jours, ou injoignable depuis le serveur de test. Plutôt que de la perdre, on la met en quarantaine ;
 * elle est retestée à chaque passage, REMISE dans la playlist après deux succès de suite, et abandonnée
 * seulement après QUARANTINE_MAX_DAYS jours sans jamais répondre.
 */

export const RESTORE_AFTER_OK = 2;
export const QUARANTINE_MAX_DAYS = 30;
const DAY_MS = 86_400_000;

/**
 * Met une chaîne retirée en quarantaine (sans doublon d'adresse).
 * @param {Array<Record<string, any>>} quarantine
 * @param {Record<string, any>} ch  la chaîne telle qu'elle était dans la playlist
 * @param {string} reason
 * @param {string} now
 */
export function quarantineAdd(quarantine, ch, reason, now) {
  if (quarantine.some((q) => q.channel.url === ch.url)) return quarantine;
  return [...quarantine, { channel: stripMarkers(ch), reason, since: now, okRuns: 0 }];
}

function stripMarkers(ch) {
  const out = { ...ch };
  for (const k of ['geoBlocked', 'geoReason', 'verified', 'verifiedAt', 'failedChecks', 'lastFailReason', 'lastFailAt']) delete out[k];
  return out;
}

/**
 * Un passage de retest sur la quarantaine.
 * @param {Array<Record<string, any>>} quarantine
 * @param {Map<string, { status: 'ok'|'geo'|'dead', reason: string }>} results  résultat par adresse
 * @param {string} now
 * @returns {{ quarantine: Array<Record<string, any>>, restored: Array<Record<string, any>>, abandoned: number }}
 */
export function quarantineStep(quarantine, results, now) {
  const kept = [];
  const restored = [];
  let abandoned = 0;
  for (const q of quarantine) {
    const r = results.get(q.channel.url);
    const alive = r && (r.status === 'ok' || r.status === 'geo');
    if (alive) {
      const okRuns = q.okRuns + 1;
      if (okRuns >= RESTORE_AFTER_OK) {
        restored.push({ ...q.channel, restoredAt: now, ...(r.status === 'geo' ? { geoBlocked: true, geoReason: r.reason } : { verified: true }), verifiedAt: now });
        continue;
      }
      kept.push({ ...q, okRuns });
      continue;
    }
    // Un échec remet la série de succès à zéro.
    if ((Date.parse(now) - Date.parse(q.since)) / DAY_MS > QUARANTINE_MAX_DAYS) { abandoned++; continue; }
    kept.push({ ...q, okRuns: 0, lastReason: r ? r.reason : 'non testée' });
  }
  return { quarantine: kept, restored, abandoned };
}
