import React, { useMemo, useState, useCallback } from 'react';
import { useSymbolStore } from '../../store/symbolStore';

const SOURCE_COLORS = {
  SEC: '#9333ea',
  News: '#00ccff',
  Transcript: '#f5c542'
};

const DIRECTION_COLORS = {
  BULLISH: '#00ff88',
  BEARISH: '#ff4455',
  NEUTRAL: '#666'
};

const HORIZON_BADGES = {
  IMMEDIATE: { bg: '#00ff8820', color: '#00ff88' },
  SHORT: { bg: '#00ccff20', color: '#00ccff' },
  MEDIUM: { bg: '#f5c54220', color: '#f5c542' },
  LONG: { bg: '#9333ea20', color: '#9333ea' }
};

const MAX_CARDS = 20;

const InsightCard = ({ insight }) => {
  const [showSource, setShowSource] = useState(false);
  
  const source = insight.source || 'News';
  const docType = insight.document_type || '';
  const confidence = insight.confidence || 0;
  const summary = insight.summary || '';
  const cause = insight.cause || '';
  const effect = insight.effect || '';
  const direction = insight.direction || 'NEUTRAL';
  const horizon = insight.time_horizon || 'SHORT';
  const affectedAssets = insight.affected_assets || [];
  const sourceSentence = insight.source_sentence || '';
  
  const getConfidenceLabel = (conf) => {
    if (conf >= 0.7) return 'HIGH';
    if (conf >= 0.5) return 'MEDIUM';
    return 'LOW';
  };
  const confLabel = getConfidenceLabel(confidence);
  const confColor = confLabel === 'HIGH' ? '#00ff88' : confLabel === 'MEDIUM' ? '#f5c542' : '#666';
  
  const formatRelativeTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'now';
  };

  const horizonStyle = HORIZON_BADGES[horizon] || HORIZON_BADGES.SHORT;

  return (
    <div style={{
      padding: '12px',
      background: '#1a1a2e',
      borderRadius: '6px',
      marginBottom: '8px',
      animation: 'slideIn 200ms ease-out'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '4px',
            background: `${SOURCE_COLORS[source]}20`,
            color: SOURCE_COLORS[source],
            fontFamily: 'IBM Plex Mono, monospace'
          }}>
            {source}
          </span>
          {docType && (
            <span style={{ fontSize: '10px', color: '#666' }}>
              {docType}
            </span>
          )}
        </div>
        <span style={{ fontSize: '10px', color: '#666', fontFamily: 'IBM Plex Mono, monospace' }}>
          {formatRelativeTime(insight.timestamp)}
        </span>
      </div>

      <div style={{ marginBottom: '8px' }}>
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: `${confColor}20`,
          color: confColor,
          fontFamily: 'IBM Plex Mono, monospace'
        }}>
          {confLabel}
        </span>
      </div>

      <div style={{
        fontSize: '12px',
        fontFamily: 'IBM Plex Sans, sans-serif',
        color: '#ddddf0',
        lineHeight: 1.5,
        marginBottom: '8px'
      }}>
        {summary}
      </div>

      {cause && effect && (
        <div style={{
          fontSize: '11px',
          color: '#888',
          marginBottom: '6px',
          fontFamily: 'IBM Plex Mono, monospace'
        }}>
          {cause} → {effect}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: `${DIRECTION_COLORS[direction]}20`,
          color: DIRECTION_COLORS[direction],
          fontFamily: 'IBM Plex Mono, monospace'
        }}>
          {direction}
        </span>
        <span style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          background: horizonStyle.bg,
          color: horizonStyle.color,
          fontFamily: 'IBM Plex Mono, monospace'
        }}>
          {horizon}
        </span>
      </div>

      {affectedAssets.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
          {affectedAssets.map((asset, i) => (
            <span key={i} style={{
              fontSize: '9px',
              padding: '2px 4px',
              borderRadius: '2px',
              background: '#2a2a4a',
              color: '#aaa',
              fontFamily: 'IBM Plex Mono, monospace'
            }}>
              {asset}
            </span>
          ))}
        </div>
      )}

      {sourceSentence && (
        <div>
          <button
            onClick={() => setShowSource(!showSource)}
            style={{
              background: 'none',
              border: 'none',
              color: '#666',
              cursor: 'pointer',
              fontSize: '10px',
              padding: 0,
              fontFamily: 'IBM Plex Mono, monospace'
            }}
          >
            {showSource ? 'Hide source' : 'Show source'}
          </button>
          {showSource && (
            <div style={{
              marginTop: '6px',
              padding: '8px',
              background: '#0a0a15',
              borderRadius: '4px',
              fontSize: '11px',
              fontFamily: 'IBM Plex Mono, monospace',
              color: '#888',
              fontStyle: 'italic',
              whiteSpace: 'pre-wrap'
            }}>
              {sourceSentence}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

const LLMInsightWidget = () => {
  const currentSymbol = useSymbolStore((state) => state.currentSymbol);
  const llmInsights = useSymbolStore((state) => state.llmInsights);
  
  const filteredInsights = useMemo(() => {
    return llmInsights
      .filter(i => i.affected_assets?.includes(currentSymbol))
      .slice(0, MAX_CARDS);
  }, [llmInsights, currentSymbol]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>
      <div
        className="widget-header"
        style={{
          padding: '8px',
          borderBottom: '1px solid #2a2a4a',
          color: '#fff',
          fontSize: '12px',
          fontFamily: 'IBM Plex Mono, monospace',
          cursor: 'grab'
        }}
      >
        Insights - {currentSymbol}
      </div>

      <div style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
        {filteredInsights.length === 0 ? (
          <div style={{
            height: '100%',
            display: 'grid',
            placeItems: 'center',
            color: '#666',
            fontSize: '11px',
            textAlign: 'center'
          }}>
            No insights yet. Ask the AI about market conditions.
          </div>
        ) : (
          filteredInsights.map((insight, i) => (
            <InsightCard key={insight.id || i} insight={insight} />
          ))
        )}
      </div>
    </div>
  );
};

export default LLMInsightWidget;