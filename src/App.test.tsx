import { describe, it, expect } from 'vitest';
import { countryFlag } from './App.tsx';
import { validatePlaylist } from './types.ts';

describe('countryFlag', () => {
  it('returns flag emoji for valid 2-letter code', () => {
    expect(countryFlag('FR')).toBe('🇫🇷');
  });

  it('returns globe for empty code', () => {
    expect(countryFlag('')).toBe('🌐');
  });

  it('returns globe for code longer than 2 chars', () => {
    expect(countryFlag('USA')).toBe('🌐');
  });

  it('is case-insensitive', () => {
    expect(countryFlag('fr')).toBe('🇫🇷');
  });
});

describe('validatePlaylist', () => {
  it('parses a valid playlist array', () => {
    const raw = [{ name: 'TF1', url: 'http://example.com/tf1.m3u8', country: 'FR', group: 'News', logo: '' }];
    const result = validatePlaylist(raw);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('TF1');
  });

  it('throws when input is not an array', () => {
    expect(() => validatePlaylist({ notAnArray: true })).toThrow();
  });

  it('throws when an item is missing name', () => {
    expect(() => validatePlaylist([{ url: 'http://x.com/stream.m3u8' }])).toThrow();
  });

  it('throws when an item is missing url', () => {
    expect(() => validatePlaylist([{ name: 'Test' }])).toThrow();
  });

  it('defaults country to US when missing', () => {
    const raw = [{ name: 'Test', url: 'http://x.com/stream.m3u8' }];
    const result = validatePlaylist(raw);
    expect(result[0].country).toBe('US');
  });

  it('defaults group to General when missing', () => {
    const raw = [{ name: 'Test', url: 'http://x.com/stream.m3u8' }];
    const result = validatePlaylist(raw);
    expect(result[0].group).toBe('General');
  });
});
