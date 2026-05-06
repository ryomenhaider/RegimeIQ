import { useEffect, useState } from 'react';
import { COLORS, REGIME_COLORS } from '../../utils/constants';
import Badge from '../ui/Badge';

/**
 * LivePreview Component
 * Displays real-time regime state for BTCUSDT
 * Public endpoint - no auth required
 * Updates every 30 seconds
 */
export default function LivePreview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchRegimeData = async () => {
    try {
      const response = await fetch('/api/regime/BTCUSDT/current');
      if (!response.ok) throw new Error('Failed to fetch regime data');
      const json = await response.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('LivePreview fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchRegimeData();

    // Poll every 30 seconds
    const interval = setInterval(fetchRegimeData, 30000);
    return () => clearInterval(interval);
  }, []);

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
        Error loading live preview: {error}
      </div>
    );
  }

  if (loading || !data) {
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
        <div style={{ color: COLORS.text, opacity: 0.6 }}>Loading regime data...</div>
      </div>
    );
  }

  const regimeColor = REGIME_COLORS[data.regime] || COLORS.text;
  const confidencePercent = Math.round((data.confidence || 0) * 100);

  return (
    <div
      style={{
        padding: '32px',
        backgroundColor: COLORS.card,
        borderRadius: '8px',
        border: `1px solid ${COLORS.border}`
      }}
    >
      {/* Header with regime badge */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <h3
            style={{
              fontSize: '18px',
              fontFamily: 'IBM Plex Mono',
              color: COLORS.text,
              margin: 0
            }}
          >
            BTCUSDT
          </h3>
          <Badge variant={data.regime}>
            {data.regime.toUpperCase().replace('_', ' ')}
          </Badge>
        </div>
        <p
          style={{
            fontSize: '12px',
            color: COLORS.text,
            opacity: 0.6,
            margin: 0
          }}
        >
          Last updated: {new Date(data.timestamp).toLocaleTimeString()}
        </p>
      </div>

      {/* Confidence bar */}
      <div style={{ marginBottom: '24px' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: COLORS.text,
            opacity: 0.7,
            marginBottom: '8px'
          }}
        >
          <span>Confidence</span>
          <span>{confidencePercent}%</span>
        </div>
        <div
          style={{
            height: '6px',
            backgroundColor: COLORS.border,
            borderRadius: '3px',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              height: '100%',
              backgroundColor: regimeColor,
              width: `${confidencePercent}%`,
              transition: 'width 300ms ease-out'
            }}
          />
        </div>
      </div>

      {/* Transition probabilities */}
      <div>
        <h4
          style={{
            fontSize: '12px',
            fontFamily: 'IBM Plex Mono',
            color: COLORS.text,
            opacity: 0.7,
            margin: '0 0 12px 0',
            textTransform: 'uppercase'
          }}
        >
          Next state probabilities
        </h4>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '8px'
          }}
        >
          {data.transition_probs &&
            Object.entries(data.transition_probs).map(([state, prob]) => (
              <div
                key={state}
                style={{
                  padding: '8px',
                  backgroundColor: COLORS.bg,
                  borderRadius: '4px',
                  border: `1px solid ${COLORS.border}`,
                  fontSize: '12px'
                }}
              >
                <div style={{ color: COLORS.text, opacity: 0.7 }}>{state}</div>
                <div style={{ color: REGIME_COLORS[state] || COLORS.accent, fontWeight: 'bold' }}>
                  {Math.round(prob * 100)}%
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Metrics footer */}
      <div
        style={{
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${COLORS.border}`,
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '12px',
          fontSize: '12px'
        }}
      >
        <div>
          <div style={{ color: COLORS.text, opacity: 0.6 }}>Price</div>
          <div style={{ color: COLORS.accent, fontFamily: 'IBM Plex Mono', fontWeight: 'bold' }}>
            ${data.price?.toLocaleString('en-US', { maximumFractionDigits: 2 })}
          </div>
        </div>
        <div>
          <div style={{ color: COLORS.text, opacity: 0.6 }}>24h Volatility</div>
          <div style={{ color: COLORS.cyan, fontFamily: 'IBM Plex Mono', fontWeight: 'bold' }}>
            {data.volatility ? `${(data.volatility * 100).toFixed(2)}%` : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
}
