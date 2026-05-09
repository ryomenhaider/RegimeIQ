import { lazy, Suspense } from 'react';
import { COLORS, FONTS, REGIME_COLORS } from '../utils/constants';
import Badge from '../components/ui/Badge';

const LivePreview = lazy(() => import('../components/landing/LivePreview'));
const PerformanceLog = lazy(() => import('../components/landing/PerformanceLog'));

const C = {
  bg: '#090910',
  card: '#11112a',
  surface: '#16162e',
  border: '#2a2a4a',
  accent: '#7ED87A',
  cyan: '#00ccff',
  text: '#ddddf0',
  muted: '#7777aa',
  faint: '#555570',
  red: '#ff4455',
  yellow: '#f5c542',
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

const LivePreviewSkeleton = () => (
  <div style={{
    minHeight: '480px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '20px', height: '20px',
        border: `2px solid ${C.border}`,
        borderTopColor: C.accent,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.08em' }}>
        Loading live preview...
      </span>
    </div>
  </div>
);

const PerformanceLogSkeleton = () => (
  <div style={{
    minHeight: '360px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '10px',
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{
        width: '20px', height: '20px',
        border: `2px solid ${C.border}`,
        borderTopColor: C.accent,
        borderRadius: '50%',
        animation: 'spin 0.7s linear infinite',
      }} />
      <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.08em' }}>
        Loading performance log...
      </span>
    </div>
  </div>
);

function Navbar() {
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 40,
      height: '56px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
      background: `${C.bg}ee`,
      backdropFilter: 'blur(12px)',
      borderBottom: `1px solid ${C.border}`,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div style={{
          width: '28px', height: '28px',
          border: `1.5px solid ${C.accent}`,
          borderRadius: '5px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 10px ${C.accent}25`,
        }}>
          <div style={{ width: '10px', height: '10px', background: C.accent, borderRadius: '2px' }} />
        </div>
        <span style={{ fontFamily: C.mono, fontSize: '16px', color: C.text, fontWeight: 600, letterSpacing: '0.06em' }}>
          VektorLabs
        </span>
      </div>

      {/* Nav links */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {[
          { label: 'Docs', href: '/docs' },
          { label: 'Login', href: '/login', outlined: true },
          { label: 'Start Free Trial', href: '/register', primary: true },
        ].map(link => (
          <a
            key={link.href}
            href={link.href}
            style={{
              padding: link.primary || link.outlined ? '8px 18px' : '8px 14px',
              borderRadius: '6px',
              background: link.primary ? C.accent : 'transparent',
              border: link.outlined ? `1px solid ${C.border}` : link.primary ? 'none' : 'none',
              color: link.primary ? '#060610' : link.outlined ? C.text : C.muted,
              textDecoration: 'none',
              fontFamily: link.primary ? C.mono : C.sans,
              fontSize: '13px',
              fontWeight: link.primary ? 600 : 400,
              cursor: 'pointer',
              letterSpacing: link.primary ? '0.04em' : 0,
              transition: 'all 150ms',
            }}
            onMouseEnter={e => {
              if (link.primary) { e.currentTarget.style.boxShadow = `0 0 16px ${C.accent}50`; }
              else if (link.outlined) { e.currentTarget.style.borderColor = `${C.accent}60`; e.currentTarget.style.color = C.text; }
              else { e.currentTarget.style.color = C.text; }
            }}
            onMouseLeave={e => {
              if (link.primary) { e.currentTarget.style.boxShadow = 'none'; }
              else if (link.outlined) { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }
              else { e.currentTarget.style.color = C.muted; }
            }}
          >
            {link.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

function Hero({ onScrollToDemo }) {
  return (
    <section className="hero-grid" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: C.bg,
      padding: '60px 24px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Radial glow */}
      <div className="hero-glow" style={{
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(126,216,122,0.08) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: '760px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        {/* Status badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '6px 14px',
          background: `${C.accent}12`,
          border: `1px solid ${C.accent}30`,
          borderRadius: '20px',
          marginBottom: '36px',
          fontFamily: C.mono, fontSize: '11px', color: C.accent,
          letterSpacing: '0.08em',
        }}>
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: C.accent,
            boxShadow: `0 0 6px ${C.accent}`,
            animation: 'livePulse 2s ease-in-out infinite',
          }} />
          LIVE MARKET INTELLIGENCE
        </div>

        {/* Headline */}
        <h1 style={{
          fontFamily: C.mono,
          fontSize: 'clamp(2rem, 6vw, 3.8rem)',
          color: C.text,
          margin: '0 0 24px',
          fontWeight: 600,
          lineHeight: 1.15,
          letterSpacing: '-0.01em',
        }}>
          Know what the market<br />
          <span style={{
            color: C.accent,
            textShadow: `0 0 40px ${C.accent}40`,
          }}>
            is doing
          </span>
          {' '}before it does it.
        </h1>

        {/* Sub headline */}
        <p style={{
          fontFamily: C.sans,
          fontSize: '17px',
          color: C.muted,
          margin: '0 auto 48px',
          lineHeight: 1.65,
          maxWidth: '560px',
        }}>
          One avoided bad trade covers 50 months of subscription.
          Institutional-grade signals, regime detection, and causal AI.
        </p>

        {/* CTA group */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/register" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '13px 28px',
            background: C.accent,
            border: 'none', borderRadius: '7px',
            color: '#060610',
            textDecoration: 'none',
            fontSize: '14px', fontWeight: 700,
            fontFamily: C.mono,
            cursor: 'pointer', letterSpacing: '0.04em',
            transition: 'all 150ms',
          }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 24px ${C.accent}60`}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            Start Free Trial →
          </a>

          <a href="#live-preview" onClick={onScrollToDemo} style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '13px 28px',
            background: 'transparent',
            border: `1px solid ${C.border}`,
            borderRadius: '7px',
            color: C.text,
            textDecoration: 'none',
            fontSize: '14px', fontWeight: 500,
            fontFamily: C.sans,
            cursor: 'pointer',
            transition: 'all 150ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = `${C.cyan}60`; e.currentTarget.style.color = C.cyan; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }}
          >
            ▶ See Live Demo
          </a>
        </div>

        {/* Social proof strip */}
        <div style={{
          marginTop: '56px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px',
          flexWrap: 'wrap',
        }}>
          {[
            { value: '4', label: 'Regime Types' },
            { value: '14d', label: 'Free Trial' },
            { value: '100+', label: 'Symbols' },
            { value: '99.9%', label: 'Uptime' },
          ].map(stat => (
            <div key={stat.label} style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: C.mono, fontSize: '20px', color: C.accent, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {stat.value}
              </div>
              <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: '3px' }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ThreePoints() {
  const points = [
    {
      icon: '◈',
      title: 'Regime-Aware',
      description: 'Every signal knows which market regime it operates in — trending, mean-reverting, volatile, or illiquid.',
      color: C.accent,
    },
    {
      icon: '◎',
      title: 'Fully Explainable',
      description: 'No black boxes. Full mathematics shown behind every signal, score, and recommendation.',
      color: C.cyan,
    },
    {
      icon: '◆',
      title: 'Publicly Verifiable',
      description: 'Dated public performance log, walk-forward validated. Zero hindsight bias.',
      color: C.yellow,
    },
  ];

  return (
    <section style={{ padding: '80px 24px', background: C.bg }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Section label */}
        <div style={{
          fontFamily: C.mono, fontSize: '10px', color: C.faint,
          letterSpacing: '0.16em', textTransform: 'uppercase',
          textAlign: 'center', marginBottom: '40px',
        }}>
          Why VektorLabs
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
          {points.map((point) => (
            <div
              key={point.title}
              style={{
                padding: '28px',
                background: C.card,
                border: `1px solid ${C.border}`,
                borderRadius: '10px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'border-color 200ms, box-shadow 200ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = `${point.color}50`;
                e.currentTarget.style.boxShadow = `0 4px 24px ${point.color}10`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = C.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
                background: point.color,
              }} />
              <div style={{
                width: '36px', height: '36px',
                background: `${point.color}15`,
                border: `1px solid ${point.color}30`,
                borderRadius: '7px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px',
                fontSize: '16px', color: point.color,
              }}>
                {point.icon}
              </div>
              <h3 style={{
                fontFamily: C.mono, fontSize: '14px', color: C.text,
                fontWeight: 600, marginBottom: '10px', letterSpacing: '0.04em',
              }}>
                {point.title}
              </h3>
              <p style={{
                fontFamily: C.sans, fontSize: '14px', color: C.muted,
                lineHeight: 1.65, margin: 0,
              }}>
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const plans = [
    {
      id: 'trial',
      name: 'Trial',
      price: 'Free',
      duration: '14 days',
      features: ['3 symbols', 'Regime detection', '10 AI queries/day'],
      color: C.muted,
    },
    {
      id: 'standard',
      name: 'Standard',
      price: '$47',
      duration: '/ month',
      features: ['10 symbols', 'All modules', '50 AI queries/day', 'Discord alerts'],
      popular: true,
      color: C.accent,
    },
    {
      id: 'unlimited',
      name: 'Unlimited',
      price: '$97',
      duration: '/ month',
      features: ['Unlimited symbols', 'All modules', 'Unlimited AI', 'Discord alerts', 'API access'],
      color: C.cyan,
    },
  ];

  return (
    <section style={{ padding: '80px 24px', background: C.bg }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '56px' }}>
          <div style={{
            fontFamily: C.mono, fontSize: '10px', color: C.faint,
            letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: '16px',
          }}>
            Pricing
          </div>
          <h2 style={{ fontFamily: C.mono, fontSize: '28px', color: C.text, fontWeight: 600, letterSpacing: '0.02em', margin: 0 }}>
            Simple, transparent pricing
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', alignItems: 'start' }}>
          {plans.map((plan) => (
            <div
              key={plan.id}
              style={{
                padding: '28px',
                background: C.card,
                border: plan.popular ? `1px solid ${C.accent}` : `1px solid ${C.border}`,
                borderRadius: '10px',
                position: 'relative',
                boxShadow: plan.popular ? `0 0 40px ${C.accent}12` : 'none',
                transition: 'transform 200ms, box-shadow 200ms',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = plan.popular
                  ? `0 8px 40px ${C.accent}20`
                  : `0 8px 24px rgba(0,0,0,0.3)`;
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = plan.popular ? `0 0 40px ${C.accent}12` : 'none';
              }}
            >
              {plan.popular && (
                <div style={{
                  position: 'absolute', top: '-1px', left: '50%',
                  transform: 'translateX(-50%) translateY(-50%)',
                  padding: '3px 12px',
                  background: C.accent,
                  borderRadius: '10px',
                  fontFamily: C.mono, fontSize: '10px', color: '#060610',
                  fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                }}>
                  Most Popular
                </div>
              )}

              <div style={{
                fontFamily: C.mono, fontSize: '12px', color: plan.color,
                letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '12px',
              }}>
                {plan.name}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '6px' }}>
                <span style={{ fontFamily: C.mono, fontSize: '32px', color: C.text, fontWeight: 600, letterSpacing: '-0.02em' }}>
                  {plan.price}
                </span>
                <span style={{ fontFamily: C.mono, fontSize: '13px', color: C.faint }}>
                  {plan.duration}
                </span>
              </div>

              <div style={{ height: '1px', background: C.border, margin: '20px 0' }} />

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px' }}>
                {plan.features.map((feature) => (
                  <li key={feature} style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    fontFamily: C.sans, fontSize: '13px', color: C.muted,
                    marginBottom: '9px',
                  }}>
                    <span style={{ color: plan.color, fontSize: '12px', flexShrink: 0 }}>✓</span>
                    {feature}
                  </li>
                ))}
              </ul>

              <a
                href="/register"
                style={{
                  display: 'block',
                  padding: '11px',
                  textAlign: 'center',
                  background: plan.popular ? C.accent : 'transparent',
                  border: plan.popular ? 'none' : `1px solid ${C.border}`,
                  borderRadius: '6px',
                  color: plan.popular ? '#060610' : C.text,
                  textDecoration: 'none',
                  fontFamily: C.mono, fontSize: '12px', fontWeight: plan.popular ? 700 : 500,
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => {
                  if (plan.popular) { e.currentTarget.style.boxShadow = `0 0 16px ${C.accent}50`; }
                  else { e.currentTarget.style.borderColor = `${C.accent}60`; e.currentTarget.style.color = C.accent; }
                }}
                onMouseLeave={e => {
                  if (plan.popular) { e.currentTarget.style.boxShadow = 'none'; }
                  else { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.text; }
                }}
              >
                {plan.id === 'trial' ? 'Start Free Trial' : `Get ${plan.name} →`}
              </a>
            </div>
          ))}
        </div>

        <div style={{
          textAlign: 'center', marginTop: '32px',
          fontFamily: C.mono, fontSize: '12px', color: C.faint,
          letterSpacing: '0.04em',
        }}>
          Crypto payments via OxaPay · BTC, ETH, USDT and more
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const links = [
    { label: 'Docs', href: '/docs' },
    { label: 'Twitter/X', href: 'https://x.com/vektor_labs' },
    { label: 'Discord', href: 'https://discord.gg/8XPUG8hYed' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ];

  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      padding: '32px 24px',
      background: C.card,
    }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '20px' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '22px', height: '22px',
            border: `1.5px solid ${C.accent}`,
            borderRadius: '4px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: '7px', height: '7px', background: C.accent, borderRadius: '1px' }} />
          </div>
          <span style={{ fontFamily: C.mono, fontSize: '13px', color: C.faint, letterSpacing: '0.06em' }}>
            VektorLabs
          </span>
        </div>

        {/* Links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '24px', flexWrap: 'wrap' }}>
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              target={link.href.startsWith('http') ? '_blank' : undefined}
              rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
              style={{
                fontFamily: C.sans, fontSize: '13px', color: C.faint,
                textDecoration: 'none', transition: 'color 120ms',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.faint}
            >
              {link.label}
            </a>
          ))}
        </div>

        <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
          © 2026 VektorLabs
        </div>
      </div>
    </footer>
  );
}

// Section wrapper with label
function PageSection({ id, label, children, style }) {
  return (
    <section id={id} style={{ padding: '80px 24px', background: C.bg, ...style }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {label && (
          <div style={{
            fontFamily: C.mono, fontSize: '10px', color: C.faint,
            letterSpacing: '0.16em', textTransform: 'uppercase',
            textAlign: 'center', marginBottom: '16px',
          }}>
            {label}
          </div>
        )}
        {children}
      </div>
    </section>
  );
}

export default function LandingPage() {
  const handleScrollToDemo = (e) => {
    e.preventDefault();
    document.getElementById('live-preview')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: C.sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

        html { scroll-behavior: smooth; }

        @keyframes spin { to { transform: rotate(360deg); } }

        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #7ED87A; }
          50% { opacity: 0.5; box-shadow: 0 0 12px #7ED87A; }
        }

        @keyframes gridDrift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }

        .hero-grid::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image:
            linear-gradient(0deg, transparent 24%, rgba(126,216,122,0.035) 25%, rgba(126,216,122,0.035) 26%, transparent 27%),
            linear-gradient(90deg, transparent 24%, rgba(126,216,122,0.035) 25%, rgba(126,216,122,0.035) 26%, transparent 27%);
          background-size: 40px 40px;
          animation: gridDrift 28s linear infinite;
          pointer-events: none;
        }

        @keyframes heroGlow {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
        .hero-glow { animation: heroGlow 4s ease-in-out infinite; }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
      `}</style>

      <Navbar />
      <Hero onScrollToDemo={handleScrollToDemo} />
      <ThreePoints />

      {/* Live preview */}
      <PageSection id="live-preview" label="Live Demo — No account required">
        <h2 style={{
          textAlign: 'center',
          fontFamily: C.mono, fontSize: '24px', color: C.text,
          fontWeight: 600, letterSpacing: '0.02em',
          margin: '0 0 40px',
        }}>
          Real signals. Right now.
        </h2>
        <Suspense fallback={<LivePreviewSkeleton />}>
          <LivePreview />
        </Suspense>
      </PageSection>

      <Pricing />

      {/* Performance log */}
      <PageSection label="Track Record">
        <h2 style={{
          textAlign: 'center',
          fontFamily: C.mono, fontSize: '24px', color: C.text,
          fontWeight: 600, letterSpacing: '0.02em',
          margin: '0 0 40px',
        }}>
          Verified Performance
        </h2>
        <Suspense fallback={<PerformanceLogSkeleton />}>
          <PerformanceLog />
        </Suspense>
        <p style={{
          textAlign: 'center',
          fontFamily: C.mono, fontSize: '12px', color: C.faint,
          marginTop: '20px', letterSpacing: '0.06em',
        }}>
          Walk-forward validated · No hindsight · Dated public log
        </p>
      </PageSection>

      <Footer />
    </div>
  );
}