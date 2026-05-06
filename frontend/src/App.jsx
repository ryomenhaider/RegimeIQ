import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import { useAuthStore } from './store/authStore';
import { COLORS } from './utils/constants';
import { useQuery } from '@tanstack/react-query';
import api from './services/api';

// Lazy load dashboard routes
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const Billing = lazy(() => import('./pages/Billing'));
const Docs = lazy(() => import('./pages/Docs'));

const PageSkeleton = () => <div className="p-4 text-white">Loading...</div>;

// Grace Period Banner - shows when payment fails
const GracePeriodBanner = ({ visible, graceDaysLeft }) => {
  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      background: '#2a1500', borderBottom: `1px solid ${COLORS.yellow}`,
      padding: '12px', textAlign: 'center', zIndex: 1000,
      fontFamily: 'IBM Plex Mono, monospace'
    }}>
      <a 
        href="/billing" 
        style={{ color: COLORS.yellow, fontSize: '13px', textDecoration: 'none' }}
      >
        Payment failed — your access continues for {graceDaysLeft} days.{' '}
        <span style={{ textDecoration: 'underline' }}>Update payment →</span>
      </a>
    </div>
  );
};

function App() {
  const username = useAuthStore((state) => state.username);

  const { data: billing } = useQuery({
    queryKey: ['billing', username],
    queryFn: async () => {
      const res = await api.get(`/users/${username}/billing`);
      return res.data;
    },
    staleTime: 60000,
    enabled: !!username,
  });

  const showGraceBanner = billing?.status === 'grace_period' && billing?.graceDaysRemaining > 0;

  return (
    <Router>
      <GracePeriodBanner visible={showGraceBanner} graceDaysLeft={billing?.graceDaysRemaining} />
      <Suspense fallback={<PageSkeleton />}>
        <div style={{ paddingTop: showGraceBanner ? '48px' : '0px' }}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard/*" element={<Dashboard />} />
            <Route path="/dashboard/:username/settings" element={<Settings />} />
            <Route path="/dashboard/:username/billing" element={<Billing />} />
            <Route path="/docs" element={<Docs />} />
          </Routes>
        </div>
      </Suspense>
    </Router>
  );
}

export default App;