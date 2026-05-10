import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login, getCsrfToken, forgotPassword } from '../../services/auth';
import { COLORS, FONTS } from '../../utils/constants';
import { validateEmail } from '../../utils/validators';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';

// Eye icon components
function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

export default function LoginForm() {
  const navigate = useNavigate();
  const emailInputRef = useRef(null);
  const errorRef = useRef(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  // Rate limit countdown state
  const [rateLimitCountdown, setRateLimitCountdown] = useState(0);

  // Initialize CSRF token and focus
  useEffect(() => {
    getCsrfToken().catch((err) => {
      console.error('Failed to get CSRF token:', err);
    });

    // Focus first input on mount
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  // Countdown timer for rate limit
  useEffect(() => {
    if (rateLimitCountdown <= 0) return;

    const timer = setInterval(() => {
      setRateLimitCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [rateLimitCountdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!email.trim()) {
      setError('Email is required');
      if (errorRef.current) errorRef.current.focus();
      return;
    }

    if (!validateEmail(email)) {
      setError('Please enter a valid email address');
      if (errorRef.current) errorRef.current.focus();
      return;
    }

if (!password) {
      setError('Password is required');
      if (errorRef.current) errorRef.current.focus();
      return;
    }

    setIsLoading(true);

    try {
      const { username } = await login(email, password);

      // Check for intended route
      const intendedRoute = sessionStorage.getItem('intended_route');
      sessionStorage.removeItem('intended_route');

      const redirectPath = intendedRoute || `/dashboard/${username}`;
      navigate(redirectPath);
    } catch (err) {
      let message = 'Login failed';

      // Handle specific error status codes
      if (err.response?.status === 401) {
        message = 'Incorrect email or password.';
      } else if (err.response?.status === 429) {
        // Rate limit - extract Retry-After
        const retryAfter = err.response.headers['retry-after'];
        const retrySeconds = Math.ceil(parseInt(retryAfter || '60', 10));
        setRateLimitCountdown(retrySeconds);
        message = `Too many attempts. Try again in ${retrySeconds}s.`;
      } else if (err.response?.status === 500) {
        message = 'Something went wrong. Try again.';
      } else {
        message = err.message || 'Login failed';
      }

      setError(message);
      if (errorRef.current) errorRef.current.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();

    if (!validateEmail(forgotEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSendingReset(true);

    try {
      await forgotPassword(forgotEmail);

      setResetSent(true);
      setForgotEmail('');

      setTimeout(() => {
        setShowForgotModal(false);
        setResetSent(false);
      }, 2000);
    } catch (err) {
      console.error('Forgot password error:', err);
      setResetSent(true);
      setTimeout(() => {
        setShowForgotModal(false);
        setResetSent(false);
      }, 2000);
    } finally {
      setIsSendingReset(false);
    }
  };

  const isFormDisabled = isLoading || rateLimitCountdown > 0;
  const isButtonDisabled = !email.trim() || !password || isFormDisabled;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* Error message */}
      {error && (
        <div
          ref={errorRef}
          tabIndex="-1"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
          id="login-error"
          style={{
            padding: '12px',
            backgroundColor: `${COLORS.red}20`,
            border: `1px solid ${COLORS.red}`,
            borderRadius: '6px',
            color: COLORS.red,
            fontSize: '13px',
            fontFamily: FONTS.sans,
            outline: 'none'
          }}
        >
          {error}
        </div>
      )}

      {/* Email Field */}
      <div>
        <label
          htmlFor="login-email"
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: COLORS.text,
            marginBottom: '8px',
            fontFamily: FONTS.sans
          }}
        >
          Email
        </label>
        <input
          id="login-email"
          ref={emailInputRef}
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
          }}
          disabled={isFormDisabled}
          aria-describedby={error ? 'login-error' : undefined}
          aria-required="true"
          aria-invalid={!!error}
          maxLength={255}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: COLORS.cardAlt,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            color: COLORS.text,
            fontSize: '14px',
            fontFamily: FONTS.sans,
            outline: 'none',
            transition: 'border 100ms',
            opacity: isFormDisabled ? 0.6 : 1,
            cursor: isFormDisabled ? 'not-allowed' : 'text',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = COLORS.accent;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = COLORS.border;
          }}
          placeholder="you@example.com"
        />
      </div>

      {/* Password Field */}
      <div>
        <label
          htmlFor="login-password"
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: COLORS.text,
            marginBottom: '8px',
            fontFamily: FONTS.sans
          }}
        >
          Password
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="login-password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            disabled={isFormDisabled}
            aria-describedby={error ? 'login-error' : undefined}
            aria-required="true"
            aria-invalid={!!error}
            style={{
              width: '100%',
              padding: '10px 12px 10px 12px',
              paddingRight: '40px',
              backgroundColor: COLORS.cardAlt,
              border: `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              color: COLORS.text,
              fontSize: '14px',
              fontFamily: FONTS.sans,
              outline: 'none',
              transition: 'border 100ms',
              opacity: isFormDisabled ? 0.6 : 1,
              cursor: isFormDisabled ? 'not-allowed' : 'text',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = COLORS.accent;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = COLORS.border;
            }}
            placeholder="••••••••"
          />

          {/* Show/Hide Toggle Button */}
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={isFormDisabled}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-controls="login-password"
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              color: COLORS.text,
              cursor: isFormDisabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4px',
              opacity: isFormDisabled ? 0.4 : 0.7,
              transition: 'opacity 100ms'
            }}
            onMouseEnter={(e) => {
              if (!isFormDisabled) e.currentTarget.style.opacity = '1';
            }}
            onMouseLeave={(e) => {
              if (!isFormDisabled) e.currentTarget.style.opacity = '0.7';
            }}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isButtonDisabled}
        style={{
          width: '100%',
          padding: '10px',
          backgroundColor: COLORS.accent,
          color: COLORS.bg,
          border: 'none',
          borderRadius: '6px',
          fontWeight: '600',
          fontSize: '14px',
          fontFamily: FONTS.sans,
          cursor: isButtonDisabled ? 'not-allowed' : 'pointer',
          opacity: isButtonDisabled ? 0.6 : 1,
          transition: 'opacity 100ms',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => {
          if (!isButtonDisabled) e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          if (!isButtonDisabled) e.currentTarget.style.opacity = '1';
        }}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" color={COLORS.bg} />
            <span>Signing in...</span>
          </>
        ) : (
          'Sign In'
        )}
      </button>

      {/* Forgot Password & Register Links */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '13px',
          fontFamily: FONTS.sans,
          gap: '12px'
        }}
      >
        <button
          type="button"
          onClick={() => setShowForgotModal(true)}
          disabled={isFormDisabled}
          style={{
            background: 'none',
            border: 'none',
            color: COLORS.cyan,
            cursor: isFormDisabled ? 'not-allowed' : 'pointer',
            padding: 0,
            fontSize: '13px',
            fontFamily: FONTS.sans,
            opacity: isFormDisabled ? 0.5 : 0.8,
            transition: 'opacity 100ms'
          }}
          onMouseEnter={(e) => {
            if (!isFormDisabled) e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            if (!isFormDisabled) e.currentTarget.style.opacity = '0.8';
          }}
        >
          Forgot password?
        </button>

        <span style={{ color: COLORS.text, opacity: 0.7 }}>
          Don't have an account?{' '}
          <a
            href="/register"
            style={{
              color: COLORS.cyan,
              textDecoration: 'none',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            Register
          </a>
        </span>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <Modal
          isOpen={showForgotModal}
          onClose={() => {
            setShowForgotModal(false);
            setForgotEmail('');
            setResetSent(false);
          }}
          title="Forgot Password"
        >
          {resetSent ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>
              <p
                style={{
                  color: COLORS.text,
                  margin: 0,
                  fontSize: '14px',
                  lineHeight: 1.6
                }}
              >
                If that email exists, you'll receive a reset link.
              </p>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label
                  htmlFor="forgot-email"
                  style={{
                    display: 'block',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: COLORS.text,
                    marginBottom: '8px',
                    fontFamily: FONTS.sans
                  }}
                >
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={isSendingReset}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    backgroundColor: COLORS.cardAlt,
                    border: `1px solid ${COLORS.border}`,
                    borderRadius: '6px',
                    color: COLORS.text,
                    fontSize: '14px',
                    fontFamily: FONTS.sans,
                    outline: 'none',
                    boxSizing: 'border-box',
                    opacity: isSendingReset ? 0.6 : 1,
                    cursor: isSendingReset ? 'not-allowed' : 'text'
                  }}
                  placeholder="you@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={!forgotEmail.trim() || isSendingReset}
                style={{
                  padding: '10px',
                  backgroundColor: COLORS.accent,
                  color: COLORS.bg,
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '600',
                  fontSize: '14px',
                  fontFamily: FONTS.sans,
                  cursor: !forgotEmail.trim() || isSendingReset ? 'not-allowed' : 'pointer',
                  opacity: !forgotEmail.trim() || isSendingReset ? 0.6 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxSizing: 'border-box'
                }}
              >
                {isSendingReset ? (
                  <>
                    <Spinner size="sm" color={COLORS.bg} />
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>
          )}
        </Modal>
      )}
    </form>
  );
}
