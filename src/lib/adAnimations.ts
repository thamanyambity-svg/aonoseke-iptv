/**
 * Animations d'entrée / de sortie des publicités. Une paire est tirée au hasard à chaque
 * apparition pour que l'affichage reste vivant ; les classes CSS correspondantes sont dans
 * SponsorCard.css (carte latérale) et AdBanner.css (bandeau du lecteur).
 */
export const CARD_ENTER = ['rise', 'slide', 'zoom', 'wipe', 'flip', 'blur'] as const;
export const CARD_EXIT = ['sink', 'slide', 'zoom', 'wipe', 'flip', 'fade'] as const;

export const BAR_ENTER = ['wipe', 'slide', 'rise', 'zoom'] as const;
export const BAR_EXIT = ['wipe', 'slide', 'sink', 'zoom'] as const;

/** Choix aléatoire non prévisible (Web Crypto) ; sans Web Crypto on garde la première animation. */
export function pick<T>(list: readonly T[]): T {
  const buf = new Uint32Array(1);
  const c = globalThis.crypto as Crypto | undefined;
  const n = c ? c.getRandomValues(buf)[0] ?? 0 : 0;
  return list[n % list.length] as T;
}
