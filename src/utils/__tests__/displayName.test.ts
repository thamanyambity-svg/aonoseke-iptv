import { describe, it, expect } from 'vitest';
import { displayName, monogram } from '../displayName';

describe('displayName', () => {
  it('sort la qualité du titre', () => {
    expect(displayName('REFLET TV (1080p)')).toEqual({ title: 'REFLET TV', quality: '1080p' });
    expect(displayName('Brionnais TV (720p)')).toEqual({ title: 'Brionnais TV', quality: '720p' });
    expect(displayName('Chaîne [HD]')).toEqual({ title: 'Chaîne', quality: 'HD' });
  });
  it('retire les mentions parasites et garde les noms sans qualité intacts', () => {
    expect(displayName('Ma Chaîne (Geo-blocked)')).toEqual({ title: 'Ma Chaîne', quality: null });
    expect(displayName('Gospel Channel')).toEqual({ title: 'Gospel Channel', quality: null });
  });
  it('ne renvoie jamais un titre vide', () => {
    expect(displayName('(1080p)').title).not.toBe('');
  });
});

describe('monogram', () => {
  it('prend les initiales de deux mots, sinon deux lettres', () => {
    expect(monogram('Gospel Channel')).toBe('GC');
    expect(monogram('Espoir Tv')).toBe('ET');
    expect(monogram('Numerica')).toBe('NU');
    expect(monogram('REFLET TV (1080p)')).toBe('RT');
  });
});
