/**
 * Application configuration
 * Supports environment variables via VITE_* prefix
 */

const playlistUrl = import.meta.env.VITE_PLAYLIST_URL as string | undefined;
const maxChannels = import.meta.env.VITE_MAX_CHANNELS as string | undefined;
const apiTimeout = import.meta.env.VITE_API_TIMEOUT as string | undefined;

export const appConfig = {
  // API & Data
  playlistUrl: playlistUrl ?? '/playlist.json',
  maxChannels: maxChannels ? parseInt(maxChannels, 10) : 5000,
  apiTimeout: apiTimeout ? parseInt(apiTimeout, 10) : 10000,

  // Features
  enableLogging: import.meta.env.VITE_ENABLE_LOGGING !== 'false',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',

  // Storage
  favoritesStorageKey: 'iptv-favorites',
  maxFavoritesSize: 5000, // bytes

  // Performance
  virtualizationThreshold: 100, // Items before using virtual scroll
  imageLoadTimeout: 5000, // milliseconds

  // UI
  defaultLanguage: 'fr',
} as const;

export type AppConfig = typeof appConfig;
