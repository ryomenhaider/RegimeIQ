import React, { useState, useEffect, useMemo } from 'react';
import { useSymbolStore, selectRegime } from '../../../store/symbolStore';
import { COLORS, REGIME_COLORS } from '../../../utils/constants';

const REGIME_LABELS = {
  trending: 'TRENDING',
  mean_reverting: 'MEAN-REV',
  volatile: 'VOLATILE',
  illiquid: 'ILLIQUID',
  unknown: 'UNKNOWN'
};

const REGIME_DESCRIPTIONS = {
  trending: 'Directional momentum active',
  mean_reverting: 'Price reverts to mean',
  volatile: 'High uncertainty — caution',
  illiquid: 'Thin markets — wide spreads',
  unknown: 'Insufficient data'
};

const RegimeWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const regime = useSymbolStore(selectRegime(currentSymbol));

  const regimeData = regime || {};
  const currentRegime = regimeData?.regime || 'unknown';
  const confidence = regimeData?.confidence || 0;
  const transitionWarning = regimeData?.transition_warning || false;
  const transitionProbs = regimeData?.transition_probabilities || {};
  const enteredAt = regimeData?.entered_at || Date.now();

  const [timeInRegime, setTimeInRegime] = useState('0s');

  const regimeColor = REGIME_COLORS[currentRegime] || '#555570';
  const isPulsing = currentRegime === 'volatile' || currentRegime === 'illiquid';
  const showWarning = currentRegime === 'illiquid';

  useEffect(() => {
    if (!enteredAt) return;
    const updateTime = () => {
      const diff = Math.floor((Date.now() - enteredAt) / 1000);
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeInRegime(`${h > 0 ? h + 'h ' : ''}${m}m ${s}s`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [enteredAt]);

  const sortedTransitions = useMemo(() => {
    return Object.entries(transitionProbs)
      .filter(([r]) => r !== currentRegime)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
  }, [transitionProbs, currentRegime]);

  const highestTransition = sortedTransitions[0];
  const confidencePct = (confidence * 100).toFixed(1);

  return (
    <>
      <style>{`
        @keyframes regimePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes regimeGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(var(--glow-rgb), 0.15); }
          50% { box-shadow: 0 0 35px rgba(var(--glow-rgb), 0.3); }
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
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: regimeColor, boxShadow: `0 0 6px ${regimeColor}60` }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              Current Regime
            </span>
          </div>
          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: '#555570' }}>{currentSymbol}</span>
        </div>

        {/* Main content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px 14px', gap: '8px' }}>
          {/* Regime name */}
          <div style={{
            fontSize: '28px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700,
            color: regimeColor, letterSpacing: '-0.02em',
            animation: isPulsing ? 'regimePulse 2s ease-in-out infinite' : 'none',
            textShadow: `0 0 24px ${regimeColor}40`,
            display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            {showWarning && (
              <span style={{ fontSize: '18px', animation: 'regimePulse 1.5s ease-in-out infinite' }}>⚠</span>
            )}
            {REGIME_LABELS[currentRegime] || 'UNKNOWN'}
          </div>

          {/* Description */}
          <div style={{ fontSize: '11px', color: '#555570', fontFamily: 'IBM Plex Sans, sans-serif', textAlign: 'center' }}>
            {REGIME_DESCRIPTIONS[currentRegime]}
          </div>

          {/* Confidence meter */}
          <div style={{ width: '100%', maxWidth: '200px', marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
              <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Confidence</span>
              <span style={{ fontSize: '11px', color: regimeColor, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>{confidencePct}%</span>
            </div>
            <div style={{ height: '3px', background: 'rgba(42,42,74,0.8)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ width: `${confidence * 100}%`, height: '100%', background: regimeColor, borderRadius: '2px', boxShadow: `0 0 8px ${regimeColor}60`, transition: 'width 500ms ease' }} />
            </div>
          </div>

          {/* Time in regime */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#555570' }} />
            <span style={{ fontSize: '10px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}>
              {timeInRegime}
            </span>
          </div>

          {/* Transition warning */}
          {transitionWarning && highestTransition && (
            <div style={{
              marginTop: '8px', padding: '8px 12px', width: '100%',
              background: 'rgba(245,197,66,0.06)', borderRadius: '4px',
              border: '1px solid rgba(245,197,66,0.2)'
            }}>
              <div style={{ fontSize: '9px', color: '#f5c542', marginBottom: '4px', fontFamily: 'IBM Plex Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Transition Warning
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}>→</span>
                <span style={{ fontSize: '11px', color: '#f5c542', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600 }}>
                  {REGIME_LABELS[highestTransition[0]] || highestTransition[0]}
                </span>
                <span style={{ fontSize: '10px', color: '#7777aa', fontFamily: 'IBM Plex Mono, monospace' }}>
                  {(highestTransition[1] * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default RegimeWidget;