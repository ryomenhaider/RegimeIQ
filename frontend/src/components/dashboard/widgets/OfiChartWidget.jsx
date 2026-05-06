import React, { useState, useEffect, useRef, useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useSymbolStore, selectMicrostructure, selectRegime } from '../../../store/symbolStore';
import { COLORS } from '../../../utils/constants';

const MAX_OFI_POINTS = 200;
const MIN_UPDATE_INTERVAL = 100;
const MAX_Y_AXIS_LABELS = 5;

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

  // Throttle updates to max 10fps
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
  const midPriceValues = useMemo(() => chartData.map(d => d.midPrice), [chartData]);
  
  const ofiMin = useMemo(() => Math.min(...ofiValues, 0), [ofiValues]);
  const ofiMax = useMemo(() => Math.max(...ofiValues, 0), [ofiValues]);
  
  const regimeBackground = {
    trending: 'rgba(0, 255, 136, 0.05)',
    mean_reverting: 'rgba(0, 204, 255, 0.05)',
    volatile: 'rgba(245, 197, 66, 0.05)',
    illiquid: 'rgba(255, 68, 85, 0.05)',
    unknown: 'transparent'
  };

  const last10Data = useMemo(() => chartData.slice(-10), [chartData]);

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
        OFI Chart - {currentSymbol}
      </div>

      <div style={{ flex: 1, position: 'relative', background: regimeBackground[regimeType] }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <XAxis dataKey="time" hide />
            <YAxis 
              yAxisId="ofi" 
              domain={[ofiMin, ofiMax]} 
              orientation="left" 
              tick={{ fontSize: 10, fill: '#666' }}
              tickFormatter={(v) => v.toFixed(0)}
              interval={Math.floor(chartData.length / MAX_Y_AXIS_LABELS) || 1}
            />
            <YAxis 
              yAxisId="price" 
              domain="auto" 
              orientation="right" 
              tick={{ fontSize: 10, fill: '#666' }}
              hide
            />
            <Tooltip
              ref={tooltipRef}
              contentStyle={{ 
                background: '#1a1a2e', 
                border: '1px solid #2a2a4a',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'IBM Plex Mono, monospace'
              }}
              labelStyle={{ color: '#888' }}
              formatter={(value, name) => [
                name === 'ofi' ? value.toFixed(2) : value.toFixed(2),
                name === 'ofi' ? 'OFI' : 'Mid Price'
              ]}
            />
            <Line
              yAxisId="ofi"
              type="monotone"
              dataKey="ofi"
              stroke={COLORS.cyan}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
            <Line
              yAxisId="price"
              type="monotone"
              dataKey="midPrice"
              stroke="#ffffff"
              strokeWidth={1}
              dot={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>

        <div
          className="sr-only"
          aria-label="OFI chart data"
          style={{
            position: 'absolute',
            width: '1px',
            height: '1px',
            padding: '0',
            margin: '-1px',
            overflow: 'hidden',
            clip: 'rect(0,0,0,0)',
            border: '0'
          }}
        >
          <table>
            <caption>Last 10 OFI values</caption>
            <thead>
              <tr><th>Time</th><th>OFI</th><th>Mid Price</th></tr>
            </thead>
            <tbody>
              {last10Data.map((d, i) => (
                <tr key={i}>
                  <td>{new Date(d.time).toLocaleTimeString()}</td>
                  <td>{d.ofi.toFixed(2)}</td>
                  <td>{d.midPrice.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OfiChartWidget;