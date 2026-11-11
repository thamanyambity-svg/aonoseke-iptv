import { describe, it, expect } from 'vitest';
import { nextBackAction, swipeDirection, swipeStartAllowed } from '../backNav';
import type { BackState } from '../backNav';

const idle: BackState = { profile: false, preroll: false, drawer: false, channel: false, directory: false };

describe('nextBackAction', () => {
  it('ne trouve rien à fermer à l’accueil', () => {
    expect(nextBackAction(idle)).toBeNull();
  });
  it('ferme ce qui est le plus « au-dessus » en premier', () => {
    expect(nextBackAction({ ...idle, profile: true, channel: true, drawer: true })).toBe('profile');
    expect(nextBackAction({ ...idle, preroll: true, channel: true })).toBe('preroll');
    expect(nextBackAction({ ...idle, drawer: true, channel: true })).toBe('drawer');
    expect(nextBackAction({ ...idle, channel: true })).toBe('channel');
    expect(nextBackAction({ ...idle, directory: true })).toBe('directory');
  });
});

describe('swipeDirection', () => {
  const a = { x: 100, y: 400, t: 0 };
  it('reconnaît un glissement franc de gauche à droite', () => {
    expect(swipeDirection(a, { x: 260, y: 410, t: 250 })).toBe('right');
  });
  it('reconnaît un glissement vers la gauche', () => {
    expect(swipeDirection({ x: 300, y: 400, t: 0 }, { x: 120, y: 395, t: 200 })).toBe('left');
  });
  it('ignore un geste trop court', () => {
    expect(swipeDirection(a, { x: 150, y: 400, t: 100 })).toBeNull();
  });
  it('ignore un défilement vertical (même avec une dérive de côté)', () => {
    expect(swipeDirection(a, { x: 190, y: 700, t: 300 })).toBeNull();
    expect(swipeDirection(a, { x: 220, y: 520, t: 300 })).toBeNull();
  });
  it('ignore un geste lent', () => {
    expect(swipeDirection(a, { x: 300, y: 400, t: 1500 })).toBeNull();
  });
});

describe('swipeStartAllowed', () => {
  it('refuse dans un champ de saisie ou une zone marquée', () => {
    document.body.innerHTML = '<input id="i"><div data-no-swipe><span id="s"></span></div><p id="p"></p>';
    expect(swipeStartAllowed(document.getElementById('i'))).toBe(false);
    expect(swipeStartAllowed(document.getElementById('s'))).toBe(false);
    expect(swipeStartAllowed(document.getElementById('p'))).toBe(true);
  });
  it('autorise sans cible précise', () => {
    expect(swipeStartAllowed(null)).toBe(true);
  });
});
