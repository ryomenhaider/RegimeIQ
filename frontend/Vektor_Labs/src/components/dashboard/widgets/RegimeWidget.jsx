import React from 'react';
import Badge from '../../ui/Badge';

const RegimeWidget = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="text-3xl font-bold text-regime-trending tracking-tight">TRENDING</div>
        <Badge variant="trending">High Confidence</Badge>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-secondary">ADX (14)</span>
          <span className="font-mono-data">32.45</span>
        </div>
        <div className="w-full bg-bg-card-alt h-1.5 rounded-full overflow-hidden">
          <div className="bg-regime-trending h-full w-[65%]" />
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-text-secondary">Volatility Index</span>
          <span className="font-mono-data text-regime-meanReverting">LOW</span>
        </div>
        <div className="w-full bg-bg-card-alt h-1.5 rounded-full overflow-hidden">
          <div className="bg-regime-meanReverting h-full w-[25%]" />
        </div>
      </div>

      <div className="pt-2">
        <p className="text-[10px] text-text-muted leading-relaxed uppercase">
          Current market structure favors momentum strategies. Order flow imbalance confirms strong buy-side pressure.
        </p>
      </div>
    </div>
  );
};

export default RegimeWidget;
