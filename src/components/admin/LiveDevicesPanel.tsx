import { RefreshCw, Wifi } from 'lucide-react';
import { useLiveDevices } from '../../hooks/useLiveDevices';
import type { JSX } from 'react';
import { fmtDate, fmtTimeAgo, deviceLabel } from './dashboardFormat.ts';

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
