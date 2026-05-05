import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  className, 
  isLoading = false, 
  disabled = false, 
  ...props 
}) => {
  const variants = {
    primary: 'bg-brand-primary text-bg-pure hover:bg-brand-light disabled:bg-text-muted',
    secondary: 'bg-bg-card border border-border text-text-primary hover:bg-bg-card-alt',
    outline: 'border border-brand-primary text-brand-primary hover:bg-brand-primary/10',
    ghost: 'text-text-secondary hover:text-text-primary hover:bg-bg-card-alt',
    danger: 'bg-regime-illiquid text-white hover:bg-regime-illiquid/80',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };

  return (
    <button
      className={twMerge(
        'inline-flex items-center justify-center rounded-sm font-medium transition-colors focus:outline-none focus:ring-1 focus:ring-brand-primary disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {children}
    </button>
  );
};

export default Button;
