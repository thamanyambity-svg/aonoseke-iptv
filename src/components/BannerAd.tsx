import { useEffect, useRef } from 'react';
import { ExternalLink } from 'lucide-react';
import type { BannerAd as BannerAdData } from '../hooks/useAds.ts';
import { AlphaLogo } from './AlphaLogo.tsx';

interface BannerAdProps {
  ad: BannerAdData;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
}

export function BannerAd({ ad, onImpression, onClick }: BannerAdProps): JSX.Element {
  const reported = useRef(false);

  useEffect(() => {
    if (!reported.current) {
      reported.current = true;
      onImpression?.(ad.id);
    }
  }, [ad.id, onImpression]);

  function handleClick(): void {
    if (!ad.url) return;
    onClick?.(ad.id);
    window.open(ad.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div
      className="banner-ad"
      onClick={handleClick}
      role={ad.url ? 'button' : undefined}
      tabIndex={ad.url ? 0 : undefined}
      onKeyDown={(e) => {
        if (ad.url && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <span className="banner-ad-label">Sponsor</span>
      {ad.emblem ? (
        <AlphaLogo size={34} />
      ) : (
        ad.logo && <img src={ad.logo} alt="Alpha Import Exchange" className="banner-ad-logo" />
      )}
      {ad.image ? (
        <img src={ad.image} alt={ad.title} className="banner-ad-img" />
      ) : (
        <div className="banner-ad-text">
          <span className="banner-ad-title">{ad.title}</span>
          {ad.subtitle && <span className="banner-ad-sub">{ad.subtitle}</span>}
          {ad.legal && <span className="banner-ad-legal">{ad.legal}</span>}
        </div>
      )}
      {ad.url && <ExternalLink size={12} className="banner-ad-ext" aria-hidden="true" />}
    </div>
  );
}
