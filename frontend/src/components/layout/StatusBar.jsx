import { useEffect, useState } from 'react';
import webSocketService from '../../services/websocket';
import { COLORS } from '../../utils/constants';

/**
 * Status bar component showing WebSocket connection status
 * - Green dot: connected
 * - Yellow dot: reconnecting
 * - Red dot: disconnected/error
 */
export default function StatusBar() {
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    // Subscribe to status changes
    const handleStatusChange = (newStatus) => {
      setStatus(newStatus);
    };

    webSocketService.onStatusChange(handleStatusChange);

    // Update initial status
    setStatus(webSocketService.getStatus());

    // Cleanup
    return () => {
      // No unsubscribe method, but handlers are cleared on unmount
    };
  }, []);

  const statusColors = {
    connected: '#00ff88',
    disconnected: '#ff4455',
    reconnecting: '#f5c542',
    error: '#ff4455',
    connecting: '#f5c542'
  };

  const statusText = {
    connected: 'Connected',
    disconnected: 'Disconnected',
    reconnecting: 'Reconnecting...',
    error: 'Error',
    connecting: 'Connecting...'
  };

  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded text-xs"
      style={{
        backgroundColor: COLORS.cardAlt,
        borderColor: COLORS.border,
        color: COLORS.text
      }}
    >
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColors[status]
        }}
      />
      <span>{statusText[status]}</span>
    </div>
  );
}
