export interface Channel {
  name: string;
  country: string;
  group: string;
  logo: string;
  url: string;
}

export interface PlayerProps {
  url: string;
  onError?: (message: string) => void;
}

export function validatePlaylist(data: unknown): Channel[] {
  if (!Array.isArray(data)) {
    throw new Error('Playlist must be an array');
  }

  return data.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      throw new Error(`Item ${idx} is not an object`);
    }

    const ch = item as Record<string, unknown>;
    if (typeof ch.name !== 'string' || !ch.name) {
      throw new Error(`Item ${idx}: missing or invalid 'name'`);
    }
    if (typeof ch.url !== 'string' || !ch.url) {
      throw new Error(`Item ${idx}: missing or invalid 'url'`);
    }

    return {
      name: ch.name,
      country: typeof ch.country === 'string' ? ch.country : 'US',
      group: typeof ch.group === 'string' ? ch.group : 'General',
      logo: typeof ch.logo === 'string' ? ch.logo : '',
      url: ch.url,
    };
  });
}
