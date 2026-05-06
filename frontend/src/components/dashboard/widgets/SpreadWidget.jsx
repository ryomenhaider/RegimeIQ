import React, { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useSymbolStore } from '../../store/symbolStore';
import { COLORS } from '../../utils/constants';

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
        Spread Decomposition - {currentSymbol}
      </div>

      <div style={{ flex: 1, display: 'flex', padding: '8px' }}>
        <div style={{ flex: 1 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" hide />
              <Tooltip
                contentStyle={{
                  background: '#1a1a2e',
                  border: '1px solid #2a2a4a',
                  borderRadius: '4px',
                  fontSize: '11px',
                  fontFamily: 'IBM Plex Mono, monospace'
                }}
                formatter={(value, name) => [
                  value.toFixed(2),
                  name === 'adverse' ? 'Adverse Selection' : 'Inventory Cost'
                ]}
              />
              <Bar dataKey="adverse" stackId="stack" fill={COLORS.red}>
                <Cell fill={COLORS.red} />
              </Bar>
              <Bar dataKey="inventory" stackId="stack" fill={COLORS.cyan}>
                <Cell fill={COLORS.cyan} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          marginLeft: '16px',
          minWidth: '140px'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ fontSize: '10px', color: COLORS.red, marginBottom: '2px' }}>
              Adverse Selection
            </div>
            <div style={{ fontSize: '16px', fontFamily: 'IBM Plex Mono, monospace', color: COLORS.red }}>
              {adverseLabel}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: COLORS.cyan, marginBottom: '2px' }}>
              Inventory Cost
            </div>
            <div style={{ fontSize: '16px', fontFamily: 'IBM Plex Mono, monospace', color: COLORS.cyan }}>
              {inventoryLabel}
            </div>
          </div>
        </div>
      </div>

      <div
        className="sr-only"
        aria-label="Spread decomposition values"
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
        <p>Adverse Selection: {adverseLabel}. Inventory Cost: {inventoryLabel}.</p>
      </div>
    </div>
  );
};

export default SpreadWidget;