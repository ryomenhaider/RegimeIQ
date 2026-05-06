import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import { COLORS } from '../../utils/constants';
import { shallow } from 'zustand/shallow';
import Tooltip from '../ui/Tooltip';

export default function SummaryStrip() {
  const summary = useSymbolStore((state) => state.summary);
  const confluence = useSymbolStore((state) => state.confluence);
  const [displayText, setDisplayText] = useState('');
  const timestamp = useMemo(() => new Date(), []);
  const containerRef = useRef(null);

  useEffect(() => {
    if (summary) {
      setDisplayText('');
      const charsPerSecond = 30;
      let index = 0;
      const interval = setInterval(() => {
        if (index < summary.length) {
          setDisplayText(summary.slice(0, index + 1));
          index += Math.ceil(charsPerSecond / 10);
        } else {
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [summary]);

  const bgColors = useMemo(() => ({
    bullish: 'rgba(0, 255, 136, 0.05)',
    bearish: 'rgba(255, 68, 85, 0.05)',
    neutral: '#0d0d1f'
  }), []);

  const defaultText = 'Connecting to market intelligence...';

  return (
    <div
      ref={containerRef}
      style={{
        height: '32px',
        background: bgColors[confluence] || bgColors.neutral,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        overflow: 'hidden'
      }}
      aria-live="polite"
      aria-atomic="true"
      role="status"
    >
      <span
        style={{
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '11px',
          color: COLORS.text,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {displayText || defaultText}
      </span>
      <Tooltip content={`Updated: ${timestamp.toLocaleTimeString()}`}>
        <span style={{
          position: 'absolute',
          right: '8px',
          opacity: 0,
          cursor: 'default'
        }} aria-hidden="true">
          {timestamp.toLocaleTimeString()}
        </span>
      </Tooltip>
    </div>
  );
}