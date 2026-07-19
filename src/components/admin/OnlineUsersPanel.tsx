import { Radio, Clock } from 'lucide-react';

interface OnlineUser {
  id: string;
  username: string;
  email: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  device: string | null;
  last_seen_at: string;
}

function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return '🌍';
  const base = 0x1f1e6;
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65));
}

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

function safeDisplayName(user: OnlineUser): string {
  const u = user.username ?? '';
  if (u) return u;
  if (user.email?.includes('@')) return user.email.split('@')[0];
  if (user.email) return user.email;
  return 'Utilisateur';
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

export function OnlineUsersPanel({ users, loading }: { users: OnlineUser[]; loading: boolean }): JSX.Element {
  return (
    <div className="admin-online-panel">
      <div className="admin-online-head">
        <h3 className="admin-table-title">
          <Radio size={15} className={loading ? 'pulse-icon' : ''} />
          Utilisateurs en ligne
          <span className="admin-online-count">
            {users.length} <span className="admin-online-pulse" aria-hidden="true" />
          </span>
        </h3>
        <span className="admin-online-sub">Mise à jour temps réel · seuil 90s</span>
      </div>
      {users.length === 0 ? (
        <p className="geo-empty">Aucun utilisateur en ligne actuellement.</p>
      ) : (
        <div className="admin-online-list">
          {users.map((u) => (
            <div key={u.id} className="online-row">
              <span className="online-dot online-dot--on" aria-hidden="true" />
              <span className="online-flag">{flagEmoji(u.country_code)}</span>
              <div className="online-info">
                <div className="online-name">
                  {safeDisplayName(u)}
                  <span className="online-device">{deviceLabel(u.device)}</span>
                </div>
                <div className="online-meta">
                  {[u.city, u.country].filter(Boolean).join(', ') || 'Localisation inconnue'}
                </div>
              </div>
              <div className="online-time" title={`Dernier signal : ${fmtDate(u.last_seen_at)}`}>
                <Clock size={11} aria-hidden="true" />
                {fmtTimeAgo(u.last_seen_at)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
