import { useSettingsStore } from '../store/settingsStore';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

/**
 * Custom hook for user settings
 * Returns settings and update methods
 */
export function useSettings() {
  const { userSettings, updateSettings, setSettings } = useSettingsStore();
  const username = useAuthStore((state) => state.username);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['userSettings', username],
    queryFn: async () => {
      if (!username) return null;
      const res = await api.get(`/users/${username}/settings`);
      return res.data.data;
    },
    enabled: !!username,
    staleTime: 5 * 60 * 1000,
    onSuccess: (data) => {
      if (data) {
        setSettings(data);
      }
    },
  });

  const fetchSettings = () => {
    refetch();
  };

  return {
    settings: data || userSettings,
    updateSettings,
    setSettings,
    loading: isLoading,
    fetchSettings
  };
}
