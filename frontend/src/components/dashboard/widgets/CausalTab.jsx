import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import RGL, { WidthProvider } from 'react-grid-layout';
import { useSymbolStore } from '../../../store/symbolStore';
import { useSettingsStore } from '../../../store/settingsStore';
import { useAuthStore } from '../../../store/authStore';
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
      if (containerRef.current) setWidth(containerRef.current.offsetWidth);
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  const saveLayoutDebounced = useMemo(
    () => debounce((newLayout) => {
      if (username && currentSymbol) setLayout(currentSymbol, 'causal', newLayout);
    }, 500),
    [username, currentSymbol, setLayout]
  );

  const handleLayoutChange = useCallback(
    (newLayout) => saveLayoutDebounced(newLayout),
    [saveLayoutDebounced]
  );

  return (
    <>
      <style>{`
        .pf-grid-item {
          background: #11112a;
          border: 1px solid #2a2a4a;
          border-radius: 6px;
          overflow: hidden;
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }
        .pf-grid-item:hover {
          border-color: #3a3a5a;
        }
        .react-grid-item.react-grid-placeholder {
          background: rgba(126,216,122,0.06) !important;
          border: 1px dashed rgba(126,216,122,0.25) !important;
          border-radius: 6px !important;
          opacity: 1 !important;
        }
        .react-resizable-handle {
          opacity: 0;
          transition: opacity 150ms ease;
        }
        .pf-grid-item:hover .react-resizable-handle {
          opacity: 1;
        }
        .react-resizable-handle::after {
          border-right: 2px solid #7ED87A !important;
          border-bottom: 2px solid #7ED87A !important;
          width: 6px !important;
          height: 6px !important;
        }
      `}</style>
      <div ref={containerRef} style={{ height: '100%', background: '#090910', padding: '0' }}>
        <ReactGridLayout
          className="layout"
          layout={layout}
          cols={6}
          rowHeight={80}
          width={width}
          draggableHandle=".widget-header"
          onLayoutChange={handleLayoutChange}
          margin={[6, 6]}
          containerPadding={[6, 6]}
        >
          {DEFAULT_LAYOUT.map((item) => {
            const Widget = CAUSAL_WIDGETS[item.i];
            return (
              <div key={item.i} className="pf-grid-item">
                <Widget />
              </div>
            );
          })}
        </ReactGridLayout>
      </div>
    </>
  );
};

export default CausalTab;