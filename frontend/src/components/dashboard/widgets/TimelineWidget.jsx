import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSymbolStore } from '../../../store/symbolStore';
import { Tooltip } from '../../ui';
import { REGIME_COLORS } from '../../../utils/constants';
import api from '../../../services/api';

const REGIME_LABELS = {
  trending: 'TRENDING',
  mean_reverting: 'MEAN_REVERTING',
  volatile: 'VOLATILE',
  illiquid: 'ILLIQUID'
};

const TimelineWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  
  const startTime = useMemo(() => {
    const now = new Date();
    now.setHours(now.getHours() - 24);
    return now.toISOString();
  }, []);

  const { data: history, isLoading } = useQuery({
    queryKey: ['regimeHistory', currentSymbol, startTime],
    queryFn: async () => {
      if (!currentSymbol) return [];
      const res = await api.get(`/regime/${currentSymbol}/history`, {
        params: { start: startTime, end: new Date().toISOString() }
      });
      return res.data;
    },
    enabled: !!currentSymbol,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const totalDuration = useMemo(() => {
    if (!history || history.length === 0) return 1;
    return history.reduce((sum, h) => sum + (h.duration || 0), 1);
  }, [history]);

  const formatDuration = (ms) => {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${m % 60}m`;
    if (m > 0) return `${m}m ${s % 60}s`;
    return `${s}s`;
  };

  const formatTime = (ts) => {
    return new Date(ts).toLocaleTimeString('en-US', { hour12: false });
  };

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
        Regime History (24h)
      </div>

      <div style={{ flex: 1, padding: '12px', overflowX: 'auto', overflowY: 'hidden' }}>
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
          <div style={{ 
            height: '100%', 
            minWidth: '100%', 
            display: 'flex', 
            alignItems: 'center',
            background: '#0a0a15',
            borderRadius: '4px'
          }}>
            {history?.length === 0 ? (
              <div style={{ 
                width: '100%', 
                textAlign: 'center', 
                color: '#666',
                fontSize: '11px'
              }}>
                No regime data in the last 24 hours
              </div>
            ) : (
              history.map((period, i) => {
                const width = Math.max((period.duration / totalDuration) * 100, 0.5);
                const minWidth = period.duration < 1000 ? 4 : width;
                const regime = period.regime || 'unknown';
                const color = REGIME_COLORS[regime] || '#444466';
                const tooltip = (
                  <div>
                    <div style={{ fontWeight: 600, color }}>{REGIME_LABELS[regime]}</div>
                    <div style={{ fontSize: '10px', color: '#888' }}>
                      {formatTime(period.start)} - {formatTime(period.end)}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      Duration: {formatDuration(period.duration)}
                    </div>
                  </div>
                );

                return (
                  <Tooltip key={i} content={tooltip}>
                    <div style={{
                      width: `${minWidth}%`,
                      height: '100%',
                      background: color,
                      opacity: 0.8,
                      minWidth: '4px',
                      cursor: 'pointer',
                      transition: 'opacity 150ms'
                    }} />
                  </Tooltip>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TimelineWidget;