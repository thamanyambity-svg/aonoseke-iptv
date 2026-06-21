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
}

const TMDB_KEY = import.meta.env.VITE_TMDB_API_KEY as string | undefined;
const img = (size: string, path: string): string => `https://image.tmdb.org/t/p/${size}${path}`;

function toPoster(path: string): Poster {
  return {
    url: img('w342', path),
    srcSet: `${img('w185', path)} 185w, ${img('w342', path)} 342w, ${img('w500', path)} 500w`,
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

async function trending(kind: 'movie' | 'tv'): Promise<string[]> {
  const res = await fetch(
    `https://api.themoviedb.org/3/trending/${kind}/week?api_key=${TMDB_KEY}&language=fr-FR`,
  );
  if (!res.ok) throw new Error(`TMDB ${kind} ${res.status}`);
  const data = (await res.json()) as { results?: Array<{ poster_path?: string | null }> };
  return (data.results ?? [])
    .map((r) => r.poster_path)
    .filter((p): p is string => typeof p === 'string' && p.length > 0);
}

/**
 * Récupère 20–30 affiches réelles (films + séries/docs entrelacés).
 * Renvoie `[]` si pas de clé TMDB ou en cas d'échec réseau (jamais d'exception).
 */
export async function fetchPosters(): Promise<Poster[]> {
  if (!TMDB_KEY) return FALLBACK_PATHS.map(toPoster);
  try {
    const [movies, tv] = await Promise.all([trending('movie'), trending('tv')]);
    // Entrelace films / séries pour varier, plafonne à 30.
    const paths: string[] = [];
    const max = Math.max(movies.length, tv.length);
    for (let i = 0; i < max && paths.length < 30; i++) {
      if (movies[i]) paths.push(movies[i]);
      if (tv[i]) paths.push(tv[i]);
    }
    return paths.length >= 6 ? paths.map(toPoster) : FALLBACK_PATHS.map(toPoster);
  } catch {
    return FALLBACK_PATHS.map(toPoster);
  }
}

/**
 * Découpe un tableau en `rows` sous-tableaux par round-robin
 * (élément i → ligne i % rows) → évite que deux affiches identiques se
 * retrouvent côte à côte sur la même ligne.
 */
export function splitRows<T>(items: T[], rows: number): T[][] {
  const out: T[][] = Array.from({ length: rows }, () => []);
  items.forEach((it, i) => out[i % rows].push(it));
  return out;
}
