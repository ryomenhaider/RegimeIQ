import React from 'react';
import { useParams } from 'react-router-dom';
import { Bell, Search, User } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';

const Topbar = () => {
  const { username } = useParams();
  const plan = useAuthStore((state) => state.plan);

  return (
    <header className="h-16 bg-bg-app border-b border-border flex items-center justify-between px-8 z-10 sticky top-0">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search symbols, orders, or documentation..."
            className="w-full bg-bg-card border border-border rounded-sm pl-10 pr-4 py-2 text-sm text-text-primary focus:outline-none focus:border-brand-primary transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end">
          <span className="text-xs font-bold text-brand-primary uppercase tracking-widest">{plan || 'Standard'} Plan</span>
          <span className="text-sm font-medium text-text-primary">{username}</span>
        </div>
        
        <div className="flex items-center gap-2">
          <button className="p-2 text-text-secondary hover:text-white transition-colors relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-regime-illiquid rounded-full border-2 border-bg-app" />
          </button>
          <div className="h-8 w-8 rounded-full bg-bg-card border border-border flex items-center justify-center text-brand-primary font-bold text-xs">
            {username?.[0]?.toUpperCase()}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
