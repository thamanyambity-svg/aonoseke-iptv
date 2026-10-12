/**
 * Analytics — enregistre vues, impressions et clics pub dans Supabase
 * (table view_events). C'est la source des statistiques d'audience du
 * tableau de bord admin (preuve pour les annonceurs).
 *
 * Sans Supabase, compteurs locaux uniquement (mode démo).
 */
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';

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

export function trackEvent(type: EventType, ref?: string, category?: string): void {
  bumpLocal(type);
  if (!supabase) return;
  // user_id est résolu côté session ; null si anonyme.
  // IMPORTANT : une requête supabase-js n'est envoyée que lorsqu'on appelle `.then()` (ou `await`).
  // Un simple `void supabase.from(...).insert(...)` n'envoie RIEN — c'est ce qui laissait la table
  // view_events vide et les statistiques d'audience du tableau de bord à zéro.
  void supabase.auth
    .getUser()
    .then(({ data }) =>
      supabase!
        .from('view_events')
        .insert({
          event_type: type,
          ref: ref ?? null,
          category: category ?? null,
          user_id: data.user?.id ?? null,
        })
        .then(({ error }) => {
          if (error) logger.warn('trackEvent : insertion refusée', { type, error: error.message });
        }),
    )
    .then(undefined, () => {
      /* réseau indisponible : la mesure d'audience n'est pas critique */
    });
}

const SESSION_KEY = 'iptv-session-started';

/**
 * Enregistre UNE ouverture de l'application par onglet/session (alimente « Sessions · 7 jours »).
 * Avant ce correctif, l'événement `session_start` n'était émis nulle part : le compteur restait à 0.
 */
export function trackSessionStart(): void {
  try {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    sessionStorage.setItem(SESSION_KEY, '1');
  } catch {
    /* stockage indisponible : on enregistre quand même */
  }
  trackEvent('session_start');
}

/**
 * Heartbeat : signale ~60s de présence active de l'utilisateur connecté.
 * Sert à mesurer le temps de connexion réel (table user_activity).
 */
export function trackHeartbeat(): void {
  if (!supabase) return;
  // `.then()` obligatoire : sans lui supabase-js n'envoie pas la requête (voir trackEvent).
  void supabase.rpc('track_heartbeat', { p_seconds: 60 }).then(({ error }) => {
    if (error) logger.warn('trackHeartbeat : échec', { error: error.message });
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
