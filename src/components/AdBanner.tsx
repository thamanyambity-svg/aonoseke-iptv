/**
 * Composant: AdBanner
 * Bannière publicitaire — SYSTÈME UNIFIÉ (campaigns/advertisers).
 *
 * Consolidation : consomme la campagne riche de `useAdMatrix` (content JSON) et
 * loggue via `trackAdEvent` → /api/track-ad → ad_events (signature anti-fraude),
 * au lieu de l'ancien log_ad_matrix_event/ad_impressions.
 */

import { useEffect, useRef, useState } from 'react';
import { detectDevice } from '../lib/adTracking.ts';
import { trackAdEvent } from '../hooks/useAds.ts';
import { logger } from '../utils/logger.ts';
import type { AdCampaign } from '../hooks/useAdMatrix';
import './AdBanner.css';

interface AdBannerProps {
  campaign: AdCampaign;
  position?: 'top' | 'bottom' | 'inline';
  onClose?: () => void;
  onNextAd?: () => void;
}

export function AdBanner({
  campaign,
  position = 'bottom',
  onClose,
  onNextAd,
}: AdBannerProps) {
  const [hasTrackedImpression, setHasTrackedImpression] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const advertiser = campaign?.advertiser_name || campaign?.name || 'Annonceur';
  const videoUrl = campaign?.content?.video;
  const imageUrl = campaign?.content?.image;
  const isVideo = !!videoUrl;
  const isImage = !isVideo && !!imageUrl;

  // Track impression à l'apparition
  useEffect(() => {
    if (!hasTrackedImpression && campaign?.id) {
      const timer = setTimeout(() => {
        void trackAdEvent(campaign.id, 'impression', { device: detectDevice() });
        setHasTrackedImpression(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [campaign?.id, hasTrackedImpression]);

  const handleClick = async (): Promise<void> => {
    if (!campaign?.id) return;
    await trackAdEvent(campaign.id, 'click', { device: detectDevice() });
    logger.info('Ad clicked', { campaignId: campaign.id });
    const url = campaign.content?.url;
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (!campaign) return null;

  return (
    <div
      ref={containerRef}
      className={`ad-banner ad-banner--${position}`}
      role="region"
      aria-label={`Publicité : ${advertiser}`}
    >
      <div className="ad-banner-media">
        {isVideo && (
          <video
            src={videoUrl}
            className="ad-banner-video"
            controls={false}
            autoPlay
            muted
            loop
            onClick={() => void handleClick()}
          />
        )}
        {isImage && (
          <img
            src={imageUrl}
            alt={`Publicité ${advertiser}`}
            className="ad-banner-image"
            onClick={() => void handleClick()}
            style={{ cursor: 'pointer' }}
          />
        )}
        {!isVideo && !isImage && (
          <button className="ad-banner-text" onClick={() => void handleClick()} type="button">
            <strong>{campaign.content?.title ?? advertiser}</strong>
            {campaign.content?.subtitle && <span>{campaign.content.subtitle}</span>}
            {campaign.content?.cta && <span className="ad-banner-cta">{campaign.content.cta}</span>}
          </button>
        )}
      </div>

      <div className="ad-banner-footer">
        <span className="ad-banner-branding">Pub · {advertiser}</span>
        <div className="ad-banner-controls">
          <button
            className="ad-banner-btn ad-banner-btn-next"
            onClick={() => onNextAd?.()}
            title="Voir la publicité suivante"
            aria-label="Pub suivante"
          >
            ▶
          </button>
          <button
            className="ad-banner-btn ad-banner-btn-close"
            onClick={() => { logger.info('Ad banner closed', { campaignId: campaign.id }); onClose?.(); }}
            title="Fermer cette publicité"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
