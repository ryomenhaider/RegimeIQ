import { lazy, Suspense } from 'react';
import { COLORS, FONTS, REGIME_COLORS } from '../utils/constants';
import Badge from '../components/ui/Badge';

// Lazy load interactive sections
const LivePreview = lazy(() => import('../components/landing/LivePreview'));
const PerformanceLog = lazy(() => import('../components/landing/PerformanceLog'));

// Skeleton loaders
const LivePreviewSkeleton = () => (
  <div
    style={{
      minHeight: '500px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.card,
      borderRadius: '8px'
    }}
  >
    <div style={{ color: COLORS.text, opacity: 0.6 }}>Loading live preview...</div>
  </div>
);

const PerformanceLogSkeleton = () => (
  <div
    style={{
      minHeight: '400px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.card,
      borderRadius: '8px'
    }}
  >
    <div style={{ color: COLORS.text, opacity: 0.6 }}>Loading performance log...</div>
  </div>
);

// Navbar Component - Zero JS, static HTML + CSS
function Navbar() {
  return (
    <nav
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 40,
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '24px',
        paddingRight: '24px',
        backgroundColor: COLORS.bg,
        backdropFilter: 'blur(10px)',
        borderBottom: `1px solid ${COLORS.border}`,
        borderBottomColor: `${COLORS.border}99`
      }}
    >
      {/* Logo */}
      <h1
        style={{
          fontSize: '20px',
          fontFamily: FONTS.mono,
          color: COLORS.accent,
          fontWeight: 'bold',
          margin: 0
        }}
      >
        VektorLabs
      </h1>

      {/* Right side buttons */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <a
          href="/login"
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            backgroundColor: 'transparent',
            border: `1px solid ${COLORS.cyan}`,
            color: COLORS.cyan,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 100ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${COLORS.cyan}15`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          Login
        </a>
        <a
          href="/register"
          style={{
            padding: '10px 20px',
            borderRadius: '6px',
            backgroundColor: COLORS.accent,
            color: COLORS.bg,
            textDecoration: 'none',
            fontSize: '14px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'background 100ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#00dd77';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.accent;
          }}
        >
          Start Free Trial
        </a>
      </div>
    </nav>
  );
}

// Hero Section - Pure HTML + CSS, zero JavaScript
function Hero({ onScrollToDemo }) {
  return (
    <>
      <style>{`
        @keyframes gridShift {
          0% { background-position: 0 0; }
          100% { background-position: 40px 40px; }
        }

        @keyframes glowPulse {
          0%, 100% { box-shadow: 0 0 80px rgba(0, 255, 136, 0.15); }
          50% { box-shadow: 0 0 120px rgba(0, 255, 136, 0.25); }
        }

        .hero-grid {
          animation: gridShift 20s linear infinite;
          background-image:
            linear-gradient(0deg, transparent 23%, rgba(0, 255, 136, 0.05) 25%, rgba(0, 255, 136, 0.05) 26%, transparent 28%),
            linear-gradient(90deg, transparent 23%, rgba(0, 255, 136, 0.05) 25%, rgba(0, 255, 136, 0.05) 26%, transparent 28%);
          background-size: 40px 40px;
        }

        .hero-glow {
          animation: glowPulse 3s ease-in-out infinite;
        }

        html {
          scroll-behavior: smooth;
        }
      `}</style>

      <section
        className="hero-grid"
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: COLORS.bg,
          padding: '40px 20px',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 50%, rgba(0, 255, 136, 0.1) 0%, transparent 70%)`,
            pointerEvents: 'none'
          }}
        />

        <div style={{ maxWidth: '800px', textAlign: 'center', zIndex: 10 }}>
          {/* Main Headline */}
          <h1
            className="hero-glow"
            style={{
              fontSize: 'clamp(2.5rem, 8vw, 5rem)',
              fontFamily: FONTS.mono,
              color: COLORS.accent,
              margin: '0 0 24px 0',
              fontWeight: 'bold',
              lineHeight: 1.2
            }}
          >
            Know what the market is doing before it does it.
          </h1>

          {/* Sub Headline */}
          <p
            style={{
              fontSize: '18px',
              fontFamily: FONTS.sans,
              color: '#7777aa',
              margin: '0 0 48px 0',
              lineHeight: 1.6,
              maxWidth: '700px',
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
          >
            One avoided bad trade covers 50 months of subscription.
          </p>

          {/* CTA Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <a
              href="/register"
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                backgroundColor: COLORS.accent,
                color: COLORS.bg,
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                border: 'none',
                transition: 'background 100ms'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#00dd77';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = COLORS.accent;
              }}
            >
              Start Free Trial
            </a>

            <a
              href="#live-preview"
              onClick={onScrollToDemo}
              style={{
                display: 'inline-block',
                padding: '12px 32px',
                backgroundColor: 'transparent',
                color: COLORS.cyan,
                border: `1px solid ${COLORS.cyan}`,
                textDecoration: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background 100ms'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = `${COLORS.cyan}15`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              See Live Demo
            </a>
          </div>
        </div>
      </section>
    </>
  );
}

// Three Points Section
function ThreePoints() {
  const points = [
    {
      title: 'Regime-aware',
      description: 'Every signal knows what market it\'s in.'
    },
    {
      title: 'Explainable',
      description: 'No black box. Full math shown.'
    },
    {
      title: 'Verifiable',
      description: 'Dated public performance log.'
    }
  ];

  return (
    <section style={{ padding: '80px 20px', backgroundColor: COLORS.bg }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '24px'
          }}
        >
          {points.map((point, idx) => (
            <div
              key={idx}
              style={{
                padding: '24px',
                backgroundColor: COLORS.card,
                borderRadius: '6px',
                border: `1px solid ${COLORS.border}`,
                borderLeftColor: COLORS.cyan,
                borderLeftWidth: '3px'
              }}
            >
              <h3
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '16px',
                  color: COLORS.accent,
                  margin: '0 0 8px 0',
                  fontWeight: 'bold'
                }}
              >
                {point.title}
              </h3>
              <p
                style={{
                  fontFamily: FONTS.sans,
                  fontSize: '14px',
                  color: COLORS.text,
                  opacity: 0.8,
                  margin: 0,
                  lineHeight: 1.6
                }}
              >
                {point.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Pricing Section
function Pricing() {
  const plans = [
    {
      name: 'Trial',
      price: 'Free',
      duration: '14 days',
      features: ['3 symbols', '10 AI queries/day'],
      popular: false
    },
    {
      name: 'Standard',
      price: '$47',
      duration: '/month',
      features: ['10 symbols', '50 AI queries/day'],
      popular: true
    },
    {
      name: 'Unlimited',
      price: '$97',
      duration: '/month',
      features: ['Unlimited symbols', 'Unlimited AI queries', 'API access'],
      popular: false
    }
  ];

  return (
    <section style={{ padding: '80px 20px', backgroundColor: COLORS.bg }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2
          style={{
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: '32px',
            color: COLORS.accent,
            marginBottom: '60px'
          }}
        >
          Simple, transparent pricing
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
          }}
        >
          {plans.map((plan, idx) => (
            <div
              key={idx}
              style={{
                padding: '32px',
                backgroundColor: COLORS.card,
                borderRadius: '8px',
                border: plan.popular ? `2px solid ${COLORS.accent}` : `1px solid ${COLORS.border}`,
                position: 'relative',
                transform: plan.popular ? 'scale(1.05)' : 'scale(1)'
              }}
            >
              {plan.popular && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)'
                  }}
                >
                  <Badge variant="info">Most Popular</Badge>
                </div>
              )}

              <h3
                style={{
                  fontFamily: FONTS.mono,
                  fontSize: '20px',
                  color: COLORS.text,
                  margin: '0 0 8px 0'
                }}
              >
                {plan.name}
              </h3>

              <div
                style={{
                  fontSize: '36px',
                  fontWeight: 'bold',
                  color: COLORS.accent,
                  margin: '12px 0'
                }}
              >
                {plan.price}
              </div>

              <p
                style={{
                  fontSize: '14px',
                  color: COLORS.text,
                  opacity: 0.6,
                  margin: '0 0 24px 0'
                }}
              >
                {plan.duration}
              </p>

              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '0 0 24px 0'
                }}
              >
                {plan.features.map((feature, fidx) => (
                  <li
                    key={fidx}
                    style={{
                      fontSize: '14px',
                      color: COLORS.text,
                      padding: '8px 0',
                      borderBottom: `1px solid ${COLORS.border}`
                    }}
                  >
                    ✓ {feature}
                  </li>
                ))}
              </ul>

              <a
                href="/register"
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px',
                  textAlign: 'center',
                  backgroundColor: plan.popular ? COLORS.accent : 'transparent',
                  color: plan.popular ? COLORS.bg : COLORS.cyan,
                  border: plan.popular ? 'none' : `1px solid ${COLORS.cyan}`,
                  borderRadius: '6px',
                  textDecoration: 'none',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 100ms'
                }}
                onMouseEnter={(e) => {
                  if (plan.popular) {
                    e.currentTarget.style.backgroundColor = '#00dd77';
                  } else {
                    e.currentTarget.style.backgroundColor = `${COLORS.cyan}15`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (plan.popular) {
                    e.currentTarget.style.backgroundColor = COLORS.accent;
                  } else {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }
                }}
              >
                {plan.name === 'Trial' ? 'Start Free Trial' : `Get ${plan.name}`}
              </a>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: 'center',
            fontSize: '14px',
            color: COLORS.text,
            opacity: 0.6
          }}
        >
          💳 Crypto payments via <strong>OxaPay</strong>
        </div>
      </div>
    </section>
  );
}

// Footer Component
function Footer() {
  const links = [
    { label: 'Docs', href: 'https://docs.vektor.lab' },
    { label: 'Twitter/X', href: 'https://twitter.com/vektor' },
    { label: 'Discord', href: 'https://discord.gg/vektor' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' }
  ];

  return (
    <footer
      style={{
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '24px',
        backgroundColor: COLORS.card,
        borderTop: `1px solid ${COLORS.border}`,
        padding: '20px',
        flexWrap: 'wrap'
      }}
    >
      {links.map((link, idx) => (
        <a
          key={idx}
          href={link.href}
          target={link.href.startsWith('http') ? '_blank' : undefined}
          rel={link.href.startsWith('http') ? 'noopener noreferrer' : undefined}
          style={{
            fontSize: '14px',
            fontFamily: FONTS.sans,
            color: COLORS.text,
            textDecoration: 'none',
            opacity: 0.7,
            transition: 'opacity 100ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.color = COLORS.accent;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
            e.currentTarget.style.color = COLORS.text;
          }}
        >
          {link.label}
        </a>
      ))}
    </footer>
  );
}

// Main Landing Page
export default function LandingPage() {
  const handleScrollToDemo = (e) => {
    e.preventDefault();
    const element = document.getElementById('live-preview');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div style={{ backgroundColor: COLORS.bg, color: COLORS.text }}>
      <Navbar />
      <Hero onScrollToDemo={handleScrollToDemo} />

      {/* Live Preview - Lazy loaded */}
      <section
        id="live-preview"
        style={{
          padding: '80px 20px',
          backgroundColor: COLORS.bg
        }}
      >
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: '28px',
              color: COLORS.accent,
              marginBottom: '40px'
            }}
          >
            Live — no account required
          </h2>
          <Suspense fallback={<LivePreviewSkeleton />}>
            <LivePreview />
          </Suspense>
        </div>
      </section>

      <ThreePoints />
      <Pricing />

      {/* Performance Log - Lazy loaded */}
      <section style={{ padding: '80px 20px', backgroundColor: COLORS.bg }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2
            style={{
              textAlign: 'center',
              fontFamily: FONTS.mono,
              fontSize: '28px',
              color: COLORS.accent,
              marginBottom: '40px'
            }}
          >
            Verified Performance
          </h2>
          <Suspense fallback={<PerformanceLogSkeleton />}>
            <PerformanceLog />
          </Suspense>
          <p
            style={{
              textAlign: 'center',
              fontSize: '13px',
              color: COLORS.text,
              opacity: 0.6,
              marginTop: '20px',
              fontFamily: FONTS.mono
            }}
          >
            Walk-forward validated. No hindsight.
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
