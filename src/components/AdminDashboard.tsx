import { useEffect, useState, useCallback, useRef, lazy, Suspense } from 'react';
import {
  Users, Activity, TrendingUp, Eye, RefreshCw, X, Download,
  FileDown, Globe, Clock, Layers, Trash2, Radio, Zap, Target, Megaphone,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';
import { WorldMap, type GeoPoint } from './WorldMap.tsx';
import { Heatmap, type HeatCell } from './Heatmap.tsx';
import { AdManagementContent } from './AdManagementDashboard.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import type { AuthUser } from '../hooks/useAuth.ts';

const MapboxMap = lazy(() => import('./MapboxMap.tsx'));
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

// ── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total_users: number;
  active_24h: number;
  active_7d: number;
  active_30d: number;
  new_today: number;
  new_7d: number;
  sessions_7d: number;
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

interface Engagement { avg_min_per_active_day: number; total_min_today: number; dau: number; wau: number; mau: number; }
interface CountryStat { country: string; country_code: string | null; count: number; lat: number | null; lon: number | null; }
interface GeoStats { total: number; located: number; countries: CountryStat[]; points: GeoPoint[]; }
interface NamedStat { label: string; count: number; }

interface AdminDashboardProps {
  user: AuthUser | null;
  onClose: () => void;
  initialTab?: 'audience' | 'ads';
}

type AdminTab = 'audience' | 'ads';

// ── Helpers ──────────────────────────────────────────────────────────────────

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

/**
 * Seuil "en ligne" aligné sur le heartbeat (60s) avec marge de sécurité.
 * Le heartbeat envoie une mise à jour toutes les 60s ; on considère un
 * utilisateur en ligne jusqu'à 90s après son dernier heartbeat (couvre
 * le délai réseau + la fenêtre entre deux battements).
 */
const ONLINE_THRESHOLD_MS = 90 * 1000;

function isOnline(lastSeen: string): boolean {
  try {
    return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
  } catch {
    return false;
  }
}

function flagEmoji(cc: string | null): string {
  if (!cc || cc.length !== 2) return '🌍';
  const base = 0x1f1e6;
  return String.fromCodePoint(...[...cc.toUpperCase()].map((c) => base + c.charCodeAt(0) - 65));
}

function deviceLabel(d: string | null): string {
  if (!d) return '—';
  switch (d) {
    case 'tv':      return 'TV';
    case 'mobile':  return 'Mobile';
    case 'desktop': return 'Desktop';
    default:        return d;
  }
}

function safeDisplayName(user: OnlineUser | RecentUser): string {
  const username = safeString(user.username);
  if (username) return username;
  const email = safeString(user.email);
  if (email.includes('@')) return email.split('@')[0];
  if (email.length > 0) return email;
  return 'Utilisateur';
}

/**
 * Échappe une valeur CSV pour prévenir l'injection de formules
 * (CSV injection : Excel/Sheets interprètent =, +, -, @, \t, \r).
 * Préfixe par une apostrophe si le champ commence par un caractère
 * dangereux, et entoure systématiquement de guillemets (RFC 4180).
 */
function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  // Doubler les guillemets internes
  const escaped = s.replace(/"/g, '""');
  // Si contient virgule, guillemet, retour ligne, ou commence par caractère dangereux
  const needsQuote = /[,\"\n\r]/.test(s) || /^[=+\-@\t\r]/.test(s);
  const quoted = needsQuote ? `"${escaped}"` : escaped;
  // Préfixer les formules potentielles (=, +, -, @) par une apostrophe
  if (/^[=+\-@]/.test(quoted)) return `'${quoted}`;
  return quoted;
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? value : [];
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// ── Sous-composant : BarList ────────────────────────────────────────────────

function BarList({ items }: { items: NamedStat[] }): JSX.Element {
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

// ── Sous-composant : panneau utilisateurs en ligne (temps réel) ─────────────

function OnlineUsersPanel({ users, loading }: { users: OnlineUser[]; loading: boolean }): JSX.Element {
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

// ── Composant principal ─────────────────────────────────────────────────────

export function AdminDashboard({ user, onClose, initialTab = 'audience' }: AdminDashboardProps): JSX.Element | null {
  // Garde-fou de sécurité : si l'utilisateur courant n'est pas admin,
  // on ne rend rien. La sécurité côté Supabase (RPC security_definer +
  // is_admin()) reste la source de vérité, ce n'est qu'un garde-fou UI.
  
  // DEBUG: Log complet pour diagnostic
  const userRole = user?.role;
  const isAdmin = userRole === 'admin';
  
  if (!isAdmin) {
    logger.warn('🔒 AdminDashboard accès refusé', { 
      userId: user?.id,
      email: user?.email,
      userRole: userRole || '[vide]',
      expectedRole: 'admin',
      message: 'Utilisateur non-admin ne peut pas accéder au dashboard'
    });
    
    // Log dans la console pour le débogage
    console.error(
      '%c🔒 ADMIN DASHBOARD — ACCÈS REFUSÉ',
      'color: red; font-weight: bold; font-size: 14px'
    );
    console.table({
      'User ID': user?.id,
      'Email': user?.email,
      'Rôle actuel': userRole || '[vide — pas configuré!]',
      'Rôle requis': 'admin',
      'Action': 'Allez sur Supabase → Table Editor → profiles → colonne role → mettez "admin"'
    });
    
    return null;
  }

  return <AdminDashboardInner user={user} onClose={onClose} initialTab={initialTab} />;
}

function AdminDashboardInner({ user, onClose, initialTab }: {
  user: AuthUser;
  onClose: () => void;
  initialTab: AdminTab;
}): JSX.Element {
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab);
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<RecentUser[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [geo, setGeo] = useState<GeoStats | null>(null);
  const [eng, setEng] = useState<Engagement | null>(null);
  const [heat, setHeat] = useState<HeatCell[]>([]);
  const [content, setContent] = useState<NamedStat[]>([]);
  const [ages, setAges] = useState<NamedStat[]>([]);
  const [devices, setDevices] = useState<NamedStat[]>([]);
  const [segments, setSegments] = useState<NamedStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Référence pour tracker la visibilité de l'onglet (économie de requêtes)
  const isVisibleRef = useRef<boolean>(document.visibilityState === 'visible');

  // ── Chargement complet des données ────────────────────────────────────────
  const load = useCallback(async (): Promise<void> => {
    if (!supabase) {
      setError('Backend non configuré');
      setLoading(false);
      return;
    }
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

      // Vérification des erreurs (la RPC lève une exception si non-admin,
      // mais on garde le garde-fou côté client pour la robustesse)
      const errors = [s.error, u.error, g.error, e.error, h.error, c.error, a.error, d.error, seg.error].filter(Boolean);
      if (errors.length > 0) throw errors[0];

      const statsData = s.data;
      setStats(typeof statsData === 'object' && statsData ? (statsData as Stats) : null);
      setUsers(safeArray<RecentUser>(u.data));
      setGeo(parseGeo(g.data));
      setEng(typeof e.data === 'object' && e.data ? (e.data as Engagement) : null);
      setHeat(safeArray<HeatCell>(h.data));
      setContent(safeArray<{ category: string; count: number }>(c.data).map((x) => ({ label: safeString(x.category), count: safeNumber(x.count) })));
      setAges(safeArray<{ age_range: string; count: number }>(a.data).map((x) => ({ label: safeString(x.age_range), count: safeNumber(x.count) })));
      setDevices(safeArray<{ device: string; count: number }>(d.data).map((x) => ({ label: safeString(x.device), count: safeNumber(x.count) })));
      setSegments(safeArray<NamedStat>(seg.data));
      setLastUpdate(new Date());
    } catch (err) {
      logger.error('admin load failed', err as Error);
      const msg = (err as Error)?.message ?? '';
      if (msg.includes('administrateur') || msg.includes('42501')) {
        setError("Accès refusé : cette page est réservée aux administrateurs.");
      } else {
        setError("Erreur lors du chargement des statistiques. Réessayez.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Parsing de la géo (la RPC renvoie { total, located, countries: jsonb }) ─
  function parseGeo(raw: unknown): GeoStats | null {
    if (!raw || typeof raw !== 'object') return null;
    const data = raw as { total?: number; located?: number; countries?: unknown };
    const countries = Array.isArray(data.countries)
      ? (data.countries as CountryStat[])
      : [];
    const points: GeoPoint[] = countries
      .filter((c) => typeof c.lat === 'number' && typeof c.lon === 'number')
      .map((c) => ({
        lat: c.lat as number,
        lon: c.lon as number,
        country: c.country,
        city: null,
      }));
    return {
      total: data.total ?? 0,
      located: data.located ?? 0,
      countries,
      points,
    };
  }

  // ── Chargement des utilisateurs en ligne (léger, fréquent) ────────────────
  const loadOnline = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    if (!isVisibleRef.current) return; // on ne martèle pas la base si onglet caché
    const { data, error } = await supabase.rpc('admin_online_users');
    if (error) {
      logger.warn('loadOnline failed', { error: error.message });
      return;
    }
    setOnlineUsers(safeArray<OnlineUser>(data));
  }, []);
  // Use a safe fallback for email and username during render.
  function userDisplayName(user: OnlineUser): string {
    if (user.username) return user.username;
    if (typeof user.email === 'string' && user.email.includes('@')) {
      return user.email.split('@')[0];
    }
    return 'Utilisateur';
  }
  // ── Chargement initial + polling intelligent ─────────────────────────────
  useEffect(() => {
    void load();
    void loadOnline();

    // Polling des utilisateurs en ligne toutes les 10s (et non 3s)
    // — c'est suffisant pour du "temps réel" administrateur et économise Supabase.
    const onlineId = window.setInterval(() => void loadOnline(), 10_000);

    // Suspend le polling quand l'onglet est caché, le reprend au retour
    const onVis = (): void => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (isVisibleRef.current) {
        void loadOnline(); // refresh immédiat au retour
      }
    };
    document.addEventListener('visibilitychange', onVis);

    // ── Supabase Realtime : écoute des mises à jour de profils ─────────────
    // Quand un utilisateur fait un heartbeat, last_seen_at est mis à jour.
    // On écoute ces updates pour rafraîchir la liste en ligne instantanément.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    if (supabase) {
      channel = supabase
        .channel('admin-realtime')
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles' },
          () => {
            // Un profil a été mis à jour (heartbeat probable) → refresh léger
            void loadOnline();
          },
        )
        .subscribe();
    }

    return () => {
      window.clearInterval(onlineId);
      document.removeEventListener('visibilitychange', onVis);
      if (channel) supabase?.removeChannel(channel);
    };
  }, [load, loadOnline]);

  // ── Export CSV (sécurisé contre l'injection de formules) ──────────────────
  function exportCsv(): void {
    const header = 'username,email,pays,code_pays,ville,ip,inscrit,derniere_activite,role\n';
    const rows = users
      .map((u) =>
        [
          csvEscape(u.username),
          csvEscape(u.email),
          csvEscape(u.country),
          csvEscape(u.country_code),
          csvEscape(u.city),
          csvEscape(u.ip),
          csvEscape(u.created_at),
          csvEscape(u.last_seen_at),
          csvEscape(u.role),
        ].join(','),
      )
      .join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aonoseke-utilisateurs-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Libère la mémoire ( corrige la fuite du code original )
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Suppression utilisateur (avec garde-fou anti auto-suppression) ───────
  async function deleteUser(id: string, username: string): Promise<void> {
    if (!supabase) return;
    if (id === user.id) {
      window.alert('Action interdite : vous ne pouvez pas supprimer votre propre compte administrateur.');
      return;
    }
    const confirmText =
      `Supprimer définitivement « ${username} » ?\n\n` +
      `Cette action est IRRÉVERSIBLE :\n` +
      `  · Compte auth.users supprimé\n` +
      `  · Profil, activité et favoris effacés (cascade)\n` +
      `  · Action journalisée dans admin_audit_log\n\n` +
      `Confirmez en cliquant sur OK.`;
    if (!window.confirm(confirmText)) return;

    const { error: err } = await supabase.rpc('admin_delete_user', { target: id });
    if (err) {
      window.alert('Suppression impossible : ' + err.message);
      return;
    }
    // Rafraîchit immédiatement
    void load();
    void loadOnline();
  }

  // ── KPI cards (carte premium supprimée, remplacée par CTR pub) ───────────
  const ctr7d = stats && stats.ad_impressions_7d > 0
    ? ((stats.ad_clicks_7d / stats.ad_impressions_7d) * 100).toFixed(2)
    : '0,00';

  const cards = stats ? [
    { icon: <Users size={18} />,      label: 'Inscrits (total)',       value: safeNumber(stats.total_users).toLocaleString('fr-FR'),       hi: true },
    { icon: <Activity size={18} />,   label: 'Actifs · 24h',           value: safeNumber(stats.active_24h).toLocaleString('fr-FR') },
    { icon: <Activity size={18} />,   label: 'Actifs · 7 jours',       value: safeNumber(stats.active_7d).toLocaleString('fr-FR') },
    { icon: <Activity size={18} />,   label: 'Actifs · 30 jours',      value: safeNumber(stats.active_30d).toLocaleString('fr-FR') },
    { icon: <TrendingUp size={18} />, label: "Nouveaux · aujourd'hui", value: safeNumber(stats.new_today).toLocaleString('fr-FR') },
    { icon: <TrendingUp size={18} />, label: 'Nouveaux · 7 jours',     value: safeNumber(stats.new_7d).toLocaleString('fr-FR') },
    { icon: <Zap size={18} />,        label: 'Sessions · 7j',          value: safeNumber(stats.sessions_7d).toLocaleString('fr-FR') },
    { icon: <Eye size={18} />,        label: 'Vues chaînes · 7j',      value: safeNumber(stats.channel_views_7d).toLocaleString('fr-FR') },
    { icon: <Eye size={18} />,        label: 'Impressions pub · 7j',  value: safeNumber(stats.ad_impressions_7d).toLocaleString('fr-FR') },
    { icon: <Target size={18} />,     label: 'CTR pub · 7j',           value: `${ctr7d} %`,                                    hi: true },
  ] : [];

  return (
    <div className="admin">
      {/* En-tête */}
      <div className="admin-header">
        <div className="admin-title">
          <h2>{activeTab === 'audience' ? 'Tableau de bord — Administration' : 'Gestion publicitaire'}</h2>
          <span>
            {activeTab === 'audience'
              ? 'Audience & statistiques pour annonceurs'
              : 'Plateforme multi-annonceurs · rotation · anti-fraude'}
          </span>
        </div>
        <div className="admin-actions admin-no-print">
          {activeTab === 'audience' && (
            <>
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
            </>
          )}
          <button className="admin-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Onglets de navigation */}
      <div className="admin-tabs" role="tablist">
        <button
          className={`admin-tab${activeTab === 'audience' ? ' active' : ''}`}
          onClick={() => setActiveTab('audience')}
          role="tab"
          aria-selected={activeTab === 'audience'}
        >
          <Radio size={14} /> Audience
        </button>
        <button
          className={`admin-tab${activeTab === 'ads' ? ' active' : ''}`}
          onClick={() => setActiveTab('ads')}
          role="tab"
          aria-selected={activeTab === 'ads'}
        >
          <Megaphone size={14} /> Publicité
        </button>
      </div>

      {activeTab === 'ads' ? (
        <AdManagementContent />
      ) : (
        <>
          {/* Bandeau temps réel */}
          <div className="admin-realtime-bar">
            <span className="rt-pulse" aria-hidden="true" />
            <span className="rt-label">Temps réel actif</span>
            <span className="rt-sep" aria-hidden="true">·</span>
            <span className="rt-online-count">
              {onlineUsers.length} utilisateur{onlineUsers.length > 1 ? 's' : ''} en ligne
            </span>
            {lastUpdate && (
              <>
                <span className="rt-sep" aria-hidden="true">·</span>
                <span className="rt-last-update">
                  Dernière synchro : {lastUpdate.toLocaleTimeString('fr-FR')}
                </span>
              </>
            )}
          </div>

          {loading ? (
            <div className="admin-loading"><div className="spinner" /><p>Chargement des statistiques…</p></div>
          ) : error ? (
            <div className="admin-error"><p>{error}</p></div>
          ) : (
            <div className="admin-body">

              {/* ── Panneau utilisateurs en ligne (temps réel) ─────────────── */}
              <OnlineUsersPanel users={onlineUsers} loading={loading} />

          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div className="admin-cards">
            {cards.map((c, i) => (
              <div key={i} className={`admin-card${c.hi ? ' admin-card--hi' : ''}`}>
                <div className="admin-card-icon">{c.icon}</div>
                <div className="admin-card-value">{c.value}</div>
                <div className="admin-card-label">{c.label}</div>
              </div>
            ))}
          </div>

          {/* ── Engagement ─────────────────────────────────────────────── */}
          {eng && (
            <div className="admin-eng">
              <div className="eng-metric">
                <Clock size={16} />
                <b>{eng.avg_min_per_active_day}</b> min / jour actif
              </div>
              <div className="eng-metric"><b>{eng.dau.toLocaleString('fr-FR')}</b> actifs aujourd'hui</div>
              <div className="eng-metric"><b>{eng.wau.toLocaleString('fr-FR')}</b> actifs · 7j</div>
              <div className="eng-metric"><b>{eng.mau.toLocaleString('fr-FR')}</b> actifs · 30j</div>
              <div className="eng-metric"><b>{eng.total_min_today.toLocaleString('fr-FR')}</b> min cumulées aujourd'hui</div>
            </div>
          )}

          {/* ── Répartition mondiale ──────────────────────────────────── */}
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
                <ErrorBoundary fallback={<WorldMap points={geo?.points ?? []} />}>
                  <Suspense fallback={<WorldMap points={geo?.points ?? []} />}>
                    <MapboxMap points={geo?.points ?? []} token={MAPBOX_TOKEN} />
                  </Suspense>
                </ErrorBoundary>
              ) : (
                <WorldMap points={geo?.points ?? []} />
              )}
              <div className="admin-geo-list">
                {geo && geo.countries.length > 0 ? (
                  geo.countries.slice(0, 8).map((c, i) => (
                    <div key={`${c.country_code ?? ''}-${i}`} className="geo-row">
                      <span className="geo-flag">{flagEmoji(c.country_code)}</span>
                      <span className="geo-country">{c.country}</span>
                      <span className="geo-count">{c.count.toLocaleString('fr-FR')}</span>
                    </div>
                  ))
                ) : (
                  <p className="geo-empty">
                    Aucune localisation pour l'instant. Elles apparaîtront dès les premières connexions.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ── Heatmap (heures de pointe) — version pro ───────────────── */}
          <div className="admin-table-wrap">
            <h3 className="admin-table-title">
              <Clock size={15} /> Heures de pointe (30 derniers jours)
            </h3>
            <Heatmap cells={heat} />
          </div>

          {/* ── Affinité contenu / âge / appareils / segments ─────────── */}
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

          {/* ── Table des utilisateurs récents ─────────────────────────── */}
          <div className="admin-table-wrap admin-no-print">
            <h3 className="admin-table-title">
              Utilisateurs récents ({users.length})
            </h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Statut</th>
                  <th>Utilisateur</th>
                  <th>Email</th>
                  <th>Pays</th>
                  <th>Ville</th>
                  <th>IP</th>
                  <th>Inscrit</th>
                  <th>Dernière activité</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const online = isOnline(u.last_seen_at);
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className={`u-dot${online ? ' on' : ''}`} aria-hidden="true" />
                        {online ? 'En ligne' : 'Hors ligne'}
                      </td>
                      <td className="u-name">
                        {safeDisplayName(u)}
                        {u.role === 'admin' && <span className="u-admin">ADMIN</span>}
                      </td>
                      <td className="u-email">{safeString(u.email)}</td>
                      <td>
                        {u.country ? (
                          <><span className="u-flag">{flagEmoji(u.country_code)}</span> {safeString(u.country)}</>
                        ) : '—'}
                      </td>
                      <td>{safeString(u.city) || '—'}</td>
                      <td className="u-ip">{u.ip ?? '—'}</td>
                      <td>{fmtDate(u.created_at)}</td>
                      <td>
                        <div className="u-last-activity">
                          <div>{fmtDate(u.last_seen_at)}</div>
                          <div className="u-time-ago">{fmtTimeAgo(u.last_seen_at)}</div>
                        </div>
                      </td>
                      <td>
                        {u.role !== 'admin' && u.id !== user.id && (
                          <button
                            className="u-del"
                            onClick={() => void deleteUser(u.id, u.username || u.email)}
                            title="Supprimer cet utilisateur"
                            aria-label={`Supprimer ${u.username || u.email}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr><td colSpan={9} className="u-empty">Aucun utilisateur inscrit pour l'instant.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
