import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useSymbolStore } from '../../store/symbolStore';
import { COLORS } from '../../utils/constants';

export default function Topbar({ children }) {
  const username = useAuthStore((state) => state.username);
  const connectionStatus = useSymbolStore((state) => state.connectionStatus);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const statusColors = {
    connected: '#00ff88',
    reconnecting: '#f5c542',
    disconnected: '#ff4455',
    error: '#ff4455'
  };

  return (
    <header style={{
      height: '42px',
      background: '#050510',
      borderBottom: '1px solid #2a2a4a',
      display: 'grid',
      gridTemplateColumns: '1fr auto 1fr',
      alignItems: 'center',
      padding: '0 16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '18px',
          fontWeight: 700,
          color: COLORS.accent
        }}>
          VektorLabs
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center' }}>
        {children}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: statusColors[connectionStatus] || statusColors.disconnected
          }} />
        </div>
        
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '12px',
          color: '#888'
        }}>
          {time.toLocaleTimeString('en-US', { hour12: false })}
        </span>

        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '12px',
          color: COLORS.text
        }}>
          {username || 'User'}
        </span>
      </div>
    </header>
  );
}