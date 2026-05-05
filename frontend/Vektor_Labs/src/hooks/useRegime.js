import { useState, useCallback } from 'react';
import { useWebSocket } from './useWebSocket';

export const useRegime = (symbol) => {
  const [regime, setRegime] = useState({
    status: 'TRENDING',
    confidence: 0.85,
    adx: 32.4,
    volatility: 'LOW'
  });

  const handleMessage = useCallback((data) => {
    if (data.type === 'REGIME_UPDATE' && data.symbol === symbol) {
      setRegime(data.payload);
    }
  }, [symbol]);

  useWebSocket(handleMessage);

  return regime;
};
