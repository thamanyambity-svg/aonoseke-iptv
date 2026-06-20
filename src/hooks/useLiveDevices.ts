/**
 * Appareils connectés en direct (présence par appareil, IP côté serveur).
 *
 * Source : RPC `admin_live_devices` (security definer + is_admin()). Renvoie
 * TOUS les appareils vus récemment — connectés ET démo/anonymes — avec leur IP.
 *
 * @module useLiveDevices
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';

export interface LiveDevice {
  device_id: string;
  ip: string | null;
  kind: string;            // 'Connecté' | 'Démo / anonyme'
  email: string | null;
  device: string | null;   // 'tv' | 'mobile' | 'desktop'
  country: string | null;
  city: string | null;
  user_agent: string | null;
  pings: number;
  first_seen_at: string;
  last_seen_at: string;
}

export function useLiveDevices(windowSeconds = 300, autoRefreshMs = 15_000) {
  const [devices, setDevices] = useState<LiveDevice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!supabase) { setError('Backend non configuré'); setLoading(false); return; }
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_live_devices', {
        p_window_seconds: windowSeconds,
      });
      if (rpcError) throw rpcError;
      setDevices((data as LiveDevice[]) ?? []);
    } catch (err) {
      logger.error('useLiveDevices.load failed', err as Error);
      const msg = (err as Error).message ?? '';
      setError(msg.includes('administrateur') || msg.includes('42501')
        ? 'Accès refusé : réservé aux administrateurs.'
        : 'Erreur lors du chargement des appareils.');
    } finally {
      setLoading(false);
    }
  }, [windowSeconds]);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, autoRefreshMs);
    return () => window.clearInterval(t);
  }, [load, autoRefreshMs]);

  return { devices, loading, error, reload: load };
}
