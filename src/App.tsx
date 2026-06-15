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
  Compass,
  Menu,
} from 'lucide-react';
import { Player } from './components/Player.tsx';
import { AlphaLogoAnimated } from './components/AlphaLogoAnimated.tsx';
import { PreRollAd } from './components/PreRollAd.tsx';
import { BannerAd } from './components/BannerAd.tsx';
import { Directory } from './components/Directory.tsx';
import { CinematicBg } from './components/CinematicBg.tsx';
import { Paywall } from './components/Paywall.tsx';
import { Profile } from './components/Profile.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { useTrial } from './hooks/useTrial.ts';
import { useDeadChannels } from './hooks/useDeadChannels.ts';
import { startSubscription } from './lib/payment.ts';
import { useFavorites } from './hooks/useFavorites.ts';
import { useAds } from './hooks/useAds.ts';
import type { PrerollAd } from './hooks/useAds.ts';
import { trackEvent, trackHeartbeat } from './hooks/useAnalytics.ts';
import type { Channel } from './types-exports.ts';
import { validatePlaylist, appConfig } from './types-exports.ts';
import { logger } from './utils/logger.ts';
import { ErrorMessages } from './utils/errors.ts';
import type { AuthUser } from './hooks/useAuth.ts';
import { sanitizeLogoUrl } from './utils/validation.ts';

// ─── helpers ────────────────────────────────────────────────────────────────

export function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map(
    (c) => 0x1f1e6 - 0x41 + c.charCodeAt(0),
  );
  return String.fromCodePoint(...codePoints);
}

// Country display name (fallback to code)
const COUNTRY_NAMES: Record<string, string> = {
  FR: 'France', BE: 'Belgique', CH: 'Suisse', CA: 'Canada',
  MA: 'Maroc', DZ: 'Algérie', TN: 'Tunisie', SN: 'Sénégal',
  CD: 'Congo RDC', CI: "Côte d'Ivoire", CM: 'Cameroun', GA: 'Gabon',
  TG: 'Togo', BJ: 'Bénin', ML: 'Mali', BF: 'Burkina Faso',
  US: 'USA', GB: 'UK', DE: 'Allemagne', IT: 'Italie',
  ES: 'Espagne', PT: 'Portugal', RU: 'Russie', TR: 'Turquie',
  SA: 'Arabie Saoudite', AE: 'Émirats', QA: 'Qatar', EG: 'Égypte',
  IN: 'Inde', CN: 'Chine', JP: 'Japon', KR: 'Corée',
  BR: 'Brésil', MX: 'Mexique', AR: 'Argentine', AU: 'Australie',
};

function countryLabel(code: string): string {
  return `${countryFlag(code)} ${COUNTRY_NAMES[code] ?? code}`;
}

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

type Tab = 'all' | 'favorites' | 'directory';

// ─── App ────────────────────────────────────────────────────────────────────

interface AppProps {
  user?: AuthUser;
  onLogout?: () => void;
}

function App({ user, onLogout }: AppProps = {}): JSX.Element {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [rawSearch, setRawSearch] = useState('');
  const search = useDebounce(rawSearch, 220);
  const [selectedCountry, setSelectedCountry] = useState<string>('All');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useReducer((n: number) => n + 1, 0);
  const { favorites, toggleFavorite } = useFavorites();

  // ── profil / admin ──────────────────────────────────────────────────────
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ── essai 30 jours / premium ────────────────────────────────────────────
  const trial = useTrial();

  // ── auto-masquage des chaînes qui ne jouent pas ─────────────────────────
  const { deadSet, markDead } = useDeadChannels();

  // ── publicité ─────────────────────────────────────────────────────────────
  const ads = useAds();
  const [prerollAd, setPrerollAd] = useState<PrerollAd | null>(null);
  const pendingChannel = useRef<Channel | null>(null);
  const selectCount = useRef(0);

  // ── keyboard nav — channel list ─────────────────────────────────────────
  const [focusedIdx, setFocusedIdx] = useState<number>(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── slider refs ─────────────────────────────────────────────────────────
  const countrySliderRef  = useRef<HTMLDivElement>(null);
  const categorySliderRef = useRef<HTMLDivElement>(null);

  // ── load playlist ────────────────────────────────────────────────────────
  useEffect(() => {
    const controller = new AbortController();
    const load = async (): Promise<void> => {
      try {
        setIsLoading(true);
        setLoadError(null);
        const res = await fetch(appConfig.playlistUrl, { signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
        const data = (await res.json()) as unknown;
        const validated = validatePlaylist(data).slice(0, appConfig.maxChannels);
        const sanitized = validated.map((ch) => ({ ...ch, logo: sanitizeLogoUrl(ch.logo) }));
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

  // All countries sorted — prioritize francophone ones
  const countries = useMemo(() => {
    const unique = Array.from(new Set(channels.map((c) => c.country).filter(Boolean)));
    const franco = ['FR','BE','CH','CA','MA','DZ','TN','SN','CD','CI','CM','GA','TG','BJ','ML','BF'];
    const sorted = [
      ...franco.filter(c => unique.includes(c)),
      ...unique.filter(c => !franco.includes(c)).sort(),
    ];
    return ['All', ...sorted];
  }, [channels]);

  // Categories filtered by selected country
  const groups = useMemo(() => {
    const base = selectedCountry === 'All'
      ? channels
      : channels.filter((c) => c.country === selectedCountry);
    const unique = Array.from(new Set(base.map((c) => c.group).filter(Boolean)));
    return ['All', ...unique.sort()];
  }, [channels, selectedCountry]);

  // Reset category when country changes
  useEffect(() => {
    setSelectedGroup('All');
  }, [selectedCountry]);

  const filteredChannels = useMemo(() => {
    // exclut les chaînes marquées mortes (sauf dans l'onglet Favoris,
    // où l'utilisateur veut voir ses choix même temporairement KO)
    let list = activeTab === 'favorites'
      ? channels.filter((c) => favorites.has(c.url))
      : channels.filter((c) => !deadSet.has(c.url));
    if (selectedCountry !== 'All') {
      list = list.filter((c) => c.country === selectedCountry);
    }
    if (selectedGroup !== 'All') {
      list = list.filter((c) => c.group === selectedGroup);
    }
    const q = search.toLowerCase();
    if (q) {
      list = list.filter((c) =>
        c.name.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        c.country.toLowerCase().includes(q),
      );
    }
    return list;
  }, [channels, search, selectedCountry, selectedGroup, activeTab, favorites, deadSet]);

  useEffect(() => {
    setFocusedIdx(-1);
    itemRefs.current = [];
  }, [filteredChannels]);

  // ── keyboard handlers ─────────────────────────────────────────────────────

  const playChannel = useCallback((channel: Channel): void => {
    setActiveChannel(channel);
    setError(null);
    setSidebarOpen(false); // chaîne choisie → on referme le drawer pour laisser le lecteur en plein écran
    trackEvent('channel_view', channel.url, channel.group);
  }, []);

  // Heartbeat : mesure le temps de connexion réel (ping discret toutes les 60s,
  // seulement quand l'onglet est visible).
  useEffect(() => {
    trackHeartbeat();
    const id = window.setInterval(() => {
      if (document.visibilityState === 'visible') trackHeartbeat();
    }, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const handleSelectChannel = useCallback(
    (channel: Channel): void => {
      setSidebarOpen(false); // toute sélection referme le drawer (même si une pub précède)
      // pas de pub si on reste sur la même chaîne
      if (channel.url === activeChannel?.url) {
        playChannel(channel);
        return;
      }

      const pr = ads.preroll;
      const freq = pr.frequency > 0 ? pr.frequency : 1;
      // pub à la 1re lecture puis toutes les `freq` chaînes
      const shouldShowAd =
        ads.enabled &&
        !trial.adsHidden &&
        pr.enabled &&
        pr.items.length > 0 &&
        selectCount.current % freq === 0;

      selectCount.current += 1;

      if (shouldShowAd) {
        const ad = pr.items[(selectCount.current - 1) % pr.items.length];
        pendingChannel.current = channel;
        setPrerollAd(ad);
      } else {
        playChannel(channel);
      }
    },
    [ads, trial.adsHidden, activeChannel, playChannel],
  );

  const handlePrerollComplete = useCallback((): void => {
    setPrerollAd(null);
    if (pendingChannel.current) {
      playChannel(pendingChannel.current);
      pendingChannel.current = null;
    }
  }, [playChannel]);

  // Country slider navigation
  const prevCountry = useCallback((): void => {
    const idx = countries.indexOf(selectedCountry);
    setSelectedCountry(countries[idx > 0 ? idx - 1 : countries.length - 1]);
  }, [countries, selectedCountry]);

  const nextCountry = useCallback((): void => {
    const idx = countries.indexOf(selectedCountry);
    setSelectedCountry(countries[idx < countries.length - 1 ? idx + 1 : 0]);
  }, [countries, selectedCountry]);

  const prevGroup = useCallback((): void => {
    const idx = groups.indexOf(selectedGroup);
    setSelectedGroup(groups[idx > 0 ? idx - 1 : groups.length - 1]);
  }, [groups, selectedGroup]);

  const nextGroup = useCallback((): void => {
    const idx = groups.indexOf(selectedGroup);
    setSelectedGroup(groups[idx < groups.length - 1 ? idx + 1 : 0]);
  }, [groups, selectedGroup]);

  const handleCountryKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevCountry(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextCountry(); }
      if (e.key === 'ArrowDown')  { e.preventDefault(); categorySliderRef.current?.focus(); }
    },
    [prevCountry, nextCountry],
  );

  const handleCategoryKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>): void => {
      if (e.key === 'ArrowLeft')  { e.preventDefault(); prevGroup(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); nextGroup(); }
      if (e.key === 'ArrowUp')    { e.preventDefault(); countrySliderRef.current?.focus(); }
      if (e.key === 'ArrowDown')  {
        e.preventDefault();
        listRef.current?.focus();
        setFocusedIdx(0);
        itemRefs.current[0]?.scrollIntoView({ block: 'nearest' });
      }
    },
    [prevGroup, nextGroup],
  );

  // Channel list keyboard
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
          if (i <= 0) {
            categorySliderRef.current?.focus();
            return -1;
          }
          const next = i - 1;
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
    setSelectedCountry('All');
    setSelectedGroup('All');
    setRawSearch('');
  }, []);

  // ─── render ───────────────────────────────────────────────────────────────
  return (
    <div className={`app-container${sidebarOpen ? ' sidebar-open' : ''}`}>
      {/* Toggle hamburger — disponible sur tous les supports */}
      <button
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label={sidebarOpen ? 'Masquer la liste des chaînes' : 'Afficher la liste des chaînes'}
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      {sidebarOpen && (
        <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-hidden="true" />
      )}
      {/* ── SIDEBAR ───────────────────────────────────────────────────────── */}
      <aside className="sidebar glass" aria-label="Panneau des chaînes">

        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon" aria-hidden="true">
            <AlphaLogoAnimated size={34} />
          </div>
          <div className="sidebar-title">
            <h1>IPTV Player</h1>
            <span>by Aonoseke House Investment RDC</span>
          </div>
          <div className="channel-count-badge" title="Nombre de chaînes">
            {channels.length}
          </div>
          {user && (
            <button
              className="profile-btn"
              onClick={() => setShowProfile(true)}
              title={`Profil — ${user.username ?? user.name}`}
              aria-label="Ouvrir le profil"
            >
              {(user.username ?? user.name ?? '?').charAt(0).toUpperCase()}
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="sidebar-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={activeTab === 'all'}
            className={`tab-btn${activeTab === 'all' ? ' active' : ''}`}
            onClick={() => switchTab('all')}
          >
            <Tv size={14} aria-hidden="true" />
            Chaînes
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'favorites'}
            className={`tab-btn${activeTab === 'favorites' ? ' active' : ''}`}
            onClick={() => switchTab('favorites')}
          >
            <Star size={14} aria-hidden="true" />
            Favoris
            {favorites.size > 0 && (
              <span className="tab-badge">{favorites.size}</span>
            )}
          </button>
          <button
            role="tab"
            aria-selected={activeTab === 'directory'}
            className={`tab-btn${activeTab === 'directory' ? ' active' : ''}`}
            onClick={() => switchTab('directory')}
          >
            <Compass size={14} aria-hidden="true" />
            Annuaire
          </button>
        </div>

        {/* Bandeau essai / premium */}
        {trial.isPremium ? (
          <div className="trial-chip trial-chip--premium">★ Premium actif</div>
        ) : trial.trialActive ? (
          <div className="trial-chip">
            Essai gratuit — {trial.daysLeft} j restant{trial.daysLeft > 1 ? 's' : ''}
          </div>
        ) : (
          <div className="trial-chip trial-chip--ended">
            Essai terminé · Annuaire verrouillé
          </div>
        )}

        {/* Search */}
        {activeTab !== 'directory' && (
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
              <button className="search-clear" onClick={() => setRawSearch('')} aria-label="Effacer">
                <X size={13} />
              </button>
            )}
          </div>
        )}

        {/* En mode Annuaire : indice dans la sidebar */}
        {activeTab === 'directory' && (
          <div className="dir-sidebar-hint">
            <Compass size={26} aria-hidden="true" />
            <p>Parcourez les plateformes de streaming légales à droite.</p>
          </div>
        )}

        {/* ── PAYS — Slider ◀ NOM ▶ ── */}
        {activeTab === 'all' && (
          <>
            <div
              ref={countrySliderRef}
              className="country-slider"
              role="group"
              aria-label="Sélectionner un pays"
              tabIndex={0}
              onKeyDown={handleCountryKeyDown}
            >
              <button
                className="cs-arrow"
                onClick={prevCountry}
                aria-label="Pays précédent"
                tabIndex={-1}
              >
                ‹
              </button>

              <div className="cs-center">
                <span className="cs-flag" aria-hidden="true">
                  {selectedCountry === 'All' ? '🌐' : countryFlag(selectedCountry)}
                </span>
                <span className="cs-name">
                  {selectedCountry === 'All'
                    ? 'Tous les pays'
                    : (COUNTRY_NAMES[selectedCountry] ?? selectedCountry)}
                </span>
                <span className="cs-pos">
                  {countries.indexOf(selectedCountry) + 1} / {countries.length}
                </span>
              </div>

              <button
                className="cs-arrow"
                onClick={nextCountry}
                aria-label="Pays suivant"
                tabIndex={-1}
              >
                ›
              </button>
            </div>

            {/* ── CATÉGORIE — Slider ── */}
            {groups.length > 2 && (
              <div
                ref={categorySliderRef}
                className="country-slider cat-slider"
                role="group"
                aria-label="Sélectionner une catégorie"
                tabIndex={0}
                onKeyDown={handleCategoryKeyDown}
              >
                <button className="cs-arrow" onClick={prevGroup} aria-label="Catégorie précédente" tabIndex={-1}>‹</button>
                <div className="cs-center">
                  <span className="cs-name cat-name">
                    {selectedGroup === 'All' ? 'Toutes' : selectedGroup}
                  </span>
                  <span className="cs-pos">
                    {groups.indexOf(selectedGroup) + 1} / {groups.length}
                  </span>
                </div>
                <button className="cs-arrow" onClick={nextGroup} aria-label="Catégorie suivante" tabIndex={-1}>›</button>
              </div>
            )}
          </>
        )}

        {/* Channel list */}
        {activeTab !== 'directory' && (
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
                <RefreshCw size={13} /> Réessayer
              </button>
            </div>
          ) : filteredChannels.length === 0 ? (
            <div className="empty-state-small">
              {activeTab === 'favorites' ? (
                <>
                  <Star size={28} aria-hidden="true" />
                  <p>Aucun favori.<br />Cliquez sur ★ pour en ajouter.</p>
                </>
              ) : (
                <>
                  <Radio size={28} aria-hidden="true" />
                  <p>Aucune chaîne pour cette sélection.</p>
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
                  <span className="channel-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
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
                  <button
                    className={`fav-btn${favorites.has(channel.url) ? ' favorited' : ''}`}
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(channel.url); }}
                    aria-label={`${favorites.has(channel.url) ? 'Retirer' : 'Ajouter'} ${channel.name} des favoris`}
                    aria-pressed={favorites.has(channel.url)}
                  >
                    <Star size={13} fill={favorites.has(channel.url) ? 'currentColor' : 'none'} aria-hidden="true" />
                  </button>
                </div>
              );
            })
          )}
        </div>
        )}

        {/* Mini now-playing strip */}
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
              <img src={activeChannel.logo} alt="" className="snp-logo"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            )}
          </div>
        )}

        {/* Bannière sponsor */}
        {ads.enabled && !trial.adsHidden && ads.banners.length > 0 && (
          <BannerAd
            ad={ads.banners[0]}
            onImpression={(id) => trackEvent('ad_impression', id)}
            onClick={(id) => trackEvent('ad_click', id)}
          />
        )}
      </aside>

      {/* ── MAIN ─────────────────────────────────────────────────────────── */}
      <main className="main-content">
        {activeTab === 'directory' ? (
          trial.annuaireUnlocked ? (
            <Directory />
          ) : (
            <Paywall
              daysUsed={30}
              onSubscribe={() => {
                // Flutterwave (Mobile Money) si configuré, sinon démo locale.
                void startSubscription(user?.email ?? 'client@aonoseke.com', () => {
                  localStorage.setItem('iptv-premium', 'true');
                  window.location.reload();
                });
              }}
            />
          )
        ) : (
        <>
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
                <img src={activeChannel.logo} alt=""
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
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
            <button className="error-dismiss" onClick={() => setError(null)} aria-label="Fermer">
              <X size={13} />
            </button>
          </div>
        )}

        <div className="video-container">
          {!activeChannel && <CinematicBg />}
          <Player
            url={activeChannel?.url ?? ''}
            onError={(msg) => {
              setError(msg);
              // la chaîne ne joue pas → on la masque pour ne plus jamais
              // la proposer (filet de crédibilité)
              if (activeChannel?.url) markDead(activeChannel.url);
            }}
          />
          {prerollAd && (
            <PreRollAd
              ad={prerollAd}
              skipAfter={ads.preroll.skipAfter}
              maxDuration={ads.preroll.maxDuration}
              onComplete={handlePrerollComplete}
              onImpression={(id) => trackEvent('ad_impression', id)}
              onClick={(id) => trackEvent('ad_click', id)}
            />
          )}
        </div>
        </>
        )}
      </main>

      {/* Profil utilisateur */}
      {showProfile && user && (
        <Profile
          user={user}
          favoritesCount={favorites.size}
          isPremium={trial.isPremium}
          daysLeft={trial.daysLeft}
          onClose={() => setShowProfile(false)}
          onLogout={() => { setShowProfile(false); onLogout?.(); }}
          onOpenAdmin={user.role === 'admin' ? () => { setShowProfile(false); setShowAdmin(true); } : undefined}
        />
      )}

      {/* Tableau de bord admin */}
      {showAdmin && user?.role === 'admin' && (
        <AdminDashboard onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}

// ── Skeleton loader ──────────────────────────────────────────────────────────

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

export default App;
