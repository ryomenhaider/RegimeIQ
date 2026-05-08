import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../store/authStore';
import { useSettingsStore } from '../store/settingsStore';
import { useSymbolStore } from '../store/symbolStore';
import { COLORS } from '../utils/constants';
import toast from 'react-hot-toast';
import api from '../services/api';

const ADD_SYMBOL_MODAL_PATTERN = () => import('../components/dashboard/SymbolTabs');

const SECTIONS = [
  { id: 'symbols', label: 'Symbols' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'altdata', label: 'Alt Data' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'account', label: 'Account' },
  { id: 'notifications', label: 'Notifications' },
];

const PLAN_LIMITS = { trial: 3, standard: 10, unlimited: Infinity };

const Settings = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  const currentUsername = useAuthStore((state) => state.username);
  const plan = useAuthStore((state) => state.plan);
  
  const [activeSection, setActiveSection] = useState('symbols');
  const [unsavedChanges, setUnsavedChanges] = useState({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const userPlan = plan || 'trial';
  const symbolLimit = PLAN_LIMITS[userPlan] || PLAN_LIMITS.trial;

  useEffect(() => {
    if (username !== currentUsername) {
      navigate(`/dashboard/${currentUsername}/settings`);
    }
  }, [username, currentUsername, navigate]);

  const handleSuccess = (section) => {
    toast.success('Settings saved.');
    setUnsavedChanges(prev => ({ ...prev, [section]: false }));
  };

  const handleError = (message) => {
    toast.error(message);
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'symbols':
        return <SymbolsSection limit={symbolLimit} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, symbols: v }))} onSuccess={() => handleSuccess('symbols')} onError={handleError} />;
      case 'alerts':
        return <AlertsSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, alerts: v }))} onSuccess={() => handleSuccess('alerts')} onError={handleError} />;
      case 'altdata':
        return <AltDataSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, altdata: v }))} onSuccess={() => handleSuccess('altdata')} onError={handleError} />;
      case 'dashboard':
        return <DashboardSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, dashboard: v }))} onSuccess={() => handleSuccess('dashboard')} onError={handleError} />;
      case 'account':
        return <AccountSection currentUsername={currentUsername} onSuccess={() => handleSuccess('account')} onError={handleError} />;
      case 'notifications':
        return <NotificationsSection currentUsername={currentUsername} onChange={(v) => setUnsavedChanges(prev => ({ ...prev, notifications: v }))} onSuccess={() => handleSuccess('notifications')} onError={handleError} />;
      default:
        return null;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0b0b1a', display: 'flex' }}>
      {/* Mobile menu toggle */}
      <div style={{ 
        display: 'none',
        padding: '12px',
        borderBottom: '1px solid #2a2a4a',
        '@media (max-width: 768px)': { display: 'block' }
      }} className="mobile-header">
        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          style={{ 
            padding: '8px 12px', 
            background: '#11112a', 
            border: '1px solid #2a2a4a', 
            borderRadius: '6px',
            color: '#fff',
            cursor: 'pointer'
          }}
        >
          {mobileMenuOpen ? 'Close' : 'Menu'}
        </button>
      </div>

      {/* Sidebar */}
      <aside style={{
        width: '220px',
        background: '#050510',
        borderRight: '1px solid #2a2a4a',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto'
      }} className="sidebar">
        <h2 style={{ 
          padding: '0 16px 16px', 
          fontSize: '14px', 
          fontFamily: 'IBM Plex Mono, monospace',
          color: '#fff',
          borderBottom: '1px solid #2a2a4a',
          marginBottom: '16px'
        }}>
          Settings
        </h2>
        
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              width: '100%',
              padding: '12px 16px',
              background: activeSection === section.id ? '#11112a' : 'transparent',
              border: 'none',
              borderLeft: activeSection === section.id ? `3px solid ${COLORS.accent}` : '3px solid transparent',
              color: activeSection === section.id ? '#fff' : '#888',
              cursor: 'pointer',
              textAlign: 'left',
              fontSize: '13px',
              fontFamily: 'IBM Plex Mono, monospace',
              transition: 'all 100ms'
            }}
          >
            {section.label}
            {unsavedChanges[section.id] && (
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#f5c542',
                marginLeft: '8px'
              }} />
            )}
          </button>
        ))}
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
        {renderSection()}
      </main>

      <style>{`
        @media (max-width: 768px) {
          .sidebar { display: none; }
          .mobile-header { display: block !important; }
        }
      `}</style>
    </div>
  );
};

// SECTION: Symbols
const SymbolsSection = ({ limit, onChange, onSuccess, onError }) => {
  const activeSymbols = useSymbolStore((state) => state.activeSymbols);
  const removeSymbol = useSymbolStore((state) => state.removeSymbol);
  const [showAddModal, setShowAddModal] = useState(false);

  const symbolsUsed = activeSymbols.length;

  return (
    <SectionContainer title="Symbols" onSave={() => onSuccess()}>
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
          <span style={{ fontSize: '12px', color: '#888' }}>
            {symbolsUsed} of {limit === Infinity ? '∞' : limit} symbols used
          </span>
        </div>
        <div style={{ height: '4px', background: '#1a1a2e', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${Math.min((symbolsUsed / limit) * 100, 100)}%`, 
            height: '100%', 
            background: symbolsUsed >= limit ? COLORS.red : COLORS.accent,
            transition: 'width 300ms'
          }} />
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {activeSymbols.map((symbol) => (
          <div key={symbol.id} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 12px',
            background: '#11112a',
            borderRadius: '6px'
          }}>
            <span style={{ fontFamily: 'IBM Plex Mono, monospace', color: '#fff' }}>
              {symbol.label}
            </span>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {symbol.insufficientData && (
                <span style={{ fontSize: '10px', padding: '2px 6px', background: '#2a1500', color: '#f5c542', borderRadius: '4px' }}>
                  Insufficient data
                </span>
              )}
              <button
                onClick={() => {
                  removeSymbol(symbol.id);
                  onChange(true);
                }}
                style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '14px' }}
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        disabled={symbolsUsed >= limit}
        style={{
          padding: '10px 16px',
          background: symbolsUsed >= limit ? '#2a2a4a' : COLORS.accent,
          border: 'none',
          borderRadius: '6px',
          color: symbolsUsed >= limit ? '#666' : '#0b0b1a',
          fontSize: '12px',
          fontFamily: 'IBM Plex Mono, monospace',
          cursor: symbolsUsed >= limit ? 'not-allowed' : 'pointer'
        }}
      >
        Add Symbol
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

  const validateDiscordUrl = (url) => {
    return /^https:\/\/discord\.com\/api\/webhooks\/\d+\/[\w-]+$/.test(url);
  };

  const handleTestWebhook = async () => {
    if (!validateDiscordUrl(discordUrl)) {
      setTestStatus({ success: false, message: 'Invalid Discord webhook URL' });
      return;
    }
    try {
      await api.post(`/users/${currentUsername}/alerts/test`);
      setTestStatus({ success: true, message: '✓ Test message sent' });
    } catch (e) {
      setTestStatus({ success: false, message: e.response?.data?.message || 'Failed to send test' });
    }
  };

  return (
    <SectionContainer title="Alerts" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { discordWebhook: discordUrl, confluenceThreshold, regimeConfidenceThreshold })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <FormField label="Discord Webhook URL">
        <div style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={discordUrl}
            onChange={(e) => { setDiscordUrl(e.target.value); onChange(true); }}
            placeholder="https://discord.com/api/webhooks/..."
            style={inputStyle}
          />
          <button onClick={handleTestWebhook} style={{ ...buttonStyle, background: '#11112a' }}>
            Test
          </button>
        </div>
        {testStatus && (
          <span style={{ fontSize: '11px', color: testStatus.success ? COLORS.accent : COLORS.red, marginTop: '4px', display: 'block' }}>
            {testStatus.message}
          </span>
        )}
      </FormField>

      <FormField label={`Confluence Threshold (${confluenceThreshold})`}>
        <input
          type="range"
          min="0.5"
          max="0.95"
          step="0.05"
          value={confluenceThreshold}
          onChange={(e) => { setConfluenceThreshold(Number(e.target.value)); onChange(true); }}
          style={{ width: '100%' }}
        />
      </FormField>

      <FormField label={`Regime Confidence Threshold (${regimeConfidenceThreshold * 100}%)`}>
        <input
          type="range"
          min="0.5"
          max="0.95"
          step="0.05"
          value={regimeConfidenceThreshold}
          onChange={(e) => { setRegimeConfidenceThreshold(Number(e.target.value)); onChange(true); }}
          style={{ width: '100%' }}
        />
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
    <SectionContainer title="Alt Data" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { redditSubreddits: subreddits, googleTrendsKeywords: keywords, fredSeries })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <FormField label="Reddit Subreddits">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={newSubreddit}
            onChange={(e) => setNewSubreddit(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubreddit()}
            placeholder="Enter subreddit name"
            style={inputStyle}
          />
          <button onClick={addSubreddit} style={buttonStyle}>Add</button>
        </div>
        <TagList tags={subreddits} onRemove={(r) => { setSubreddits(subreddits.filter(s => s !== r)); onChange(true); }} />
      </FormField>

      <FormField label="Google Trends Keywords">
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
            placeholder="Enter keyword"
            style={inputStyle}
          />
          <button onClick={addKeyword} style={buttonStyle}>Add</button>
        </div>
        <TagList tags={keywords} onRemove={(k) => { setKeywords(keywords.filter(w => w !== k)); onChange(true); }} />
      </FormField>

      <FormField label="FRED Series">
        <select
          value={selectedFred}
          onChange={(e) => setSelectedFred(Array.from(e.target.selectedOptions, o => o.value))}
          multiple
          style={{ ...inputStyle, height: '100px' }}
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
    <SectionContainer title="Dashboard" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { defaultTab, timezone })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <FormField label="Default Tab">
        <div style={{ display: 'flex', gap: '16px' }}>
          {['microstructure', 'regime', 'altdata', 'causal'].map((tab) => (
            <label key={tab} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#fff', fontSize: '12px' }}>
              <input
                type="radio"
                name="defaultTab"
                checked={defaultTab === tab}
                onChange={() => { setDefaultTab(tab); onChange(true); }}
              />
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </label>
          ))}
        </div>
      </FormField>

      <FormField label="Reset Layout">
        <button onClick={handleResetLayout} style={{ ...buttonStyle, background: '#2a1500', color: COLORS.red }}>
          Reset Layout
        </button>
      </FormField>

      <FormField label="Display Timezone">
        <select
          value={timezone}
          onChange={(e) => { setTimezone(e.target.value); onChange(true); }}
          style={inputStyle}
        >
          <option value="America/New_York">America/New_York</option>
          <option value="America/Los_Angeles">America/Los_Angeles</option>
          <option value="Europe/London">Europe/London</option>
          <option value="Asia/Tokyo">Asia/Tokyo</option>
          <option value="UTC">UTC</option>
        </select>
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
      setEmailCurrent('');
      setEmailNew('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change email');
    }
  };

  const handleChangePassword = async () => {
    if (passwordNew !== passwordConfirm) {
      toast.error('Passwords do not match');
      return;
    }
    try {
      await api.patch(`/users/${currentUsername}/account`, { currentPassword: passwordCurrent, newPassword: passwordNew });
      toast.success('Password changed successfully');
      setPasswordCurrent('');
      setPasswordNew('');
      setPasswordConfirm('');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== 'DELETE') {
      toast.error('Type DELETE to confirm');
      return;
    }
    try {
      await api.delete(`/users/${currentUsername}`, { data: { confirmation: 'DELETE', current_password: '' } });
      clearAuth();
      navigate('/');
    } catch (e) {
      toast.error(e.response?.data?.message || 'Failed to delete account');
    }
  };

  return (
    <SectionContainer title="Account" onSave={() => {}}>
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '16px' }}>Change Email</h3>
        <FormField label="Current Password">
          <input type="password" value={emailCurrent} onChange={(e) => setEmailCurrent(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="New Email">
          <input type="email" value={emailNew} onChange={(e) => setEmailNew(e.target.value)} style={inputStyle} />
        </FormField>
        <button onClick={handleChangeEmail} style={buttonStyle}>Change Email</button>
      </div>

      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '14px', color: '#fff', marginBottom: '16px' }}>Change Password</h3>
        <FormField label="Current Password">
          <input type="password" value={passwordCurrent} onChange={(e) => setPasswordCurrent(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="New Password">
          <input type="password" value={passwordNew} onChange={(e) => setPasswordNew(e.target.value)} style={inputStyle} />
        </FormField>
        <FormField label="Confirm Password">
          <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} style={inputStyle} />
        </FormField>
        <button onClick={handleChangePassword} style={buttonStyle}>Change Password</button>
      </div>

      <div style={{ background: '#1a0005', padding: '16px', borderRadius: '6px', border: `1px solid ${COLORS.red}` }}>
        <h3 style={{ fontSize: '14px', color: COLORS.red, marginBottom: '8px' }}>Delete Account</h3>
        <p style={{ fontSize: '12px', color: '#888', marginBottom: '16px' }}>
          This will permanently delete your account and all associated data. This action cannot be undone.
        </p>
        <FormField label="Type DELETE to confirm">
          <input type="text" value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} style={inputStyle} />
        </FormField>
        <button 
          onClick={handleDeleteAccount} 
          disabled={deleteConfirm !== 'DELETE'}
          style={{ 
            ...buttonStyle, 
            background: deleteConfirm === 'DELETE' ? COLORS.red : '#2a2a4a',
            color: deleteConfirm === 'DELETE' ? '#fff' : '#666',
            cursor: deleteConfirm === 'DELETE' ? 'pointer' : 'not-allowed'
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
    <SectionContainer title="Notifications" onSave={() => {
      api.patch(`/users/${currentUsername}/settings`, { ...settingsState })
        .then(() => { onChange(false); onSuccess(); })
        .catch((e) => onError(e.response?.data?.message || 'Failed to save'));
    }}>
      <ToggleField 
        label="Email alerts" 
        checked={settingsState.emailAlerts} 
        onChange={() => handleToggle('emailAlerts')} 
      />
      <ToggleField 
        label="Regime transition alerts" 
        checked={settingsState.regimeAlerts} 
        onChange={() => handleToggle('regimeAlerts')} 
      />
      <ToggleField 
        label="Weekly performance summary" 
        checked={settingsState.weeklySummary} 
        onChange={() => handleToggle('weeklySummary')} 
      />
    </SectionContainer>
  );
};

// HELPERS
const SectionContainer = ({ title, children, onSave }) => (
  <div style={{ maxWidth: '600px' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
      <h2 style={{ fontSize: '20px', fontFamily: 'IBM Plex Mono, monospace', color: '#fff' }}>{title}</h2>
      <button onClick={onSave} style={buttonStyle}>Save</button>
    </div>
    {children}
  </div>
);

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: '20px' }}>
    <label style={{ display: 'block', fontSize: '12px', color: '#888', marginBottom: '6px' }}>{label}</label>
    {children}
  </div>
);

const TagList = ({ tags, onRemove }) => (
  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
    {tags.map((tag, i) => (
      <span key={i} style={{ 
        display: 'flex', alignItems: 'center', gap: '4px',
        padding: '4px 8px', background: '#1a1a2e', borderRadius: '4px',
        fontSize: '11px', fontFamily: 'IBM Plex Mono, monospace', color: '#fff'
      }}>
        {tag}
        <button onClick={() => onRemove(tag)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', padding: 0 }}>×</button>
      </span>
    ))}
  </div>
);

const ToggleField = ({ label, checked, onChange }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '12px', background: '#11112a', borderRadius: '6px' }}>
    <span style={{ fontSize: '13px', color: '#fff' }}>{label}</span>
    <button 
      onClick={onChange}
      style={{
        width: '44px', height: '24px', borderRadius: '12px', padding: '2px',
        background: checked ? COLORS.accent : '#2a2a4a',
        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 200ms'
      }}
    >
      <div style={{
        width: '20px', height: '20px', borderRadius: '50%',
        background: '#fff',
        position: 'absolute', top: '2px', left: checked ? '22px' : '2px',
        transition: 'left 200ms'
      }} />
    </button>
  </div>
);

const AddSymbolModalWrapper = ({ currentUsername, onClose, onAdd }) => {
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
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }}>
      <div style={{ background: '#11112a', padding: '24px', borderRadius: '8px', width: '400px', maxHeight: '80vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: '16px', color: '#fff', marginBottom: '16px' }}>Add Symbol</h3>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search symbols..."
          style={{ ...inputStyle, marginBottom: '16px' }}
        />
        {filtered.slice(0, 10).map((sym) => (
          <div 
            key={sym.symbol}
            onClick={() => { addSymbol({ id: sym.symbol, label: sym.symbol, regime: 'unknown' }); onAdd(); }}
            style={{ padding: '10px', cursor: 'pointer', borderBottom: '1px solid #2a2a4a', color: '#fff' }}
          >
            {sym.symbol}
          </div>
        ))}
        <button onClick={onClose} style={{ ...buttonStyle, marginTop: '16px', background: '#2a2a4a' }}>Cancel</button>
      </div>
    </div>
  );
};

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  background: '#0b0b1a',
  border: '1px solid #2a2a4a',
  borderRadius: '6px',
  color: '#fff',
  fontSize: '13px',
  fontFamily: 'IBM Plex Mono, monospace',
};

const buttonStyle = {
  padding: '10px 16px',
  background: COLORS.accent,
  border: 'none',
  borderRadius: '6px',
  color: '#0b0b1a',
  fontSize: '12px',
  fontFamily: 'IBM Plex Mono, monospace',
  cursor: 'pointer',
};

export default Settings;