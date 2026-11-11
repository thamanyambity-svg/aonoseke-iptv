import { describe, it, expect } from 'vitest';
import { validatePlaylist } from '../types.ts';

describe('validatePlaylist — adresses de secours', () => {
  const base = { name: 'Kin24', url: 'https://a/1.m3u8' };
  it('conserve les secours valides', () => {
    expect(validatePlaylist([{ ...base, backups: ['https://b/2.m3u8'] }])[0]!.backups).toEqual(['https://b/2.m3u8']);
  });
  it('ignore les valeurs qui ne sont pas des adresses', () => {
    expect(validatePlaylist([{ ...base, backups: ['https://b/2.m3u8', 3, null, ''] }])[0]!.backups).toEqual(['https://b/2.m3u8']);
  });
  it('sans secours : undefined', () => {
    expect(validatePlaylist([base])[0]!.backups).toBeUndefined();
    expect(validatePlaylist([{ ...base, backups: 'x' }])[0]!.backups).toBeUndefined();
  });
});
