import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSymbolStore } from '../store/symbolStore';
import { COLORS } from '../utils/constants';
import toast from 'react-hot-toast';
import api from '../services/api';

const C = {
  bg: '#090910',
  card: '#11112a',
  surface: '#16162e',
  border: '#2a2a4a',
  accent: '#7ED87A',
  text: '#ddddf0',
  muted: '#7777aa',
  faint: '#555570',
  red: '#ff4455',
  yellow: '#f5c542',
  cyan: '#00ccff',
  mono: "'IBM Plex Mono', monospace",
  sans: "'DM Sans', sans-serif",
};

const SECTIONS = [
  { id: 'symbols', label: 'Symbols', icon: '◈' },
  { id: 'alerts', label: 'Alerts', icon: '◎' },
  { id: 'altdata', label: 'Alt Data', icon: '◆' },
  { id: 'dashboard', label: 'Dashboard', icon: '▦' },
  { id: 'account', label: 'Account', icon: '◇' },
  { id: 'notifications', label: 'Notifications', icon: '◉' },
];

const PLAN_LIMITS = { trial: 3, standard: 10, unlimited: Infinity };

const Settings = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUsername = useAuthStore((state) => state.username);
  const plan = useAuthStore((state) => state.plan);

  const [activeSection, setActiveSection] = useState('symbols');
  const [unsavedChanges, setUnsavedChanges] = useState({});

  const userPlan = plan || 'trial';
  const symbolLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.trial;

  useEffect(() => {
    if (username !== currentUsername) navigate(`/dashboard/${currentUsername}/settings`);
  }, [username, currentUsername, navigate]);

  const handleSuccess = (section) => {
    toast.success('Settings saved.');
    setUnsavedChanges(prev => ({ ...prev, [section]: false }));
  };

  const handleError = (message) => toast.error(message);

  const renderSection = () => {
    switch (activeSection) {
      case 'symbols': return <SymbolsSection limit={symbolLimit} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, symbols: v }))} onSuccess={() => handleSuccess('symbols')} onError={handleError} />;
      case 'alerts': return <AlertsSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, alerts: v }))} onSuccess={() => handleSuccess('alerts')} onError={handleError} />;
      case 'altdata': return <AltDataSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, altdata: v }))} onSuccess={() => handleSuccess('altdata')} onError={handleError} />;
      case 'dashboard': return <DashboardSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, dashboard: v }))} onSuccess={() => handleSuccess('dashboard')} onError={handleError} />;
      case 'account': return <AccountSection currentUsername={currentUsername} onSuccess={() => handleSuccess('account')} onError={handleError} />;
      case 'notifications': return <NotificationsSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, notifications: v }))} onSuccess={() => handleSuccess('notifications')} onError={handleError} />;
      default: return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', flexDirection: 'column', fontFamily: C.sans }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .settings-content { animation: fadeIn 200ms ease; }
        @media (max-width: 768px) {
          .settings-sidebar { display: none !important; }
        }
        .settings-nav-btn:hover { background: ${C.surface} !important; color: ${C.text} !important; }
        input[type=range] { accent-color: ${C.accent}; }
      `}</style>

      {/* Page header */}
      <div style={{
        height: '48px',
        background: C.card,
        borderBottom: `1px solid ${C.border}`,
        display: 'flex',
        alignItems: 'center',
        padding: '0 24px',
        gap: '12px',
        flexShrink: 0,
      }}>
        <div style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: C.accent, boxShadow: `0 0 6px ${C.accent}`,
        }} />
        <span style={{ fontFamily: C.mono, fontSize: '13px', color: C.text, letterSpacing: '0.06em', fontWeight: 500 }}>
          Settings
        </span>
        <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint }}>
          / {SECTIONS.find(s => s.id === activeSection)?.label}
        </span>
      </div>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <aside className="settings-sidebar" style={{
          width: '200px',
          background: C.card,
          borderRight: `1px solid ${C.border}`,
          padding: '20px 0',
          flexShrink: 0,
        }}>
          <div style={{
            padding: '0 16px 16px',
            fontFamily: C.mono, fontSize: '9px', color: C.faint,
            letterSpacing: '0.14em', textTransform: 'uppercase',
            borderBottom: `1px solid ${C.border}`,
            marginBottom: '12px',
          }}>
            Preferences
          </div>

          {SECTIONS.map((section) => {
            const isActive = activeSection === section.id;
            const hasChanges = unsavedChanges[section.id];
            return (
              <button
                key={section.id}
                className="settings-nav-btn"
                onClick={() => setActiveSection(section.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                  padding: '10px 16px',
                  background: isActive ? C.surface : 'transparent',
                  border: 'none',
                  borderLeft: isActive ? `2px solid ${C.accent}` : '2px solid transparent',
                  color: isActive ? C.text : C.muted,
                  fontFamily: C.mono, fontSize: '12px',
                  letterSpacing: '0.04em',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 120ms',
                }}
              >
                <span style={{ color: isActive ? C.accent : C.faint, fontSize: '13px' }}>{section.icon}</span>
                {section.label}
                {hasChanges && (
                  <div style={{
                    width: '5px', height: '5px', borderRadius: '50%',
                    background: C.yellow, marginLeft: 'auto',
                    boxShadow: `0 0 4px ${C.yellow}`,
                  }} />
                )}
              </button>
            );
          })}
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '32px', overflowY: 'auto', background: C.bg }}>
          <div className="settings-content" key={activeSection}>
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
};

// Shared helpers
const SectionContainer = ({ title, subtitle, children, onSave }) => (
  <div style={{ maxWidth: '560px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
      <div>
        <h2 style={{ fontFamily: C.mono, fontSize: '16px', color: C.text, letterSpacing: '0.06em', fontWeight: 600, marginBottom: '4px' }}>
          {title}
        </h2>
        {subtitle && <p style={{ fontFamily: C.sans, fontSize: '13px', color: C.faint, margin: 0 }}>{subtitle}</p>}
      </div>
      {onSave && (
        <button
          onClick={onSave}
          style={{
            padding: '8px 18px',
            background: C.accent,
            border: 'none', borderRadius: '6px',
            color: '#060610',
            fontFamily: C.mono, fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', letterSpacing: '0.06em',
            transition: 'all 150ms',
            flexShrink: 0, marginLeft: '16px',
          }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = `0 0 14px ${C.accent}50`}
          onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
        >
          Save
        </button>
      )}
    </div>
    {children}
  </div>
);

const FormField = ({ label, hint, children }) => (
  <div style={{ marginBottom: '22px' }}>
    <label style={{
      display: 'block',
      fontFamily: C.mono, fontSize: '10px', color: C.muted,
      letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: '8px',
    }}>
      {label}
    </label>
    {children}
    {hint && <p style={{ fontFamily: C.sans, fontSize: '12px', color: C.faint, marginTop: '6px', margin: '6px 0 0' }}>{hint}</p>}
  </div>
);

const TagList = ({ tags, onRemove }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
    {tags.map((tag, i) => (
      <span key={i} style={{
        display: 'inline-flex', alignItems: 'center', gap: '5px',
        padding: '4px 8px 4px 10px',
        background: C.surface,
        border: `1px solid ${C.border}`,
        borderRadius: '4px',
        fontFamily: C.mono, fontSize: '11px', color: C.text,
        letterSpacing: '0.03em',
      }}>
        {tag}
        <button
          onClick={() => onRemove(tag)}
          style={{
            background: 'none', border: 'none', color: C.faint,
            cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '14px',
            transition: 'color 100ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = C.red}
          onMouseLeave={e => e.currentTarget.style.color = C.faint}
        >
          ×
        </button>
      </span>
    ))}
  </div>
);

const ToggleField = ({ label, description, checked, onChange }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 16px',
    background: C.card,
    border: `1px solid ${C.border}`,
    borderRadius: '8px',
    marginBottom: '10px',
    transition: 'border-color 150ms',
  }}
    onMouseEnter={e => e.currentTarget.style.borderColor = `${C.accent}40`}
    onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
  >
    <div>
      <div style={{ fontFamily: C.mono, fontSize: '12px', color: C.text, marginBottom: description ? '3px' : 0 }}>{label}</div>
      {description && <div style={{ fontFamily: C.sans, fontSize: '12px', color: C.faint }}>{description}</div>}
    </div>
    <button
      onClick={onChange}
      style={{
        width: '42px', height: '22px', borderRadius: '11px', padding: '2px',
        background: checked ? C.accent : C.surface,
        border: `1px solid ${checked ? C.accent : C.border}`,
        cursor: 'pointer', position: 'relative',
        transition: 'background 200ms, border-color 200ms',
        flexShrink: 0,
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%',
        background: checked ? '#060610' : C.faint,
        position: 'absolute', top: '2px',
        left: checked ? '22px' : '2px',
        transition: 'left 200ms, background 200ms',
        boxShadow: checked ? `0 0 4px ${C.accent}` : 'none',
      }} />
    </button>
  </div>
);

const inputStyle = {
  width: '100%',
  padding: '10px 13px',
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: '6px',
  color: C.text,
  fontSize: '13px',
  fontFamily: C.mono,
  outline: 'none',
  boxSizing: 'border-box',
  letterSpacing: '0.02em',
  transition: 'border-color 150ms, box-shadow 150ms',
};

const inputFocusStyle = {
  borderColor: C.accent,
  boxShadow: `0 0 0 3px ${C.accent}18`,
};

const FocusInput = ({ style, ...props }) => {
  const [focused, setFocused] = useState(false);
  return (
    <input
      {...props}
      style={{ ...inputStyle, ...(focused ? inputFocusStyle : {}), ...style }}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
    />
  );
};

const buttonStyle = {
  padding: '9px 16px',
  background: C.accent,
  border: 'none',
  borderRadius: '6px',
  color: '#060610',
  fontSize: '11px',
  fontFamily: C.mono,
  cursor: 'pointer',
  letterSpacing: '0.04em',
  fontWeight: 600,
  transition: 'all 150ms',
};

// SECTION: Symbols
const SymbolsSection = ({ limit, onChange, onSuccess, onError }) => {
  const activeSymbols = useSymbolStore((state) => state.activeSymbols);
  const removeSymbol = useSymbolStore((state) => state.removeSymbol);
  const [showAddModal, setShowAddModal] = useState(false);
  const symbolsUsed = activeSymbols.length;
  const pct = limit === Infinity ? 0 : Math.min((symbolsUsed / limit) * 100, 100);

  return (
    <SectionContainer title="Symbol Management" subtitle="Configure your tracked market symbols" onSave={onSuccess}>
      {/* Usage meter */}
      <div style={{
        padding: '16px',
        background: C.card,
        border: `1px solid ${C.border}`,
        borderRadius: '8px',
        marginBottom: '20px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <span style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Symbol Usage
          </span>
          <span style={{ fontFamily: C.mono, fontSize: '13px', color: symbolsUsed >= limit ? C.red : C.accent }}>
            {symbolsUsed} / {limit === Infinity ? '∞' : limit}
          </span>
        </div>
        <div style={{ height: '3px', background: C.surface, borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            width: `${pct}%`,
            height: '100%',
            background: pct > 80 ? C.red : C.accent,
            borderRadius: '2px',
            boxShadow: `0 0 5px ${pct > 80 ? C.red : C.accent}`,
            transition: 'width 400ms cubic-bezier(0.16,1,0.3,1)',
          }} />
        </div>
      </div>

      {/* Symbol list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '16px' }}>
        {activeSymbols.map((symbol) => (
          <div key={symbol.id} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '12px 14px',
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: '7px',
            transition: 'border-color 120ms',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${C.accent}40`}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: C.accent }} />
              <span style={{ fontFamily: C.mono, fontSize: '13px', color: C.text, letterSpacing: '0.04em' }}>
                {symbol.label}
              </span>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {symbol.insufficientData && (
                <span style={{
                  fontSize: '10px', padding: '3px 7px',
                  background: `${C.yellow}15`,
                  border: `1px solid ${C.yellow}30`,
                  color: C.yellow,
                  borderRadius: '4px', fontFamily: C.mono, letterSpacing: '0.04em',
                }}>
                  Insufficient data
                </span>
              )}
              <button
                onClick={() => { removeSymbol(symbol.id); onChange(true); }}
                style={{
                  background: 'none', border: 'none', color: C.faint,
                  cursor: 'pointer', fontSize: '16px', lineHeight: 1,
                  padding: '2px',
                  transition: 'color 100ms',
                }}
                onMouseEnter={e => e.currentTarget.style.color = C.red}
                onMouseLeave={e => e.currentTarget.style.color = C.faint}
                title="Remove symbol"
              >
                ×
              </button>
            </div>
          </div>
        ))}

        {activeSymbols.length === 0 && (
          <div style={{
            padding: '32px', textAlign: 'center',
            border: `1px dashed ${C.border}`, borderRadius: '8px',
          }}>
            <div style={{ fontFamily: C.mono, fontSize: '11px', color: C.faint, letterSpacing: '0.06em' }}>
              No symbols added yet
            </div>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        disabled={symbolsUsed >= limit}
        style={{
          padding: '10px 18px',
          background: symbolsUsed >= limit ? C.surface : C.accent,
          border: symbolsUsed >= limit ? `1px solid ${C.border}` : 'none',
          borderRadius: '6px',
          color: symbolsUsed >= limit ? C.faint : '#060610',
          fontFamily: C.mono, fontSize: '12px', fontWeight: 600,
          cursor: symbolsUsed >= limit ? 'not-allowed' : 'pointer',
          letterSpacing: '0.04em',
          transition: 'all 150ms',
        }}
      >
        + Add Symbol
      </button>

      {showAddModal && (
        <AddSymbolModalWrapper onClose={() => setShowAddModal(false)} onAdd={() => { onChange(true); onSuccess(); }} />
      )}
    </SectionContainer>
  );
};

// SECTION: Alerts
const AlertsSection = ({ currentUsername, onChange, onSuccess, onError }) => {
  const settings = useSettingsStore((state) => state.userSettings);
  const [discordUrl, setDiscordUrl] = useState(settings?.discordWebhook || '');
  const [confluenceThreshold, setConfluenceThreshold] = useState(settings?.confluenceThreshold || 0.5);
  const [regimeConfidenceThreshold, setRegimeConfidenceThreshold] = useState(settings?.regimeConfidenceThreshold || 0.7);
  const [testStatus, setTestStatus] = useState(null);

  const validateDiscordUrl = (url) => /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url);

  const handleTestWebhook = async () => {
    if (!validateDiscordUrl(discordUrl)) {
      setTestStatus({ success: false, message: 'Invalid Discord webhook URL' });
      return;
    }
    try {
      await api.post(`/users/${currentUsername}/alerts/test`);
      setTestStatus({ success: true, message: 'Test message sent' });
    } catch (e) {
      setTestStatus({ success: false, message: e.response?.data?.message || 'Failed to send test' });
    }
  };

  return (
    <SectionContainer title="Alert Configuration" subtitle="Configure thresholds and notification channels" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { discordWebhook: discordUrl, confluenceThreshold, regimeConfidenceThreshold })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <FormField label="Discord Webhook URL" hint="Alerts will be posted to this channel">
        <div style={{ display: 'flex', gap: '8px' }}>
          <FocusInput
            type="text"
            value={discordUrl}
            onChange={(e) => { setDiscordUrl(e.target.value); onChange(true); }}
            placeholder="https://discord.com/api/webhooks/..."
            style={{ flex: 1 }}
          />
          <button onClick={handleTestWebhook} style={{
            padding: '10px 14px',
            background: C.surface,
            border: `1px solid ${C.border}`,
            borderRadius: '6px',
            color: C.muted, fontFamily: C.mono, fontSize: '11px',
            cursor: 'pointer', letterSpacing: '0.04em',
            transition: 'all 150ms',
            whiteSpace: 'nowrap',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.color = C.muted; }}
          >
            Test
          </button>
        </div>
        {testStatus && (
          <div style={{
            marginTop: '8px', padding: '8px 12px',
            background: testStatus.success ? `${C.accent}12` : `${C.red}12`,
            border: `1px solid ${testStatus.success ? C.accent + '40' : C.red + '40'}`,
            borderRadius: '5px',
            fontFamily: C.mono, fontSize: '11px',
            color: testStatus.success ? C.accent : C.red,
            letterSpacing: '0.04em',
          }}>
            {testStatus.success ? '✓ ' : '✗ '}{testStatus.message}
          </div>
        )}
      </FormField>

      <FormField label={`Confluence Threshold — ${confluenceThreshold}`}>
        <input
          type="range" min="0.5" max="0.95" step="0.05"
          value={confluenceThreshold}
          onChange={(e) => { setConfluenceThreshold(Number(e.target.value)); onChange(true); }}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.mono, fontSize: '10px', color: C.faint, marginTop: '4px' }}>
          <span>0.5</span><span>0.95</span>
        </div>
      </FormField>

      <FormField label={`Regime Confidence Threshold — ${Math.round(regimeConfidenceThreshold * 100)}%`}>
        <input
          type="range" min="0.5" max="0.95" step="0.05"
          value={regimeConfidenceThreshold}
          onChange={(e) => { setRegimeConfidenceThreshold(Number(e.target.value)); onChange(true); }}
          style={{ width: '100%', cursor: 'pointer' }}
        />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.mono, fontSize: '10px', color: C.faint, marginTop: '4px' }}>
          <span>50%</span><span>95%</span>
        </div>
      </FormField>
    </SectionContainer>
  );
};

// SECTION: Alt Data
const AltDataSection = ({ currentUsername, onChange, onSuccess, onError }) => {
  const settings = useSettingsStore((state) => state.userSettings);
  const [subreddits, setSubreddits] = useState(settings?.redditSubreddits || []);
  const [newSubreddit, setNewSubreddit] = useState('');
  const [keywords, setKeywords] = useState(settings?.googleTrendsKeywords || []);
  const [newKeyword, setNewKeyword] = useState('');
  const [fredSeries, setFredSeries] = useState(settings?.fredSeries || []);
  const [selectedFred, setSelectedFred] = useState([]);

  const { data: fredOptions } = useQuery({
    queryKey: ['fred-series'],
    queryFn: async () => {
      const res = await api.get('/altdata/fred-series');
      return res.data.data;
    },
    staleTime: 10 * 60 * 1000,
  });

  const addSubreddit = () => {
    if (newSubreddit && !subreddits.includes(newSubreddit)) {
      setSubreddits([...subreddits, newSubreddit]);
      setNewSubreddit('');
      onChange(true);
    }
  };

  const addKeyword = () => {
    if (newKeyword && !keywords.includes(newKeyword)) {
      setKeywords([...keywords, newKeyword]);
      setNewKeyword('');
      onChange(true);
    }
  };

  return (
    <SectionContainer title="Alternative Data" subtitle="Configure external data sources for enriched signals" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { redditSubreddits: subreddits, googleTrendsKeywords: keywords, fredSeries })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <FormField label="Reddit Subreddits">
        <div style={{ display: 'flex', gap: '8px' }}>
          <FocusInput
            type="text"
            value={newSubreddit}
            onChange={(e) => setNewSubreddit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubreddit()}
            placeholder="r/subredditname"
            style={{ flex: 1 }}
          />
          <button onClick={addSubreddit} style={{ ...buttonStyle, flexShrink: 0 }}>Add</button>
        </div>
        <TagList tags={subreddits} onRemove={(r) => { setSubreddits(subreddits.filter(s => s !== r)); onChange(true); }} />
      </FormField>

      <FormField label="Google Trends Keywords">
        <div style={{ display: 'flex', gap: '8px' }}>
          <FocusInput
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="e.g. bitcoin, inflation"
            style={{ flex: 1 }}
          />
          <button onClick={addKeyword} style={{ ...buttonStyle, flexShrink: 0 }}>Add</button>
        </div>
        <TagList tags={keywords} onRemove={(k) => { setKeywords(keywords.filter(w => w !== k)); onChange(true); }} />
      </FormField>

      <FormField label="FRED Economic Series">
        <select
          value={selectedFred}
          onChange={(e) => setSelectedFred(Array.from(e.target.selectedOptions, o => o.value))}
          multiple
          style={{ ...inputStyle, height: '110px', boxSizing: 'border-box' }}
        >
          {fredOptions?.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        <button onClick={() => { setFredSeries(selectedFred); onChange(true); }} style={{ ...buttonStyle, marginTop: '8px' }}>
          Add Selected
        </button>
        <TagList tags={fredSeries} onRemove={(f) => { setFredSeries(fredSeries.filter(s => s !== f)); onChange(true); }} />
      </FormField>
    </SectionContainer>
  );
};

// SECTION: Dashboard
const DashboardSection = ({ currentUsername, onChange, onSuccess, onError }) => {
  const settings = useSettingsStore((state) => state.userSettings);
  const setLayout = useSettingsStore((state) => state.setLayout);
  const [defaultTab, setDefaultTab] = useState(settings?.defaultTab || 'microstructure');
  const [timezone, setTimezone] = useState(settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone);

  const tabs = ['microstructure', 'regime', 'altdata', 'causal'];

  const handleResetLayout = async () => {
    if (!window.confirm('Reset all widget positions to default? This cannot be undone.')) return;
    try {
      await api.patch(`/users/${currentUsername}/settings`, { layoutConfigs: {} });
      setLayout(null);
      onSuccess();
    } catch (e) {
      onError(e.response?.data?.message || 'Failed to reset');
    }
  };

  return (
    <SectionContainer title="Dashboard Settings" subtitle="Customize your default workspace configuration" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { defaultTab, timezone })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <FormField label="Default Tab">
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => { setDefaultTab(tab); onChange(true); }}
              style={{
                padding: '8px 16px',
                background: defaultTab === tab ? C.accent : C.surface,
                border: `1px solid ${defaultTab === tab ? C.accent : C.border}`,
                borderRadius: '6px',
                color: defaultTab === tab ? '#060610' : C.muted,
                fontFamily: C.mono, fontSize: '11px',
                cursor: 'pointer', letterSpacing: '0.04em',
                transition: 'all 150ms', fontWeight: defaultTab === tab ? 600 : 400,
              }}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </FormField>

      <FormField label="Display Timezone">
        <select
          value={timezone}
          onChange={(e) => { setTimezone(e.target.value); onChange(true); }}
          style={{ ...inputStyle, boxSizing: 'border-box', cursor: 'pointer' }}
        >
          <option value="America/New_York">America/New_York (ET)</option>
          <option value="America/Los_Angeles">America/Los_Angeles (PT)</option>
          <option value="Europe/London">Europe/London (GMT)</option>
          <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
          <option value="UTC">UTC</option>
        </select>
      </FormField>

      <FormField label="Layout">
        <div style={{
          padding: '14px 16px',
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: '8px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: '12px', color: C.text, marginBottom: '3px' }}>Reset Widget Layout</div>
            <div style={{ fontFamily: C.sans, fontSize: '12px', color: C.faint }}>Restore all widgets to default positions</div>
          </div>
          <button
            onClick={handleResetLayout}
            style={{
              padding: '8px 14px',
              background: 'transparent',
              border: `1px solid ${C.red}40`,
              borderRadius: '5px',
              color: C.red, fontFamily: C.mono, fontSize: '11px',
              cursor: 'pointer', letterSpacing: '0.04em',
              transition: 'all 150ms', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = `${C.red}15`; e.currentTarget.style.borderColor = C.red; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = `${C.red}40`; }}
          >
            Reset
          </button>
        </div>
      </FormField>
    </SectionContainer>
  );
};

// SECTION: Account
const AccountSection = ({ currentUsername, onSuccess, onError }) => {
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const [emailCurrent, setEmailCurrent] = useState('');
  const [emailNew, setEmailNew] = useState('');
  const [passwordCurrent, setPasswordCurrent] = useState('');
  const [passwordNew, setPasswordNew] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const handleChangeEmail = async () => {
    try {
      await api.patch(`/users/${currentUsername}/account`, { currentPassword: emailCurrent, newEmail: emailNew });
      toast.success('Email changed successfully');
      setEmailCurrent(''); setEmailNew('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change email');
    }
  };

  const handleChangePassword = async () => {
    if (passwordNew !== passwordConfirm) { toast.error('Passwords do not match'); return; }
    try {
      await api.patch(`/users/${currentUsername}/account`, { currentPassword: passwordCurrent, newPassword: passwordNew });
      toast.success('Password changed successfully');
      setPasswordCurrent(''); setPasswordNew(''); setPasswordConfirm('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') { toast.error('Type DELETE to confirm'); return; }
    if (!passwordCurrent) { toast.error('Password is required to delete account'); return; }
    try {
      await api.delete(`/users/${currentUsername}`, { data: { confirmation: 'DELETE', current_password: passwordCurrent } });
      clearAuth();
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete account');
    }
  };

  const SubSection = ({ children, title }) => (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: '8px', padding: '20px', marginBottom: '16px',
    }}>
      <h3 style={{ fontFamily: C.mono, fontSize: '12px', color: C.muted, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '16px' }}>
        {title}
      </h3>
      {children}
    </div>
  );

  return (
    <SectionContainer title="Account" subtitle="Manage your credentials and account settings">
      <SubSection title="Change Email">
        <FormField label="Current Password">
          <FocusInput type="password" value={emailCurrent} onChange={(e) => setEmailCurrent(e.target.value)} />
        </FormField>
        <FormField label="New Email">
          <FocusInput type="email" value={emailNew} onChange={(e) => setEmailNew(e.target.value)} />
        </FormField>
        <button onClick={handleChangeEmail} style={buttonStyle}>Update Email</button>
      </SubSection>

      <SubSection title="Change Password">
        <FormField label="Current Password">
          <FocusInput type="password" value={passwordCurrent} onChange={(e) => setPasswordCurrent(e.target.value)} />
        </FormField>
        <FormField label="New Password">
          <FocusInput type="password" value={passwordNew} onChange={(e) => setPasswordNew(e.target.value)} />
        </FormField>
        <FormField label="Confirm New Password">
          <FocusInput type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} />
        </FormField>
        <button onClick={handleChangePassword} style={buttonStyle}>Update Password</button>
      </SubSection>

      {/* Danger zone */}
      <div style={{
        background: `${C.red}08`,
        border: `1px solid ${C.red}30`,
        borderRadius: '8px', padding: '20px',
      }}>
        <h3 style={{ fontFamily: C.mono, fontSize: '12px', color: C.red, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '8px' }}>
          Danger Zone
        </h3>
        <p style={{ fontFamily: C.sans, fontSize: '13px', color: C.faint, marginBottom: '16px', lineHeight: 1.6 }}>
          This will permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <FormField label='Type "DELETE" to confirm'>
          <FocusInput type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder="DELETE" />
        </FormField>
        <button
          onClick={handleDeleteAccount}
          disabled={deleteConfirm !== 'DELETE'}
          style={{
            padding: '9px 18px',
            background: deleteConfirm === 'DELETE' ? C.red : C.surface,
            border: `1px solid ${deleteConfirm === 'DELETE' ? C.red : C.border}`,
            borderRadius: '6px',
            color: deleteConfirm === 'DELETE' ? '#fff' : C.faint,
            fontFamily: C.mono, fontSize: '12px', fontWeight: 600,
            cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed',
            letterSpacing: '0.04em',
            transition: 'all 150ms',
          }}
        >
          Delete Account
        </button>
      </div>
    </SectionContainer>
  );
};

// SECTION: Notifications
const NotificationsSection = ({ currentUsername, onChange, onSuccess, onError }) => {
  const settings = useSettingsStore((state) => state.userSettings);
  const [settingsState, setSettingsState] = useState({
    emailAlerts: settings?.emailAlerts ?? true,
    regimeAlerts: settings?.regimeAlerts ?? true,
    weeklySummary: settings?.weeklySummary ?? true,
  });

  const handleToggle = (key) => {
    const updated = { ...settingsState, [key]: !settingsState[key] };
    setSettingsState(updated);
    onChange(true);
  };

  return (
    <SectionContainer title="Notifications" subtitle="Control how and when VektorLabs contacts you" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { ...settingsState })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <ToggleField
        label="Email Alerts"
        description="Receive signal alerts via email"
        checked={settingsState.emailAlerts}
        onChange={() => handleToggle('emailAlerts')}
      />
      <ToggleField
        label="Regime Transition Alerts"
        description="Notify on market regime changes"
        checked={settingsState.regimeAlerts}
        onChange={() => handleToggle('regimeAlerts')}
      />
      <ToggleField
        label="Weekly Performance Summary"
        description="Receive a weekly digest of signals and performance"
        checked={settingsState.weeklySummary}
        onChange={() => handleToggle('weeklySummary')}
      />
    </SectionContainer>
  );
};

// Add Symbol Modal
const AddSymbolModalWrapper = ({ onClose, onAdd }) => {
  const { data: symbols } = useQuery({
    queryKey: ['symbols-list'],
    queryFn: async () => {
      const res = await api.get('/symbols/list');
      return res.data.data;
    },
  });
  const [search, setSearch] = useState('');
  const activeSymbols = useSymbolStore((state) => state.activeSymbols);
  const addSymbol = useSymbolStore((state) => state.addSymbol);

  const filtered = (symbols || []).filter(s =>
    s.symbol?.toLowerCase().includes(search.toLowerCase()) &&
    !activeSymbols.find(a => a.id === s.symbol)
  );

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.85)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`,
        borderRadius: '10px', padding: '28px',
        width: '380px', maxHeight: '70vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: C.mono, fontSize: '14px', color: C.text, letterSpacing: '0.06em' }}>
            Add Symbol
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: C.faint,
            cursor: 'pointer', fontSize: '20px', lineHeight: 1,
            transition: 'color 100ms',
          }}
            onMouseEnter={e => e.currentTarget.style.color = C.text}
            onMouseLeave={e => e.currentTarget.style.color = C.faint}
          >
            ×
          </button>
        </div>

        <FocusInput
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbols..."
          style={{ marginBottom: '12px' }}
          autoFocus
        />

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.slice(0, 12).map((sym) => (
            <button
              key={sym.symbol}
              onClick={() => { addSymbol({ id: sym.symbol, label: sym.symbol, regime: 'unknown' }); onAdd(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '11px 12px',
                background: 'transparent',
                border: 'none',
                borderBottom: `1px solid ${C.border}30`,
                color: C.text, cursor: 'pointer',
                fontFamily: C.mono, fontSize: '13px', letterSpacing: '0.04em',
                textAlign: 'left',
                transition: 'background 80ms, color 80ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.color = C.accent; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.text; }}
            >
              <span style={{ color: C.faint, fontSize: '12px' }}>+</span>
              {sym.symbol}
            </button>
          ))}

          {filtered.length === 0 && (
            <div style={{ padding: '24px', textAlign: 'center', fontFamily: C.mono, fontSize: '12px', color: C.faint }}>
              No symbols found
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;