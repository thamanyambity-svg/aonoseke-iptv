/**
 * Analytics — enregistre vues, impressions et clics pub dans Supabase
 * (table view_events). C'est la source des statistiques d'audience du
 * tableau de bord admin (preuve pour les annonceurs).
 *
 * Sans Supabase, compteurs locaux uniquement (mode démo).
 */
import { supabase } from '../lib/supabaseClient.ts';

export type EventType = 'channel_view' | 'ad_impression' | 'ad_click' | 'session_start';

const LOCAL_KEY = 'iptv-analytics';

function bumpLocal(type: EventType): void {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const counts = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    counts[type] = (counts[type] ?? 0) + 1;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(counts));
  } catch {
    /* quota / private mode */
  }
}

export function trackEvent(type: EventType, ref?: string): void {
  bumpLocal(type);
  if (!supabase) return;
  // user_id est résolu côté session ; null si anonyme
  void supabase.auth.getUser().then(({ data }) => {
    void supabase!.from('view_events').insert({
      event_type: type,
      ref: ref ?? null,
      user_id: data.user?.id ?? null,
    });
  });
}

export function getLocalStats(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
