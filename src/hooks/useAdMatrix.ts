/**
 * Hook: useAdMatrix
 * Fetch et gère les campagnes publicitaires actives du système Smart-Stream Ad Matrix
 * Polling toutes les 10s, avec support offline graceful
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger.ts';

export interface AdCampaign {
  id: number;
  client_name: string;
  ad_type: 'banner' | 'video' | 'image';
  media_url: string;
  max_duration_per_day_mins: number;
  remaining_impressions: number;
  remaining_clicks: number;
}

export function useAdMatrix() {
  const [campaigns, setCampaigns] = useState<AdCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const pollingIntervalRef = useRef<number | null>(null);

  // Récupérer les campagnes actives
  const fetchActiveCampaigns = useCallback(async () => {
    if (!supabase) {
      setError('Backend non configuré');
      return;
    }

    try {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('get_active_ad_campaigns');

      if (rpcError) {
        logger.warn('useAdMatrix: fetchActiveCampaigns error', { error: rpcError.message });
        setError(rpcError.message);
        setCampaigns([]);
        return;
      }

      const ads = Array.isArray(data) ? (data as AdCampaign[]) : [];
      setCampaigns(ads);
      setError(null);
      
      if (ads.length > 0) {
        logger.info('useAdMatrix: loaded campaigns', { count: ads.length });
      }
    } catch (err) {
      logger.error('useAdMatrix: unexpected error', err as Error);
      setError((err as Error).message);
      setCampaigns([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Setup polling et cleanup
  useEffect(() => {
    void fetchActiveCampaigns(); // chargement initial

    // Polling toutes les 10s
    pollingIntervalRef.current = window.setInterval(
      () => void fetchActiveCampaigns(),
      10_000
    );

    return () => {
      if (pollingIntervalRef.current !== null) {
        window.clearInterval(pollingIntervalRef.current);
      }
    };
  }, [fetchActiveCampaigns]);

  // Rotation circulaire entre les campagnes
  const nextAd = useCallback(() => {
    if (campaigns.length > 0) {
      setCurrentAdIndex((prev) => (prev + 1) % campaigns.length);
    }
  }, [campaigns.length]);

  const currentAd = campaigns.length > 0 ? campaigns[currentAdIndex] : null;

  return {
    campaigns,
    currentAd,
    loading,
    error,
    fetchActiveCampaigns,
    nextAd,
  };
}
