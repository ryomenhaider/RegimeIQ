import React from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import { REGIME_COLORS } from '../../utils/constants';

const REGIMES = ['trending', 'mean_reverting', 'volatile', 'illiquid'];
const REGIME_LABELS = {
  trending: 'Trending',
  mean_reverting: 'Mean-Reverting',
  volatile: 'Volatile',
  illiquid: 'Illiquid'
};

const ProbabilityBars = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const regimeStates = useSymbolStore((state) => state.regimeStates);
  
  const regime = currentSymbol ? (regimeStates[currentSymbol] || {}) : {};
  const currentRegime = regime?.regime || 'unknown';
  const posteriors = regime?.posterior_probabilities || {};

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
        Regime Probabilities
      </div>

      <div style={{ flex: 1, padding: '12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        {REGIMES.map((r) => {
          const prob = posteriors[r] ?? 0;
          const isActive = r === currentRegime;
          const color = REGIME_COLORS[r] || '#444466';
          const width = prob * 100;
          
          return (
            <div key={r} style={{ marginBottom: isActive ? '10px' : '6px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '2px'
              }}>
                <span style={{ 
                  fontSize: '12px', 
                  fontFamily: 'IBM Plex Mono, monospace',
                  color: isActive ? '#fff' : '#888'
                }}>
                  {REGIME_LABELS[r]}
                </span>
                <span style={{ 
                  fontSize: '12px', 
                  fontFamily: 'IBM Plex Mono, monospace',
                  color: color
                }}>
                  {(prob * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{
                height: isActive ? '4px' : '3px',
                background: '#1a1a2e',
                borderRadius: '2px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${width}%`,
                  height: '100%',
                  background: color,
                  transition: 'width 300ms ease',
                  opacity: isActive ? 1 : 0.7
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProbabilityBars;