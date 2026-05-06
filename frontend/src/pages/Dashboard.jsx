import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useWebSocket } from '../hooks/useWebSocket';
import { useSettings } from '../hooks/useSettings';
import { useSymbols } from '../hooks/useSymbols';

// Placeholder components to be implemented
const Topbar = () => <header style={{ height: '42px', background: '#050510', borderBottom: '1px solid #2a2a4a' }}>Topbar</header>;
const SummaryStrip = () => <div style={{ height: '32px' }}>SummaryStrip</div>;
const AlertStrip = () => <div style={{ height: '0px', overflow: 'hidden', transition: 'height 200ms' }}>AlertStrip</div>;
const SymbolTabs = () => <div style={{ height: '36px' }}>SymbolTabs</div>;
const StatusBar = () => <footer style={{ height: '26px', background: '#050510' }}>StatusBar</footer>;

const Dashboard = () => {
  const { user } = useAuth();
  const { connect } = useWebSocket();
  const { settings, fetchSettings, loading: settingsLoading } = useSettings();
  const { initializeSymbols } = useSymbols();

  useEffect(() => {
    fetchSettings();
    connect();
  }, [fetchSettings, connect]);

  useEffect(() => {
    if (settings) {
      initializeSymbols(settings.watchedSymbols);
    }
  }, [settings, initializeSymbols]);

  return (
    <div style={{
      display: 'grid',
      gridTemplateRows: '42px 32px auto 36px 1fr 26px',
      height: '100vh',
      overflow: 'hidden'
    }}>
      <Topbar />
      <SummaryStrip />
      <AlertStrip />
      <SymbolTabs />
      <main style={{ overflow: 'hidden' }}>
        {settingsLoading ? <div>Loading...</div> : <div>Tab Content</div>}
      </main>
      <StatusBar />
    </div>
  );
};

export default Dashboard;
