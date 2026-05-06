import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

/**
 * Custom hook for fetching available symbols
 * Returns list of tradeable symbols
 */
export function useSymbols() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['symbols']
  });

  return { symbols: data || [], isLoading, error };
}
