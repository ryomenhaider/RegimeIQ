import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { useSymbolStore } from '../../store/symbolStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import debounce from 'lodash.debounce';
import RegimeWidget from './RegimeWidget';
import ProbabilityBars from './ProbabilityBars';
import TransitionMatrix from './TransitionMatrix';
import TimelineWidget from './TimelineWidget';
import ModelInfoWidget from './ModelInfoWidget';

const ReactGridLayout = WidthProvider(RGL);

const DEFAULT_LAYOUT = [
  { i: 'current', x: 0, y: 0, w: 2, h: 3, minW: 1, minH: 2 },
  { i: 'probs', x: 2, y: 0, w: 2, h: 3, minW: 1, minH: 2 },
  { i: 'matrix', x: 4, y: 0, w: 2, h: 3, minW: 1, minH: 2 },
  { i: 'timeline', x: 0, y: 3, w: 4, h: 2, minW: 2, minH: 1 },
  { i: 'model', x: 4, y: 3, w: 2, h: 2, minW: 1, minH: 1 },
];

const REGIME_WIDGETS = {
  current: RegimeWidget,
  probs: ProbabilityBars,
  matrix: TransitionMatrix,
  timeline: TimelineWidget,
  model: ModelInfoWidget,
};

const RegimeTab = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const username = useAuthStore((state) => state.username);
  const layoutConfigs = useSettingsStore((state) => state.layoutConfigs);
  const setLayout = useSettingsStore((state) => state.setLayout);
  
  const containerRef = useRef(null);
  const [width, setWidth] = React.useState(1200);

  const savedLayout = currentSymbol ? layoutConfigs[currentSymbol]?.regime : null;
  const layout = savedLayout || DEFAULT_LAYOUT;

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setWidth(containerRef.current.offsetWidth);
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const saveLayoutDebounced = useMemo(
    () =>
      debounce((newLayout) => {
        if (username && currentSymbol) {
          setLayout(currentSymbol, 'regime', newLayout);
        }
      }, 500),
    [username, currentSymbol, setLayout]
  );

  const handleLayoutChange = useCallback(
    (newLayout) => {
      saveLayoutDebounced(newLayout);
    },
    [saveLayoutDebounced]
  );

  return (
    <div ref={containerRef} style={{ height: '100%', background: '#0b0b1a' }}>
      <ReactGridLayout
        className="layout"
        layout={layout}
        cols={6}
        rowHeight={80}
        width={width}
        draggableHandle=".widget-header"
        onLayoutChange={handleLayoutChange}
        margin={[8, 8]}
        containerPadding={[8, 8]}
      >
        {DEFAULT_LAYOUT.map((item) => {
          const Widget = REGIME_WIDGETS[item.i];
          return (
            <div key={item.i} style={{ background: '#11112a', borderRadius: '6px', overflow: 'hidden' }}>
              <Widget />
            </div>
          );
        })}
      </ReactGridLayout>
    </div>
  );
};

export default RegimeTab;