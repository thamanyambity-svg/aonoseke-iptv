/**
 * Gestion des campagnes publicitaires (CRUD + reporting).
 *
 * @module useCampaigns
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';

export type CampaignType = 'preroll' | 'banner' | 'both';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended';

export interface CampaignContent {
  // Champs alignés sur l'interface PrerollAd/BannerAd existante
  title: string;
  subtitle?: string;
  cta?: string;
  url?: string;
  bg?: string;
  image?: string;
  logo?: string;
  eyebrow?: string;
  destinations?: string;
  legal?: string;
  variant?: 'souverain' | 'corridor';
  emblem?: boolean;
}

export interface Campaign {
  id: string;
  advertiser_id: string;
  advertiser_name: string;
  name: string;
  type: CampaignType;
  content: CampaignContent;
  start_at: string;
  end_at: string | null;
  target_countries: string[];
  target_categories: string[];
  impression_cap: number | null;
  click_cap: number | null;
  frequency_cap_per_user: number;
  weight: number;
  status: CampaignStatus;
  created_at: string;
  impressions: number;
  clicks: number;
  ctr: number;
}

export type CampaignInput = {
  advertiser_id: string;
  name: string;
  type: CampaignType;
  content: CampaignContent;
  start_at?: string;
  end_at?: string | null;
  target_countries?: string[];
  target_categories?: string[];
  impression_cap?: number | null;
  click_cap?: number | null;
  frequency_cap_per_user?: number;
  weight?: number;
};

export type CampaignUpdate = Partial<CampaignInput> & {
  status?: CampaignStatus;
};

export function useCampaigns(advertiserId?: string) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) {
      setError('Backend non configuré');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_campaigns', {
        p_advertiser_id: advertiserId ?? null,
      });
      if (rpcError) throw rpcError;
      setCampaigns((data as Campaign[]) ?? []);
    } catch (err) {
      logger.error('useCampaigns.load failed', err as Error);
      const msg = (err as Error).message ?? '';
      if (msg.includes('administrateur') || msg.includes('42501')) {
        setError('Accès refusé : réservé aux administrateurs.');
      } else {
        setError('Erreur lors du chargement des campagnes.');
      }
    } finally {
      setLoading(false);
    }
  }, [advertiserId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (input: CampaignInput): Promise<{ id?: string; error?: string }> => {
    if (!supabase) return { error: 'Backend non configuré' };
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_create_campaign', {
        p_advertiser_id: input.advertiser_id,
        p_name: input.name,
        p_type: input.type,
        p_content: input.content,
        p_start_at: input.start_at ?? new Date().toISOString(),
        p_end_at: input.end_at ?? null,
        p_target_countries: input.target_countries ?? [],
        p_target_categories: input.target_categories ?? [],
        p_impression_cap: input.impression_cap ?? null,
        p_click_cap: input.click_cap ?? null,
        p_frequency_cap_per_user: input.frequency_cap_per_user ?? 3,
        p_weight: input.weight ?? 10,
      });
      if (rpcError) throw rpcError;
      await load();
      return { id: data as string };
    } catch (err) {
      logger.error('useCampaigns.create failed', err as Error);
      return { error: (err as Error).message ?? 'Échec création' };
    }
  }, [load]);

  const update = useCallback(async (id: string, patch: CampaignUpdate): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Backend non configuré' };
    try {
      const { error: rpcError } = await supabase.rpc('admin_update_campaign', {
        p_id: id,
        p_name: patch.name ?? null,
        p_type: patch.type ?? null,
        p_content: patch.content ?? null,
        p_start_at: patch.start_at ?? null,
        p_end_at: patch.end_at ?? null,
        p_target_countries: patch.target_countries ?? null,
        p_target_categories: patch.target_categories ?? null,
        p_impression_cap: patch.impression_cap ?? null,
        p_click_cap: patch.click_cap ?? null,
        p_frequency_cap_per_user: patch.frequency_cap_per_user ?? null,
        p_weight: patch.weight ?? null,
        p_status: patch.status ?? null,
      });
      if (rpcError) throw rpcError;
      await load();
      return {};
    } catch (err) {
      logger.error('useCampaigns.update failed', err as Error);
      return { error: (err as Error).message ?? 'Échec mise à jour' };
    }
  }, [load]);

  const remove = useCallback(async (id: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Backend non configuré' };
    try {
      const { error: rpcError } = await supabase.rpc('admin_delete_campaign', { p_id: id });
      if (rpcError) throw rpcError;
      await load();
      return {};
    } catch (err) {
      logger.error('useCampaigns.remove failed', err as Error);
      return { error: (err as Error).message ?? 'Échec suppression' };
    }
  }, [load]);

  return { campaigns, loading, error, load, create, update, remove };
}
