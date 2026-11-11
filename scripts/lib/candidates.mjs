/**
 * Fusion des chaînes candidates dans la playlist.
 *
 * Les candidats (data/candidates/*.json) sont testés par scripts/probe-candidates.mjs (serveur GitHub, accès réseau
 * complet). Cette fonction pure range le résultat :
 *   ok   → ajoutée, verified:true
 *   geo  → ajoutée, geoBlocked:true (la chaîne répond mais refuse l'accès depuis ce pays)
 *   dead → ignorée
 * Sont aussi ignorés : un candidat dont l'adresse existe déjà dans la playlist, et un doublon de nom dans un même pays.
 */

const norm = (s) => String(s).toLowerCase().replace(/\(.*?\)|\[.*?\]/g, '').replace(/[^a-z0-9]/g, '');

/**
 * @param {Array<Record<string, any>>} playlist
 * @param {Array<{ name: string, url: string, country: string, group: string, logo?: string, source?: string, status: 'ok'|'geo'|'dead', reason?: string }>} results
 * @param {string} now  date ISO
 * @returns {{ playlist: Array<Record<string, any>>, added: Array<Record<string, any>>, skipped: { dead: number, known: number } }}
 */
export function mergeCandidates(playlist, results, now) {
  const urls = new Set(playlist.map((c) => c.url));
  const names = new Set(playlist.map((c) => `${norm(c.name)}|${c.country}`));
  const added = [];
  const skipped = { dead: 0, known: 0 };
  // Un flux lisible passe avant un flux bloqué par pays, pour une même chaîne (sinon le premier rencontré l'emporte).
  const order = { ok: 0, geo: 1, dead: 2 };
  const sorted = [...results].sort((x, y) => (order[x.status] ?? 3) - (order[y.status] ?? 3));
  for (const r of sorted) {
    if (r.status === 'dead') { skipped.dead++; continue; }
    const key = `${norm(r.name)}|${r.country}`;
    if (urls.has(r.url) || names.has(key)) { skipped.known++; continue; }
    urls.add(r.url);
    names.add(key);
    const entry = {
      name: r.name,
      country: r.country,
      group: r.group,
      logo: r.logo ?? '',
      url: r.url,
      source: r.source ?? 'candidat',
      verifiedAt: now,
    };
    if (r.status === 'geo') { entry.geoBlocked = true; entry.geoReason = r.reason ?? 'accès refusé depuis ce pays'; }
    else entry.verified = true;
    added.push(entry);
  }
  return { playlist: [...playlist, ...added], added, skipped };
}
