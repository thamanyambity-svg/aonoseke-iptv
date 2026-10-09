import { Radio, Clock } from 'lucide-react';
import type { JSX } from 'react';
import { fmtDate, fmtTimeAgo, flagEmoji, deviceLabel } from './dashboardFormat.ts';

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

function safeDisplayName(user: OnlineUser): string {
  const u = user.username ?? '';
  if (u) return u;
  if (user.email?.includes('@')) return user.email.split('@')[0] ?? user.email;
  if (user.email) return user.email;
  return 'Utilisateur';
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
        <span className="admin-online-sub">Signe de vie il y a moins de 90 s · actualisé toutes les 10 s</span>
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
