import { formatPrice, formatPercent, formatCrypto, formatTimeAgo } from '../../utils/format';

describe('formatPrice', () => {
  test('formats BTC price with proper decimals', () => {
    expect(formatPrice(42150.50)).toBe('$42,150.50');
    expect(formatPrice(1000)).toBe('$1,000.00');
    expect(formatPrice(0.00001234)).toBe('$0.00');
  });

  test('handles null/undefined', () => {
    expect(formatPrice(null)).toBe('$0.00');
    expect(formatPrice(undefined)).toBe('$0.00');
  });
});

describe('formatPercent', () => {
  test('formats percentage with sign', () => {
    expect(formatPercent(0.05)).toBe('+5.00%');
    expect(formatPercent(-0.05)).toBe('-5.00%');
    expect(formatPercent(0)).toBe('0.00%');
  });

  test('handles null/undefined', () => {
    expect(formatPercent(null)).toBe('0.00%');
  });
});

describe('formatCrypto', () => {
  test('formats crypto amounts with symbol', () => {
    expect(formatCrypto(1.5, 'BTC')).toBe('1.5000 BTC');
    expect(formatCrypto(0.0001, 'ETH')).toBe('0.0001 ETH');
  });

  test('handles null/undefined', () => {
    expect(formatCrypto(null)).toBe('0.0000');
  });
});

describe('formatTimeAgo', () => {
  test('formats time differences', () => {
    const now = Date.now();
    expect(formatTimeAgo(new Date(now))).toBe('now');
    expect(formatTimeAgo(new Date(now - 60000))).toBe('1m ago');
    expect(formatTimeAgo(new Date(now - 3600000))).toBe('1h ago');
    expect(formatTimeAgo(new Date(now - 86400000))).toBe('1d ago');
  });
});