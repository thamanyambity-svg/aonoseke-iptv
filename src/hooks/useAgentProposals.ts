/**
 * Propositions des agents IA (Smart-Stream Ad Matrix) en attente de validation.
 *
 * RÈGLE D'OR : on ne fait QUE lister + résoudre via RPC. L'exécution réelle de
 * l'action n'a lieu QUE côté serveur dans `admin_resolve_agent_proposal` au
 * moment du VALIDER. Aucune mutation pub n'est déclenchée par ce hook.
 *
 * @module useAgentProposals
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';

export type AgentKind = 'yield' | 'swarm' | 'context' | 'sentinel';

export interface AgentProposal {
  id: string;
  agent: AgentKind;
  kind: string;
  title: string;
  summary: string;
  payload: Record<string, unknown>;
  target_campaign_id: string | null;
  confidence: number;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  created_at: string;
}

export function useAgentProposals(autoRefreshMs = 20_000) {
  const [proposals, setProposals] = useState<AgentProposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!supabase) { setError('Backend non configuré'); setLoading(false); return; }
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_list_agent_proposals', { p_status: 'pending' });
      if (rpcError) throw rpcError;
      setProposals((data as AgentProposal[]) ?? []);
      setError(null);
    } catch (err) {
      logger.error('useAgentProposals.load failed', err as Error);
      const msg = (err as Error).message ?? '';
      setError(msg.includes('administrateur') || msg.includes('42501')
        ? 'Accès refusé : réservé aux administrateurs.'
        : 'Erreur lors du chargement des propositions.');
    } finally {
      setLoading(false);
    }
  }, []);

  /** Valider (exécute l'action côté serveur) ou rejeter une proposition. */
  const resolve = useCallback(async (id: string, approve: boolean): Promise<{ error?: string }> => {
    if (!supabase) return { error: 'Backend non configuré' };
    try {
      const { error: rpcError } = await supabase.rpc('admin_resolve_agent_proposal', { p_id: id, p_approve: approve });
      if (rpcError) throw rpcError;
      setProposals((prev) => prev.filter((p) => p.id !== id)); // retrait optimiste
      return {};
    } catch (err) {
      logger.error('useAgentProposals.resolve failed', err as Error);
      return { error: (err as Error).message ?? 'Échec de l\'action' };
    }
  }, []);

  useEffect(() => {
    void load();
    const t = window.setInterval(() => { if (document.visibilityState === 'visible') void load(); }, autoRefreshMs);
    return () => window.clearInterval(t);
  }, [load, autoRefreshMs]);

  return { proposals, loading, error, reload: load, resolve };
}
