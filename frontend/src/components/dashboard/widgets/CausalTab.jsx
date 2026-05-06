import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { useSymbolStore } from '../../store/symbolStore';
import { useSettingsStore } from '../../store/settingsStore';
import { useAuthStore } from '../../store/authStore';
import debounce from 'lodash.debounce';
import LLMInsightWidget from './LLMInsightWidget';
import ChatInterface from './ChatInterface';
import ContextPanel from './ContextPanel';

const ReactGridLayout = WidthProvider(RGL);

const DEFAULT_LAYOUT = [
  { i: 'insights', x: 0, y: 0, w: 2, h: 4, minW: 1, minH: 2 },
  { i: 'chat', x: 2, y: 0, w: 4, h: 4, minW: 2, minH: 2 },
  { i: 'context', x: 2, y: 4, w: 4, h: 2, minW: 2, minH: 1 },
];

const CAUSAL_WIDGETS = {
  insights: LLMInsightWidget,
  chat: ChatInterface,
  context: ContextPanel,
};

const CausalTab = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const username = useAuthStore((state) => state.username);
  const layoutConfigs = useSettingsStore((state) => state.layoutConfigs);
  const setLayout = useSettingsStore((state) => state.setLayout);
  
  const containerRef = useRef(null);
  const [width, setWidth] = React.useState(1200);

  const savedLayout = currentSymbol ? layoutConfigs[currentSymbol]?.causal : null;
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
          setLayout(currentSymbol, 'causal', newLayout);
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
          const Widget = CAUSAL_WIDGETS[item.i];
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

export default CausalTab;