import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

/**
 * Spinner component using pure CSS rotating ring
 * Sizes: sm (16px), md (24px), lg (40px)
 * Default color: accent green (#00ff88)
 */
export default function Spinner({
  size = 'md',
  color = COLORS.accent,
  className,
  ...props
}) {
  const sizePixels = {
    sm: 16,
    md: 24,
    lg: 40
  };

  const px = sizePixels[size];

  const spinnerStyle = `
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .spinner-${px} {
      display: inline-block;
      width: ${px}px;
      height: ${px}px;
      border: 2px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: ${color};
      animation: spin 600ms linear infinite;
    }
  `;

  return (
    <>
      <style>{spinnerStyle}</style>
      <div
        className={clsx(`spinner-${px}`, className)}
        role="status"
        aria-label="Loading"
        {...props}
      />
    </>
  );
}
