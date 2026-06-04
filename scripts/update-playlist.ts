/**
 * Update playlist from M3U8 source
 * Converts M3U8 format to JSON
 */

import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const M3U_URL = 'https://iptv-org.github.io/iptv/index.m3u';
const OUTPUT_PATH = path.join(__dirname, '..', 'public', 'playlist.json');
const MAX_CHANNELS = 2000;

interface Channel {
  name: string;
  country: string;
  group: string;
  logo: string;
  url: string;
}

interface ParsedChannel {
  name?: string;
  logo?: string;
  group?: string;
  country?: string;
  url?: string;
}

async function updatePlaylist(): Promise<void> {
  try {
    console.log('📥 Downloading IPTV playlist from', M3U_URL);
    const response = await fetch(M3U_URL);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.text();
    const lines = data.split('\n');

    const channels: Channel[] = [];
    let currentChannel: ParsedChannel = {};

    console.log('🔄 Parsing M3U format...');
    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('#EXTINF:')) {
        const nameMatch = trimmed.match(/,(.*)$/);
        const logoMatch = trimmed.match(/tvg-logo="(.*?)"/);
        const groupMatch = trimmed.match(/group-title="(.*?)"/);
        const countryMatch = trimmed.match(/tvg-country="(.*?)"/);

        currentChannel = {
          name: nameMatch ? nameMatch[1].trim() : 'Unknown',
          logo: logoMatch ? logoMatch[1] : '',
          group: groupMatch ? groupMatch[1] : 'General',
          country: countryMatch ? countryMatch[1].toUpperCase() : 'US',
        };
      } else if (trimmed.startsWith('http') && currentChannel.name && currentChannel.url === undefined) {
        currentChannel.url = trimmed;

        // Basic validation
        if (
          currentChannel.name &&
          currentChannel.url &&
          currentChannel.group &&
          currentChannel.country
        ) {
          channels.push({
            name: currentChannel.name,
            country: currentChannel.country,
            group: currentChannel.group,
            logo: currentChannel.logo || '',
            url: currentChannel.url,
          });
        }

        currentChannel = {};

        if (channels.length >= MAX_CHANNELS) {
          console.log(`⏹️  Reached maximum of ${MAX_CHANNELS} channels`);
          break;
        }
      }
    }

    if (channels.length === 0) {
      throw new Error('No valid channels parsed from playlist');
    }

    console.log(`✅ Successfully parsed ${channels.length} channels`);

    // Ensure output directory exists
    const outputDir = path.dirname(OUTPUT_PATH);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(channels, null, 2));
    console.log(`📁 Saved to ${OUTPUT_PATH}`);
    console.log(`📊 Playlist size: ${(fs.statSync(OUTPUT_PATH).size / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

updatePlaylist();
