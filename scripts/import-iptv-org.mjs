#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const playlistPath = path.join(repoRoot, 'public/playlist.json');
const LOGO = 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/11/IPTV-org-logo.svg/240px-IPTV-org-logo.svg.png';

const COUNTRIES = {
  fr: { country: 'FR', group: 'France' },
  cd: { country: 'CD', group: 'Afrique' },
  ci: { country: 'CI', group: 'Afrique' },
  cm: { country: 'CM', group: 'Afrique' },
  ma: { country: 'MA', group: 'Afrique' },
  dz: { country: 'DZ', group: 'Afrique' },
  tn: { country: 'TN', group: 'Afrique' },
  sn: { country: 'SN', group: 'Afrique' },
  ml: { country: 'ML', group: 'Afrique' },
  bf: { country: 'BF', group: 'Afrique' },
  be: { country: 'BE', group: 'Europe' },
  ch: { country: 'CH', group: 'Europe' },
  us: { country: 'US', group: 'USA' },
  gb: { country: 'GB', group: 'UK' },
  de: { country: 'DE', group: 'Germany' },
  es: { country: 'ES', group: 'Spain' },
  it: { country: 'IT', group: 'Italy' },
  pt: { country: 'PT', group: 'Portugal' },
  nl: { country: 'NL', group: 'Netherlands' },
};

const FAST_PLATFORMS = {
  fr_pluto: { country: 'FR', group: 'France (Pluto TV)', source: 'iptv-org/fr_pluto' },
  fr_rakuten: { country: 'FR', group: 'France (Rakuten)', source: 'iptv-org/fr_rakuten' },
  fr_samsung: { country: 'FR', group: 'France (Samsung TV)', source: 'iptv-org/fr_samsung' },
  fr_bfm: { country: 'FR', group: 'France (BFM)', source: 'iptv-org/fr_bfm' },
  fr_fashiontv: { country: 'FR', group: 'France (FashionTV)', source: 'iptv-org/fr_fashiontv' },
  fr_groupem6: { country: 'FR', group: 'France (M6)', source: 'iptv-org/fr_groupem6' },
  fr_groupecanalplus: { country: 'FR', group: 'France (Canal+)', source: 'iptv-org/fr_groupecanalplus' },
  us_pluto: { country: 'US', group: 'USA (Pluto TV)', source: 'iptv-org/us_pluto' },
  gb_pluto: { country: 'GB', group: 'UK (Pluto TV)', source: 'iptv-org/gb_pluto' },
  de_pluto: { country: 'DE', group: 'Germany (Pluto TV)', source: 'iptv-org/de_pluto' },
  es_pluto: { country: 'ES', group: 'Spain (Pluto TV)', source: 'iptv-org/es_pluto' },
};

function parseM3U(content) {
  const channels = [];
  const lines = content.split('\n');
  let current = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#EXTINF:')) {
      current = { attrs: {} };
      const nameMatch = trimmed.match(/,(.+)$/);
      if (nameMatch) current.name = nameMatch[1].trim();
      const logoMatch = trimmed.match(/tvg-logo="([^"]*)"/);
      if (logoMatch) current.logo = logoMatch[1];
      const groupMatch = trimmed.match(/group-title="([^"]*)"/);
      if (groupMatch) current.group = groupMatch[1];
      const tvgNameMatch = trimmed.match(/tvg-name="([^"]*)"/);
      if (tvgNameMatch) current.tvgName = tvgNameMatch[1];
    } else if (trimmed && !trimmed.startsWith('#') && current) {
      if (/^https?:\/\//i.test(trimmed)) {
        channels.push({
          name: current.tvgName || current.name || 'Unknown',
          group: current.group || 'General',
          logo: current.logo || LOGO,
          url: trimmed,
        });
      }
      current = null;
    }
  }

  return channels;
}

async function fetchM3U(code) {
  const url = `https://iptv-org.github.io/iptv/countries/${code}.m3u`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  ${url} → ${res.status}`); return []; }
    const text = await res.text();
    const channels = parseM3U(text);
    console.log(`  ${code}.m3u → ${channels.length} channels`);
    return channels;
  } catch (e) {
    console.warn(`  ${code}.m3u → ${e.message}`);
    return [];
  }
}

async function fetchFastM3U(code) {
  const url = `https://raw.githubusercontent.com/iptv-org/iptv/master/streams/${code}.m3u`;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  ${url} → ${res.status}`); return []; }
    const text = await res.text();
    const channels = parseM3U(text);
    console.log(`  ${code}.m3u → ${channels.length} channels (FAST)`);
    return channels;
  } catch (e) {
    console.warn(`  ${code}.m3u → ${e.message}`);
    return [];
  }
}

async function main() {
  console.log('Fetching playlists from iptv-org...\n');

  const countryCodes = Object.keys(COUNTRIES);
  const fastCodes = Object.keys(FAST_PLATFORMS);

  const countryResults = await Promise.all(countryCodes.map(fetchM3U));
  const fastResults = await Promise.all(fastCodes.map(fetchFastM3U));
  const newChannels = [];

  for (let i = 0; i < countryCodes.length; i++) {
    const code = countryCodes[i];
    const meta = COUNTRIES[code];
    for (const ch of countryResults[i]) {
      if (!ch.url || !ch.name) continue;
      const group = meta ? meta.group : (ch.group || 'General');
      const country = meta ? meta.country : code.slice(0, 2).toUpperCase();
      newChannels.push({
        name: ch.name, country, group,
        logo: ch.logo || LOGO,
        url: ch.url.split('#')[0].split('?')[0],
        source: `iptv-org/${code}`,
      });
    }
  }

  for (let i = 0; i < fastCodes.length; i++) {
    const code = fastCodes[i];
    const meta = FAST_PLATFORMS[code];
    for (const ch of fastResults[i]) {
      if (!ch.url || !ch.name) continue;
      newChannels.push({
        name: ch.name,
        country: meta.country,
        group: meta.group,
        logo: ch.logo || LOGO,
        url: ch.url.split('#')[0].split('?')[0],
        source: meta.source,
      });
    }
  }

  console.log(`\nTotal fetched: ${newChannels.length}`);

  // Load existing playlist
  let existing = [];
  try {
    existing = JSON.parse(await fs.readFile(playlistPath, 'utf8'));
  } catch { existing = []; }

  // Dedup by URL
  const existingUrls = new Set(existing.map(c => c.url));
  const toAdd = newChannels.filter(c => !existingUrls.has(c.url));

  console.log(`Existing: ${existing.length}, New to add: ${toAdd.length}`);

  if (toAdd.length === 0) {
    console.log('No new channels to add.');
    return;
  }

  // Add verified status
  const now = new Date().toISOString();
  const enriched = toAdd.map(c => ({
    ...c,
    verified: false,
    verifiedAt: null,
  }));

  // Write merged playlist
  const merged = [...existing, ...enriched];
  await fs.writeFile(playlistPath, JSON.stringify(merged, null, 2), 'utf8');
  console.log(`\nDone! Playlist now has ${merged.length} channels (+${toAdd.length} new).`);
  console.log('New sources:', [...new Set(toAdd.map(c => c.source))].join(', '));

  // Summary by country
  const byCountry = {};
  for (const c of toAdd) {
    byCountry[c.country] = (byCountry[c.country] || 0) + 1;
  }
  console.log('\nNew channels by country:');
  for (const [code, count] of Object.entries(byCountry).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${code}: ${count}`);
  }
}

main().catch(e => { console.error(e.message); process.exit(1); });
