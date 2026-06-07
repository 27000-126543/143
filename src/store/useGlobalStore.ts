import { create } from 'zustand';
import type { Cabin, StatisticsData } from '@/types/models';
import { api } from '@/services/api';

interface GlobalState {
  cabins: Cabin[];
  statistics: StatisticsData | null;
  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  loading: boolean;

  fetchCabins: () => Promise<void>;
  fetchStatistics: () => Promise<void>;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleTheme: () => void;
}

export const useGlobalStore = create<GlobalState>((set, get) => ({
  cabins: [],
  statistics: null,
  sidebarCollapsed: false,
  theme: 'dark',
  loading: false,

  fetchCabins: async () => {
    set({ loading: true });
    try {
      const cabins = await api.getCabins();
      set({ cabins, loading: false });
    } catch (error) {
      set({ loading: false });
      console.error('Failed to fetch cabins:', error);
    }
  },

  fetchStatistics: async () => {
    try {
      const statistics = await api.getStatistics();
      set({ statistics });
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    }
  },

  toggleSidebar: () => {
    set({ sidebarCollapsed: !get().sidebarCollapsed });
  },

  setSidebarCollapsed: (collapsed) => {
    set({ sidebarCollapsed: collapsed });
  },

  toggleTheme: () => {
    set({ theme: get().theme === 'dark' ? 'light' : 'dark' });
  },
}));
