/**
 * Vérification STRICTE "jouable dans le navigateur".
 *
 * Un flux ne joue dans hls.js que s'il renvoie un en-tête CORS
 * (Access-Control-Allow-Origin) autorisant notre origine. Beaucoup de
 * flux répondent 200 en curl mais sont bloqués par le navigateur faute
 * de CORS — c'est la cause n°1 des "Flux inaccessible".
 *
 * On garde uniquement : HTTP 200 + manifest HLS + CORS OK.
 * Écrit la playlist filtrée + un rapport par source.
 */
import { readFile, writeFile } from 'node:fs/promises';

const APP_ORIGIN = 'https://iptv-web-player-zeta.vercel.app';
const TIMEOUT_MS = 9000;
const CONCURRENCY = 30;

async function playable(url) {
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { Origin: APP_ORIGIN, 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) return false;
    const acao = res.headers.get('access-control-allow-origin');
    const corsOk = acao === '*' || acao === APP_ORIGIN;
    if (!corsOk) return false;
    const t = (await res.text()).slice(0, 800);
    return t.includes('#EXTM3U') || t.includes('#EXT-X');
  } catch {
    return false;
  }
}

async function pool(items, worker) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
    while (i < items.length) { const idx = i++; out[idx] = await worker(items[idx], idx); }
  }));
  return out;
}

const path = 'public/playlist.json';
const channels = JSON.parse(await readFile(path, 'utf8'));
console.log(`Test "jouable navigateur" (CORS) sur ${channels.length} chaînes…`);

let done = 0;
const flags = await pool(channels, async (ch) => {
  const ok = await playable(ch.url);
  if (++done % 200 === 0) console.log(`  …${done}/${channels.length}`);
  return ok;
});

const kept = channels.filter((_, i) => flags[i]);
const removed = channels.length - kept.length;

const before = {}, after = {};
channels.forEach((c) => { before[c.source ?? '?'] = (before[c.source ?? '?'] ?? 0) + 1; });
kept.forEach((c) => { after[c.source ?? '?'] = (after[c.source ?? '?'] ?? 0) + 1; });

await writeFile(path, JSON.stringify(kept, null, 2));
console.log(`\n✅ Jouables navigateur : ${kept.length} (${removed} bloquées CORS/géo retirées)`);
console.log('   avant :', JSON.stringify(before));
console.log('   après :', JSON.stringify(after));
