import { useEffect, useCallback, useRef } from 'react';
import wsService from '../services/websocket';
import { useSymbolStore, selectConnectionStatus } from '../store/symbolStore';
import { useAuthStore } from '../store/authStore';

let serviceInstance = null;
let useCount = 0;

export const useWebSocket = () => {
  const connectionStatus = useSymbolStore(selectConnectionStatus);
  const token = useAuthStore((state) => state.accessToken);
  const mountedRef = useRef(true);

  useEffect(() => {
    useCount++;
    mountedRef.current = true;

    if (!serviceInstance) {
      serviceInstance = wsService;
    }

    if (token && !serviceInstance.ws) {
      serviceInstance.connect(token);
    }

    return () => {
      useCount--;
      if (useCount === 0 && mountedRef.current && serviceInstance && serviceInstance.ws) {
        serviceInstance.disconnect();
        serviceInstance = null;
      }
    };
  }, [token]);

  const subscribe = useCallback((symbol) => {
    if (serviceInstance) {
      serviceInstance.subscribe(symbol);
    }
  }, []);

  const unsubscribe = useCallback((symbol) => {
    if (serviceInstance) {
      serviceInstance.unsubscribe(symbol);
    }
  }, []);

  return {
    connectionStatus,
    subscribe,
    unsubscribe,
  };
};