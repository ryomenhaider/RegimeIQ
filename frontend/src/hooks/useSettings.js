import clsx from 'clsx';
import { useSettingsStore } from '../store/settingsStore';

/**
 * Custom hook for user settings
 * Returns settings and update methods
 */
export function useSettings() {
  const { settings, updateSettings } = useSettingsStore();

  return {
    settings,
    updateSettings
  };
}
