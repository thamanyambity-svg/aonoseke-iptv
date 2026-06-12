/**
 * Vérification des sources — ne garde QUE ce qui marche.
 *
 * - Chaînes (playlist.json) : fetch du .m3u8, suit les redirections,
 *   exige HTTP 200 + corps contenant #EXTM3U. Sinon = supprimée.
 * - Sites (sites.json) : HEAD/GET, statut online/offline.
 *
 * Sortie : playlist nettoyée + rapport. Chaque entrée gardée reçoit
 * verified:true + verifiedAt.
 *
 * Usage : node scripts/verify-sources.mjs
 */
import { readFile, writeFile } from 'node:fs/promises';

const ROOT = new URL('..', import.meta.url).pathname;
const CONCURRENCY = 40;
const TIMEOUT_MS = 7000;
const NOW = new Date().toISOString();

async function checkStream(url) {
  try {
    const res = await fetch(url, {
      method: 'GET',
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return false;
    // Lit un petit bout pour confirmer un vrai manifest HLS
    const text = (await res.text()).slice(0, 800);
    return text.includes('#EXTM3U') || text.includes('#EXT-X');
  } catch {
    return false;
  }
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let i = 0;
  async function run() {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await worker(items[idx], idx);
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, run));
  return out;
}

async function verifyPlaylist() {
  const path = `${ROOT}public/playlist.json`;
  const channels = JSON.parse(await readFile(path, 'utf8'));
  console.log(`\n📺 Vérification de ${channels.length} chaînes (concurrence ${CONCURRENCY})…`);

  let done = 0;
  const flags = await pool(channels, async (ch) => {
    const ok = await checkStream(ch.url);
    done++;
    if (done % 250 === 0) console.log(`   …${done}/${channels.length}`);
    return ok;
  });

  const kept = [];
  let removed = 0;
  channels.forEach((ch, idx) => {
    if (flags[idx]) {
      kept.push({ ...ch, verified: true, verifiedAt: NOW });
    } else {
      removed++;
    }
  });

  await writeFile(path, JSON.stringify(kept, null, 2));
  console.log(`✅ Chaînes : ${kept.length} gardées, ${removed} mortes supprimées`);

  // Répartition par source
  const bySrc = {};
  for (const c of kept) bySrc[c.source ?? '?'] = (bySrc[c.source ?? '?'] ?? 0) + 1;
  console.log('   par source :', JSON.stringify(bySrc));
  return { kept: kept.length, removed };
}

async function verifySites() {
  const path = `${ROOT}public/sites.json`;
  const sites = JSON.parse(await readFile(path, 'utf8'));
  console.log(`\n🧭 Vérification de ${sites.length} sites de l'annuaire…`);

  const updated = await pool(sites, async (s) => {
    let status = 'offline';
    try {
      const res = await fetch(s.url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });
      if (res.status < 500) status = 'online';
    } catch { /* offline */ }
    return { ...s, status, verifiedAt: NOW };
  });

  await writeFile(path, JSON.stringify(updated, null, 2));
  const online = updated.filter((s) => s.status === 'online').length;
  console.log(`✅ Sites : ${online}/${sites.length} en ligne`);
  return { online, total: sites.length };
}

const playlist = await verifyPlaylist();
const sites = await verifySites();
console.log('\n📊 RÉSUMÉ');
console.log(`   Chaînes opérationnelles : ${playlist.kept} (${playlist.removed} retirées)`);
console.log(`   Sites en ligne : ${sites.online}/${sites.total}`);
