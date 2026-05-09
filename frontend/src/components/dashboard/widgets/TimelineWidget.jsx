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

const REGIME_META = {
  trending:      { color: '#7ED87A' },
  mean_reverting:{ color: '#00ccff' },
  volatile:      { color: '#f5c542' },
  illiquid:      { color: '#ff4455' },
  unknown:       { color: '#2a2a4a' },
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
    if (m > 0) return `${m}m`;
    return `${s}s`;
  };

  const formatTime = (ts) =>
    new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

  // Regime duration summary
  const regimeSummary = useMemo(() => {
    if (!history?.length) return {};
    const totals = {};
    history.forEach(({ regime, duration }) => {
      totals[regime] = (totals[regime] || 0) + duration;
    });
    return totals;
  }, [history]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>

      {/* ── Header ── */}
      <div
        className="widget-header"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #1e1e38',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'grab',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '2px', height: '12px', borderRadius: '1px',
            background: '#7ED87A',
            boxShadow: '0 0 5px rgba(126,216,122,0.4)'
          }} />
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#7777aa'
          }}>
            Regime History
          </span>
        </div>
        <span style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '9px',
          color: '#555570',
          letterSpacing: '0.04em'
        }}>
          24H
        </span>
      </div>

      {/* ── Body ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '10px 12px', gap: '8px', overflow: 'hidden' }}>

        {/* Timeline bar */}
        <div style={{
          height: '22px',
          background: '#090910',
          borderRadius: '3px',
          overflow: 'hidden',
          display: 'flex',
          flexShrink: 0,
          border: '1px solid #1e1e38'
        }}>
          {isLoading ? (
            // Skeleton
            <div style={{
              flex: 1,
              background: 'linear-gradient(90deg, #16162e 25%, #1e1e38 50%, #16162e 75%)',
              backgroundSize: '200% 100%',
              animation: 'skelSlide 1.4s infinite'
            }} />
          ) : !history?.length ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '10px', color: '#555570' }}>
                No data
              </span>
            </div>
          ) : (
            history.map((period, i) => {
              const widthPct = Math.max((period.duration / totalDuration) * 100, 0.3);
              const regime = period.regime || 'unknown';
              const color = (REGIME_META[regime] || REGIME_META.unknown).color;

              const tooltipContent = (
                <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color, marginBottom: '3px', letterSpacing: '0.06em' }}>
                    {REGIME_LABELS[regime] || regime.toUpperCase()}
                  </div>
                  <div style={{ fontSize: '10px', color: '#7777aa' }}>
                    {formatTime(period.start)} – {formatTime(period.end)}
                  </div>
                  <div style={{ fontSize: '10px', color: '#555570', marginTop: '2px' }}>
                    {formatDuration(period.duration)}
                  </div>
                </div>
              );

              return (
                <Tooltip key={i} content={tooltipContent}>
                  <div
                    style={{
                      width: `${widthPct}%`,
                      height: '100%',
                      background: color,
                      opacity: 0.7,
                      minWidth: '3px',
                      cursor: 'pointer',
                      transition: 'opacity 120ms',
                      borderRight: i < history.length - 1 ? '1px solid rgba(9,9,16,0.4)' : 'none'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                    onMouseLeave={e => { e.currentTarget.style.opacity = '0.7'; }}
                  />
                </Tooltip>
              );
            })
          )}
        </div>

        {/* Time labels */}
        {!isLoading && history?.length > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', flexShrink: 0 }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555570' }}>
              {formatTime(history[0].start)}
            </span>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555570' }}>
              {formatTime(history[history.length - 1].end)}
            </span>
          </div>
        )}

        {/* Regime duration pills */}
        {!isLoading && Object.keys(regimeSummary).length > 0 && (
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '2px' }}>
            {Object.entries(regimeSummary)
              .sort((a, b) => b[1] - a[1])
              .map(([regime, duration]) => {
                const color = (REGIME_META[regime] || REGIME_META.unknown).color;
                const pct = ((duration / totalDuration) * 100).toFixed(0);
                return (
                  <div
                    key={regime}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '3px 7px',
                      borderRadius: '3px',
                      background: `${color}10`,
                      border: `1px solid ${color}20`
                    }}
                  >
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{
                      fontFamily: 'IBM Plex Mono, monospace',
                      fontSize: '9px',
                      color,
                      letterSpacing: '0.06em',
                      fontVariantNumeric: 'tabular-nums'
                    }}>
                      {REGIME_LABELS[regime]?.slice(0, 3) || regime.slice(0, 3).toUpperCase()} {pct}%
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      <style>{`
        @keyframes skelSlide {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
};

export default TimelineWidget;