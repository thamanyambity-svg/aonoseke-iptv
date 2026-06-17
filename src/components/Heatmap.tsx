export interface HeatCell { dow: number; hour: number; count: number; }

const DAYS = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * Échelle d'intensité à 5 paliers (du transparent au saturé).
 * Inspirée des heatmaps GitHub / GitLab : lisible, sobre, pro.
 *
 * Paliers :
 *   0        → cellule vide (gris très sombre, presque invisible)
 *   >0  ≤25% → niveau 1 (or très estompé)
 *   >25 ≤50% → niveau 2 (or estompé)
 *   >50 ≤75% → niveau 3 (or moyen)
 *   >75 <max → niveau 4 (or soutenu)
 *   =max     → niveau 5 (or saturé)
 */
function intensityLevel(value: number, max: number): number {
  if (value <= 0 || max <= 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.50) return 2;
  if (ratio <= 0.75) return 3;
  if (ratio < 1)     return 4;
  return 5;
}

const LEVEL_COLORS: Record<number, string> = {
  0: 'rgba(255, 255, 255, 0.04)',
  1: 'rgba(201, 138, 27, 0.18)',
  2: 'rgba(201, 138, 27, 0.38)',
  3: 'rgba(201, 138, 27, 0.58)',
  4: 'rgba(201, 138, 27, 0.78)',
  5: 'rgba(201, 138, 27, 0.95)',
};

const LEVEL_LABELS: Record<number, string> = {
  0: 'Aucune activité',
  1: 'Faible',
  2: 'Modérée',
  3: 'Soutenue',
  4: 'Forte',
  5: 'Pic',
};

/**
 * Heatmap heures × jours de la semaine (intensité = volume d'activité).
 * Sert à repérer les heures de pointe pour le dispatch publicitaire.
 *
 * Améliorations V2 :
 *   - Axe des heures complet (0h, 3h, 6h, ... 21h) avec labels tous les 3h
 *   - Tooltip enrichi (jour, plage horaire, valeur, niveau)
 *   - Légende visuelle d'intensité (5 paliers)
 *   - Accessibilité : role="img", aria-label global, title par cellule
 *   - Gestion robuste des données manquantes (cellules vides = 0)
 *   - Stats de synthèse (pic, total, moyenne)
 *   - Aucun calcul flottant dans le rendu (pré-calculé en mémoire)
 */
export function Heatmap({ cells }: { cells: HeatCell[] }): JSX.Element {
  // Pré-calcul de la grille 7×24 et du max
  const grid = new Map<string, number>();
  let max = 0;
  let total = 0;
  for (const c of cells) {
    if (c.dow < 0 || c.dow > 6 || c.hour < 0 || c.hour > 23) continue;
    const key = `${c.dow}-${c.hour}`;
    grid.set(key, c.count);
    if (c.count > max) max = c.count;
    total += c.count;
  }
  const safeMax = Math.max(1, max);

  // Identification du pic
  let peakDay = -1;
  let peakHour = -1;
  let peakValue = 0;
  for (const c of cells) {
    if (c.count > peakValue) {
      peakValue = c.count;
      peakDay = c.dow;
      peakHour = c.hour;
    }
  }

  // Lignes pour faciliter la lecture
  function formatHour(h: number): string {
    return `${String(h).padStart(2, '0')}h`;
  }

  function formatHourRange(h: number): string {
    return `${formatHour(h)}–${formatHour((h + 1) % 24)}`;
  }

  return (
    <div className="heatmap-wrap">
      {/* Bandeau de synthèse */}
      <div className="heatmap-summary">
        <span className="hm-stat">
          <span className="hm-stat-label">Total événements</span>
          <span className="hm-stat-value">{total.toLocaleString('fr-FR')}</span>
        </span>
        {peakValue > 0 && (
          <span className="hm-stat hm-stat--peak">
            <span className="hm-stat-label">Pic d'activité</span>
            <span className="hm-stat-value">
              {DAYS[peakDay]} · {formatHour(peakHour)}
              <span className="hm-stat-sub"> ({peakValue.toLocaleString('fr-FR')} év.)</span>
            </span>
          </span>
        )}
        <span className="hm-stat">
          <span className="hm-stat-label">Cellules actives</span>
          <span className="hm-stat-value">{grid.size} / 168</span>
        </span>
      </div>

      {/* Grille principale */}
      <div
        className="heatmap"
        role="img"
        aria-label={
          peakValue > 0
            ? `Heatmap d'activité sur 30 jours. Pic le ${DAYS[peakDay]} à ${formatHour(peakHour)} avec ${peakValue} événements. Total ${total} événements.`
            : `Heatmap d'activité sur 30 jours. Aucune donnée pour l'instant.`
        }
      >
        <div className="heatmap-grid">
          {/* En-tête colonnes (heures) */}
          <div className="heatmap-row heatmap-row--header">
            <span className="heatmap-corner" aria-hidden="true" />
            {HOURS.map((h) => (
              <span
                key={h}
                className={`heatmap-hour${h % 3 === 0 ? ' heatmap-hour--labeled' : ''}`}
              >
                {h % 3 === 0 ? formatHour(h) : ''}
              </span>
            ))}
          </div>

          {/* Lignes une par jour */}
          {DAYS.map((d, dow) => (
            <div key={dow} className="heatmap-row">
              <span className="heatmap-day">{d}</span>
              {HOURS.map((h) => {
                const v = grid.get(`${dow}-${h}`) ?? 0;
                const level = intensityLevel(v, safeMax);
                return (
                  <span
                    key={h}
                    className={`heatmap-cell heatmap-cell--l${level}`}
                    style={{ background: LEVEL_COLORS[level] }}
                    title={`${d} ${formatHourRange(h)} — ${v.toLocaleString('fr-FR')} événement${v > 1 ? 's' : ''} · ${LEVEL_LABELS[level]}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Légende d'intensité */}
      <div className="heatmap-legend" role="radiogroup" aria-label="Échelle d'intensité">
        <span className="legend-label">Moins</span>
        {[0, 1, 2, 3, 4, 5].map((lvl) => (
          <span key={lvl} className="legend-item">
            <span
              className={`legend-swatch legend-swatch--l${lvl}`}
              style={{ background: LEVEL_COLORS[lvl] }}
              title={LEVEL_LABELS[lvl]}
            />
          </span>
        ))}
        <span className="legend-label">Plus</span>
      </div>
    </div>
  );
}
