import { describe, it, expect } from 'vitest';
import { APP_ORIGIN, WEB_ORIGIN, corsAllows, deepCheckStream, looksLikeMedia } from '../../../scripts/lib/stream-deep.mjs';

const ts = (): Uint8Array => {
  const b = new Uint8Array(1024);
  b[0] = 0x47;
  b[188] = 0x47;
  b[376] = 0x47;
  return b;
};

type Route = { status?: number; body?: string | Uint8Array; cors?: 'all' | 'none' | 'web-only' };

/** Faux réseau : une table d'adresses → réponses ; l'en-tête CORS dépend de l'origine demandée. */
function fakeNet(routes: Record<string, Route>): typeof fetch {
  return (url: RequestInfo | URL, init?: RequestInit) => {
    const href = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    const r = routes[href];
    if (!r) return Promise.reject(Object.assign(new TypeError('fetch failed'), { cause: { code: 'ENOTFOUND' } }));
    const origin = (init?.headers as Record<string, string> | undefined)?.Origin ?? '';
    const headers: Record<string, string> = {};
    if (r.cors === 'all' || r.cors === undefined) headers['access-control-allow-origin'] = '*';
    else if (r.cors === 'web-only' && origin === WEB_ORIGIN) headers['access-control-allow-origin'] = origin;
    const res = new Response(r.body ?? '', { status: r.status ?? 200, headers });
    Object.defineProperty(res, 'url', { value: href });
    return Promise.resolve(res);
  };
}

const MEDIA = '#EXTM3U\n#EXT-X-VERSION:3\n#EXT-X-TARGETDURATION:6\n#EXTINF:6.0,\nseg1.ts\n#EXTINF:6.0,\nseg2.ts\n';
const base = 'https://cdn.exemple.com/live';

describe('deepCheckStream', () => {
  it('flux sain (liste maître → variante → segment TS → CORS) → ok', async () => {
    const f = fakeNet({
      [`${base}/master.m3u8`]: { body: '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=800000\nmedia.m3u8\n' },
      [`${base}/media.m3u8`]: { body: MEDIA },
      [`${base}/seg1.ts`]: { body: ts(), status: 206 },
    });
    const r = await deepCheckStream(`${base}/master.m3u8`, { fetchImpl: f });
    expect(r).toMatchObject({ status: 'ok', retryable: false, cors: { web: true, app: true } });
  });

  it('pas de CORS → morte (illisible dans le navigateur)', async () => {
    const f = fakeNet({
      [`${base}/media.m3u8`]: { body: MEDIA, cors: 'none' },
      [`${base}/seg1.ts`]: { body: ts(), cors: 'none' },
    });
    const r = await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: f });
    expect(r.status).toBe('dead');
    expect(r.reason).toMatch(/CORS/);
  });

  it('CORS accordé seulement au site web → morte pour l’appli Android', async () => {
    const f = fakeNet({
      [`${base}/media.m3u8`]: { body: MEDIA, cors: 'web-only' },
      [`${base}/seg1.ts`]: { body: ts(), cors: 'web-only' },
    });
    const r = await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: f });
    expect(r.status).toBe('dead');
    expect(r.reason).toMatch(/Android/);
    expect(r.cors).toEqual({ web: true, app: false });
  });

  it('protégé par DRM → morte', async () => {
    const drm = '#EXTM3U\n#EXT-X-KEY:METHOD=SAMPLE-AES,URI="skd://x",KEYFORMAT="com.apple.streamingkeydelivery"\n#EXTINF:6.0,\nseg1.ts\n';
    const f = fakeNet({ [`${base}/media.m3u8`]: { body: drm } });
    const r = await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: f });
    expect(r).toMatchObject({ status: 'dead' });
    expect(r.reason).toMatch(/DRM/);
  });

  it('flux terminé (ENDLIST) → morte', async () => {
    const f = fakeNet({ [`${base}/media.m3u8`]: { body: `${MEDIA}#EXT-X-ENDLIST\n` } });
    expect((await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: f })).reason).toMatch(/terminé/);
  });

  it('segment refusé (403) → bloquée par pays ; segment introuvable (404) → morte', async () => {
    const geo = fakeNet({ [`${base}/media.m3u8`]: { body: MEDIA }, [`${base}/seg1.ts`]: { status: 403 } });
    expect((await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: geo })).status).toBe('geo');
    const gone = fakeNet({ [`${base}/media.m3u8`]: { body: MEDIA }, [`${base}/seg1.ts`]: { status: 404 } });
    expect((await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: gone })).status).toBe('dead');
  });

  it('segment qui n’est pas de la vidéo → morte', async () => {
    const f = fakeNet({ [`${base}/media.m3u8`]: { body: MEDIA }, [`${base}/seg1.ts`]: { body: '<html>erreur</html>' } });
    expect((await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: f })).reason).toMatch(/illisible/);
  });

  it('liste sans segment → morte', async () => {
    const f = fakeNet({ [`${base}/media.m3u8`]: { body: '#EXTM3U\n#EXT-X-TARGETDURATION:6\n' } });
    expect((await deepCheckStream(`${base}/media.m3u8`, { fetchImpl: f })).reason).toMatch(/aucun segment/);
  });

  it('panne réseau → morte mais « à réessayer » (pas une preuve)', async () => {
    const r = await deepCheckStream('https://introuvable.exemple/x.m3u8', { fetchImpl: fakeNet({}) });
    expect(r).toMatchObject({ status: 'dead', retryable: true, reason: 'domaine introuvable' });
  });
});

describe('outils', () => {
  it('corsAllows : * ou origine exacte', () => {
    expect(corsAllows('*', APP_ORIGIN)).toBe(true);
    expect(corsAllows(WEB_ORIGIN, WEB_ORIGIN)).toBe(true);
    expect(corsAllows('https://autre.com', WEB_ORIGIN)).toBe(false);
    expect(corsAllows(null, WEB_ORIGIN)).toBe(false);
  });
  it('looksLikeMedia : TS, fMP4, AAC ; pas du HTML', () => {
    expect(looksLikeMedia(ts())).toBe(true);
    expect(looksLikeMedia(new Uint8Array([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0, 0, 0, 0]))).toBe(true);
    expect(looksLikeMedia(new TextEncoder().encode('<html><body>'))).toBe(false);
  });
});
