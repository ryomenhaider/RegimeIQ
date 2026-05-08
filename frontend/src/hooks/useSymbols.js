import { useSymbolStore } from '../store/symbolStore';
import { useAuthStore } from '../store/authStore';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Custom hook for symbol management
 * Returns symbol state and methods
 */
export function useSymbols() {
  const {
    activeSymbols,
    currentSymbol,
    setCurrentSymbol,
    setActiveSymbols,
    initializeSymbols
  } = useSymbolStore();
  const username = useAuthStore((state) => state.username);

  // Fetch user's watched symbols from API
  const { data: symbolList, isLoading } = useQuery({
    queryKey: ['symbols', username],
    queryFn: async () => {
      const res = await api.get(`/symbols/${username}/symbols`);
      return res.data.data?.symbols || [];
    },
    staleTime: 10 * 60 * 1000,
    enabled: !!username,
  });

  return {
    activeSymbols,
    currentSymbol,
    symbolList: symbolList || [],
    isLoading,
    setCurrentSymbol,
    setActiveSymbols,
    initializeSymbols: (symbols) => {
      setActiveSymbols(symbols);
      if (!currentSymbol && symbols.length > 0) {
        setCurrentSymbol(symbols[0].id || symbols[0]);
      }
    }
  };
}
