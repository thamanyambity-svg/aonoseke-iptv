import { useState, useEffect, useRef } from 'react';
import { SkipForward, ExternalLink } from 'lucide-react';
import type { PrerollAd } from '../hooks/useAds.ts';

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

  useEffect(() => {
    if (!reported.current) {
      reported.current = true;
      onImpression?.(ad.id);
    }
    const interval = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [ad.id, onComplete, onImpression]);

  const canSkip = maxDuration - remaining >= skipAfter;

  function handleClickAd(): void {
    if (!ad.url) return;
    onClick?.(ad.id);
    window.open(ad.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <div className="preroll-overlay" role="dialog" aria-label="Publicité partenaire">
      <div
        className="preroll-card"
        style={ad.image ? undefined : { background: ad.bg ?? 'var(--surface-2)' }}
        onClick={handleClickAd}
        role={ad.url ? 'button' : undefined}
      >
        {ad.image ? (
          <img src={ad.image} alt={ad.title} className="preroll-img" />
        ) : (
          <div className="preroll-content">
            <span className="preroll-sponsor">Publicité</span>
            <h2 className="preroll-title">{ad.title}</h2>
            {ad.subtitle && <p className="preroll-subtitle">{ad.subtitle}</p>}
            {ad.cta && ad.url && (
              <span className="preroll-cta">
                {ad.cta} <ExternalLink size={13} />
              </span>
            )}
          </div>
        )}
      </div>

      <div className="preroll-controls">
        <span className="preroll-countdown">
          La chaîne démarre dans {remaining}s
        </span>
        <button
          className="preroll-skip"
          onClick={onComplete}
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
