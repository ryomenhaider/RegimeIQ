import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

const MicrostructureWidget = () => {
  const data = [
    { time: '10:00', ofi: 0.1 },
    { time: '10:05', ofi: 0.4 },
    { time: '10:10', ofi: 0.3 },
    { time: '10:15', ofi: 0.8 },
    { time: '10:20', ofi: 0.6 },
    { time: '10:25', ofi: 0.9 },
    { time: '10:30', ofi: 0.7 },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex justify-between items-end mb-4">
        <div>
          <div className="text-xs text-text-secondary uppercase">Order Flow Imbalance</div>
          <div className="text-xl font-bold text-brand-primary">0.82</div>
        </div>
        <div className="text-[10px] text-signal-bullish font-bold uppercase tracking-widest">Bullish Pressure</div>
      </div>
      
      <div className="flex-1 min-h-[100px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorOfi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7ED87A" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#7ED87A" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <XAxis dataKey="time" hide />
            <YAxis hide domain={[0, 1]} />
            <Tooltip 
              contentStyle={{ background: '#11112a', border: '1px solid #2a2a4a', fontSize: '10px' }}
              itemStyle={{ color: '#7ED87A' }}
            />
            <Area 
              type="monotone" 
              dataKey="ofi" 
              stroke="#7ED87A" 
              fillOpacity={1} 
              fill="url(#colorOfi)" 
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default MicrostructureWidget;
