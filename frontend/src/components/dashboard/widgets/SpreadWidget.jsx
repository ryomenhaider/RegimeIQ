import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSymbolStore } from '../../../store/symbolStore';
import { COLORS } from '../../../utils/constants';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0d0d20', border: '1px solid #2a2a4a', borderRadius: '4px',
      padding: '7px 10px', fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
    }}>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.fill, marginBottom: i < payload.length - 1 ? '3px' : 0 }}>
          <span style={{ color: '#555570', marginRight: '6px' }}>
            {p.name === 'adverse' ? 'Adverse Sel.' : 'Inventory'}
          </span>
          {Number(p.value).toFixed(3)}
        </div>
      ))}
    </div>
  );
};

const SpreadWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const microstructureData = useSymbolStore((state) => state.microstructureData);

  const microstructure = currentSymbol ? (microstructureData[currentSymbol] || {}) : {};
  const spread = microstructure?.spread ?? 0;
  const adverseSelectionPct = microstructure?.adverseSelectionPct ?? 0;
  const inventoryCostPct = 1 - adverseSelectionPct;

  const adverseSelectionComponent = adverseSelectionPct * spread;
  const inventoryCostComponent = inventoryCostPct * spread;

  const chartData = useMemo(() => [
    { name: 'Spread', adverse: adverseSelectionComponent, inventory: inventoryCostComponent }
  ], [adverseSelectionComponent, inventoryCostComponent]);

  const adverseLabel = `${(adverseSelectionPct * 100).toFixed(1)}%`;
  const inventoryLabel = `${(inventoryCostPct * 100).toFixed(1)}%`;

  const adverseHigh = adverseSelectionPct > 0.6;

  return (
    <>
      <style>{`
        .spread-chart .recharts-bar-rectangle { transition: opacity 150ms ease; }
        .spread-chart .recharts-bar-rectangle:hover { opacity: 0.8; }
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
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#ff4455', boxShadow: '0 0 6px rgba(255,68,85,0.4)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              Spread Decomposition
            </span>
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: '#555570' }}>{currentSymbol}</span>
        </div>

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', padding: '10px 12px', gap: '16px', alignItems: 'center' }}>
          {/* Chart */}
          <div className="spread-chart" style={{ flex: 1, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={60}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 0, bottom: 0 }}
                barSize={16}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="adverse" stackId="stack" fill="#ff4455" radius={[2, 0, 0, 2]}>
                  <Cell fill="#ff4455" />
                </Bar>
                <Bar dataKey="inventory" stackId="stack" fill="#00ccff" radius={[0, 2, 2, 0]}>
                  <Cell fill="#00ccff" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '6px', justifyContent: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '3px', background: '#ff4455', borderRadius: '1px' }} />
                <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em' }}>ADVERSE SEL.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                <div style={{ width: '8px', height: '3px', background: '#00ccff', borderRadius: '1px' }} />
                <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.04em' }}>INVENTORY</span>
              </div>
            </div>
          </div>

          {/* Stats panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '110px' }}>
            <div style={{ padding: '8px 10px', borderRadius: '4px', background: adverseHigh ? 'rgba(255,68,85,0.08)' : 'rgba(42,42,74,0.5)', border: `1px solid ${adverseHigh ? 'rgba(255,68,85,0.2)' : '#2a2a4a'}` }}>
              <div style={{ fontSize: '9px', color: '#ff4455', marginBottom: '4px', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Adverse Sel.</div>
              <div style={{ fontSize: '18px', fontFamily: 'IBM Plex Mono, monospace', color: '#ff4455', fontWeight: 600, lineHeight: 1 }}>{adverseLabel}</div>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: '4px', background: 'rgba(0,204,255,0.06)', border: '1px solid rgba(0,204,255,0.15)' }}>
              <div style={{ fontSize: '9px', color: '#00ccff', marginBottom: '4px', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em', textTransform: 'uppercase' }}>Inventory</div>
              <div style={{ fontSize: '18px', fontFamily: 'IBM Plex Mono, monospace', color: '#00ccff', fontWeight: 600, lineHeight: 1 }}>{inventoryLabel}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sr-only" aria-label="Spread decomposition values" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        <p>Adverse Selection: {adverseLabel}. Inventory Cost: {inventoryLabel}.</p>
      </div>
    </>
  );
};

export default SpreadWidget;