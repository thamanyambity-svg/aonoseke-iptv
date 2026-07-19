/**
 * Tableau de bord de gestion des publicités multi-annonceurs.
 *
 * Permet à l'admin de :
 *   - CRUD annonceurs (création, édition, suppression, pause/archivage)
 *   - CRUD campagnes (création, édition, suppression, activation/pause)
 *   - Visualisation des métriques par campagne (impressions, clics, CTR)
 *   - Export CSV du reporting par annonceur
 *
 * Toutes les opérations passent par des RPC Supabase security_definer.
 *
 * @component AdManagementDashboard
 */
import { useState, useMemo } from 'react';
import {
  X, RefreshCw, Plus, Edit2, Trash2, Pause, Play, Megaphone,
  Building2, Target, Eye, MousePointerClick, Download,
  AlertCircle,
} from 'lucide-react';
import { useAdvertisers, type Advertiser } from '../hooks/useAdvertisers.ts';
import {
  useCampaigns,
  type Campaign,
  type CampaignType,
  type CampaignStatus,
  type CampaignContent,
} from '../hooks/useCampaigns.ts';
import { logger } from '../utils/logger.ts';
import type { AuthUser } from '../hooks/useAuth.ts';
import {
  fmtDate, fmtNumber, fmtPercent, statusLabel, statusColor, downloadCsv,
} from './admin/AdHelpers.ts';
import { AdvertiserForm } from './admin/AdvertiserForm.tsx';
import { CampaignForm } from './admin/CampaignForm.tsx';

interface AdManagementDashboardProps {
  user: AuthUser | null;
  onClose: () => void;
}

type Tab = 'advertisers' | 'campaigns';

// ── Composant principal (mode standalone — modal) ────────────────────────

export function AdManagementDashboard({ user, onClose }: AdManagementDashboardProps): JSX.Element | null {
  // Garde-fou sécurité
  if (user?.role !== 'admin') {
    logger.warn('AdManagementDashboard affiché pour un non-admin — refusé', { role: user?.role });
    return null;
  }

  return (
    <div className="admin ad-admin ad-admin--modal">
      <div className="admin-header">
        <div className="admin-title">
          <h2>Gestion publicitaire</h2>
          <span>Plateforme multi-annonceurs · rotation · anti-fraude</span>
        </div>
        <div className="admin-actions">
          <button className="admin-close" onClick={onClose} aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
      </div>
      <AdManagementInner />
    </div>
  );
}

// ── Section intégrable (pour usage dans AdminDashboard unifié) ───────────

export function AdManagementContent(): JSX.Element {
  return (
    <div className="ad-admin ad-admin--embedded">
      <AdManagementInner />
    </div>
  );
}

function AdManagementInner(): JSX.Element {
  const [tab, setTab] = useState<Tab>('advertisers');
  const [showAdvertiserForm, setShowAdvertiserForm] = useState(false);
  const [editingAdvertiser, setEditingAdvertiser] = useState<Advertiser | null>(null);
  const [showCampaignForm, setShowCampaignForm] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<Campaign | null>(null);
  const [filterAdvertiserId, setFilterAdvertiserId] = useState<string | undefined>(undefined);

  const adv = useAdvertisers();
  const camp = useCampaigns(filterAdvertiserId);

  // ── KPI globaux ─────────────────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalAdvertisers = adv.advertisers.length;
    const activeAdvertisers = adv.advertisers.filter((a) => a.status === 'active').length;
    const totalCampaigns = camp.campaigns.length;
    const activeCampaigns = camp.campaigns.filter((c) => c.status === 'active').length;
    const totalImpressions = adv.advertisers.reduce((sum, a) => sum + a.total_impressions, 0);
    const totalClicks = adv.advertisers.reduce((sum, a) => sum + a.total_clicks, 0);
    const globalCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    return { totalAdvertisers, activeAdvertisers, totalCampaigns, activeCampaigns, totalImpressions, totalClicks, globalCtr };
  }, [adv.advertisers, camp.campaigns]);

  // ── Actions ─────────────────────────────────────────────────────────────
  async function handleAdvertiserSubmit(data: {
    name: string; contact_name: string; contact_email: string; phone: string; logo_url: string; notes: string;
  }) {
    if (editingAdvertiser) {
      const { error } = await adv.update(editingAdvertiser.id, data);
      if (error) window.alert('Erreur : ' + error);
    } else {
      const { error } = await adv.create(data);
      if (error) window.alert('Erreur : ' + error);
    }
    setShowAdvertiserForm(false);
    setEditingAdvertiser(null);
  }

  async function handleCampaignSubmit(data: {
    advertiser_id: string; name: string; type: CampaignType;
    content: CampaignContent; weight: number; frequency_cap_per_user: number;
    start_at?: string; end_at?: string | null;
    impression_cap?: number | null; click_cap?: number | null;
  }) {
    if (editingCampaign) {
      const { error } = await camp.update(editingCampaign.id, data);
      if (error) window.alert('Erreur : ' + error);
    } else {
      const { error } = await camp.create(data);
      if (error) window.alert('Erreur : ' + error);
    }
    setShowCampaignForm(false);
    setEditingCampaign(null);
  }

  async function handleDeleteAdvertiser(a: Advertiser) {
    if (!window.confirm(`Supprimer l'annonceur « ${a.name} » ?\n\nToutes ses campagnes et événements seront supprimés (cascade).`)) return;
    const { error } = await adv.remove(a.id);
    if (error) window.alert('Erreur : ' + error);
  }

  async function handleDeleteCampaign(c: Campaign) {
    if (!window.confirm(`Supprimer la campagne « ${c.name} » ?`)) return;
    const { error } = await camp.remove(c.id);
    if (error) window.alert('Erreur : ' + error);
  }

  async function toggleAdvertiserStatus(a: Advertiser) {
    const newStatus = a.status === 'active' ? 'paused' : 'active';
    const { error } = await adv.update(a.id, { status: newStatus });
    if (error) window.alert('Erreur : ' + error);
  }

  async function toggleCampaignStatus(c: Campaign) {
    const newStatus: CampaignStatus = c.status === 'active' ? 'paused' : 'active';
    const { error } = await camp.update(c.id, { status: newStatus });
    if (error) window.alert('Erreur : ' + error);
  }

  function exportAdvertiserReport() {
    const rows = adv.advertisers.map((a) => [
      a.name, a.contact_email ?? '', a.phone ?? '', a.status,
      a.active_campaigns, a.total_impressions, a.total_clicks,
      a.total_impressions > 0 ? ((a.total_clicks / a.total_impressions) * 100).toFixed(2) + '%' : '0%',
    ]);
    downloadCsv(
      `aonoseke-annonceurs-${new Date().toISOString().slice(0, 10)}.csv`,
      'annonceur,email,telephone,statut,campagnes_actives,impressions,clics,ctr',
      rows,
    );
  }

  function exportCampaignReport() {
    const rows = camp.campaigns.map((c) => [
      c.advertiser_name, c.name, c.type, c.status,
      c.impressions, c.clicks, c.ctr.toFixed(2) + '%',
      c.weight, c.frequency_cap_per_user,
      fmtDate(c.start_at), fmtDate(c.end_at),
    ]);
    downloadCsv(
      `aonoseke-campagnes-${new Date().toISOString().slice(0, 10)}.csv`,
      'annonceur,campagne,type,statut,impressions,clics,ctr,poids,cap_frequence,debut,fin',
      rows,
    );
  }

  const cards = [
    { icon: <Building2 size={18} />, label: 'Annonceurs', value: `${kpis.activeAdvertisers}/${kpis.totalAdvertisers}`, hi: true },
    { icon: <Megaphone size={18} />, label: 'Campagnes actives', value: `${kpis.activeCampaigns}/${kpis.totalCampaigns}` },
    { icon: <Eye size={18} />, label: 'Impressions (total)', value: fmtNumber(kpis.totalImpressions) },
    { icon: <MousePointerClick size={18} />, label: 'Clics (total)', value: fmtNumber(kpis.totalClicks) },
    { icon: <Target size={18} />, label: 'CTR global', value: fmtPercent(kpis.globalCtr), hi: true },
  ];

  return (
    <div className="ad-admin-content">
      {/* Barre d'actions */}
      <div className="ad-section-actions-bar">
        <button className="ad-btn ad-btn--ghost" onClick={() => { void adv.load(); void camp.load(); }}>
          <RefreshCw size={14} /> Actualiser
        </button>
        <button className="ad-btn ad-btn--ghost" onClick={exportAdvertiserReport}>
          <Download size={14} /> Export annonceurs
        </button>
        <button className="ad-btn ad-btn--ghost" onClick={exportCampaignReport}>
          <Download size={14} /> Export campagnes
        </button>
      </div>

      {/* KPI cards */}
      <div className="admin-cards">
        {cards.map((c, i) => (
          <div key={i} className={`admin-card${c.hi ? ' admin-card--hi' : ''}`}>
            <div className="admin-card-icon">{c.icon}</div>
            <div className="admin-card-value">{c.value}</div>
            <div className="admin-card-label">{c.label}</div>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="ad-tabs">
        <button
          className={`ad-tab${tab === 'advertisers' ? ' active' : ''}`}
          onClick={() => setTab('advertisers')}
        >
          <Building2 size={14} /> Annonceurs ({adv.advertisers.length})
        </button>
        <button
          className={`ad-tab${tab === 'campaigns' ? ' active' : ''}`}
          onClick={() => setTab('campaigns')}
        >
          <Megaphone size={14} /> Campagnes ({camp.campaigns.length})
        </button>
      </div>

      {/* Contenu onglet */}
      <div className="ad-tab-content">
        {tab === 'advertisers' ? (
          <div className="ad-section">
            <div className="ad-section-head">
              <h3>Annonceurs</h3>
              <button
                className="ad-btn ad-btn--primary"
                onClick={() => { setEditingAdvertiser(null); setShowAdvertiserForm(true); }}
              >
                <Plus size={14} /> Nouvel annonceur
              </button>
            </div>

            {showAdvertiserForm && (
              <div className="ad-form-card">
                <h4>{editingAdvertiser ? 'Modifier l\'annonceur' : 'Nouvel annonceur'}</h4>
                <AdvertiserForm
                  initial={editingAdvertiser ?? undefined}
                  onSubmit={handleAdvertiserSubmit}
                  onCancel={() => { setShowAdvertiserForm(false); setEditingAdvertiser(null); }}
                />
              </div>
            )}

            {adv.loading ? (
              <div className="admin-loading"><div className="spinner" /><p>Chargement…</p></div>
            ) : adv.error ? (
              <div className="admin-error"><p>{adv.error}</p></div>
            ) : adv.advertisers.length === 0 ? (
              <div className="ad-empty">
                <AlertCircle size={28} />
                <p>Aucun annonceur. Cliquez sur « Nouvel annonceur » pour commencer.</p>
              </div>
            ) : (
              <table className="admin-table ad-table">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Contact</th>
                    <th>Statut</th>
                    <th>Campagnes actives</th>
                    <th>Impr.</th>
                    <th>Clics</th>
                    <th>CTR</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {adv.advertisers.map((a) => {
                    const ctr = a.total_impressions > 0 ? (a.total_clicks / a.total_impressions) * 100 : 0;
                    return (
                      <tr key={a.id}>
                        <td className="u-name">{a.name}</td>
                        <td>
                          {a.contact_email && <div className="u-email">{a.contact_email}</div>}
                          {a.phone && <div className="u-time-ago">{a.phone}</div>}
                        </td>
                        <td>
                          <span className="ad-status" style={{ color: statusColor(a.status) }}>
                            ● {statusLabel(a.status)}
                          </span>
                        </td>
                        <td>{a.active_campaigns}</td>
                        <td>{fmtNumber(a.total_impressions)}</td>
                        <td>{fmtNumber(a.total_clicks)}</td>
                        <td>{fmtPercent(ctr)}</td>
                        <td>
                          <div className="ad-row-actions">
                            <button
                              className="ad-icon-btn"
                              onClick={() => toggleAdvertiserStatus(a)}
                              title={a.status === 'active' ? 'Mettre en pause' : 'Activer'}
                              aria-label="Toggle statut"
                            >
                              {a.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                            </button>
                            <button
                              className="ad-icon-btn"
                              onClick={() => { setEditingAdvertiser(a); setShowAdvertiserForm(true); }}
                              title="Modifier"
                              aria-label="Modifier"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              className="ad-icon-btn ad-icon-btn--danger"
                              onClick={() => handleDeleteAdvertiser(a)}
                              title="Supprimer"
                              aria-label="Supprimer"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        ) : (
          <div className="ad-section">
            <div className="ad-section-head">
              <h3>Campagnes</h3>
              <div className="ad-section-actions">
                <select
                  value={filterAdvertiserId ?? ''}
                  onChange={(e) => setFilterAdvertiserId(e.target.value || undefined)}
                  className="ad-filter"
                >
                  <option value="">Tous les annonceurs</option>
                  {adv.advertisers.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
                <button
                  className="ad-btn ad-btn--primary"
                  onClick={() => { setEditingCampaign(null); setShowCampaignForm(true); }}
                  disabled={adv.advertisers.filter((a) => a.status === 'active').length === 0}
                >
                  <Plus size={14} /> Nouvelle campagne
                </button>
              </div>
            </div>

            {showCampaignForm && (
              <div className="ad-form-card">
                <h4>{editingCampaign ? 'Modifier la campagne' : 'Nouvelle campagne'}</h4>
                <CampaignForm
                  advertisers={adv.advertisers}
                  initial={editingCampaign ?? undefined}
                  onSubmit={handleCampaignSubmit}
                  onCancel={() => { setShowCampaignForm(false); setEditingCampaign(null); }}
                />
              </div>
            )}

            {camp.loading ? (
              <div className="admin-loading"><div className="spinner" /><p>Chargement…</p></div>
            ) : camp.error ? (
              <div className="admin-error"><p>{camp.error}</p></div>
            ) : camp.campaigns.length === 0 ? (
              <div className="ad-empty">
                <AlertCircle size={28} />
                <p>Aucune campagne. Créez d'abord un annonceur, puis une campagne.</p>
              </div>
            ) : (
              <table className="admin-table ad-table">
                <thead>
                  <tr>
                    <th>Campagne</th>
                    <th>Annonceur</th>
                    <th>Type</th>
                    <th>Statut</th>
                    <th>Impr.</th>
                    <th>Clics</th>
                    <th>CTR</th>
                    <th>Progression</th>
                    <th>Poids</th>
                    <th>Cap/jour</th>
                    <th>Diffusion</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {camp.campaigns.map((c) => {
                    const pct = c.impression_cap
                      ? Math.min(100, Math.round((c.impressions / c.impression_cap) * 100))
                      : null;
                    return (
                    <tr key={c.id}>
                      <td className="u-name">
                        {c.name}
                        <div className="u-time-ago">{c.content?.title ?? '—'}</div>
                      </td>
                      <td>{c.advertiser_name}</td>
                      <td>
                        <span className="ad-type-badge">{c.type}</span>
                      </td>
                      <td>
                        <span className="ad-status" style={{ color: statusColor(c.status) }}>
                          ● {statusLabel(c.status)}
                        </span>
                      </td>
                      <td>{fmtNumber(c.impressions)}</td>
                      <td>{fmtNumber(c.clicks)}</td>
                      <td>{fmtPercent(c.ctr)}</td>
                      <td>
                        {pct !== null ? (
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 90 }}
                            title={`${fmtNumber(c.impressions)} / ${fmtNumber(c.impression_cap ?? 0)} impressions`}
                          >
                            <div style={{ flex: 1, height: 6, background: 'rgba(255,255,255,0.12)', borderRadius: 3, overflow: 'hidden', minWidth: 48 }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: pct >= 100 ? '#b00020' : 'var(--accent, #C98A1B)' }} />
                            </div>
                            <span style={{ fontSize: '0.78em', color: 'var(--text-3)' }}>{pct}%</span>
                          </div>
                        ) : (
                          <span className="u-time-ago">illimité</span>
                        )}
                      </td>
                      <td>{c.weight}</td>
                      <td>{c.frequency_cap_per_user}</td>
                      <td>
                        <div className="u-time-ago" style={{ whiteSpace: 'nowrap' }}>
                          {fmtDate(c.start_at)}<br />→ {fmtDate(c.end_at)}
                        </div>
                      </td>
                      <td>
                        <div className="ad-row-actions">
                          <button
                            className="ad-icon-btn"
                            onClick={() => toggleCampaignStatus(c)}
                            title={c.status === 'active' ? 'Mettre en pause' : 'Activer'}
                            aria-label="Toggle statut"
                          >
                            {c.status === 'active' ? <Pause size={13} /> : <Play size={13} />}
                          </button>
                          <button
                            className="ad-icon-btn"
                            onClick={() => { setEditingCampaign(c); setShowCampaignForm(true); }}
                            title="Modifier"
                            aria-label="Modifier"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            className="ad-icon-btn ad-icon-btn--danger"
                            onClick={() => handleDeleteCampaign(c)}
                            title="Supprimer"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
