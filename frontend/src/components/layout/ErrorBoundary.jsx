import React from 'react';
import { COLORS } from '../../utils/constants';

/**
 * Error Boundary for catching React component errors
 * - Development: logs full error and component stack
 * - Production: sends error to backend (fire-and-forget)
 * - Shows fallback UI when error occurs
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Error caught by ErrorBoundary:', error);
      console.error('Component Stack:', errorInfo.componentStack);
    } else {
      // Production: send error to backend (fire-and-forget)
      // Never await or block UI
      this.reportErrorToBackend(error, errorInfo);
    }
  }

  reportErrorToBackend = (error, errorInfo) => {
    // Fire-and-forget: don't await, don't block UI
    fetch(`${import.meta.env.VITE_API_URL || '/api'}/errors`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        component: errorInfo.componentStack,
        url: window.location.href,
        timestamp: new Date().toISOString()
      })
    }).catch(() => {
      // Silently catch fetch errors — never throw from error handler
    });
  };

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      const fallback = this.props.fallback || this.defaultFallback();

      return typeof fallback === 'function'
        ? fallback(this.state.error, this.resetError)
        : fallback;
    }

    return this.props.children;
  }

  defaultFallback() {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          backgroundColor: COLORS.bg,
          padding: '20px'
        }}
      >
        <div
          style={{
            backgroundColor: COLORS.card,
            border: `1px solid ${COLORS.border}`,
            borderRadius: '8px',
            padding: '40px',
            maxWidth: '500px',
            textAlign: 'center'
          }}
        >
          <h1
            style={{
              color: COLORS.red,
              marginBottom: '16px',
              fontSize: '24px',
              fontWeight: 'bold'
            }}
          >
            Something went wrong
          </h1>
          <p style={{ color: COLORS.text, marginBottom: '24px', lineHeight: '1.6' }}>
            An unexpected error occurred. Please try again or contact support if the problem persists.
          </p>

          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details
              style={{
                marginTop: '24px',
                padding: '16px',
                backgroundColor: COLORS.cardAlt,
                borderRadius: '4px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <summary
                style={{
                  color: COLORS.warn,
                  fontWeight: 'bold',
                  marginBottom: '8px'
                }}
              >
                Error details (dev only)
              </summary>
              <pre
                style={{
                  color: COLORS.text,
                  fontSize: '12px',
                  overflow: 'auto',
                  marginTop: '8px'
                }}
              >
                {this.state.error.toString()}
              </pre>
            </details>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '24px',
              padding: '10px 20px',
              backgroundColor: COLORS.accent,
              color: COLORS.bg,
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }
}
