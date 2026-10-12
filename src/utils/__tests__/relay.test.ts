import { describe, it, expect } from 'vitest';
import { allowedOriginsFrom, parseTarget, rewriteManifest, isManifest } from '../../../api/_relay-lib.js';

const playlist = [
  { url: 'http://51.254.199.122:8080/kin24/index.m3u8' },
  { url: 'https://secure.example/live.m3u8' },
  { url: 'http://cdn.example:1935/live/x/playlist.m3u8' },
  { url: 'pas une url' },
  {},
];
const allowed = allowedOriginsFrom(playlist);

describe('allowedOriginsFrom', () => {
  it('ne garde que les origines http de la playlist (avec le port)', () => {
    expect([...allowed].sort()).toEqual(['http://51.254.199.122:8080', 'http://cdn.example:1935']);
  });
  it('tolère une playlist invalide', () => {
    expect(allowedOriginsFrom(null).size).toBe(0);
  });
});

describe('parseTarget : pas de relais ouvert', () => {
  it('accepte un flux de la playlist', () => {
    expect(parseTarget('http://51.254.199.122:8080/kin24/seg1.ts', allowed)?.pathname).toBe('/kin24/seg1.ts');
  });
  it.each([
    ['hôte hors playlist', 'http://evil.example/a.m3u8'],
    ['autre port du même hôte', 'http://51.254.199.122:22/a'],
    ['réseau interne', 'http://169.254.169.254/latest/meta-data'],
    ['localhost', 'http://localhost:8080/'],
    ['https', 'https://secure.example/live.m3u8'],
    ['identifiants dans l’adresse', 'http://user:pw@51.254.199.122:8080/a'],
    ['hôte déguisé', 'http://51.254.199.122:8080@evil.example/a'],
    ['schéma file', 'file:///etc/passwd'],
    ['vide', ''],
  ])('refuse : %s', (_label, url) => {
    expect(parseTarget(url, allowed)).toBeNull();
  });
  it('refuse une valeur absente ou trop longue', () => {
    expect(parseTarget(undefined, allowed)).toBeNull();
    expect(parseTarget(`http://51.254.199.122:8080/${'a'.repeat(3000)}`, allowed)).toBeNull();
  });
});

describe('rewriteManifest', () => {
  const base = 'http://51.254.199.122:8080/kin24/index.m3u8';
  const enc = (u: string): string => `/api/relay?u=${encodeURIComponent(u)}`;
  it('réécrit segments relatifs et absolus, laisse les balises', () => {
    const out = rewriteManifest('#EXTM3U\n#EXT-X-TARGETDURATION:6\n#EXTINF:6,\nseg1.ts\n#EXTINF:6,\n/abs/seg2.ts\n', base);
    expect(out).toContain('#EXTM3U');
    expect(out).toContain('#EXT-X-TARGETDURATION:6');
    expect(out).toContain(enc('http://51.254.199.122:8080/kin24/seg1.ts'));
    expect(out).toContain(enc('http://51.254.199.122:8080/abs/seg2.ts'));
  });
  it('réécrit les URI="…" (clé, sous-titres, carte d’initialisation)', () => {
    const out = rewriteManifest('#EXT-X-KEY:METHOD=AES-128,URI="key.bin"\n#EXT-X-MAP:URI="init.mp4"\nv.m3u8', base);
    expect(out).toContain(`URI="${enc('http://51.254.199.122:8080/kin24/key.bin')}"`);
    expect(out).toContain(`URI="${enc('http://51.254.199.122:8080/kin24/init.mp4')}"`);
    expect(out).toContain(enc('http://51.254.199.122:8080/kin24/v.m3u8'));
  });
  it('garde les fins de ligne et les lignes vides', () => {
    expect(rewriteManifest('#EXTM3U\r\n\r\na.ts', base).split('\n')).toHaveLength(3);
  });
});

describe('isManifest', () => {
  it('reconnaît par type, extension ou contenu', () => {
    expect(isManifest('application/vnd.apple.mpegurl', 'http://x/a')).toBe(true);
    expect(isManifest('text/plain', 'http://x/a.m3u8?t=1')).toBe(true);
    expect(isManifest('text/plain', 'http://x/a', '\n#EXTM3U')).toBe(true);
    expect(isManifest('video/mp2t', 'http://x/a.ts', 'G')).toBe(false);
  });
});
