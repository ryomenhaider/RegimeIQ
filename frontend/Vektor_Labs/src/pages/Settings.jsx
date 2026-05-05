import React, { useState } from 'react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import { User, Shield, Key, Bell } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useSettings } from '../hooks/useSettings';

const Settings = () => {
  const { user } = useAuth();
  const { notifications, toggleNotifications, tradingMode, setTradingMode } = useSettings();
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => setIsSaving(false), 1000);
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-white tracking-tight">SETTINGS</h1>
        <p className="text-text-secondary mt-2">Manage your account, security, and terminal preferences.</p>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {/* Profile Section */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-bg-card-alt px-6 py-4 border-b border-border flex items-center gap-3">
            <User className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Profile Information</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Username</label>
                <div className="bg-bg-app border border-border rounded-sm px-4 py-2 text-text-primary font-mono">
                  {user.username}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted uppercase mb-2">Email Address</label>
                <input
                  type="email"
                  className="w-full bg-bg-app border border-border rounded-sm px-4 py-2 text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
                  defaultValue="trader@vektorlabs.io"
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Preferences Section */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-bg-card-alt px-6 py-4 border-b border-border flex items-center gap-3">
            <Bell className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Terminal Preferences</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Market Notifications</div>
                <p className="text-xs text-text-secondary">Receive alerts for regime changes and liquidity gaps.</p>
              </div>
              <button 
                onClick={toggleNotifications}
                className={`w-12 h-6 rounded-full transition-colors relative ${notifications ? 'bg-brand-primary' : 'bg-bg-card-alt'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${notifications ? 'left-7' : 'left-1'}`} />
              </button>
            </div>

            <div className="pt-4 border-t border-border">
              <label className="block text-xs font-semibold text-text-muted uppercase mb-4">Default Trading Mode</label>
              <div className="flex gap-4">
                {['standard', 'advanced', 'pro'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setTradingMode(mode)}
                    className={`flex-1 py-3 px-4 rounded-sm border text-xs font-bold uppercase tracking-widest transition-all ${
                      tradingMode === mode 
                        ? 'border-brand-primary bg-brand-primary/10 text-brand-primary' 
                        : 'border-border bg-bg-app text-text-secondary hover:text-white'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Security Section */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-bg-card-alt px-6 py-4 border-b border-border flex items-center gap-3">
            <Shield className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">Security</span>
          </div>
          <div className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Two-Factor Authentication</div>
                <p className="text-xs text-text-secondary">Add an extra layer of security to your account.</p>
              </div>
              <Button variant="outline" size="sm">Enable 2FA</Button>
            </div>
            
            <div className="pt-4 border-t border-border flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-white">Change Password</div>
                <p className="text-xs text-text-secondary">Update your password regularly to keep your account safe.</p>
              </div>
              <Button variant="secondary" size="sm">Update</Button>
            </div>
          </div>
        </Card>

        {/* API Keys Section */}
        <Card className="p-0 overflow-hidden">
          <div className="bg-bg-card-alt px-6 py-4 border-b border-border flex items-center gap-3">
            <Key className="h-4 w-4 text-brand-primary" />
            <span className="text-sm font-bold text-white uppercase tracking-widest">API Keys</span>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-text-secondary">Generate keys to programmatically interact with the VektorLabs data feeds.</p>
            <div className="bg-bg-app border border-dashed border-border p-8 rounded-sm text-center">
              <Key className="h-8 w-8 text-text-muted mx-auto mb-4" />
              <div className="text-sm font-medium text-text-primary mb-4">No API keys generated yet</div>
              <Button variant="primary">Generate New Key</Button>
            </div>
          </div>
        </Card>

        <div className="flex justify-end pt-4">
          <Button size="lg" className="px-12" onClick={handleSave} isLoading={isSaving}>
            Save All Changes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
