import React, { useState, useEffect, Suspense, lazy } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSettings } from '../hooks/useSettings';
import { useSymbols } from '../hooks/useSymbols';
import Topbar from '../components/layout/Topbar';
import SummaryStrip from '../components/dashboard/SummaryStrip';
import AlertStrip from '../components/dashboard/AlertStrip';
import SymbolTabs from '../components/dashboard/SymbolTabs';
import StatusBar from '../components/layout/StatusBar';
import { useSymbolStore } from '../store/symbolStore';
import { Spinner } from '../components/ui';

const MicrostructureTab = lazy(() => import('../components/dashboard/widgets/MicrostructureTab'));
const RegimeTab = lazy(() => import('../components/dashboard/widgets/RegimeTab'));
const AltDataWidget = lazy(() => import('../components/dashboard/widgets/AltDataWidget'));
const LLMInsightWidget = lazy(() => import('../components/dashboard/widgets/LLMInsightWidget'));
const CausalTab = lazy(() => import('../components/dashboard/widgets/CausalTab'));

const TAB_META = {
  microstructure: {
    label: 'Microstructure',
    shortLabel: 'μ-Structure',
    indicator: '#00ccff',
  },
  regime: {
    label: 'Regime',
    shortLabel: 'Regime',
    indicator: '#7ED87A',
  },
  altdata: {
    label: 'Alt Data',
    shortLabel: 'Alt Data',
    indicator: '#f5c542',
  },
  causal: {
    label: 'Causal AI',
    shortLabel: 'Causal',
    indicator: '#b57aff',
  },
};

const TabContentSkeleton = () => (
  <div style={{
    display: 'grid',
    placeItems: 'center',
    height: '100%',
    background: '#090910',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <Spinner size="lg" />
      <span style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: '11px',
        color: '#555570',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        Loading module...
      </span>
    </div>
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { status: wsStatus } = useWebSocket();
  const { settings, fetchSettings, loading: settingsLoading } = useSettings();
  const { initializeSymbols } = useSymbols();
  const setConnectionStatus = useSymbolStore((state) => state.setConnectionStatus);

  const [activeTab, setActiveTab] = useState('microstructure');
  const [prevTab, setPrevTab] = useState(null);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settings?.watchedSymbols) {
      initializeSymbols(settings.watchedSymbols);
    }
  }, [settings, initializeSymbols]);

  useEffect(() => {
    setConnectionStatus(wsStatus);
  }, [wsStatus, setConnectionStatus]);

  const handleTabChange = (tabId) => {
    setPrevTab(activeTab);
    setActiveTab(tabId);
  };

  const tabs = Object.entries(TAB_META).map(([id, meta]) => ({ id, ...meta }));

  const renderTabContent = () => {
    switch (activeTab) {
      case 'microstructure':
        return <Suspense fallback={<TabContentSkeleton />}><MicrostructureTab /></Suspense>;
      case 'regime':
        return <Suspense fallback={<TabContentSkeleton />}><RegimeTab /></Suspense>;
      case 'altdata':
        return <Suspense fallback={<TabContentSkeleton />}><AltDataWidget /></Suspense>;
      case 'causal':
        return <Suspense fallback={<TabContentSkeleton />}><CausalTab /></Suspense>;
      default:
        return (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#555570' }}>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px' }}>
              {activeTab}
            </span>
          </div>
        );
    }
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '42px 32px auto 36px 1fr 26px',
      height: '100vh',
      overflow: 'hidden',
      background: '#090910',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

        .dash-tab {
          position: relative;
          padding: 0 18px;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 11px;
          font-family: 'IBM Plex Mono', monospace;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          transition: color 120ms;
          display: flex;
          align-items: center;
          gap: 8px;
          height: 100%;
          white-space: nowrap;
        }
        .dash-tab:hover { color: #ddddf0 !important; }
        .dash-tab::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 2px;
          background: transparent;
          transition: background 120ms, box-shadow 120ms;
        }
        .dash-tab.active::after {
          background: var(--tab-color, #7ED87A);
          box-shadow: 0 0 8px var(--tab-color, #7ED87A);
        }
        .dash-tab-dot {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--tab-color, #7ED87A);
          opacity: 0;
          transition: opacity 120ms;
          flex-shrink: 0;
        }
        .dash-tab.active .dash-tab-dot { opacity: 1; }
        .tab-content-wrapper {
          height: 100%;
          overflow: hidden;
        }
      `}</style>

      {/* Topbar */}
      <Topbar>
        <SymbolTabs />
      </Topbar>

      {/* Summary Strip */}
      <SummaryStrip />

      {/* Alert Strip */}
      <AlertStrip />

      {/* Symbol Tabs */}
      <SymbolTabs />

      {/* Main content area */}
      <main style={{ overflow: 'hidden', background: '#090910' }}>
        {settingsLoading ? (
          <TabContentSkeleton />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateRows: '36px 1fr',
            height: '100%',
          }}>
            {/* Tab bar */}
            <div style={{
              display: 'flex',
              alignItems: 'stretch',
              background: '#11112a',
              borderBottom: '1px solid #2a2a4a',
              paddingLeft: '4px',
            }}>
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`dash-tab${isActive ? ' active' : ''}`}
                    style={{
                      '--tab-color': tab.indicator,
                      color: isActive ? '#ddddf0' : '#555570',
                    }}
                  >
                    <span className="dash-tab-dot" />
                    {tab.label}
                  </button>
                );
              })}

              {/* Spacer + right aligned info */}
              <div style={{ flex: 1 }} />
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px',
                gap: '12px',
              }}>
                {wsStatus === 'connected' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{
                      width: '5px', height: '5px', borderRadius: '50%',
                      background: '#7ED87A',
                      boxShadow: '0 0 6px #7ED87A',
                      animation: 'wsPulse 2s ease-in-out infinite',
                    }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#555570', letterSpacing: '0.06em' }}>
                      LIVE
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#ff4455' }} />
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#555570', letterSpacing: '0.06em' }}>
                      {wsStatus?.toUpperCase() || 'OFFLINE'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Tab content */}
            <div className="tab-content-wrapper">
              {renderTabContent()}
            </div>
          </div>
        )}
      </main>

      {/* Status bar */}
      <StatusBar />

      <style>{`
        @keyframes wsPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
};

export default Dashboard;