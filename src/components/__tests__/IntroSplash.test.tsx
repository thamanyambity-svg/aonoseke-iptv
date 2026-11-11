import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { IntroSplash, introAlreadySeen, INTRO_DURATION_MS } from '../IntroSplash';

describe('IntroSplash', () => {
  beforeEach(() => { sessionStorage.clear(); vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('se termine toute seule à la fin de l’animation et mémorise la session', () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    expect(onDone).not.toHaveBeenCalled();
    act(() => { vi.advanceTimersByTime(INTRO_DURATION_MS + 10); });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(introAlreadySeen()).toBe(true);
  });

  it('un clic permet de passer l’intro', () => {
    const onDone = vi.fn();
    render(<IntroSplash onDone={onDone} />);
    fireEvent.click(screen.getByTestId('intro-splash'));
    expect(onDone).toHaveBeenCalledTimes(1);
  });

  it('n’est pas rejouée dans la même session', () => {
    expect(introAlreadySeen()).toBe(false);
    sessionStorage.setItem('aonoseke-intro-seen', '1');
    expect(introAlreadySeen()).toBe(true);
  });
});
