import { describe, it, expect } from 'vitest';
import { checkStream, classifyError, classifyHttp } from '../../../scripts/lib/stream-status.mjs';

describe('classifyHttp', () => {
  it('HLS valide → ok', () => {
    expect(classifyHttp(200, '#EXTM3U\n#EXT-X-VERSION:3').status).toBe('ok');
    expect(classifyHttp(206, '#EXT-X-STREAM-INF').status).toBe('ok');
  });
  it('403 et 451 → bloquée par pays (gardée)', () => {
    expect(classifyHttp(403, '').status).toBe('geo');
    expect(classifyHttp(451, 'Unavailable For Legal Reasons').status).toBe('geo');
  });
  it('403 avec message de pays → geo et raison explicite', () => {
    const r = classifyHttp(403, 'The Amazon CloudFront distribution is configured to block access from your country.');
    expect(r.status).toBe('geo');
    expect(r.reason).toMatch(/message de blocage par pays/);
  });
  it('200 sans HLS : message pays → geo, sinon morte', () => {
    expect(classifyHttp(200, '<html>This video is not available in your country</html>').status).toBe('geo');
    expect(classifyHttp(200, '<html>Bienvenue</html>').status).toBe('dead');
  });
  it('404, 410, 5xx → morte', () => {
    for (const s of [404, 410, 500, 502, 503]) expect(classifyHttp(s, '').status).toBe('dead');
  });
  it('401 reste morte (ce n\'est pas un blocage géographique)', () => {
    expect(classifyHttp(401, '').status).toBe('dead');
  });
});

describe('classifyError', () => {
  it('erreurs réseau → morte, avec la cause', () => {
    expect(classifyError({ name: 'TimeoutError' }).reason).toBe('délai dépassé');
    expect(classifyError({ cause: { code: 'ENOTFOUND' } }).reason).toBe('domaine introuvable');
    expect(classifyError({ cause: { code: 'ECONNREFUSED' } }).reason).toBe('connexion refusée');
    expect(classifyError({ cause: { code: 'CERT_HAS_EXPIRED' } }).reason).toBe('certificat invalide');
    expect(classifyError(new Error('boom')).status).toBe('dead');
    expect(classifyError(undefined).status).toBe('dead');
  });
});

describe('checkStream', () => {
  const fakeFetch = (status: number, body: string): typeof fetch =>
    () => Promise.resolve(new Response(body, { status }));

  it('renvoie le statut et le code HTTP', async () => {
    expect(await checkStream('https://x', { fetchImpl: fakeFetch(200, '#EXTM3U') })).toMatchObject({ status: 'ok', code: 200 });
    expect(await checkStream('https://x', { fetchImpl: fakeFetch(403, 'Forbidden') })).toMatchObject({ status: 'geo', code: 403 });
    expect(await checkStream('https://x', { fetchImpl: fakeFetch(404, '') })).toMatchObject({ status: 'dead', code: 404 });
  });
  it('transforme une exception réseau en chaîne morte', async () => {
    const boom = (() => Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }))) as unknown as typeof fetch;
    expect(await checkStream('https://x', { fetchImpl: boom })).toMatchObject({ status: 'dead', reason: 'domaine introuvable' });
  });
});
