import React, { useState, useEffect } from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import { COLORS, REGIME_COLORS } from '../../utils/constants';

const ContextPanel = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const regimeStates = useSymbolStore((state) => state.regimeStates);
  const microstructureData = useSymbolStore((state) => state.microstructureData);
  const llmInsights = useSymbolStore((state) => state.llmInsights);
  
  const [isExpanded, setIsExpanded] = useState(false);
  
  const regime = currentSymbol ? (regimeStates[currentSymbol] || {}) : {};
  const microstructure = currentSymbol ? (microstructureData[currentSymbol] || {}) : {};
  
  const getVPINLabel = (v) => {
    if (v < 0.3) return 'LOW';
    if (v < 0.6) return 'MODERATE';
    return 'HIGH';
  };
  
  const getConfluenceDirection = (score) => {
    if (score > 0.3) return 'BULLISH';
    if (score < -0.3) return 'BEARISH';
    return 'NEUTRAL';
  };
  
  const regimeName = regime?.regime || 'unknown';
  const regimeConfidence = (regime?.confidence || 0) * 100;
  const vpin = microstructure?.vpin || 0;
  const ofi = microstructure?.ofi || 0;
  const confluence = microstructure?.confluence || 0;
  
  const recentInsights = llmInsights
    .filter(i => i.affected_assets?.includes(currentSymbol))
    .slice(0, 3);
  
  const hasContext = regimeName !== 'unknown' || vpin > 0;

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
          cursor: 'grab',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>What AI sees</span>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          {isExpanded ? '▼' : '▲'}
        </button>
      </div>

      {isExpanded && (
        <div style={{ flex: 1, padding: '12px', overflowY: 'auto' }}>
          {!hasContext ? (
            <div style={{
              height: '100%',
              display: 'grid',
              placeItems: 'center',
              color: '#666',
              fontSize: '11px',
              textAlign: 'center'
            }}>
              No query yet. Ask the AI a question to see its context.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ContextField 
                label="Regime" 
                value={`${regimeName.toUpperCase()} (${regimeConfidence.toFixed(0)}%)`}
                valueColor={REGIME_COLORS[regimeName] || '#666'}
              />
              
              <ContextField 
                label="VPIN" 
                value={`${vpin.toFixed(2)} (${getVPINLabel(vpin)})`}
                valueColor={vpin < 0.3 ? COLORS.accent : vpin < 0.6 ? COLORS.yellow : COLORS.red}
              />
              
              <ContextField 
                label="OFI" 
                value={`${ofi.toFixed(0)} (${ofi > 0 ? 'Bullish' : 'Bearish'})`}
                valueColor={ofi > 0 ? COLORS.accent : COLORS.red}
              />
              
              <ContextField 
                label="Confluence" 
                value={`${confluence.toFixed(2)} (${getConfluenceDirection(confluence)})`}
                valueColor={getConfluenceDirection(confluence) === 'BULLISH' ? COLORS.accent : getConfluenceDirection(confluence) === 'BEARISH' ? COLORS.red : '#666'}
              />
              
              {recentInsights.length > 0 && (
                <div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '4px' }}>
                    Last {recentInsights.length} insights
                  </div>
                  {recentInsights.map((insight, i) => (
                    <div key={i} style={{
                      fontSize: '10px',
                      color: '#888',
                      marginBottom: '2px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {insight.summary?.slice(0, 50)}...
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ContextField = ({ label, value, valueColor }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '10px', color: '#666' }}>{label}</span>
    <span style={{ fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace', color: valueColor }}>
      {value}
    </span>
  </div>
);

export default ContextPanel;