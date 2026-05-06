import { useEffect, useCallback } from 'react';
import wsService from '../services/websocket';
import { useSymbolStore, selectConnectionStatus } from '../store/symbolStore';
import { useAuthStore } from '../store/authStore';

let serviceInstance = null;

export const useWebSocket = () => {
  const connectionStatus = useSymbolStore(selectConnectionStatus);
  const token = useAuthStore((state) => state.accessToken);

  useEffect(() => {
    if (!serviceInstance) {
      serviceInstance = wsService;
    }

    if (token && !serviceInstance.ws) {
      serviceInstance.connect(token);
    }

    return () => {
      if (serviceInstance && serviceInstance.ws) {
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