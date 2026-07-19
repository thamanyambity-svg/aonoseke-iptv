import { create } from 'zustand';
import { appConfig } from '../config';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/validation';
import { logger } from '../utils/logger';

interface FavoritesState {
  favorites: Set<string>;
  toggleFavorite: (url: string) => void;
  isFavorite: (url: string) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: new Set(getLocalStorageItem<string[]>(appConfig.favoritesStorageKey, [])),
  toggleFavorite: (url: string) => {
    set((state) => {
      const next = new Set(state.favorites);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      if (!setLocalStorageItem(appConfig.favoritesStorageKey, Array.from(next))) {
        logger.warn('Failed to persist favorites', { url });
      }
      return { favorites: next };
    });
  },
  isFavorite: (url: string) => get().favorites.has(url),
}));
