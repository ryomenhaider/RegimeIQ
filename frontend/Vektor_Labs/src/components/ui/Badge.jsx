import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Badge = ({ children, variant = 'neutral', className, ...props }) => {
  const variants = {
    neutral: 'bg-bg-card-alt text-text-secondary',
    bullish: 'bg-signal-bullish/10 text-signal-bullish border border-signal-bullish/20',
    bearish: 'bg-signal-bearish/10 text-signal-bearish border border-signal-bearish/20',
    trending: 'bg-regime-trending/10 text-regime-trending border border-regime-trending/20',
    volatile: 'bg-regime-volatile/10 text-regime-volatile border border-regime-volatile/20',
    meanReverting: 'bg-regime-meanReverting/10 text-regime-meanReverting border border-regime-meanReverting/20',
    illiquid: 'bg-regime-illiquid/10 text-regime-illiquid border border-regime-illiquid/20',
  };

  return (
    <span
      className={twMerge(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

export default Badge;
