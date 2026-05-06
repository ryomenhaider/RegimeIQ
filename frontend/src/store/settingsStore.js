import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';

let saveTimeout = null;

export const useSettingsStore = create((set, get) => ({
  userSettings: null,
  layoutConfigs: {},
  isLoaded: false,

  setSettings: (settings) => set({ userSettings: settings, isLoaded: true }),

  updateSettings: (partial) => {
    set((state) => ({
      userSettings: { ...state.userSettings, ...partial }
    }));
    
    const username = useAuthStore.getState().username;
    if (username && saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      const merged = get().userSettings;
      api.patch(`/users/${username}/settings`, merged).catch(() => {});
    }, 500);
  },

  setLayout: (symbol, tab, layout) => set((state) => ({
    layoutConfigs: {
      ...state.layoutConfigs,
      [symbol]: {
        ...(state.layoutConfigs[symbol] || {}),
        [tab]: layout
      }
    }
  })),

  getLayout: (symbol, tab) => {
    const state = get();
    return state.layoutConfigs[symbol]?.[tab] ?? null;
  },

  getDefaultTab: () => get().userSettings?.defaultTab ?? 'microstructure',
  getWatchedSymbols: () => get().userSettings?.watchedSymbols ?? ['BTCUSDT'],
}));