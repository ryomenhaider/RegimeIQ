import React from 'react';
import { useSymbolStore, selectMicrostructure, selectRegime } from '../../../store/symbolStore';
import { COLORS } from '../../../utils/constants';

const MicrostructureWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const microstructure = useSymbolStore(selectMicrostructure(currentSymbol));
  const regime = useSymbolStore(selectRegime(currentSymbol));

  const m = microstructure || {};

  const vpin = m.vpin ?? 0;
  const kyleLambda = m.kyleLambda ?? 0;
  const cvd = m.cvd ?? 0;
  const tradeIntensity = m.tradeIntensity ?? 0;
  const adverseSelection = m.adverseSelectionPct ?? 0;
  const vwapDeviation = m.vwapDeviation ?? 0;

  const getVPINStyle = (v) => {
    if (v < 0.3) return { color: '#7ED87A', bg: 'rgba(126,216,122,0.05)', label: 'LOW', glow: 'rgba(126,216,122,0.15)' };
    if (v < 0.6) return { color: '#f5c542', bg: 'rgba(245,197,66,0.05)', label: 'MOD', glow: null };
    return { color: '#ff4455', bg: 'rgba(255,68,85,0.05)', label: 'HIGH', glow: 'rgba(255,68,85,0.15)', pulsing: true };
  };
  const vpinStyle = getVPINStyle(vpin);

  const formatScientific = (n) => {
    if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(1);
    return n.toFixed(4);
  };

  const formatPercent = (n) => `${(n * 100).toFixed(1)}%`;
  const formatIntens = (n) => `${n.toFixed(1)}/s`;
  const formatCVD = (n) => `${n > 0 ? '+' : ''}${n.toFixed(0)}`;
  const vwapColor = vwapDeviation > 0 ? '#7ED87A' : '#ff4455';

  const cells = [
    { label: 'VPIN', value: vpin.toFixed(2), sub: vpinStyle.label, color: vpinStyle.color, bg: vpinStyle.bg, pulsing: vpinStyle.pulsing, glow: vpinStyle.glow },
    { label: 'KYLE λ', value: formatScientific(kyleLambda), color: '#ddddf0' },
    { label: 'CVD', value: formatCVD(cvd), color: cvd > 0 ? '#7ED87A' : '#ff4455' },
    { label: 'INTENSITY', value: formatIntens(tradeIntensity), color: '#ddddf0' },
    { label: 'ADV.SEL', value: formatPercent(adverseSelection), color: adverseSelection > 0.5 ? '#ff4455' : '#ddddf0' },
    { label: 'VWAP DEV', value: formatPercent(vwapDeviation), color: vwapColor },
  ];

  return (
    <>
      <style>{`
        @keyframes msMetricPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(255,68,85,0.2); }
          50% { box-shadow: 0 0 0 4px rgba(255,68,85,0); }
        }
        .ms-cell {
          display: flex; flex-direction: column;
          justify-content: center; align-items: center;
          background: #11112a; padding: 10px 8px;
          transition: background 150ms ease;
          position: relative;
        }
        .ms-cell:hover { background: #16162e; }
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
            gap: '8px',
            cursor: 'grab',
            flexShrink: 0
          }}
        >
          <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#00ccff', boxShadow: '0 0 6px rgba(0,204,255,0.4)' }} />
          <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
            Microstructure
          </span>
        </div>

        {/* Metrics Grid */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gridTemplateRows: 'repeat(2, 1fr)',
          gap: '1px',
          background: '#2a2a4a'
        }}>
          {cells.map((cell, i) => (
            <div
              key={i}
              className="ms-cell"
              style={{
                background: cell.bg || '#11112a',
                animation: cell.pulsing ? 'msMetricPulse 2s infinite' : 'none'
              }}
            >
              <span style={{
                fontSize: '9px', color: '#555570', textTransform: 'uppercase',
                letterSpacing: '0.08em', marginBottom: '6px',
                fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500
              }}>
                {cell.label}
              </span>
              <span style={{
                fontSize: '17px', fontFamily: 'IBM Plex Mono, monospace',
                color: cell.color, fontWeight: 600, lineHeight: '1',
                textShadow: cell.glow ? `0 0 12px ${cell.glow}` : 'none'
              }}>
                {cell.value}
              </span>
              {cell.sub && (
                <span style={{
                  fontSize: '9px', color: cell.color, marginTop: '4px',
                  padding: '1px 6px', borderRadius: '2px',
                  background: `${cell.color}15`, letterSpacing: '0.06em',
                  fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
                  textTransform: 'uppercase'
                }}>
                  {cell.sub}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default MicrostructureWidget;