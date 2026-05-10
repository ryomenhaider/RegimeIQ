import { useEffect, useCallback, useRef, createContext, useContext } from 'react';
import wsService from '../services/websocket';
import { useSymbolStore, selectConnectionStatus } from '../store/symbolStore';
import { useAuthStore } from '../store/authStore';

const WebSocketContext = createContext(null);

function WebSocketConnector({ children }) {
  const connectionStatus = useSymbolStore(selectConnectionStatus);
  const token = useAuthStore((state) => state.accessToken);
  const connectedRef = useRef(false);

  useEffect(() => {
    if (token && !connectedRef.current) {
      wsService.connect(token);
      connectedRef.current = true;
    } else if (!token && connectedRef.current) {
      wsService.disconnect();
      connectedRef.current = false;
    }

    return () => {
      if (connectedRef.current) {
        wsService.disconnect();
        connectedRef.current = false;
      }
    };
  }, [token]);

  const subscribe = useCallback((symbol) => {
    wsService.subscribe(symbol);
  }, []);

  const unsubscribe = useCallback((symbol) => {
    wsService.unsubscribe(symbol);
  }, []);

  return (
    <WebSocketContext.Provider value={{ connectionStatus, subscribe, unsubscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function WebSocketProvider({ children }) {
  return (
    <WebSocketConnector>
      {children}
    </WebSocketConnector>
  );
}

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    const connectionStatus = useSymbolStore(selectConnectionStatus);
    const token = useAuthStore((state) => state.accessToken);
    const connectedRef = useRef(false);

    useEffect(() => {
      if (token && !connectedRef.current) {
        wsService.connect(token);
        connectedRef.current = true;
      } else if (!token && connectedRef.current) {
        wsService.disconnect();
        connectedRef.current = false;
      }

      return () => {
        if (connectedRef.current) {
          wsService.disconnect();
          connectedRef.current = false;
        }
      };
    }, [token]);

    return {
      connectionStatus,
      subscribe: (symbol) => wsService.subscribe(symbol),
      unsubscribe: (symbol) => wsService.unsubscribe(symbol),
    };
  }
  return context;
};
