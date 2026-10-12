import { describe, it, expect } from 'vitest';
import { filterPlayable, isPlayableHere } from '../playableChannels.ts';
import type { Channel } from '../../types.ts';

const ch = (url: string): Channel => ({ name: url, country: 'CD', group: 'Afrique', logo: '', url });

describe('isPlayableHere', () => {
  it('https : lisible partout', () => {
    expect(isPlayableHere('https://x/a.m3u8', false)).toBe(true);
    expect(isPlayableHere('https://x/a.m3u8', true)).toBe(true);
  });
  it('http : seulement dans l’application Android', () => {
    expect(isPlayableHere('http://51.254.199.122:8080/kin24/index.m3u8', false)).toBe(false);
    expect(isPlayableHere('HTTP://x/a.m3u8', false)).toBe(false);
    expect(isPlayableHere('http://51.254.199.122:8080/kin24/index.m3u8', true)).toBe(true);
  });
});

describe('filterPlayable', () => {
  const list = [ch('https://a/1.m3u8'), ch('http://b/2.m3u8'), ch('https://c/3.m3u8')];
  it('sur le web, retire les flux http', () => {
    expect(filterPlayable(list, false).map((c) => c.url)).toEqual(['https://a/1.m3u8', 'https://c/3.m3u8']);
  });
  it('dans l’application, garde tout', () => {
    expect(filterPlayable(list, true)).toHaveLength(3);
  });
});
