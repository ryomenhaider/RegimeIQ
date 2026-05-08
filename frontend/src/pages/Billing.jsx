import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { COLORS } from '../utils/constants';
import toast from 'react-hot-toast';
import api from '../services/api';

const C = {
  bg: '#090910',
  card: '#11112a',
  surface: '#16162e',
  border: '#2a2a4a',
  accent: '#7ED87A',
  text: '#ddddf0',
  muted: '#7777aa',
  faint: '#555570',
  red: '#ff4455',
  yellow: '#f5c542',
  cyan: '#00ccff',
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

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

// Section heading
const SectionHead = ({ title, subtitle }) => (
  <div style={{ marginBottom: '20px' }}>
    <h2 style={{ fontFamily: C.mono, fontSize: '13px', color: C.text, letterSpacing: '0.08em', fontWeight: 500, textTransform: 'uppercase', marginBottom: '4px' }}>
      {title}
    </h2>
    {subtitle && <p style={{ fontFamily: C.sans, fontSize: '13px', color: C.faint, margin: 0 }}>{subtitle}</p>}
  </div>
);

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
    if (username !== currentUsername) navigate(`/dashboard/${currentUsername}/billing`);
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
    return () => { if (pollingId) clearInterval(pollingId); };
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
      } catch {
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
      active: { bg: `${C.accent}18`, color: C.accent, text: 'Active', dot: C.accent },
      trial: { bg: `${C.yellow}18`, color: C.yellow, text: `Trial · ${trialRemaining}d left`, dot: C.yellow },
      grace_period: { bg: `${C.yellow}18`, color: C.yellow, text: 'Grace Period', dot: C.yellow, pulse: true },
      expired: { bg: `${C.red}18`, color: C.red, text: 'Expired', dot: C.red },
    };
    return badges[status] || badges.expired;
  };

  const currentPlanPlan = PLANS[billing?.plan] || PLANS.trial;
  const statusBadge = getStatusBadge(billing?.status, billing?.trialRemaining);

  return (
    <div style={{
      minHeight: '100vh',
      background: C.bg,
      fontFamily: C.sans,
      padding: '0',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes confetti-fall { to { transform: translateY(100vh) rotate(720deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .billing-section { animation: fadeIn 0.3s ease; }
        .plan-card {
          background: ${C.card};
          border: 1px solid ${C.border};
          border-radius: 8px;
          padding: 24px;
          transition: border-color 200ms, box-shadow 200ms;
          cursor: pointer;
        }
        .plan-card:hover { border-color: ${C.accent}50; }
        .plan-card.current { border-color: ${C.accent}; box-shadow: 0 0 20px ${C.accent}15; }
      `}</style>

      {/* Grace period banner */}
      {billing?.status === 'grace_period' && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          background: '#1a0e00',
          borderBottom: `1px solid ${C.yellow}40`,
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          gap: '8px',
          zIndex: 1000,
        }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.yellow, animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontFamily: C.mono, fontSize: '12px', color: C.yellow, letterSpacing: '0.04em' }}>
            Payment failed — access continues for {billing?.graceDaysRemaining} days.{' '}
            <a href="#payment" style={{ color: C.yellow, textDecoration: 'underline' }}>Update payment →</a>
          </span>
        </div>
      )}
      {billing?.status === 'grace_period' && <div style={{ height: '44px' }} />}

      {/* Page header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        padding: '24px 32px',
        background: C.card,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ fontFamily: C.mono, fontSize: '16px', color: C.text, fontWeight: 600, letterSpacing: '0.06em', marginBottom: '4px' }}>
              Billing & Subscription
            </h1>
            <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
              Manage your plan, payment, and history
            </div>
          </div>

          {billing && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '6px 12px',
              background: statusBadge.bg,
              border: `1px solid ${statusBadge.color}30`,
              borderRadius: '5px',
            }}>
              <div style={{
                width: '6px', height: '6px', borderRadius: '50%',
                background: statusBadge.dot,
                animation: statusBadge.pulse ? 'pulse 1.5s infinite' : 'none',
              }} />
              <span style={{ fontFamily: C.mono, fontSize: '11px', color: statusBadge.color, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {statusBadge.text}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main content */}
      <div style={{ padding: '32px', maxWidth: '1100px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '24px' }}>

          {/* Current Plan */}
          <div className="billing-section" style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '28px', overflow: 'hidden', position: 'relative',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
              background: C.accent, boxShadow: `0 0 10px ${C.accent}`,
            }} />

            <SectionHead title="Current Plan" />
            <CurrentPlanCard
              plan={currentPlanPlan}
              billing={billing}
              statusBadge={statusBadge}
              onCancel={() => setShowCancelModal(true)}
            />
          </div>

          {/* Plan Comparison */}
          <div className="billing-section" style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '28px', overflowX: 'auto',
          }}>
            <SectionHead title="Plan Comparison" />
            <PlanComparison currentPlan={billing?.plan} onUpgrade={handleUpgrade} />
          </div>

          {/* Payment */}
          <div id="payment" className="billing-section" style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '28px',
          }}>
            <SectionHead title="Payment" subtitle="Crypto payments via OxaPay" />
            <PaymentSection
              onUpgrade={handleUpgrade}
              paymentStatus={paymentStatus}
              pollingCount={pollingCount}
            />
          </div>

          {/* Payment History */}
          <div className="billing-section" style={{
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: '10px', padding: '28px',
          }}>
            <SectionHead title="Payment History" />
            <PaymentHistoryTable payments={paymentHistory || []} />
          </div>
        </div>
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
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const symbolsUsed = billing?.symbolsUsed || 0;
  const symbolsLimit = plan.limit === Infinity ? '∞' : plan.limit;
  const pct = plan.limit === Infinity ? 0 : Math.min((symbolsUsed / plan.limit) * 100, 100);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontFamily: C.mono, fontSize: '26px', color: C.accent, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: '2px' }}>
            {plan.name}
          </div>
          <div style={{ fontFamily: C.mono, fontSize: '13px', color: C.muted }}>
            {plan.price === 0 ? 'Free' : `$${plan.price} / month`}
          </div>
        </div>
      </div>

      <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, marginBottom: '16px', letterSpacing: '0.04em' }}>
        {billing?.status === 'trial' ? 'Trial expires' : 'Renews'} {formatDate(billing?.renewalDate)}
      </div>

      {/* Symbol usage bar */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Symbol Usage</span>
          <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.muted }}>
            {symbolsUsed} / {symbolsLimit}
          </span>
        </div>
        <div style={{ height: '3px', background: C.surface, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: pct > 80 ? C.red : C.accent,
            borderRadius: '2px',
            boxShadow: `0 0 6px ${pct > 80 ? C.red : C.accent}`,
            transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      {plan.price > 0 && (
        <button
          onClick={onCancel}
          style={{
            padding: '8px 16px',
            background: 'transparent',
            border: `1px solid ${C.red}40`,
            borderRadius: '6px',
            color: C.red,
            fontFamily: C.mono, fontSize: '11px',
            cursor: 'pointer',
            letterSpacing: '0.04em',
            transition: 'all 150ms',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${C.red}15`;
            e.currentTarget.style.borderColor = C.red;
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.borderColor = `${C.red}40`;
          }}
        >
          Cancel Subscription
        </button>
      )}
    </div>
  );
};

// Plan Comparison
const PlanComparison = ({ currentPlan, onUpgrade }) => {
  const plans = ['trial', 'standard', 'unlimited'];

  const formatCell = (plan, key) => {
    const value = plan.features[key];
    if (key === 'trialDuration') return value || '—';
    if (typeof value === 'boolean') {
      return value
        ? <span style={{ color: C.accent, fontSize: '14px' }}>✓</span>
        : <span style={{ color: C.faint }}>—</span>;
    }
    if (key === 'symbols') return value === Infinity ? '∞' : value;
    return value;
  };

  const planColors = { unlimited: C.accent, standard: C.cyan, trial: C.muted };

  return (
    <div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: '8px 10px', fontFamily: C.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }} />
            {plans.map((p) => (
              <th key={p} style={{
                textAlign: 'center', padding: '8px 10px',
                fontFamily: C.mono, fontSize: '11px',
                color: currentPlan === p ? planColors[p] : C.muted,
                borderBottom: currentPlan === p ? `2px solid ${planColors[p]}` : `1px solid ${C.border}`,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {PLANS[p].name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {PLAN_ROWS.map((row) => (
            <tr key={row.key} style={{ transition: 'background 80ms' }}
              onMouseEnter={e => e.currentTarget.style.background = C.surface}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <td style={{ padding: '9px 10px', fontFamily: C.mono, fontSize: '11px', color: C.muted, borderBottom: `1px solid ${C.border}30` }}>
                {row.label}
              </td>
              {plans.map((p) => (
                <td key={p} style={{ textAlign: 'center', padding: '9px 10px', fontFamily: C.mono, fontSize: '12px', color: C.text, borderBottom: `1px solid ${C.border}30` }}>
                  {formatCell(PLANS[p], row.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '20px' }}>
        {plans.map((p) => {
          const isCurrent = p === currentPlan;
          const color = planColors[p];
          return (
            <button
              key={p}
              onClick={() => !isCurrent && onUpgrade(p)}
              disabled={isCurrent}
              style={{
                padding: '7px 14px',
                background: isCurrent ? C.surface : p === 'unlimited' ? C.accent : 'transparent',
                border: isCurrent ? `1px solid ${C.border}` : `1px solid ${color}`,
                borderRadius: '5px',
                color: isCurrent ? C.faint : p === 'unlimited' ? '#060610' : color,
                fontFamily: C.mono, fontSize: '11px',
                cursor: isCurrent ? 'not-allowed' : 'pointer',
                letterSpacing: '0.04em',
                transition: 'all 150ms',
              }}
              onMouseEnter={e => {
                if (!isCurrent && p !== 'unlimited') e.currentTarget.style.background = `${color}15`;
              }}
              onMouseLeave={e => {
                if (!isCurrent && p !== 'unlimited') e.currentTarget.style.background = 'transparent';
              }}
            >
              {isCurrent ? 'Current' : p === 'unlimited' ? 'Upgrade →' : 'Select'}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Payment Section
const PaymentSection = ({ onUpgrade, paymentStatus, pollingCount }) => {
  if (paymentStatus === 'pending') {
    const elapsed = `${Math.floor(pollingCount * 5 / 60)}m ${(pollingCount * 5) % 60}s`;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px', gap: '16px' }}>
        <div style={{
          width: '40px', height: '40px',
          border: `3px solid ${C.border}`,
          borderTopColor: C.accent,
          borderRadius: '50%',
          animation: 'spin 0.7s linear infinite',
        }} />
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontFamily: C.mono, fontSize: '13px', color: C.text, marginBottom: '6px' }}>
            Awaiting payment confirmation
          </p>
          <p style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint }}>
            {elapsed} elapsed
          </p>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'expired') {
    return (
      <div style={{
        padding: '16px',
        background: `${C.red}10`,
        border: `1px solid ${C.red}30`,
        borderRadius: '6px',
        fontFamily: C.mono, fontSize: '12px', color: C.red,
        textAlign: 'center',
      }}>
        Payment window expired — please try again.
      </div>
    );
  }

  return (
    <div>
      <div style={{
        padding: '16px',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '8px',
        marginBottom: '16px',
        display: 'flex', alignItems: 'center', gap: '14px',
      }}>
        <div style={{
          width: '36px', height: '36px',
          background: `${C.accent}15`,
          border: `1px solid ${C.accent}30`,
          borderRadius: '6px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '18px', flexShrink: 0,
        }}>
          ₿
        </div>
        <div>
          <div style={{ fontFamily: C.mono, fontSize: '12px', color: C.text, marginBottom: '2px' }}>
            Pay with crypto
          </div>
          <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint }}>
            BTC, ETH, USDT and more — powered by OxaPay
          </div>
        </div>
      </div>
      <p style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
        Select a plan from the comparison table above to proceed.
      </p>
    </div>
  );
};

// Payment History
const PaymentHistoryTable = ({ payments }) => {
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied');
  };

  if (payments.length === 0) {
    return (
      <div style={{
        padding: '40px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px',
      }}>
        <div style={{ fontFamily: C.mono, fontSize: '28px', color: C.faint }}>◎</div>
        <p style={{ fontFamily: C.mono, fontSize: '12px', color: C.faint, letterSpacing: '0.06em' }}>
          No payments yet
        </p>
      </div>
    );
  }

  const statusColors = { paid: C.accent, pending: C.yellow, failed: C.red, refunded: C.muted };

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Date', 'Amount', 'Status', 'Invoice'].map(h => (
            <th key={h} style={{
              textAlign: 'left', padding: '8px 10px',
              fontFamily: C.mono, fontSize: '10px', color: C.faint,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              borderBottom: `1px solid ${C.border}`, fontWeight: 400,
            }}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {payments.map((payment, i) => (
          <tr key={i}
            style={{ transition: 'background 80ms' }}
            onMouseEnter={e => e.currentTarget.style.background = C.surface}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <td style={{ padding: '10px', fontFamily: C.mono, fontSize: '12px', color: C.muted, borderBottom: `1px solid ${C.border}30` }}>
              {new Date(payment.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>
            <td style={{ padding: '10px', fontFamily: C.mono, fontSize: '12px', color: C.text, borderBottom: `1px solid ${C.border}30` }}>
              {payment.amount} <span style={{ color: C.faint }}>{payment.currency}</span>
            </td>
            <td style={{ padding: '10px', borderBottom: `1px solid ${C.border}30` }}>
              <span style={{
                fontFamily: C.mono, fontSize: '10px',
                color: statusColors[payment.status] || C.muted,
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                {payment.status}
              </span>
            </td>
            <td style={{ padding: '10px', borderBottom: `1px solid ${C.border}30` }}>
              <button
                onClick={() => copyToClipboard(payment.invoiceId)}
                style={{
                  background: 'none', border: 'none',
                  fontFamily: C.mono, fontSize: '11px', color: C.faint,
                  cursor: 'pointer', letterSpacing: '0.04em',
                  transition: 'color 120ms',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.accent}
                onMouseLeave={e => e.currentTarget.style.color = C.faint}
                title={payment.invoiceId}
              >
                {payment.invoiceId?.slice(0, 8)}...
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

// Cancel Modal
const CancelModal = ({ renewalDate, onConfirm, onClose }) => (
  <div style={{
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.85)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000,
  }}>
    <div style={{
      background: C.card,
      border: `1px solid ${C.border}`,
      borderTop: `1px solid ${C.red}40`,
      borderRadius: '10px',
      padding: '32px',
      maxWidth: '400px',
      width: '90%',
      boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
    }}>
      <h3 style={{ fontFamily: C.mono, fontSize: '16px', color: C.red, marginBottom: '12px', letterSpacing: '0.04em' }}>
        Cancel Subscription?
      </h3>
      <p style={{ fontFamily: C.sans, fontSize: '14px', color: C.muted, lineHeight: 1.6, marginBottom: '24px' }}>
        Your access continues until {new Date(renewalDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}. No refunds for partial periods.
      </p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
        <button
          onClick={onClose}
          style={{
            padding: '9px 18px',
            background: C.accent,
            border: 'none', borderRadius: '6px',
            color: '#060610',
            fontFamily: C.mono, fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.04em',
          }}
        >
          Keep Plan
        </button>
        <button
          onClick={onConfirm}
          style={{
            padding: '9px 18px',
            background: 'transparent',
            border: `1px solid ${C.red}`,
            borderRadius: '6px',
            color: C.red,
            fontFamily: C.mono, fontSize: '12px',
            cursor: 'pointer', letterSpacing: '0.04em',
            transition: 'background 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.background = `${C.red}15`}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          Yes, Cancel
        </button>
      </div>
    </div>
  </div>
);

// Confetti
const Confetti = () => (
  <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999 }}>
    {[...Array(50)].map((_, i) => (
      <div key={i} style={{
        position: 'absolute',
        width: '8px', height: '8px',
        background: [C.accent, C.cyan, C.yellow][i % 3],
        borderRadius: i % 2 === 0 ? '50%' : '0',
        left: `${Math.random() * 100}%`,
        top: '-10px',
        animation: `confetti-fall ${2 + Math.random() * 2}s linear forwards`,
        animationDelay: `${Math.random() * 0.5}s`,
      }} />
    ))}
  </div>
);

export default Billing;