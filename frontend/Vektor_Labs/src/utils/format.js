import { format as formatDateFns } from 'date-fns';

export const formatCurrency = (value, currency = 'USD', decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatNumber = (value, decimals = 2) => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value, decimals = 2) => {
  return `${value > 0 ? '+' : ''}${formatNumber(value, decimals)}%`;
};

export const formatCompact = (value) => {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

export const formatDateTime = (date) => {
  return formatDateFns(new Date(date), 'yyyy-MM-dd HH:mm:ss');
};
