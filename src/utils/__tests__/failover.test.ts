import { describe, it, expect } from 'vitest';
import { sourceChain, nextSource, MAX_SOURCES } from '../failover.ts';

describe('sourceChain', () => {
  it('principale d’abord, puis les secours dans l’ordre', () => {
    expect(sourceChain('a', ['b', 'c'])).toEqual(['a', 'b', 'c']);
  });
  it('ignore les vides et les doublons', () => {
    expect(sourceChain('a', ['', 'a', 'b', 'b'])).toEqual(['a', 'b']);
  });
  it('sans secours : la principale seule', () => {
    expect(sourceChain('a')).toEqual(['a']);
  });
  it('sans adresse : liste vide', () => {
    expect(sourceChain('')).toEqual([]);
  });
  it(`plafonne à ${MAX_SOURCES} adresses`, () => {
    expect(sourceChain('a', ['b', 'c', 'd', 'e', 'f'])).toHaveLength(MAX_SOURCES);
  });
});

describe('nextSource', () => {
  it('avance tant qu’il reste des adresses', () => {
    expect(nextSource(['a', 'b', 'c'], 0)).toBe(1);
    expect(nextSource(['a', 'b', 'c'], 1)).toBe(2);
  });
  it('renvoie null après la dernière', () => {
    expect(nextSource(['a', 'b'], 1)).toBeNull();
    expect(nextSource(['a'], 0)).toBeNull();
    expect(nextSource([], 0)).toBeNull();
  });
});
