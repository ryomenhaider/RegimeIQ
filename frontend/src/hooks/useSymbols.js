import { useSymbolStore } from '../store/symbolStore';
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

  // Fetch available symbols from API
  const { data: symbolList, isLoading } = useQuery({
    queryKey: ['symbols'],
    queryFn: async () => {
      const res = await api.get('/symbols');
      return res.data;
    },
    staleTime: 10 * 60 * 1000,
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
