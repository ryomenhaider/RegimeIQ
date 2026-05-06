import { useState, useRef } from 'react';
import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

/**
 * Tooltip component
 * - Shows on hover and keyboard focus
 * - Auto-positions to avoid viewport edges
 * - 300ms delay on hover, no delay on focus
 * - Fully accessible with ARIA
 */
export default function Tooltip({
  content,
  children,
  position = 'top',
  className,
  ...props
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [adjustedPosition, setAdjustedPosition] = useState(position);
  const triggerRef = useRef(null);
  const tooltipRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const tooltipId = useRef(`tooltip-${Math.random().toString(36).slice(2)}`);

  const handleMouseEnter = () => {
    hoverTimeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      checkPosition();
    }, 300);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsVisible(false);
  };

  const handleFocus = () => {
    setIsVisible(true);
    checkPosition();
  };

  const handleBlur = () => {
    setIsVisible(false);
  };

  const checkPosition = () => {
    // Auto-flip position if near viewport edge
    if (!triggerRef.current || !tooltipRef.current) return;

    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 32;
    const tooltipWidth = 200;

    let newPosition = position;

    if (position === 'top' && rect.top < tooltipHeight + 20) {
      newPosition = 'bottom';
    } else if (position === 'bottom' && rect.bottom + tooltipHeight + 20 > window.innerHeight) {
      newPosition = 'top';
    } else if (position === 'left' && rect.left < tooltipWidth + 20) {
      newPosition = 'right';
    } else if (position === 'right' && rect.right + tooltipWidth + 20 > window.innerWidth) {
      newPosition = 'left';
    }

    setAdjustedPosition(newPosition);
  };

  const positionStyles = {
    top: { bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: '8px' },
    bottom: { top: '100%', left: '50%', transform: 'translateX(-50%)', marginTop: '8px' },
    left: { right: '100%', top: '50%', transform: 'translateY(-50%)', marginRight: '8px' },
    right: { left: '100%', top: '50%', transform: 'translateY(-50%)', marginLeft: '8px' }
  };

  return (
    <div
      ref={triggerRef}
      className={clsx('relative inline-block group', className)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      {...props}
    >
      <div
        role="button"
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        aria-describedby={tooltipId.current}
      >
        {children}
      </div>

      {isVisible && (
        <div
          ref={tooltipRef}
          id={tooltipId.current}
          role="tooltip"
          className="absolute z-50 whitespace-nowrap pointer-events-none"
          style={{
            ...positionStyles[adjustedPosition],
            backgroundColor: '#050510',
            color: '#fff',
            border: `1px solid ${COLORS.border}`,
            borderRadius: '4px',
            padding: '4px 8px',
            fontSize: '11px',
            fontFamily: 'IBM Plex Sans, sans-serif'
          }}
        >
          {content}
          {/* Arrow */}
          <div
            style={{
              position: 'absolute',
              width: '6px',
              height: '6px',
              backgroundColor: '#050510',
              border: `1px solid ${COLORS.border}`,
              transform: 'rotate(45deg)',
              ...(adjustedPosition === 'top' && {
                bottom: '-4px',
                left: '50%',
                marginLeft: '-3px'
              }),
              ...(adjustedPosition === 'bottom' && {
                top: '-4px',
                left: '50%',
                marginLeft: '-3px'
              }),
              ...(adjustedPosition === 'left' && {
                right: '-4px',
                top: '50%',
                marginTop: '-3px'
              }),
              ...(adjustedPosition === 'right' && {
                left: '-4px',
                top: '50%',
                marginTop: '-3px'
              })
            }}
          />
        </div>
      )}
    </div>
  );
}
