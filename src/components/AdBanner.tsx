/**
 * Composant: AdBanner
 * Bandeau publicitaire « bas d'écran » façon chaîne d'info (France 24, Euronews) :
 * l'étiquette PUB glisse, la barre se déroule de gauche à droite, le texte apparaît ;
 * après `visibleMs` le bandeau se replie (texte, barre, étiquette) puis `onDone` est appelé.
 *
 * Système unifié (campaigns/advertisers) : consomme la campagne de `useAdMatrix` et
 * loggue via `trackAdEvent` → /api/track-ad → ad_events (signature anti-fraude).
 */

import { useEffect, useRef, useState } from 'react';
import { detectDevice } from '../lib/adTracking.ts';
import { trackAdEvent } from '../hooks/useAds.ts';
import { trackEvent } from '../hooks/useAnalytics.ts';
import { logger } from '../utils/logger.ts';
import { AlphaLogo } from './AlphaLogo.tsx';
import { adPhoto } from '../lib/adPhotos.ts';
import { BAR_ENTER, BAR_EXIT, pick } from '../lib/adAnimations.ts';
import type { AdCampaign } from '../hooks/useAdMatrix';
import './AdBanner.css';

type Phase = 'in' | 'show' | 'out';

/** Durée de l'animation d'entrée / de sortie (ms) — doit rester alignée sur AdBanner.css. */
const IN_MS = 1100;
const OUT_MS = 800;

interface AdBannerProps {
  campaign: AdCampaign;
  /** Durée d'affichage une fois le bandeau déroulé (ms). */
  visibleMs?: number;
  /** Appelé quand l'animation de sortie est terminée (fin normale ou fermeture). */
  onDone?: (reason: 'timeout' | 'closed') => void;
}

export function AdBanner({ campaign, visibleMs = 12_000, onDone }: AdBannerProps) {
  const [phase, setPhase] = useState<Phase>('in');
  const [anim] = useState(() => ({ enter: pick(BAR_ENTER), exit: pick(BAR_EXIT) }));
  const closedRef = useRef(false);
  const trackedRef = useRef(false);

  const advertiser = campaign?.advertiser_name || campaign?.name || 'Annonceur';
  const title = campaign?.content?.title ?? advertiser;
  const subtitle = campaign?.content?.subtitle;
  const cta = campaign?.content?.cta;
  const url = campaign?.content?.url;
  const photo = adPhoto(campaign?.content?.image);
  const showEmblem = !photo && /alpha/i.test(advertiser);

  // Entrée → affichage → sortie → fin
  useEffect(() => {
    const toShow = window.setTimeout(() => setPhase('show'), IN_MS);
    const toOut = window.setTimeout(() => setPhase('out'), IN_MS + visibleMs);
    const toDone = window.setTimeout(() => {
      if (!closedRef.current) onDone?.('timeout');
    }, IN_MS + visibleMs + OUT_MS);
    return () => { window.clearTimeout(toShow); window.clearTimeout(toOut); window.clearTimeout(toDone); };
  }, [visibleMs, onDone]);

  // Impression : une fois par apparition, quand la barre est déroulée
  useEffect(() => {
    if (trackedRef.current || !campaign?.id) return undefined;
    const timer = window.setTimeout(() => {
      trackedRef.current = true;
      trackEvent('ad_impression', campaign.id);
      void trackAdEvent(campaign.id, 'impression', { device: detectDevice() });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [campaign?.id]);

  const handleClick = async (): Promise<void> => {
    if (!campaign?.id) return;
    trackEvent('ad_click', campaign.id);
    await trackAdEvent(campaign.id, 'click', { device: detectDevice() });
    logger.info('Ad clicked', { campaignId: campaign.id });
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleClose = (): void => {
    logger.info('Ad banner closed', { campaignId: campaign?.id });
    closedRef.current = true;
    setPhase('out');
    window.setTimeout(() => onDone?.('closed'), OUT_MS);
  };

  if (!campaign) return null;

  return (
    <div
      className={`ad-lt ad-lt--${phase} ad-lt-e-${anim.enter} ad-lt-x-${anim.exit}`}
      role="region"
      aria-label={`Publicité : ${advertiser}`}
    >
      <span className="ad-lt-tag">Pub</span>
      <div className="ad-lt-bar">
        {photo && <img src={photo} alt="" className="ad-lt-thumb" />}
        <button
          type="button"
          className="ad-lt-main"
          onClick={() => void handleClick()}
          disabled={!url}
        >
          {showEmblem && <AlphaLogo size={34} />}
          <span className="ad-lt-text">
            <span className="ad-lt-advertiser">{advertiser}</span>
            <strong className="ad-lt-title">{title}</strong>
            {subtitle && <span className="ad-lt-sub">{subtitle}</span>}
          </span>
          {cta && url && <span className="ad-lt-cta">{cta}</span>}
        </button>
        <button
          type="button"
          className="ad-lt-close"
          onClick={handleClose}
          title="Fermer cette publicité"
          aria-label="Fermer"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
