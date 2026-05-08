import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSymbolStore } from '../../../store/symbolStore';
import api from '../../../services/api';

const TIER_COLORS = {
  dedicated: '#7ED87A',
  high: '#00ccff',
  mid: '#f5c542',
  low: '#ff6b35',
  fallback: '#ff4455'
};

const STATUS_COLORS = {
  OK: '#7ED87A',
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

  const formatObservations = (n) => n?.toLocaleString('en-US') || '—';

  const formatTrainedTime = (timestamp) => {
    if (!timestamp) return '—';
    const diff = Date.now() - new Date(timestamp).getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (days >= 1) return `${days}d ago`;
    if (hours >= 1) return `${hours}h ago`;
    return 'recently';
  };

  const tier = modelInfo?.tier || 'fallback';
  const status = modelInfo?.status || 'OK';
  const obs = modelInfo?.n_observations;
  const trained = modelInfo?.trained_at;

  const tierColor = TIER_COLORS[tier] || '#555570';
  const statusColor = STATUS_COLORS[status] || '#555570';

  return (
    <>
      <style>{`
        .model-row {
          display: flex; justify-content: space-between; align-items: center;
          padding: 7px 0; border-bottom: 1px solid rgba(42,42,74,0.5);
        }
        .model-row:last-child { border-bottom: none; }
      `}</style>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>
        {/* Header */}
        <div
          className="widget-header"
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #2a2a4a',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'grab',
            flexShrink: 0
          }}
        >
          <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#9333ea', boxShadow: '0 0 6px rgba(147,51,234,0.4)' }} />
          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
            Model Info
          </span>
        </div>

        <div style={{ flex: 1, padding: '10px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          {isLoading ? (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '20px', height: '20px', border: '2px solid rgba(126,216,122,0.1)', borderTopColor: '#7ED87A', borderRadius: '50%', animation: 'pfSpin 550ms linear infinite' }} />
                <style>{`@keyframes pfSpin { to { transform: rotate(360deg); } }`}</style>
                <span style={{ fontSize: '10px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}>Loading</span>
              </div>
            </div>
          ) : (
            <>
              <div className="model-row">
                <span style={{ fontSize: '10px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Tier</span>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '3px',
                  background: `${tierColor}15`, color: tierColor,
                  fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
                  letterSpacing: '0.06em', textTransform: 'uppercase',
                  border: `1px solid ${tierColor}30`
                }}>
                  {tier}
                </span>
              </div>

              <div className="model-row">
                <span style={{ fontSize: '10px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Trained</span>
                <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: '#ddddf0' }}>
                  {formatTrainedTime(trained)}
                </span>
              </div>

              <div className="model-row">
                <span style={{ fontSize: '10px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Obs</span>
                <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: '#ddddf0' }}>
                  {formatObservations(obs)}
                </span>
              </div>

              <div className="model-row">
                <span style={{ fontSize: '10px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Status</span>
                <span style={{
                  fontSize: '10px', padding: '2px 8px', borderRadius: '3px',
                  background: `${statusColor}15`, color: statusColor,
                  fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
                  letterSpacing: '0.06em', border: `1px solid ${statusColor}30`
                }}>
                  {status}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ModelInfoWidget;