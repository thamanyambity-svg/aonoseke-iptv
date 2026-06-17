/**
 * Gestion des annonceurs (CRUD).
 *
 * Toutes les opérations passent par des RPC Supabase security_definer
 * qui vérifient is_admin() côté serveur. Aucune écriture directe de
 * table depuis le client.
 *
 * @module useAdvertisers
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';

export interface Advertiser {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  phone: string | null;
  logo_url: string | null;
  status: 'active' | 'paused' | 'archived';
  notes: string | null;
  created_at: string;
  active_campaigns: number;
  total_impressions: number;
  total_clicks: number;
}

export type AdvertiserInput = {
  name: string;
  contact_name?: string | null;
  contact_email?: string | null;
  phone?: string | null;
  logo_url?: string | null;
  notes?: string | null;
};

export type AdvertiserUpdate = Partial<AdvertiserInput> & {
  status?: 'active' | 'paused' | 'archived';
};

export function useAdvertisers() {
  const [advertisers, setAdvertisers] = useState<Advertiser[]>([]);
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
      const { data, error: rpcError } = await supabase.rpc('admin_list_advertisers');
      if (rpcError) throw rpcError;
      setAdvertisers((data as Advertiser[]) ?? []);
    } catch (err) {
      logger.error('useAdvertisers.load failed', err as Error);
      const msg = (err as Error).message ?? '';
      if (msg.includes('administrateur') || msg.includes('42501')) {
        setError('Accès refusé : réservé aux administrateurs.');
      } else {
        setError('Erreur lors du chargement des annonceurs.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (input: AdvertiserInput): Promise<{ id?: string; error?: string }> => {
    if (!supabase) return { error: 'Backend non configuré' };
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_create_advertiser', {
        p_name: input.name,
        p_contact_name: input.contact_name ?? null,
        p_contact_email: input.contact_email ?? null,
        p_phone: input.phone ?? null,
        p_logo_url: input.logo_url ?? null,
        p_notes: input.notes ?? null,
      });
      if (rpcError) throw rpcError;
      await load();
      return { id: data as string };
    } catch (err) {
      logger.error('useAdvertisers.create failed', err as Error);
      return { error: (err as Error).message ?? 'Échec création' };
    }
  }, [load]);

  const update = useCallback(async (id: string, patch: AdvertiserUpdate): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Backend non configuré' };
    try {
      const { error: rpcError } = await supabase.rpc('admin_update_advertiser', {
        p_id: id,
        p_name: patch.name ?? null,
        p_contact_name: patch.contact_name ?? null,
        p_contact_email: patch.contact_email ?? null,
        p_phone: patch.phone ?? null,
        p_logo_url: patch.logo_url ?? null,
        p_status: patch.status ?? null,
        p_notes: patch.notes ?? null,
      });
      if (rpcError) throw rpcError;
      await load();
      return {};
    } catch (err) {
      logger.error('useAdvertisers.update failed', err as Error);
      return { error: (err as Error).message ?? 'Échec mise à jour' };
    }
  }, [load]);

  const remove = useCallback(async (id: string): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Backend non configuré' };
    try {
      const { error: rpcError } = await supabase.rpc('admin_delete_advertiser', { p_id: id });
      if (rpcError) throw rpcError;
      await load();
      return {};
    } catch (err) {
      logger.error('useAdvertisers.remove failed', err as Error);
      return { error: (err as Error).message ?? 'Échec suppression' };
    }
  }, [load]);

  return { advertisers, loading, error, load, create, update, remove };
}
