import React from 'react';
import { Bot, Sparkles, AlertCircle } from 'lucide-react';

const LLMInsightWidget = () => {
  const insights = [
    {
      type: 'causal',
      text: 'CPI data higher than consensus is driving aggressive rotation into high-liquidity perps.',
      impact: 'High',
      icon: Sparkles
    },
    {
      type: 'anomaly',
      text: 'Unusual spike in whale wallet activity on Ethereum mainnet preceding the current move.',
      impact: 'Medium',
      icon: AlertCircle
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bot className="h-4 w-4 text-brand-primary" />
        <span className="text-xs font-bold text-white uppercase">Vektor AI Analysis</span>
      </div>

      {insights.map((insight, i) => (
        <div key={i} className="bg-bg-card-alt/50 border border-border/50 rounded-sm p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <insight.icon className="h-3 w-3 text-brand-primary" />
              <span className="text-[10px] font-bold text-text-muted uppercase">{insight.type}</span>
            </div>
            <span className={`text-[10px] font-bold uppercase ${insight.impact === 'High' ? 'text-regime-illiquid' : 'text-regime-volatile'}`}>
              Impact: {insight.impact}
            </span>
          </div>
          <p className="text-xs text-text-primary leading-relaxed italic">
            "{insight.text}"
          </p>
        </div>
      ))}

      <div className="pt-4 border-t border-border">
         <textarea 
            className="w-full bg-bg-card-alt border border-border rounded-sm p-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary transition-colors h-20 resize-none"
            placeholder="Ask Vektor about current market conditions..."
         />
      </div>
    </div>
  );
};

export default LLMInsightWidget;
