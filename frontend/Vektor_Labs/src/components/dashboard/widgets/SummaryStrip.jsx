import React from 'react';
import { TrendingUp, Activity, Zap, BarChart3 } from 'lucide-react';
import { useSymbolStore } from '../../../store/symbolStore';

const SummaryStrip = () => {
  const { selectedSymbol, availableSymbols } = useSymbolStore();
  const symbolData = availableSymbols.find(s => s.id === selectedSymbol) || availableSymbols[0];

  const stats = [
    { label: 'Market Regime', value: 'Trending', icon: TrendingUp, color: 'text-regime-trending' },
    { label: '24h Volume', value: '$1.2B', icon: BarChart3, color: 'text-text-primary' },
    { label: 'Open Interest', value: '$450M', icon: Activity, color: 'text-text-primary' },
    { label: 'Funding Rate', value: '0.0100%', icon: Zap, color: 'text-signal-bullish' },
  ];

  return (
    <div className="bg-bg-card border-b border-border px-6 py-3 flex items-center justify-between overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-8 divide-x divide-border">
        <div className="flex items-center gap-4 pr-8">
          <div className="text-sm font-bold text-white whitespace-nowrap">{symbolData.name}</div>
          <div className="font-mono-data text-lg">{symbolData.price}</div>
          <div className={`text-xs font-bold ${symbolData.change.startsWith('+') ? 'text-signal-bullish' : 'text-signal-bearish'}`}>
            {symbolData.change}
          </div>
        </div>

        {stats.map((stat, i) => (
          <div key={i} className="flex items-center gap-3 px-8 first:pl-0">
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold text-text-muted uppercase tracking-wider">{stat.label}</span>
              <span className={`text-sm font-bold ${stat.color}`}>{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="hidden lg:flex items-center gap-2 pl-8 border-l border-border font-mono text-[10px] text-text-muted whitespace-nowrap">
        <span>EST. SETTLEMENT: <span className="text-white">16:00:00 UTC</span></span>
      </div>
    </div>
  );
};

export default SummaryStrip;
