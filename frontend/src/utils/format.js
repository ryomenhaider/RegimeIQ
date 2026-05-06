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

export const formatPrice = (price, decimals = 2) => {
  return parseFloat(price).toFixed(decimals);
};

export const formatPercent = (value, decimals = 2) => {
  return `${(value * 100).toFixed(decimals)}%`;
};

export const formatCurrency = (amount, currency = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
};
