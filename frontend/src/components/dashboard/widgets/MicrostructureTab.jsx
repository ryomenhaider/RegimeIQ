import React from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useSymbolStore } from '../../store/symbolStore';
import { useSettingsStore } from '../../store/settingsStore';
import debounce from 'lodash.debounce';

// Importing placeholder widgets (to be implemented)
const OrderBookWidget = () => <div className="widget-header">OrderBook</div>;
const MicrostructureWidget = () => <div className="widget-header">Metrics</div>;
const OfiChartWidget = () => <div className="widget-header">OFI Chart</div>;
const SpreadWidget = () => <div className="widget-header">Spread Decomposition</div>;

const MicrostructureTab = ({ symbol }) => {
  const layout = useSettingsStore(state => state.getLayout(symbol, 'microstructure')) || [
    { i: 'orderbook', x: 0, y: 0, w: 2, h: 6, minW: 1, minH: 3 },
    { i: 'metrics', x: 2, y: 0, w: 4, h: 2, minW: 2, minH: 1 },
    { i: 'ofi', x: 2, y: 2, w: 4, h: 4, minW: 2, minH: 2 },
    { i: 'spread', x: 0, y: 6, w: 6, h: 2, minW: 2, minH: 1 },
  ];

  const saveLayout = debounce((newLayout) => {
    useSettingsStore.getState().setLayout(symbol, 'microstructure', newLayout);
    // TODO: PATCH /api/users/:username/settings
  }, 500);

  return (
    <GridLayout
      className="layout"
      layout={layout}
      cols={6}
      rowHeight={100}
      width={1200}
      draggableHandle=".widget-header"
      onLayoutChange={saveLayout}
    >
      <div key="orderbook" style={{ background: '#11112a' }}><OrderBookWidget /></div>
      <div key="metrics" style={{ background: '#11112a' }}><MicrostructureWidget /></div>
      <div key="ofi" style={{ background: '#11112a' }}><OfiChartWidget /></div>
      <div key="spread" style={{ background: '#11112a' }}><SpreadWidget /></div>
    </GridLayout>
  );
};

export default MicrostructureTab;
