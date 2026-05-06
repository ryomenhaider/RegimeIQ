import React, { useState, useEffect, useCallback } from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import { COLORS } from '../../utils/constants';

export default function AlertStrip() {
  const alerts = useSymbolStore((state) => state.alerts);
  const dismissAlert = useSymbolStore((state) => state.dismissAlert);
  const [currentAlert, setCurrentAlert] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    if (alerts.length > 0 && !currentAlert) {
      setCurrentAlert(alerts[0]);
      setIsTransitioning(true);
    }
  }, [alerts, currentAlert]);

  useEffect(() => {
    if (currentAlert?.type === 'auto-dismiss' || currentAlert?.duration) {
      const timer = setTimeout(() => {
        handleDismiss();
      }, currentAlert.duration || 10000);
      return () => clearTimeout(timer);
    }
  }, [currentAlert]);

  const handleDismiss = useCallback(() => {
    setIsTransitioning(false);
    setTimeout(() => {
      dismissAlert();
      setCurrentAlert(null);
    }, 200);
  }, [dismissAlert]);

  if (!currentAlert) {
    return (
      <div style={{
        height: '0px',
        overflow: 'hidden',
        transition: 'height 200ms ease-out'
      }} />
    );
  }

  const isHighSeverity = currentAlert.severity === 'critical' || currentAlert.severity === 'error';
  
  const bgColors = {
    regime: '#2a1500',
    toxicity: '#1a0005',
    critical: '#1a0005',
    error: '#1a0005',
    warning: '#2a1500',
    info: '#0d1a2a'
  };

  return (
    <div
      style={{
        height: isTransitioning ? '28px' : '0px',
        overflow: 'hidden',
        transition: 'height 200ms ease-out',
        background: bgColors[currentAlert.type] || bgColors.info,
        display: 'flex',
        alignItems: 'center',
        padding: '0 16px',
        justifyContent: 'space-between'
      }}
      aria-live={isHighSeverity ? 'assertive' : 'polite'}
      aria-atomic="true"
    >
      <span style={{
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '11px',
        color: COLORS.text,
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        {currentAlert.title && (
          <span style={{ fontWeight: 600, color: COLORS.yellow }}>
            {currentAlert.title}:
          </span>
        )}
        {currentAlert.message}
        {alerts.length > 1 && (
          <span style={{
            marginLeft: '8px',
            padding: '2px 6px',
            background: COLORS.border,
            borderRadius: '4px',
            fontSize: '10px'
          }}>
            +{alerts.length - 1} more
          </span>
        )}
      </span>
      <button
        onClick={handleDismiss}
        style={{
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
          padding: '4px',
          fontSize: '14px',
          lineHeight: 1
        }}
        aria-label="Dismiss alert"
      >
        ×
      </button>
    </div>
  );
}