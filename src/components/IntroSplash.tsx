import { useEffect, useRef } from 'react';
import type { JSX } from 'react';
import './IntroSplash.css';

/** Durée de l'animation (ms) — doit rester alignée avec IntroSplash.css. */
export const INTRO_DURATION_MS = 3400;
const SEEN_KEY = 'aonoseke-intro-seen';

/** Vrai si l'intro a déjà été jouée dans cette session (ou si l'utilisateur réduit les animations). */
export function introAlreadySeen(): boolean {
  try {
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return true;
    return sessionStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen(): void {
  try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* stockage indisponible */ }
}

interface IntroSplashProps {
  onDone: () => void;
}

/**
 * Animation d'ouverture façon « ta-dum » : le A d'Aonoseke se dessine (deux jambes puis la barre,
 * en ruban doré/rouge), pulse, puis zoome jusqu'à engloutir l'écran. Touche ou clic = passer.
 */
export function IntroSplash({ onDone }: IntroSplashProps): JSX.Element {
  const doneRef = useRef(onDone);
  useEffect(() => { doneRef.current = onDone; });

  useEffect(() => {
    const finish = (): void => { markSeen(); doneRef.current(); };
    const timer = window.setTimeout(finish, INTRO_DURATION_MS);
    const onKey = (): void => { window.clearTimeout(timer); finish(); };
    window.addEventListener('keydown', onKey);
    return () => { window.clearTimeout(timer); window.removeEventListener('keydown', onKey); };
  }, []);

  const skip = (): void => { markSeen(); doneRef.current(); };

  return (
    <div className="intro-splash" role="presentation" onClick={skip} data-testid="intro-splash">
      <div className="intro-stage">
        <svg className="intro-a" viewBox="0 0 200 240" aria-hidden="true">
          <defs>
            <linearGradient id="introLeg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#f3dc8a" />
              <stop offset="1" stopColor="#c9a84c" />
            </linearGradient>
            <linearGradient id="introShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#b3202f" />
              <stop offset="1" stopColor="#5a0b14" />
            </linearGradient>
            <linearGradient id="introBar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#e50914" />
              <stop offset="1" stopColor="#8a0710" />
            </linearGradient>
          </defs>
          <polygon className="intro-leg intro-leg-left" points="80,8 112,8 64,232 24,232" fill="url(#introLeg)" />
          <polygon className="intro-leg intro-leg-right" points="88,8 120,8 176,232 136,232" fill="url(#introShade)" />
          <polygon className="intro-bar" points="62,150 138,150 142,176 56,176" fill="url(#introBar)" />
        </svg>
        <div className="intro-word">AONOSEKE</div>
      </div>
    </div>
  );
}
