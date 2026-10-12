/**
 * Animations d'entrée / de sortie des publicités. Une paire est tirée au hasard à chaque
 * apparition pour que l'affichage reste vivant ; les classes CSS correspondantes sont dans
 * SponsorCard.css (carte latérale) et AdBanner.css (bandeau du lecteur).
 */
export const CARD_ENTER = ['rise', 'slide', 'zoom', 'wipe', 'flip', 'blur'] as const;
export const CARD_EXIT = ['sink', 'slide', 'zoom', 'wipe', 'flip', 'fade'] as const;

export const BAR_ENTER = ['wipe', 'slide', 'rise', 'zoom'] as const;
export const BAR_EXIT = ['wipe', 'slide', 'sink', 'zoom'] as const;

export function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)] as T;
}
