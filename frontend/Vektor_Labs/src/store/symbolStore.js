import { create } from 'zustand';

export const useSymbolStore = create((set, get) => ({
  selectedSymbol: 'BTC-USDT-PERP',
  connectionStatus: 'DISCONNECTED', // DISCONNECTED, CONNECTING, CONNECTED, RECONNECTING
  availableSymbols: [
    { id: 'BTC-USDT-PERP', name: 'BTC/USDT', price: '64,231.50', change: '+2.4%' },
    { id: 'ETH-USDT-PERP', name: 'ETH/USDT', price: '3,452.12', change: '-1.2%' },
  ],
  regimes: {},
  microstructure: {},
  altDataSignals: {},
  confluences: {},
  insights: [],
  alerts: [],
  summaries: {},
  orderBooks: {},

  setSelectedSymbol: (symbolId) => set({ selectedSymbol: symbolId }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),

  updateRegime: (symbol, data) => 
    set((state) => ({ regimes: { ...state.regimes, [symbol]: data } })),

  updateMicrostructure: (symbol, data) => 
    set((state) => ({ microstructure: { ...state.microstructure, [symbol]: data } })),

  updateAltDataSignal: (symbol, data) => 
    set((state) => ({ altDataSignals: { ...state.altDataSignals, [symbol]: data } })),

  updateConfluence: (symbol, data) => 
    set((state) => ({ confluences: { ...state.confluences, [symbol]: data } })),

  addInsight: (data) => 
    set((state) => ({ insights: [data, ...state.insights].slice(0, 50) })),

  addAlert: (data) => 
    set((state) => ({ alerts: [data, ...state.alerts].slice(0, 20) })),

  updateSummary: (data) => 
    set((state) => ({ summaries: { ...state.summaries, [data.symbol]: data } })),

  updateOrderBook: (symbol, data) => 
    set((state) => ({ orderBooks: { ...state.orderBooks, [symbol]: data } })),
}));
