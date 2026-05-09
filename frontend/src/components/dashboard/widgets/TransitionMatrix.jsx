import React, { useMemo, useState } from 'react';
import { useSymbolStore } from '../../../store/symbolStore';
import { Tooltip } from '../../ui';
import { REGIME_COLORS } from '../../../utils/constants';

const REGIMES = ['trending', 'mean_reverting', 'volatile', 'illiquid'];

const REGIME_META = {
  trending:      { color: '#7ED87A', short: 'TRD', label: 'Trending' },
  mean_reverting:{ color: '#00ccff', short: 'MR',  label: 'Mean Rev.' },
  volatile:      { color: '#f5c542', short: 'VOL', label: 'Volatile' },
  illiquid:      { color: '#ff4455', short: 'ILL', label: 'Illiquid' },
};

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`
    : '68, 68, 102';
}

const TransitionMatrix = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const regimeStates = useSymbolStore((state) => state.regimeStates);

  const regime = currentSymbol ? (regimeStates[currentSymbol] || {}) : {};
  const currentRegime = regime?.regime || 'unknown';
  const transitionMatrix = regime?.transition_matrix || {};

  const [hoveredRow, setHoveredRow] = useState(null);
  const [hoveredCol, setHoveredCol] = useState(null);

  // Highest probability in each row (for highlighting)
  const rowMaxes = useMemo(() => {
    const result = {};
    REGIMES.forEach((from) => {
      let max = 0;
      REGIMES.forEach((to) => {
        const p = transitionMatrix?.[from]?.[to] ?? 0;
        if (p > max) max = p;
      });
      result[from] = max;
    });
    return result;
  }, [transitionMatrix]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>

      {/* ── Header ── */}
      <div
        className="widget-header"
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #1e1e38',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'grab',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '2px', height: '12px', borderRadius: '1px',
            background: '#00ccff',
            boxShadow: '0 0 5px rgba(0,204,255,0.4)'
          }} />
          <span style={{
            fontFamily: 'IBM Plex Mono, monospace',
            fontSize: '10px',
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: '#7777aa'
          }}>
            Transition Matrix
          </span>
        </div>

        {/* Current regime badge */}
        {currentRegime !== 'unknown' && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            padding: '2px 7px',
            borderRadius: '3px',
            background: `${(REGIME_META[currentRegime] || {}).color || '#555570'}12`,
            border: `1px solid ${(REGIME_META[currentRegime] || {}).color || '#555570'}25`
          }}>
            <div style={{
              width: '5px', height: '5px', borderRadius: '50%',
              background: (REGIME_META[currentRegime] || {}).color || '#555570',
              flexShrink: 0
            }} />
            <span style={{
              fontFamily: 'IBM Plex Mono, monospace',
              fontSize: '9px',
              color: (REGIME_META[currentRegime] || {}).color || '#555570',
              fontWeight: 700,
              letterSpacing: '0.06em'
            }}>
              {(REGIME_META[currentRegime] || {}).short || currentRegime.slice(0, 3).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* ── Matrix ── */}
      <div style={{ flex: 1, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden' }}>

        {/* Column headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '36px repeat(4, 1fr)',
          gap: '2px',
          marginBottom: '2px'
        }}>
          <div /> {/* empty corner */}
          {REGIMES.map((r) => {
            const meta = REGIME_META[r];
            const isActive = r === currentRegime;
            return (
              <div
                key={`col-${r}`}
                style={{
                  fontFamily: 'IBM Plex Mono, monospace',
                  fontSize: '9px',
                  fontWeight: 700,
                  color: isActive ? meta.color : '#555570',
                  textAlign: 'center',
                  letterSpacing: '0.06em',
                  padding: '2px 0',
                  transition: 'color 150ms'
                }}
              >
                {meta.short}
              </div>
            );
          })}
        </div>

        {/* Rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1 }}>
          {REGIMES.map((rowRegime) => {
            const rowMeta = REGIME_META[rowRegime];
            const isActiveRow = rowRegime === currentRegime;
            const isHovered = hoveredRow === rowRegime;

            return (
              <div
                key={`row-${rowRegime}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '36px repeat(4, 1fr)',
                  gap: '2px',
                  flex: 1
                }}
              >
                {/* Row label */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  paddingRight: '6px'
                }}>
                  <span style={{
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontSize: '9px',
                    fontWeight: 700,
                    color: isActiveRow ? rowMeta.color : '#555570',
                    letterSpacing: '0.06em',
                    transition: 'color 150ms'
                  }}>
                    {rowMeta.short}
                  </span>
                </div>

                {/* Cells */}
                {REGIMES.map((colRegime) => {
                  const prob = transitionMatrix?.[rowRegime]?.[colRegime] ?? 0;
                  const isDiagonal = rowRegime === colRegime;
                  const isMax = prob === rowMaxes[rowRegime] && prob > 0;
                  const isRowHovered = hoveredRow === rowRegime;
                  const isColHovered = hoveredCol === colRegime;
                  const isCellHovered = isRowHovered && isColHovered;

                  const color = rowMeta.color;
                  const bgOpacity = prob * (isCellHovered ? 1 : isRowHovered || isColHovered ? 0.7 : 0.55);

                  const tooltipContent = (
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace' }}>
                      <div style={{ fontSize: '10px', color: '#7777aa', marginBottom: '3px' }}>
                        <span style={{ color: rowMeta.color }}>{rowMeta.label}</span>
                        <span style={{ color: '#555570', margin: '0 4px' }}>→</span>
                        <span style={{ color: (REGIME_META[colRegime] || {}).color }}>{(REGIME_META[colRegime] || {}).label}</span>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: isCellHovered ? color : '#ddddf0' }}>
                        {(prob * 100).toFixed(1)}%
                      </div>
                    </div>
                  );

                  return (
                    <Tooltip key={`${rowRegime}-${colRegime}`} content={tooltipContent}>
                      <div
                        style={{
                          background: `rgba(${hexToRgb(color)}, ${bgOpacity})`,
                          border: isDiagonal
                            ? `1px solid ${color}35`
                            : isMax
                            ? `1px solid ${color}25`
                            : '1px solid rgba(42,42,74,0.4)',
                          borderRadius: '3px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'IBM Plex Mono, monospace',
                          fontSize: '10px',
                          fontWeight: isMax ? 700 : 400,
                          color: prob > 0.4 ? '#090910' : prob > 0.15 ? '#ddddf0' : '#7777aa',
                          cursor: 'pointer',
                          transition: 'background 120ms, border-color 120ms',
                          fontVariantNumeric: 'tabular-nums',
                          minHeight: '24px'
                        }}
                        onMouseEnter={() => { setHoveredRow(rowRegime); setHoveredCol(colRegime); }}
                        onMouseLeave={() => { setHoveredRow(null); setHoveredCol(null); }}
                      >
                        {prob > 0.005 ? (prob * 100).toFixed(0) : '—'}
                      </div>
                    </Tooltip>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Scale legend */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '6px',
          paddingTop: '6px',
          borderTop: '1px solid #1e1e38'
        }}>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555570', letterSpacing: '0.06em' }}>0%</span>
          <div style={{
            flex: 1,
            height: '3px',
            borderRadius: '2px',
            background: 'linear-gradient(90deg, rgba(126,216,122,0.05) 0%, rgba(126,216,122,0.8) 100%)'
          }} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '9px', color: '#555570', letterSpacing: '0.06em' }}>100%</span>
        </div>
      </div>
    </div>
  );
};

export default TransitionMatrix;