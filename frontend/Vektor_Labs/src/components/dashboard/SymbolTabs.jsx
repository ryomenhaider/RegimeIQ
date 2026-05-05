import React from 'react';
import { useSymbolStore } from '../../store/symbolStore';
import { clsx } from 'clsx';

const SymbolTabs = () => {
  const { availableSymbols, selectedSymbol, setSelectedSymbol } = useSymbolStore();

  return (
    <div className="flex items-center bg-bg-card p-1 rounded-sm border border-border">
      {availableSymbols.map((symbol) => (
        <button
          key={symbol.id}
          onClick={() => setSelectedSymbol(symbol.id)}
          className={clsx(
            'px-4 py-1.5 text-xs font-bold transition-all rounded-sm',
            selectedSymbol === symbol.id
              ? 'bg-bg-card-alt text-brand-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          )}
        >
          {symbol.name}
        </button>
      ))}
      <button className="px-4 py-1.5 text-xs font-bold text-text-muted hover:text-white transition-colors">
        +
      </button>
    </div>
  );
};

export default SymbolTabs;
