import { describe, it, expect } from 'vitest';
import { quarantineAdd, quarantineStep, RESTORE_AFTER_OK, QUARANTINE_MAX_DAYS } from '../../../scripts/lib/quarantine.mjs';

const T0 = '2026-11-01T00:00:00.000Z';
const ch = { name: 'Kin24', url: 'https://a/1.m3u8', country: 'CD', group: 'Afrique', verified: true, failedChecks: 1, verifiedAt: T0 };
const results = (status: 'ok' | 'geo' | 'dead', url = ch.url) => new Map([[url, { status, reason: status === 'dead' ? 'HTTP 404' : 'ok' }]]);
const day = (n: number) => new Date(Date.parse(T0) + n * 86_400_000).toISOString();

describe('quarantaine', () => {
  it('met une chaîne retirée de côté, sans ses marqueurs de statut', () => {
    const q = quarantineAdd([], ch, 'HTTP 404', T0);
    expect(q).toHaveLength(1);
    expect(q[0]).toMatchObject({ reason: 'HTTP 404', since: T0, okRuns: 0 });
    expect(q[0]!.channel).not.toHaveProperty('verified');
    expect(q[0]!.channel).not.toHaveProperty('failedChecks');
  });

  it('ne met pas deux fois la même adresse', () => {
    const once = quarantineAdd([], ch, 'HTTP 404', T0);
    expect(quarantineAdd(once, ch, 'HTTP 404', day(1))).toHaveLength(1);
  });

  it(`remet la chaîne dans la playlist après ${RESTORE_AFTER_OK} succès de suite`, () => {
    const q = quarantineAdd([], ch, 'HTTP 404', T0);
    let step = quarantineStep(q, results('ok'), day(1));
    expect(step.restored).toHaveLength(0);
    expect(step.quarantine[0]!.okRuns).toBe(1);
    step = quarantineStep(step.quarantine, results('ok'), day(2));
    expect(step.restored).toHaveLength(1);
    expect(step.restored[0]).toMatchObject({ name: 'Kin24', verified: true });
    expect(step.quarantine).toHaveLength(0);
  });

  it('un échec entre deux succès remet la série à zéro', () => {
    let step = quarantineStep(quarantineAdd([], ch, 'x', T0), results('ok'), day(1));
    step = quarantineStep(step.quarantine, results('dead'), day(2));
    expect(step.quarantine[0]!.okRuns).toBe(0);
    step = quarantineStep(step.quarantine, results('ok'), day(3));
    expect(step.restored).toHaveLength(0);
  });

  it('une chaîne bloquée par pays qui répond est restaurée, signalée', () => {
    let step = quarantineStep(quarantineAdd([], ch, 'x', T0), results('geo'), day(1));
    step = quarantineStep(step.quarantine, results('geo'), day(2));
    expect(step.restored[0]).toMatchObject({ geoBlocked: true });
    expect(step.restored[0]).not.toHaveProperty('verified');
  });

  it(`abandonne après ${QUARANTINE_MAX_DAYS} jours sans jamais répondre`, () => {
    const q = quarantineAdd([], ch, 'x', T0);
    expect(quarantineStep(q, results('dead'), day(QUARANTINE_MAX_DAYS - 1)).quarantine).toHaveLength(1);
    const late = quarantineStep(q, results('dead'), day(QUARANTINE_MAX_DAYS + 1));
    expect(late.quarantine).toHaveLength(0);
    expect(late.abandoned).toBe(1);
  });

  it('une adresse non testée reste en quarantaine', () => {
    const q = quarantineAdd([], ch, 'x', T0);
    expect(quarantineStep(q, new Map(), day(1)).quarantine).toHaveLength(1);
  });
});
