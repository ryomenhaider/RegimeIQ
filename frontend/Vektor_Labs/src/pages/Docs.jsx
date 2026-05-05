import React, { useState } from 'react';
import { 
  Book, 
  Terminal, 
  Zap, 
  LineChart, 
  ShieldCheck, 
  Cpu,
  ChevronRight,
  Search
} from 'lucide-react';
import { clsx } from 'clsx';

const Docs = () => {
  const [activeTab, setActiveTab] = useState('quickstart');

  const categories = [
    {
      id: 'getting-started',
      label: 'Getting Started',
      items: [
        { id: 'quickstart', label: 'Quickstart Guide', icon: Zap },
        { id: 'installation', label: 'Terminal Setup', icon: Terminal },
      ]
    },
    {
      id: 'core-concepts',
      label: 'Core Concepts',
      items: [
        { id: 'regimes', label: 'Market Regimes', icon: LineChart },
        { id: 'orderflow', label: 'Order Flow Analysis', icon: Cpu },
        { id: 'altdata', label: 'Alternative Data', icon: Book },
      ]
    },
    {
      id: 'api-reference',
      label: 'API Reference',
      items: [
        { id: 'authentication', label: 'Authentication', icon: ShieldCheck },
        { id: 'endpoints', label: 'WebSocket API', icon: Terminal },
      ]
    }
  ];

  const content = {
    quickstart: {
      title: 'Quickstart Guide',
      body: (
        <div className="space-y-6">
          <p className="text-lg text-text-secondary leading-relaxed">
            Welcome to VektorLabs. This guide will help you set up your terminal and understand the core analytical modules in under 5 minutes.
          </p>
          
          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">1. Authenticate</h3>
            <p className="text-text-secondary">
              First, ensure you are logged in. Your API keys are managed in the <span className="text-brand-primary">Settings</span> tab. 
              VektorLabs uses secure JWT-based authentication with memory-only storage.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">2. Select a Symbol</h3>
            <p className="text-text-secondary">
              Use the symbol tabs at the top of the dashboard to switch between perpetual futures markets. 
              Currently, we support high-liquidity pairs on Binance and OKX.
            </p>
          </section>

          <section className="space-y-4">
            <h3 className="text-xl font-bold text-white uppercase tracking-tight">3. Monitor Market Regime</h3>
            <div className="bg-bg-card-alt p-4 border-l-4 border-brand-primary rounded-sm">
              <p className="text-sm italic text-text-primary">
                "The Market Regime widget is your primary filter. Never trade against the current regime confidence."
              </p>
            </div>
          </section>
        </div>
      )
    },
    regimes: {
      title: 'Market Regime Detection',
      body: (
        <div className="space-y-6">
          <p className="text-lg text-text-secondary leading-relaxed">
            Our proprietary HMM (Hidden Markov Model) classifies markets into four distinct states in real-time.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { name: 'Trending', color: 'text-regime-trending', desc: 'Strong momentum, low volatility. Optimal for breakout strategies.' },
              { name: 'Mean-Reverting', color: 'text-regime-meanReverting', desc: 'Oscillating within range. Optimal for grid and RSI-based strategies.' },
              { name: 'Volatile', color: 'text-regime-volatile', desc: 'Expanding ranges, unpredictable. High risk of liquidation.' },
              { name: 'Illiquid', color: 'text-regime-illiquid', desc: 'Gaps in order book. Slippage risk is extreme.' },
            ].map(r => (
              <div key={r.name} className="bg-bg-card p-4 border border-border rounded-sm">
                <div className={`font-bold mb-2 ${r.color}`}>{r.name.toUpperCase()}</div>
                <p className="text-xs text-text-secondary">{r.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )
    }
  };

  const activeContent = content[activeTab] || { title: 'Coming Soon', body: <p className="text-text-secondary">Documentation for this section is currently being drafted.</p> };

  return (
    <div className="flex h-screen bg-bg-pure overflow-hidden">
      {/* Docs Sidebar */}
      <aside className="w-72 border-r border-border bg-bg-app flex flex-col">
        <div className="p-6 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
            <input 
              type="text" 
              placeholder="Search docs..." 
              className="w-full bg-bg-card border border-border rounded-sm pl-10 pr-4 py-2 text-xs text-text-primary focus:outline-none focus:border-brand-primary"
            />
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-4 space-y-8">
          {categories.map((cat) => (
            <div key={cat.id} className="space-y-2">
              <h4 className="px-4 text-[10px] font-bold text-text-muted uppercase tracking-widest">{cat.label}</h4>
              <div className="space-y-1">
                {cat.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={clsx(
                      "w-full flex items-center justify-between px-4 py-2 rounded-sm text-sm font-medium transition-colors group",
                      activeTab === item.id 
                        ? "bg-brand-primary/10 text-brand-primary" 
                        : "text-text-secondary hover:bg-bg-card hover:text-text-primary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </div>
                    <ChevronRight className={clsx(
                      "h-3 w-3 opacity-0 group-hover:opacity-100 transition-all",
                      activeTab === item.id && "opacity-100"
                    )} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Docs Content */}
      <main className="flex-1 overflow-y-auto bg-bg-pure">
        <div className="max-w-4xl mx-auto px-12 py-16">
          <div className="flex items-center gap-2 text-xs font-bold text-brand-primary uppercase tracking-widest mb-4">
            Documentation <ChevronRight className="h-3 w-3" /> {activeTab}
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight mb-12 uppercase">{activeContent.title}</h1>
          
          <article className="prose prose-invert max-w-none">
            {activeContent.body}
          </article>

          <div className="mt-20 pt-8 border-t border-border flex justify-between items-center">
            <div className="text-xs text-text-muted">
              Last updated: May 5, 2026
            </div>
            <div className="flex gap-4">
              <button className="text-xs font-bold text-brand-primary hover:underline">Edit this page</button>
              <button className="text-xs font-bold text-brand-primary hover:underline">Join our Discord</button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Docs;
