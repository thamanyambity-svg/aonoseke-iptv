export interface Channel {
  name: string;
  country: string;
  group: string;
  logo: string;
  url: string;
  source?: string;        // FAST provider id (e.g. 'pluto')
  adSupported?: boolean;  // stream carries built-in server-side ads
  geoBlocked?: boolean;   // le serveur refuse l'accès depuis certains pays (403/451) : peut ne pas se lancer
  geoReason?: string;     // raison relevée par la vérification des sources
  backups?: string[] | undefined;     // adresses de secours : le lecteur les essaie si `url` échoue
}

export interface PlayerProps {
  url: string;
  backups?: string[] | undefined;
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
      ...(typeof ch.source === 'string' ? { source: ch.source } : {}),
      ...(typeof ch.adSupported === 'boolean' ? { adSupported: ch.adSupported } : {}),
      ...(ch.geoBlocked === true ? { geoBlocked: true as const } : {}),
      ...(ch.geoBlocked === true && typeof ch.geoReason === 'string' ? { geoReason: ch.geoReason } : {}),
      ...(Array.isArray(ch.backups)
        ? { backups: ch.backups.filter((b): b is string => typeof b === 'string' && b.length > 0) }
        : {}),
    };
  });
}
