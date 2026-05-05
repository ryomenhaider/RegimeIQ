import React from 'react';
import { Responsive, WidthProvider } from 'react-grid-layout';
import RegimeWidget from './widgets/RegimeWidget';
import MicrostructureWidget from './widgets/MicrostructureWidget';
import AltDataWidget from './widgets/AltDataWidget';
import LLMInsightWidget from './widgets/LLMInsightWidget';
import OrderBookWidget from './widgets/OrderBookWidget';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

const GridLayout = () => {
  const layout = {
    lg: [
      { i: 'regime', x: 0, y: 0, w: 4, h: 4 },
      { i: 'orderbook', x: 4, y: 0, w: 4, h: 8 },
      { i: 'insights', x: 8, y: 0, w: 4, h: 8 },
      { i: 'microstructure', x: 0, y: 4, w: 4, h: 4 },
      { i: 'altdata', x: 0, y: 8, w: 12, h: 4 },
    ],
  };

  const widgetWrapper = (title, children) => (
    <div className="h-full w-full bg-bg-card border border-border rounded-sm flex flex-col overflow-hidden shadow-xl">
      <div className="bg-bg-card-alt border-b border-border px-3 py-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">{title}</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-border" />
          <div className="w-2 h-2 rounded-full bg-border" />
        </div>
      </div>
      <div className="flex-1 overflow-auto p-4">
        {children}
      </div>
    </div>
  );

  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layout}
      breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
      cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
      rowHeight={30}
      draggableHandle=".bg-bg-card-alt"
      margin={[16, 16]}
    >
      <div key="regime">
        <ErrorBoundary>{widgetWrapper('Market Regime', <RegimeWidget />)}</ErrorBoundary>
      </div>
      <div key="orderbook">
        <ErrorBoundary>{widgetWrapper('Order Book Heatmap', <OrderBookWidget />)}</ErrorBoundary>
      </div>
      <div key="insights">
        <ErrorBoundary>{widgetWrapper('LLM Insights', <LLMInsightWidget />)}</ErrorBoundary>
      </div>
      <div key="microstructure">
        <ErrorBoundary>{widgetWrapper('Microstructure', <MicrostructureWidget />)}</ErrorBoundary>
      </div>
      <div key="altdata">
        <ErrorBoundary>{widgetWrapper('Alternative Data Feed', <AltDataWidget />)}</ErrorBoundary>
      </div>
    </ResponsiveGridLayout>
  );
};

export default GridLayout;
