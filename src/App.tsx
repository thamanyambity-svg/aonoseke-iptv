import './App.css';
import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useReducer,
  lazy,
  Suspense,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Tv,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Player } from './components/Player.tsx';
import { CinematicBg } from './components/CinematicBg.tsx';
import { PreRollAd } from './components/PreRollAd.tsx';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';
import { AdOverlay } from './components/AdOverlay.tsx';
import { Directory } from './components/Directory.tsx';
import { Sidebar, countryFlag } from './components/Sidebar.tsx';
import { useDeadChannels } from './hooks/useDeadChannels.ts';
import { useAds, trackAdEvent } from './hooks/useAds.ts';
import type { PrerollAd } from './hooks/useAds.ts';
import { trackEvent } from './hooks/useAnalytics.ts';
import type { Channel } from './types-exports.ts';
import { validatePlaylist, appConfig } from './types-exports.ts';
import { logger } from './utils/logger.ts';
import { ErrorMessages } from './utils/errors.ts';
import { sanitizeLogoUrl } from './utils/validation.ts';
import { usePlayerStore } from './stores/playerStore.ts';
import { useFavoritesStore } from './stores/favoritesStore.ts';
import { useAuthStore } from './stores/authStore.ts';

const Profile = lazy(() => import('./components/Profile.tsx'));

export { countryFlag } from './components/Sidebar.tsx';

function App(): JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useReducer((n: number) => n + 1, 0);

  const { activeChannel, activeTab, sidebarOpen, error, setActiveChannel, setSidebarOpen, setError } = usePlayerStore();
  const { favorites } = useFavoritesStore();
  const { markDead } = useDeadChannels();
  const ads = useAds();
  const [prerollAd, setPrerollAd] = useState<PrerollAd | null>(null);
  const pendingChannel = useRef<Channel | null>(null);
  const selectCount = useRef(0);

  const [showProfile, setShowProfile] = useState(false);

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

  const playChannel = useCallback((channel: Channel): void => {
    setActiveChannel(channel);
    setError(null);
    trackEvent('channel_view', channel.url, channel.group);
  }, [setActiveChannel, setError]);

  const handleSelectChannel = useCallback(
    (channel: Channel): void => {
      setSidebarOpen(false);
      if (channel.url === activeChannel?.url) {
        playChannel(channel);
        return;
      }

      const pr = ads.preroll;
      const freq = pr.frequency > 0 ? pr.frequency : 1;
      const shouldShowAd =
        ads.enabled && pr.enabled && pr.items.length > 0 && selectCount.current % freq === 0;

      selectCount.current += 1;

      if (shouldShowAd) {
        const ad = pr.items[(selectCount.current - 1) % pr.items.length];
        pendingChannel.current = channel;
        setPrerollAd(ad);
      } else {
        playChannel(channel);
      }
    },
    [ads, activeChannel, playChannel, setSidebarOpen],
  );

  const handlePrerollComplete = useCallback((): void => {
    setPrerollAd(null);
    if (pendingChannel.current) {
      playChannel(pendingChannel.current);
      pendingChannel.current = null;
    }
  }, [playChannel]);

  const handleToggleSidebar = useCallback((): void => {
    setSidebarOpen(!sidebarOpen);
  }, [sidebarOpen, setSidebarOpen]);

  const handleLogout = useCallback(() => {
    setShowProfile(false);
    setActiveChannel(null);
    setSidebarOpen(true);
    setError(null);
    useAuthStore.getState().setUser(null);
  }, [setActiveChannel, setSidebarOpen, setError]);

  return (
    <div className={`app-container${sidebarOpen ? ' sidebar-open' : ''}`}>
      <Sidebar
        user={user}
        activeChannel={activeChannel}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleToggleSidebar}
        onSelectChannel={handleSelectChannel}
        onOpenProfile={() => setShowProfile(true)}
        channels={channels}
        isLoading={isLoading}
        loadError={loadError}
        onRetry={setRetryCount}
        error={error}
        banners={ads.banners}
        adsEnabled={ads.enabled}
      />

      <main className="main-content">
        {activeTab === 'directory' ? (
          <Directory />
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
                  if (activeChannel?.url) markDead(activeChannel.url);
                }}
              />
              {prerollAd && (
                <PreRollAd
                  ad={prerollAd}
                  skipAfter={ads.preroll.skipAfter}
                  maxDuration={ads.preroll.maxDuration}
                  onComplete={handlePrerollComplete}
                  onImpression={(id) => { trackEvent('ad_impression', id); void trackAdEvent(id, 'impression'); }}
                  onClick={(id) => { trackEvent('ad_click', id); void trackAdEvent(id, 'click'); }}
                />
              )}
              <ErrorBoundary fallback={null}>
                <AdOverlay active={!!activeChannel} />
              </ErrorBoundary>
            </div>
          </>
        )}
      </main>

      {showProfile && user && (
        <Suspense fallback={null}>
          <Profile
            user={user}
            favoritesCount={favorites.size}
            onClose={() => setShowProfile(false)}
            onLogout={handleLogout}
            onOpenAdmin={user.role === 'admin' ? () => { setShowProfile(false); void navigate('/admin'); } : undefined}
            onOpenAdMgmt={user.role === 'admin' ? () => { setShowProfile(false); void navigate('/admin'); } : undefined}
          />
        </Suspense>
      )}
    </div>
  );
}

export default App;
