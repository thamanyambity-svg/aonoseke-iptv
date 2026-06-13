import { useEffect, useState, useCallback } from 'react';
import { Users, Activity, TrendingUp, Eye, RefreshCw, X, Crown, Download } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';

interface Stats {
  total_users: number;
  active_24h: number;
  active_7d: number;
  active_30d: number;
  new_today: number;
  new_7d: number;
  premium_users: number;
  channel_views_7d: number;
  ad_impressions_7d: number;
  ad_clicks_7d: number;
}

interface RecentUser {
  username: string;
  email: string;
  country: string | null;
  created_at: string;
  last_seen_at: string;
  role: string;
}

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return s; }
}

function isOnline(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000; // 5 min
}

export function AdminDashboard({ onClose }: { onClose: () => void }): JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    if (!supabase) { setError('Backend non configuré'); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const [s, u] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase.rpc('admin_recent_users', { lim: 100 }),
      ]);
      if (s.error) throw s.error;
      if (u.error) throw u.error;
      setStats(s.data as Stats);
      setUsers((u.data as RecentUser[]) ?? []);
    } catch (err) {
      logger.error('admin load failed', err as Error);
      setError("Accès refusé ou erreur. (Réservé aux administrateurs.)");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function exportCsv(): void {
    const header = 'username,email,pays,inscrit,derniere_activite,role\n';
    const rows = users.map((u) =>
      `${u.username},${u.email},${u.country ?? ''},${u.created_at},${u.last_seen_at},${u.role}`,
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aonoseke-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  const cards = stats ? [
    { icon: <Users size={18} />,      label: 'Inscrits (total)',      value: stats.total_users,       hi: true },
    { icon: <Activity size={18} />,   label: 'Actifs · 24h',          value: stats.active_24h },
    { icon: <Activity size={18} />,   label: 'Actifs · 7 jours',      value: stats.active_7d },
    { icon: <Activity size={18} />,   label: 'Actifs · 30 jours',     value: stats.active_30d },
    { icon: <TrendingUp size={18} />, label: "Nouveaux · aujourd'hui", value: stats.new_today },
    { icon: <TrendingUp size={18} />, label: 'Nouveaux · 7 jours',    value: stats.new_7d },
    { icon: <Crown size={18} />,      label: 'Abonnés premium',       value: stats.premium_users },
    { icon: <Eye size={18} />,        label: 'Vues chaînes · 7j',     value: stats.channel_views_7d },
    { icon: <Eye size={18} />,        label: 'Impressions pub · 7j',  value: stats.ad_impressions_7d },
    { icon: <Eye size={18} />,        label: 'Clics pub · 7j',        value: stats.ad_clicks_7d },
  ] : [];

  return (
    <div className="admin">
      <div className="admin-header">
        <div className="admin-title">
          <h2>Tableau de bord — Administration</h2>
          <span>Audience & statistiques pour annonceurs</span>
        </div>
        <div className="admin-actions">
          <button className="admin-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Actualiser
          </button>
          {users.length > 0 && (
            <button className="admin-btn" onClick={exportCsv}>
              <Download size={14} /> Export CSV
            </button>
          )}
          <button className="admin-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="admin-loading"><div className="spinner" /><p>Chargement des statistiques…</p></div>
      ) : error ? (
        <div className="admin-error"><p>{error}</p></div>
      ) : (
        <div className="admin-body">
          {/* KPI cards */}
          <div className="admin-cards">
            {cards.map((c, i) => (
              <div key={i} className={`admin-card${c.hi ? ' admin-card--hi' : ''}`}>
                <div className="admin-card-icon">{c.icon}</div>
                <div className="admin-card-value">{c.value.toLocaleString('fr-FR')}</div>
                <div className="admin-card-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* Recent users table */}
          <div className="admin-table-wrap">
            <h3 className="admin-table-title">Utilisateurs récents ({users.length})</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Statut</th><th>Utilisateur</th><th>Email</th>
                  <th>Pays</th><th>Inscrit</th><th>Dernière activité</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={i}>
                    <td>
                      <span className={`u-dot${isOnline(u.last_seen_at) ? ' on' : ''}`} />
                      {isOnline(u.last_seen_at) ? 'En ligne' : 'Hors ligne'}
                    </td>
                    <td className="u-name">
                      {u.username}
                      {u.role === 'admin' && <span className="u-admin">ADMIN</span>}
                    </td>
                    <td className="u-email">{u.email}</td>
                    <td>{u.country ?? '—'}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>{fmtDate(u.last_seen_at)}</td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={6} className="u-empty">Aucun utilisateur inscrit pour l'instant.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
