#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const PLAYLIST_PATH = path.join(repoRoot, 'public/playlist.json');

const CONFIG = {
  concurrency: 5,
  timeout: 10000,
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  maxRetries: 2,
  cooldownBetweenBatches: 500,
};

const args = process.argv.slice(2);
const ONLY_UNVERIFIED = args.includes('--unverified') || args.includes('-u');
const DRY_RUN = args.includes('--dry-run') || args.includes('-n');
const FROM_INDEX = parseInt(args.find(a => a.startsWith('--from='))?.split('=')[1] || '0', 10);
const TO_INDEX = parseInt(args.find(a => a.startsWith('--to='))?.split('=')[1] || String(Infinity), 10);

let tested = 0;
let passed = 0;
let failed = 0;

async function verifyChannel(channel, index, total) {
  const { url, name } = channel;
  if (!url || !url.startsWith('http')) return { status: 'skip' };

  for (let attempt = 0; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), CONFIG.timeout);

      const res = await fetch(url, {
        method: 'GET',
        headers: { 'User-Agent': CONFIG.userAgent },
        signal: controller.signal,
      });
      clearTimeout(timer);

      const contentType = res.headers.get('content-type') || '';
      const isM3u8 = contentType.includes('mpegurl') || contentType.includes('apple')
        || url.endsWith('.m3u8');

      const statusCode = res.status;
      const ok = statusCode === 200 && (isM3u8 || statusCode === 200);

      return { status: ok ? 'live' : 'dead', statusCode, contentType };
    } catch (err) {
      if (attempt < CONFIG.maxRetries) {
        await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
        continue;
      }
      return { status: 'error', error: err.message };
    }
  }
  return { status: 'error', error: 'max retries' };
}

async function main() {
  const raw = await fs.readFile(PLAYLIST_PATH, 'utf8');
  const playlist = JSON.parse(raw);
  if (!Array.isArray(playlist)) throw new Error('Invalid playlist format');

  const toVerify = playlist
    .map((ch, i) => ({ ch, i }))
    .filter(({ i }) => i >= FROM_INDEX && i <= TO_INDEX)
    .filter(({ ch }) => !ONLY_UNVERIFIED || ch.verified !== true);

  console.log(`Playlist: ${playlist.length} channels`);
  console.log(`To verify: ${toVerify.length}${ONLY_UNVERIFIED ? ' (unverified only)' : ''}`);
  console.log(`Concurrency: ${CONFIG.concurrency}, Timeout: ${CONFIG.timeout}ms\n`);
  if (DRY_RUN) { console.log('DRY RUN — no changes will be saved\n'); }

  const startTime = Date.now();
  const deadChannels = [];

  for (let batchStart = 0; batchStart < toVerify.length; batchStart += CONFIG.concurrency) {
    const batch = toVerify.slice(batchStart, batchStart + CONFIG.concurrency);
    const results = await Promise.all(
      batch.map(({ ch, i }) => verifyChannel(ch, i, playlist.length))
    );

    for (let j = 0; j < batch.length; j++) {
      const { ch, i } = batch[j];
      const result = results[j];
      tested++;

      if (result.status === 'live') {
        passed++;
        if (!DRY_RUN) {
          playlist[i].verified = true;
          playlist[i].verifiedAt = new Date().toISOString();
        }
      } else {
        failed++;
        deadChannels.push({ index: i, name: ch.name, url: ch.url, ...result });
        if (!DRY_RUN) {
          playlist[i].verified = false;
          playlist[i].verifiedAt = null;
        }
      }

      const progress = `${tested}/${toVerify.length}`;
      const statusIcon = result.status === 'live' ? '✓' : '✗';
      console.log(`${progress} ${statusIcon} [${i}] ${ch.name || '?'} — ${result.status}${result.statusCode ? ` (${result.statusCode})` : ''}${result.error ? `: ${result.error}` : ''}`);
    }

    if (batchStart + CONFIG.concurrency < toVerify.length) {
      await new Promise(r => setTimeout(r, CONFIG.cooldownBetweenBatches));
    }
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(50));
  console.log(`RESULTS (${elapsed}s)`);
  console.log('='.repeat(50));
  console.log(`Tested:  ${tested}`);
  console.log(`Live:    ${passed}`);
  console.log(`Dead:    ${failed}`);
  console.log(`Rate:    ${(tested / elapsed).toFixed(1)} channels/s`);

  if (deadChannels.length > 0) {
    console.log('\nDEAD CHANNELS:');
    deadChannels.slice(0, 30).forEach((d, idx) => {
      console.log(`  ${idx + 1}. [${d.index}] ${d.name} — ${d.statusCode || d.error}`);
    });
    if (deadChannels.length > 30) {
      console.log(`  ... and ${deadChannels.length - 30} more`);
    }

    const reportPath = path.join(repoRoot, `dead-channels-${new Date().toISOString().slice(0, 10)}.json`);
    await fs.writeFile(reportPath, JSON.stringify(deadChannels, null, 2), 'utf8');
    console.log(`\nFull dead channels report: ${reportPath}`);
  }

  if (!DRY_RUN) {
    await fs.writeFile(PLAYLIST_PATH, JSON.stringify(playlist, null, 2), 'utf8');
    console.log(`\nPlaylist updated: ${PLAYLIST_PATH}`);
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
