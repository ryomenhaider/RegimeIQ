import React, { useMemo, useState, useCallback } from 'react';
import { useSymbolStore } from '../../../store/symbolStore';

const SOURCE_COLORS = {
  SEC: '#9333ea',
  News: '#00ccff',
  Transcript: '#f5c542'
};

const DIRECTION_COLORS = {
  BULLISH: '#7ED87A',
  BEARISH: '#ff4455',
  NEUTRAL: '#555570'
};

const HORIZON_BADGES = {
  IMMEDIATE: { bg: 'rgba(126,216,122,0.1)', color: '#7ED87A' },
  SHORT: { bg: 'rgba(0,204,255,0.1)', color: '#00ccff' },
  MEDIUM: { bg: 'rgba(245,197,66,0.1)', color: '#f5c542' },
  LONG: { bg: 'rgba(147,51,234,0.1)', color: '#9333ea' }
};

const MAX_CARDS = 20;

const Pill = ({ children, color, bg }) => (
  <span style={{
    fontSize: '9px', padding: '2px 7px', borderRadius: '3px',
    background: bg || `${color}18`, color,
    fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600,
    letterSpacing: '0.06em', textTransform: 'uppercase',
    border: `1px solid ${color}30`
  }}>
    {children}
  </span>
);

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
    if (conf >= 0.5) return 'MED';
    return 'LOW';
  };
  const confLabel = getConfidenceLabel(confidence);
  const confColor = confLabel === 'HIGH' ? '#7ED87A' : confLabel === 'MED' ? '#f5c542' : '#555570';

  const formatRelativeTime = (ts) => {
    if (!ts) return '';
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (mins > 0) return `${mins}m`;
    return 'now';
  };

  const horizonStyle = HORIZON_BADGES[horizon] || HORIZON_BADGES.SHORT;
  const dirColor = DIRECTION_COLORS[direction];

  return (
    <>
      <style>{`
        @keyframes insightSlideIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .insight-card {
          padding: 10px 12px;
          background: #16162e;
          border-radius: 5px;
          margin-bottom: 6px;
          animation: insightSlideIn 200ms ease-out;
          border: 1px solid #2a2a4a;
          transition: border-color 150ms ease;
        }
        .insight-card:hover { border-color: #3a3a5a; }
        .insight-src-btn {
          background: none; border: none; cursor: pointer;
          font-family: 'IBM Plex Mono', monospace; font-size: 10px;
          color: #555570; padding: 0; transition: color 120ms ease;
          letter-spacing: 0.04em;
        }
        .insight-src-btn:hover { color: #7777aa; }
      `}</style>
      <div className="insight-card">
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <Pill color={SOURCE_COLORS[source] || '#7777aa'}>{source}</Pill>
            {docType && <span style={{ fontSize: '9px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}>{docType}</span>}
          </div>
          <span style={{ fontSize: '10px', color: '#555570', fontFamily: 'IBM Plex Mono, monospace' }}>
            {formatRelativeTime(insight.timestamp)}
          </span>
        </div>

        {/* Summary */}
        <div style={{ fontSize: '12px', fontFamily: 'IBM Plex Sans, sans-serif', color: '#ddddf0', lineHeight: '1.55', marginBottom: '8px' }}>
          {summary}
        </div>

        {/* Cause → Effect */}
        {cause && effect && (
          <div style={{ fontSize: '10px', color: '#7777aa', marginBottom: '8px', fontFamily: 'IBM Plex Mono, monospace', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ color: '#555570' }}>{cause}</span>
            <span style={{ color: '#3a3a5a' }}>→</span>
            <span style={{ color: '#7777aa' }}>{effect}</span>
          </div>
        )}

        {/* Tags row */}
        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: affectedAssets.length > 0 || sourceSentence ? '8px' : '0' }}>
          <Pill color={dirColor}>{direction}</Pill>
          <Pill color={horizonStyle.color} bg={horizonStyle.bg}>{horizon}</Pill>
          <Pill color={confColor}>{confLabel} CONF</Pill>
        </div>

        {/* Affected assets */}
        {affectedAssets.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: sourceSentence ? '8px' : '0' }}>
            {affectedAssets.map((asset, i) => (
              <span key={i} style={{
                fontSize: '9px', padding: '2px 5px', borderRadius: '2px',
                background: 'rgba(42,42,74,0.7)', color: '#7777aa',
                fontFamily: 'IBM Plex Mono, monospace', border: '1px solid #2a2a4a'
              }}>{asset}</span>
            ))}
          </div>
        )}

        {/* Source toggle */}
        {sourceSentence && (
          <div>
            <button className="insight-src-btn" onClick={() => setShowSource(!showSource)}>
              {showSource ? '↑ hide source' : '↓ view source'}
            </button>
            {showSource && (
              <div style={{
                marginTop: '6px', padding: '8px 10px',
                background: '#090910', borderRadius: '4px',
                fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace',
                color: '#7777aa', fontStyle: 'italic', lineHeight: '1.6',
                border: '1px solid #2a2a4a', whiteSpace: 'pre-wrap'
              }}>
                {sourceSentence}
              </div>
            )}
          </div>
        )}
      </div>
    </>
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
    <>
      <style>{`
        .insights-scroll::-webkit-scrollbar { width: 3px; }
        .insights-scroll::-webkit-scrollbar-track { background: transparent; }
        .insights-scroll::-webkit-scrollbar-thumb { background: #2a2a4a; border-radius: 2px; }
        .insights-scroll::-webkit-scrollbar-thumb:hover { background: #3a3a5a; }
      `}</style>
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#11112a' }}>
        {/* Header */}
        <div
          className="widget-header"
          style={{
            padding: '8px 12px',
            borderBottom: '1px solid #2a2a4a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'grab',
            flexShrink: 0
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '2px', height: '12px', borderRadius: '1px', background: '#f5c542', boxShadow: '0 0 6px rgba(245,197,66,0.4)' }} />
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#7777aa' }}>
              Insights
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {filteredInsights.length > 0 && (
              <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: '#555570' }}>
                {filteredInsights.length}
              </span>
            )}
            <span style={{ fontSize: '10px', fontFamily: 'IBM Plex Mono, monospace', color: '#555570' }}>
              {currentSymbol}
            </span>
          </div>
        </div>

        {/* Cards */}
        <div className="insights-scroll" style={{ flex: 1, padding: '8px', overflowY: 'auto' }}>
          {filteredInsights.length === 0 ? (
            <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: '#555570', fontSize: '11px', textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace', lineHeight: '1.8' }}>
              <div>
                <div style={{ fontSize: '18px', marginBottom: '8px', opacity: 0.3 }}>◎</div>
                No insights available.<br />Ask the AI about market conditions.
              </div>
            </div>
          ) : (
            filteredInsights.map((insight, i) => (
              <InsightCard key={insight.id || i} insight={insight} />
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default LLMInsightWidget;