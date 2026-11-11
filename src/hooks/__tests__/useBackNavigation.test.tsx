import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { BackState } from '../../utils/backNav';

const native = vi.hoisted(() => ({
  isNative: true,
  backHandler: null as null | (() => void),
  remove: vi.fn(() => Promise.resolve()),
  minimizeApp: vi.fn(() => Promise.resolve()),
}));

vi.mock('../../lib/nativeAuth.ts', () => ({ isNativeApp: () => native.isNative }));
vi.mock('@capacitor/app', () => ({
  App: {
    addListener: vi.fn((_event: string, cb: () => void) => {
      native.backHandler = cb;
      return Promise.resolve({ remove: native.remove });
    }),
    minimizeApp: native.minimizeApp,
  },
}));

import { useBackNavigation } from '../useBackNavigation';

const idle: BackState = { profile: false, preroll: false, drawer: false, channel: false, directory: false };

function touch(type: 'touchstart' | 'touchend', x: number, y: number): void {
  const t = { clientX: x, clientY: y } as Touch;
  const ev = new Event(type, { bubbles: true }) as TouchEvent;
  Object.defineProperty(ev, type === 'touchstart' ? 'touches' : 'changedTouches', { value: [t] });
  if (type === 'touchend') Object.defineProperty(ev, 'touches', { value: [] });
  document.body.dispatchEvent(ev);
}

describe('useBackNavigation', () => {
  beforeEach(() => { native.isNative = true; native.backHandler = null; native.remove.mockClear(); native.minimizeApp.mockClear(); });

  it('bouton Retour d’Android : ferme d’abord la chaîne en lecture', async () => {
    const perform = vi.fn();
    renderHook(() => useBackNavigation(() => ({ ...idle, channel: true }), perform));
    await act(async () => { await Promise.resolve(); });
    native.backHandler?.();
    expect(perform).toHaveBeenCalledWith('channel');
    expect(native.minimizeApp).not.toHaveBeenCalled();
  });

  it('bouton Retour d’Android à l’accueil : met l’application en arrière-plan au lieu de la fermer', async () => {
    const perform = vi.fn();
    renderHook(() => useBackNavigation(() => idle, perform));
    await act(async () => { await Promise.resolve(); });
    native.backHandler?.();
    expect(perform).not.toHaveBeenCalled();
    expect(native.minimizeApp).toHaveBeenCalledTimes(1);
  });

  it('retire l’écouteur Android au démontage', async () => {
    const { unmount } = renderHook(() => useBackNavigation(() => idle, vi.fn()));
    await act(async () => { await Promise.resolve(); });
    unmount();
    expect(native.remove).toHaveBeenCalledTimes(1);
  });

  it('n’installe pas d’écouteur Android sur le web', async () => {
    native.isNative = false;
    renderHook(() => useBackNavigation(() => idle, vi.fn()));
    await act(async () => { await Promise.resolve(); });
    expect(native.backHandler).toBeNull();
  });

  it('glissement de gauche à droite = retour ; vers la gauche ferme seulement le tiroir', () => {
    native.isNative = false;
    const perform = vi.fn();
    let state: BackState = { ...idle, channel: true };
    renderHook(() => useBackNavigation(() => state, perform));

    touch('touchstart', 60, 400);
    touch('touchend', 260, 410);
    expect(perform).toHaveBeenLastCalledWith('channel');

    perform.mockClear();
    touch('touchstart', 300, 400);
    touch('touchend', 90, 400); // vers la gauche, sans tiroir ouvert : rien
    expect(perform).not.toHaveBeenCalled();

    state = { ...idle, drawer: true };
    touch('touchstart', 300, 400);
    touch('touchend', 90, 400);
    expect(perform).toHaveBeenCalledWith('drawer');
  });

  it('touche Échap : même logique de retour', () => {
    native.isNative = false;
    const perform = vi.fn();
    renderHook(() => useBackNavigation(() => ({ ...idle, profile: true }), perform));
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(perform).toHaveBeenCalledWith('profile');
  });
});
