import { describe, it, expect } from 'vitest';
import { decideWithBackups, MAX_BACKUPS } from '../../../scripts/lib/channel-state.mjs';

const NOW = '2026-11-11T00:00:00.000Z';
const ch = { name: 'Kin24', url: 'https://a/1.m3u8', country: 'CD', group: 'Afrique', backups: ['https://b/2.m3u8', 'https://c/3.m3u8'] };
const ok = { status: 'ok' as const, reason: 'lecture vérifiée' };
const geo = { status: 'geo' as const, reason: 'HTTP 403' };
const gone = { status: 'dead' as const, reason: 'HTTP 404', retryable: false };
const slow = { status: 'dead' as const, reason: 'délai dépassé', retryable: true };

describe('decideWithBackups', () => {
  it('principale OK : inchangée, secours gardées', () => {
    const r = decideWithBackups(ch, [
      { url: 'https://a/1.m3u8', result: ok }, { url: 'https://b/2.m3u8', result: ok }, { url: 'https://c/3.m3u8', result: ok },
    ], NOW);
    expect(r.bucket).toBe('ok');
    expect(r.entry).toMatchObject({ url: 'https://a/1.m3u8', backups: ['https://b/2.m3u8', 'https://c/3.m3u8'], verified: true });
  });

  it('principale morte, une secours marche : la secours est promue, la chaîne survit', () => {
    const r = decideWithBackups(ch, [
      { url: 'https://a/1.m3u8', result: gone }, { url: 'https://b/2.m3u8', result: ok }, { url: 'https://c/3.m3u8', result: gone },
    ], NOW);
    expect(r.bucket).toBe('ok');
    expect(r.entry).toMatchObject({ url: 'https://b/2.m3u8', verified: true });
    // l'ancienne principale et la secours mortes de façon définitive sont retirées
    expect(r.entry).not.toHaveProperty('backups');
  });

  it('une panne passagère de l’ancienne principale la garde en secours', () => {
    const r = decideWithBackups(ch, [
      { url: 'https://a/1.m3u8', result: slow }, { url: 'https://b/2.m3u8', result: ok }, { url: 'https://c/3.m3u8', result: gone },
    ], NOW);
    expect(r.entry).toMatchObject({ url: 'https://b/2.m3u8', backups: ['https://a/1.m3u8'] });
  });

  it('une adresse lisible passe avant une adresse bloquée par pays', () => {
    const r = decideWithBackups(ch, [
      { url: 'https://a/1.m3u8', result: geo }, { url: 'https://b/2.m3u8', result: ok }, { url: 'https://c/3.m3u8', result: geo },
    ], NOW);
    expect(r.bucket).toBe('ok');
    expect(r.entry).toMatchObject({ url: 'https://b/2.m3u8' });
  });

  it('principale bloquée par pays, aucune autre lisible : reste bloquée par pays', () => {
    const r = decideWithBackups(ch, [
      { url: 'https://a/1.m3u8', result: geo }, { url: 'https://b/2.m3u8', result: gone }, { url: 'https://c/3.m3u8', result: gone },
    ], NOW);
    expect(r.bucket).toBe('geo');
    expect(r.entry).toMatchObject({ url: 'https://a/1.m3u8', geoBlocked: true });
  });

  it('rien ne marche (panne passagère) : règle des deux échecs, secours conservées', () => {
    const first = decideWithBackups(ch, [
      { url: 'https://a/1.m3u8', result: slow }, { url: 'https://b/2.m3u8', result: slow }, { url: 'https://c/3.m3u8', result: gone },
    ], NOW);
    expect(first.bucket).toBe('pending');
    expect(first.entry).toMatchObject({ failedChecks: 1, backups: ['https://b/2.m3u8'] });
    const second = decideWithBackups(first.entry!, [
      { url: 'https://a/1.m3u8', result: slow }, { url: 'https://b/2.m3u8', result: slow },
    ], NOW);
    expect(second.bucket).toBe('dead');
    expect(second.entry).toBeNull();
  });

  it('rien ne marche, échec définitif de la principale : retirée', () => {
    const r = decideWithBackups({ ...ch, backups: undefined }, [{ url: 'https://a/1.m3u8', result: gone }], NOW);
    expect(r.bucket).toBe('dead');
  });

  it('chaîne sans secours : se comporte comme decideChannel', () => {
    const solo = { name: 'X', url: 'https://x/1.m3u8', country: 'FR', group: 'France' };
    expect(decideWithBackups(solo, [{ url: solo.url, result: ok }], NOW).entry).not.toHaveProperty('backups');
  });

  it(`jamais plus de ${MAX_BACKUPS} secours`, () => {
    const many = { ...ch, backups: ['https://b/1', 'https://b/2', 'https://b/3', 'https://b/4', 'https://b/5'] };
    const r = decideWithBackups(many, [{ url: many.url, result: ok }, ...many.backups.map((url) => ({ url, result: ok }))], NOW);
    expect((r.entry as { backups: string[] }).backups).toHaveLength(MAX_BACKUPS);
  });

  it('ne modifie pas la chaîne d’origine', () => {
    const copy = JSON.stringify(ch);
    decideWithBackups(ch, [{ url: ch.url, result: gone }, { url: ch.backups[0]!, result: ok }], NOW);
    expect(JSON.stringify(ch)).toBe(copy);
  });
});
