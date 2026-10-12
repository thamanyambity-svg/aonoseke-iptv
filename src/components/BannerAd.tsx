import { useEffect, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { BannerAd as BannerAdData } from '../hooks/useAds.ts';
import { AlphaLogo } from './AlphaLogo.tsx';
import { adPhoto } from '../lib/adPhotos.ts';
import { CARD_ENTER, CARD_EXIT, pick } from '../lib/adAnimations.ts';
import type { JSX } from 'react';
import './SponsorCard.css';

/** Durées alignées sur SponsorCard.css. */
const IN_MS = 1000;
const OUT_MS = 700;

interface BannerAdProps {
  ad: BannerAdData;
  /** Durée d'affichage une fois la carte entrée (ms). */
  visibleMs?: number;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
  /** Appelé quand l'animation de sortie est terminée : le parent passe à la pub suivante. */
  onDone?: () => void;
}

type Phase = 'in' | 'show' | 'out';

export function BannerAd({ ad, visibleMs = 9000, onImpression, onClick, onDone }: BannerAdProps): JSX.Element {
  const reported = useRef(false);
  const [phase, setPhase] = useState<Phase>('in');
  const [anim] = useState(() => ({ enter: pick(CARD_ENTER), exit: pick(CARD_EXIT) }));
  const photo = adPhoto(ad.image);

  useEffect(() => {
    if (!reported.current) {
      reported.current = true;
      onImpression?.(ad.id);
    }
  }, [ad.id, onImpression]);

  useEffect(() => {
    const toShow = window.setTimeout(() => setPhase('show'), IN_MS);
    const toOut = window.setTimeout(() => setPhase('out'), IN_MS + visibleMs);
    const toDone = window.setTimeout(() => onDone?.(), IN_MS + visibleMs + OUT_MS);
    return () => { window.clearTimeout(toShow); window.clearTimeout(toOut); window.clearTimeout(toDone); };
  }, [visibleMs, onDone]);

  function handleClick(): void {
    if (!ad.url) return;
    onClick?.(ad.id);
    window.open(ad.url, '_blank', 'noopener,noreferrer');
  }

  const eyebrow = ad.eyebrow ?? (photo ? 'Alpha Import Exchange' : undefined);

  return (
    <div
      className={`sp-card sp-phase-${phase} sp-in-${anim.enter} sp-out-${anim.exit}${photo ? '' : ' sp-card--plain'}`}
      onClick={handleClick}
      role={ad.url ? 'button' : undefined}
      tabIndex={ad.url ? 0 : undefined}
      aria-label={`Publicité : ${ad.title}`}
      onKeyDown={(e) => {
        if (ad.url && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {photo ? (
        <img src={photo} alt="" className="sp-photo" loading="eager" />
      ) : ad.image ? (
        <img src={ad.image} alt={ad.title} className="sp-photo sp-photo--raw" />
      ) : null}
      <div className="sp-shade" aria-hidden="true" />
      <span className="sp-tag">Sponsor</span>
      {!photo && ad.emblem && <AlphaLogo size={30} />}
      <div className="sp-body">
        {eyebrow && <span className="sp-eyebrow">{eyebrow}</span>}
        <strong className="sp-title">{ad.title}</strong>
        {ad.subtitle && <span className="sp-sub">{ad.subtitle}</span>}
        {ad.cta && ad.url && (
          <span className="sp-cta">
            {ad.cta} <ExternalLink size={11} aria-hidden="true" />
          </span>
        )}
      </div>
    </div>
  );
}
