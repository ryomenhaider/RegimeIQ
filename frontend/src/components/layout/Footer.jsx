import React from 'react';
import { COLORS } from '../../utils/constants';

export default function Footer() {
  return (
    <footer style={{
      padding: '24px',
      background: COLORS.card,
      borderTop: `1px solid ${COLORS.border}`,
      color: COLORS.text,
      fontFamily: 'IBM Plex Sans, sans-serif',
      fontSize: '13px',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    }}>
      <div>
        © 2026 VektorLabs. All rights reserved.
      </div>
      <div style={{ display: 'flex', gap: '24px' }}>
        <a href="/privacy" style={{ color: COLORS.text, textDecoration: 'none' }}>Privacy</a>
        <a href="/terms" style={{ color: COLORS.text, textDecoration: 'none' }}>Terms</a>
        <a href="https://x.com/vektor_labs" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.text, textDecoration: 'none' }}>X (Twitter)</a>
        <a href="https://discord.gg/8XPUG8hYed" target="_blank" rel="noopener noreferrer" style={{ color: COLORS.text, textDecoration: 'none' }}>Discord</a>
      </div>
    </footer>
  );
}
