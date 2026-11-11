/**
 * Teste les chaînes candidates (data/candidates/*.json) avec la vérification de lecture complète
 * (scripts/lib/stream-deep.mjs) et écrit data/candidates/report.json.
 *
 * Tourne sur le serveur GitHub (accès réseau complet, tous les ports) : voir .github/workflows/probe-candidates.yml.
 * Le rapport est ensuite fusionné dans la playlist par scripts/merge-candidates.mjs.
 *
 * Usage : node scripts/probe-candidates.mjs
 */
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { deepCheckStream } from './lib/stream-deep.mjs';

const DIR = new URL('../data/candidates/', import.meta.url).pathname;
const CONCURRENCY = 20;
const TIMEOUT_MS = 12000;

const files = (await readdir(DIR)).filter((f) => f.endsWith('.json') && f !== 'report.json');
const candidates = [];
for (const f of files) {
  for (const c of JSON.parse(await readFile(`${DIR}${f}`, 'utf8'))) candidates.push({ ...c, file: f });
}
console.log(`🔎 ${candidates.length} candidats (${files.join(', ')})`);

const results = new Array(candidates.length);
let i = 0;
async function run() {
  while (i < candidates.length) {
    const idx = i++;
    const c = candidates[idx];
    // Deux essais espacés : une panne passagère ne doit pas faire écarter une chaîne vivante.
    let r = await deepCheckStream(c.url, { timeoutMs: TIMEOUT_MS });
    if (r.status === 'dead' && r.retryable) {
      await new Promise((ok) => setTimeout(ok, 4000));
      r = await deepCheckStream(c.url, { timeoutMs: TIMEOUT_MS });
    }
    results[idx] = { ...c, status: r.status, reason: r.reason, retryable: r.retryable };
  }
}
await Promise.all(Array.from({ length: CONCURRENCY }, run));

const counts = { ok: 0, geo: 0, dead: 0 };
for (const r of results) counts[r.status]++;
console.log(`✅ ok ${counts.ok} · pays ${counts.geo} · mortes ${counts.dead}`);
await writeFile(
  `${DIR}report.json`,
  JSON.stringify({ generatedAt: new Date().toISOString(), counts, results }, null, 2),
);
