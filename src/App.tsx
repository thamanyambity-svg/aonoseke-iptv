import './App.css';
import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  useReducer,
} from 'react';
import {
  Search,
  MonitorPlay,
  Star,
  AlertTriangle,
  Tv,
  Radio,
  X,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';
import { Player } from './components/Player.tsx';
import { useFavorites } from './hooks/useFavorites.ts';
import type { Channel } from './types-exports.ts';
import { validatePlaylist, appConfig } from './types-exports.ts';
import { logger } from './utils/logger.ts';
import { ErrorMessages } from './utils/errors.ts';
import { sanitizeLogoUrl } from './utils/validation.ts';

// ─── helpers ────────────────────────────────────────────────────────────────

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map(
    (c) => 0x1f1e6 - 0x41 + c.charCodeAt(0),
  );
  return String.fromCodePoint(...codePoints);
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type Tab = 'all' | 'favorites';

// ─── App ────────────────────────────────────────────────────────────────────

function App(): JSX.Element {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 220);
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useReducer((n: number) => n + 1, 0);
  const { favorites, toggleFavorite } = useFavorites();

  // ── focused index for keyboard nav ──────────────────────────────────────
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── load playlist ────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const load = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await fetch(appConfig.playlistUrl, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = (await res.json()) as unknown;
        const validated = validatePlaylist(data).slice(0, appConfig.maxChannels);
        const sanitized = validated.map((ch) => ({
          ...ch,
          logo: sanitizeLogoUrl(ch.logo),
        }));
        setChannels(sanitized);
        logger.info('Playlist loaded', { count: sanitized.length });
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        logger.error('Failed to load playlist', err as Error);
        setLoadError(ErrorMessages.PLAYLIST_LOAD_FAILED);
      } finally {
        setIsLoading(false);
      }
    };
    void load();
    return () => controller.abort();
  }, [retryCount]);

  // ── derived lists ─────────────────────────────────────────────────────────
  const groups = useMemo(() => {
    const unique = Array.from(new Set(channels.map((c) => c.group)));
    return ['All', ...unique.sort()];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let list = channels;
    if (activeTab === 'favorites') {
      list = channels.filter((c) => favorites.has(c.url));
    }
    const q = search.toLowerCase();
    return list.filter((c) => {
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q);
      const matchGroup = selectedGroup === 'All' || c.group === selectedGroup;
      return matchSearch && matchGroup;
    });
  }, [channels, search, selectedGroup, activeTab, favorites]);

  // Reset focused index when list changes
  useEffect(() => {
    setFocusedIdx(-1);
    itemRefs.current = [];
  }, [filteredChannels]);

  // ── handlers ──────────────────────────────────────────────────────────────
  const handleSelectChannel = useCallback((channel: Channel): void => {
    setActiveChannel(channel);
    setError(null);
  }, []);

  const handleListKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
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
          const next = Math.max(i - 1, 0);
          itemRefs.current[next]?.scrollIntoView({ block: 'nearest' });
          return next;
        });
      } else if (e.key === 'Enter' && focusedIdx >= 0) {
        handleSelectChannel(filteredChannels[focusedIdx]);
      }
    },
    [filteredChannels, focusedIdx, handleSelectChannel],
  );

  const switchTab = useCallback((tab: Tab) => {
    setActiveTab(tab);
    setSelectedGroup('All');
    setRawSearch('');
  }, []);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className="app-container">
      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      <aside className="sidebar glass" aria-label="Panneau des chaînes">
        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <MonitorPlay size={18} color="#fff" />
          </div>
          <div className="sidebar-title">
            <h1>IPTV Player</h1>
            <span>Lecteur web en direct</span>
          </div>
          <div className="channel-count-badge" title="Nombre de chaînes chargées">
            {channels.length}
          </div>
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs" role="tablist" aria-label="Onglets">
          <button
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => switchTab('all')}
          >
            <Tv size={14} aria-hidden="true" />
            Chaînes
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'favorites'}
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => switchTab('favorites')}
          >
            <Star size={14} aria-hidden="true" />
            Favoris
            {favorites.size > 0 && (
              <span className="tab-badge" aria-label={`${favorites.size} favoris`}>
                {favorites.size}
              </span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="search-container">
          <Search size={15} className="search-icon" aria-hidden="true" />
          <input
            type="search"
            placeholder="Chaîne, pays, catégorie…"
            className="search-input"
            value={rawSearch}
            onChange={(e) => setRawSearch(e.target.value)}
            aria-label="Rechercher une chaîne"
          />
          {rawSearch && (
            <button
              className="search-clear"
              onClick={() => setRawSearch('')}
              aria-label="Effacer la recherche"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category filter — only on "all" tab */}
        {activeTab === 'all' && groups.length > 2 && (
          <div className="category-filter">
            <div className="select-wrapper">
              <select
                className="category-select"
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                aria-label="Filtrer par catégorie"
              >
                {groups.map((g) => (
                  <option key={g} value={g}>
                    {g === 'All'
                      ? `🌍 Toutes les catégories (${channels.length})`
                      : `${countryFlag(channels.find((c) => c.group === g)?.country ?? '')} ${g}`}
                  </option>
                ))}
              </select>
              <ChevronDown size={13} className="select-chevron" aria-hidden="true" />
            </div>
          </div>
        )}

        {/* Channel list */}
        <div
          ref={listRef}
          className="channel-list"
          role="listbox"
          aria-label="Liste des chaînes"
          tabIndex={0}
          onKeyDown={handleListKeyDown}
        >
          {isLoading ? (
            <SkeletonList />
          ) : loadError ? (
            <div className="load-error-state">
              <AlertTriangle size={28} aria-hidden="true" />
              <p>{loadError}</p>
              <button className="retry-btn-sm" onClick={setRetryCount}>
                <RefreshCw size={13} />
                Réessayer
              </button>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="empty-state-small">
              {activeTab === 'favorites' ? (
                <>
                  <Star size={28} aria-hidden="true" />
                  <p>
                    Aucun favori.
                    <br />
                    Cliquez sur ★ pour en ajouter.
                  </p>
                </>
              ) : (
                <>
                  <Radio size={28} aria-hidden="true" />
                  <p>Aucune chaîne trouvée.</p>
                </>
              )}
            </div>
          ) : (
            filteredChannels.map((channel, i) => {
              const isActive = activeChannel?.url === channel.url && activeChannel?.name === channel.name;
              const isFocused = focusedIdx === i;
              return (
                <div
                  key={`${channel.url}__${channel.name}`}
                  ref={(el) => { itemRefs.current[i] = el; }}
                  className={`channel-item${isActive ? ' active' : ''}${isFocused ? ' focused' : ''}`}
                  onClick={() => { setFocusedIdx(i); handleSelectChannel(channel); }}
                  role="option"
                  aria-selected={isActive}
                  tabIndex={-1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSelectChannel(channel);
                    }
                  }}
                >
                  <div className="channel-logo" aria-hidden="true">
                    {channel.logo ? (
                      <img
                        src={channel.logo}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
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

                  <button
                    className={`fav-btn${favorites.has(channel.url) ? ' favorited' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFavorite(channel.url);
                    }}
                    aria-label={`${favorites.has(channel.url) ? 'Retirer' : 'Ajouter'} ${channel.name} des favoris`}
                    aria-pressed={favorites.has(channel.url)}
                  >
                    <Star
                      size={13}
                      fill={favorites.has(channel.url) ? 'currentColor' : 'none'}
                      aria-hidden="true"
                    />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Mini now-playing strip at sidebar bottom */}
        {activeChannel && (
          <div className="sidebar-now-playing">
            <div className="snp-dot" aria-hidden="true" />
            <div className="snp-info">
              <span className="snp-name">{activeChannel.name}</span>
              <span className="snp-group">
                {countryFlag(activeChannel.country)} {activeChannel.group}
              </span>
            </div>
            {activeChannel.logo && (
              <img
                src={activeChannel.logo}
                alt=""
                className="snp-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            )}
          </div>
        )}
      </aside>

      {/* ── MAIN PLAYER ──────────────────────────────────────────────────── */}
      <main className="main-content">
        {activeChannel && (
          <div className="player-header animate-fade">
            <div className="now-playing">
              <div className="live-badge">
                <span className="live-dot" aria-hidden="true" />
                <span className="live-text">En direct</span>
              </div>
              <h2 className="now-playing-title">{activeChannel.name}</h2>
              <div className="now-playing-group">
                {countryFlag(activeChannel.country)} {activeChannel.group}
              </div>
            </div>
            <div className="player-logo-overlay" aria-hidden="true">
              {activeChannel.logo ? (
                <img
                  src={activeChannel.logo}
                  alt=""
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <Tv size={24} color="var(--text-muted)" />
              )}
            </div>
          </div>
        )}

        {error && (
          <div className="error-banner animate-fade-up" role="alert">
            <AlertTriangle size={15} aria-hidden="true" />
            <span>{error}</span>
            <button
              className="error-dismiss"
              onClick={() => setError(null)}
              aria-label="Fermer l'erreur"
            >
              <X size={13} />
            </button>
          </div>
        )}

        <div className="video-container">
          <Player url={activeChannel?.url ?? ''} onError={(msg) => setError(msg)} />
        </div>
      </main>
    </div>
  );
}

// ── Skeleton loader ──────────────────────────────────────────────────────────

function SkeletonList(): JSX.Element {
  return (
    <>
      {Array.from({ length: 12 }).map((_, i) => (
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

export default App;
