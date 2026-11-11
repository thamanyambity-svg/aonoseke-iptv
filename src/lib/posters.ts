/**
 * Affiches pour le fond cinématique de l'empty-state.
 *
 * Source DYNAMIQUE : API TMDB (tendances films + séries de la semaine) si
 * `VITE_TMDB_API_KEY` est défini. Sinon → tableau vide (le composant bascule
 * sur un repli de genres local, jamais d'image cassée).
 *
 * NB : ce projet est Vite + React (pas Next.js) → pas de `next/image`.
 * L'optimisation passe par le `<img>` natif (loading / srcSet / sizes /
 * résolution w342) côté CinematicBg.tsx.
 *
 * @module posters
 */

export interface Poster {
  /** URL de rendu par défaut (w342 — léger, pas l'original 4K). */
  url: string;
  /** Jeu de résolutions pour laisser le navigateur choisir selon le DPR. */
  srcSet: string;
  /** Titre et année (seulement avec une clé TMDB : les affiches de secours n'en ont pas). */
  title?: string | undefined;
  year?: string | undefined;
  kind?: 'movie' | 'tv' | undefined;
}

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const img = (size: string, path: string): string => `https://image.tmdb.org/t/p/${size}${path}`;

function toPoster(path: string, meta?: Pick<Poster, 'title' | 'year' | 'kind'>): Poster {
  return {
    url: img('w342', path),
    srcSet: `${img('w185', path)} 185w, ${img('w342', path)} 342w, ${img('w500', path)} 500w`,
    ...(meta?.title ? { title: meta.title } : {}),
    ...(meta?.year ? { year: meta.year } : {}),
    ...(meta?.kind ? { kind: meta.kind } : {}),
  };
}

/**
 * Jeu de secours : vrais posters TMDB (films populaires) servis par le CDN
 * `image.tmdb.org` SANS clé. Garantit de vraies affiches même sans
 * `VITE_TMDB_API_KEY` (l'API ne sert qu'à rafraîchir dynamiquement la liste).
 */
const FALLBACK_PATHS: string[] = [
  '/bRwnj8WEKBCvmfeUNOukJPwB43K.jpg', '/zm0KAbOjlt9eR5y7vDiL2dEOwMl.jpg',
  '/hwRdDFIhaEmpRgoki805YvyyjZf.jpg', '/oIQmtByV1LtEQSwM4EpdLTyoSlM.jpg',
  '/gV0J0Fqw2mYMtQbzb0ruxv9MAeZ.jpg', '/ArIS4vwUxdhm3j7tsTHmffdfU8W.jpg',
  '/rMgG7cWuq9O6zhhLs2CbqIKVA8V.jpg', '/ky3KDMdvaeApRVL03kpfYHXzXqd.jpg',
  '/pxG26JdyuiDvJbSoucknaFiLeZD.jpg', '/7wIBfBl2gejt6xHxNSK0reVIm7E.jpg',
  '/kJAJNNBYlbqAcpTDxBNnaILSMTy.jpg', '/3o5YPjDGDTcTDL5ftDA9NwN9dLd.jpg',
  '/4TpBhdaSl5ALHbgeaYOLF8Q3haz.jpg', '/eJGWx219ZcEMVQJhAgMiqo8tYY.jpg',
  '/5Vi8dSauVwH1HOsiZceDMbRr1Ca.jpg', '/nLxu237EJAisFCYKK48hN9Plobx.jpg',
  '/alf3JOPP7EYP0iO24gwe5YfRnqo.jpg', '/vmlJvz6qVzYgei2V74GvnmcuQfW.jpg',
  '/nEuEMJrnLBneE9tJlmzbhCFLu95.jpg', '/zP19YO60jwEsfKd5Qf1UvA5uJu8.jpg',
];

interface TrendItem { path: string; title?: string | undefined; year?: string | undefined; kind: 'movie' | 'tv' }

async function trending(kind: 'movie' | 'tv'): Promise<TrendItem[]> {
  const res = await fetch(
    `https://api.themoviedb.org/3/trending/${kind}/week?api_key=${TMDB_KEY}&language=fr-FR`,
  );
  if (!res.ok) throw new Error(`TMDB ${kind} ${res.status}`);
  const data = (await res.json()) as {
    results?: Array<{ poster_path?: string | null; title?: string; name?: string; release_date?: string; first_air_date?: string }>;
  };
  const items: TrendItem[] = [];
  for (const r of data.results ?? []) {
    if (typeof r.poster_path !== 'string' || !r.poster_path) continue;
    const title = r.title ?? r.name;
    const year = (r.release_date ?? r.first_air_date ?? '').slice(0, 4);
    items.push({ path: r.poster_path, title, year: year || undefined, kind });
  }
  return items;
}

/**
 * Récupère 20–30 affiches réelles (films + séries/docs entrelacés).
 * Renvoie `[]` si pas de clé TMDB ou en cas d'échec réseau (jamais d'exception).
 */
async function loadPosters(): Promise<Poster[]> {
  if (!TMDB_KEY) return FALLBACK_PATHS.map((p) => toPoster(p));
  try {
    const [movies, tv] = await Promise.all([trending('movie'), trending('tv')]);
    // Entrelace films / séries pour varier, plafonne à 30.
    const items: TrendItem[] = [];
    const max = Math.max(movies.length, tv.length);
    for (let i = 0; i < max && items.length < 30; i++) {
      const m = movies[i];
      const t = tv[i];
      if (m) items.push(m);
      if (t) items.push(t);
    }
    return items.length >= 6
      ? items.map((it) => toPoster(it.path, { title: it.title, year: it.year, kind: it.kind }))
      : FALLBACK_PATHS.map((p) => toPoster(p));
  } catch {
    return FALLBACK_PATHS.map((p) => toPoster(p));
  }
}

let cache: Promise<Poster[]> | null = null;

/** Un seul appel TMDB par chargement de page, partagé entre le fond de la bannière et la rangée « À l'affiche ». */
export function fetchPosters(): Promise<Poster[]> {
  cache ??= loadPosters();
  return cache;
}

/**
 * Découpe un tableau en `rows` sous-tableaux par round-robin
 * (élément i → ligne i % rows) → évite que deux affiches identiques se
 * retrouvent côte à côte sur la même ligne.
 */
export function splitRows<T>(items: T[], rows: number): T[][] {
  const out: T[][] = Array.from({ length: rows }, () => []);
  items.forEach((it, i) => out[i % rows]?.push(it));
  return out;
}
