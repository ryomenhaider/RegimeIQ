import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, getCsrfToken } from '../../services/auth';
import { COLORS, FONTS } from '../../utils/constants';
import { validateEmail } from '../../utils/validators';
import Spinner from '../ui/Spinner';

// Username availability check component
function Checkmark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function X() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

/**
 * Password strength checker
 * Red: < 8 chars or missing requirements
 * Yellow: meets minimum (8+ chars, uppercase, number)
 * Green: strong (8+ chars, uppercase, number, special)
 */
function getPasswordStrength(password) {
  if (!password) return { level: 'none', color: COLORS.border, label: '' };

  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecial = /[@$!%*?&]/.test(password);

  if (!hasMinLength || !hasUppercase || !hasNumber) {
    return { level: 'red', color: COLORS.red, label: 'Weak' };
  }

  if (hasSpecial) {
    return { level: 'green', color: COLORS.accent, label: 'Strong' };
  }

  return { level: 'yellow', color: COLORS.yellow, label: 'Medium' };
}

/**
 * Username validation: 3-20 chars, alphanumeric + underscore
 */
function isValidUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export default function RegisterForm() {
  const navigate = useNavigate();
  const errorRef = useRef(null);
  const usernameInputRef = useRef(null);

  // Form state
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Field-level error state
  const [errors, setErrors] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Username availability state
  const [usernameStatus, setUsernameStatus] = useState('idle'); // idle | checking | available | taken
  const usernameCheckTimeoutRef = useRef(null);

  // Confirm password validation
  const [showConfirmError, setShowConfirmError] = useState(false);

  // Initialize CSRF token
  useEffect(() => {
    getCsrfToken().catch((err) => {
      console.error('Failed to get CSRF token:', err);
    });

    // Focus first input on mount
    if (usernameInputRef.current) {
      usernameInputRef.current.focus();
    }
  }, []);

  // Debounced username availability check
  useEffect(() => {
    if (usernameCheckTimeoutRef.current) {
      clearTimeout(usernameCheckTimeoutRef.current);
    }

    if (!username.trim()) {
      setUsernameStatus('idle');
      return;
    }

    if (!isValidUsername(username)) {
      setUsernameStatus('idle');
      return;
    }

    setUsernameStatus('checking');

    usernameCheckTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/auth/check-username?username=${encodeURIComponent(username)}`);
        const data = await response.json();

        if (data.available) {
          setUsernameStatus('available');
          setErrors((prev) => ({ ...prev, username: '' }));
        } else {
          setUsernameStatus('taken');
          setErrors((prev) => ({ ...prev, username: 'Username already taken.' }));
        }
      } catch (err) {
        console.error('Username check error:', err);
        setUsernameStatus('idle');
      }
    }, 500);

    return () => {
      if (usernameCheckTimeoutRef.current) {
        clearTimeout(usernameCheckTimeoutRef.current);
      }
    };
  }, [username]);

  // Real-time confirm password validation
  useEffect(() => {
    if (confirmPassword && confirmPassword !== password) {
      setShowConfirmError(true);
    } else {
      setShowConfirmError(false);
    }
  }, [confirmPassword, password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    // Validate all fields
    const newErrors = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    } else if (!isValidUsername(username)) {
      newErrors.username = 'Username must be 3-20 chars, alphanumeric + underscore only';
    } else if (usernameStatus === 'taken') {
      newErrors.username = 'Username already taken.';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else {
      const strength = getPasswordStrength(password);
      if (strength.level === 'red') {
        newErrors.password = 'Password must be at least 8 characters with uppercase and number';
      }
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      if (errorRef.current) errorRef.current.focus();
      return;
    }

    setIsLoading(true);

    try {
      const { username: registeredUsername } = await register(email, username, password);

      // Auto-login and redirect
      navigate(`/dashboard/${registeredUsername}`);
    } catch (err) {
      // Handle 422 field-level errors
      if (err.response?.status === 422) {
        const fieldErrors = err.response.data?.errors || {};
        setErrors(fieldErrors);
      } else {
        // Generic error
        setErrors({
          general: err.response?.data?.message || err.message || 'Registration failed'
        });
      }

      if (errorRef.current) errorRef.current.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);
  const isPasswordValid = passwordStrength.level !== 'red' && password.length > 0;
  const isPasswordsMatch = password && confirmPassword && password === confirmPassword;
  const isUsernameValid = usernameStatus === 'available';
  const isFormValid =
    isUsernameValid &&
    email.trim() &&
    validateEmail(email) &&
    isPasswordValid &&
    isPasswordsMatch &&
    !isLoading;

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}
    >
      {/* General error message */}
      {errors.general && (
        <div
          ref={errorRef}
          tabIndex="-1"
          role="alert"
          aria-live="polite"
          aria-atomic="true"
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
          {errors.general}
        </div>
      )}

      {/* Username Field */}
      <div>
        <label
          htmlFor="register-username"
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: COLORS.text,
            marginBottom: '8px',
            fontFamily: FONTS.sans
          }}
        >
          Username
        </label>
        <div style={{ position: 'relative' }}>
          <input
            id="register-username"
            ref={usernameInputRef}
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setErrors((prev) => ({ ...prev, username: '' }));
            }}
            disabled={isLoading}
            aria-describedby={errors.username ? 'username-error' : 'username-status'}
            maxLength={20}
            style={{
              width: '100%',
              padding: '10px 12px',
              paddingRight: usernameStatus !== 'idle' ? '36px' : '12px',
              backgroundColor: COLORS.cardAlt,
              border: errors.username ? `1px solid ${COLORS.red}` : `1px solid ${COLORS.border}`,
              borderRadius: '6px',
              color: COLORS.text,
              fontSize: '14px',
              fontFamily: FONTS.sans,
              outline: 'none',
              transition: 'border 100ms',
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'text',
              boxSizing: 'border-box'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = errors.username ? COLORS.red : COLORS.accent;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = errors.username ? COLORS.red : COLORS.border;
            }}
            placeholder="your_username"
          />

          {/* Availability Status Icon */}
          {usernameStatus === 'checking' && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)'
              }}
            >
              <Spinner size="sm" color={COLORS.text} />
            </div>
          )}

          {usernameStatus === 'available' && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: COLORS.accent
              }}
            >
              <CheckmarkIcon />
            </div>
          )}

          {usernameStatus === 'taken' && (
            <div
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: COLORS.red
              }}
            >
              <XIcon />
            </div>
          )}
        </div>

        {errors.username && (
          <div
            id="username-error"
            role="alert"
            aria-live="polite"
            style={{
              color: COLORS.red,
              fontSize: '12px',
              fontFamily: FONTS.sans,
              marginTop: '6px'
            }}
          >
            {errors.username}
          </div>
        )}

        {usernameStatus === 'idle' && username && !isValidUsername(username) && (
          <div
            id="username-status"
            style={{
              color: COLORS.yellow,
              fontSize: '12px',
              fontFamily: FONTS.sans,
              marginTop: '6px'
            }}
          >
            3-20 chars, alphanumeric + underscore
          </div>
        )}

        {usernameStatus === 'available' && (
          <div
            id="username-status"
            style={{
              color: COLORS.accent,
              fontSize: '12px',
              fontFamily: FONTS.sans,
              marginTop: '6px'
            }}
          >
            Username available
          </div>
        )}
      </div>

      {/* Email Field */}
      <div>
        <label
          htmlFor="register-email"
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
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setErrors((prev) => ({ ...prev, email: '' }));
          }}
          disabled={isLoading}
          aria-describedby={errors.email ? 'email-error' : undefined}
          maxLength={255}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: COLORS.cardAlt,
            border: errors.email ? `1px solid ${COLORS.red}` : `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            color: COLORS.text,
            fontSize: '14px',
            fontFamily: FONTS.sans,
            outline: 'none',
            transition: 'border 100ms',
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'text',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = errors.email ? COLORS.red : COLORS.accent;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = errors.email ? COLORS.red : COLORS.border;
          }}
          placeholder="you@example.com"
        />

        {errors.email && (
          <div
            id="email-error"
            role="alert"
            aria-live="polite"
            style={{
              color: COLORS.red,
              fontSize: '12px',
              fontFamily: FONTS.sans,
              marginTop: '6px'
            }}
          >
            {errors.email}
          </div>
        )}
      </div>

      {/* Password Field */}
      <div>
        <label
          htmlFor="register-password"
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
        <input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setErrors((prev) => ({ ...prev, password: '' }));
          }}
          disabled={isLoading}
          aria-describedby={errors.password ? 'password-error' : 'password-bar'}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: COLORS.cardAlt,
            border: errors.password ? `1px solid ${COLORS.red}` : `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            color: COLORS.text,
            fontSize: '14px',
            fontFamily: FONTS.sans,
            outline: 'none',
            transition: 'border 100ms',
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'text',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = errors.password ? COLORS.red : COLORS.accent;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = errors.password ? COLORS.red : COLORS.border;
          }}
          placeholder="••••••••"
        />

        {/* Password Strength Bar */}
        {password && (
          <div
            id="password-bar"
            style={{
              height: '4px',
              backgroundColor: COLORS.border,
              borderRadius: '2px',
              marginTop: '8px',
              overflow: 'hidden'
            }}
          >
            <div
              style={{
                height: '100%',
                backgroundColor: passwordStrength.color,
                width: passwordStrength.level === 'red' ? '33%' : passwordStrength.level === 'yellow' ? '66%' : '100%',
                transition: 'width 200ms ease-out, background-color 200ms ease-out'
              }}
            />
          </div>
        )}

        {errors.password && (
          <div
            id="password-error"
            role="alert"
            aria-live="polite"
            style={{
              color: COLORS.red,
              fontSize: '12px',
              fontFamily: FONTS.sans,
              marginTop: '6px'
            }}
          >
            {errors.password}
          </div>
        )}
      </div>

      {/* Confirm Password Field */}
      <div>
        <label
          htmlFor="register-confirm"
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: COLORS.text,
            marginBottom: '8px',
            fontFamily: FONTS.sans
          }}
        >
          Confirm Password
        </label>
        <input
          id="register-confirm"
          type="password"
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isLoading}
          aria-describedby={showConfirmError ? 'confirm-error' : undefined}
          style={{
            width: '100%',
            padding: '10px 12px',
            backgroundColor: COLORS.cardAlt,
            border:
              errors.confirmPassword || showConfirmError
                ? `1px solid ${COLORS.red}`
                : `1px solid ${COLORS.border}`,
            borderRadius: '6px',
            color: COLORS.text,
            fontSize: '14px',
            fontFamily: FONTS.sans,
            outline: 'none',
            transition: 'border 100ms',
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'text',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => {
            e.target.style.borderColor =
              errors.confirmPassword || showConfirmError ? COLORS.red : COLORS.accent;
          }}
          onBlur={(e) => {
            e.target.style.borderColor =
              errors.confirmPassword || showConfirmError ? COLORS.red : COLORS.border;
          }}
          placeholder="••••••••"
        />

        {(errors.confirmPassword || showConfirmError) && (
          <div
            id="confirm-error"
            role="alert"
            aria-live="polite"
            style={{
              color: COLORS.red,
              fontSize: '12px',
              fontFamily: FONTS.sans,
              marginTop: '6px'
            }}
          >
            {errors.confirmPassword || 'Passwords do not match'}
          </div>
        )}
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={!isFormValid}
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
          cursor: !isFormValid ? 'not-allowed' : 'pointer',
          opacity: !isFormValid ? 0.6 : 1,
          transition: 'opacity 100ms',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxSizing: 'border-box'
        }}
        onMouseEnter={(e) => {
          if (isFormValid) e.currentTarget.style.opacity = '0.9';
        }}
        onMouseLeave={(e) => {
          if (isFormValid) e.currentTarget.style.opacity = '1';
        }}
      >
        {isLoading ? (
          <>
            <Spinner size="sm" color={COLORS.bg} />
            <span>Creating account...</span>
          </>
        ) : (
          'Create Account'
        )}
      </button>

      {/* Sign In Link */}
      <div
        style={{
          textAlign: 'center',
          fontSize: '13px',
          fontFamily: FONTS.sans,
          color: COLORS.text,
          opacity: 0.7
        }}
      >
        Already have an account?{' '}
        <a
          href="/login"
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
          Sign in
        </a>
      </div>
    </form>
  );
}

// Checkmark SVG component
function CheckmarkIcon() {
  return <CheckMark />;
}

function CheckMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

// X SVG component
function XIcon() {
  return <XMark />;
}

function XMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}
