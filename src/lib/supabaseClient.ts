/**
 * Client Supabase (SDK officiel) — auth réelle + base de données.
 * Configuré via VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

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
