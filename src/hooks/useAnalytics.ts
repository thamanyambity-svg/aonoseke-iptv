/**
 * Analytics léger — suivi des vues, impressions pub et clics.
 *
 * Stocke localement (compteurs agrégés) et, si Supabase est configuré
 * (VITE_SUPABASE_URL), pousse chaque événement dans la table `view_events`
 * pour la facturation annonceurs. Sans backend, fonctionne en mode local.
 */
import { logger } from '../utils/logger.ts';

export type EventType =
  | 'channel_view'
  | 'ad_impression'
  | 'ad_click'
  | 'session_start';

interface AnalyticsEvent {
  type: EventType;
  ref?: string; // channel url, ad id…
  ts: number;
}

const LOCAL_KEY = 'iptv-analytics';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function bumpLocal(type: EventType): void {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const counts = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    counts[type] = (counts[type] ?? 0) + 1;
    localStorage.setItem(LOCAL_KEY, JSON.stringify(counts));
  } catch {
    /* quota / private mode — ignore */
  }
}

async function pushRemote(evt: AnalyticsEvent): Promise<void> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return;
  try {
    let userId: string | null = null;
    try {
      const u = localStorage.getItem('iptv-auth-user');
      if (u) userId = (JSON.parse(u) as { email?: string }).email ?? null;
    } catch {
      /* ignore */
    }
    await fetch(`${SUPABASE_URL}/rest/v1/view_events`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        event_type: evt.type,
        ref: evt.ref ?? null,
        user_email: userId,
        created_at: new Date(evt.ts).toISOString(),
      }),
    });
  } catch (err) {
    logger.warn('Analytics push failed', { error: String(err) });
  }
}

export function trackEvent(type: EventType, ref?: string): void {
  bumpLocal(type);
  void pushRemote({ type, ref, ts: Date.now() });
}

export function getLocalStats(): Record<string, number> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}
