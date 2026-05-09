import { create } from 'zustand';
import api from '../services/api';
import { useAuthStore } from './authStore';
import toast from 'react-hot-toast';

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
    if (!username) return;

    get()._debouncedSave(username);
  },

  _debouncedSave: (() => {
    let pendingFields = {};
    let saveTimer = null;
    let savePromise = null;

    return (username) => {
      if (saveTimer) clearTimeout(saveTimer);

      saveTimer = setTimeout(async () => {
        saveTimer = null;
        const fieldsToSave = { ...pendingFields };
        pendingFields = {};

        if (Object.keys(fieldsToSave).length === 0) return;

        const currentSettings = get().userSettings;
        if (!currentSettings) return;

        try {
          await api.patch(`/users/${username}/settings`, currentSettings);
        } catch (err) {
          console.error('Settings save failed:', err);
          toast.error('Failed to save settings. Please try again.');
        }
      }, 800);
    };
  })(),

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
