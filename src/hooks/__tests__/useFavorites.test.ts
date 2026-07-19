import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useFavoritesStore } from '../../stores/favoritesStore';

beforeEach(() => {
  localStorage.clear();
  useFavoritesStore.setState({ favorites: new Set() });
});

describe('useFavoritesStore', () => {
  it('starts with empty favorites', () => {
    expect(useFavoritesStore.getState().favorites.size).toBe(0);
  });

  it('adds a favorite', () => {
    useFavoritesStore.getState().toggleFavorite('url1');
    expect(useFavoritesStore.getState().favorites.has('url1')).toBe(true);
  });

  it('removes a favorite', () => {
    useFavoritesStore.getState().toggleFavorite('url1');
    useFavoritesStore.getState().toggleFavorite('url1');
    expect(useFavoritesStore.getState().favorites.has('url1')).toBe(false);
  });

  it('checks isFavorite correctly', () => {
    useFavoritesStore.getState().toggleFavorite('url1');
    expect(useFavoritesStore.getState().isFavorite('url1')).toBe(true);
    expect(useFavoritesStore.getState().isFavorite('url2')).toBe(false);
  });

  it('persists favorites to localStorage', () => {
    useFavoritesStore.getState().toggleFavorite('url1');
    const stored = JSON.parse(localStorage.getItem('iptv-favorites') ?? '[]');
    expect(stored).toContain('url1');
  });
});
