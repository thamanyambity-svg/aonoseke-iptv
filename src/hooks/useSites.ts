/**
 * Annuaire de sources de streaming (façon OuStreamer).
 *
 * Charge public/sites.json puis vérifie l'accessibilité de chaque site
 * côté client via une sonde favicon (contourne les restrictions CORS :
 * une image cross-origin se charge même sans en-tête CORS).
 *
 * Le statut serveur "réel" (ping toutes les 5 min) arrivera via une
 * fonction Vercel Cron quand Supabase sera actif — voir api/cron-uptime.ts.
 */
import { useState, useEffect, useCallback } from 'react';
import { logger } from '../utils/logger.ts';

export type SiteStatus = 'online' | 'offline' | 'checking' | 'unknown';

export interface StreamSite {
  id: string;
  name: string;
  category: string;
  language: string;
  country: string;
  url: string;
  logo: string;
  description: string;
  status: SiteStatus;
  legal: boolean;
}

/** Sonde une URL via le chargement d'une image (favicon). */
function probe(url: string, timeoutMs = 6000): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false;
    const img = new Image();
    const finish = (ok: boolean): void => {
      if (done) return;
      done = true;
      img.src = '';
      resolve(ok);
    };
    const timer = setTimeout(() => finish(false), timeoutMs);
    img.onload = () => { clearTimeout(timer); finish(true); };
    img.onerror = () => { clearTimeout(timer); finish(false); };
    try {
      const host = new URL(url).hostname;
      img.src = `https://www.google.com/s2/favicons?domain=${host}&sz=32&_=${Date.now()}`;
    } catch {
      finish(false);
    }
  });
}

export function useSites(): {
  sites: StreamSite[];
  loading: boolean;
  error: boolean;
  checkAll: () => void;
  checking: boolean;
} {
  const [sites, setSites] = useState<StreamSite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/sites.json', { signal: controller.signal })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('no sites'))))
      .then((data: StreamSite[]) => setSites(data))
      .catch((err) => {
        if ((err as Error).name !== 'AbortError') {
          logger.warn('sites.json introuvable', { error: String(err) });
          setError(true);
        }
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, []);

  const checkAll = useCallback((): void => {
    if (checking || sites.length === 0) return;
    setChecking(true);
    setSites((prev) => prev.map((s) => ({ ...s, status: 'checking' })));

    void Promise.all(
      sites.map(async (s) => {
        const ok = await probe(s.url);
        return { id: s.id, status: (ok ? 'online' : 'offline') as SiteStatus };
      }),
    ).then((results) => {
      const map = new Map(results.map((r) => [r.id, r.status]));
      setSites((prev) =>
        prev.map((s) => ({ ...s, status: map.get(s.id) ?? s.status })),
      );
      setChecking(false);
    });
  }, [sites, checking]);

  return { sites, loading, error, checkAll, checking };
}
