import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

/**
 * Page-level error component
 * Shows when a full page fails to render
 */
export default function PageError() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        backgroundColor: COLORS.bg,
        padding: '20px'
      }}
    >
      <div
        className="text-center max-w-md"
        style={{
          backgroundColor: COLORS.card,
          border: `1px solid ${COLORS.border}`,
          borderRadius: '8px',
          padding: '40px'
        }}
      >
        <h1
          className="text-2xl font-bold mb-4"
          style={{ color: COLORS.red }}
        >
          Something went wrong
        </h1>
        <p
          className="mb-6 text-sm leading-relaxed"
          style={{ color: COLORS.text }}
        >
          We encountered an unexpected error. Our team has been notified and is working to resolve it.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="px-6 py-2 rounded font-medium"
          style={{
            backgroundColor: COLORS.accent,
            color: COLORS.bg,
            cursor: 'pointer'
          }}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
