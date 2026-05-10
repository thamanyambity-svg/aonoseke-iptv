import { useState, useEffect, useMemo, useCallback } from 'react'
import { Search, MonitorPlay, Star, AlertTriangle, Tv, Radio } from 'lucide-react'
import { Player } from './components/Player'
import './App.css'

interface Channel {
  name: string;
  country: string;
  group: string;
  logo: string;
  url: string;
}

// Country code → flag emoji helper
function countryFlag(code: string): string {
  if (!code || code.length !== 2) return '🌐';
  const codePoints = [...code.toUpperCase()].map(c => 0x1F1E0 - 0x41 + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Retrieve and persist favorites from localStorage
function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem('iptv-favorites');
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
      return new Set();
    }
  });

  const toggleFavorite = useCallback((url: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      localStorage.setItem('iptv-favorites', JSON.stringify([...next]));
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}

type Tab = 'all' | 'favorites';

function App() {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('All');
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('all');
  const { favorites, toggleFavorite } = useFavorites();

  useEffect(() => {
    fetch('/playlist.json')
      .then(res => res.json())
      .then((data: Channel[]) => setChannels(data))
      .catch(() => setError('Impossible de charger la playlist.'));
  }, []);

  const groups = useMemo(() => {
    const uniqueGroups = Array.from(new Set(channels.map(c => c.group)));
    return ['All', ...uniqueGroups.sort()];
  }, [channels]);

  const filteredChannels = useMemo(() => {
    let list = channels;
    if (activeTab === 'favorites') {
      list = channels.filter(c => favorites.has(c.url));
    }
    return list.filter(c => {
      const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                          c.group.toLowerCase().includes(search.toLowerCase());
      const matchGroup = selectedGroup === 'All' || c.group === selectedGroup;
      return matchSearch && matchGroup;
    });
  }, [channels, search, selectedGroup, activeTab, favorites]);

  const favoriteCount = useMemo(() => favorites.size, [favorites]);

  const handleSelectChannel = useCallback((channel: Channel) => {
    setActiveChannel(channel);
    setError(null);
  }, []);

  return (
    <div className="app-container">
      {/* ─── SIDEBAR ─── */}
      <div className="sidebar glass">

        {/* Header */}
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">
            <MonitorPlay size={18} color="#fff" />
          </div>
          <div className="sidebar-title">
            <h1>IPTV Player</h1>
            <span>Lecteur web en direct</span>
          </div>
          <div className="channel-count-badge">{channels.length}</div>
        </div>

        {/* Tabs: All / Favorites */}
        <div className="sidebar-tabs">
          <button
            className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <Tv size={14} />
            Chaînes
          </button>
          <button
            className={`tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
            onClick={() => setActiveTab('favorites')}
          >
            <Star size={14} />
            Favoris
            {favoriteCount > 0 && (
              <span className="tab-badge">{favoriteCount}</span>
            )}
          </button>
        </div>

        {/* Search */}
        <div className="search-container">
          <Search size={15} className="search-icon" />
          <input
            type="text"
            placeholder="Rechercher une chaîne ou pays…"
            className="search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Category filter — only in "all" tab */}
        {activeTab === 'all' && (
          <div className="category-filter">
            <select
              className="category-select"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
            >
              {groups.map(g => (
                <option key={g} value={g}>
                  {g === 'All' ? `🌍 Toutes les catégories (${channels.length})` : `${countryFlag(channels.find(c => c.group === g)?.country || '')} ${g}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Channel List */}
        <div className="channel-list">
          {filteredChannels.length === 0 ? (
            <div className="empty-state-small">
              {activeTab === 'favorites' ? (
                <>
                  <Star size={32} />
                  <p>Aucun favori pour l'instant.<br />Cliquez sur ★ sur une chaîne pour l'ajouter.</p>
                </>
              ) : (
                <>
                  <Radio size={32} />
                  <p>Aucune chaîne trouvée.</p>
                </>
              )}
            </div>
          ) : (
            filteredChannels.map((channel, idx) => (
              <div
                key={`${channel.url}-${idx}`}
                className={`channel-item ${activeChannel?.url === channel.url ? 'active' : ''}`}
                onClick={() => handleSelectChannel(channel)}
              >
                <div className="channel-logo">
                  {channel.logo ? (
                    <img
                      src={channel.logo}
                      alt={channel.name}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <MonitorPlay size={16} color="var(--text-dim)" />
                  )}
                </div>

                <div className="channel-info">
                  <div className="channel-name">{channel.name}</div>
                  <div className="channel-meta">
                    <span className="channel-flag">{countryFlag(channel.country)}</span>
                    <span className="channel-group">{channel.group}</span>
                  </div>
                </div>

                <button
                  className={`fav-btn ${favorites.has(channel.url) ? 'favorited' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(channel.url);
                  }}
                  title={favorites.has(channel.url) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                >
                  <Star size={13} fill={favorites.has(channel.url) ? 'currentColor' : 'none'} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ─── MAIN PLAYER ─── */}
      <div className="main-content">

        {/* Now Playing overlay */}
        {activeChannel && (
          <div className="player-header animate-fade">
            <div className="now-playing">
              <div className="live-badge">
                <span className="live-dot" />
                <span className="live-text">En direct</span>
              </div>
              <h2 className="now-playing-title">{activeChannel.name}</h2>
              <div className="now-playing-group">
                {countryFlag(activeChannel.country)} {activeChannel.group}
              </div>
            </div>

            <div className="player-logo-overlay">
              {activeChannel.logo ? (
                <img src={activeChannel.logo} alt={activeChannel.name} onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }} />
              ) : (
                <Tv size={24} color="var(--text-muted)" />
              )}
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="error-banner animate-fade-up">
            <AlertTriangle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Video player */}
        <div className="video-container">
          <Player
            url={activeChannel?.url || ''}
            onError={(msg) => setError(msg)}
          />
        </div>
      </div>
    </div>
  )
}

export default App
