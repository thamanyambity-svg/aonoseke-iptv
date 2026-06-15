import { useState, useEffect, useRef, useCallback } from 'react';
import { SkipForward, ExternalLink } from 'lucide-react';
import type { PrerollAd } from '../hooks/useAds.ts';
import { AlphaLogoAnimated } from './AlphaLogoAnimated.tsx';

interface PreRollAdProps {
  ad: PrerollAd;
  skipAfter: number;
  maxDuration: number;
  onComplete: () => void;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
}

export function PreRollAd({
  ad,
  skipAfter,
  maxDuration,
  onComplete,
  onImpression,
  onClick,
}: PreRollAdProps): JSX.Element {
  const [remaining, setRemaining] = useState(maxDuration);
  const reported = useRef(false);
  const completed = useRef(false);

  // Fire onComplete at most once, and never from inside a render/state-updater.
  const complete = useCallback((): void => {
    if (completed.current) return;
    completed.current = true;
    onComplete();
  }, [onComplete]);

  // Impression — once, kept separate so re-renders never refire it.
  useEffect(() => {
    if (!reported.current) {
      reported.current = true;
      onImpression?.(ad.id);
    }
  }, [ad.id, onImpression]);

  // Countdown tick — the updater stays pure (no side effects).
  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Completion runs after commit, not during render.
  useEffect(() => {
    if (remaining <= 0) complete();
  }, [remaining, complete]);

  const canSkip = maxDuration - remaining >= skipAfter;

  function handleClickAd(): void {
    if (!ad.url) return;
    onClick?.(ad.id);
    window.open(ad.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="preroll-overlay" role="dialog" aria-label="Publicité partenaire">
      <div
        className={`preroll-card preroll-${ad.variant ?? 'souverain'}`}
        style={ad.image ? undefined : { background: ad.bg ?? 'var(--surface-2)' }}
        onClick={handleClickAd}
        role={ad.url ? 'button' : undefined}
      >
        {ad.image ? (
          <img src={ad.image} alt={ad.title} className="preroll-img" />
        ) : (
          <div className="preroll-content">
            {ad.emblem ? (
              <span className="preroll-emblem">
                <AlphaLogoAnimated size={150} />
              </span>
            ) : ad.logo ? (
              <img src={ad.logo} alt="Alpha Import Exchange" className="preroll-logo" />
            ) : null}
            <span className="preroll-sponsor">Publicité</span>
            {ad.eyebrow && <span className="preroll-eyebrow">{ad.eyebrow}</span>}
            <h2 className="preroll-title">{ad.title}</h2>
            {ad.subtitle && <p className="preroll-subtitle">{ad.subtitle}</p>}
            {ad.destinations && (
              <p className="preroll-destinations">{ad.destinations}</p>
            )}
            {ad.cta && ad.url && (
              <span className="preroll-cta">
                {ad.cta} <ExternalLink size={13} />
              </span>
            )}
            {ad.legal && <p className="preroll-legal">{ad.legal}</p>}
          </div>
        )}
      </div>

      <div className="preroll-controls">
        <span className="preroll-countdown">
          La chaîne démarre dans {remaining}s
        </span>
        <button
          className="preroll-skip"
          onClick={complete}
          disabled={!canSkip}
          aria-label="Passer la publicité"
        >
          {canSkip ? (
            <>Passer <SkipForward size={14} /></>
          ) : (
            <>Passer dans {skipAfter - (maxDuration - remaining)}s</>
          )}
        </button>
      </div>
    </div>
  );
}
