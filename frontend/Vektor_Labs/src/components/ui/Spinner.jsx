import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Spinner = ({ size = 'md', className }) => {
  const sizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-4',
  };

  return (
    <div
      className={twMerge(
        'animate-spin rounded-full border-brand-primary border-t-transparent',
        sizes[size],
        className
      )}
    />
  );
};

export default Spinner;
