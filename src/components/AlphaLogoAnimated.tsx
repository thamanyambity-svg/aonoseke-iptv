import { useId } from 'react';
import { AlphaLogo } from './AlphaLogo.tsx';
import './AlphaLogoAnimated.css';

interface AlphaLogoAnimatedProps {
  size?: number;
}

/**
 * Emblème Alpha (gear+globe+A) entouré d'un anneau radar animé :
 * anneaux pointillés contrarotatifs + balayage + points pulsés.
 * Les anneaux utilisent un trait non-mis-à-l'échelle → nets à toute taille.
 * L'animation est coupée si l'utilisateur a `prefers-reduced-motion`.
 */
export function AlphaLogoAnimated({ size = 72 }: AlphaLogoAnimatedProps): JSX.Element {
  const uid = useId().replace(/:/g, '');
  const sweepId = `alphaSweep-${uid}`;
  const inner = Math.round(size * 0.62);

  return (
    <span className="alpha-logo-anim" style={{ width: size, height: size }}>
      <svg
        className="alpha-logo-anim-deco"
        viewBox="0 0 140 140"
        width={size}
        height={size}
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={sweepId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor="#c9a84c" stopOpacity="0" />
            <stop offset="1" stopColor="#c9a84c" stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <circle
          className="ala-ring ala-ring-1"
          cx="70" cy="70" r="66" fill="none" stroke="#c9a84c"
          strokeWidth="1" vectorEffect="non-scaling-stroke"
          strokeDasharray="3 7" opacity="0.55"
        />
        <circle
          className="ala-ring ala-ring-2"
          cx="70" cy="70" r="57" fill="none" stroke="#c9a84c"
          strokeWidth="1" vectorEffect="non-scaling-stroke"
          strokeDasharray="1.5 9" opacity="0.35"
        />
        <path
          className="ala-sweep"
          d="M70 70 L70 4 A66 66 0 0 1 99 13 Z"
          fill={`url(#${sweepId})`}
          opacity="0.5"
        />
        <circle className="ala-dot ala-dot-1" cx="70" cy="6" r="2.4" fill="#e7cd7a" />
        <circle className="ala-dot ala-dot-2" cx="128" cy="88" r="2.4" fill="#e7cd7a" />
        <circle className="ala-dot ala-dot-3" cx="18" cy="96" r="1.8" fill="#e7cd7a" />
      </svg>
      <span className="alpha-logo-anim-core">
        <AlphaLogo size={inner} />
      </span>
    </span>
  );
}
