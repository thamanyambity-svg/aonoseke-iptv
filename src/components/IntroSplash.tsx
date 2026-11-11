import { useCallback, useEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import './IntroSplash.css';

/** Durée du film (s) — public/intro-a.mp4. Sert de garde-fou si l'événement « fin » n'arrive jamais. */
export const INTRO_FILM_SECONDS = 4.2;
/** Garde-fou : on ferme l'intro même si la vidéo se bloque (ms). */
export const INTRO_FALLBACK_MS = Math.round((INTRO_FILM_SECONDS + 1.8) * 1000);
/** Durée du fondu vers l'application (ms) — alignée avec IntroSplash.css. */
export const INTRO_FADE_MS = 350;
const SEEN_KEY = 'aonoseke-intro-seen';
const FILM_URL = `${import.meta.env.BASE_URL}intro-a.mp4`;

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
 * Film d'ouverture : le A d'Aonoseke se dessine, avance, s'ouvre en rideau de lumière puis converge en une ligne rouge,
 * avec un son de 4,2 s. Une fois par session ; un clic ou une touche permet de passer.
 * Le son est tenté d'abord ; si le navigateur refuse la lecture automatique avec son, le film se joue sans son.
 * Si la vidéo ne peut pas se lire du tout, l'intro est simplement sautée.
 */
export function IntroSplash({ onDone }: IntroSplashProps): JSX.Element {
  const videoRef = useRef<HTMLVideoElement>(null);
  const doneRef = useRef(onDone);
  const finishedRef = useRef(false);
  const [leaving, setLeaving] = useState(false);
  useEffect(() => { doneRef.current = onDone; });

  const finish = useCallback((): void => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    markSeen();
    setLeaving(true);
    window.setTimeout(() => doneRef.current(), INTRO_FADE_MS);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    const guard = window.setTimeout(finish, INTRO_FALLBACK_MS);
    const onKey = (): void => finish();
    window.addEventListener('keydown', onKey);

    const start = async (): Promise<void> => {
      if (!video) { finish(); return; }
      try {
        video.muted = false;
        await video.play();
      } catch {
        try {
          video.muted = true; // lecture automatique avec son refusée : on joue sans son
          await video.play();
        } catch {
          finish();
        }
      }
    };
    void start();

    return () => { window.clearTimeout(guard); window.removeEventListener('keydown', onKey); };
  }, [finish]);

  return (
    <div className={`intro-splash${leaving ? ' is-leaving' : ''}`} role="presentation" onClick={finish} data-testid="intro-splash">
      <video
        ref={videoRef}
        className="intro-film"
        src={FILM_URL}
        playsInline
        preload="auto"
        disablePictureInPicture
        onEnded={finish}
        onError={finish}
      />
    </div>
  );
}
