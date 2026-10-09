import { useEffect, useState, useCallback, useRef, useMemo, lazy, Suspense } from 'react';
import {
  Users, Activity, TrendingUp, Eye, RefreshCw, X, Download,
  FileDown, Globe, Clock, Layers, Trash2, Radio, Zap, Target, Megaphone, CalendarDays,
} from 'lucide-react';
import { supabase, rpc } from '../lib/supabaseClient.ts';
import { logger } from '../utils/logger.ts';
import { WorldMap, type GeoPoint } from './WorldMap.tsx';
import { Heatmap, type HeatCell } from './Heatmap.tsx';
import { AdManagementContent } from './AdManagementDashboard.tsx';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import type { AuthUser } from '../hooks/useAuth.ts';
import { AiAdCalendar } from './regie/AiAdCalendar.tsx';
import { AgentConsole } from './regie/AgentConsole.tsx';
import { OnlineUsersPanel } from './admin/OnlineUsersPanel.tsx';
import { LiveDevicesPanel } from './admin/LiveDevicesPanel.tsx';
import { BarList } from './admin/BarList.tsx';
import {
  fmtDate, fmtTimeAgo, isOnline, flagEmoji, csvEscape, deviceLabel, fmtCtr, fmtNumber, fmtShare, DASHBOARD_TZ,
} from './admin/dashboardFormat.ts';
import type { JSX } from 'react';

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
  initialTab?: 'audience' | 'ads' | 'regie';
}

type AdminTab = 'audience' | 'ads' | 'regie';

/** Nombre de lignes demandées à admin_recent_users (la base borne à 500). */
const RECENT_USERS_LIMIT = 100;
/** Rafraîchissement des statistiques (silencieux) et de la liste « en ligne ». */
const STATS_REFRESH_MS = 60_000;
const ONLINE_REFRESH_MS = 10_000;
/** Noms des panneaux, dans l'ordre des appels de load(). */
const PANEL_NAMES = ['Indicateurs', 'Utilisateurs', 'Répartition mondiale', 'Engagement', 'Heures de pointe', 'Contenus préférés', 'Tranches d’âge', 'Appareils', 'Segments'] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeDisplayName(user: OnlineUser | RecentUser): string {
  const username = safeString(user.username);
  if (username) return username;
  const email = safeString(user.email);
  if (email.includes('@')) return email.split('@')[0] ?? email;
  if (email.length > 0) return email;
  return 'Utilisateur';
}

function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Les RPC « returns table » renvoient un tableau : on prend la 1re ligne. */
function firstRow(data: unknown): unknown {
  return Array.isArray(data) ? (data as unknown[])[0] : data;
}

function safeNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function safeString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export default function AdminDashboard({ user, onClose, initialTab = 'audience' }: AdminDashboardProps): JSX.Element | null {
  // Garde-fou de sécurité : si l'utilisateur courant n'est pas admin,
  // on ne rend rien. La sécurité côté Supabase (RPC security_definer +
  // is_admin()) reste la source de vérité, ce n'est qu'un garde-fou UI.
  
  // DEBUG: Log complet pour diagnostic
  const userRole = user?.role;

  if (!user || userRole !== 'admin') {
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

  return (
    <ErrorBoundary fallback={<AdminRenderFallback />}>
      <AdminDashboardInner user={user} onClose={onClose} initialTab={initialTab} />
    </ErrorBoundary>
  );
}

function AdminRenderFallback(): JSX.Element {
  return (
    <div className="admin admin-render-fallback" role="alert" style={{ background: 'var(--void)', color: 'var(--text-1)', padding: 24 }}>
      <h2>Erreur d'affichage — Tableau de bord</h2>
      <p>Une erreur est survenue lors du rendu du tableau de bord. Fermez et rouvrez l'admin ou rechargez la page.</p>
      <button type="button" className="admin-btn" onClick={() => { window.location.reload(); }}>Recharger</button>
    </div>
  );
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
  const [loading, setLoading] = useState(true);        // 1er chargement uniquement (spinner plein écran)
  const [refreshing, setRefreshing] = useState(false); // actualisation en cours (icône qui tourne, sans effacer l'écran)
  const [error, setError] = useState('');
  const [failedPanels, setFailedPanels] = useState<string[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Référence pour tracker la visibilité de l'onglet (économie de requêtes)
  const isVisibleRef = useRef<boolean>(document.visibilityState === 'visible');

  // ── Chargement complet des données ────────────────────────────────────────
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

  const load = useCallback(async (opts: { silent?: boolean } = {}): Promise<void> => {
    if (!supabase) {
      setError('Backend non configuré');
      setLoading(false);
      return;
    }
    if (!opts.silent) setLoading(true);
    setRefreshing(true);
    try {
      // allSettled : si UNE fonction SQL échoue, les autres panneaux restent affichés.
      const settled = await Promise.allSettled([
        rpc('admin_stats'),
        rpc('admin_recent_users', { lim: RECENT_USERS_LIMIT }),
        rpc('admin_geo_stats'),
        rpc('admin_engagement'),
        rpc('admin_activity_heatmap'),
        rpc('admin_content_affinity'),
        rpc('admin_age_distribution'),
        rpc('admin_device_split'),
        rpc('admin_segments'),
      ]);
      const res = settled.map((r) =>
        r.status === 'fulfilled'
          ? { data: r.value.data, error: r.value.error }
          : { data: null, error: { message: String(r.reason), code: '' } },
      );
      const [s, u, g, e, h, c, a, d, seg] = res;

      const denied = res.some((r) => r.error && (r.error.message.includes('administrateur') || r.error.code === '42501'));
      if (denied) {
        setError("Accès refusé : cette page est réservée aux administrateurs.");
        return;
      }
      const failed = PANEL_NAMES.filter((_, i) => res[i]?.error);
      if (failed.length === res.length) {
        setError('Erreur lors du chargement des statistiques. Réessayez.');
        return;
      }
      setError('');
      setFailedPanels(failed);
      failed.forEach((name) => logger.warn('admin panel failed', { panel: name }));

      // admin_stats / admin_geo_stats / admin_engagement sont des RPC "returns table"
      // -> Supabase renvoie un TABLEAU [{...}] : on prend la 1re ligne.
      if (!s?.error) {
        const row = firstRow(s?.data);
        setStats(row && typeof row === 'object' ? (row as Stats) : null);
      }
      if (!u?.error) setUsers(safeArray<RecentUser>(u?.data));
      if (!g?.error) setGeo(parseGeo(firstRow(g?.data)));
      if (!e?.error) {
        const row = firstRow(e?.data);
        setEng(row && typeof row === 'object' ? (row as Engagement) : null);
      }
      if (!h?.error) setHeat(safeArray<HeatCell>(h?.data));
      if (!c?.error) setContent(safeArray<{ category: string; count: number }>(c?.data).map((x) => ({ label: safeString(x.category), count: safeNumber(x.count) })));
      if (!a?.error) setAges(safeArray<{ age_range: string; count: number }>(a?.data).map((x) => ({ label: safeString(x.age_range), count: safeNumber(x.count) })));
      if (!d?.error) setDevices(safeArray<{ device: string; count: number }>(d?.data).map((x) => ({ label: deviceLabel(safeString(x.device).toLowerCase()) === '—' ? 'Inconnu' : deviceLabel(safeString(x.device).toLowerCase()), count: safeNumber(x.count) })));
      if (!seg?.error) setSegments(safeArray<NamedStat>(seg?.data).map((x) => ({ label: safeString(x.label), count: safeNumber(x.count) })));
      setLastUpdate(new Date());
    } catch (err) {
      logger.error('admin load failed', err as Error);
      setError('Erreur lors du chargement des statistiques. Réessayez.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // ── Parsing de la géo (la RPC renvoie { total, located, countries: jsonb }) ─

  // ── Chargement des utilisateurs en ligne (léger, fréquent) ────────────────
  const loadOnline = useCallback(async (): Promise<void> => {
    if (!supabase) return;
    if (!isVisibleRef.current) return; // on ne martèle pas la base si onglet caché
    const { data, error } = await rpc('admin_online_users');
    if (error) {
      logger.warn('loadOnline failed', { error: error.message });
      return;
    }
    try {
      setOnlineUsers(safeArray<OnlineUser>(data));
    } catch (err) {
      logger.error('Failed to set online users', err as Error);
      setOnlineUsers([]);
    }
  }, []);
  // ── Chargement initial + actualisation automatique ───────────────────────
  // La liste « en ligne » est relue toutes les 10 s, les statistiques toutes les 60 s,
  // silencieusement (sans effacer l'écran) et seulement quand l'onglet est visible.
  // NB : l'ancien abonnement Realtime sur `profiles` a été retiré : la politique RLS
  // « own profile read » ne laisse l'admin voir que SA propre ligne, il ne recevait donc
  // jamais les mises à jour des autres utilisateurs — mais déclenchait un rechargement
  // complet à chacun de ses propres battements.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- chargement/initialisation au montage : le setState est voulu
    void load();
    void loadOnline();

    const onlineId = window.setInterval(() => void loadOnline(), ONLINE_REFRESH_MS);
    const statsId = window.setInterval(() => {
      if (isVisibleRef.current) void load({ silent: true });
    }, STATS_REFRESH_MS);

    // Onglet caché : on suspend ; au retour, rafraîchissement immédiat.
    const onVis = (): void => {
      isVisibleRef.current = document.visibilityState === 'visible';
      if (isVisibleRef.current) {
        void loadOnline();
        void load({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      window.clearInterval(onlineId);
      window.clearInterval(statsId);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [load, loadOnline]);

  // Ensemble des IDs actuellement en ligne (mise à jour par `loadOnline`).
  // Utilisé pour afficher un état 'En ligne' cohérent dans la table des
  // utilisateurs récents, même si `admin_recent_users` a des timestamps
  // légèrement décalés par rapport au heartbeat.
  const onlineIds = useMemo(() => new Set(onlineUsers.map((o) => o.id)), [onlineUsers]);

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
    a.download = `aonoseke-derniers-actifs-${new Date().toLocaleDateString('sv-SE', { timeZone: DASHBOARD_TZ })}.csv`;
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
      `  · Profil et temps d'activité effacés (cascade)\n` +
      `  · Les favoris, enregistrés dans l'appareil de l'utilisateur, ne sont pas concernés\n` +
      `  · Action journalisée dans admin_audit_log\n\n` +
      `Confirmez en cliquant sur OK.`;
    if (!window.confirm(confirmText)) return;

    const { error: err } = await rpc('admin_delete_user', { target: id });
    if (err) {
      window.alert('Suppression impossible : ' + err.message);
      return;
    }
    // Rafraîchit immédiatement
    void load();
    void loadOnline();
  }

  // ── KPI cards (carte premium supprimée, remplacée par CTR pub) ───────────
  const ctr7d = stats ? fmtCtr(safeNumber(stats.ad_clicks_7d), safeNumber(stats.ad_impressions_7d)) : '—';

  const n = (v: unknown): string => fmtNumber(safeNumber(v));
  const cards = stats ? [
    { icon: <Users size={18} />,      label: 'Inscrits (total)',       hint: 'tous les comptes créés',                              value: n(stats.total_users), hi: true },
    { icon: <Activity size={18} />,   label: 'Actifs · 24 h',          hint: 'vus dans les dernières 24 h',                         value: n(stats.active_24h) },
    { icon: <Activity size={18} />,   label: 'Actifs · 7 jours',       hint: 'vus dans les 7 derniers jours',                       value: n(stats.active_7d) },
    { icon: <Activity size={18} />,   label: 'Actifs · 30 jours',      hint: 'vus dans les 30 derniers jours',                      value: n(stats.active_30d) },
    { icon: <TrendingUp size={18} />, label: "Nouveaux · aujourd'hui", hint: 'inscrits depuis minuit (heure de Kinshasa)',          value: n(stats.new_today) },
    { icon: <TrendingUp size={18} />, label: 'Nouveaux · 7 jours',     hint: 'inscrits sur les 7 derniers jours',                   value: n(stats.new_7d) },
    { icon: <Zap size={18} />,        label: 'Sessions · 7 jours',     hint: 'ouvertures de l’application',                         value: n(stats.sessions_7d) },
    { icon: <Eye size={18} />,        label: 'Vues chaînes · 7 jours', hint: 'chaînes lancées',                                     value: n(stats.channel_views_7d) },
    { icon: <Eye size={18} />,        label: 'Impressions pub · 7 jours', hint: 'pubs affichées à l’écran',                         value: n(stats.ad_impressions_7d) },
    { icon: <Target size={18} />,     label: 'CTR pub · 7 jours',      hint: `${n(stats.ad_clicks_7d)} clics ÷ ${n(stats.ad_impressions_7d)} impressions`, value: ctr7d, hi: true },
  ] : [];

  return (
      <div className="admin">
        {/* En-tête */}
        <div className="admin-header">
        <div className="admin-title">
          <h2>{activeTab === 'audience' ? 'Tableau de bord — Administration' : activeTab === 'regie' ? 'Régie IA — calendrier' : 'Gestion publicitaire'}</h2>
          <span>
            {activeTab === 'audience'
              ? 'Audience & statistiques pour annonceurs'
              : activeTab === 'regie'
                ? 'Planifiez vos diffusions en parlant à l’IA'
                : 'Plateforme multi-annonceurs · rotation · anti-fraude'}
          </span>
        </div>
        <div className="admin-actions admin-no-print">
          {activeTab === 'audience' && (
            <>
              <button className="admin-btn" onClick={() => void load({ silent: true })} disabled={refreshing}>
                <RefreshCw size={14} className={refreshing ? 'spin-icon' : ''} /> Actualiser
              </button>
              <button className="admin-btn" onClick={() => window.print()}>
                <FileDown size={14} /> Media Kit PDF
              </button>
              {users.length > 0 && (
                <button className="admin-btn" onClick={exportCsv}>
                  <Download size={14} /> Export CSV ({users.length} lignes)
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
        <button
          className={`admin-tab${activeTab === 'regie' ? ' active' : ''}`}
          onClick={() => setActiveTab('regie')}
          role="tab"
          aria-selected={activeTab === 'regie'}
        >
          <CalendarDays size={14} /> Régie
        </button>
      </div>

      {activeTab === 'ads' ? (
        <AdManagementContent />
      ) : activeTab === 'regie' ? (
        <>
          <AgentConsole />
          <AiAdCalendar />
        </>
      ) : (
        <>
          {/* Bandeau d'actualisation automatique */}
          <div className="admin-realtime-bar">
            <span className="rt-pulse" aria-hidden="true" />
            <span className="rt-label">Actualisation automatique</span>
            <span className="rt-sep" aria-hidden="true">·</span>
            <span className="rt-online-count">
              {onlineUsers.length} utilisateur{onlineUsers.length > 1 ? 's' : ''} en ligne
            </span>
            <span className="rt-sep" aria-hidden="true">·</span>
            <span className="rt-last-update">en ligne : toutes les 10 s · statistiques : toutes les 60 s · heure de Kinshasa</span>
            {lastUpdate && (
              <>
                <span className="rt-sep" aria-hidden="true">·</span>
                <span className="rt-last-update">
                  Dernière synchro : {lastUpdate.toLocaleTimeString('fr-FR', { timeZone: DASHBOARD_TZ })}
                </span>
              </>
            )}
          </div>

          {failedPanels.length > 0 && (
            <div className="admin-warn" role="alert">
              Certains panneaux n’ont pas pu être chargés : <b>{failedPanels.join(', ')}</b>. Les autres sont à jour.
              Si le problème persiste, exécutez la dernière migration SQL (<code>20261009100000_admin_dashboard_consistency.sql</code>).
            </div>
          )}

          {loading ? (
            <div className="admin-loading"><div className="spinner" /><p>Chargement des statistiques…</p></div>
          ) : error ? (
            <div className="admin-error"><p>{error}</p></div>
          ) : (
            <div className="admin-body">

              {/* ── Panneau utilisateurs en ligne (temps réel) ─────────────── */}
              <OnlineUsersPanel users={onlineUsers} loading={loading} />

              {/* ── Appareils connectés en direct (avec IP) — démo incluse ── */}
              <LiveDevicesPanel />

          {/* ── KPI cards ─────────────────────────────────────────────── */}
          <div className="admin-cards">
            {cards.map((c, i) => (
              <div key={i} className={`admin-card${c.hi ? ' admin-card--hi' : ''}`}>
                <div className="admin-card-icon">{c.icon}</div>
                <div className="admin-card-value">{c.value}</div>
                <div className="admin-card-label">{c.label}</div>
                <div className="admin-card-hint">{c.hint}</div>
              </div>
            ))}
          </div>

          {/* ── Engagement ─────────────────────────────────────────────── */}
          {eng && (
            <div className="admin-eng">
              <div className="eng-metric">
                <Clock size={16} />
                <b>{fmtNumber(safeNumber(eng.avg_min_per_active_day), 1)}</b> min / utilisateur actif / jour
                <span className="eng-hint">moyenne sur 30 jours</span>
              </div>
              <div className="eng-metric">
                <b>{fmtNumber(safeNumber(eng.dau))}</b> actifs aujourd'hui
                <span className="eng-hint">depuis minuit, heure de Kinshasa</span>
              </div>
              <div className="eng-metric">
                <b>{fmtNumber(safeNumber(eng.total_min_today))}</b> min cumulées aujourd'hui
                <span className="eng-hint">tous utilisateurs confondus</span>
              </div>
            </div>
          )}

          {/* ── Répartition mondiale ──────────────────────────────────── */}
          <div className="admin-geo">
            <div className="admin-geo-head">
              <h3 className="admin-table-title"><Globe size={15} /> Répartition mondiale</h3>
              {geo && (
                <span className="admin-geo-sub">
                  {fmtNumber(geo.located)} / {fmtNumber(geo.total)} inscrits localisés ({fmtShare(geo.located, geo.total)}) · {geo.countries.length} pays · top 8 ci-dessous
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
                      <span className="geo-count">{fmtNumber(c.count)} <span className="geo-share">({fmtShare(c.count, geo.located)})</span></span>
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
              <Clock size={15} /> Heures de pointe · 30 derniers jours
            </h3>
            <p className="admin-panel-sub">Minutes d'activité cumulées par jour et par heure · heure de Kinshasa</p>
            <Heatmap cells={heat} />
          </div>

          {/* ── Affinité contenu / âge / appareils / segments ─────────── */}
          <div className="admin-panels">
            <div className="admin-panel">
              <h3 className="admin-table-title"><Eye size={15} /> Groupes de chaînes les plus regardés</h3>
              <p className="admin-panel-sub">Chaînes lancées sur 30 jours · top 10</p>
              <BarList items={content} />
            </div>
            <div className="admin-panel">
              <h3 className="admin-table-title"><Layers size={15} /> Segments d'audience</h3>
              <p className="admin-panel-sub">Chaque inscrit dans un seul segment · total = inscrits</p>
              <BarList items={segments} />
            </div>
            <div className="admin-panel">
              <h3 className="admin-table-title"><Users size={15} /> Tranches d'âge</h3>
              <p className="admin-panel-sub">Déclarées à l'inscription (facultatif)</p>
              <BarList items={ages} />
            </div>
            <div className="admin-panel">
              <h3 className="admin-table-title"><Activity size={15} /> Appareils</h3>
              <p className="admin-panel-sub">Dernier appareil détecté par inscrit</p>
              <BarList items={devices} />
            </div>
          </div>

          {/* ── Table des utilisateurs récents ─────────────────────────── */}
          <div className="admin-table-wrap admin-no-print">
            <h3 className="admin-table-title">
              Derniers utilisateurs actifs ({users.length})
            </h3>
            <p className="admin-panel-sub">Triés par dernière activité · {RECENT_USERS_LIMIT} maximum · « en ligne » = signe de vie il y a moins de 90 s</p>
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
                  // Considère l'utilisateur en ligne si présent dans la source
                  // temps réel (`onlineUsers`) ou si son `last_seen_at` est
                  // récent selon le seuil local.
                  const online = onlineIds.has(u.id) || isOnline(u.last_seen_at);
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
