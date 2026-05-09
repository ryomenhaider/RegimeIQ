// Privacy.jsx
import React from 'react';
import { COLORS } from '../utils/constants';

const C = {
  bg: '#090910',
  card: '#11112a',
  border: '#2a2a4a',
  accent: '#7ED87A',
  text: '#ddddf0',
  muted: '#7777aa',
  faint: '#555570',
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

const LegalPage = ({ title, lastUpdated, children }) => (
  <div style={{ minHeight: '100vh', background: C.bg, fontFamily: C.sans }}>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
      .legal-content h2 {
        font-family: ${C.mono};
        font-size: 14px;
        color: ${C.text};
        font-weight: 500;
        margin: 36px 0 12px;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }
      .legal-content p {
        font-size: 14px;
        color: #aaaac0;
        line-height: 1.75;
        margin: 0 0 14px;
      }
      .legal-content ul {
        padding-left: 20px;
        margin: 0 0 14px;
      }
      .legal-content li {
        font-size: 14px;
        color: #aaaac0;
        line-height: 1.7;
        margin-bottom: 6px;
      }
    `}</style>

    {/* Nav */}
    <nav style={{
      height: '52px',
      background: `${C.bg}ee`,
      borderBottom: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'center',
      padding: '0 32px', gap: '12px',
      position: 'sticky', top: 0, zIndex: 10,
    }}>
      <a href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
        <div style={{
          width: '24px', height: '24px',
          border: `1.5px solid ${C.accent}`,
          borderRadius: '4px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ width: '8px', height: '8px', background: C.accent, borderRadius: '1px' }} />
        </div>
        <span style={{ fontFamily: C.mono, fontSize: '14px', color: C.text, letterSpacing: '0.06em', fontWeight: 600 }}>
          VektorLabs
        </span>
      </a>
      <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint }}>/ {title}</span>
    </nav>

    {/* Content */}
    <main style={{ maxWidth: '720px', margin: '0 auto', padding: '64px 24px 80px' }}>
      <div style={{ marginBottom: '48px' }}>
        <div style={{
          fontFamily: C.mono, fontSize: '10px', color: C.faint,
          letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '16px',
        }}>
          Legal
        </div>
        <h1 style={{
          fontFamily: C.mono, fontSize: '28px', color: C.text,
          fontWeight: 600, letterSpacing: '0.02em', marginBottom: '8px',
        }}>
          {title}
        </h1>
        <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.04em' }}>
          Last updated: {lastUpdated}
        </div>
      </div>

      <div style={{ height: '1px', background: C.border, marginBottom: '40px' }} />

      <div className="legal-content">
        {children}
      </div>

      <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: `1px solid ${C.border}` }}>
        <a href="/" style={{
          fontFamily: C.mono, fontSize: '12px', color: C.faint,
          textDecoration: 'none', letterSpacing: '0.04em',
          transition: 'color 120ms',
        }}
          onMouseEnter={e => e.currentTarget.style.color = C.accent}
          onMouseLeave={e => e.currentTarget.style.color = C.faint}
        >
          ← Back to home
        </a>
      </div>
    </main>
  </div>
);

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" lastUpdated="May 6, 2026">
      <p>
        We take your privacy seriously. VektorLabs operates on a principle of minimal data collection.
        We only collect what is necessary to provide the service.
      </p>
      <h2>Data We Collect</h2>
      <p>
        We collect your email address and username at registration. We collect usage data such as
        which symbols you track and your alert configurations to power the service.
      </p>
      <h2>How We Use Your Data</h2>
      <ul>
        <li>To provide and improve the VektorLabs service</li>
        <li>To send alerts and notifications you have configured</li>
        <li>To process payments via our payment processor</li>
      </ul>
      <h2>Data Sharing</h2>
      <p>
        We do not sell your data. We do not share your data with third parties except as
        necessary to operate the service (e.g., payment processing).
      </p>
      <h2>Contact</h2>
      <p>
        For privacy inquiries, contact us via Discord or the email on our website.
      </p>
    </LegalPage>
  );
}