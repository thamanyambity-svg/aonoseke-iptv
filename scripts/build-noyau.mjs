/**
 * Noyau "francophone mondial + Afrique" — chaînes qui jouent réellement
 * depuis la RDC (non géo-bloquées) :
 *   - toutes les chaînes des pays francophones d'Afrique (géo-safe)
 *   - les chaînes internationales francophones (France 24, TV5Monde,
 *     Euronews, RFI, Africa…) — globales, pas verrouillées
 *   - EXCLUT les FTA françaises (TF1, France 2-5, M6, W9, TMC…) qui sont
 *     géo-bloquées à la France
 * Puis vérification CORS (jouable navigateur). Sortie : /tmp/noyau.json
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';

const APP_ORIGIN = 'https://iptv-web-player-zeta.vercel.app';
const TIMEOUT_MS = 9000;
const CONCURRENCY = 30;

// Marques internationales francophones à garder (globales)
const GLOBAL_OK = /france\s?24|tv5|euronews|\brfi\b|africa|afrique|voa|deutsche welle|\bdw\b|al jazeera|monde|trace|nollywood|novelas|gospel|mira|afrobeat/i;
// FTA françaises géo-bloquées à exclure
const FR_FTA = /\btf1\b|\bfrance\s?[2345o]\b|\bm6\b|\bw9\b|\btmc\b|\btfx\b|\bnrj12\b|\bc8\b|\bcstar\b|gulli|\b6ter\b|chérie|\brmc\b|bfm|cnews|\blci\b|\bcanal\+|\btf1\s?séries|téva|paris première|planète|ushuaia|histoire|\blcp\b/i;

const AFRICA = new Set(['CD','CG','CI','CM','SN','GA','BJ','TG','ML','BF','NE','TD','MG','GN','RW','BI','DJ','KM','MR','DZ','MA','TN']);

function parseM3U(text, srcTag) {
  const out = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line.startsWith('#EXTINF')) continue;
    const logo = /tvg-logo="([^"]*)"/.exec(line)?.[1] ?? '';
    const group = /group-title="([^"]*)"/.exec(line)?.[1]?.split(';')[0] ?? '';
    const country = /tvg-id="[^"]*\.([a-z]{2})/.exec(line)?.[1]?.toUpperCase() ?? '';
    const name = /,(.+)$/.exec(line)?.[1]?.trim() ?? '';
    let url = '';
    for (let j = i + 1; j < lines.length; j++) {
      const l = lines[j].trim();
      if (l.startsWith('http')) { url = l; break; }
      if (l.startsWith('#EXTINF')) break;
    }
    const blocked = /\[Geo-Blocked\]|\[Geo-blocked\]/.test(name);
    if (url && !blocked && !url.endsWith('.mpd') && name) {
      out.push({ name: name.replace(/\s*\[.*?\]/g, '').trim(), country, group, logo, url, src: srcTag });
    }
  }
  return out;
}

const norm = (s) => s.toLowerCase().replace(/\s*\(.*?\)|hd|fhd|sd|\d+p|\W/g, '');

async function playable(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow', signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Origin: APP_ORIGIN, 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return false;
    const acao = res.headers.get('access-control-allow-origin');
    if (acao !== '*' && acao !== APP_ORIGIN) return false;
    const t = (await res.text()).slice(0, 800);
    return t.includes('#EXTM3U') || t.includes('#EXT-X');
  } catch { return false; }
}
async function pool(items, worker) {
  const out = new Array(items.length); let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx]); }
  }));
  return out;
}

// Rassemble les candidats
const files = (await readdir('/tmp')).filter((f) => f.startsWith('afr_') || f === 'fra_lang.m3u');
const seenUrl = new Set(), seenName = new Set();
const candidates = [];
for (const f of files) {
  const text = await readFile(`/tmp/${f}`, 'utf8').catch(() => '');
  const isAfrica = f.startsWith('afr_');
  for (const ch of parseM3U(text, isAfrica ? 'afrique' : 'fra')) {
    // Règle d'inclusion
    const keep = isAfrica
      || AFRICA.has(ch.country)
      || (GLOBAL_OK.test(ch.name) && !FR_FTA.test(ch.name));
    // Exclusion FTA françaises
    if (!keep || FR_FTA.test(ch.name)) continue;
    const nk = norm(ch.name);
    if (seenUrl.has(ch.url) || seenName.has(nk)) continue;
    seenUrl.add(ch.url); seenName.add(nk);
    candidates.push(ch);
  }
}
console.log(`Candidats noyau francophone+Afrique : ${candidates.length}`);

// Vérifie CORS
let done = 0;
const flags = await pool(candidates, async (ch) => {
  const ok = await playable(ch.url);
  if (++done % 50 === 0) console.log(`  …${done}/${candidates.length}`);
  return ok;
});

const NOW = new Date().toISOString();
const verified = candidates.filter((_, i) => flags[i]).map((c) => ({
  name: c.name,
  country: c.country || 'FR',
  group: AFRICA.has(c.country) ? 'Afrique' : 'Francophone',
  logo: c.logo,
  url: c.url,
  source: 'noyau-fr',
  verified: true,
  verifiedAt: NOW,
}));

await writeFile('/tmp/noyau.json', JSON.stringify(verified, null, 2));
const byCountry = {};
for (const c of verified) byCountry[c.country] = (byCountry[c.country] || 0) + 1;
console.log(`\n✅ Noyau vérifié (jouable) : ${verified.length}/${candidates.length}`);
console.log('   par pays :', JSON.stringify(byCountry));
