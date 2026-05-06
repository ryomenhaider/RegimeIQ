import { useEffect } from 'react';
import wsService from '../services/websocket';
import { useSymbolStore } from '../store/symbolStore';
import { useAuthStore } from '../store/authStore';

export const useWebSocket = () => {
  const connectionStatus = useSymbolStore((state) => state.connectionStatus);
  const token = useAuthStore((state) => state.accessToken);

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
