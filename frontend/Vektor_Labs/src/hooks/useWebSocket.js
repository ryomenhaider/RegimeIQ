import { useEffect, useCallback } from 'react';
import wsService from '../services/websocket';

export const useWebSocket = (onMessage) => {
  useEffect(() => {
    wsService.connect();
    const unsubscribe = wsService.subscribe(onMessage);
    return () => unsubscribe();
  }, [onMessage]);

  const sendMessage = useCallback((data) => {
    wsService.send(data);
  }, []);

  return { sendMessage };
};
