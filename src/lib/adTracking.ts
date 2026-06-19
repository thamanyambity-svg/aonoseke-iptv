/**
 * Utility: adTracking
 * Événements de tracking pour le système Smart-Stream Ad Matrix
 * Enregistre impressions, clics et durée de visionnage
 */

import { supabase } from '../lib/supabaseClient';
import { logger } from '../utils/logger.ts';

interface TrackingData {
  device?: string;
  duration_secs?: number;
}

/**
 * Enregistrer une impression (vue d'annonce)
 */
export async function trackAdImpression(
  campaignId: number,
  trackingData?: TrackingData
): Promise<boolean> {
  if (!supabase) {
    logger.warn('adTracking: supabase not available');
    return false;
  }

  try {
    const { error } = await supabase.rpc('log_ad_matrix_event', {
      p_campaign_id: campaignId,
      p_event_type: 'impression',
      p_device_info: trackingData ? { device: trackingData.device } : undefined,
    });

    if (error) {
      logger.warn('adTracking: impression error', { error: error.message, campaignId });
      return false;
    }

    logger.info('adTracking: impression tracked', { campaignId });
    return true;
  } catch (err) {
    logger.error('adTracking: unexpected error on impression', err as Error);
    return false;
  }
}

/**
 * Enregistrer un clic
 */
export async function trackAdClick(
  campaignId: number,
  trackingData?: TrackingData
): Promise<boolean> {
  if (!supabase) {
    logger.warn('adTracking: supabase not available');
    return false;
  }

  try {
    const { error } = await supabase.rpc('log_ad_matrix_event', {
      p_campaign_id: campaignId,
      p_event_type: 'click',
      p_device_info: trackingData ? { device: trackingData.device } : undefined,
    });

    if (error) {
      logger.warn('adTracking: click error', { error: error.message, campaignId });
      return false;
    }

    logger.info('adTracking: click tracked', { campaignId });
    return true;
  } catch (err) {
    logger.error('adTracking: unexpected error on click', err as Error);
    return false;
  }
}

/**
 * Enregistrer une durée de visionnage
 */
export async function trackAdDuration(
  campaignId: number,
  durationSecs: number,
  trackingData?: TrackingData
): Promise<boolean> {
  if (!supabase || durationSecs <= 0) {
    return false;
  }

  try {
    const { error } = await supabase.rpc('log_ad_matrix_event', {
      p_campaign_id: campaignId,
      p_event_type: 'duration',
      p_duration_secs: Math.round(durationSecs),
      p_device_info: trackingData ? { device: trackingData.device } : undefined,
    });

    if (error) {
      logger.warn('adTracking: duration error', { error: error.message, campaignId });
      return false;
    }

    logger.info('adTracking: duration tracked', { campaignId, durationSecs });
    return true;
  } catch (err) {
    logger.error('adTracking: unexpected error on duration', err as Error);
    return false;
  }
}

/**
 * Détecter le type d'appareil
 */
export function detectDevice(): string {
  const ua = navigator.userAgent.toLowerCase();
  if (/ipad|android/.test(ua)) return 'tablet';
  if (/iphone|android.*mobile/.test(ua)) return 'mobile';
  if (/tv|smarttv|googletv|appletv|hbbtv/.test(ua)) return 'tv';
  return 'desktop';
}
