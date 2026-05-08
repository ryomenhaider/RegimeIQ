import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';
import toast from 'react-hot-toast';
import api from '../services/api';

const PLANS = {
  trial: { name: 'Trial', price: 0, limit: 3, features: { symbols: 3, regime: true, microstructure: false, altdata: false, causal: false, discord: false, api: false, trialDuration: '14 days' } },
  standard: { name: 'Standard', price: 47, limit: 10, features: { symbols: 10, regime: true, microstructure: true, altdata: true, causal: true, discord: true, api: false, trialDuration: null } },
  unlimited: { name: 'Unlimited', price: 97, limit: Infinity, features: { symbols: Infinity, regime: true, microstructure: true, altdata: true, causal: true, discord: true, api: true, trialDuration: null } },
};

const PLAN_ROWS = [
  { label: 'Symbols', key: 'symbols' },
  { label: 'Regime Detection', key: 'regime' },
  { label: 'Microstructure', key: 'microstructure' },
  { label: 'Alt Data', key: 'altdata' },
  { label: 'Causal AI', key: 'causal' },
  { label: 'Discord Alerts', key: 'discord' },
  { label: 'API Access', key: 'api' },
  { label: 'Trial Duration', key: 'trialDuration' },
];

const Billing = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUsername = useAuthStore((state) => state.username);
  const plan = useAuthStore((state) => state.plan);
  
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [pollingId, setPollingId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [pollingCount, setPollingCount] = useState(0);

  useEffect(() => {
    if (username !== currentUsername) {
      navigate(`/dashboard/${currentUsername}/billing`);
    }
  }, [username, currentUsername, navigate]);

  const { data: billing, isLoading } = useQuery({
    queryKey: ['billing', currentUsername],
    queryFn: async () => {
      const res = await api.get(`/users/${currentUsername}/billing`);
      return res.data.data;
    },
    staleTime: 0,
    enabled: !!currentUsername,
  });

  const { data: paymentHistory } = useQuery({
    queryKey: ['paymentHistory', currentUsername],
    queryFn: async () => {
      const res = await api.get(`/users/${currentUsername}/payment-history`);
      return res.data.data || [];
    },
    enabled: !!currentUsername,
  });

  useEffect(() => {
    return () => {
      if (pollingId) {
        clearInterval(pollingId);
      }
    };
  }, [pollingId]);

  const startPolling = async (invoiceId) => {
    setPaymentStatus('pending');
    setPollingCount(0);
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/payment/status/${invoiceId}`);
        const status = res.data.status;
        if (status === 'paid') {
          clearInterval(interval);
          setPollingId(null);
          setPaymentStatus('paid');
          queryClient.invalidateQueries(['billing', currentUsername]);
          toast.success('Payment successful!');
        } else if (status === 'expired' || pollingCount >= 180) {
          clearInterval(interval);
          setPollingId(null);
          setPaymentStatus('expired');
          toast.error('Payment window expired. Try again.');
        } else {
          setPollingCount(prev => prev + 1);
        }
      } catch (e) {
        clearInterval(interval);
        setPollingId(null);
        setPaymentStatus('error');
      }
    }, 5000);
    setPollingId(interval);
  };

  const handleUpgrade = async (targetPlan) => {
    try {
      const res = await api.post('/payment/create', { plan: targetPlan });
      const { invoice_url, invoice_id } = res.data;
      window.open(invoice_url, '_blank');
      startPolling(invoice_id);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to create invoice');
    }
  };

  const handleCancel = async () => {
    try {
      await api.post('/payment/cancel');
      queryClient.invalidateQueries(['billing', currentUsername]);
      toast.success('Subscription cancelled');
      setShowCancelModal(false);
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to cancel');
    }
  };

  const getStatusBadge = (status, trialRemaining) => {
    const badges = {
      active: { bg: `${COLORS.accent}20`, color: COLORS.accent, text: 'Active' },
      trial: { bg: `${COLORS.yellow}20`, color: COLORS.yellow, text: `Trial (${trialRemaining} days left)` },
      grace_period: { bg: `${COLORS.warn}20`, color: COLORS.warn, text: 'Grace Period', pulsing: true },
      expired: { bg: `${COLORS.red}20`, color: COLORS.red, text: 'Expired' },
    };
    return badges[status] || badges.expired;
  };

  const currentPlanPlan = PLANS[billing?.plan] || PLANS.trial;
  const statusBadge = getStatusBadge(billing?.status, billing?.trialRemaining);

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b1a', padding: '24px' }}>
      {billing?.status === 'grace_period' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: '#2a1500', borderBottom: `1px solid ${COLORS.yellow}`,
          padding: '12px', textAlign: 'center', zIndex: 1000
        }}>
          <span style={{ color: COLORS.yellow, fontSize: '13px' }}>
            Payment failed — your access continues for {billing?.graceDaysRemaining} days.{' '}
            <a href="#payment" style={{ color: COLORS.yellow, textDecoration: 'underline' }}>Update payment →</a>
          </span>
        </div>
      )}

      {billing?.status === 'grace_period' && <div style={{ height: '48px' }} />}

      <h1 style={{ fontSize: '24px', fontFamily: 'IBM Plex Mono, monospace', color: '#fff', marginBottom: '24px' }}>
        Billing & Subscription
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Section 1: Current Plan Card */}
        <CurrentPlanCard
          plan={currentPlanPlan}
          billing={billing}
          statusBadge={statusBadge}
          onCancel={() => setShowCancelModal(true)}
        />

        {/* Section 2: Plan Comparison */}
        <PlanComparison currentPlan={billing?.plan} onUpgrade={handleUpgrade} />

        {/* Section 3: Payment */}
        <PaymentSection
          onUpgrade={handleUpgrade}
          paymentStatus={paymentStatus}
          pollingCount={pollingCount}
        />

        {/* Section 4: Payment History */}
        <PaymentHistoryTable payments={paymentHistory || []} />
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <CancelModal
          renewalDate={billing?.renewalDate}
          onConfirm={handleCancel}
          onClose={() => setShowCancelModal(false)}
        />
      )}

      {paymentStatus === 'paid' && <Confetti />}
    </div>
  );
};

// Current Plan Card
const CurrentPlanCard = ({ plan, billing, statusBadge, onCancel }) => {
  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const symbolsUsed = billing?.symbolsUsed || 0;
  const symbolsLimit = plan.limit === Infinity ? '∞' : plan.limit;

  return (
    <div style={{ background: '#11112a', borderRadius: '8px', padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '24px', fontFamily: 'IBM Plex Mono, monospace', color: COLORS.accent, marginBottom: '4px' }}>
            {plan.name}
          </h2>
          <p style={{ fontSize: '14px', color: '#888' }}>
            {plan.price === 0 ? 'Free' : `$${plan.price}/month`}
          </p>
        </div>
        <span style={{
          padding: '4px 12px', borderRadius: '4px',
          background: statusBadge.bg, color: statusBadge.color,
          fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace',
          animation: statusBadge.pulsing ? 'pulse 1.5s infinite' : 'none'
        }}>
          {statusBadge.text}
        </span>
      </div>

      <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
        {billing?.status === 'trial' ? 'Expires' : 'Renews'} {formatDate(billing?.renewalDate)}
      </p>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
          <span>Symbols</span>
          <span>{symbolsUsed} of {symbolsLimit}</span>
        </div>
        <div style={{ height: '4px', background: '#1a1a2e', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${Math.min((symbolsUsed / (plan.limit === Infinity ? symbolsUsed : plan.limit)) * 100, 100)}%`,
            height: '100%', background: COLORS.accent
          }} />
        </div>
      </div>

      {plan.price > 0 && (
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px', background: 'transparent', border: `1px solid ${COLORS.red}`,
            borderRadius: '6px', color: COLORS.red, fontSize: '12px',
            fontFamily: 'IBM Plex Mono, monospace', cursor: 'pointer'
          }}
        >
          Cancel Subscription
        </button>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
};

// Plan Comparison
const PlanComparison = ({ currentPlan, onUpgrade }) => {
  const plans = ['trial', 'standard', 'unlimited'];

  const formatCell = (plan, key) => {
    const value = plan.features[key];
    if (key === 'trialDuration') return value || '—';
    if (typeof value === 'boolean') return value ? '✓' : '—';
    if (key === 'symbols') return value === Infinity ? '∞' : value;
    return value;
  };

  return (
    <div style={{ background: '#11112a', borderRadius: '8px', padding: '24px', overflowX: 'auto' }}>
      <h3 style={{ fontSize: '16px', fontFamily: 'IBM Plex Mono, monospace', color: '#fff', marginBottom: '16px' }}>
        Plan Comparison
      </h3>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px', color: '#888' }} />
            {plans.map((p) => (
              <th key={p} style={{
                textAlign: 'center', padding: '8px',
                background: currentPlan === p ? `${COLORS.accent}20` : 'transparent',
                borderBottom: currentPlan === p ? `2px solid ${COLORS.accent}` : 'none',
                color: currentPlan === p ? COLORS.accent : '#fff'
              }}>
                {PLANS[p].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_ROWS.map((row) => (
            <tr key={row.key}>
              <td style={{ padding: '8px', color: '#888', borderBottom: '1px solid #2a2a4a' }}>{row.label}</td>
              {plans.map((p) => (
                <td key={p} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid #2a2a4a', color: '#fff' }}>
                  {formatCell(PLANS[p], row.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', marginTop: '16px' }}>
        {plans.map((p) => (
          <button
            key={p}
            onClick={() => p !== currentPlan && onUpgrade(p)}
            disabled={p === currentPlan}
            style={{
              padding: '8px 16px', background: p === currentPlan ? '#2a2a4a' : COLORS.accent,
              border: 'none', borderRadius: '6px',
              color: p === currentPlan ? '#666' : '#0b0b1a',
              fontSize: '12px', fontFamily: 'IBM Plex Mono, monospace',
              cursor: p === currentPlan ? 'not-allowed' : 'pointer'
            }}
          >
            {p === currentPlan ? 'Current Plan' : p === 'unlimited' ? 'Upgrade' : 'Downgrade'}
          </button>
        ))}
      </div>
    </div>
  );
};

// Payment Section
const PaymentSection = ({ onUpgrade, paymentStatus, pollingCount }) => {
  if (paymentStatus === 'pending') {
    return (
      <div style={{ background: '#11112a', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px' }}>
          <Spinner size="lg" />
        </div>
        <p style={{ color: '#fff', fontSize: '14px' }}>Waiting for payment...</p>
        <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
          {Math.floor(pollingCount * 5 / 60)}m {(pollingCount * 5) % 60}s
        </p>
      </div>
    );
  }

  if (paymentStatus === 'expired') {
    return (
      <div style={{ background: '#11112a', borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
        <p style={{ color: COLORS.red, fontSize: '14px' }}>Payment window expired. Try again.</p>
      </div>
    );
  }

  return (
    <div style={{ background: '#11112a', borderRadius: '8px', padding: '24px' }}>
      <h3 style={{ fontSize: '16px', fontFamily: 'IBM Plex Mono, monospace', color: '#fff', marginBottom: '16px' }}>
        Payment
      </h3>
      <div style={{ padding: '12px', background: '#0a0a15', borderRadius: '6px', marginBottom: '16px' }}>
        <p style={{ fontSize: '12px', color: '#888' }}>
          Pay with crypto — BTC, ETH, USDT and more.
        </p>
        <p style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
          Powered by OxaPay
        </p>
      </div>
      <p style={{ fontSize: '11px', color: '#666', marginBottom: '12px' }}>
        Select a plan above to upgrade or downgrade.
      </p>
    </div>
  );
};

// Payment History Table
const PaymentHistoryTable = ({ payments }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div style={{ background: '#11112a', borderRadius: '8px', padding: '24px' }}>
      <h3 style={{ fontSize: '16px', fontFamily: 'IBM Plex Mono, monospace', color: '#fff', marginBottom: '16px' }}>
        Payment History
      </h3>
      {payments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px', color: '#666' }}>
          <p>No payments yet.</p>
        </div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '8px', color: '#666' }}>Date</th>
              <th style={{ textAlign: 'left', padding: '8px', color: '#666' }}>Amount</th>
              <th style={{ textAlign: 'left', padding: '8px', color: '#666' }}>Status</th>
              <th style={{ textAlign: 'left', padding: '8px', color: '#666' }}>Invoice</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment, i) => (
              <tr key={i}>
                <td style={{ padding: '8px', borderBottom: '1px solid #2a2a4a', color: '#fff' }}>
                  {new Date(payment.date).toLocaleDateString()}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #2a2a4a', color: '#fff' }}>
                  {payment.amount} {payment.currency}
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #2a2a4a' }}>
                  <span style={{
                    color: payment.status === 'paid' ? COLORS.accent : payment.status === 'pending' ? COLORS.yellow : COLORS.red,
                    fontSize: '11px'
                  }}>
                    {payment.status}
                  </span>
                </td>
                <td style={{ padding: '8px', borderBottom: '1px solid #2a2a4a', color: '#888', fontFamily: 'IBM Plex Mono, monospace' }}>
                  <button
                    onClick={() => copyToClipboard(payment.invoiceId)}
                    style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '11px' }}
                  >
                    {payment.invoiceId?.slice(0, 8)}...
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// Cancel Modal
const CancelModal = ({ renewalDate, onConfirm, onClose }) => {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#11112a', padding: '24px', borderRadius: '8px', maxWidth: '400px' }}>
        <h3 style={{ fontSize: '18px', color: COLORS.red, marginBottom: '12px' }}>Cancel subscription?</h3>
        <p style={{ fontSize: '13px', color: '#888', marginBottom: '16px' }}>
          Access continues until {new Date(renewalDate).toLocaleDateString()}. No refunds for partial periods.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', background: COLORS.accent, border: 'none', borderRadius: '6px', color: '#0b0b1a', cursor: 'pointer' }}>
            Keep subscription
          </button>
          <button onClick={onConfirm} style={{ padding: '8px 16px', background: COLORS.red, border: 'none', borderRadius: '6px', color: '#fff', cursor: 'pointer' }}>
            Yes, cancel
          </button>
        </div>
      </div>
    </div>
  );
};

// Confetti Animation
const Confetti = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
    {[...Array(50)].map((_, i) => (
      <div key={i} style={{
        position: 'absolute',
        width: '10px', height: '10px',
        background: [COLORS.accent, COLORS.cyan, COLORS.yellow][i % 3],
        left: `${Math.random() * 100}%`,
        top: '-10px',
        animation: `confetti-fall ${2 + Math.random() * 2}s linear forwards`,
        animationDelay: `${Math.random() * 0.5}s`
      }} />
    ))}
    <style>{`
      @keyframes confetti-fall {
        to {
          transform: translateY(100vh) rotate(720deg);
        }
      }
    `}</style>
  </div>
);

// Spinner component
const Spinner = ({ size = 'md' }) => {
  const sizes = { sm: '16px', md: '24px', lg: '40px' };
  return (
    <div style={{
      width: sizes[size], height: sizes[size],
      border: '3px solid #2a2a4a',
      borderTopColor: COLORS.accent,
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite'
    }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

export default Billing;