import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IntroSplash, introAlreadySeen, INTRO_FADE_MS, INTRO_FALLBACK_MS } from '../IntroSplash';

const film = (): HTMLVideoElement => {
  const v = screen.getByTestId('intro-splash').querySelector('video');
  if (!v) throw new Error('vidéo absente');
  return v;
};

describe('IntroSplash (film d’ouverture)', () => {
  let play: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
    play = vi.fn(() => Promise.resolve());
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('lance le film avec le son', async () => {
    render(<IntroSplash onDone={() => {}} />);
    await act(async () => { await Promise.resolve(); });
    expect(play).toHaveBeenCalledTimes(1);
    expect(film().muted).toBe(false);
    expect(film().getAttribute('src')).toMatch(/intro-a\.mp4$/);
  });

  it('retombe sur une lecture sans son si le navigateur refuse le son automatique', async () => {
    play.mockImplementationOnce(() => Promise.reject(new Error('NotAllowedError')));
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); });
    expect(play).toHaveBeenCalledTimes(2);
    expect(film().muted).toBe(true);
    expect(onDone).not.toHaveBeenCalled();
  });

  it('saute l’intro si la vidéo ne peut pas se lire du tout', async () => {
    play.mockImplementation(() => Promise.reject(new Error('NotSupportedError')));
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    await act(async () => { await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); });
    act(() => { vi.advanceTimersByTime(INTRO_FADE_MS + 10); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(introAlreadySeen()).toBe(true);
  });

  it('se termine à la fin du film, avec un fondu, et mémorise la session', async () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.ended(film());
    expect(screen.getByTestId('intro-splash').className).toContain('is-leaving');
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(INTRO_FADE_MS + 10); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(introAlreadySeen()).toBe(true);
  });

  it('un clic ou une touche permet de passer, une seule fois', async () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByTestId('intro-splash'));
    fireEvent.keyDown(window, { key: 'Enter' });
    act(() => { vi.advanceTimersByTime(INTRO_FADE_MS + 10); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('se ferme d’elle-même si la vidéo se bloque (garde-fou)', async () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    await act(async () => { await Promise.resolve(); });
    act(() => { vi.advanceTimersByTime(INTRO_FALLBACK_MS + INTRO_FADE_MS + 10); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('une erreur de chargement de la vidéo saute l’intro', async () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    await act(async () => { await Promise.resolve(); });
    fireEvent.error(film());
    act(() => { vi.advanceTimersByTime(INTRO_FADE_MS + 10); });
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('n’est pas rejouée dans la même session', () => {
    expect(introAlreadySeen()).toBe(false);
    sessionStorage.setItem('aonoseke-intro-seen', '1');
    expect(introAlreadySeen()).toBe(true);
  });
});
