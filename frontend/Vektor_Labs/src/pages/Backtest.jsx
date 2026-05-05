import React, { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { 
  Play, 
  RotateCcw, 
  LineChart, 
  TrendingUp, 
  ShieldAlert, 
  Target,
  Download,
  Calendar
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';
import { formatCurrency, formatPercent } from '../utils/format';

const Backtest = () => {
  const [isRunning, setIsRunning] = useState(false);

  const equityData = [
    { date: '2024-01-01', equity: 10000 },
    { date: '2024-01-05', equity: 10200 },
    { date: '2024-01-10', equity: 10150 },
    { date: '2024-01-15', equity: 10500 },
    { date: '2024-01-20', equity: 10400 },
    { date: '2024-01-25', equity: 10800 },
    { date: '2024-01-30', equity: 11200 },
    { date: '2024-02-05', equity: 11000 },
    { date: '2024-02-10', equity: 11500 },
    { date: '2024-02-15', equity: 12100 },
  ];

  const trades = [
    { id: 1, type: 'LONG', symbol: 'BTC-USDT', entry: 42100, exit: 43500, pnl: 1400, status: 'WIN' },
    { id: 2, type: 'SHORT', symbol: 'ETH-USDT', entry: 2250, exit: 2300, pnl: -50, status: 'LOSS' },
    { id: 3, type: 'LONG', symbol: 'BTC-USDT', entry: 44000, exit: 45200, pnl: 1200, status: 'WIN' },
    { id: 4, type: 'LONG', symbol: 'SOL-USDT', entry: 95, exit: 102, pnl: 700, status: 'WIN' },
    { id: 5, type: 'SHORT', symbol: 'BTC-USDT', entry: 48000, exit: 47500, pnl: 500, status: 'WIN' },
  ];

  const handleRun = () => {
    setIsRunning(true);
    setTimeout(() => setIsRunning(false), 2000);
  };

  return (
    <div className="flex h-screen bg-bg-pure overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto bg-bg-app p-6 space-y-6">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white uppercase tracking-tight">Strategy Backtester</h1>
              <p className="text-text-secondary text-sm">Validate your alpha before deployment.</p>
            </div>
            <div className="flex gap-4">
              <Button variant="secondary" onClick={() => {}} className="gap-2">
                <RotateCcw className="h-4 w-4" /> Reset
              </Button>
              <Button onClick={handleRun} isLoading={isRunning} className="gap-2 px-8">
                <Play className="h-4 w-4" /> Run Simulation
              </Button>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Configuration Panel */}
            <Card className="lg:col-span-1 p-0 overflow-hidden">
              <div className="bg-bg-card-alt px-4 py-2 border-b border-border text-[10px] font-bold text-text-muted uppercase tracking-widest">
                Parameters
              </div>
              <div className="p-4 space-y-6">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Strategy</label>
                  <select className="w-full bg-bg-app border border-border rounded-sm px-3 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary">
                    <option>Regime-Aware Momentum</option>
                    <option>HMM Mean Reversion</option>
                    <option>Order Flow Imbalance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Symbol</label>
                  <select className="w-full bg-bg-app border border-border rounded-sm px-3 py-2 text-sm text-text-primary">
                    <option>BTC-USDT-PERP</option>
                    <option>ETH-USDT-PERP</option>
                    <option>SOL-USDT-PERP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Timeframe</label>
                  <div className="flex gap-2">
                    {['5M', '15M', '1H', '4H'].map(tf => (
                      <button key={tf} className="flex-1 py-1 text-[10px] font-bold border border-border rounded-sm hover:border-brand-primary transition-colors">
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Initial Balance</label>
                    <input type="text" className="w-full bg-bg-app border border-border rounded-sm px-3 py-2 text-sm text-text-primary" defaultValue="10,000" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase mb-2">Leverage</label>
                    <input type="text" className="w-full bg-bg-app border border-border rounded-sm px-3 py-2 text-sm text-text-primary" defaultValue="10x" />
                  </div>
                </div>
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 text-xs text-text-secondary mb-4">
                    <Calendar className="h-3 w-3" />
                    <span>Jan 01, 2024 - Feb 15, 2024</span>
                  </div>
                  <Button variant="outline" className="w-full py-2 text-xs">Edit Date Range</Button>
                </div>
              </div>
            </Card>

            {/* Results & Chart */}
            <div className="lg:col-span-3 space-y-6">
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Total PnL', value: '+$2,100', icon: TrendingUp, color: 'text-signal-bullish' },
                  { label: 'Sharpe Ratio', value: '2.45', icon: LineChart, color: 'text-brand-primary' },
                  { label: 'Win Rate', value: '68.2%', icon: Target, color: 'text-brand-primary' },
                  { label: 'Max Drawdown', value: '-4.12%', icon: ShieldAlert, color: 'text-regime-illiquid' },
                ].map((m, i) => (
                  <Card key={i} className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <m.icon className={`h-3 w-3 ${m.color}`} />
                      <span className="text-[10px] font-bold text-text-muted uppercase">{m.label}</span>
                    </div>
                    <div className="text-xl font-bold text-white font-mono">{m.value}</div>
                  </Card>
                ))}
              </div>

              {/* Equity Chart */}
              <Card className="p-0 h-[350px] overflow-hidden">
                <div className="bg-bg-card-alt px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Equity Curve</span>
                  <div className="flex gap-4 text-[10px] font-mono">
                    <span className="text-signal-bullish">HIGH: $12,100</span>
                    <span className="text-regime-illiquid">LOW: $9,950</span>
                  </div>
                </div>
                <div className="h-full p-4">
                  <ResponsiveContainer width="100%" height="90%">
                    <AreaChart data={equityData}>
                      <defs>
                        <linearGradient id="colorEquity" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#7ED87A" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#7ED87A" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2a2a4a" vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis 
                        domain={['dataMin - 500', 'dataMax + 500']} 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#555570', fontSize: 10 }}
                      />
                      <Tooltip 
                        contentStyle={{ background: '#11112a', border: '1px solid #2a2a4a', fontSize: '10px' }}
                        itemStyle={{ color: '#7ED87A' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="equity" 
                        stroke="#7ED87A" 
                        fillOpacity={1} 
                        fill="url(#colorEquity)" 
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              {/* Trade Log */}
              <Card className="p-0 overflow-hidden">
                <div className="bg-bg-card-alt px-4 py-2 border-b border-border flex items-center justify-between">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Execution Log</span>
                  <Button variant="ghost" size="sm" className="h-6 text-[10px]">
                    <Download className="h-3 w-3 mr-1" /> Export CSV
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-[10px] uppercase">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-text-muted font-bold">Side</th>
                        <th className="px-6 py-3 text-text-muted font-bold">Symbol</th>
                        <th className="px-6 py-3 text-text-muted font-bold text-right">Entry</th>
                        <th className="px-6 py-3 text-text-muted font-bold text-right">Exit</th>
                        <th className="px-6 py-3 text-text-muted font-bold text-right">PnL</th>
                        <th className="px-6 py-3 text-text-muted font-bold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {trades.map((trade) => (
                        <tr key={trade.id} className="hover:bg-white/5 transition-colors">
                          <td className="px-6 py-4">
                            <span className={trade.type === 'LONG' ? 'text-signal-bullish' : 'text-regime-illiquid'}>
                              {trade.type}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-white font-bold">{trade.symbol}</td>
                          <td className="px-6 py-4 text-right text-text-secondary">{trade.entry}</td>
                          <td className="px-6 py-4 text-right text-text-secondary">{trade.exit}</td>
                          <td className="px-6 py-4 text-right font-bold text-white">${trade.pnl}</td>
                          <td className="px-6 py-4 text-right">
                            <Badge variant={trade.status === 'WIN' ? 'bullish' : 'illiquid'}>
                              {trade.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Backtest;
