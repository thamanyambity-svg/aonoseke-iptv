import fetch from 'node-fetch';
import fs from 'fs';

const M3U_URL = 'https://iptv-org.github.io/iptv/index.m3u';
const OUTPUT_PATH = './public/playlist.json';

async function updatePlaylist() {
  console.log('Downloading IPTV playlist...');
  const response = await fetch(M3U_URL);
  const data = await response.text();
  const lines = data.split('\n');
  
  const channels = [];
  let currentChannel = {};

  console.log('Parsing M3U...');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    if (line.startsWith('#EXTINF:')) {
      // Parse metadata
      const nameMatch = line.match(/,(.*)$/);
      const logoMatch = line.match(/tvg-logo="(.*?)"/);
      const groupMatch = line.match(/group-title="(.*?)"/);
      const countryMatch = line.match(/tvg-country="(.*?)"/);

      currentChannel = {
        name: nameMatch ? nameMatch[1].trim() : 'Unknown',
        logo: logoMatch ? logoMatch[1] : '',
        group: groupMatch ? groupMatch[1] : 'General',
        country: countryMatch ? countryMatch[1].toUpperCase() : '🌐'
      };
    } else if (line.startsWith('http')) {
      currentChannel.url = line;
      if (currentChannel.name && currentChannel.url) {
        channels.push({ ...currentChannel });
      }
      currentChannel = {};
    }

    // Limit to 2000 channels for performance on TV
    if (channels.length >= 2000) break;
  }

  console.log(`Successfully parsed ${channels.length} channels.`);
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(channels, null, 2));
  console.log(`Saved to ${OUTPUT_PATH}`);
}

updatePlaylist().catch(err => console.error(err));
