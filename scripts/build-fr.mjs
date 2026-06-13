/**
 * Construit un set de chaînes FR fiables :
 *  1. Fusionne plusieurs repos FR (schumijo, iptv-org pays+langue, Free-TV)
 *  2. Déduplique par URL et par nom normalisé (schumijo prioritaire)
 *  3. Vérifie chaque flux (HTTP 200 + manifest HLS) en concurrence
 *  4. Écrit /tmp/fr_verified.json (chaînes qui tournent uniquement)
 */
import { readFile, writeFile } from 'node:fs/promises';

const TIMEOUT_MS = 8000;
const CONCURRENCY = 40;

// Ordre = priorité (le 1er gagne en cas de doublon de nom)
const SOURCES = [
  { file: '/tmp/schumijo_fr.m3u', tag: 'schumijo' },
  { file: '/tmp/ftv_fr.m3u',      tag: 'free-tv' },
  { file: '/tmp/iptvorg_fr.m3u',  tag: 'iptv-org' },
  { file: '/tmp/iptvorg_fra.m3u', tag: 'iptv-org' },
];

function parseM3U(text, tag) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) continue;
    const logo = /tvg-logo="([^"]*)"/.exec(line)?.[1] ?? '';
    const group = /group-title="([^"]*)"/.exec(line)?.[1]?.split(';')[0] ?? 'Général';
    const country = /tvg-id="[^"]*\.([a-z]{2})/.exec(line)?.[1]?.toUpperCase() ?? 'FR';
    const name = /,(.+)$/.exec(line)?.[1]?.trim() ?? '';
    // URL = 1re ligne http suivante
    let url = '';
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j].trim();
      if (l.startsWith('http')) { url = l; break; }
      if (l.startsWith('#EXTINF')) break;
    }
    const blocked = /\[Geo-Blocked\]|\[Geo-blocked\]/.test(name);
    if (url && !blocked && !url.endsWith('.mpd') && name) {
      out.push({
        name: name.replace(/\s*\[.*?\]/g, '').trim(),
        country, group, logo, url, source: tag,
      });
    }
  }
  return out;
}

function norm(s) {
  return s.toLowerCase().replace(/\s*\(.*?\)|\s*\[.*?\]|hd|fhd|sd|1080p|720p|480p|\W/g, '');
}

async function check(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0', Referer: '' },
    });
    if (!res.ok) return false;
    const t = (await res.text()).slice(0, 800);
    return t.includes('#EXTM3U') || t.includes('#EXT-X');
  } catch { return false; }
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); }
  }));
  return out;
}

// 1+2. Fusion + dédup
const seenUrl = new Set();
const seenName = new Set();
const candidates = [];
for (const src of SOURCES) {
  let text = '';
  try { text = await readFile(src.file, 'utf8'); } catch { continue; }
  for (const ch of parseM3U(text, src.tag)) {
    const nk = norm(ch.name);
    if (seenUrl.has(ch.url) || seenName.has(nk)) continue;
    seenUrl.add(ch.url); seenName.add(nk);
    candidates.push(ch);
  }
}
console.log(`Candidats FR fusionnés (dédupliqués) : ${candidates.length}`);

// 3. Vérification
let done = 0;
const flags = await pool(candidates, async (ch) => {
  const ok = await check(ch.url);
  if (++done % 100 === 0) console.log(`  …${done}/${candidates.length}`);
  return ok;
});

const NOW = new Date().toISOString();
const verified = candidates
  .filter((_, i) => flags[i])
  .map((c) => ({ ...c, verified: true, verifiedAt: NOW }));

await writeFile('/tmp/fr_verified.json', JSON.stringify(verified, null, 2));

const bySrc = {};
for (const c of verified) bySrc[c.source] = (bySrc[c.source] ?? 0) + 1;
console.log(`\n✅ Chaînes FR qui tournent : ${verified.length}/${candidates.length}`);
console.log('   par source :', JSON.stringify(bySrc));
