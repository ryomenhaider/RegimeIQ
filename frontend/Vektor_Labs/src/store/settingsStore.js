import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useSettingsStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      notifications: true,
      compactView: false,
      tradingMode: 'standard',
      
      setTheme: (theme) => set({ theme }),
      toggleNotifications: () => set((state) => ({ notifications: !state.notifications })),
      setCompactView: (compactView) => set({ compactView }),
      setTradingMode: (tradingMode) => set({ tradingMode }),
    }),
    {
      name: 'vektor-settings',
      storage: createJSONStorage(() => localStorage), // Settings ARE persisted, unlike Auth
    }
  )
);
