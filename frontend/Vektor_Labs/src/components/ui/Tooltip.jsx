import React, { useState } from 'react';
import { clsx } from 'clsx';

const Tooltip = ({ children, content, position = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);

  const positions = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrows = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-bg-card',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-bg-card',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-bg-card',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-bg-card',
  };

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={clsx(
          "absolute z-[60] px-2 py-1 text-[10px] font-bold text-text-primary bg-bg-card border border-border rounded shadow-xl whitespace-nowrap pointer-events-none uppercase tracking-wider",
          positions[position]
        )}>
          {content}
          <div className={clsx(
            "absolute border-4 border-transparent",
            arrows[position]
          )} />
        </div>
      )}
    </div>
  );
};

export default Tooltip;
