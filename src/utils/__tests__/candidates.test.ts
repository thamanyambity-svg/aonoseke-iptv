import { describe, it, expect } from 'vitest';
import { mergeCandidates } from '../../../scripts/lib/candidates.mjs';

const NOW = '2026-11-11T00:00:00.000Z';
const base = [{ name: 'Kin24', country: 'CD', group: 'Afrique', logo: '', url: 'https://a/1.m3u8' }];
const cand = (over: Record<string, unknown>) => ({
  name: 'Bero TV', url: 'https://b/2.m3u8', country: 'CD', group: 'Afrique', status: 'ok' as const, ...over,
});

describe('mergeCandidates', () => {
  it('ajoute une chaîne lisible, vérifiée', () => {
    const { added, playlist } = mergeCandidates(base, [cand({})], NOW);
    expect(playlist).toHaveLength(2);
    expect(added[0]).toMatchObject({ name: 'Bero TV', verified: true, verifiedAt: NOW });
    expect(added[0]).not.toHaveProperty('geoBlocked');
  });
  it('signale une chaîne bloquée par pays', () => {
    const { added } = mergeCandidates(base, [cand({ status: 'geo', reason: 'HTTP 403' })], NOW);
    expect(added[0]).toMatchObject({ geoBlocked: true, geoReason: 'HTTP 403' });
    expect(added[0]).not.toHaveProperty('verified');
  });
  it('ignore les chaînes mortes', () => {
    const r = mergeCandidates(base, [cand({ status: 'dead' })], NOW);
    expect(r.added).toHaveLength(0);
    expect(r.skipped.dead).toBe(1);
  });
  it('ignore une adresse ou un nom déjà présents (même pays)', () => {
    const r = mergeCandidates(base, [cand({ url: 'https://a/1.m3u8' }), cand({ name: 'KIN 24 (720p)', url: 'https://c/3.m3u8' })], NOW);
    expect(r.added).toHaveLength(0);
    expect(r.skipped.known).toBe(2);
  });
  it('accepte le même nom dans un autre pays', () => {
    const r = mergeCandidates(base, [cand({ name: 'Kin24', country: 'FR', url: 'https://d/4.m3u8' })], NOW);
    expect(r.added).toHaveLength(1);
  });
  it('ne crée pas de doublon entre deux candidats', () => {
    const r = mergeCandidates(base, [cand({}), cand({})], NOW);
    expect(r.added).toHaveLength(1);
  });
  it('ne modifie pas la playlist d’origine', () => {
    const copy = JSON.stringify(base);
    mergeCandidates(base, [cand({})], NOW);
    expect(JSON.stringify(base)).toBe(copy);
  });
});
