import React, { useState } from 'react';
import { useSymbolStore } from '../../../store/symbolStore';
import { COLORS, REGIME_COLORS } from '../../../utils/constants';

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

  const vpinColor = vpin < 0.3 ? '#7ED87A' : vpin < 0.6 ? '#f5c542' : '#ff4455';
  const ofiColor = ofi > 0 ? '#7ED87A' : '#ff4455';
  const confluenceDir = getConfluenceDirection(confluence);
  const confluenceColor = confluenceDir === 'BULLISH' ? '#7ED87A' : confluenceDir === 'BEARISH' ? '#ff4455' : '#555570';

  return (
    <>
      <style>{`
        .ctx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid rgba(42,42,74,0.5);
        }
        .ctx-row:last-child { border-bottom: none; }
        .ctx-expand-btn {
          background: none; border: none; cursor: pointer;
          color: #555570; display: flex; align-items: center; gap: 4px;
          font-family: 'IBM Plex Mono', monospace; font-size: 10px;
          letter-spacing: 0.04em; transition: color 120ms ease; padding: 0;
        }
        .ctx-expand-btn:hover { color: #7777aa; }
        .ctx-panel-scroll::-webkit-scrollbar { width: 3px; }
        .ctx-panel-scroll::-webkit-scrollbar-track { background: transparent; }
        .ctx-panel-scroll::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }
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
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#9333ea', boxShadow: '0 0 6px rgba(147,51,234,0.4)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              AI Context
            </span>
          </div>
          <button className="ctx-expand-btn" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? 'COLLAPSE' : 'EXPAND'}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor" style={{ transform: isExpanded ? 'rotate(180deg)' : 'none', transition: 'transform 150ms ease' }}>
              <path d="M1 2.5L4 5.5L7 2.5" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="ctx-panel-scroll" style={{ flex: 1, padding: '10px 12px', overflowY: 'auto' }}>
            {!hasContext ? (
              <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#555570', fontSize: '11px', textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace' }}>
                No query yet.<br />Ask the AI to populate context.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <ContextRow label="REGIME" value={`${regimeName.toUpperCase()} · ${regimeConfidence.toFixed(0)}%`} valueColor={REGIME_COLORS[regimeName] || '#666'} />
                <ContextRow label="VPIN" value={`${vpin.toFixed(2)} · ${getVPINLabel(vpin)}`} valueColor={vpinColor} />
                <ContextRow label="OFI" value={`${ofi.toFixed(0)} · ${ofi > 0 ? 'BUY' : 'SELL'}`} valueColor={ofiColor} />
                <ContextRow label="CONFLUENCE" value={`${confluence.toFixed(2)} · ${confluenceDir}`} valueColor={confluenceColor} />

                {recentInsights.length > 0 && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '9px', color: '#555570', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '6px', fontFamily: 'IBM Plex Mono, monospace' }}>
                      Recent Insights
                    </div>
                    {recentInsights.map((insight, i) => (
                      <div key={i} style={{ fontSize: '10px', color: '#7777aa', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontFamily: 'IBM Plex Sans, sans-serif', padding: '4px 0', borderBottom: '1px solid rgba(42,42,74,0.4)' }}>
                        {insight.summary?.slice(0, 52)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {!isExpanded && hasContext && (
          <div style={{ padding: '8px 12px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <MiniChip label="REGIME" value={regimeName.toUpperCase()} color={REGIME_COLORS[regimeName] || '#666'} />
            <MiniChip label="VPIN" value={vpin.toFixed(2)} color={vpinColor} />
            <MiniChip label="OFI" value={`${ofi > 0 ? '+' : ''}${ofi.toFixed(0)}`} color={ofiColor} />
          </div>
        )}
      </div>
    </>
  );
};

const ContextRow = ({ label, value, valueColor }) => (
  <div className="ctx-row">
    <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
    <span style={{ fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: valueColor, letterSpacing: '0.02em' }}>{value}</span>
  </div>
);

const MiniChip = ({ label, value, color }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 7px', borderRadius: '3px', background: 'rgba(42,42,74,0.5)', border: '1px solid #2a2a4a' }}>
    <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.06em' }}>{label}</span>
    <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color }}>{value}</span>
  </div>
);

export default ContextPanel;