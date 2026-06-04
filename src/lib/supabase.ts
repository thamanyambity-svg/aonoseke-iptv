/**
 * Intégration Supabase via API REST (GoTrue Auth + PostgREST).
 *
 * Volontairement SANS le SDK @supabase/supabase-js pour garder un bundle
 * léger et éviter les soucis de binding natif. Si les variables d'env ne
 * sont pas définies, toutes les fonctions renvoient un état "non configuré"
 * et l'app retombe sur le mode démo localStorage.
 *
 * Variables requises (.env.local) :
 *   VITE_SUPABASE_URL=https://xxxx.supabase.co
 *   VITE_SUPABASE_ANON_KEY=eyJ...
 */
import { logger } from '../utils/logger.ts';
import type { AuthUser } from '../hooks/useAuth.ts';

const URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export function supabaseConfigured(): boolean {
  return Boolean(URL && KEY);
}

/** URL de redirection OAuth hébergée (Google / Facebook / Apple). */
export function getOAuthUrl(provider: 'google' | 'facebook' | 'apple'): string {
  const redirectTo = encodeURIComponent(window.location.origin);
  return `${URL}/auth/v1/authorize?provider=${provider}&redirect_to=${redirectTo}`;
}

interface GoTrueUser {
  email?: string;
  user_metadata?: { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  app_metadata?: { provider?: string };
}

function toAuthUser(u: GoTrueUser, fallbackProvider: AuthUser['provider']): AuthUser {
  const meta = u.user_metadata ?? {};
  const provider = (u.app_metadata?.provider as AuthUser['provider']) ?? fallbackProvider;
  return {
    name: meta.full_name ?? meta.name ?? (u.email?.split('@')[0] ?? 'Utilisateur'),
    email: u.email ?? '',
    avatar: meta.avatar_url ?? meta.picture,
    provider,
  };
}

/** Connexion email + mot de passe via GoTrue. */
export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  if (!supabaseConfigured()) throw new Error('Supabase non configuré');
  const res = await fetch(`${URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: KEY as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error_description?: string; msg?: string };
    throw new Error(body.error_description ?? body.msg ?? 'Identifiants invalides');
  }
  const data = (await res.json()) as { access_token: string; user: GoTrueUser };
  localStorage.setItem('iptv-sb-token', data.access_token);
  return toAuthUser(data.user, 'email');
}

/** Inscription email + mot de passe. */
export async function signUpWithEmail(email: string, password: string): Promise<AuthUser> {
  if (!supabaseConfigured()) throw new Error('Supabase non configuré');
  const res = await fetch(`${URL}/auth/v1/signup`, {
    method: 'POST',
    headers: { apikey: KEY as string, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error_description?: string; msg?: string };
    throw new Error(body.error_description ?? body.msg ?? "Échec de l'inscription");
  }
  const data = (await res.json()) as { access_token?: string; user: GoTrueUser };
  if (data.access_token) localStorage.setItem('iptv-sb-token', data.access_token);
  return toAuthUser(data.user, 'email');
}

/**
 * Après un retour OAuth, le token arrive dans le hash de l'URL
 * (#access_token=...). On le récupère, on nettoie l'URL, et on
 * résout l'utilisateur via /auth/v1/user.
 */
export async function parseOAuthRedirect(): Promise<AuthUser | null> {
  if (!supabaseConfigured()) return null;
  const hash = window.location.hash;
  if (!hash.includes('access_token=')) return null;

  const params = new URLSearchParams(hash.slice(1));
  const token = params.get('access_token');
  if (!token) return null;

  // Nettoie l'URL (retire le hash)
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  localStorage.setItem('iptv-sb-token', token);

  try {
    const res = await fetch(`${URL}/auth/v1/user`, {
      headers: { apikey: KEY as string, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const user = (await res.json()) as GoTrueUser;
    return toAuthUser(user, 'email');
  } catch (err) {
    logger.warn('parseOAuthRedirect failed', { error: String(err) });
    return null;
  }
}

export function signOutRemote(): void {
  const token = localStorage.getItem('iptv-sb-token');
  localStorage.removeItem('iptv-sb-token');
  if (!supabaseConfigured() || !token) return;
  void fetch(`${URL}/auth/v1/logout`, {
    method: 'POST',
    headers: { apikey: KEY as string, Authorization: `Bearer ${token}` },
  }).catch(() => { /* ignore */ });
}
