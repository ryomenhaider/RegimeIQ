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
    if (v < 0.3) return { color: COLORS.accent, bg: 'rgba(0,255,136,0.1)', label: 'LOW' };
    if (v < 0.6) return { color: COLORS.yellow, bg: 'rgba(245,197,66,0.1)', label: 'MOD' };
    return { color: COLORS.red, bg: 'rgba(255,68,85,0.1)', label: 'HIGH', pulsing: true };
  };
  const vpinStyle = getVPINStyle(vpin);

  const formatScientific = (n) => {
    if (Math.abs(n) < 0.001 && n !== 0) return n.toExponential(1);
    return n.toFixed(4);
  };

  const formatPercent = (n) => `${(n * 100).toFixed(1)}%`;
  const formatIntens = (n) => `${n.toFixed(1)}/s`;
  const formatCVD = (n) => `${n > 0 ? '+' : ''}${n.toFixed(0)}`;

  const vwapColor = vwapDeviation > 0 ? COLORS.accent : COLORS.red;

  const cells = [
    { label: 'VPIN', value: vpin.toFixed(2), sub: vpinStyle.label, ...vpinStyle },
    { label: 'Kyle Λ', value: formatScientific(kyleLambda), sub: null, color: COLORS.text },
    { label: 'CVD', value: formatCVD(cvd), sub: null, color: cvd > 0 ? COLORS.accent : COLORS.red },
    { label: 'Intensity', value: formatIntens(tradeIntensity), sub: null, color: COLORS.text },
    { label: 'Adverse Sel.', value: formatPercent(adverseSelection), sub: null, color: adverseSelection > 0.5 ? COLORS.red : COLORS.text },
    { label: 'VWAP Dev.', value: formatPercent(vwapDeviation), sub: null, color: vwapColor },
  ];

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
        Microstructure
      </div>

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
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              alignItems: 'center',
              background: cell.bg || '#11112a',
              padding: '8px',
              border: cell.pulsing ? `1px solid ${cell.color}` : 'none',
              animation: cell.pulsing ? 'pulseBorder 1.5s infinite' : 'none'
            }}
          >
            <span style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', marginBottom: '4px' }}>
              {cell.label}
            </span>
            <span style={{ fontSize: '18px', fontFamily: 'IBM Plex Mono, monospace', color: cell.color }}>
              {cell.value}
            </span>
            {cell.sub && (
              <span style={{ 
                fontSize: '9px', 
                color: cell.color, 
                marginTop: '2px',
                padding: '2px 6px',
                borderRadius: '4px',
                background: cell.bg
              }}>
                {cell.sub}
              </span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulseBorder {
          0%, 100% { border-color: ${COLORS.red}; }
          50% { border-color: ${COLORS.red}66; }
        }
      `}</style>
    </div>
  );
};

export default MicrostructureWidget;