import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useSymbolStore, selectMicrostructure, selectRegime } from '../../../store/symbolStore';
import { COLORS } from '../../../utils/constants';

const MAX_OFI_POINTS = 200;
const MIN_UPDATE_INTERVAL = 100;
const MAX_Y_AXIS_LABELS = 5;

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0d0d20', border: '1px solid #2a2a4a', borderRadius: '4px',
      padding: '7px 10px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: i < payload.length - 1 ? '3px' : 0 }}>
          <span style={{ color: '#555570', marginRight: '6px' }}>{p.name === 'ofi' ? 'OFI' : 'MID'}</span>
          {Number(p.value).toFixed(2)}
        </div>
      ))}
    </div>
  );
};

const OfiChartWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const microstructure = useSymbolStore(selectMicrostructure(currentSymbol));
  const regime = useSymbolStore(selectRegime(currentSymbol));

  const microstructureData = microstructure || {};
  const regimeData = regime || {};

  const [ofiBuffer, setOfiBuffer] = useState([]);
  const lastUpdateRef = useRef(0);
  const tooltipRef = useRef(null);

  const m = microstructureData || {};
  const currentOfi = m.ofi ?? 0;
  const currentMidPrice = m.midPrice ?? 0;
  const regimeType = regimeData?.regime || 'unknown';

  useEffect(() => {
    const now = Date.now();
    if (now - lastUpdateRef.current < MIN_UPDATE_INTERVAL) return;
    lastUpdateRef.current = now;
    setOfiBuffer(prev => {
      const next = [...prev, { ofi: currentOfi, midPrice: currentMidPrice, time: now }];
      return next.slice(-MAX_OFI_POINTS);
    });
  }, [currentOfi, currentMidPrice]);

  const chartData = useMemo(() => ofiBuffer, [ofiBuffer]);
  const ofiValues = useMemo(() => chartData.map(d => d.ofi), [chartData]);
  const ofiMin = useMemo(() => Math.min(...ofiValues, 0), [ofiValues]);
  const ofiMax = useMemo(() => Math.max(...ofiValues, 0), [ofiValues]);

  const regimeBg = {
    trending: 'rgba(126,216,122,0.03)',
    mean_reverting: 'rgba(0,204,255,0.03)',
    volatile: 'rgba(245,197,66,0.03)',
    illiquid: 'rgba(255,68,85,0.03)',
    unknown: 'transparent'
  };

  const regimeAccent = {
    trending: '#7ED87A',
    mean_reverting: '#00ccff',
    volatile: '#f5c542',
    illiquid: '#ff4455',
    unknown: '#2a2a4a'
  };

  const last10Data = useMemo(() => chartData.slice(-10), [chartData]);

  return (
    <>
      <style>{`
        .ofi-chart-container .recharts-cartesian-grid-horizontal line,
        .ofi-chart-container .recharts-cartesian-grid-vertical line {
          stroke: rgba(42,42,74,0.4) !important;
        }
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
            justifyContent: 'space-between',
            cursor: 'grab',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#00ccff', boxShadow: '0 0 6px rgba(0,204,255,0.4)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              OFI Chart
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '16px', height: '2px', background: '#00ccff', borderRadius: '1px' }} />
              <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}>OFI</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '16px', height: '1px', background: 'rgba(255,255,255,0.4)', borderRadius: '1px' }} />
              <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}>MID</span>
            </div>
            {regimeType !== 'unknown' && (
              <span style={{
                fontSize: '9px', padding: '1px 6px', borderRadius: '2px',
                background: `${regimeAccent[regimeType]}15`, color: regimeAccent[regimeType],
                fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                border: `1px solid ${regimeAccent[regimeType]}30`
              }}>
                {regimeType.replace('_', ' ')}
              </span>
            )}
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: '#555570' }}>{currentSymbol}</span>
          </div>
        </div>

        {/* Chart */}
        <div className="ofi-chart-container" style={{ flex: 1, position: 'relative', background: regimeBg[regimeType] }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
              <XAxis dataKey="time" hide />
              <YAxis
                yAxisId="ofi"
                domain={[ofiMin, ofiMax]}
                orientation="left"
                tick={{ fontSize: 9, fill: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}
                tickFormatter={(v) => v.toFixed(0)}
                axisLine={false}
                tickLine={false}
                interval={Math.floor(chartData.length / MAX_Y_AXIS_LABELS) || 1}
              />
              <YAxis yAxisId="price" domain="auto" orientation="right" hide />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="ofi" y={0} stroke="rgba(42,42,74,0.6)" strokeDasharray="3 3" />
              <Line
                yAxisId="ofi"
                type="monotone"
                dataKey="ofi"
                stroke="#00ccff"
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                strokeOpacity={0.9}
              />
              <Line
                yAxisId="price"
                type="monotone"
                dataKey="midPrice"
                stroke="rgba(255,255,255,0.35)"
                strokeWidth={1}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Accessible table */}
        <div className="sr-only" aria-label="OFI chart data" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          <table>
            <caption>Last 10 OFI values</caption>
            <thead><tr><th>Time</th><th>OFI</th><th>Mid Price</th></tr></thead>
            <tbody>
              {last10Data.map((d, i) => (
                <tr key={i}><td>{new Date(d.time).toLocaleTimeString()}</td><td>{d.ofi.toFixed(2)}</td><td>{d.midPrice.toFixed(2)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default OfiChartWidget;