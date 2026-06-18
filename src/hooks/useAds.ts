import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import { getUtmParams, type UtmParams } from '../utils/utmTracking.ts';

// Ré-export des types publics pour compatibilité avec App.tsx
export interface PrerollAd {
  id: string;
  title: string;
  subtitle?: string;
  cta?: string;
  url?: string;
  bg?: string;
  image?: string;
  video?: string;
  logo?: string;
  eyebrow?: string;
  destinations?: string;
  legal?: string;
  variant?: 'souverain' | 'corridor';
  emblem?: boolean;
}

export interface BannerAd {
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
  image?: string;
  logo?: string;
  legal?: string;
  emblem?: boolean;
}

export interface AdsConfig {
  enabled: boolean;
  preroll: {
    enabled: boolean;
    skipAfter: number;
    maxDuration: number;
    frequency: number;
    items: PrerollAd[];
  };
  banners: BannerAd[];
}

const FALLBACK: AdsConfig = {
  enabled: false,
  preroll: { enabled: false, skipAfter: 5, maxDuration: 12, frequency: 3, items: [] },
  banners: [],
};

// ── Persistance locale du frequency capping par utilisateur/session ──────────
//
// Structure localStorage :
//   iptv-ad-cap: { [campaignId]: { [date]: count } }
//
// Permet de respecter le frequency_cap_per_user sans serveur. Limitation :
// contournable en vidant le localStorage. La validation serveur (endpoint
// /api/track-ad.js) reste la source de vérité pour la facturation.

const CAP_KEY = 'iptv-ad-cap';
const SESSION_KEY = 'iptv-session-id';

function getSessionId(): string {
  try {
    let sid = sessionStorage.getItem(SESSION_KEY);
    if (!sid) {
      sid = `s-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, sid);
    }
    return sid;
  } catch {
    return `s-${Date.now()}`;
  }
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function getCapMap(): Record<string, Record<string, number>> {
  try {
    const raw = localStorage.getItem(CAP_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Record<string, number>>) : {};
  } catch {
    return {};
  }
}

function getCapsForToday(campaignId: string): number {
  const map = getCapMap();
  return map[campaignId]?.[todayKey()] ?? 0;
}

function bumpCap(campaignId: string): void {
  try {
    const map = getCapMap();
    if (!map[campaignId]) map[campaignId] = {};
    const today = todayKey();
    map[campaignId][today] = (map[campaignId][today] ?? 0) + 1;
    // Nettoyage des entrées > 7 jours (garde la taille du localStorage sous contrôle)
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    for (const cid of Object.keys(map)) {
      for (const date of Object.keys(map[cid])) {
        if (date < cutoffStr) delete map[cid][date];
      }
      if (Object.keys(map[cid]).length === 0) delete map[cid];
    }
    localStorage.setItem(CAP_KEY, JSON.stringify(map));
  } catch {
    /* quota / private mode */
  }
}

// ── Types pour la rotation multi-annonceurs ─────────────────────────────────

interface ActiveCampaign {
  id: string;
  advertiser_id: string;
  advertiser_name: string;
  name: string;
  type: 'preroll' | 'banner' | 'both';
  content: PrerollAd & BannerAd;
  weight: number;
  frequency_cap_per_user: number;
}

// ── Hook principal ─────────────────────────────────────────────────────────

export function useAds(): AdsConfig {
  const [config, setConfig] = useState<AdsConfig>(FALLBACK);
  const lastRotationRef = useRef<number>(0);

  useEffect(() => {
    const controller = new AbortController();

    async function loadAds(): Promise<void> {
      // 1. Essaie de charger les campagnes actives depuis Supabase (multi-annonceurs)
      try {
        if (supabase) {
          const { data, error } = await supabase.rpc('get_active_campaigns', {
            p_user_country: null,
            p_category: null,
            p_limit: 20,
          });
          if (!error && Array.isArray(data) && data.length > 0) {
            const campaigns = data as ActiveCampaign[];
            // Sépare en pré-roll et bannières selon le type
            const prerollItems: PrerollAd[] = campaigns
              .filter((c) => c.type === 'preroll' || c.type === 'both')
              .filter((c) => getCapsForToday(c.id) < c.frequency_cap_per_user)
              .map((c) => ({ ...c.content, id: c.id }));
            const bannerItems: BannerAd[] = campaigns
              .filter((c) => c.type === 'banner' || c.type === 'both')
              .filter((c) => getCapsForToday(c.id) < c.frequency_cap_per_user)
              .map((c) => ({ ...c.content, id: c.id }));

            setConfig({
              enabled: prerollItems.length > 0 || bannerItems.length > 0,
              preroll: {
                enabled: prerollItems.length > 0,
                skipAfter: 5,
                maxDuration: 12,
                frequency: 3,
                items: prerollItems,
              },
              banners: bannerItems,
            });
            lastRotationRef.current = Date.now();
            return;
          }
        }
      } catch (err) {
        console.warn('[useAds] Supabase load failed, falling back to static ads.json', err);
      }

      // 2. Fallback : ads.json statique (mono-annonceur A.Onoseke House)
      try {
        const r = await fetch('/ads.json', { signal: controller.signal });
        if (r.ok) {
          const data = (await r.json()) as AdsConfig;
          setConfig(data);
          return;
        }
      } catch {
        /* ignore */
      }

      // 3. Dernier recours : désactivé
      setConfig(FALLBACK);
    }

    void loadAds();

    // Re-rotation toutes les 5 minutes (récupère les nouvelles campagnes)
    const rotationId = window.setInterval(() => {
      if (Date.now() - lastRotationRef.current > 5 * 60 * 1000) {
        void loadAds();
      }
    }, 60_000);

    return () => {
      controller.abort();
      window.clearInterval(rotationId);
    };
  }, []);

  return config;
}

// ── API publique pour tracker une impression/clic (avec anti-fraude) ───────

export type AdEventType = 'impression' | 'click';

/**
 * Tracker un événement publicitaire.
 *
 * Inscrit l'événement via l'endpoint serveur /api/track-ad.js qui valide
 * la signature HMAC, déduplique par session, et insère dans ad_events.
 *
 * Inclut également les UTM params capturés à l'atterrissage (Phase 1
 * tracking écosystème), permettant d'attribuer les clics à la campagne
 * ayant amené l'utilisateur au player.
 *
 * @param campaignId ID de la campagne
 * @param eventType 'impression' ou 'click'
 * @param meta métadonnées optionnelles (pays, appareil, etc.)
 */
export async function trackAdEvent(
  campaignId: string,
  eventType: AdEventType,
  meta?: { country?: string; country_code?: string; city?: string; device?: string },
): Promise<void> {
  // Comptage local pour frequency capping
  if (eventType === 'impression') {
    bumpCap(campaignId);
  }

  // Récupère l'user_id si connecté
  let userId: string | null = null;
  let userEmail: string | null = null;
  try {
    if (supabase) {
      const { data } = await supabase.auth.getUser();
      userId = data.user?.id ?? null;
      userEmail = data.user?.email ?? null;
    }
  } catch { /* ignore */ }

  // Récupère les UTM params capturés à l'atterrissage
  const utm: UtmParams | null = getUtmParams();

  // Génère une signature HMAC côté client (clé publique)
  // NOTE : c'est une première barrière anti-fraude. La vraie validation
  // se fait côté serveur avec une clé secrète partagée.
  const sessionId = getSessionId();
  const timestamp = Date.now();
  const signaturePayload = `${campaignId}|${sessionId}|${timestamp}`;
  // Signature simple (clé publique côté client, clé secrète côté serveur)
  const signature = await hmacSha256(signaturePayload, 'aonoseke-public-key-v2');

  // Appel endpoint serveur
  try {
    await fetch('/api/track-ad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_id: campaignId,
        event_type: eventType,
        session_id: sessionId,
        user_id: userId,
        user_email: userEmail,
        country: meta?.country ?? null,
        country_code: meta?.country_code ?? null,
        city: meta?.city ?? null,
        device: meta?.device ?? null,
        timestamp,
        signature,
        // UTM params (Phase 1 tracking écosystème)
        utm_source: utm?.utm_source ?? null,
        utm_medium: utm?.utm_medium ?? null,
        utm_campaign: utm?.utm_campaign ?? null,
        utm_content: utm?.utm_content ?? null,
        utm_term: utm?.utm_term ?? null,
        landing_url: utm?.landing_url ?? null,
      }),
    });
  } catch (err) {
    console.warn('[trackAdEvent] failed', err);
  }
}

async function hmacSha256(message: string, secret: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign'],
    );
    const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
    return Array.from(new Uint8Array(signature))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    // Fallback simple si WebCrypto indisponible
    return `fallback-${message.length}-${Date.now()}`;
  }
}
