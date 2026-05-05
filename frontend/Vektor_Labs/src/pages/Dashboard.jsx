import React from 'react';
import Sidebar from '../components/layout/Sidebar';
import Topbar from '../components/layout/Topbar';
import SummaryStrip from '../components/dashboard/widgets/SummaryStrip';
import SymbolTabs from '../components/dashboard/SymbolTabs';
import AlertStrip from '../components/dashboard/AlertStrip';
import GridLayout from '../components/dashboard/GridLayout';
import ErrorBoundary from '../components/ErrorBoundary';
import { AlertCircle, RefreshCcw } from 'lucide-react';

const FullPageError = () => (
  <div className="min-h-screen bg-bg-app flex flex-col items-center justify-center p-8 text-center">
    <div className="w-16 h-16 bg-regime-illiquid/10 rounded-full flex items-center justify-center mb-6">
      <AlertCircle className="h-8 w-8 text-regime-illiquid" />
    </div>
    <h1 className="text-2xl font-bold text-white mb-2 uppercase tracking-tight">Terminal Fatal Error</h1>
    <p className="text-text-secondary max-w-md mb-8 leading-relaxed">
      Something went wrong while loading the dashboard. This might be due to a connection issue or a temporary system failure.
    </p>
    <button 
      onClick={() => window.location.reload()}
      className="flex items-center gap-2 bg-brand-primary text-bg-pure px-8 py-3 rounded-sm font-bold uppercase tracking-widest hover:bg-brand-light transition-all"
    >
      <RefreshCcw className="h-4 w-4" />
      Reload Terminal
    </button>
  </div>
);

const Dashboard = () => {
  return (
    <ErrorBoundary fallback={<FullPageError />}>
      <div className="flex h-screen bg-bg-pure overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar />
          <main className="flex-1 overflow-y-auto bg-bg-app">
            <SummaryStrip />
            
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <SymbolTabs />
                <div className="text-xs font-mono text-text-muted">
                  API STATUS: <span className="text-brand-primary">CONNECTED</span>
                </div>
              </div>
              
              <AlertStrip />
              
              <GridLayout />
            </div>
          </main>
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default Dashboard;
