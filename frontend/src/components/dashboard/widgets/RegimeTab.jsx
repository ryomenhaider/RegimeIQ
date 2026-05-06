import React from 'react';
import GridLayout from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import { useSymbolStore } from '../../../store/symbolStore';
import { useSettingsStore } from '../../../store/settingsStore';
import debounce from 'lodash.debounce';

// Placeholder widgets
const RegimeWidget = () => <div className="widget-header">Current Regime</div>;
const ProbabilityBars = () => <div className="widget-header">Regime Probabilities</div>;
const TransitionMatrix = () => <div className="widget-header">Transition Matrix</div>;
const TimelineWidget = () => <div className="widget-header">History Timeline</div>;
const ModelInfoWidget = () => <div className="widget-header">Model Info</div>;

const RegimeTab = ({ symbol }) => {
  const layout = useSettingsStore(state => state.getLayout(symbol, 'regime')) || [
    { i: 'current', x: 0, y: 0, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'probs', x: 2, y: 0, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'matrix', x: 4, y: 0, w: 2, h: 3, minW: 1, minH: 2 },
    { i: 'timeline', x: 0, y: 3, w: 4, h: 2, minW: 2, minH: 1 },
    { i: 'model', x: 4, y: 3, w: 2, h: 2, minW: 1, minH: 1 },
  ];

  const saveLayout = debounce((newLayout) => {
    useSettingsStore.getState().setLayout(symbol, 'regime', newLayout);
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
      <div key="current" style={{ background: '#11112a' }}><RegimeWidget /></div>
      <div key="probs" style={{ background: '#11112a' }}><ProbabilityBars /></div>
      <div key="matrix" style={{ background: '#11112a' }}><TransitionMatrix /></div>
      <div key="timeline" style={{ background: '#11112a' }}><TimelineWidget /></div>
      <div key="model" style={{ background: '#11112a' }}><ModelInfoWidget /></div>
    </GridLayout>
  );
};

export default RegimeTab;
