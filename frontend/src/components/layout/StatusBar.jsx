import React, { useEffect } from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import { useAuthStore } from '../../store/authStore';
import webSocketService from '../../services/websocket';
import { COLORS } from '../../utils/constants';

export default function StatusBar() {
  const connectionStatus = useSymbolStore((state) => state.connectionStatus);
  const microstructureData = useSymbolStore((state) => state.microstructureData);
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const plan = useAuthStore((state) => state.plan);

  const data = microstructureData[currentSymbol] || {};
  
  const formatNumber = (num, decimals = 2) => {
    if (num === undefined || num === null) return '--';
    return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  };

  const fundingRate = data.fundingRate !== undefined ? `${data.fundingRate > 0 ? '+' : ''}${formatNumber(data.fundingRate * 100, 4)}%` : '--';
  const openInterest = data.openInterest !== undefined ? formatNumber(data.openInterest / 1000000, 2) + 'M' : '--';
  const liquidations1h = data.liquidations1h !== undefined ? formatNumber(data.liquidations1h) : '--';
  const mempoolFees = data.mempoolFees !== undefined ? formatNumber(data.mempoolFees, 0) + ' sat/vB' : '--';

  const tierLabels = {
    trial: 'Trial',
    standard: 'Standard',
    unlimited: 'Unlimited'
  };

  return (
    <footer style={{
      height: '26px',
      background: '#050510',
      borderTop: '1px solid #2a2a4a',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: '24px',
      fontFamily: 'IBM Plex Mono, monospace',
      fontSize: '10px',
      color: '#666'
    }}>
      <span>Funding {fundingRate}</span>
      <span>OI {openInterest}</span>
      <span>Liq 1h {liquidations1h}</span>
      <span>Fees {mempoolFees}</span>
      <span style={{ marginLeft: 'auto' }}>
        Model: {connectionStatus === 'reconnecting' ? (
          <span style={{ color: '#f5c542' }}>Reconnecting...</span>
        ) : (
          tierLabels[plan] || 'Trial'
        )}
      </span>
    </footer>
  );
}