import React, { useState, useEffect, useMemo } from 'react';
import { useSymbolStore, selectRegime } from '../../../store/symbolStore';
import { COLORS, REGIME_COLORS } from '../../../utils/constants';

const REGIME_LABELS = {
  trending: 'TRENDING',
  mean_reverting: 'MEAN_REVERTING',
  volatile: 'VOLATILE',
  illiquid: 'ILLIQUID',
  unknown: 'UNKNOWN'
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

  const regimeColor = REGIME_COLORS[currentRegime] || REGIME_COLORS.unknown;
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
    const others = Object.entries(transitionProbs)
      .filter(([r]) => r !== currentRegime)
      .sort((a, b) => b[1] - a[1]);
    return others.slice(0, 3);
  }, [transitionProbs, currentRegime]);

  const highestTransition = sortedTransitions[0];

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
        Current Regime
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '16px' }}>
        <div style={{
          fontSize: '32px',
          fontFamily: 'IBM Plex Mono, monospace',
          fontWeight: 700,
          color: regimeColor,
          animation: isPulsing ? 'pulseText 1.5s infinite' : 'none',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {showWarning && <span>⚠</span>}
          {REGIME_LABELS[currentRegime] || 'UNKNOWN'}
        </div>

        <div style={{
          fontSize: '24px',
          fontFamily: 'IBM Plex Mono, monospace',
          color: '#ddddf0',
          marginTop: '8px'
        }}>
          {(confidence * 100).toFixed(1)}% confidence
        </div>

        <div style={{
          fontSize: '12px',
          fontFamily: 'IBM Plex Mono, monospace',
          color: '#666',
          marginTop: '4px'
        }}>
          In this regime: {timeInRegime}
        </div>

        {transitionWarning && highestTransition && (
          <div style={{
            marginTop: '12px',
            padding: '8px 12px',
            background: '#2a1500',
            borderRadius: '4px',
            border: '1px solid #f5c542',
            width: '100%'
          }}>
            <div style={{ fontSize: '11px', color: '#f5c542', marginBottom: '4px' }}>
              Transition warning — regime may change soon
            </div>
            <div style={{ fontSize: '12px', color: '#f5c542', fontFamily: 'IBM Plex Mono, monospace' }}>
              → {REGIME_LABELS[highestTransition[0]] || highestTransition[0]}: {(highestTransition[1] * 100).toFixed(0)}%
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulseText {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }
      `}</style>
    </div>
  );
};

export default RegimeWidget;