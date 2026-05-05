import React from 'react';
import { AlertCircle, X } from 'lucide-react';

const AlertStrip = () => {
  return (
    <div className="bg-regime-volatile/10 border border-regime-volatile/20 rounded-sm p-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <AlertCircle className="h-4 w-4 text-regime-volatile" />
        <p className="text-xs font-medium text-text-primary">
          <span className="font-bold text-regime-volatile uppercase mr-2">Market Alert:</span> 
          Significant liquidity gap detected at $63,800. Large buy orders appearing on Binance Futures.
        </p>
      </div>
      <button className="text-text-muted hover:text-white transition-colors">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

export default AlertStrip;
