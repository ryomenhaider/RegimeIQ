import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { COLORS, FONTS } from '../utils/constants';
import LoginForm from '../components/auth/LoginForm';
import toast from 'react-hot-toast';

const C = {
  bg: '#090910',
  card: '#11112a',
  surface: '#16162e',
  border: '#2a2a4a',
  accent: '#7ED87A',
  text: '#ddddf0',
  muted: '#7777aa',
  faint: '#555570',
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

export default function Login() {
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const message = params.get('message');
    if (message) toast.error(decodeURIComponent(message));
    if (location.state?.message) toast.error(location.state.message);
  }, [location]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      background: C.bg,
      fontFamily: C.sans,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

        @keyframes gridDrift {
          0% { transform: translate(0, 0); }
          100% { transform: translate(40px, 40px); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }
        .login-card-enter {
          animation: fadeUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .login-grid-bg {
          animation: gridDrift 24s linear infinite;
          background-image:
            linear-gradient(0deg, transparent 24%, rgba(126,216,122,0.04) 25%, rgba(126,216,122,0.04) 26%, transparent 27%),
            linear-gradient(90deg, transparent 24%, rgba(126,216,122,0.04) 25%, rgba(126,216,122,0.04) 26%, transparent 27%);
          background-size: 40px 40px;
        }
        .glow-orb {
          animation: pulse-glow 4s ease-in-out infinite;
        }
      `}</style>

      {/* Animated grid background */}
      <div className="login-grid-bg" style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
      }} />

      {/* Radial glow */}
      <div className="glow-orb" style={{
        position: 'absolute',
        top: '30%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '600px', height: '600px',
        background: 'radial-gradient(circle, rgba(126,216,122,0.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Left branding panel */}
      <div style={{
        display: 'none',
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: '60px',
        borderRight: `1px solid ${C.border}`,
        position: 'relative',
      }} className="login-left-panel">
        <div>
          <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: '40px' }}>
            Market Intelligence Platform
          </div>
          <h2 style={{ fontFamily: C.mono, fontSize: '28px', color: C.text, lineHeight: 1.3, marginBottom: '24px', fontWeight: 600 }}>
            Know what the market<br />is doing before it does it.
          </h2>
          <p style={{ fontFamily: C.sans, fontSize: '15px', color: C.muted, lineHeight: 1.7 }}>
            Institutional-grade signals, regime detection,<br />and causal AI — in one platform.
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        position: 'relative',
        zIndex: 1,
      }}>
        <div className="login-card-enter" style={{ width: '100%', maxWidth: '380px' }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div style={{
                width: '32px', height: '32px',
                border: `1.5px solid ${C.accent}`,
                borderRadius: '6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 0 12px ${C.accent}30`,
              }}>
                <div style={{ width: '12px', height: '12px', background: C.accent, borderRadius: '3px' }} />
              </div>
              <span style={{ fontFamily: C.mono, fontSize: '18px', color: C.text, letterSpacing: '0.08em', fontWeight: 600 }}>
                VektorLabs
              </span>
            </div>
            <p style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
              Secure Access Portal
            </p>
          </div>

          {/* Card */}
          <div style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: '10px',
            padding: '36px',
            boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
          }}>
            <LoginForm />
          </div>

          {/* Footer links */}
          <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', justifyContent: 'center', gap: '24px' }}>
            {[
              { label: 'Create account', href: '/register' },
              { label: 'Documentation', href: '/docs' },
            ].map(link => (
              <a key={link.href} href={link.href} style={{
                fontFamily: C.mono, fontSize: '12px', color: C.faint,
                textDecoration: 'none', letterSpacing: '0.04em',
                transition: 'color 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.color = C.accent}
              onMouseLeave={e => e.currentTarget.style.color = C.faint}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}