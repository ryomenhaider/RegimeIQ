import React from 'react';

const OrderBookWidget = () => {
  const levels = Array.from({ length: 15 }, (_, i) => ({
    price: 64231.50 - i * 0.5,
    size: Math.random() * 50,
    side: 'bid'
  })).concat(Array.from({ length: 15 }, (_, i) => ({
    price: 64231.50 + i * 0.5 + 0.5,
    size: Math.random() * 50,
    side: 'ask'
  })).reverse());

  return (
    <div className="flex flex-col h-full font-mono text-[10px]">
      <div className="grid grid-cols-3 text-text-muted mb-2 font-sans font-bold uppercase tracking-widest">
        <span>Price</span>
        <span className="text-right">Size</span>
        <span className="text-right">Total</span>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col gap-[1px]">
        {levels.map((level, i) => (
          <div key={i} className="grid grid-cols-3 py-[2px] relative group hover:bg-white/5 cursor-crosshair">
            <div className={`z-10 ${level.side === 'ask' ? 'text-regime-illiquid' : 'text-signal-bullish'}`}>
              {level.price.toFixed(2)}
            </div>
            <div className="z-10 text-right text-text-primary">{level.size.toFixed(4)}</div>
            <div className="z-10 text-right text-text-secondary">{(level.size * 1.5).toFixed(2)}</div>
            
            <div 
              className={`absolute top-0 right-0 h-full opacity-20 ${level.side === 'ask' ? 'bg-regime-illiquid' : 'bg-signal-bullish'}`}
              style={{ width: `${Math.min(level.size * 2, 100)}%` }}
            />
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex items-center justify-between font-sans">
         <div className="flex flex-col">
            <span className="text-[10px] text-text-muted uppercase">Spread</span>
            <span className="text-sm font-bold text-white">0.50 (0.001%)</span>
         </div>
         <div className="flex flex-col text-right">
            <span className="text-[10px] text-text-muted uppercase">Liquidity Score</span>
            <span className="text-sm font-bold text-brand-primary">OPTIMAL</span>
         </div>
      </div>
    </div>
  );
};

export default OrderBookWidget;
