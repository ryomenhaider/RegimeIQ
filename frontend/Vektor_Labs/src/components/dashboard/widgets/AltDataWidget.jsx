import React from 'react';
import Badge from '../../ui/Badge';

const AltDataWidget = () => {
  const sources = [
    { name: 'On-Chain Flow', value: 'Bullish', change: '+12%', color: 'text-signal-bullish' },
    { name: 'Reddit Sentiment', value: 'Neutral', change: '-2%', color: 'text-signal-neutral' },
    { name: 'Google Trends', value: 'High Interest', change: '+45%', color: 'text-signal-bullish' },
    { name: 'FRED Macro', value: 'Hawkish', change: 'N/A', color: 'text-regime-illiquid' },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
      {sources.map((source, i) => (
        <div key={i} className="bg-bg-card-alt/30 border border-border/50 rounded-sm p-4 flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">{source.name}</span>
            <Badge variant="neutral">{source.change}</Badge>
          </div>
          <div className="mt-4">
            <div className={`text-xl font-bold ${source.color}`}>{source.value}</div>
            <div className="text-[10px] text-text-secondary mt-1 uppercase tracking-tighter">Confidence: 84%</div>
          </div>
          <div className="mt-4 w-full bg-border/20 h-1 rounded-full overflow-hidden">
             <div className={`h-full w-[84%] ${source.color.replace('text', 'bg')}`} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default AltDataWidget;
