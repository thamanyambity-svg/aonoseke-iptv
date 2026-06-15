/**
 * Authentification réelle via Supabase Auth.
 *
 * - Inscription : username + email + mot de passe
 * - Connexion : email + mot de passe
 * - Session persistante (gérée par le SDK)
 * - Profil (username, rôle) chargé depuis la table profiles
 * - Met à jour last_seen_at à chaque session (pour les stats d'audience)
 *
 * Si Supabase n'est pas configuré, retombe sur un mode démo localStorage.
 */
import { useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseEnabled } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';

export interface AuthUser {
  id?: string;
  name: string;
  email: string;
  username?: string;
  avatar?: string;
  role?: 'user' | 'admin';
  provider: 'demo' | 'google' | 'facebook' | 'apple' | 'email';
}

const DEMO_KEY = 'iptv-auth-user';

interface AuthState {
  user: AuthUser | null;
  loading: boolean;
}

async function loadProfile(userId: string, email: string): Promise<AuthUser> {
  const fallback: AuthUser = { id: userId, name: email.split('@')[0], email, provider: 'email' };
  if (!supabase) return fallback;
  try {
    const { data } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, role')
      .eq('id', userId)
      .single();
    if (!data) return fallback;
    return {
      id: userId,
      email,
      username: data.username ?? undefined,
      name: data.full_name ?? data.username ?? email.split('@')[0],
      avatar: data.avatar_url ?? undefined,
      role: (data.role as 'user' | 'admin') ?? 'user',
      provider: 'email',
    };
  } catch {
    return fallback;
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/VIDAA|SmartTV|Tizen|WebOS|Android.*TV|NetCast|HbbTV/i.test(ua)) return 'tv';
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

/**
 * Capture la géolocalisation (pays/ville/IP) + l'appareil de l'utilisateur
 * connecté, une fois par session, via un service géo-IP, et l'enregistre sur
 * son profil (fonctions sécurisées : n'écrivent que sa propre ligne).
 * Best-effort : ne fait jamais échouer la connexion.
 */
async function captureGeo(): Promise<void> {
  if (!supabase) return;
  try {
    if (sessionStorage.getItem('geo-captured')) return;
    sessionStorage.setItem('geo-captured', '1');
    const res = await fetch('https://ipapi.co/json/');
    if (!res.ok) return;
    const g = (await res.json()) as {
      ip?: string; city?: string; region?: string;
      country_name?: string; country_code?: string;
      latitude?: number; longitude?: number; error?: boolean;
    };
    if (!g || g.error) return;
    await supabase.rpc('set_my_geo', {
      p_country: g.country_name ?? null,
      p_country_code: g.country_code ?? null,
      p_city: g.city ?? null,
      p_region: g.region ?? null,
      p_ip: g.ip ?? null,
      p_lat: typeof g.latitude === 'number' ? g.latitude : null,
      p_lon: typeof g.longitude === 'number' ? g.longitude : null,
    });
    await supabase.rpc('set_my_device', { p_device: detectDevice() });
  } catch {
    /* géo best-effort */
  }
}

export function useAuth(): {
  user: AuthUser | null;
  loading: boolean;
  signUp: (username: string, email: string, password: string, ageRange?: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signInWithProvider: (provider: 'google' | 'facebook' | 'apple') => Promise<{ error?: string }>;
  sendPhoneOtp: (phone: string) => Promise<{ error?: string }>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<{ error?: string }>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({ user: null, loading: true });

  useEffect(() => {
    if (!isSupabaseEnabled || !supabase) {
      // mode démo
      try {
        const raw = localStorage.getItem(DEMO_KEY);
        setState({ user: raw ? (JSON.parse(raw) as AuthUser) : null, loading: false });
      } catch {
        setState({ user: null, loading: false });
      }
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const s = data.session;
      if (s?.user) {
        const u = await loadProfile(s.user.id, s.user.email ?? '');
        if (active) setState({ user: u, loading: false });
        void supabase!.rpc('touch_last_seen');
        void captureGeo();
      } else {
        setState({ user: null, loading: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        void loadProfile(session.user.id, session.user.email ?? '').then((u) => {
          if (active) setState({ user: u, loading: false });
          void supabase!.rpc('touch_last_seen');
          void captureGeo();
        });
      } else {
        setState({ user: null, loading: false });
      }
    });

    return () => { active = false; sub.subscription.unsubscribe(); };
  }, []);

  const signUp = useCallback(
    async (username: string, email: string, password: string, ageRange?: string): Promise<{ error?: string }> => {
      if (!supabase) return { error: 'Service indisponible' };
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { username, age_range: ageRange ?? null } },
      });
      if (error) {
        logger.warn('signUp failed', { error: error.message });
        return { error: error.message };
      }
      return {};
    },
    [],
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error?: string }> => {
      if (!supabase) return { error: 'Service indisponible' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return {};
    },
    [],
  );

  const signInWithProvider = useCallback(
    async (provider: 'google' | 'facebook' | 'apple'): Promise<{ error?: string }> => {
      if (!supabase) return { error: 'Service indisponible' };
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin },
      });
      if (error) return { error: error.message };
      return {};
    },
    [],
  );

  const sendPhoneOtp = useCallback(
    async (phone: string): Promise<{ error?: string }> => {
      if (!supabase) return { error: 'Service indisponible' };
      const { error } = await supabase.auth.signInWithOtp({ phone });
      if (error) return { error: error.message };
      return {};
    },
    [],
  );

  const verifyPhoneOtp = useCallback(
    async (phone: string, token: string): Promise<{ error?: string }> => {
      if (!supabase) return { error: 'Service indisponible' };
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
      if (error) return { error: error.message };
      return {};
    },
    [],
  );

  const signInDemo = useCallback((): void => {
    const demo: AuthUser = { name: 'Visiteur Démo', email: 'demo@aonoseke.com', provider: 'demo' };
    try { localStorage.setItem(DEMO_KEY, JSON.stringify(demo)); } catch { /* ignore */ }
    setState({ user: demo, loading: false });
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    if (supabase) await supabase.auth.signOut();
    try { localStorage.removeItem(DEMO_KEY); } catch { /* ignore */ }
    setState({ user: null, loading: false });
  }, []);

  return { user: state.user, loading: state.loading, signUp, signIn, signInWithProvider, sendPhoneOtp, verifyPhoneOtp, signInDemo, signOut };
}
