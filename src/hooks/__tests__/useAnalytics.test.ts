import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createClient } from '@supabase/supabase-js';

// Vrai client supabase-js (donc vraie évaluation paresseuse des requêtes) avec un fetch espion :
// un `void supabase.from(...).insert(...)` n'enverrait aucune requête.
const { requests, fakeFetch } = vi.hoisted(() => {
  const requests: { method: string; path: string; body: unknown }[] = [];
  const fakeFetch = (url: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    const u = new URL(href);
    const raw = init?.body;
    requests.push({ method: init?.method ?? 'GET', path: u.pathname, body: typeof raw === 'string' ? (JSON.parse(raw) as unknown) : null });
    const isAuth = u.pathname.includes('/auth/v1/user');
    return Promise.resolve(
      new Response(isAuth ? '{"message":"no session"}' : '[]', { status: isAuth ? 401 : 201, headers: { 'content-type': 'application/json' } }),
    );
  };
  return { requests, fakeFetch };
});

vi.mock('../../lib/supabaseClient.ts', () => ({
  supabase: createClient('https://x.supabase.co', 'anon-key', {
    global: { fetch: fakeFetch },
    auth: { persistSession: false, autoRefreshToken: false },
  }),
}));

import { trackEvent, trackHeartbeat, trackSessionStart } from '../useAnalytics.ts';

const flush = (): Promise<void> => new Promise((r) => setTimeout(r, 50));

describe('useAnalytics — les événements sont réellement envoyés', () => {
  beforeEach(() => {
    requests.length = 0;
    sessionStorage.clear();
  });

  it('trackEvent envoie un POST sur view_events avec le bon contenu', async () => {
    trackEvent('channel_view', 'https://flux/a.m3u8', 'Afrique');
    await flush();
    const post = requests.find((r) => r.method === 'POST' && r.path === '/rest/v1/view_events');
    expect(post).toBeDefined();
    expect(post?.body).toMatchObject({ event_type: 'channel_view', ref: 'https://flux/a.m3u8', category: 'Afrique', user_id: null });
  });

  it('trackSessionStart envoie session_start une seule fois par session', async () => {
    trackSessionStart();
    trackSessionStart();
    await flush();
    const posts = requests.filter((r) => r.path === '/rest/v1/view_events');
    expect(posts).toHaveLength(1);
    expect(posts[0]?.body).toMatchObject({ event_type: 'session_start' });
  });

  it('trackHeartbeat appelle bien la fonction track_heartbeat', async () => {
    trackHeartbeat();
    await flush();
    expect(requests.some((r) => r.method === 'POST' && r.path === '/rest/v1/rpc/track_heartbeat')).toBe(true);
  });
});
