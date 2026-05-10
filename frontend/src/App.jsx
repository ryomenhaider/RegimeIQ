import React, { useState, useEffect, Children } from 'react';
import { useAuthStore } from './store/authStore';
import { COLORS } from './utils/constants';
import { useQuery } from '@tanstack/react-query';
import api from './services/api';
import Footer from './components/layout/Footer';

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

export default function AppContent({ children }) {
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
    <>
      <GracePeriodBanner visible={showGraceBanner} graceDaysLeft={billing?.graceDaysRemaining} />
      <div style={{ paddingTop: showGraceBanner ? '48px' : '0px', minHeight: 'calc(100vh - 72px)' }}>
        {children}
      </div>
      <Footer />
    </>
  );
}