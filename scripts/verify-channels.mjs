#!/usr/bin/env node
// Deep HLS check: manifest (#EXTM3U) -> media playlist -> first segment.
// Usage: node scripts/verify-channels.mjs [--unverified] [--dry-run] [--prune] [--dedupe]
//        [--from=N] [--to=N] [--timeout=ms] [--concurrency=N]
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const PLAYLIST_PATH = path.join(repoRoot, 'public/playlist.json');

const args = process.argv.slice(2);
const flag = (...names) => names.some(n => args.includes(n));
const num = (name, def) => {
  const v = args.find(a => a.startsWith(`--${name}=`))?.split('=')[1];
  return v !== undefined ? parseInt(v, 10) : def;
};

const ONLY_UNVERIFIED = flag('--unverified', '-u');
const DRY_RUN = flag('--dry-run', '-n');
const PRUNE = flag('--prune');
const DEDUPE = flag('--dedupe');
const FROM_INDEX = num('from', 0);
const TO_INDEX = num('to', Infinity);

const CONFIG = {
  concurrency: num('concurrency', 20),
  timeout: num('timeout', 10000),
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  maxRetries: 1,
  cooldownBetweenBatches: 200,
  maxManifestBytes: 500_000,
};

class CheckError extends Error {}

async function get(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CONFIG.timeout);
  try {
    return await fetch(url, {
      headers: { 'User-Agent': CONFIG.userAgent },
      signal: controller.signal,
      redirect: 'follow',
    });
  } finally {
    clearTimeout(timer);
  }
}

async function readText(res) {
  const buf = new Uint8Array(await res.arrayBuffer());
  return new TextDecoder().decode(buf.subarray(0, CONFIG.maxManifestBytes));
}

const firstUri = text =>
  text.split(/\r?\n/).map(l => l.trim()).find(l => l && !l.startsWith('#'));

async function fetchOk(url, what) {
  const res = await get(url);
  if (res.status !== 200) {
    await res.body?.cancel().catch(() => {});
    throw new CheckError(`${what} HTTP ${res.status}`);
  }
  return res;
}

async function checkOnce(url) {
  const res = await fetchOk(url, 'manifest');
  const text = await readText(res);
  if (!text.includes('#EXTM3U')) throw new CheckError('not an HLS manifest');
  const uri = firstUri(text);
  if (!uri) throw new CheckError('empty manifest');

  const subUrl = new URL(uri, res.url).href;
  const subRes = await fetchOk(subUrl, 'variant/segment');
  const head = new Uint8Array(await subRes.arrayBuffer());
  const subText = new TextDecoder().decode(head.subarray(0, CONFIG.maxManifestBytes));

  // Master playlist -> variant playlist -> first segment. Media playlist -> already a segment.
  if (subText.startsWith('#EXTM3U')) {
    const segUri = firstUri(subText);
    if (!segUri) throw new CheckError('empty media playlist');
    const segRes = await fetchOk(new URL(segUri, subRes.url).href, 'segment');
    await segRes.body?.cancel().catch(() => {});
  }
}

async function verifyChannel(channel) {
  const { url } = channel;
  if (!url || !/^https?:\/\//.test(url)) return { status: 'skip' };

  let lastError = 'unknown';
  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      await checkOnce(url);
      return { status: 'live' };
    } catch (err) {
      lastError = err.name === 'AbortError' ? 'timeout' : (err.cause?.code || err.message);
      // Definitive failures: don't retry.
      if (err instanceof CheckError && /HTTP (404|410)|not an HLS|empty/.test(err.message)) break;
      if (attempt < CONFIG.maxRetries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return { status: 'dead', error: lastError };
}

async function main() {
  const playlist = JSON.parse(await fs.readFile(PLAYLIST_PATH, 'utf8'));
  if (!Array.isArray(playlist)) throw new Error('Invalid playlist format');

  const toVerify = playlist
    .map((ch, i) => ({ ch, i }))
    .filter(({ i }) => i >= FROM_INDEX && i <= TO_INDEX)
    .filter(({ ch }) => !ONLY_UNVERIFIED || ch.verified !== true);

  console.log(`Playlist: ${playlist.length} channels, to verify: ${toVerify.length}`);
  console.log(`Concurrency: ${CONFIG.concurrency}, timeout: ${CONFIG.timeout}ms${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

  const startTime = Date.now();
  const now = new Date().toISOString();
  const dead = [];
  let live = 0;
  let skipped = 0;

  for (let s = 0; s < toVerify.length; s += CONFIG.concurrency) {
    const batch = toVerify.slice(s, s + CONFIG.concurrency);
    const results = await Promise.all(batch.map(({ ch }) => verifyChannel(ch)));
    batch.forEach(({ ch, i }, j) => {
      const r = results[j];
      if (r.status === 'skip') { skipped++; return; }
      if (r.status === 'live') {
        live++;
        playlist[i].verified = true;
        playlist[i].verifiedAt = now;
      } else {
        dead.push({ index: i, name: ch.name, url: ch.url, error: r.error });
        playlist[i].verified = false;
        playlist[i].verifiedAt = null;
      }
      console.log(`${live + dead.length}/${toVerify.length} ${r.status === 'live' ? '✓' : '✗'} ${ch.name || '?'}${r.error ? ` — ${r.error}` : ''}`);
    });
    await new Promise(r => setTimeout(r, CONFIG.cooldownBetweenBatches));
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`\nRESULTS (${elapsed}s) — live: ${live}, dead: ${dead.length}, skipped: ${skipped}`);

  let result = playlist;
  if (PRUNE) result = result.filter(ch => ch.verified !== false);
  if (DEDUPE) {
    const seen = new Set();
    result = result.filter(ch => (seen.has(ch.url) ? false : seen.add(ch.url)));
  }
  if (result.length !== playlist.length) {
    console.log(`Removed ${playlist.length - result.length} entries (${PRUNE ? 'prune' : ''}${PRUNE && DEDUPE ? '+' : ''}${DEDUPE ? 'dedupe' : ''})`);
  }

  if (dead.length > 0) {
    const reportPath = path.join(repoRoot, `dead-channels-${now.slice(0, 10)}.json`);
    if (!DRY_RUN) {
      await fs.writeFile(reportPath, JSON.stringify(dead, null, 2) + '\n', 'utf8');
      console.log(`Dead channels report: ${reportPath}`);
    }
  }

  if (!DRY_RUN) {
    await fs.writeFile(PLAYLIST_PATH, JSON.stringify(result, null, 2) + '\n', 'utf8');
    console.log(`Playlist updated: ${PLAYLIST_PATH} (${result.length} channels)`);
  }

  process.exit(dead.length > 0 && !PRUNE ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
