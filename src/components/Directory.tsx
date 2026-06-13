import { useState, useMemo, useCallback } from 'react';
import {
  Search, X, ExternalLink, RefreshCw, Star,
  AlertTriangle, Globe, ShieldCheck,
} from 'lucide-react';
import { useSites } from '../hooks/useSites.ts';
import type { StreamSite, SiteStatus } from '../hooks/useSites.ts';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/validation.ts';
import { trackEvent } from '../hooks/useAnalytics.ts';

const FAV_KEY = 'iptv-site-favorites';

function statusLabel(s: SiteStatus): string {
  switch (s) {
    case 'online':  return 'En ligne';
    case 'offline': return 'Hors ligne';
    case 'checking':return 'Vérification…';
    default:        return 'Inconnu';
  }
}

/** Teinte déterministe à partir du nom (pour le monogramme). */
function hueOf(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

/**
 * Logo monogramme : initiale sur un fond dégradé teinté par le nom.
 * Rendu homogène, instantané et sans dépendance réseau — aucun risque
 * d'image cassée ou de favicon délavé.
 */
function SiteLogo({ name }: { name: string; url: string }): JSX.Element {
  const hue = hueOf(name);
  return (
    <div
      className="site-logo site-logo--mono"
      style={{
        background: `linear-gradient(135deg, hsl(${hue} 58% 32%), hsl(${hue} 62% 15%))`,
        color: `hsl(${hue} 80% 78%)`,
        borderColor: `hsl(${hue} 50% 40% / 0.4)`,
      }}
      aria-hidden="true"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

export function Directory(): JSX.Element {
  const { sites, loading, error, checkAll, checking } = useSites();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [favs, setFavs] = useState<Set<string>>(
    () => new Set(getLocalStorageItem<string[]>(FAV_KEY, [])),
  );

  const categories = useMemo(() => {
    const set = Array.from(new Set(sites.map((s) => s.category)));
    return ['All', ...set.sort()];
  }, [sites]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return sites.filter((s) => {
      const matchCat = category === 'All' || s.category === category;
      const matchSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.category.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [sites, search, category]);

  const toggleFav = useCallback((id: string): void => {
    setFavs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setLocalStorageItem(FAV_KEY, Array.from(next));
      return next;
    });
  }, []);

  const openSite = useCallback((site: StreamSite): void => {
    trackEvent('channel_view', site.url);
    window.open(site.url, '_blank', 'noopener,noreferrer');
  }, []);

  return (
    <div className="directory">
      {/* Header bar */}
      <div className="dir-header">
        <div className="dir-title">
          <Globe size={18} aria-hidden="true" />
          <div>
            <h2>Annuaire des sources</h2>
            <span>Plateformes légales · statut en direct</span>
          </div>
        </div>
        <button
          className="dir-check-btn"
          onClick={checkAll}
          disabled={checking || loading}
          aria-label="Vérifier le statut de tous les sites"
        >
          <RefreshCw size={14} className={checking ? 'spin-icon' : ''} />
          {checking ? 'Vérification…' : 'Vérifier le statut'}
        </button>
      </div>

      {/* Controls */}
      <div className="dir-controls">
        <div className="dir-search">
          <Search size={15} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Rechercher une plateforme…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Rechercher une plateforme"
          />
          {search && (
            <button className="search-clear" onClick={() => setSearch('')} aria-label="Effacer">
              <X size={13} />
            </button>
          )}
        </div>
        <div className="dir-cats">
          {categories.map((c) => (
            <button
              key={c}
              className={`pill-btn${category === c ? ' active' : ''}`}
              onClick={() => setCategory(c)}
            >
              {c === 'All' ? 'Tout' : c}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="dir-empty"><div className="spinner" /><p>Chargement de l'annuaire…</p></div>
      ) : error ? (
        <div className="dir-empty">
          <AlertTriangle size={28} />
          <p>Annuaire indisponible.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="dir-empty">
          <Globe size={28} />
          <p>Aucune plateforme pour cette sélection.</p>
        </div>
      ) : (
        <div className="dir-grid">
          {filtered.map((site) => (
            <div key={site.id} className="site-card">
              {/* En-tête : logo + nom + favori */}
              <div className="site-head">
                <SiteLogo name={site.name} url={site.url} />
                <div className="site-headtext">
                  <div className="site-name-row">
                    <h3 className="site-name">{site.name}</h3>
                    {site.legal && (
                      <ShieldCheck size={12} className="site-legal" aria-label="Source légale" />
                    )}
                  </div>
                  <span className={`site-status site-status--${site.status}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {statusLabel(site.status)}
                  </span>
                </div>
                <button
                  className={`site-fav${favs.has(site.id) ? ' on' : ''}`}
                  onClick={() => toggleFav(site.id)}
                  aria-label={`${favs.has(site.id) ? 'Retirer' : 'Ajouter'} ${site.name} des favoris`}
                  aria-pressed={favs.has(site.id)}
                >
                  <Star size={14} fill={favs.has(site.id) ? 'currentColor' : 'none'} />
                </button>
              </div>

              <p className="site-desc">{site.description}</p>

              {/* Pied : tags + bouton ouvrir */}
              <div className="site-foot">
                <div className="site-meta">
                  <span className="site-cat">{site.category}</span>
                  <span className="site-lang">{site.language}</span>
                </div>
                <button className="site-open" onClick={() => openSite(site)}>
                  Ouvrir <ExternalLink size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
