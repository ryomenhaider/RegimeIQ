import { useQuery } from '@tanstack/react-query';
import { COLORS } from '../../utils/constants';
import { api } from '../../services/api';

/**
 * PerformanceLog Component
 * Displays walk-forward validated performance history
 * Public endpoint - no auth required
 * Cached with 5 minute staleTime via React Query
 */
export default function PerformanceLog() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['performance-log'],
    queryFn: async () => {
      const response = await api.get('/performance/log');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 1
  });

  if (error) {
    return (
      <div
        style={{
          padding: '32px',
          backgroundColor: COLORS.card,
          borderRadius: '8px',
          border: `1px solid ${COLORS.danger}`,
          textAlign: 'center',
          color: COLORS.danger
        }}
      >
        Error loading performance log: {error.message}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        style={{
          padding: '32px',
          backgroundColor: COLORS.card,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
          textAlign: 'center'
        }}
      >
        <div style={{ color: COLORS.text, opacity: 0.6 }}>Loading performance data...</div>
      </div>
    );
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div
        style={{
          padding: '32px',
          backgroundColor: COLORS.card,
          borderRadius: '8px',
          border: `1px solid ${COLORS.border}`,
          textAlign: 'center'
        }}
      >
        <div style={{ color: COLORS.text, opacity: 0.6 }}>No performance data available yet.</div>
      </div>
    );
  }

  // Take first 5 rows for landing page
  const rows = data.slice(0, 5);

  return (
    <div
      style={{
        overflowX: 'auto',
        backgroundColor: COLORS.card,
        borderRadius: '8px',
        border: `1px solid ${COLORS.border}`
      }}
    >
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontFamily: 'IBM Plex Mono',
          fontSize: '12px'
        }}
      >
        <thead>
          <tr
            style={{
              borderBottom: `1px solid ${COLORS.border}`,
              backgroundColor: `${COLORS.bg}cc`
            }}
          >
            <th
              style={{
                padding: '12px',
                textAlign: 'left',
                color: COLORS.text,
                opacity: 0.6,
                fontWeight: 'bold'
              }}
            >
              Date
            </th>
            <th
              style={{
                padding: '12px',
                textAlign: 'left',
                color: COLORS.text,
                opacity: 0.6,
                fontWeight: 'bold'
              }}
            >
              Symbol
            </th>
            <th
              style={{
                padding: '12px',
                textAlign: 'left',
                color: COLORS.text,
                opacity: 0.6,
                fontWeight: 'bold'
              }}
            >
              Regime Called
            </th>
            <th
              style={{
                padding: '12px',
                textAlign: 'left',
                color: COLORS.text,
                opacity: 0.6,
                fontWeight: 'bold'
              }}
            >
              Confidence
            </th>
            <th
              style={{
                padding: '12px',
                textAlign: 'left',
                color: COLORS.text,
                opacity: 0.6,
                fontWeight: 'bold'
              }}
            >
              Outcome
            </th>
            <th
              style={{
                padding: '12px',
                textAlign: 'right',
                color: COLORS.text,
                opacity: 0.6,
                fontWeight: 'bold'
              }}
            >
              Return
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => {
            const returnValue = row.return || 0;
            const isPositive = returnValue > 0;
            const returnColor = isPositive ? COLORS.accent : COLORS.danger;

            return (
              <tr
                key={idx}
                style={{
                  borderBottom: `1px solid ${COLORS.border}`,
                  backgroundColor: idx % 2 === 0 ? 'transparent' : `${COLORS.bg}33`
                }}
              >
                <td style={{ padding: '12px', color: COLORS.text }}>
                  {new Date(row.date).toLocaleDateString()}
                </td>
                <td style={{ padding: '12px', color: COLORS.accent, fontWeight: 'bold' }}>
                  {row.symbol}
                </td>
                <td style={{ padding: '12px', color: COLORS.cyan }}>
                  {row.regime_called?.toUpperCase().replace('_', ' ')}
                </td>
                <td style={{ padding: '12px', color: COLORS.text }}>
                  {Math.round((row.confidence || 0) * 100)}%
                </td>
                <td style={{ padding: '12px', color: COLORS.text }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor:
                        row.outcome === 'correct'
                          ? `${COLORS.accent}20`
                          : `${COLORS.danger}20`,
                      color: row.outcome === 'correct' ? COLORS.accent : COLORS.danger
                    }}
                  >
                    {row.outcome?.toUpperCase()}
                  </span>
                </td>
                <td
                  style={{
                    padding: '12px',
                    textAlign: 'right',
                    color: returnColor,
                    fontWeight: 'bold'
                  }}
                >
                  {isPositive ? '+' : ''}
                  {returnValue.toFixed(2)}%
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {data.length > 5 && (
        <div
          style={{
            padding: '16px',
            textAlign: 'center',
            fontSize: '12px',
            color: COLORS.text,
            opacity: 0.6,
            borderTop: `1px solid ${COLORS.border}`
          }}
        >
          Showing 5 of {data.length} entries. <a href="/performance">View full log →</a>
        </div>
      )}
    </div>
  );
}
