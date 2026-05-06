import { useState, useEffect, useRef, useCallback } from 'react';
import { useSymbolStore } from '../store/symbolStore';

/**
 * Hook for WS-driven data with RAF batching
 * Batches rapid WebSocket updates for smooth rendering
 */
export function useWSBatched(symbol, dataKey) {
  const store = useSymbolStore();
  const [localData, setLocalData] = useState(null);
  const pendingUpdate = useRef(null);
  const rafId = useRef(null);

  useEffect(() => {
    if (!symbol || !dataKey) return;

    const unsubscribe = store.subscribe(
      (state) => state[dataKey]?.[symbol],
      (data) => {
        pendingUpdate.current = data;
        if (!rafId.current) {
          rafId.current = requestAnimationFrame(() => {
            setLocalData(pendingUpdate.current);
            rafId.current = null;
          });
        }
      }
    );

    return () => {
      unsubscribe();
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [symbol, dataKey, store]);

  return localData;
}

/**
 * Hook for throttled updates (max 10fps)
 */
export function useThrottledUpdate(throttleMs = 100) {
  const lastUpdate = useRef(0);
  const rafId = useRef(null);
  const pendingUpdate = useRef(null);

  const shouldUpdate = useCallback(() => {
    const now = Date.now();
    if (now - lastUpdate.current >= throttleMs) {
      lastUpdate.current = now;
      return true;
    }
    return false;
  }, [throttleMs]);

  const queueUpdate = useCallback((updateFn) => {
    if (shouldUpdate()) {
      updateFn();
    }
  }, [shouldUpdate]);

  return { queueUpdate, shouldUpdate };
}

/**
 * Hook for selecting object/array with shallow equality
 */
export function useShallowSelector(selector) {
  const store = useSymbolStore();
  return store(selector, { shallowEqual: true });
}

import { shallow } from 'zustand/shallow';

export { useWSBatched, useThrottledUpdate, useShallowSelector, shallow };