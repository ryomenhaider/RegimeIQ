import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Card = ({ children, className, variant = 'default', ...props }) => {
  const variants = {
    default: 'bg-bg-card',
    alt: 'bg-bg-card-alt',
    outline: 'bg-transparent border border-border',
  };

  return (
    <div
      className={twMerge(
        'rounded-sm border border-border p-4 shadow-lg',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
