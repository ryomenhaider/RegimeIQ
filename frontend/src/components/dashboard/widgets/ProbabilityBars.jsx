import React from 'react';
import { useSymbolStore } from '../../../store/symbolStore';
import { REGIME_COLORS } from '../../../utils/constants';

const REGIMES = ['trending', 'mean_reverting', 'volatile', 'illiquid'];
const REGIME_LABELS = {
  trending: 'TREND',
  mean_reverting: 'MEAN-REV',
  volatile: 'VOLATILE',
  illiquid: 'ILLIQUID'
};

const ProbabilityBars = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const regimeStates = useSymbolStore((state) => state.regimeStates);

  const regime = currentSymbol ? (regimeStates[currentSymbol] || {}) : {};
  const currentRegime = regime?.regime || 'unknown';
  const posteriors = regime?.posterior_probabilities || {};

  const sortedRegimes = [...REGIMES].sort((a, b) => (posteriors[b] ?? 0) - (posteriors[a] ?? 0));

  return (
    <>
      <style>{`
        @keyframes barExpand {
          from { width: 0%; }
        }
        .prob-bar {
          transition: width 400ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .prob-row {
          transition: opacity 150ms ease;
        }
        .prob-row:hover { opacity: 0.85; }
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
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#7ED87A', boxShadow: '0 0 6px rgba(126,216,122,0.4)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              Regime Probabilities
            </span>
          </div>
        </div>

        {/* Bars */}
        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '10px' }}>
          {sortedRegimes.map((r) => {
            const prob = posteriors[r] ?? 0;
            const isActive = r === currentRegime;
            const color = REGIME_COLORS[r] || '#444466';
            const pct = (prob * 100).toFixed(1);

            return (
              <div key={r} className="prob-row">
                {/* Label row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    {isActive && (
                      <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: color, boxShadow: `0 0 6px ${color}`, flexShrink: 0 }} />
                    )}
                    {!isActive && <div style={{ width: '5px', flexShrink: 0 }} />}
                    <span style={{
                      fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace',
                      color: isActive ? '#ddddf0' : '#555570',
                      letterSpacing: '0.06em', fontWeight: isActive ? 600 : 400
                    }}>
                      {REGIME_LABELS[r]}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace',
                    color: isActive ? color : '#555570',
                    fontWeight: isActive ? 600 : 400
                  }}>
                    {pct}%
                  </span>
                </div>

                {/* Bar track */}
                <div style={{
                  height: isActive ? '4px' : '3px',
                  background: 'rgba(42,42,74,0.6)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div
                    className="prob-bar"
                    style={{
                      width: `${prob * 100}%`,
                      height: '100%',
                      background: isActive
                        ? `linear-gradient(90deg, ${color}, ${color}cc)`
                        : color,
                      borderRadius: '2px',
                      opacity: isActive ? 1 : 0.45,
                      boxShadow: isActive ? `0 0 8px ${color}60` : 'none'
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default ProbabilityBars;