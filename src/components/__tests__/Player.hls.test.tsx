import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, act } from '@testing-library/react';

type Handler = (event: string, data: unknown) => void;

// Faux hls.js : on capture les instances et les handlers pour piloter les erreurs.
const instances: Array<{ handlers: Record<string, Handler>; destroy: ReturnType<typeof vi.fn> }> = [];

vi.mock('hls.js', () => {
  class FakeHls {
    static isSupported = (): boolean => true;
    static Events = { MANIFEST_PARSED: 'manifest', ERROR: 'error' };
    static ErrorTypes = { NETWORK_ERROR: 'network', MEDIA_ERROR: 'media' };
    handlers: Record<string, Handler> = {};
    destroy = vi.fn();
    loadSource = vi.fn();
    attachMedia = vi.fn();
    startLoad = vi.fn();
    recoverMediaError = vi.fn();
    constructor() { instances.push(this); }
    on(event: string, cb: Handler): void { this.handlers[event] = cb; }
  }
  return { default: FakeHls };
});

import { Player } from '../Player';

const URL_A = 'https://test.com/a.m3u8';
const networkError = { fatal: true, type: 'network', details: 'manifestLoadError' };

describe('Player — résilience HLS', () => {
  beforeEach(() => { instances.length = 0; vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it("ne signale pas d'erreur si le flux reprend avant la fin du délai de 5 s", () => {
    const onError = vi.fn();
    const { container } = render(<Player url={URL_A} onError={onError} />);
    const video = container.querySelector('video') as HTMLVideoElement;

    act(() => { instances[0]!.handlers['error']!('error', networkError); });
    act(() => { vi.advanceTimersByTime(2000); });
    act(() => { video.dispatchEvent(new Event('playing')); });
    act(() => { vi.advanceTimersByTime(10_000); });

    expect(onError).not.toHaveBeenCalled();
  });

  it("signale l'erreur si le flux ne reprend pas après 5 s", () => {
    const onError = vi.fn();
    render(<Player url={URL_A} onError={onError} />);

    act(() => { instances[0]!.handlers['error']!('error', networkError); });
    act(() => { vi.advanceTimersByTime(5001); });

    expect(onError).toHaveBeenCalledTimes(1);
  });

  it('ne relance pas la lecture quand le parent recrée onError à chaque rendu', () => {
    const { rerender } = render(<Player url={URL_A} onError={() => {}} />);
    rerender(<Player url={URL_A} onError={() => {}} />);
    rerender(<Player url={URL_A} onError={() => {}} />);

    expect(instances).toHaveLength(1);
    expect(instances[0]!.destroy).not.toHaveBeenCalled();
  });

  it("relance la lecture quand l'URL change", () => {
    const { rerender } = render(<Player url={URL_A} onError={() => {}} />);
    rerender(<Player url="https://test.com/b.m3u8" onError={() => {}} />);

    expect(instances).toHaveLength(2);
    expect(instances[0]!.destroy).toHaveBeenCalled();
  });
});
