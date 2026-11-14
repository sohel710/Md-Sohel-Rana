import React from 'react';
import {
  Bell,
  BookOpen,
  Home,
  MoreHorizontal,
  Plus,
  Users,
} from 'lucide-react';
import { AppTab, Language } from '../types/bookkeeping';
import { getT } from '../i18n/translations';

interface AppShellProps {
  activeTab: AppTab;
  lang: Language;
  offlineMode: boolean;
  pendingSyncCount: number;
  onSelectTab: (tab: AppTab) => void;
  onNewEntry: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  lang,
  offlineMode,
  pendingSyncCount,
  onSelectTab,
  onNewEntry,
  children,
}) => {
  const t = getT(lang);

  const navItems: Array<{ id: AppTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
    { id: 'home', label: t.nav.home, icon: Home },
    { id: 'people', label: t.nav.people, icon: Users },
    { id: 'ledger', label: t.nav.ledger, icon: BookOpen },
    { id: 'reminders', label: t.nav.reminders, icon: Bell },
    { id: 'more', label: t.nav.more, icon: MoreHorizontal },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex">
      {/* Desktop Sidebar */}
      <aside className="no-print hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 z-30">
        <div className="h-16 px-6 flex items-center border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="text-lg font-bold tracking-tight text-[#1769D2] dark:text-blue-400 whitespace-nowrap"
          >
            Due Note
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`w-full min-h-[44px] px-3.5 py-2.5 rounded-xl flex items-center gap-3 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-[#1769D2] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <p>{offlineMode ? 'Offline Storage Active' : 'Local + Cloud Ready'}</p>
          {pendingSyncCount > 0 && (
            <p className="text-amber-600 dark:text-amber-400 mt-0.5 font-mono-nums">
              {pendingSyncCount} pending sync
            </p>
          )}
        </div>
      </aside>

      {/* Main Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Bar (Strict 3-Zone Contract) */}
        <header className="no-print sticky top-0 z-20 h-14 px-4 sm:px-6 lg:px-8 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-8">
          <button
            type="button"
            onClick={() => onSelectTab('home')}
            className="text-base font-bold tracking-tight text-[#1769D2] dark:text-blue-400 whitespace-nowrap shrink-0 lg:hidden"
          >
            Due Note
          </button>

          <span className="hidden lg:inline text-sm font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
            {navItems.find((n) => n.id === activeTab)?.label}
          </span>

          <nav className="hidden md:flex lg:hidden items-center gap-5 text-sm font-medium text-slate-600 dark:text-slate-300">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`whitespace-nowrap shrink-0 hover:text-slate-900 dark:hover:text-white ${
                  activeTab === item.id ? 'text-[#1769D2] dark:text-blue-400 font-semibold' : ''
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <button
            type="button"
            onClick={onNewEntry}
            className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] hover:bg-[#1254AA] text-white inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {lang === 'bn' ? 'নতুন এন্ট্রি' : 'New Entry'}
          </button>
        </header>

        {/* Main Scrollable Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>

        {/* Mobile Fixed Bottom Navigation (5 Tabs) */}
        <nav className="no-print md:hidden fixed bottom-0 left-0 right-0 z-40 h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 grid grid-cols-5 items-center">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-1 ${
                  active ? 'text-[#1769D2] dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium tracking-tight truncate max-w-[68px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
};
