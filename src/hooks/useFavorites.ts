import { useState, useCallback } from 'react';
import { appConfig } from '../config';
import { getLocalStorageItem, setLocalStorageItem } from '../utils/validation';
import { logger } from '../utils/logger';

export function useFavorites(): {
  favorites: Set<string>;
  toggleFavorite: (url: string) => void;
} {
  const [favorites, setFavorites] = useState<Set<string>>(() => {
    try {
      const stored = getLocalStorageItem<string[]>(appConfig.favoritesStorageKey, []);
      return new Set(stored);
    } catch (error) {
      logger.error('Failed to load favorites', error as Error);
      return new Set();
    }
  });

  const toggleFavorite = useCallback((url: string): void => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(url)) {
        next.delete(url);
      } else {
        next.add(url);
      }
      if (!setLocalStorageItem(appConfig.favoritesStorageKey, Array.from(next))) {
        logger.warn('Failed to persist favorites', { url });
      }
      return next;
    });
  }, []);

  return { favorites, toggleFavorite };
}
