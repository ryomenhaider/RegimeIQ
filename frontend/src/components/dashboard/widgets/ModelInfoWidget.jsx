import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSymbolStore } from '../../../store/symbolStore';
import api from '../../../services/api';

const TIER_COLORS = {
  dedicated: '#00ff88',
  high: '#00ccff',
  mid: '#f5c542',
  low: '#ff6b35',
  fallback: '#ff4455'
};

const STATUS_COLORS = {
  OK: '#00ff88',
  'Insufficient Data': '#f5c542',
  Fallback: '#ff6b35'
};

const ModelInfoWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  
  const { data: modelInfo, isLoading } = useQuery({
    queryKey: ['regimeModelInfo', currentSymbol],
    queryFn: async () => {
      if (!currentSymbol) return null;
      const res = await api.get(`/regime/${currentSymbol}/model`);
      return res.data;
    },
    enabled: !!currentSymbol,
    staleTime: 10 * 60 * 1000,
  });

  const formatObservations = (n) => {
    return n?.toLocaleString('en-US') || '—';
  };

  const formatTrainedTime = (timestamp) => {
    if (!timestamp) return '—';
    const diff = Date.now() - new Date(timestamp).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (days >= 1) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours >= 1) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'recently';
  };

  const tier = modelInfo?.tier || 'fallback';
  const status = modelInfo?.status || 'OK';
  const obs = modelInfo?.n_observations;
  const trained = modelInfo?.trained_at;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>
      <div
        className="widget-header"
        style={{
          padding: '8px',
          borderBottom: '1px solid #2a2a4a',
          color: '#fff',
          fontSize: '12px',
          fontFamily: 'IBM Plex Mono, monospace',
          cursor: 'grab'
        }}
      >
        Model Info
      </div>

      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {isLoading ? (
          <div style={{ 
            height: '100%', 
            display: 'grid', 
            placeItems: 'center', 
            color: '#666',
            fontSize: '11px'
          }}>
            Loading...
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Tier</span>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: `${TIER_COLORS[tier]}20`,
                color: TIER_COLORS[tier],
                fontFamily: 'IBM Plex Mono, monospace',
                textTransform: 'uppercase'
              }}>
                {tier}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Trained</span>
              <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: '#ddddf0' }}>
                {formatTrainedTime(trained)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Observations</span>
              <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: '#ddddf0' }}>
                {formatObservations(obs)}
              </span>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#666' }}>Status</span>
              <span style={{
                fontSize: '10px',
                padding: '2px 8px',
                borderRadius: '4px',
                background: `${STATUS_COLORS[status]}20`,
                color: STATUS_COLORS[status],
                fontFamily: 'IBM Plex Mono, monospace'
              }}>
                {status}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ModelInfoWidget;