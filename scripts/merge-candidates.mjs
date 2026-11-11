/**
 * Fusionne dans public/playlist.json les candidats lisibles du rapport data/candidates/report.json
 * (voir scripts/lib/candidates.mjs pour les règles). Ne retire jamais rien.
 *
 * Usage : node scripts/merge-candidates.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';
import { mergeCandidates } from './lib/candidates.mjs';

const ROOT = new URL('..', import.meta.url).pathname;
const report = JSON.parse(await readFile(`${ROOT}data/candidates/report.json`, 'utf8'));
const playlist = JSON.parse(await readFile(`${ROOT}public/playlist.json`, 'utf8'));

const { playlist: merged, added, skipped } = mergeCandidates(playlist, report.results, new Date().toISOString());
// RDC puis Congo-Brazzaville en tête de liste, comme le reste de la playlist.
const rank = (c) => (c.country === 'CD' ? 0 : c.country === 'CG' ? 1 : 2);
merged.sort((a, b) => rank(a) - rank(b));
await writeFile(`${ROOT}public/playlist.json`, JSON.stringify(merged, null, 2));
console.log(`+${added.length} chaînes ajoutées · ${skipped.dead} mortes · ${skipped.known} déjà connues`);
for (const a of added) console.log(`  ${a.geoBlocked ? '🌍' : '✅'} ${a.country} ${a.name}`);
