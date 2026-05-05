import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Settings, 
  CreditCard, 
  BookOpen, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { clsx } from 'clsx';
import { logout } from '../../services/auth';

const Sidebar = () => {
  const { username } = useParams();

  const navItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: `/dashboard/${username}`, end: true },
    { icon: Settings, label: 'Settings', path: `/dashboard/${username}/settings` },
    { icon: CreditCard, label: 'Billing', path: `/dashboard/${username}/billing` },
    { icon: BookOpen, label: 'Docs', path: '/docs' },
  ];

  return (
    <aside className="w-64 h-screen bg-bg-pure border-r border-border flex flex-col z-20">
      <div className="p-6 border-b border-border">
        <div className="text-xl font-bold tracking-tighter">
          VEKTOR<span className="text-brand-primary">LABS</span>
        </div>
      </div>

      <nav className="flex-1 py-6 px-4 space-y-2">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => clsx(
              'flex items-center justify-between px-4 py-3 rounded-sm text-sm font-medium transition-colors group',
              isActive 
                ? 'bg-brand-primary/10 text-brand-primary' 
                : 'text-text-secondary hover:bg-bg-card hover:text-text-primary'
            )}
          >
            <div className="flex items-center gap-3">
              <item.icon className="h-4 w-4" />
              {item.label}
            </div>
            <ChevronRight className={clsx(
              'h-3 w-3 opacity-0 transition-all -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0'
            )} />
          </NavLink>
        ))}
      </nav>

      <div className="p-4 mt-auto border-t border-border">
        <button
          onClick={() => logout()}
          className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-regime-illiquid hover:bg-regime-illiquid/10 rounded-sm transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
