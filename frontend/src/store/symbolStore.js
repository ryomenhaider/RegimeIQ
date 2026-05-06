import { create } from 'zustand';

export const useSymbolStore = create((set) => ({
  activeSymbols: [],
  currentSymbol: null,
  symbolList: [],
  regimeStates: {},
  microstructureData: {},
  altdataData: {},
  orderBooks: {},
  llmInsights: [],
  summary: null,
  alerts: [],
  connectionStatus: 'disconnected',

  updateRegime: (symbol, data) => set((state) => ({
    regimeStates: { ...state.regimeStates, [symbol]: data }
  })),

  updateMicrostructure: (symbol, data) => set((state) => ({
    microstructureData: { ...state.microstructureData, [symbol]: data }
  })),

  updateAltData: (symbol, data) => set((state) => ({
    altdataData: { ...state.altdataData, [symbol]: data }
  })),

  updateOrderBook: (symbol, data) => set((state) => ({
    orderBooks: { ...state.orderBooks, [symbol]: data }
  })),

  addInsight: (insight) => set((state) => ({
    llmInsights: [insight, ...state.llmInsights].slice(0, 50)
  })),

  updateSummary: (text) => set({ summary: text }),

  addAlert: (alert) => set((state) => ({
    alerts: [...state.alerts, alert]
  })),

  dismissAlert: () => set((state) => ({
    alerts: state.alerts.slice(1)
  })),

  setConnectionStatus: (status) => set({ connectionStatus: status }),

  setCurrentSymbol: (symbol) => set({ currentSymbol: symbol }),

  setActiveSymbols: (symbols) => set({ activeSymbols: symbols }),
}));
