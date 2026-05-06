import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

/**
 * Card component for content containers
 * Supports padding sizes and border variants
 */
export default function Card({
  padding = 'md',
  border = 'default',
  children,
  className,
  ...props
}) {
  const paddingStyles = {
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-7'
  };

  const borderStyles = {
    default: `1px solid ${COLORS.border}`,
    accent: `1px solid ${COLORS.accent}`,
    danger: `1px solid ${COLORS.red}`
  };

  return (
    <div
      className={clsx(paddingStyles[padding], 'rounded-md', className)}
      style={{
        backgroundColor: COLORS.card,
        border: borderStyles[border],
        borderRadius: '6px'
      }}
      {...props}
    >
      {children}
    </div>
  );
}
