import clsx from 'clsx';
import { REGIME_COLORS } from '../../utils/constants';

/**
 * Badge component for regime states and status indicators
 * Uses IBM Plex Mono for data consistency
 */
export default function Badge({ variant = 'neutral', children, className, ...props }) {
  const variantStyles = {
    trending: {
      color: REGIME_COLORS.trending,
      backgroundColor: '#001a0d'
    },
    mean_reverting: {
      color: REGIME_COLORS.mean_reverting,
      backgroundColor: '#001a1f'
    },
    volatile: {
      color: REGIME_COLORS.volatile,
      backgroundColor: '#1a1400',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    },
    illiquid: {
      color: REGIME_COLORS.illiquid,
      backgroundColor: '#1a0005',
      animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
    },
    info: {
      color: '#00ccff',
      backgroundColor: '#001a1f'
    },
    warning: {
      color: '#f5c542',
      backgroundColor: '#1a1400'
    },
    danger: {
      color: '#ff4455',
      backgroundColor: '#1a0005'
    },
    success: {
      color: '#00ff88',
      backgroundColor: '#001a0d'
    },
    neutral: {
      color: '#ddddf0',
      backgroundColor: '#2a2a4a'
    }
  };

  const style = variantStyles[variant];

  return (
    <span
      className={clsx(
        'inline-block px-2 py-1 rounded text-xs font-semibold uppercase',
        'tracking-wide',
        className
      )}
      style={{
        ...style,
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: '10px',
        letterSpacing: '0.05em'
      }}
      {...props}
    >
      {children}
    </span>
  );
}
