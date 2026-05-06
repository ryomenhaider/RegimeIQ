import clsx from 'clsx';
import { COLORS } from '../../utils/constants';

/**
 * Widget-level error component
 * Shows when a widget fails to render
 */
export default function WidgetError({ name = 'Widget', onRetry }) {
  return (
    <div
      className="p-4 rounded-lg flex flex-col items-center justify-center min-h-40"
      style={{
        backgroundColor: COLORS.card,
        border: `1px solid ${COLORS.border}`,
        borderRadius: '6px'
      }}
    >
      <p
        className="text-sm font-medium mb-3 text-center"
        style={{ color: COLORS.text }}
      >
        {name} unavailable
      </p>
      <p
        className="text-xs mb-4"
        style={{ color: COLORS.text, opacity: 0.7 }}
      >
        Failed to load widget
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1.5 rounded text-xs font-medium"
          style={{
            backgroundColor: COLORS.accent,
            color: COLORS.bg,
            cursor: 'pointer'
          }}
        >
          Retry
        </button>
      )}
    </div>
  );
}
