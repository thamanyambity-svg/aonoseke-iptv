/**
 * Carte du monde (projection équirectangulaire) avec points lumineux pour
 * chaque utilisateur localisé. SVG pur, zéro dépendance, thème or/sombre.
 */
export interface GeoPoint {
  lat: number;
  lon: number;
  country?: string | null;
  city?: string | null;
}

const W = 720;
const H = 340;
const px = (lon: number): number => ((lon + 180) / 360) * W;
const py = (lat: number): number => ((90 - lat) / 180) * H;

const LONS = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const LATS = [-60, -30, 0, 30, 60];

export function WorldMap({ points }: { points: GeoPoint[] }): JSX.Element {
  const valid = points.filter(
    (p) => typeof p.lat === 'number' && typeof p.lon === 'number',
  );
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="world-map"
      role="img"
      aria-label="Carte de répartition mondiale des utilisateurs"
    >
      <rect x="0" y="0" width={W} height={H} rx="10" className="wm-bg" />
      {LONS.map((lo) => (
        <line key={`x${lo}`} x1={px(lo)} y1="0" x2={px(lo)} y2={H} className="wm-grid" />
      ))}
      {LATS.map((la) => (
        <line
          key={`y${la}`}
          x1="0"
          y1={py(la)}
          x2={W}
          y2={py(la)}
          className={la === 0 ? 'wm-grid wm-equator' : 'wm-grid'}
        />
      ))}
      {valid.map((p, i) => (
        <g key={i} transform={`translate(${px(p.lon)} ${py(p.lat)})`}>
          <circle r="8" className="wm-halo" />
          <circle r="2.6" className="wm-dot" />
          <title>{[p.city, p.country].filter(Boolean).join(', ') || 'Utilisateur'}</title>
        </g>
      ))}
      {valid.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" className="wm-empty">
          En attente des premières localisations…
        </text>
      )}
    </svg>
  );
}
