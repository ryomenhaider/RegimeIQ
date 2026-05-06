import { create } from 'zustand';

export const useSettingsStore = create((set, get) => ({
  userSettings: null,
  layoutConfigs: {},
  isLoaded: false,

  setSettings: (settings) => set({ userSettings: settings, isLoaded: true }),

  updateSettings: (partial) => set((state) => ({
    userSettings: { ...state.userSettings, ...partial }
  })),

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
  }
}));
