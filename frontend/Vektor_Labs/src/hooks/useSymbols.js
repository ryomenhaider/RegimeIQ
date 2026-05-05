import { useSymbolStore } from '../store/symbolStore';

export const useSymbols = () => {
  const { selectedSymbol, availableSymbols, setSelectedSymbol } = useSymbolStore();

  const currentSymbolData = availableSymbols.find(s => s.id === selectedSymbol);

  return {
    selectedSymbol,
    availableSymbols,
    currentSymbolData,
    setSelectedSymbol,
  };
};
