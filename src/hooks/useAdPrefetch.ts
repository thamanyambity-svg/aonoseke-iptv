/**
 * useAdPrefetch — anticipation + préchargement des publicités, STRICTEMENT
 * découplé du flux vidéo.
 *
 * Règle d'or perf : rien ici ne touche l'élément <video>. Tout (fetch RPC,
 * minuteurs, préchargement d'assets) tourne en arrière-plan ; si Supabase est
 * lent ou absent, la vidéo continue, l'overlay reste simplement vide.
 *
 * Cycle : repère d'injection → on PRÉCHARGE l'asset 30 s AVANT (objet Image()
 * pour les images, <link rel="preload" as="video"> pour les vidéos) → au repère,
 * l'asset est déjà en cache navigateur → affichage instantané, zéro buffering.
 *
 * @module useAdPrefetch
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';
import type { AdCampaign } from './useAdMatrix.ts';

const PREFETCH_LEAD_MS = 30_000;     // précharge 30 s avant le repère d'injection
const FIRST_CUE_MS = 45_000;         // 1re injection 45 s après le démarrage
const INTERVAL_MS = 6 * 60_000;      // puis toutes les ~6 min
const AD_DURATION_MS = 15_000;       // durée d'affichage par pub
const RETRY_MS = 15_000;             // réessai si pool vide

export interface PrefetchedAd {
  campaignId: string;
  advertiser: string;
  type: AdCampaign['type'];
  content: AdCampaign['content'];
}

/** Force le navigateur à télécharger l'asset en arrière-plan. Renvoie un cleanup. */
function prefetchAsset(content: AdCampaign['content']): () => void {
  if (content.image) {
    const img = new Image();
    img.decoding = 'async';
    img.src = content.image;          // déclenche le téléchargement + mise en cache
  }
  if (content.video) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'video';
    link.href = content.video;
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch { /* déjà retiré */ } };
  }
  return () => {};
}

/**
 * @param enabled  false (ex. aucune chaîne active) met le cycle en pause.
 * @returns `ad` : la pub à afficher MAINTENANT (null sinon) + `dismiss()`.
 */
export function useAdPrefetch(enabled: boolean): { ad: PrefetchedAd | null; dismiss: () => void } {
  const [ad, setAd] = useState<PrefetchedAd | null>(null);
  const pool = useRef<AdCampaign[]>([]);
  const idx = useRef(0);
  const timers = useRef<number[]>([]);
  const cleanups = useRef<Array<() => void>>([]);

  const clearAll = useCallback(() => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
    cleanups.current.forEach((c) => c());
    cleanups.current = [];
  }, []);

  const loadPool = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.rpc('get_active_campaigns', { p_limit: 10 });
      if (!error && Array.isArray(data)) pool.current = data as AdCampaign[];
    } catch (e) {
      logger.warn('useAdPrefetch: loadPool failed', { error: String(e) });
    }
  }, []);

  const scheduleNext = useCallback((delay: number): void => {
    if (pool.current.length === 0) {
      timers.current.push(window.setTimeout(() => {
        void loadPool().then(() => scheduleNext(RETRY_MS));
      }, delay));
      return;
    }
    const camp = pool.current[idx.current % pool.current.length];
    idx.current += 1;

    // 1) Préchargement 30 s avant le repère.
    timers.current.push(window.setTimeout(() => {
      cleanups.current.push(prefetchAsset(camp.content));
    }, Math.max(0, delay - PREFETCH_LEAD_MS)));

    // 2) Au repère : affichage (asset déjà préchargé).
    timers.current.push(window.setTimeout(() => {
      setAd({ campaignId: camp.id, advertiser: camp.advertiser_name, type: camp.type, content: camp.content });
      // 3) Auto-retrait puis programmation de la suivante.
      timers.current.push(window.setTimeout(() => {
        setAd(null);
        scheduleNext(INTERVAL_MS);
      }, AD_DURATION_MS));
    }, delay));
  }, [loadPool]);

  useEffect(() => {
    if (!enabled) {
      clearAll();
      setAd(null);
      return;
    }
    void loadPool().then(() => scheduleNext(FIRST_CUE_MS));
    return clearAll;
  }, [enabled, loadPool, scheduleNext, clearAll]);

  const dismiss = useCallback(() => setAd(null), []);
  return { ad, dismiss };
}
