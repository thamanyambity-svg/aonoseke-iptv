import { useEffect, useState } from 'react';
import type { JSX, CSSProperties } from 'react';
import './CinematicBg.css';
import { fetchPosters, splitRows, type Poster } from '../lib/posters.ts';

/**
 * Fond cinématique de l'empty-state : 3 lignes de vignettes en défilement
 * infini (gauche / droite / gauche).
 *
 * - Affiches RÉELLES via TMDB (films + séries/docs) si VITE_TMDB_API_KEY défini.
 * - Repli local "genres" sinon → jamais d'image cassée.
 * - Animation marquee (cinScrollLeft/Right), overlay et dimensions PRÉSERVÉS.
 */

const ROWS: ReadonlyArray<{ dir: 'left' | 'right'; speed: number }> = [
  { dir: 'left', speed: 60 },
  { dir: 'right', speed: 48 },
  { dir: 'left', speed: 72 },
];

// ── Repli local (aucune dépendance image externe) ───────────────────────────
interface Genre { label: string; emoji: string; bg: string; }
const GENRES: Genre[] = [
  { label: 'Films',          emoji: '🎬', bg: 'linear-gradient(160deg, #3a0f0f, #7e2420)' },
  { label: 'Séries',         emoji: '📺', bg: 'linear-gradient(160deg, #1b1147, #3d2c86)' },
  { label: 'Football',       emoji: '⚽', bg: 'linear-gradient(160deg, #0c2a14, #1f7a36)' },
  { label: 'Documentaires',  emoji: '🌍', bg: 'linear-gradient(160deg, #06281f, #0f6a50)' },
  { label: 'Dessins animés', emoji: '🦸', bg: 'linear-gradient(160deg, #3a0d2e, #8a2266)' },
  { label: 'Musique',        emoji: '🎵', bg: 'linear-gradient(160deg, #1a0a3e, #4a2a9a)' },
  { label: 'Sport',          emoji: '🏆', bg: 'linear-gradient(160deg, #2a2006, #7a5a12)' },
  { label: 'Infos',          emoji: '📰', bg: 'linear-gradient(160deg, #0a1c2e, #1f4f76)' },
  { label: 'Cinéma',         emoji: '🎞️', bg: 'linear-gradient(160deg, #2a0d0d, #5e2222)' },
  { label: 'Enfants',        emoji: '🧸', bg: 'linear-gradient(160deg, #3a2a06, #8a6a18)' },
  { label: 'Divertissement', emoji: '⭐', bg: 'linear-gradient(160deg, #2a2306, #6a5816)' },
  { label: 'Téléréalité',    emoji: '🎤', bg: 'linear-gradient(160deg, #2a0a1c, #7a1f54)' },
];

function rotate<T>(arr: T[], n: number): T[] {
  return [...arr.slice(n), ...arr.slice(0, n)];
}

function trackStyle(dir: 'left' | 'right', speed: number): CSSProperties {
  return {
    animationName: dir === 'left' ? 'cinScrollLeft' : 'cinScrollRight',
    animationDuration: `${speed}s`,
  };
}

// ── Ligne d'affiches réelles ────────────────────────────────────────────────
function PosterRow({ posters, dir, speed, eager }: {
  posters: Poster[]; dir: 'left' | 'right'; speed: number; eager: boolean;
}): JSX.Element {
  const doubled = [...posters, ...posters]; // duplication → boucle sans couture
  return (
    <div className="cin-row">
      <div className="cin-track" style={trackStyle(dir, speed)}>
        {doubled.map((p, i) => (
          <div key={i} className="cin-poster">
            <img
              src={p.url}
              srcSet={p.srcSet}
              sizes="132px"
              alt=""
              /* 1ʳᵉ ligne visible d'emblée → eager ; le reste paresseux */
              loading={eager && i < 4 ? 'eager' : 'lazy'}
              decoding="async"
              draggable={false}
              onError={(e) => { (e.currentTarget).style.opacity = '0'; }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Ligne de genres (repli) ─────────────────────────────────────────────────
function GenreRow({ genres, dir, speed }: {
  genres: Genre[]; dir: 'left' | 'right'; speed: number;
}): JSX.Element {
  const doubled = [...genres, ...genres];
  return (
    <div className="cin-row">
      <div className="cin-track" style={trackStyle(dir, speed)}>
        {doubled.map((g, i) => (
          <div key={i} className="cin-poster" style={{ background: g.bg }}>
            <span className="cin-poster-emoji" aria-hidden="true">{g.emoji}</span>
            <span className="cin-poster-label">{g.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CinematicBg(): JSX.Element {
  const [posters, setPosters] = useState<Poster[]>([]);

  useEffect(() => {
    let alive = true;
    void fetchPosters().then((p) => { if (alive) setPosters(p); });
    return () => { alive = false; };
  }, []);

  const hasPosters = posters.length >= 6;
  const rows = hasPosters ? splitRows(posters, ROWS.length) : [];

  return (
    <div className="cinematic-bg" aria-hidden="true">
      {hasPosters
        ? ROWS.map((r, i) => (
            <PosterRow key={i} posters={rows[i] ?? []} dir={r.dir} speed={r.speed} eager={i === 0} />
          ))
        : ROWS.map((r, i) => (
            <GenreRow key={i} genres={rotate(GENRES, i * 4)} dir={r.dir} speed={r.speed} />
          ))}
      <div className="cin-overlay" />
    </div>
  );
}
