/**
 * Présence par appareil — envoie un "ping" de présence au backend pour CHAQUE
 * appareil (connecté OU démo/anonyme), au démarrage puis périodiquement.
 *
 * L'IP est capturée CÔTÉ SERVEUR par la RPC `track_presence` (en-têtes de la
 * requête), donc fiable et valable même en démo (aucune session requise).
 * Source du panneau « Appareils en direct » du dashboard admin.
 *
 * @module devicePresence
 */
import { supabase } from './supabaseClient.ts';

const DEVICE_KEY = 'aonoseke-device-id';
let timer: number | undefined;

function uuid(): string {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* indispo */ }
  return 'dev-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/** Identifiant d'appareil stable (persisté en localStorage). */
export function getDeviceId(): string {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) { id = uuid(); localStorage.setItem(DEVICE_KEY, id); }
    return id;
  } catch {
    return uuid();
  }
}

function detectDevice(): string {
  const ua = navigator.userAgent;
  if (/VIDAA|HbbTV|Tizen|WebOS|SMART-TV|Android.*TV|NetCast|Viera|PHILIPS/i.test(ua)) return 'tv';
  if (/Mobi|Android|iPhone|iPad|iPod/i.test(ua)) return 'mobile';
  return 'desktop';
}

function isDemo(): boolean {
  try {
    const raw = localStorage.getItem('iptv-auth-user');
    if (!raw) return false;
    const u = JSON.parse(raw) as { provider?: string };
    return u?.provider === 'demo';
  } catch {
    return false;
  }
}

async function ping(): Promise<void> {
  if (!supabase) return;
  if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
  try {
    await supabase.rpc('track_presence', {
      p_device_id: getDeviceId(),
      p_device: detectDevice(),
      p_is_demo: isDemo(),
    });
  } catch {
    /* présence best-effort, jamais bloquant */
  }
}

/** Démarre les pings de présence (idempotent). À appeler une fois au boot. */
export function startPresence(intervalMs = 45_000): void {
  void ping();
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void ping();
  });
  if (timer === undefined) {
    timer = window.setInterval(() => void ping(), intervalMs);
  }
}
