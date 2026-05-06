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

const TabContentSkeleton = () => (
  <div style={{ 
    display: 'grid', 
    placeItems: 'center', 
    height: '100%',
    background: '#0b0b1a'
  }}>
    <Spinner size="lg" />
  </div>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { connect, status: wsStatus } = useWebSocket();
  const { settings, fetchSettings, loading: settingsLoading } = useSettings();
  const { initializeSymbols } = useSymbols();
  const setConnectionStatus = useSymbolStore((state) => state.setConnectionStatus);
  
  const [activeTab, setActiveTab] = useState('microstructure');

  useEffect(() => {
    fetchSettings();
    connect();
  }, [fetchSettings, connect]);

  useEffect(() => {
    if (settings?.watchedSymbols) {
      initializeSymbols(settings.watchedSymbols);
    }
  }, [settings, initializeSymbols]);

  useEffect(() => {
    setConnectionStatus(wsStatus);
  }, [wsStatus, setConnectionStatus]);

  const tabs = [
    { id: 'microstructure', label: 'Microstructure' },
    { id: 'regime', label: 'Regime' },
    { id: 'altdata', label: 'Alt Data' },
    { id: 'causal', label: 'Causal AI' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'microstructure':
        return (
          <Suspense fallback={<TabContentSkeleton />}>
            <MicrostructureTab />
          </Suspense>
        );
      case 'regime':
        return (
          <Suspense fallback={<TabContentSkeleton />}>
            <RegimeTab />
          </Suspense>
        );
      case 'altdata':
        return (
          <Suspense fallback={<TabContentSkeleton />}>
            <AltDataWidget />
          </Suspense>
        );
      case 'causal':
        return (
          <Suspense fallback={<TabContentSkeleton />}>
            <CausalTab />
          </Suspense>
        );
      default:
        return (
          <div style={{ display: 'grid', placeItems: 'center', height: '100%', color: '#666' }}>
            Tab Content ({activeTab})
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
      background: '#0b0b1a'
    }}>
      <Topbar>
        <SymbolTabs />
      </Topbar>
      <SummaryStrip />
      <AlertStrip />
      <SymbolTabs />
      <main style={{ overflow: 'hidden', background: '#11112a' }}>
        {settingsLoading ? (
          <TabContentSkeleton />
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateRows: '36px 1fr',
            height: '100%'
          }}>
            <div style={{
              display: 'flex',
              background: '#11112a',
              borderBottom: '1px solid #2a2a4a',
              paddingLeft: '4px'
            }}>
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    padding: '8px 16px',
                    background: activeTab === tab.id ? '#11112a' : 'transparent',
                    border: 'none',
                    borderBottom: activeTab === tab.id ? '2px solid #00ff88' : '2px solid transparent',
                    color: activeTab === tab.id ? '#fff' : '#888',
                    fontSize: '12px',
                    fontFamily: 'IBM Plex Mono, monospace',
                    cursor: 'pointer',
                    transition: 'all 100ms'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div style={{ overflow: 'hidden' }}>
              {renderTabContent()}
            </div>
          </div>
        )}
      </main>
      <StatusBar />
    </div>
  );
};

export default Dashboard;