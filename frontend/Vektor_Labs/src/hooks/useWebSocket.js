import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';
import { useSymbolStore } from '../store/symbolStore';
import wsService from '../services/websocket';

export const useWebSocket = () => {
  const token = useAuthStore((state) => state.accessToken);
  const connectionStatus = useSymbolStore((state) => state.connectionStatus);

  useEffect(() => {
    if (token) {
      wsService.connect(token);
    }

    return () => {
      wsService.disconnect();
    };
  }, [token]);

  return {
    connectionStatus,
    subscribe: (symbol) => wsService.subscribe(symbol),
    unsubscribe: (symbol) => wsService.unsubscribe(symbol),
  };
};
