import { describe, it, expect, beforeEach } from 'vitest';
import { usePlayerStore } from '../playerStore';

beforeEach(() => {
  usePlayerStore.setState({
    activeChannel: null,
    activeTab: 'all',
    search: '',
    rawSearch: '',
    selectedCountry: 'All',
    selectedGroup: 'All',
    sidebarOpen: true,
    error: null,
  });
});

describe('playerStore', () => {
  it('sets active channel', () => {
    const channel = { name: 'TF1', country: 'FR', group: 'News', logo: '', url: 'http://test.com' };
    usePlayerStore.getState().setActiveChannel(channel);
    expect(usePlayerStore.getState().activeChannel).toEqual(channel);
  });

  it('sets active tab and resets filters', () => {
    usePlayerStore.getState().setSelectedCountry('FR');
    usePlayerStore.getState().setSelectedGroup('News');
    usePlayerStore.getState().setRawSearch('test');
    usePlayerStore.getState().setActiveTab('favorites');
    const state = usePlayerStore.getState();
    expect(state.activeTab).toBe('favorites');
    expect(state.selectedCountry).toBe('All');
    expect(state.selectedGroup).toBe('All');
    expect(state.rawSearch).toBe('');
  });

  it('toggles sidebar', () => {
    usePlayerStore.getState().setSidebarOpen(false);
    expect(usePlayerStore.getState().sidebarOpen).toBe(false);
  });

  it('sets error message', () => {
    usePlayerStore.getState().setError('Test error');
    expect(usePlayerStore.getState().error).toBe('Test error');
  });

  it('resets group when country changes', () => {
    usePlayerStore.getState().setSelectedGroup('News');
    usePlayerStore.getState().setSelectedCountry('FR');
    expect(usePlayerStore.getState().selectedGroup).toBe('All');
  });
});
