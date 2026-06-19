/**
 * Composant: AdBanner
 * Affiche une bannière publicitaire du système Smart-Stream Ad Matrix
 * Supporte: images, vidéos, bannières
 * Non-intrusive : peut être injecté dans n'importe quelle layout
 */

import { useEffect, useRef, useState } from 'react';
import { trackAdImpression, trackAdClick, detectDevice } from '../lib/adTracking.ts';
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

  // Track impression quand le composant monte et est visible
  useEffect(() => {
    if (!hasTrackedImpression && campaign?.id) {
      const trackImpression = async () => {
        const tracked = await trackAdImpression(campaign.id, {
          device: detectDevice(),
        });
        if (tracked) {
          setHasTrackedImpression(true);
        }
      };

      // Attendre que le DOM soit ready
      const timer = setTimeout(() => void trackImpression(), 300);
      return () => clearTimeout(timer);
    }
  }, [campaign?.id, hasTrackedImpression]);

  const handleClick = async () => {
    if (campaign?.id) {
      const tracked = await trackAdClick(campaign.id, {
        device: detectDevice(),
      });
      if (tracked) {
        logger.info('Ad clicked', { campaignId: campaign.id });
      }
    }
  };

  const handleClose = () => {
    logger.info('Ad banner closed', { campaignId: campaign.id });
    onClose?.();
  };

  const handleNext = () => {
    onNextAd?.();
  };

  if (!campaign) {
    return null;
  }

  const isVideo = campaign.ad_type === 'video';
  const isImage = campaign.ad_type === 'image' || campaign.ad_type === 'banner';

  return (
    <div
      ref={containerRef}
      className={`ad-banner ad-banner--${position}`}
      role="region"
      aria-label={`Publicité : ${campaign.client_name}`}
    >
      {/* Conteneur média */}
      <div className="ad-banner-media">
        {isVideo && (
          <video
            src={campaign.media_url}
            className="ad-banner-video"
            controls={false}
            autoPlay
            muted
            loop
            onClick={handleClick}
          />
        )}
        {isImage && (
          <img
            src={campaign.media_url}
            alt={`Publicité ${campaign.client_name}`}
            className="ad-banner-image"
            onClick={handleClick}
            style={{ cursor: 'pointer' }}
          />
        )}
      </div>

      {/* Footer avec contrôles */}
      <div className="ad-banner-footer">
        <span className="ad-banner-branding">
          Pub · {campaign.client_name}
        </span>
        <div className="ad-banner-controls">
          {/* Bouton "Suivant" pour rotation */}
          <button
            className="ad-banner-btn ad-banner-btn-next"
            onClick={handleNext}
            title="Voir la publicité suivante"
            aria-label="Pub suivante"
          >
            ▶
          </button>
          {/* Bouton "Fermer" */}
          <button
            className="ad-banner-btn ad-banner-btn-close"
            onClick={handleClose}
            title="Fermer cette publicité"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Badges de statut (optionnel) */}
      <div className="ad-banner-badges">
        {campaign.remaining_impressions > 0 && (
          <span className="ad-badge ad-badge-impressions" title="Impressions restantes">
            {campaign.remaining_impressions.toLocaleString('fr-FR')}
          </span>
        )}
        {campaign.remaining_clicks > 0 && (
          <span className="ad-badge ad-badge-clicks" title="Clics restants">
            💬 {campaign.remaining_clicks.toLocaleString('fr-FR')}
          </span>
        )}
      </div>
    </div>
  );
}
