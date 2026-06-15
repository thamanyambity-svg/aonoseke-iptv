export interface HeatCell { dow: number; hour: number; count: number; }

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

/**
 * Heatmap heures × jours de la semaine (intensité = volume d'activité).
 * Sert à repérer les heures de pointe pour le dispatch publicitaire.
 */
export function Heatmap({ cells }: { cells: HeatCell[] }): JSX.Element {
  const max = Math.max(1, ...cells.map((c) => c.count));
  const grid = new Map<string, number>();
  cells.forEach((c) => grid.set(`${c.dow}-${c.hour}`, c.count));

  return (
    <div className="heatmap">
      {DAYS.map((d, dow) => (
        <div key={dow} className="heatmap-row">
          <span className="heatmap-day">{d}</span>
          {Array.from({ length: 24 }, (_, h) => {
            const v = grid.get(`${dow}-${h}`) ?? 0;
            const intensity = v / max;
            return (
              <span
                key={h}
                className="heatmap-cell"
                style={{ background: v === 0 ? 'rgba(255,255,255,0.04)' : `rgba(201,168,76,${(0.15 + intensity * 0.85).toFixed(2)})` }}
                title={`${d} ${h}h — ${v} événement${v > 1 ? 's' : ''}`}
              />
            );
          })}
        </div>
      ))}
      <div className="heatmap-row heatmap-axis">
        <span className="heatmap-day" />
        {Array.from({ length: 24 }, (_, h) => (
          <span key={h} className="heatmap-hour">{h % 6 === 0 ? `${h}h` : ''}</span>
        ))}
      </div>
    </div>
  );
}
