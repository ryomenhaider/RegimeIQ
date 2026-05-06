import clsx from 'clsx';
import { useSettingsStore } from '../store/settingsStore';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

/**
 * Custom hook for user settings
 * Returns settings and update methods
 */
export function useSettings() {
  const { settings, updateSettings, setSettings, isLoaded } = useSettingsStore();
  const username = useAuthStore((state) => state.username);

  const { data, isLoading, error } = useQuery({
    queryKey: ['userSettings', username],
    queryFn: async () => {
      if (!username) return null;
      const res = await api.get(`/users/${username}/settings`);
      return res.data;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
  });

  const fetchSettings = () => {
    // React Query will handle fetching automatically when data is needed
  };

  return {
    settings: data || settings,
    updateSettings,
    setSettings,
    loading: isLoading,
    fetchSettings
  };
}
