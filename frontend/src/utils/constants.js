// Design tokens and configuration constants
export const COLORS = {
  bg: '#0b0b1a',
  card: '#11112a',
  cardAlt: '#16162e',
  border: '#2a2a4a',
  accent: '#7ED87A',  // Updated to match actual usage in components
  cyan: '#00ccff',
  warn: '#ff6b35',
  red: '#ff4455',
  yellow: '#f5c542',
  text: '#ddddf0'
};

export const FONTS = {
  mono: 'IBM Plex Mono',
  sans: 'IBM Plex Sans'
};

export const REGIME_COLORS = {
  trending: '#00ff88',
  mean_reverting: '#00ccff',
  volatile: '#f5c542',
  illiquid: '#ff4455'
};

export const VPIN_THRESHOLDS = {
  low: 0.3,
  moderate: 0.6
};

export const WS_RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 30000];
