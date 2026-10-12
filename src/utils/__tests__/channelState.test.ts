import { describe, it, expect } from 'vitest';
import { decideChannel, MAX_FAILED_CHECKS } from '../../../scripts/lib/channel-state.mjs';

const NOW = '2026-10-12T18:00:00.000Z';
const ch = { name: 'Chaîne', url: 'https://x/a.m3u8', country: 'CD', group: 'Afrique' };

describe('decideChannel — règle des deux échecs', () => {
  it('ok : gardée, vérifiée, compteurs remis à zéro', () => {
    const { bucket, entry } = decideChannel(
      { ...ch, failedChecks: 1, lastFailReason: 'HTTP 503', geoBlocked: true, geoReason: 'HTTP 403' },
      { status: 'ok', reason: 'HLS valide' },
      NOW,
    );
    expect(bucket).toBe('ok');
    expect(entry).toMatchObject({ verified: true, verifiedAt: NOW });
    expect(entry).not.toHaveProperty('failedChecks');
    expect(entry).not.toHaveProperty('geoBlocked');
  });

  it('bloquée par pays : gardée et signalée, compteur remis à zéro', () => {
    const { bucket, entry } = decideChannel({ ...ch, failedChecks: 1 }, { status: 'geo', reason: 'HTTP 403 (accès refusé)' }, NOW);
    expect(bucket).toBe('geo');
    expect(entry).toMatchObject({ geoBlocked: true, geoReason: 'HTTP 403 (accès refusé)' });
    expect(entry).not.toHaveProperty('failedChecks');
    expect(entry).not.toHaveProperty('verified');
  });

  it('premier échec : gardée (statut précédent conservé), échec noté', () => {
    const { bucket, entry } = decideChannel({ ...ch, verified: true }, { status: 'dead', reason: 'délai dépassé' }, NOW);
    expect(bucket).toBe('pending');
    expect(entry).toMatchObject({ verified: true, failedChecks: 1, lastFailReason: 'délai dépassé', lastFailAt: NOW });
  });

  it('deuxième échec de suite : retirée', () => {
    const { bucket, entry } = decideChannel({ ...ch, failedChecks: 1 }, { status: 'dead', reason: 'HTTP 404' }, NOW);
    expect(bucket).toBe('dead');
    expect(entry).toBeNull();
  });

  it('un succès entre deux échecs remet le compteur à zéro', () => {
    const first = decideChannel(ch, { status: 'dead', reason: 'HTTP 503' }, NOW).entry!;
    const ok = decideChannel(first, { status: 'ok', reason: 'HLS valide' }, NOW).entry!;
    const again = decideChannel(ok, { status: 'dead', reason: 'HTTP 503' }, NOW);
    expect(again.bucket).toBe('pending');
  });

  it('échec définitif (retryable false) : retirée tout de suite, sans attendre un 2e échec', () => {
    const { bucket, entry } = decideChannel(ch, { status: 'dead', reason: 'protégé par DRM', retryable: false }, NOW);
    expect(bucket).toBe('dead');
    expect(entry).toBeNull();
  });

  it('échec passager (retryable true) : règle des deux échecs', () => {
    const first = decideChannel(ch, { status: 'dead', reason: 'délai dépassé', retryable: true }, NOW);
    expect(first.bucket).toBe('pending');
    const second = decideChannel(first.entry!, { status: 'dead', reason: 'délai dépassé', retryable: true }, NOW);
    expect(second.bucket).toBe('dead');
  });

  it('le seuil est de deux vérifications', () => {
    expect(MAX_FAILED_CHECKS).toBe(2);
  });
});
