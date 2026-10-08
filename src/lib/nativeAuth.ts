/**
 * Connexion sociale (Google / Facebook) dans l'application Android.
 *
 * Google interdit l'OAuth dans une WebView : on ouvre le navigateur système
 * (Chrome Custom Tabs), puis le fournisseur renvoie vers le lien profond
 * `com.aonoseke.iptv://auth/callback?code=…` qui rouvre l'appli.
 * Ce lien doit figurer dans Supabase → Authentication → URL Configuration → Redirect URLs.
 */
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from './supabaseClient.ts';
import { logger } from '../utils/logger.ts';

export const NATIVE_REDIRECT = 'com.aonoseke.iptv://auth/callback';

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export interface AuthCallback {
  code?: string;
  accessToken?: string;
  refreshToken?: string;
  error?: string;
}

/** Extrait code / jetons / erreur d'un lien de retour OAuth (query ou fragment). */
export function parseAuthCallback(url: string): AuthCallback | null {
  if (!url.startsWith(NATIVE_REDIRECT)) return null;
  const rest = url.slice(NATIVE_REDIRECT.length);
  const [beforeHash = '', hash = ''] = rest.split('#');
  const query = beforeHash.startsWith('?') ? beforeHash.slice(1) : '';
  const params = new URLSearchParams(query);
  new URLSearchParams(hash).forEach((v, k) => { if (!params.has(k)) params.set(k, v); });

  const result: AuthCallback = {};
  const code = params.get('code');
  const access = params.get('access_token');
  const refresh = params.get('refresh_token');
  const err = params.get('error_description') ?? params.get('error');
  if (code) result.code = code;
  if (access) result.accessToken = access;
  if (refresh) result.refreshToken = refresh;
  if (err) result.error = err;
  return result;
}

/** Ouvre le fournisseur dans le navigateur système. */
export async function startNativeOAuth(provider: 'google' | 'facebook' | 'apple'): Promise<{ error?: string }> {
  if (!supabase) return { error: 'Service indisponible' };
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data.url) return { error: 'Lien de connexion introuvable' };
  await Browser.open({ url: data.url });
  return {};
}

let listening = false;

/** À appeler une fois au démarrage : finalise la session au retour du navigateur. */
export function initNativeAuthListener(): void {
  if (!isNativeApp() || listening) return;
  listening = true;
  void App.addListener('appUrlOpen', ({ url }) => {
    const cb = parseAuthCallback(url);
    if (!cb) return;
    void Browser.close().catch(() => undefined);
    if (!supabase) return;
    if (cb.error) { logger.warn('OAuth callback error', { error: cb.error }); return; }
    if (cb.code) {
      void supabase.auth.exchangeCodeForSession(cb.code).then(({ error }) => {
        if (error) logger.warn('exchangeCodeForSession failed', { error: error.message });
      });
    } else if (cb.accessToken && cb.refreshToken) {
      void supabase.auth.setSession({ access_token: cb.accessToken, refresh_token: cb.refreshToken });
    }
  });
}
