import { useEffect, useRef } from 'react';
import { App as CapacitorApp } from '@capacitor/app';
import { isNativeApp } from '../lib/nativeAuth.ts';
import { isBackKey } from '../utils/spatialNav.ts';
import { nextBackAction, swipeDirection, swipeStartAllowed } from '../utils/backNav.ts';
import type { BackAction, BackState, Point } from '../utils/backNav.ts';

/**
 * Branche « retour » sur trois entrées, avec une seule logique (`nextBackAction`) :
 * - le bouton Retour d'Android (sinon l'application se ferme d'un coup ; à l'accueil elle est mise en arrière-plan) ;
 * - un glissement de gauche à droite sur l'écran, comme sur TikTok ; un glissement vers la gauche referme le tiroir des chaînes ;
 * - les touches de retour du clavier et des télécommandes.
 */
export function useBackNavigation(getState: () => BackState, perform: (action: BackAction) => void): void {
  const getRef = useRef(getState);
  const performRef = useRef(perform);
  useEffect(() => { getRef.current = getState; performRef.current = perform; });

  useEffect(() => {
    const goBack = (): boolean => {
      const action = nextBackAction(getRef.current());
      if (!action) return false;
      performRef.current(action);
      return true;
    };

    // Glissement tactile
    let start: Point | null = null;
    const onTouchStart = (e: TouchEvent): void => {
      const t = e.touches[0];
      start = e.touches.length === 1 && t && swipeStartAllowed(e.target) ? { x: t.clientX, y: t.clientY, t: Date.now() } : null;
    };
    const onTouchEnd = (e: TouchEvent): void => {
      const from = start;
      start = null;
      const t = e.changedTouches[0];
      if (!from || !t) return;
      const dir = swipeDirection(from, { x: t.clientX, y: t.clientY, t: Date.now() });
      if (dir === 'right') goBack();
      else if (dir === 'left' && getRef.current().drawer) performRef.current('drawer');
    };
    const onTouchCancel = (): void => { start = null; };

    // Touches de retour (clavier, télécommande)
    const onKey = (e: KeyboardEvent): void => {
      if (!isBackKey(e)) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (goBack()) e.preventDefault();
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });
    window.addEventListener('keydown', onKey);

    // Bouton Retour d'Android
    let cancelled = false;
    let removeNative: (() => Promise<void>) | null = null;
    if (isNativeApp()) {
      void CapacitorApp.addListener('backButton', () => {
        if (!goBack()) void CapacitorApp.minimizeApp();
      }).then((handle) => {
        if (cancelled) void handle.remove();
        else removeNative = () => handle.remove();
      });
    }

    return () => {
      cancelled = true;
      if (removeNative) void removeNative();
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
      window.removeEventListener('keydown', onKey);
    };
  }, []);
}
