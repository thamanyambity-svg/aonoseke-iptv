/**
 * Auto-masquage des chaînes qui ne jouent pas.
 *
 * Quand un flux échoue à la lecture dans le navigateur (erreur HLS fatale),
 * on mémorise son URL ici. Elle est alors filtrée de la liste → l'utilisateur
 * ne retombe jamais sur la même chaîne cassée. Aucune vérification n'étant
 * parfaite ni permanente, c'est ce filet runtime qui garantit la crédibilité.
 *
 * Persisté en localStorage avec expiration (24 h) : une chaîne marquée morte
 * est ré-essayée le lendemain, au cas où elle reviendrait.
 */
import { useState, useCallback, useEffect } from 'react';

const KEY = 'iptv-dead-channels';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 h

type DeadMap = Record<string, number>; // url -> timestamp

function read(): DeadMap {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    const map = JSON.parse(raw) as DeadMap;
    const now = Date.now();
    // purge les entrées expirées
    let changed = false;
    for (const [url, ts] of Object.entries(map)) {
      if (now - ts > TTL_MS) { delete map[url]; changed = true; }
    }
    if (changed) localStorage.setItem(KEY, JSON.stringify(map));
    return map;
  } catch {
    return {};
  }
}

export function useDeadChannels(): {
  deadSet: Set<string>;
  markDead: (url: string) => void;
} {
  const [map, setMap] = useState<DeadMap>(() => read());

  useEffect(() => {
    const onStorage = (e: StorageEvent): void => {
      if (e.key === KEY) setMap(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const markDead = useCallback((url: string): void => {
    if (!url) return;
    setMap((prev) => {
      if (prev[url]) return prev;
      const next = { ...prev, [url]: Date.now() };
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { deadSet: new Set(Object.keys(map)), markDead };
}
