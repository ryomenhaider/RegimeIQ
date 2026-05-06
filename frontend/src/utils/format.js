import { format, formatDistance, parseISO } from 'date-fns';

/**
 * Utility functions for formatting data
 */

export const formatDate = (date) => {
  return format(new Date(date), 'MMM dd, yyyy');
};

export const formatTime = (date) => {
  return format(new Date(date), 'HH:mm:ss');
};

export const formatDateTime = (date) => {
  return format(new Date(date), 'MMM dd, yyyy HH:mm:ss');
};

export const formatRelativeTime = (date) => {
  return formatDistance(new Date(date), new Date(), { addSuffix: true });
};

export const formatTimeAgo = (date) => {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  
  if (diff < 60000) return 'now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
};

export const formatPrice = (price, decimals = 2) => {
  const num = parseFloat(price);
  if (isNaN(num)) return '$0.00';
  return '$' + num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatCrypto = (amount, symbol = '') => {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0.0000';
  const formatted = num.toFixed(4).replace(/\.?0+$/, '');
  return symbol ? `${formatted} ${symbol}` : formatted;
};

export const formatPercent = (value, decimals = 2) => {
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return '0.00%';
  const sign = num >= 0 ? '+' : '';
  return `${sign}${(num * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};
