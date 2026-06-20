import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WORKING_LIST_PATH = path.join(__dirname, '../analysis/working_https_candidates_full.txt');
const PLAYLIST_PATH = path.join(__dirname, '../public/playlist.json');

const COUNTRY_BY_TLD = {
  fr: 'FR', be: 'BE', ch: 'CH', lu: 'LU', mc: 'MC', de: 'DE', it: 'IT', es: 'ES', pt: 'PT',
  nl: 'NL', se: 'SE', no: 'NO', dk: 'DK', fi: 'FI', ie: 'IE', at: 'AT', pl: 'PL', cz: 'CZ',
  sk: 'SK', hu: 'HU', ro: 'RO', bg: 'BG', gr: 'GR', tr: 'TR', ua: 'UA', ru: 'RU',
  gb: 'GB', uk: 'GB', us: 'US', ca: 'CA', mx: 'MX', br: 'BR', ar: 'AR', cl: 'CL', co: 'CO',
  au: 'AU', nz: 'NZ', jp: 'JP', kr: 'KR', cn: 'CN', in: 'IN', za: 'ZA', ng: 'NG', eg: 'EG',
};

function cleanSegment(segment) {
  return segment
    .replace(/\.(m3u8|mp4|ts|aac|jpg|png|gif)$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveName(url) {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const candidate = cleanSegment(segments[segments.length - 1]);
      if (candidate && candidate.length >= 3) {
        return candidate;
      }
    }

    const host = parsed.hostname.replace(/^www\./i, '');
    return host;
  } catch {
    return url;
  }
}

function deriveGroup(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '');
    const prefix = host.split('.')[0];
    if (prefix && prefix !== host) {
      return prefix.toUpperCase();
    }
    return 'External';
  } catch {
    return 'External';
  }
}

function deriveCountry(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, '');
    const parts = host.split('.');
    const tld = parts.at(-1)?.toLowerCase() ?? 'us';
    return COUNTRY_BY_TLD[tld] ?? 'US';
  } catch {
    return 'US';
  }
}

async function loadWorkingUrls() {
  const raw = await fs.readFile(WORKING_LIST_PATH, 'utf8');
  return Array.from(
    new Set(
      raw
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && line.startsWith('http')),
    ),
  );
}

async function loadPlaylist() {
  const raw = await fs.readFile(PLAYLIST_PATH, 'utf8');
  const data = JSON.parse(raw);
  if (!Array.isArray(data)) {
    throw new Error('Existing playlist is not an array');
  }
  return data;
}

async function main() {
  const workingUrls = await loadWorkingUrls();
  const playlist = await loadPlaylist();
  const existingUrls = new Set(playlist.map((item) => item.url));

  const newEntries = [];
  for (const url of workingUrls) {
    if (existingUrls.has(url)) continue;

    newEntries.push({
      name: deriveName(url),
      country: deriveCountry(url),
      group: deriveGroup(url),
      logo: '',
      url,
      source: 'validated',
      verified: true,
      verifiedAt: new Date().toISOString(),
    });
  }

  if (newEntries.length === 0) {
    console.log('✅ No new validated URLs to add.');
    return;
  }

  const merged = [...playlist, ...newEntries];
  await fs.writeFile(PLAYLIST_PATH, `${JSON.stringify(merged, null, 2)}\n`, 'utf8');

  console.log(`✅ Added ${newEntries.length} validated channels to public/playlist.json`);
  console.log(`📦 Total playlist entries: ${merged.length}`);
}

main().catch((error) => {
  console.error('❌ Failed to merge validated URLs:', error);
  process.exit(1);
});
