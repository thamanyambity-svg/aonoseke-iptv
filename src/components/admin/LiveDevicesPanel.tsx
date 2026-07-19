import { RefreshCw, Wifi } from 'lucide-react';
import { useLiveDevices } from '../../hooks/useLiveDevices';

function fmtDate(s: string): string {
  try {
    return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return s;
  }
}

function fmtTimeAgo(s: string): string {
  try {
    const diffMs = Date.now() - new Date(s).getTime();
    const sec = Math.floor(diffMs / 1000);
    if (sec < 5) return "à l'instant";
    if (sec < 60) return `il y a ${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `il y a ${min} min`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return `il y a ${hr}h`;
    const day = Math.floor(hr / 24);
    return `il y a ${day}j`;
  } catch {
    return s;
  }
}

function deviceLabel(d: string | null): string {
  if (!d) return '—';
  switch (d) {
    case 'tv': return 'TV';
    case 'mobile': return 'Mobile';
    case 'desktop': return 'Desktop';
    default: return d;
  }
}

export function LiveDevicesPanel(): JSX.Element {
  const { devices, loading, error, reload } = useLiveDevices();
  return (
    <div className="admin-table-wrap admin-no-print">
      <h3 className="admin-table-title">
        <Wifi size={15} className={loading ? 'pulse-icon' : ''} />
        Appareils connectés en direct ({devices.length})
        <button className="admin-btn" style={{ marginLeft: 'auto' }} onClick={() => void reload()} disabled={loading}>
          <RefreshCw size={13} className={loading ? 'spin-icon' : ''} /> Actualiser
        </button>
      </h3>
      <p className="admin-online-sub" style={{ marginBottom: 10 }}>
        Tous les appareils — connectés <b>et démo / anonymes</b> — vus dans les 5 dernières minutes · IP capturée côté serveur
      </p>
      {error ? (
        <p className="geo-empty">{error}</p>
      ) : devices.length === 0 ? (
        <p className="geo-empty">Aucun appareil actif. Ouvrez l'app (même en démo) pour le voir apparaître ici.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Type</th><th>IP</th><th>Appareil</th><th>Localisation</th><th>Activité</th><th>Vu</th>
            </tr>
          </thead>
          <tbody>
            {devices.map((d) => {
              const isConn = d.kind === 'Connecté';
              return (
                <tr key={d.device_id}>
                  <td>
                    <span style={{
                      display: 'inline-block', fontSize: '0.72em', padding: '2px 8px', borderRadius: 6, fontWeight: 600,
                      color: isConn ? '#a3e635' : 'var(--lime, #c9a84c)',
                      background: isConn ? 'rgba(132,204,22,0.12)' : 'var(--lime-dim, rgba(201,168,76,0.12))',
                    }}>{d.kind}</span>
                    {d.email && <div className="u-time-ago">{d.email}</div>}
                  </td>
                  <td className="u-ip" style={{ fontFamily: 'var(--mono, monospace)' }}>{d.ip ?? '—'}</td>
                  <td>{deviceLabel(d.device)}</td>
                  <td>{[d.city, d.country].filter(Boolean).join(', ') || '—'}</td>
                  <td>{d.pings} ping{d.pings > 1 ? 's' : ''}</td>
                  <td className="u-time-ago" title={fmtDate(d.last_seen_at)}>{fmtTimeAgo(d.last_seen_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
