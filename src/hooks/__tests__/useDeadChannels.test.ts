import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDeadChannels } from '../useDeadChannels';

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers();
});

describe('useDeadChannels', () => {
  it('starts with empty dead set', () => {
    const { result } = renderHook(() => useDeadChannels());
    expect(result.current.deadSet.size).toBe(0);
  });

  it('marks a channel as dead', () => {
    const { result } = renderHook(() => useDeadChannels());
    act(() => {
      result.current.markDead('http://test.com/stream.m3u8');
    });
    expect(result.current.deadSet.has('http://test.com/stream.m3u8')).toBe(true);
  });

  it('ignores empty url', () => {
    const { result } = renderHook(() => useDeadChannels());
    act(() => {
      result.current.markDead('');
    });
    expect(result.current.deadSet.size).toBe(0);
  });

  it('persists to localStorage', () => {
    const { result } = renderHook(() => useDeadChannels());
    act(() => {
      result.current.markDead('http://test.com/stream.m3u8');
    });
    const stored = JSON.parse(localStorage.getItem('iptv-dead-channels') ?? '{}');
    expect(stored['http://test.com/stream.m3u8']).toBeGreaterThan(0);
  });

  it('loads existing dead channels from localStorage', () => {
    const now = Date.now();
    localStorage.setItem('iptv-dead-channels', JSON.stringify({
      'http://test.com/stream.m3u8': now,
    }));
    const { result } = renderHook(() => useDeadChannels());
    expect(result.current.deadSet.has('http://test.com/stream.m3u8')).toBe(true);
  });

  it('expires dead channels after 24h', () => {
    const now = Date.now();
    localStorage.setItem('iptv-dead-channels', JSON.stringify({
      'http://old.com/stream.m3u8': now - 25 * 60 * 60 * 1000,
    }));
    const { result } = renderHook(() => useDeadChannels());
    expect(result.current.deadSet.has('http://old.com/stream.m3u8')).toBe(false);
  });
});
