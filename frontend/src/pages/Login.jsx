import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { COLORS, FONTS } from '../utils/constants';
import LoginForm from '../components/auth/LoginForm';
import toast from 'react-hot-toast';

export default function Login() {
  const location = useLocation();

  useEffect(() => {
    // Check for session expiration message in URL params
    const params = new URLSearchParams(location.search);
    const message = params.get('message');

    if (message) {
      toast.error(decodeURIComponent(message));
    }

    // Check for state-based message (from redirect)
    if (location.state?.message) {
      toast.error(location.state.message);
    }
  }, [location]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.bg,
        padding: '20px'
      }}
    >
      <div style={{ maxWidth: '400px', width: '100%' }}>
        {/* Logo */}
        <h1
          style={{
            textAlign: 'center',
            fontFamily: FONTS.mono,
            fontSize: '24px',
            fontWeight: 'bold',
            color: COLORS.accent,
            marginBottom: '40px',
            margin: 0
          }}
        >
          VektorLabs
        </h1>

        {/* Card */}
        <div
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '40px'
          }}
        >
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
