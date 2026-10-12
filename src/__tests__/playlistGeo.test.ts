import { describe, it, expect } from 'vitest';
import { validatePlaylist } from '../types.ts';

const base = { name: 'Chaîne', url: 'https://exemple.com/a.m3u8' };

describe('validatePlaylist — chaînes bloquées par pays', () => {
  it('conserve geoBlocked et sa raison', () => {
    const [ch] = validatePlaylist([{ ...base, geoBlocked: true, geoReason: 'HTTP 403 (accès refusé)' }]);
    expect(ch?.geoBlocked).toBe(true);
    expect(ch?.geoReason).toBe('HTTP 403 (accès refusé)');
  });
  it('ignore un marqueur invalide ou absent', () => {
    const [a, b] = validatePlaylist([{ ...base, geoBlocked: 'oui', geoReason: 'x' }, base]);
    expect(a?.geoBlocked).toBeUndefined();
    expect(a?.geoReason).toBeUndefined();
    expect(b?.geoBlocked).toBeUndefined();
  });
});
