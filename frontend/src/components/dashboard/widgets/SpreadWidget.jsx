import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSymbolStore } from '../../../store/symbolStore';
import { COLORS } from '../../../utils/constants';

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#090910',
      border: '1px solid #2a2a4a',
      borderRadius: '4px',
      padding: '8px 12px',
      fontSize: '11px',
      fontFamily: 'IBM Plex Mono, monospace',
      boxShadow: '0 8px 24px rgba(0,0,0,0.6)'
    }}>
      {payload.map((p, i) => (
        <div key={i} style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: i < payload.length - 1 ? '4px' : 0
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.fill, flexShrink: 0 }} />
          <span style={{ color: '#555570' }}>
            {p.name === 'adverse' ? 'Adverse Sel.' : 'Inventory'}
          </span>
          <span style={{ color: p.fill, fontWeight: 700 }}>
            {Number(p.value).toFixed(4)}
          </span>
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
        .spread-chart .recharts-bar-rectangle { transition: opacity 150ms; }
        .spread-chart .recharts-bar-rectangle:hover { opacity: 0.75; }
      `}</style>

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
              background: '#ff4455',
              boxShadow: '0 0 5px rgba(255,68,85,0.5)'
            }} />
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#7777aa'
            }}>
              Spread Decomp
            </span>
          </div>
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            color: '#555570'
          }}>
            {currentSymbol}
          </span>
        </div>

        {/* ── Body ── */}
        <div style={{
          flex: 1,
          display: 'flex',
          padding: '10px 12px',
          gap: '14px',
          alignItems: 'center',
          overflow: 'hidden'
        }}>

          {/* Chart + legend */}
          <div className="spread-chart" style={{ flex: 1, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={56}>
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
                barSize={14}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip content={<CustomTooltip />} cursor={false} />
                <Bar dataKey="adverse" stackId="s" fill="#ff4455" radius={[2, 0, 0, 2]}>
                  <Cell fill="#ff4455" />
                </Bar>
                <Bar dataKey="inventory" stackId="s" fill="#00ccff" radius={[0, 2, 2, 0]}>
                  <Cell fill="#00ccff" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div style={{
              display: 'flex',
              gap: '14px',
              marginTop: '7px',
              justifyContent: 'center'
            }}>
              {[
                { color: '#ff4455', label: 'ADVERSE SEL.' },
                { color: '#00ccff', label: 'INVENTORY' }
              ].map(({ color, label }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '2px', background: color, borderRadius: '1px' }} />
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    color: '#555570',
                    letterSpacing: '0.06em'
                  }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Stat cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '102px' }}>
            {/* Adverse */}
            <div style={{
              padding: '7px 9px',
              borderRadius: '4px',
              background: adverseHigh ? 'rgba(255,68,85,0.08)' : 'rgba(255,68,85,0.04)',
              border: `1px solid ${adverseHigh ? 'rgba(255,68,85,0.25)' : 'rgba(255,68,85,0.1)'}`,
              transition: 'background 300ms, border-color 300ms'
            }}>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '9px',
                color: '#ff4455',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '3px'
              }}>
                Adverse Sel.
                {adverseHigh && (
                  <span style={{
                    marginLeft: '5px',
                    fontSize: '8px',
                    background: 'rgba(255,68,85,0.15)',
                    padding: '1px 4px',
                    borderRadius: '2px'
                  }}>
                    HIGH
                  </span>
                )}
              </div>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '20px',
                color: '#ff4455',
                fontWeight: 700,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums'
              }}>
                {adverseLabel}
              </div>
            </div>

            {/* Inventory */}
            <div style={{
              padding: '7px 9px',
              borderRadius: '4px',
              background: 'rgba(0,204,255,0.05)',
              border: '1px solid rgba(0,204,255,0.12)'
            }}>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '9px',
                color: '#00ccff',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: '3px'
              }}>
                Inventory
              </div>
              <div style={{
                fontFamily: 'IBM Plex Mono, monospace',
                fontSize: '20px',
                color: '#00ccff',
                fontWeight: 700,
                lineHeight: 1,
                fontVariantNumeric: 'tabular-nums'
              }}>
                {inventoryLabel}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Screen reader */}
      <div className="sr-only" aria-label="Spread decomposition values" style={{ position: 'absolute', width: '1px', height: '1px', overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
        <p>Adverse Selection: {adverseLabel}. Inventory Cost: {inventoryLabel}.</p>
      </div>
    </>
  );
};

export default SpreadWidget;