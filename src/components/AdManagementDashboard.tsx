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
  Building2, Target, TrendingUp, Eye, MousePointerClick, Download,
  Crown, AlertCircle,
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

interface AdManagementDashboardProps {
  user: AuthUser | null;
  onClose: () => void;
}

type Tab = 'advertisers' | 'campaigns';

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return '—';
  try {
    return new Date(s).toLocaleDateString('fr-FR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return s;
  }
}

function fmtNumber(n: number): string {
  return n.toLocaleString('fr-FR');
}

function fmtPercent(n: number): string {
  return `${n.toFixed(2)} %`.replace('.', ',');
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Actif', paused: 'En pause', archived: 'Archivé',
    draft: 'Brouillon', ended: 'Terminé',
  };
  return labels[status] ?? status;
}

function statusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'var(--lime, #84cc16)',
    paused: 'var(--accent, #C98A1B)',
    archived: 'var(--text-3)',
    draft: 'var(--text-3)',
    ended: 'var(--text-3)',
  };
  return colors[status] ?? 'var(--text-3)';
}

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  const escaped = s.replace(/"/g, '""');
  const needsQuote = /[,\"\n\r]/.test(s) || /^[=+\-@\t\r]/.test(s);
  const quoted = needsQuote ? `"${escaped}"` : escaped;
  if (/^[=+\-@]/.test(quoted)) return `'${quoted}`;
  return quoted;
}

function downloadCsv(filename: string, header: string, rows: string[][]): void {
  const csv = header + '\n' + rows.map((r) => r.map(csvEscape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Sous-composant : formulaire annonceur ─────────────────────────────────

function AdvertiserForm({
  initial,
  onSubmit,
  onCancel,
}: {
  initial?: Partial<Advertiser>;
  onSubmit: (data: { name: string; contact_name: string; contact_email: string; phone: string; logo_url: string; notes: string }) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [contactName, setContactName] = useState(initial?.contact_name ?? '');
  const [contactEmail, setContactEmail] = useState(initial?.contact_email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [logoUrl, setLogoUrl] = useState(initial?.logo_url ?? '');
  const [notes, setNotes] = useState(initial?.notes ?? '');

  return (
    <form
      className="ad-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ name, contact_name: contactName, contact_email: contactEmail, phone, logo_url: logoUrl, notes });
      }}
    >
      <div className="ad-form-row">
        <label>
          <span>Nom *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="A.Onoseke House Investment" />
        </label>
        <label>
          <span>Contact</span>
          <input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Nom du contact" />
        </label>
      </div>
      <div className="ad-form-row">
        <label>
          <span>Email contact</span>
          <input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@société.com" />
        </label>
        <label>
          <span>Téléphone</span>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+243 ..." />
        </label>
      </div>
      <label>
        <span>URL logo</span>
        <input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} placeholder="https://..." />
      </label>
      <label>
        <span>Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Notes internes (conditions, tarifs...)" />
      </label>
      <div className="ad-form-actions">
        <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="ad-btn ad-btn--primary">Enregistrer</button>
      </div>
    </form>
  );
}

// ── Sous-composant : formulaire campagne ──────────────────────────────────

function CampaignForm({
  advertisers,
  initial,
  onSubmit,
  onCancel,
}: {
  advertisers: Advertiser[];
  initial?: Partial<Campaign>;
  onSubmit: (data: {
    advertiser_id: string;
    name: string;
    type: CampaignType;
    content: CampaignContent;
    weight: number;
    frequency_cap_per_user: number;
  }) => void;
  onCancel: () => void;
}) {
  const [advertiserId, setAdvertiserId] = useState(initial?.advertiser_id ?? advertisers[0]?.id ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [type, setType] = useState<CampaignType>(initial?.type ?? 'preroll');
  const [title, setTitle] = useState(initial?.content?.title ?? '');
  const [subtitle, setSubtitle] = useState(initial?.content?.subtitle ?? '');
  const [cta, setCta] = useState(initial?.content?.cta ?? '');
  const [url, setUrl] = useState(initial?.content?.url ?? '');
  const [eyebrow, setEyebrow] = useState(initial?.content?.eyebrow ?? '');
  const [legal, setLegal] = useState(initial?.content?.legal ?? '');
  const [weight, setWeight] = useState(initial?.weight ?? 10);
  const [freqCap, setFreqCap] = useState(initial?.frequency_cap_per_user ?? 3);

  const activeAdvertisers = advertisers.filter((a) => a.status === 'active');

  return (
    <form
      className="ad-form"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          advertiser_id: advertiserId,
          name,
          type,
          content: { title, subtitle, cta, url, eyebrow, legal },
          weight,
          frequency_cap_per_user: freqCap,
        });
      }}
    >
      <div className="ad-form-row">
        <label>
          <span>Annonceur *</span>
          <select value={advertiserId} onChange={(e) => setAdvertiserId(e.target.value)} required>
            <option value="">— Sélectionner —</option>
            {activeAdvertisers.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>
        <label>
          <span>Nom campagne *</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Alpha Import — Découverte" />
        </label>
      </div>
      <div className="ad-form-row">
        <label>
          <span>Type</span>
          <select value={type} onChange={(e) => setType(e.target.value as CampaignType)}>
            <option value="preroll">Pré-roll</option>
            <option value="banner">Bannière</option>
            <option value="both">Pré-roll + Bannière</option>
          </select>
        </label>
        <label>
          <span>Poids (1-100)</span>
          <input type="number" min={1} max={100} value={weight} onChange={(e) => setWeight(Number(e.target.value))} />
        </label>
        <label>
          <span>Cap fréquence/jour</span>
          <input type="number" min={1} max={20} value={freqCap} onChange={(e) => setFreqCap(Number(e.target.value))} />
        </label>
      </div>
      <label>
        <span>Titre *</span>
        <input value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="La passerelle sécurisée vers le monde" />
      </label>
      <label>
        <span>Sous-titre</span>
        <input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Entre Kinshasa et les géants économiques" />
      </label>
      <div className="ad-form-row">
        <label>
          <span>Sur-titre (eyebrow)</span>
          <input value={eyebrow} onChange={(e) => setEyebrow(e.target.value)} placeholder="Facilitation d'achats · Sourcing" />
        </label>
        <label>
          <span>CTA</span>
          <input value={cta} onChange={(e) => setCta(e.target.value)} placeholder="Découvrir la plateforme" />
        </label>
      </div>
      <label>
        <span>URL de destination (avec UTM)</span>
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://...?utm_source=iptv-player&utm_medium=preroll" />
      </label>
      <label>
        <span>Mentions légales</span>
        <textarea value={legal} onChange={(e) => setLegal(e.target.value)} rows={2}
          placeholder="A.Onoseke House Investment RDC · RCCM CD/KNM/RCCM/21-A-01949 ..." />
      </label>
      <div className="ad-form-actions">
        <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel}>Annuler</button>
        <button type="submit" className="ad-btn ad-btn--primary">Enregistrer</button>
      </div>
    </form>
  );
}

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
                    <th>Poids</th>
                    <th>Cap/jour</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {camp.campaigns.map((c) => (
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
                      <td>{c.weight}</td>
                      <td>{c.frequency_cap_per_user}</td>
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
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
