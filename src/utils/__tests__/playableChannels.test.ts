import { describe, it, expect } from 'vitest';
import { filterPlayable, isPlayableHere, playbackUrl } from '../playableChannels.ts';
import type { Channel } from '../../types.ts';

const ch = (url: string): Channel => ({ name: url, country: 'CD', group: 'Afrique', logo: '', url });
const KIN = 'http://51.254.199.122:8080/kin24/index.m3u8';

describe('isPlayableHere', () => {
  it('https : lisible partout', () => {
    expect(isPlayableHere('https://x/a.m3u8', false, false)).toBe(true);
    expect(isPlayableHere('https://x/a.m3u8', true, false)).toBe(true);
  });
  it('http sans relais : seulement dans l’application Android', () => {
    expect(isPlayableHere(KIN, false, false)).toBe(false);
    expect(isPlayableHere('HTTP://x/a.m3u8', false, false)).toBe(false);
    expect(isPlayableHere(KIN, true, false)).toBe(true);
  });
  it('http avec relais : lisible aussi sur le web', () => {
    expect(isPlayableHere(KIN, false, true)).toBe(true);
  });
});

describe('filterPlayable', () => {
  const list = [ch('https://a/1.m3u8'), ch('http://b/2.m3u8'), ch('https://c/3.m3u8')];
  it('sans relais, retire les flux http sur le web', () => {
    expect(filterPlayable(list, false, false).map((c) => c.url)).toEqual(['https://a/1.m3u8', 'https://c/3.m3u8']);
  });
  it('avec relais ou dans l’application, garde tout', () => {
    expect(filterPlayable(list, false, true)).toHaveLength(3);
    expect(filterPlayable(list, true, false)).toHaveLength(3);
  });
});

describe('playbackUrl', () => {
  it('web : un flux http passe par le relais', () => {
    expect(playbackUrl(KIN, false, true)).toBe(`/api/relay?u=${encodeURIComponent(KIN)}`);
  });
  it('https, application Android ou relais coupé : adresse inchangée', () => {
    expect(playbackUrl('https://x/a.m3u8', false, true)).toBe('https://x/a.m3u8');
    expect(playbackUrl(KIN, true, true)).toBe(KIN);
    expect(playbackUrl(KIN, false, false)).toBe(KIN);
  });
});
