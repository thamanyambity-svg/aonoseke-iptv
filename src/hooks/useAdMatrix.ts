/**
 * Hook: useAdMatrix
 * Campagnes publicitaires actives — SYSTÈME UNIFIÉ (campaigns/advertisers).
 *
 * Consolidation : lit désormais `get_active_campaigns` (modèle riche : annonceurs,
 * ciblage pays/catégorie, caps via ad_events, rotation pondérée) au lieu de
 * l'ancien `get_active_ad_campaigns` (table ad_campaigns, laissée dormante).
 * → Les campagnes créées dans la régie IA sont enfin réellement diffusées.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger.ts';
import type { CampaignContent } from './useCampaigns.ts';

export interface AdCampaign {
  id: string;                 // UUID (campaigns.id)
  advertiser_name: string;
  name: string;
  type: 'preroll' | 'banner' | 'both';
  content: CampaignContent;   // title/subtitle/cta/url/image/video/…
  weight: number;
  frequency_cap_per_user: number;
}

export function useAdMatrix() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const pollingIntervalRef = useRef<number | null>(null);

  const fetchActiveCampaigns = useCallback(async () => {
    if (!supabase) {
      setError('Backend non configuré');
      return;
    }
    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_active_campaigns', { p_limit: 10 });
      if (rpcError) {
        logger.warn('useAdMatrix: fetchActiveCampaigns error', { error: rpcError.message });
        setError(rpcError.message);
        setCampaigns([]);
        return;
      }
      const ads = Array.isArray(data) ? (data as AdCampaign[]) : [];
      setCampaigns(ads);
      setError(null);
      if (ads.length > 0) logger.info('useAdMatrix: loaded campaigns', { count: ads.length });
    } catch (err) {
      logger.error('useAdMatrix: unexpected error', err as Error);
      setError((err as Error).message);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchActiveCampaigns();
    pollingIntervalRef.current = window.setInterval(() => void fetchActiveCampaigns(), 30_000);
    return () => {
      if (pollingIntervalRef.current !== null) window.clearInterval(pollingIntervalRef.current);
    };
  }, [fetchActiveCampaigns]);

  const nextAd = useCallback(() => {
    setCurrentAdIndex((prev) => (campaigns.length > 0 ? (prev + 1) % campaigns.length : 0));
  }, [campaigns.length]);

  const currentAd = campaigns.length > 0 ? campaigns[currentAdIndex % campaigns.length] : null;

  return { campaigns, currentAd, loading, error, fetchActiveCampaigns, nextAd };
}
