import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { useFavoritesStore } from '../../stores/favoritesStore';

const channel = {
  name: 'Test TV',
  country: 'FR',
  group: 'France',
  logo: '',
  url: 'https://example.com/test.m3u8',
};

function renderSidebar(onSelectChannel = (): void => {}): void {
  render(
    <Sidebar
      user={null}
      activeChannel={null}
      sidebarOpen
      onToggleSidebar={() => {}}
      onSelectChannel={onSelectChannel}
      onOpenProfile={() => {}}
      channels={[channel]}
      isLoading={false}
      loadError={null}
      onRetry={() => {}}
      error={null}
      banners={[]}
      adsEnabled={false}
    />,
  );
}

describe('Sidebar — favoris', () => {
  beforeEach(() => {
    localStorage.clear();
    useFavoritesStore.setState({ favorites: new Set() });
  });

  it("l'étoile ajoute la chaîne aux favoris sans la lancer", () => {
    let selected = 0;
    renderSidebar(() => { selected += 1; });

    fireEvent.click(screen.getByLabelText(/Ajouter Test TV des favoris/));

    expect(useFavoritesStore.getState().favorites.has(channel.url)).toBe(true);
    expect(selected).toBe(0);
  });

  it("un second clic retire la chaîne des favoris", () => {
    renderSidebar();
    fireEvent.click(screen.getByLabelText(/Ajouter Test TV des favoris/));
    fireEvent.click(screen.getByLabelText(/Retirer Test TV des favoris/));

    expect(useFavoritesStore.getState().favorites.has(channel.url)).toBe(false);
  });
});
