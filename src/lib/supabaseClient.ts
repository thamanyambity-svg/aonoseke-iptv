/**
 * Client Supabase (SDK officiel) — auth réelle + base de données.
 * Configuré via VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
 */
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseEnabled = Boolean(URL && KEY);

export const supabase: SupabaseClient | null = isSupabaseEnabled
  ? createClient(URL as string, KEY as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/** Résultat typé d'un appel RPC : `data` est `unknown` (à valider/caster par l'appelant), jamais `any`. */
export interface RpcResult {
  data: unknown;
  error: PostgrestError | null;
}

/**
 * Appel RPC typé. Sans client configuré, renvoie une erreur plutôt que de lever.
 */
export async function rpc(fn: string, args?: Record<string, unknown>): Promise<RpcResult> {
  if (!supabase) {
    return {
      data: null,
      error: { name: 'PostgrestError', message: 'Supabase non configuré', details: '', hint: '', code: 'NOT_CONFIGURED' } as PostgrestError,
    };
  }
  return (await supabase.rpc(fn, args)) as RpcResult;
}
