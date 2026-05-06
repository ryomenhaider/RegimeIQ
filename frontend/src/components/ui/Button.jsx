import clsx from 'clsx';
import { COLORS } from '../../utils/constants';
import Spinner from './Spinner';

/**
 * Button component with multiple variants and states
 * Supports primary, secondary, danger, and ghost variants
 * Sizes: sm, md, lg
 * Includes loading state, disabled state, and fullWidth option
 */
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
  // Size mappings
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg'
  };

  // Variant styles
  const variantStyles = {
    primary: {
      backgroundColor: COLORS.accent,
      color: COLORS.bg,
      border: 'none',
      hoverBg: '#00dd77' // 10% darker green
    },
    secondary: {
      backgroundColor: 'transparent',
      color: COLORS.cyan,
      border: `1px solid ${COLORS.cyan}`,
      hoverBg: `${COLORS.cyan}15` // 8% opacity
    },
    danger: {
      backgroundColor: 'transparent',
      color: COLORS.red,
      border: `1px solid ${COLORS.red}`,
      hoverBg: `${COLORS.red}15`
    },
    ghost: {
      backgroundColor: 'transparent',
      color: COLORS.text,
      border: 'none',
      hoverBg: `${COLORS.border}40`,
      hoverBorder: `1px solid ${COLORS.border}`
    }
  };

  const style = variantStyles[variant];
  const isDisabledOrLoading = disabled || loading;

  return (
    <button
      className={clsx(
        sizeStyles[size],
        'rounded-lg font-medium transition-all duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        fullWidth && 'w-full',
        className
      )}
      style={{
        backgroundColor: style.backgroundColor,
        color: style.color,
        border: style.border,
        borderRadius: '6px',
        cursor: isDisabledOrLoading ? 'not-allowed' : 'pointer',
        opacity: isDisabledOrLoading ? 0.6 : 1,
        focusVisible: { outline: 'none' },
        outlineOffset: '2px'
      }}
      onMouseEnter={(e) => {
        if (!isDisabledOrLoading) {
          e.currentTarget.style.backgroundColor = style.hoverBg || style.backgroundColor;
          if (style.hoverBorder) {
            e.currentTarget.style.border = style.hoverBorder;
          }
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = style.backgroundColor;
        if (style.border) {
          e.currentTarget.style.border = style.border;
        }
      }}
      disabled={isDisabledOrLoading}
      onClick={onClick}
      {...props}
    >
      {loading ? <Spinner size="sm" color={style.color} /> : children}
    </button>
  );
}
