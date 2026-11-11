import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const item = (i: number, kind: 'movie' | 'tv') =>
  kind === 'movie'
    ? { poster_path: `/m${i}.jpg`, title: `Film ${i}`, release_date: `2026-0${(i % 9) + 1}-01` }
    : { poster_path: `/t${i}.jpg`, name: `Série ${i}`, first_air_date: `2025-0${(i % 9) + 1}-01` };
const list = (n: number, kind: 'movie' | 'tv') => ({ results: Array.from({ length: n }, (_, i) => item(i + 1, kind)) });

describe('fetchPosters', () => {
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it('sans clé TMDB : 20 affiches de secours, sans titre, et aucun appel réseau', async () => {
    vi.stubEnv('VITE_TMDB_API_KEY', '');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const { fetchPosters } = await import('../posters');
    const posters = await fetchPosters();
    expect(posters).toHaveLength(20);
    expect(posters.every((p) => p.url.startsWith('https://image.tmdb.org/t/p/w342/'))).toBe(true);
    expect(posters.some((p) => p.title)).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('avec une clé : entrelace films et séries, avec titre, année et type', async () => {
    vi.stubEnv('VITE_TMDB_API_KEY', 'cle-de-test');
    vi.stubGlobal('fetch', vi.fn((url: string) => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(url.includes('/trending/movie/') ? list(5, 'movie') : list(5, 'tv')),
    })));
    const { fetchPosters } = await import('../posters');
    const posters = await fetchPosters();
    expect(posters).toHaveLength(10);
    expect(posters[0]).toMatchObject({ title: 'Film 1', kind: 'movie', year: '2026' });
    expect(posters[1]).toMatchObject({ title: 'Série 1', kind: 'tv', year: '2025' });
    expect(posters[0]?.url).toBe('https://image.tmdb.org/t/p/w342/m1.jpg');
  });

  it('ignore les résultats sans affiche', async () => {
    vi.stubEnv('VITE_TMDB_API_KEY', 'k');
    const withHoles = { results: [{ poster_path: null, title: 'Sans affiche' }, ...list(8, 'movie').results] };
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(withHoles) })));
    const { fetchPosters } = await import('../posters');
    const posters = await fetchPosters();
    expect(posters.some((p) => p.title === 'Sans affiche')).toBe(false);
  });

  it('retombe sur les affiches de secours si TMDB échoue ou renvoie trop peu de résultats', async () => {
    vi.stubEnv('VITE_TMDB_API_KEY', 'k');
    vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('réseau'))));
    let mod = await import('../posters');
    expect(await mod.fetchPosters()).toHaveLength(20);

    vi.resetModules();
    vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(list(2, 'movie')) })));
    mod = await import('../posters');
    expect(await mod.fetchPosters()).toHaveLength(20);
  });

  it('ne fait qu’un seul appel pour plusieurs demandes (partagé entre la bannière et la rangée)', async () => {
    vi.stubEnv('VITE_TMDB_API_KEY', 'k');
    const fetchMock = vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve(list(8, 'movie')) }));
    vi.stubGlobal('fetch', fetchMock);
    const { fetchPosters } = await import('../posters');
    await Promise.all([fetchPosters(), fetchPosters(), fetchPosters()]);
    expect(fetchMock).toHaveBeenCalledTimes(2); // films + séries, une seule fois
  });
});
