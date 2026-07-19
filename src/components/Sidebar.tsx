import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Search, MonitorPlay, Star, AlertTriangle, Tv, Radio, X, RefreshCw, Compass,
  ChevronLeft, Menu,
} from 'lucide-react';
import { AlphaLogoAnimated } from './AlphaLogoAnimated.tsx';
import { BannerAd } from './BannerAd.tsx';
import { trackEvent } from '../hooks/useAnalytics.ts';
import { trackAdEvent } from '../hooks/useAds.ts';
import type { Channel } from '../types.ts';
import type { AuthUser } from '../hooks/useAuth.ts';
import { countryFlag, COUNTRY_NAMES } from '../utils/appHelpers.ts';
import { useFavoritesStore } from '../stores/favoritesStore.ts';
import { usePlayerStore, type Tab } from '../stores/playerStore.ts';

export { countryFlag } from '../utils/appHelpers.ts';

interface AdItem {
  id: string;
  title: string;
  subtitle?: string;
  url?: string;
  image?: string;
  logo?: string;
  legal?: string;
  emblem?: boolean;
}

interface SidebarProps {
  user: AuthUser | null;
  activeChannel: Channel | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onSelectChannel: (channel: Channel) => void;
  onOpenProfile: () => void;
  channels: Channel[];
  isLoading: boolean;
  loadError: string | null;
  onRetry: () => void;
  error: string | null;
  banners: AdItem[];
  adsEnabled: boolean;
}

export function Sidebar({
  user, activeChannel, sidebarOpen, onToggleSidebar,
  onSelectChannel, onOpenProfile,
  channels, isLoading, loadError, onRetry,
  banners, adsEnabled,
}: SidebarProps): JSX.Element {
  const { favorites } = useFavoritesStore();
  const {
    activeTab, search, rawSearch, selectedCountry, selectedGroup,
    setActiveTab, setSearch, setRawSearch, setSelectedCountry, setSelectedGroup,
  } = usePlayerStore();
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const countrySliderRef = useRef<HTMLDivElement>(null);
  const categorySliderRef = useRef<HTMLDivElement>(null);

  const countries = useMemo(() => {
    const unique = Array.from(new Set(channels.map((c) => c.country).filter(Boolean)));
    const franco = ['FR','BE','CH','CA','MA','DZ','TN','SN','CD','CI','CM','GA','TG','BJ','ML','BF'];
    const sorted = [...franco.filter(c => unique.includes(c)), ...unique.filter(c => !franco.includes(c)).sort()];
    return ['All', ...sorted];
  }, [channels]);

  const groups = useMemo(() => {
    const base = selectedCountry === 'All' ? channels : channels.filter((c) => c.country === selectedCountry);
    const unique = Array.from(new Set(base.map((c) => c.group).filter(Boolean)));
    return ['All', ...unique.sort()];
  }, [channels, selectedCountry]);

  useEffect(() => {
    setSelectedGroup('All');
  }, [selectedCountry, setSelectedGroup]);

  const filteredChannels = useMemo(() => {
    let list = activeTab === 'favorites'
      ? channels.filter((c) => favorites.has(c.url))
      : channels;
    if (selectedCountry !== 'All') list = list.filter((c) => c.country === selectedCountry);
    if (selectedGroup !== 'All') list = list.filter((c) => c.group === selectedGroup);
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((c) => {
        const name = (c.name ?? '').toLowerCase();
        const group = (c.group ?? '').toLowerCase();
        const country = (c.country ?? '').toLowerCase();
        return name.includes(q) || group.includes(q) || country.includes(q);
      });
    }
    return list;
  }, [channels, search, selectedCountry, selectedGroup, activeTab, favorites]);

  useEffect(() => {
    setFocusedIdx(-1);
    itemRefs.current = [];
  }, [filteredChannels]);

  const prevCountry = useCallback(() => {
    const idx = countries.indexOf(selectedCountry);
    setSelectedCountry(countries[idx > 0 ? idx - 1 : countries.length - 1]);
  }, [countries, selectedCountry, setSelectedCountry]);

  const nextCountry = useCallback(() => {
    const idx = countries.indexOf(selectedCountry);
    setSelectedCountry(countries[idx < countries.length - 1 ? idx + 1 : 0]);
  }, [countries, selectedCountry, setSelectedCountry]);

  const prevGroup = useCallback(() => {
    const idx = groups.indexOf(selectedGroup);
    setSelectedGroup(groups[idx > 0 ? idx - 1 : groups.length - 1]);
  }, [groups, selectedGroup, setSelectedGroup]);

  const nextGroup = useCallback(() => {
    const idx = groups.indexOf(selectedGroup);
    setSelectedGroup(groups[idx < groups.length - 1 ? idx + 1 : 0]);
  }, [groups, selectedGroup, setSelectedGroup]);

  const handleCountryKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevCountry(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nextCountry(); }
    if (e.key === 'ArrowDown') { e.preventDefault(); categorySliderRef.current?.focus(); }
  }, [prevCountry, nextCountry]);

  const handleCategoryKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); prevGroup(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); nextGroup(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); countrySliderRef.current?.focus(); }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      listRef.current?.focus();
      setFocusedIdx(0);
      itemRefs.current[0]?.scrollIntoView({ block: 'nearest' });
    }
  }, [prevGroup, nextGroup]);

  const handleListKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>): void => {
    if (!filteredChannels.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusedIdx((i) => {
        const next = Math.min(i + 1, filteredChannels.length - 1);
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusedIdx((i) => {
        if (i <= 0) { categorySliderRef.current?.focus(); return -1; }
        const next = i - 1;
        itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
        return next;
      });
    } else if (e.key === 'Enter' && focusedIdx >= 0) {
      onSelectChannel(filteredChannels[focusedIdx]);
    }
  }, [filteredChannels, focusedIdx, onSelectChannel]);

  return (
    <>
      {!sidebarOpen && (
        <button className="sidebar-toggle" onClick={onToggleSidebar} aria-label="Afficher la liste des chaînes">
          <Menu size={20} />
        </button>
      )}
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={onToggleSidebar} aria-hidden="true" />
      )}
      <aside className="sidebar glass" aria-label="Panneau des chaînes">
        <div className="sidebar-header">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <AlphaLogoAnimated size={34} />
          </div>
          <div className="sidebar-title">
            <h1>AMBITY.A IPTV PLAYER</h1>
            <span>by A.Onoseke House Investment RDC</span>
          </div>
          <div className="channel-count-badge" title="Nombre de chaînes">{channels.length}</div>
          <button className="sidebar-close" onClick={onToggleSidebar} aria-label="Masquer la liste" title="Masquer la liste">
            <ChevronLeft size={20} />
          </button>
          {user && (
            <button className="profile-btn" onClick={onOpenProfile}
              title={`Profil — ${user.username ?? user.name}`} aria-label="Ouvrir le profil">
              {(user.username ?? user.name ?? '?').charAt(0).toUpperCase()}
            </button>
          )}
        </div>

        <div className="sidebar-tabs" role="tablist">
          {([['all', 'Chaînes', Tv], ['favorites', 'Favoris', Star], ['directory', 'Annuaire', Compass]] as const).map(([tab, label, Icon]) => (
            <button key={tab} role="tab" aria-selected={activeTab === tab}
              className={`tab-btn${activeTab === tab ? ' active' : ''}`}
              onClick={() => { setActiveTab(tab); }}>
              <Icon size={14} aria-hidden="true" />
              {label}
              {tab === 'favorites' && favorites.size > 0 && (
                <span className="tab-badge">{favorites.size}</span>
              )}
            </button>
          ))}
        </div>

        <div className="trial-chip trial-chip--free">100% gratuit · sans inscription requise</div>

        {activeTab !== 'directory' && (
          <div className="search-container">
            <Search size={15} className="search-icon" aria-hidden="true" />
            <input type="search" placeholder="Chaîne, pays, catégorie…" className="search-input"
              value={rawSearch} onChange={(e) => setRawSearch(e.target.value)} aria-label="Rechercher une chaîne" />
            {rawSearch && (
              <button className="search-clear" onClick={() => setRawSearch('')} aria-label="Effacer"><X size={13} /></button>
            )}
          </div>
        )}

        {activeTab === 'directory' && (
          <div className="dir-sidebar-hint">
            <Compass size={26} aria-hidden="true" />
            <p>Parcourez les plateformes de streaming légales à droite.</p>
          </div>
        )}

        {activeTab === 'all' && (
          <>
            <div ref={countrySliderRef} className="country-slider" role="group"
              aria-label="Sélectionner un pays" tabIndex={0} onKeyDown={handleCountryKeyDown}>
              <button className="cs-arrow" onClick={prevCountry} aria-label="Pays précédent" tabIndex={-1}>‹</button>
              <div className="cs-center">
                <span className="cs-flag" aria-hidden="true">{selectedCountry === 'All' ? '🌐' : countryFlag(selectedCountry)}</span>
                <span className="cs-name">{selectedCountry === 'All' ? 'Tous les pays' : (COUNTRY_NAMES[selectedCountry] ?? selectedCountry)}</span>
                <span className="cs-pos">{countries.indexOf(selectedCountry) + 1} / {countries.length}</span>
              </div>
              <button className="cs-arrow" onClick={nextCountry} aria-label="Pays suivant" tabIndex={-1}>›</button>
            </div>
            {groups.length > 2 && (
              <div ref={categorySliderRef} className="country-slider cat-slider" role="group"
                aria-label="Sélectionner une catégorie" tabIndex={0} onKeyDown={handleCategoryKeyDown}>
                <button className="cs-arrow" onClick={prevGroup} aria-label="Catégorie précédente" tabIndex={-1}>‹</button>
                <div className="cs-center">
                  <span className="cs-name cat-name">{selectedGroup === 'All' ? 'Toutes' : selectedGroup}</span>
                  <span className="cs-pos">{groups.indexOf(selectedGroup) + 1} / {groups.length}</span>
                </div>
                <button className="cs-arrow" onClick={nextGroup} aria-label="Catégorie suivante" tabIndex={-1}>›</button>
              </div>
            )}
          </>
        )}

        {activeTab !== 'directory' && (
          <div ref={listRef} className="channel-list" role="listbox" aria-label="Liste des chaînes"
            tabIndex={0} onKeyDown={handleListKeyDown}>
            {isLoading ? (
              <SkeletonList />
            ) : loadError ? (
              <div className="load-error-state">
                <AlertTriangle size={28} aria-hidden="true" />
                <p>{loadError}</p>
                <button className="retry-btn-sm" onClick={onRetry}><RefreshCw size={13} /> Réessayer</button>
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="empty-state-small">
                {activeTab === 'favorites' ? (
                  <><Star size={28} aria-hidden="true" /><p>Aucun favori.<br />Cliquez sur ★ pour en ajouter.</p></>
                ) : (
                  <><Radio size={28} aria-hidden="true" /><p>Aucune chaîne pour cette sélection.</p></>
                )}
              </div>
            ) : (
              filteredChannels.map((channel, i) => {
                const isActive = activeChannel?.url === channel.url && activeChannel?.name === channel.name;
                const isFocused = focusedIdx === i;
                return (
                  <div key={`${channel.url}__${channel.name}`}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    className={`channel-item${isActive ? ' active' : ''}${isFocused ? ' focused' : ''}`}
                    onClick={() => { setFocusedIdx(i); onSelectChannel(channel); }}
                    role="option" aria-selected={isActive} tabIndex={-1}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectChannel(channel); } }}>
                    <span className="channel-num" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                    <div className="channel-logo" aria-hidden="true">
                      {channel.logo ? (
                        <img src={channel.logo} alt="" loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      ) : (
                        <MonitorPlay size={15} color="var(--text-dim)" />
                      )}
                    </div>
                    <div className="channel-info">
                      <div className="channel-name">{channel.name}</div>
                      <div className="channel-meta">
                        <span aria-hidden="true">{countryFlag(channel.country)}</span>
                        <span className="channel-group">{channel.group}</span>
                      </div>
                    </div>
                    <button className={`fav-btn${favorites.has(channel.url) ? ' favorited' : ''}`}
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.url); }}
                      aria-label={`${favorites.has(channel.url) ? 'Retirer' : 'Ajouter'} ${channel.name} des favoris`}
                      aria-pressed={favorites.has(channel.url)}>
                      <Star size={13} fill={favorites.has(channel.url) ? 'currentColor' : 'none'} aria-hidden="true" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}

        {activeChannel && (
          <div className="sidebar-now-playing">
            <div className="snp-dot" aria-hidden="true" />
            <div className="snp-info">
              <span className="snp-name">{activeChannel.name}</span>
              <span className="snp-group">{countryFlag(activeChannel.country)} {activeChannel.group}</span>
            </div>
            {activeChannel.logo && (
              <img src={activeChannel.logo} alt="" className="snp-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>
        )}

        {adsEnabled && banners.length > 0 && (
          <BannerAd ad={banners[0]}
            onImpression={(id) => { trackEvent('ad_impression', id); void trackAdEvent(id, 'impression'); }}
            onClick={(id) => { trackEvent('ad_click', id); void trackAdEvent(id, 'click'); }} />
        )}
      </aside>
    </>
  );
}

function SkeletonList(): JSX.Element {
  return (
    <>
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="channel-item skeleton-item" aria-hidden="true">
          <div className="skeleton skeleton-logo" />
          <div className="channel-info">
            <div className="skeleton skeleton-name" />
            <div className="skeleton skeleton-meta" />
          </div>
        </div>
      ))}
    </>
  );
}
