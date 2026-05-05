import { useSettingsStore } from '../store/settingsStore';

export const useSettings = () => {
  const settings = useSettingsStore();

  return {
    ...settings,
  };
};
