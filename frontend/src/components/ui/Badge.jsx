import clsx from 'clsx';
import { REGIME_COLORS } from '../../utils/constants';

export default function Badge({ variant = 'neutral', children, className, ...props }) {
  const variantStyles = {
    trending: {
      color: REGIME_COLORS.trending,
      backgroundColor: 'rgba(126,216,122,0.08)',
      borderColor: 'rgba(126,216,122,0.25)',
      boxShadow: '0 0 8px rgba(126,216,122,0.12)'
    },
    mean_reverting: {
      color: REGIME_COLORS.mean_reverting,
      backgroundColor: 'rgba(0,204,255,0.08)',
      borderColor: 'rgba(0,204,255,0.25)',
      boxShadow: '0 0 8px rgba(0,204,255,0.12)'
    },
    volatile: {
      color: REGIME_COLORS.volatile,
      backgroundColor: 'rgba(245,197,66,0.08)',
      borderColor: 'rgba(245,197,66,0.25)',
      animation: 'badgePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    },
    illiquid: {
      color: REGIME_COLORS.illiquid,
      backgroundColor: 'rgba(255,68,85,0.08)',
      borderColor: 'rgba(255,68,85,0.25)',
      animation: 'badgePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    },
    info: {
      color: '#00ccff',
      backgroundColor: 'rgba(0,204,255,0.08)',
      borderColor: 'rgba(0,204,255,0.25)'
    },
    warning: {
      color: '#f5c542',
      backgroundColor: 'rgba(245,197,66,0.08)',
      borderColor: 'rgba(245,197,66,0.25)'
    },
    danger: {
      color: '#ff4455',
      backgroundColor: 'rgba(255,68,85,0.08)',
      borderColor: 'rgba(255,68,85,0.25)'
    },
    success: {
      color: '#7ED87A',
      backgroundColor: 'rgba(126,216,122,0.08)',
      borderColor: 'rgba(126,216,122,0.25)',
      boxShadow: '0 0 8px rgba(126,216,122,0.12)'
    },
    neutral: {
      color: '#7777aa',
      backgroundColor: 'rgba(42,42,74,0.6)',
      borderColor: '#2a2a4a'
    }
  };

  const style = variantStyles[variant];

  return (
    <>
      <style>{`
        @keyframes badgePulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.65; }
        }
      `}</style>
      <span
        className={clsx('inline-flex items-center gap-1', className)}
        style={{
          ...style,
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '10px',
          fontWeight: 600,
          letterSpacing: '0.07em',
          textTransform: 'uppercase',
          padding: '2px 7px',
          borderRadius: '3px',
          border: `1px solid ${style.borderColor}`,
          lineHeight: '16px',
          whiteSpace: 'nowrap'
        }}
        {...props}
      >
        {children}
      </span>
    </>
  );
}