import clsx from 'clsx';
import { COLORS } from '../../utils/constants';
import Spinner from './Spinner';

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  children,
  className,
  ...props
}) {
  const sizeStyles = {
    sm: { padding: '5px 12px', fontSize: '11px', letterSpacing: '0.04em' },
    md: { padding: '7px 16px', fontSize: '12px', letterSpacing: '0.04em' },
    lg: { padding: '10px 22px', fontSize: '13px', letterSpacing: '0.04em' }
  };

  const variantBase = {
    primary: {
      background: '#7ED87A',
      color: '#090910',
      border: 'none',
      boxShadow: '0 0 16px rgba(126,216,122,0.2), inset 0 1px 0 rgba(255,255,255,0.15)',
      hover: {
        background: '#8fe08b',
        boxShadow: '0 0 22px rgba(126,216,122,0.35), inset 0 1px 0 rgba(255,255,255,0.15)'
      }
    },
    secondary: {
      background: 'rgba(0,204,255,0.06)',
      color: '#00ccff',
      border: '1px solid rgba(0,204,255,0.3)',
      boxShadow: 'none',
      hover: {
        background: 'rgba(0,204,255,0.12)',
        boxShadow: '0 0 12px rgba(0,204,255,0.15)'
      }
    },
    danger: {
      background: 'rgba(255,68,85,0.06)',
      color: '#ff4455',
      border: '1px solid rgba(255,68,85,0.3)',
      boxShadow: 'none',
      hover: {
        background: 'rgba(255,68,85,0.12)',
        boxShadow: '0 0 12px rgba(255,68,85,0.15)'
      }
    },
    ghost: {
      background: 'transparent',
      color: '#7777aa',
      border: '1px solid transparent',
      boxShadow: 'none',
      hover: {
        background: 'rgba(42,42,74,0.5)',
        color: '#ddddf0',
        border: '1px solid #2a2a4a'
      }
    }
  };

  const v = variantBase[variant];
  const s = sizeStyles[size];
  const isDisabledOrLoading = disabled || loading;

  return (
    <>
      <style>{`
        .pf-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          font-family: 'IBM Plex Mono', monospace;
          font-weight: 500;
          border-radius: 4px;
          cursor: pointer;
          transition: background 120ms ease, box-shadow 120ms ease, color 120ms ease, border-color 120ms ease, opacity 120ms ease;
          position: relative;
          outline: none;
          white-space: nowrap;
        }
        .pf-btn:focus-visible {
          outline: 2px solid rgba(126,216,122,0.5);
          outline-offset: 2px;
        }
        .pf-btn:active:not(:disabled) {
          transform: translateY(1px);
        }
      `}</style>
      <button
        className={clsx('pf-btn', fullWidth && 'w-full', className)}
        style={{
          background: v.background,
          color: v.color,
          border: v.border || 'none',
          boxShadow: v.boxShadow,
          padding: s.padding,
          fontSize: s.fontSize,
          letterSpacing: s.letterSpacing,
          opacity: isDisabledOrLoading ? 0.45 : 1,
          cursor: isDisabledOrLoading ? 'not-allowed' : 'pointer',
          width: fullWidth ? '100%' : undefined
        }}
        onMouseEnter={(e) => {
          if (isDisabledOrLoading) return;
          if (v.hover.background) e.currentTarget.style.background = v.hover.background;
          if (v.hover.boxShadow) e.currentTarget.style.boxShadow = v.hover.boxShadow;
          if (v.hover.color) e.currentTarget.style.color = v.hover.color;
          if (v.hover.border) e.currentTarget.style.border = v.hover.border;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = v.background;
          e.currentTarget.style.boxShadow = v.boxShadow || 'none';
          e.currentTarget.style.color = v.color;
          e.currentTarget.style.border = v.border || 'none';
        }}
        disabled={isDisabledOrLoading}
        onClick={onClick}
        {...props}
      >
        {loading ? <Spinner size="sm" color={v.color} /> : children}
      </button>
    </>
  );
}