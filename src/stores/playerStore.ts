import { create } from 'zustand';
import type { Channel } from '../types';

export type Tab = 'all' | 'favorites' | 'directory';

interface PlayerState {
  activeChannel: Channel | null;
  activeTab: Tab;
  search: string;
  rawSearch: string;
  selectedCountry: string;
  selectedGroup: string;
  sidebarOpen: boolean;
  error: string | null;
  setActiveChannel: (channel: Channel | null) => void;
  setActiveTab: (tab: Tab) => void;
  setSearch: (search: string) => void;
  setRawSearch: (search: string) => void;
  setSelectedCountry: (country: string) => void;
  setSelectedGroup: (group: string) => void;
  setSidebarOpen: (open: boolean) => void;
  setError: (error: string | null) => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  activeChannel: null,
  activeTab: 'all',
  search: '',
  rawSearch: '',
  selectedCountry: 'All',
  selectedGroup: 'All',
  sidebarOpen: true,
  error: null,
  setActiveChannel: (activeChannel) => set({ activeChannel }),
  setActiveTab: (activeTab) => set({ activeTab, selectedCountry: 'All', selectedGroup: 'All', rawSearch: '', search: '' }),
  setSearch: (search) => set({ search }),
  setRawSearch: (rawSearch) => set({ rawSearch }),
  setSelectedCountry: (selectedCountry) => set({ selectedCountry, selectedGroup: 'All' }),
  setSelectedGroup: (selectedGroup) => set({ selectedGroup }),
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  setError: (error) => set({ error }),
}));
