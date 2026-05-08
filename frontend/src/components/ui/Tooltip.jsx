import { useState, useRef } from 'react';
import clsx from 'clsx';

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
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    setIsVisible(false);
  };

  const handleFocus = () => { setIsVisible(true); checkPosition(); };
  const handleBlur = () => setIsVisible(false);

  const checkPosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipHeight = 32;
    const tooltipWidth = 200;
    let newPosition = position;
    if (position === 'top' && rect.top < tooltipHeight + 20) newPosition = 'bottom';
    else if (position === 'bottom' && rect.bottom + tooltipHeight + 20 > window.innerHeight) newPosition = 'top';
    else if (position === 'left' && rect.left < tooltipWidth + 20) newPosition = 'right';
    else if (position === 'right' && rect.right + tooltipWidth + 20 > window.innerWidth) newPosition = 'left';
    setAdjustedPosition(newPosition);
  };

  const positionStyles = {
    top: { bottom: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top: 'calc(100% + 8px)', left: '50%', transform: 'translateX(-50%)' },
    left: { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' },
    right: { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
  };

  const arrowStyles = {
    top: { bottom: '-4px', left: '50%', marginLeft: '-3px', borderBottom: '1px solid #2a2a4a', borderRight: '1px solid #2a2a4a' },
    bottom: { top: '-4px', left: '50%', marginLeft: '-3px', borderTop: '1px solid #2a2a4a', borderLeft: '1px solid #2a2a4a' },
    left: { right: '-4px', top: '50%', marginTop: '-3px', borderTop: '1px solid #2a2a4a', borderRight: '1px solid #2a2a4a' },
    right: { left: '-4px', top: '50%', marginTop: '-3px', borderBottom: '1px solid #2a2a4a', borderLeft: '1px solid #2a2a4a' }
  };

  return (
    <>
      <style>{`
        @keyframes tooltipIn {
          from { opacity: 0; transform: translateX(-50%) translateY(2px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      <div
        ref={triggerRef}
        className={clsx('relative inline-block', className)}
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
              backgroundColor: '#0d0d20',
              color: '#ddddf0',
              border: '1px solid #2a2a4a',
              borderRadius: '4px',
              padding: '5px 9px',
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono, monospace',
              letterSpacing: '0.02em',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
              animation: 'tooltipIn 120ms ease-out'
            }}
          >
            {content}
            <div
              style={{
                position: 'absolute',
                width: '6px',
                height: '6px',
                backgroundColor: '#0d0d20',
                transform: 'rotate(45deg)',
                ...arrowStyles[adjustedPosition]
              }}
            />
          </div>
        )}
      </div>
    </>
  );
}