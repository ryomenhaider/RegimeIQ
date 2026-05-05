import { create } from 'zustand';

export const useSymbolStore = create((set) => ({
  selectedSymbol: 'BTC-USDT-PERP',
  availableSymbols: [
    { id: 'BTC-USDT-PERP', name: 'BTC/USDT', price: '64,231.50', change: '+2.4%' },
    { id: 'ETH-USDT-PERP', name: 'ETH/USDT', price: '3,452.12', change: '-1.2%' },
    { id: 'SOL-USDT-PERP', name: 'SOL/USDT', price: '145.67', change: '+5.7%' },
    { id: 'BNB-USDT-PERP', name: 'BNB/USDT', price: '589.30', change: '+0.4%' },
  ],
  setSelectedSymbol: (symbolId) => set({ selectedSymbol: symbolId }),
}));
