import { useEffect, useState, useCallback, lazy, Suspense } from 'react';
import { Users, Activity, TrendingUp, Eye, RefreshCw, X, Crown, Download, FileDown, Globe, Clock, Layers, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';
import { WorldMap, type GeoPoint } from './WorldMap.tsx';
import { Heatmap, type HeatCell } from './Heatmap.tsx';

const MapboxMap = lazy(() => import('./MapboxMap.tsx'));
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

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
  id: string;
  username: string;
  email: string;
  country: string | null;
  country_code: string | null;
  city: string | null;
  ip: string | null;
  created_at: string;
  last_seen_at: string;
  role: string;
}

interface Engagement { avg_min_per_active_day: number; total_min_today: number; dau: number; wau: number; mau: number; }
interface CountryStat { country: string; country_code: string | null; count: number; }
interface GeoStats { total: number; located: number; countries: CountryStat[]; points: GeoPoint[]; }
interface NamedStat { label: string; count: number; }

function fmtDate(s: string): string {
  try { return new Date(s).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }); }
  catch { return s; }
}

function isOnline(lastSeen: string): boolean {
  return Date.now() - new Date(lastSeen).getTime() < 5 * 60 * 1000; // 5 min
}

function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return '🌍';
  const base = 0x1f1e6;
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65));
}

function BarList({ items }: { items: NamedStat[] }): JSX.Element {
  const max = Math.max(1, ...items.map((i) => i.count));
  if (items.length === 0) return <p className="geo-empty">Pas encore de données — elles arrivent avec l'usage.</p>;
  return (
    <div className="bar-list">
      {items.map((it, i) => (
        <div key={i} className="bar-row">
          <span className="bar-label">{it.label}</span>
          <span className="bar-track"><span className="bar-fill" style={{ width: `${(it.count / max) * 100}%` }} /></span>
          <span className="bar-count">{it.count.toLocaleString('fr-FR')}</span>
        </div>
      ))}
    </div>
  );
}

export function AdminDashboard({ onClose }: { onClose: () => void }): JSX.Element {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [geo, setGeo] = useState<GeoStats | null>(null);
  const [eng, setEng] = useState<Engagement | null>(null);
  const [heat, setHeat] = useState<HeatCell[]>([]);
  const [content, setContent] = useState<NamedStat[]>([]);
  const [ages, setAges] = useState<NamedStat[]>([]);
  const [devices, setDevices] = useState<NamedStat[]>([]);
  const [segments, setSegments] = useState<NamedStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (): Promise<void> => {
    if (!supabase) { setError('Backend non configuré'); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const [s, u, g, e, h, c, a, d, seg] = await Promise.all([
        supabase.rpc('admin_stats'),
        supabase.rpc('admin_recent_users', { lim: 100 }),
        supabase.rpc('admin_geo_stats'),
        supabase.rpc('admin_engagement'),
        supabase.rpc('admin_activity_heatmap'),
        supabase.rpc('admin_content_affinity'),
        supabase.rpc('admin_age_distribution'),
        supabase.rpc('admin_device_split'),
        supabase.rpc('admin_segments'),
      ]);
      if (s.error) throw s.error;
      if (u.error) throw u.error;
      if (g.error) throw g.error;
      setStats(s.data as Stats);
      setUsers((u.data as RecentUser[]) ?? []);
      setGeo(g.data as GeoStats);
      setEng((e.data as Engagement) ?? null);
      setHeat((h.data as HeatCell[]) ?? []);
      setContent(((c.data as { category: string; count: number }[]) ?? []).map((x) => ({ label: x.category, count: x.count })));
      setAges(((a.data as { age_range: string; count: number }[]) ?? []).map((x) => ({ label: x.age_range, count: x.count })));
      setDevices(((d.data as { device: string; count: number }[]) ?? []).map((x) => ({ label: x.device, count: x.count })));
      setSegments((seg.data as NamedStat[]) ?? []);
    } catch (err) {
      logger.error('admin load failed', err as Error);
      setError("Accès refusé ou erreur. (Réservé aux administrateurs.)");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  function exportCsv(): void {
    const header = 'username,email,pays,ville,ip,inscrit,derniere_activite,role\n';
    const rows = users.map((u) =>
      `${u.username},${u.email},${u.country ?? ''},${u.city ?? ''},${u.ip ?? ''},${u.created_at},${u.last_seen_at},${u.role}`,
    ).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `aonoseke-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
  }

  async function deleteUser(id: string, username: string): Promise<void> {
    if (!supabase) return;
    if (!window.confirm(`Supprimer définitivement « ${username} » ?\nCette action est irréversible (compte + données).`)) return;
    const { error: err } = await supabase.rpc('admin_delete_user', { target: id });
    if (err) { window.alert('Suppression impossible : ' + err.message); return; }
    void load();
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
        <div className="admin-actions admin-no-print">
          <button className="admin-btn" onClick={() => void load()} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spin-icon' : ''} /> Actualiser
          </button>
          <button className="admin-btn" onClick={() => window.print()}>
            <FileDown size={14} /> Media Kit PDF
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

          {/* Engagement */}
          {eng && (
            <div className="admin-eng">
              <div className="eng-metric"><Clock size={16} /><b>{eng.avg_min_per_active_day}</b> min / jour actif</div>
              <div className="eng-metric"><b>{eng.dau.toLocaleString('fr-FR')}</b> actifs aujourd'hui</div>
              <div className="eng-metric"><b>{eng.wau.toLocaleString('fr-FR')}</b> actifs · 7j</div>
              <div className="eng-metric"><b>{eng.mau.toLocaleString('fr-FR')}</b> actifs · 30j</div>
            </div>
          )}

          {/* Répartition mondiale */}
          <div className="admin-geo">
            <div className="admin-geo-head">
              <h3 className="admin-table-title"><Globe size={15} /> Répartition mondiale</h3>
              {geo && (
                <span className="admin-geo-sub">
                  {geo.located.toLocaleString('fr-FR')} / {geo.total.toLocaleString('fr-FR')} localisés · {geo.countries.length} pays
                </span>
              )}
            </div>
            <div className="admin-geo-grid">
              {MAPBOX_TOKEN ? (
                <Suspense fallback={<WorldMap points={geo?.points ?? []} />}>
                  <MapboxMap points={geo?.points ?? []} token={MAPBOX_TOKEN} />
                </Suspense>
              ) : (
                <WorldMap points={geo?.points ?? []} />
              )}
              <div className="admin-geo-list">
                {geo && geo.countries.length > 0 ? (
                  geo.countries.slice(0, 8).map((c, i) => (
                    <div key={i} className="geo-row">
                      <span className="geo-flag">{flagEmoji(c.country_code)}</span>
                      <span className="geo-country">{c.country}</span>
                      <span className="geo-count">{c.count.toLocaleString('fr-FR')}</span>
                    </div>
                  ))
                ) : (
                  <p className="geo-empty">Aucune localisation pour l'instant. Elles apparaîtront dès les premières connexions.</p>
                )}
              </div>
            </div>
          </div>

          {/* Heures de pointe */}
          <div className="admin-table-wrap">
            <h3 className="admin-table-title"><Clock size={15} /> Heures de pointe (30 derniers jours)</h3>
            <Heatmap cells={heat} />
          </div>

          {/* Affinité contenu / âge / appareils / segments */}
          <div className="admin-panels">
            <div className="admin-panel">
              <h3 className="admin-table-title"><Eye size={15} /> Contenus préférés</h3>
              <BarList items={content} />
            </div>
            <div className="admin-panel">
              <h3 className="admin-table-title"><Layers size={15} /> Segments d'audience</h3>
              <BarList items={segments} />
            </div>
            <div className="admin-panel">
              <h3 className="admin-table-title"><Users size={15} /> Tranches d'âge</h3>
              <BarList items={ages} />
            </div>
            <div className="admin-panel">
              <h3 className="admin-table-title"><Activity size={15} /> Appareils</h3>
              <BarList items={devices} />
            </div>
          </div>

          {/* Recent users table */}
          <div className="admin-table-wrap admin-no-print">
            <h3 className="admin-table-title">Utilisateurs récents ({users.length})</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Statut</th><th>Utilisateur</th><th>Email</th>
                  <th>Pays</th><th>Ville</th><th>IP</th><th>Inscrit</th><th>Dernière activité</th><th>Actions</th>
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
                    <td>{u.country ? <><span className="u-flag">{flagEmoji(u.country_code)}</span> {u.country}</> : '—'}</td>
                    <td>{u.city ?? '—'}</td>
                    <td className="u-ip">{u.ip ?? '—'}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>{fmtDate(u.last_seen_at)}</td>
                    <td>
                      {u.role !== 'admin' && (
                        <button
                          className="u-del"
                          onClick={() => void deleteUser(u.id, u.username)}
                          title="Supprimer cet utilisateur"
                          aria-label={`Supprimer ${u.username}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={9} className="u-empty">Aucun utilisateur inscrit pour l'instant.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
