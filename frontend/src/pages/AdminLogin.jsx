import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

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
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/auth/admin-login', { username, password });
      if (response.status === 200) {
        const { access_token, username: adminUsername, expires_in } = response.data.data;
        setAuth(access_token, adminUsername, 'admin', expires_in);
        localStorage.setItem('admin_token', access_token);
        toast.success('Admin login successful');
        navigate('/admin/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.error?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: C.bg,
      fontFamily: C.sans,
      position: 'relative',
      overflow: 'hidden',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .adm-enter { animation: fadeUp 0.45s cubic-bezier(0.16,1,0.3,1) forwards; }
        .adm-input {
          width: 100%;
          box-sizing: border-box;
          padding: 10px 14px;
          background: #0d0d20;
          border: 1px solid ${C.border};
          border-radius: 6px;
          color: ${C.text};
          font-size: 13px;
          font-family: ${C.mono};
          outline: none;
          transition: border-color 150ms, box-shadow 150ms;
          letter-spacing: 0.02em;
        }
        .adm-input:focus {
          border-color: ${C.accent};
          box-shadow: 0 0 0 3px ${C.accent}18;
        }
        .adm-btn {
          width: 100%;
          padding: 11px;
          background: ${C.accent};
          border: none;
          border-radius: 6px;
          color: #060610;
          font-size: 13px;
          font-weight: 600;
          font-family: ${C.mono};
          cursor: pointer;
          letter-spacing: 0.06em;
          transition: opacity 150ms, box-shadow 150ms;
          text-transform: uppercase;
        }
        .adm-btn:hover:not(:disabled) {
          opacity: 0.9;
          box-shadow: 0 0 20px ${C.accent}40;
        }
        .adm-btn:disabled { opacity: 0.4; cursor: not-allowed; }
      `}</style>

      {/* Subtle radial glow */}
      <div style={{
        position: 'absolute', top: '40%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '500px', height: '500px',
        background: 'radial-gradient(circle, rgba(126,216,122,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div className="adm-enter" style={{ width: '100%', maxWidth: '340px', padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div style={{
              width: '30px', height: '30px',
              border: `1.5px solid ${C.red}`,
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <div style={{ width: '10px', height: '10px', background: C.red, borderRadius: '2px' }} />
            </div>
            <span style={{ fontFamily: C.mono, fontSize: '14px', color: C.text, letterSpacing: '0.1em', fontWeight: 600 }}>
              ADMIN
            </span>
          </div>
          <div style={{ fontFamily: C.mono, fontSize: '10px', color: C.faint, letterSpacing: '0.14em', textTransform: 'uppercase' }}>
            VektorLabs Control Panel
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: C.card,
          border: `1px solid ${C.border}`,
          borderTop: `1px solid ${C.red}40`,
          borderRadius: '10px',
          padding: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        }}>
          {/* Restricted badge */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '8px 12px',
            background: `${C.red}10`,
            border: `1px solid ${C.red}25`,
            borderRadius: '5px',
            marginBottom: '28px',
          }}>
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.red }} />
            <span style={{ fontFamily: C.mono, fontSize: '10px', color: C.red, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Restricted Access
            </span>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block', fontSize: '10px', color: C.muted,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: '6px', fontFamily: C.mono,
              }}>
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="adm-input"
                required
                autoComplete="username"
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontSize: '10px', color: C.muted,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                marginBottom: '6px', fontFamily: C.mono,
              }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="adm-input"
                required
                autoComplete="current-password"
              />
            </div>

            <button type="submit" disabled={loading} className="adm-btn" style={{ marginTop: '8px' }}>
              {loading ? 'Authenticating...' : 'Authenticate →'}
            </button>
          </form>
        </div>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <a href="/login" style={{
            fontSize: '12px', color: C.faint, fontFamily: C.mono,
            textDecoration: 'none', letterSpacing: '0.04em',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.muted}
          onMouseLeave={e => e.currentTarget.style.color = C.faint}
          >
            ← Back to user login
          </a>
        </div>
      </div>
    </div>
  );
}