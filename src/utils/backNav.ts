/**
 * Navigation « retour » de l'application : bouton Retour d'Android, geste de glissement (gauche → droite, comme TikTok)
 * et touches de télécommande passent tous par la même logique.
 */

export interface BackState {
  /** Fenêtre du profil ouverte. */
  profile: boolean;
  /** Publicité pré-roll en attente avant une chaîne. */
  preroll: boolean;
  /** Liste des chaînes ouverte en tiroir (mobile / tablette). */
  drawer: boolean;
  /** Une chaîne est en lecture. */
  channel: boolean;
  /** Onglet Annuaire affiché. */
  directory: boolean;
}

export type BackAction = 'profile' | 'preroll' | 'drawer' | 'channel' | 'directory';

/** Ce que « retour » doit fermer en premier ; `null` = on est à l'accueil, il n'y a plus rien à fermer. */
export function nextBackAction(s: BackState): BackAction | null {
  if (s.profile) return 'profile';
  if (s.preroll) return 'preroll';
  if (s.drawer) return 'drawer';
  if (s.channel) return 'channel';
  if (s.directory) return 'directory';
  return null;
}

export interface Point { x: number; y: number; t: number }

/** Glissement minimal (px), dérive verticale maximale (px) et durée maximale (ms) d'un geste valide. */
export const SWIPE_MIN_DX = 80;
export const SWIPE_MAX_DY = 70;
export const SWIPE_MAX_MS = 700;

/** Direction d'un glissement franc et horizontal, sinon `null` (défilement vertical, geste lent ou trop court). */
export function swipeDirection(a: Point, b: Point): 'right' | 'left' | null {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (b.t - a.t > SWIPE_MAX_MS) return null;
  if (Math.abs(dy) > SWIPE_MAX_DY || Math.abs(dy) > Math.abs(dx) * 0.6) return null;
  if (dx >= SWIPE_MIN_DX) return 'right';
  if (dx <= -SWIPE_MIN_DX) return 'left';
  return null;
}

const SKIP = 'input, textarea, select, [contenteditable="true"], [data-no-swipe]';

/**
 * Faux si le geste démarre dans un champ de saisie ou dans une zone qui défile horizontalement
 * (rangées de chaînes, catégories) : le glissement y fait défiler, pas revenir en arrière.
 */
export function swipeStartAllowed(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (target.closest(SKIP)) return false;
  for (let el: Element | null = target; el; el = el.parentElement) {
    if (el.scrollWidth > el.clientWidth + 4) {
      const ox = getComputedStyle(el).overflowX;
      if (ox === 'auto' || ox === 'scroll') return false;
    }
  }
  return true;
}
