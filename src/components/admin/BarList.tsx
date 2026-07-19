interface NamedStat {
  label: string;
  count: number;
}

export function BarList({ items }: { items: NamedStat[] }): JSX.Element {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) {
    return <p className="geo-empty">Pas encore de données — elles arrivent avec l'usage.</p>;
  }
  return (
    <div className="bar-list">
      {items.map((it, i) => (
        <div key={`${it.label}-${i}`} className="bar-row">
          <span className="bar-label">{it.label}</span>
          <span className="bar-track">
            <span
              className="bar-fill"
              style={{ width: `${(it.count / max) * 100}%` }}
            />
          </span>
          <span className="bar-count">{it.count.toLocaleString('fr-FR')}</span>
        </div>
      ))}
    </div>
  );
}
