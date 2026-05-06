import React, { useMemo, useState } from 'react';
import { useSymbolStore } from '../../../store/symbolStore';
import { Tooltip } from '../../ui';
import { REGIME_COLORS } from '../../../utils/constants';

const REGIMES = ['trending', 'mean_reverting', 'volatile', 'illiquid'];
const REGIME_LABELS = {
  trending: 'TRD',
  mean_reverting: 'MR',
  volatile: 'VOL',
  illiquid: 'ILL'
};

const TransitionMatrix = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const regimeStates = useSymbolStore((state) => state.regimeStates);
  
  const regime = currentSymbol ? (regimeStates[currentSymbol] || {}) : {};
  const currentRegime = regime?.regime || 'unknown';
  const transitionMatrix = regime?.transition_matrix || {};
  
  const [hoveredCell, setHoveredCell] = useState(null);

  const getCellStyle = (fromRegime, toRegime, prob) => {
    const isDiagonal = fromRegime === toRegime;
    const isActive = fromRegime === currentRegime;
    const regimeColor = REGIME_COLORS[fromRegime] || '#444466';
    
    return {
      background: `rgba(${hexToRgb(regimeColor)}, ${prob * 0.8})`,
      border: isDiagonal ? `1px dashed ${regimeColor}40` : '1px solid transparent',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '11px',
      fontFamily: 'IBM Plex Mono, monospace',
      color: '#ddddf0',
      cursor: 'pointer',
      transition: 'background 150ms',
    };
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
        Transition Matrix
      </div>

      <div style={{ flex: 1, padding: '8px', display: 'grid', gridTemplateColumns: '30px 1fr 1fr 1fr 1fr' }}>
        <div />
        {REGIMES.map((r) => (
          <div key={`col-${r}`} style={{ 
            fontSize: '10px', 
            color: '#666', 
            textAlign: 'center',
            fontFamily: 'IBM Plex Mono, monospace'
          }}>
            {REGIME_LABELS[r]}
          </div>
        ))}
        
        {REGIMES.map((rowRegime) => (
          <React.Fragment key={`row-${rowRegime}`}>
            <div style={{ 
              fontSize: '10px', 
              color: '#666',
              fontFamily: 'IBM Plex Mono, monospace',
              display: 'flex',
              alignItems: 'center'
            }}>
              {REGIME_LABELS[rowRegime]}
            </div>
            {REGIMES.map((colRegime) => {
              const prob = transitionMatrix?.[rowRegime]?.[colRegime] ?? 0;
              const tooltipText = `P(${rowRegime} → ${colRegime}) = ${(prob * 100).toFixed(1)}%`;
              
              return (
                <Tooltip key={`${rowRegime}-${colRegime}`} content={tooltipText}>
                  <div 
                    style={getCellStyle(rowRegime, colRegime, prob)}
                    onMouseEnter={() => setHoveredCell({ row: rowRegime, col: colRegime })}
                    onMouseLeave={() => setHoveredCell(null)}
                  >
                    {prob > 0.01 ? prob.toFixed(2) : '—'}
                  </div>
                </Tooltip>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '68, 68, 102';
}

export default TransitionMatrix;