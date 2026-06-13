import './CinematicBg.css';
import type { JSX } from 'react';

const SEEDS_ROW1 = [10, 22, 37, 49, 58, 66, 77, 83, 91, 104, 115, 128];
const SEEDS_ROW2 = [5, 18, 31, 44, 53, 62, 74, 88, 97, 109, 120, 133];
const SEEDS_ROW3 = [3, 14, 26, 39, 51, 63, 71, 85, 96, 107, 118, 130];

function PosterRow({
  seeds, direction, speed,
}: {
  seeds: number[];
  direction: 'left' | 'right';
  speed: number;
}): JSX.Element {
  const doubled = [...seeds, ...seeds];
  return (
    <div className="cin-row">
      <div
        className="cin-track"
        style={{
          animationName: direction === 'left' ? 'cinScrollLeft' : 'cinScrollRight',
          animationDuration: `${speed}s`,
        }}
      >
        {doubled.map((seed, i) => (
          <div key={i} className="cin-poster">
            <img
              src={`https://picsum.photos/seed/${seed}/160/240`}
              alt=""
              loading="lazy"
              draggable={false}
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.opacity = '0';
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export function CinematicBg(): JSX.Element {
  return (
    <div className="cinematic-bg" aria-hidden="true">
      <PosterRow seeds={SEEDS_ROW1} direction="left" speed={60} />
      <PosterRow seeds={SEEDS_ROW2} direction="right" speed={48} />
      <PosterRow seeds={SEEDS_ROW3} direction="left" speed={72} />
      <div className="cin-overlay" />
    </div>
  );
}
