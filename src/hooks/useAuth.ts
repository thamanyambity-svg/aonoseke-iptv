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
    const { data, error } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, role')
      .eq('id', userId)
      .single();

    // PGRST116 = aucune ligne trouvée (profil manquant) → tentative de recréation plus bas.
    if (error && error.code !== 'PGRST116') {
      logger.warn('loadProfile: lecture du profil échouée', { code: error.code, message: error.message });
    }

    if (data) {
      return {
        id: userId,
        email,
        username: data.username ?? undefined,
        name: data.full_name ?? data.username ?? email.split('@')[0],
        avatar: data.avatar_url ?? undefined,
        role: (data.role as 'user' | 'admin') ?? 'user',
        provider: 'email',
      };
    }

    // Profil manquant : tentative de recréation côté Supabase (self-heal).
    const { error: ensureError } = await supabase.rpc('ensure_my_profile');
    if (ensureError) {
      logger.warn('loadProfile: ensure_my_profile a échoué', { message: ensureError.message });
      return fallback;
    }

    const { data: recreated, error: recreatedError } = await supabase
      .from('profiles')
      .select('username, full_name, avatar_url, role')
      .eq('id', userId)
      .single();

    if (recreatedError) {
      logger.warn('loadProfile: relecture après recréation échouée', { code: recreatedError.code, message: recreatedError.message });
    }

    if (recreated) {
      return {
        id: userId,
        email,
        username: recreated.username ?? undefined,
        name: recreated.full_name ?? recreated.username ?? email.split('@')[0],
        avatar: recreated.avatar_url ?? undefined,
        role: (recreated.role as 'user' | 'admin') ?? 'user',
        provider: 'email',
      };
    }

    return fallback;
  } catch (e) {
    logger.warn('loadProfile: exception', { message: e instanceof Error ? e.message : String(e) });
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
interface GeoResult { ip?: string; city?: string; region?: string; country?: string; code?: string; lat?: number; lon?: number }

async function captureGeo(): Promise<void> {
  if (!supabase) return;
  if (sessionStorage.getItem('geo-done')) return;
  const providers: Array<() => Promise<GeoResult>> = [
    async () => {
      const g = await (await fetch('https://ipapi.co/json/')).json();
      if (g.error) throw new Error('ipapi');
      return { ip: g.ip, city: g.city, region: g.region, country: g.country_name, code: g.country_code, lat: g.latitude, lon: g.longitude };
    },
    async () => {
      const g = await (await fetch('https://ipwho.is/')).json();
      if (g.success === false) throw new Error('ipwho');
      return { ip: g.ip, city: g.city, region: g.region, country: g.country, code: g.country_code, lat: g.latitude, lon: g.longitude };
    },
  ];
  for (const provider of providers) {
    try {
      const g = await provider();
      if (!g.ip) continue;
      const { error } = await supabase.rpc('set_my_geo', {
        p_country: g.country ?? null, p_country_code: g.code ?? null,
        p_city: g.city ?? null, p_region: g.region ?? null, p_ip: g.ip ?? null,
        p_lat: typeof g.lat === 'number' ? g.lat : null,
        p_lon: typeof g.lon === 'number' ? g.lon : null,
      });
      if (error) continue;
      await supabase.rpc('set_my_device', { p_device: detectDevice() });
      sessionStorage.setItem('geo-done', '1'); // flag posé seulement après succès → réessai sinon
      return;
    } catch { /* fournisseur suivant */ }
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
    let hbId: number | undefined;

    // Heartbeat fiable : présence + temps (track_heartbeat met à jour
    // user_activity ET last_seen_at) immédiatement, toutes les 60s, et au
    // retour sur l'onglet. Placé ici (cœur d'auth) = garanti de tourner.
    const beat = (): void => {
      if (supabase && document.visibilityState === 'visible') {
        void supabase.rpc('track_heartbeat', { p_seconds: 60 });
      }
    };
    const startPresence = (): void => {
      beat();
      if (hbId === undefined) hbId = window.setInterval(beat, 60_000);
    };
    const stopPresence = (): void => {
      if (hbId !== undefined) { window.clearInterval(hbId); hbId = undefined; }
    };
    document.addEventListener('visibilitychange', beat);

    void supabase.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      const s = data.session;
      if (s?.user) {
        const u = await loadProfile(s.user.id, s.user.email ?? '');
        if (active) setState({ user: u, loading: false });
        void captureGeo();
        startPresence();
      } else {
        setState({ user: null, loading: false });
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session?.user) {
        void loadProfile(session.user.id, session.user.email ?? '').then((u) => {
          if (active) setState({ user: u, loading: false });
          void captureGeo();
          startPresence();
        });
      } else {
        stopPresence();
        setState({ user: null, loading: false });
      }
    });

    return () => {
      active = false;
      stopPresence();
      document.removeEventListener('visibilitychange', beat);
      sub.subscription.unsubscribe();
    };
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
