import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

/**
 * Custom hook for fetching regime data
 * Returns regime state and related metrics
 */
export function useRegime(symbol) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['regime', symbol],
    enabled: !!symbol
  });

  return { regime: data, isLoading, error };
}
