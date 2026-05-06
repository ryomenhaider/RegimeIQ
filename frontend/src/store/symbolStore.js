import { create } from 'zustand';
import { shallow } from 'zustand/shallow';

export const useSymbolStore = create((set, get) => ({
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
  cachedSymbols: [],
  cachedSymbolsFetched: false,

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

  addSymbol: (symbol) => set((state) => ({
    activeSymbols: [...state.activeSymbols, symbol]
  })),

  removeSymbol: (symbolId) => set((state) => ({
    activeSymbols: state.activeSymbols.filter((s) => s.id !== symbolId)
  })),

  reorderSymbols: (symbols) => set({ activeSymbols: symbols }),

  setCachedSymbols: (symbols) => set({ cachedSymbols: symbols, cachedSymbolsFetched: true }),

  setSymbolList: (symbols) => set({ symbolList: symbols }),

  initializeSymbols: (symbols) => {
    set({ activeSymbols: symbols });
    const current = get().currentSymbol;
    if (!current && symbols.length > 0) {
      set({ currentSymbol: symbols[0].id || symbols[0] });
    }
  },
}));

export const selectActiveSymbols = (state) => state.activeSymbols;
export const selectCurrentSymbol = (state) => state.currentSymbol;
export const selectRegime = (symbol) => (state) => state.regimeStates[symbol];
export const selectMicrostructure = (symbol) => (state) => state.microstructureData[symbol];
export const selectAltData = (symbol) => (state) => state.altdataData[symbol];
export const selectOrderBook = (symbol) => (state) => state.orderBooks[symbol];
export const selectSummary = (state) => state.summary;
export const selectAlerts = (state) => state.alerts;
export const selectConnectionStatus = (state) => state.connectionStatus;

export { shallow };