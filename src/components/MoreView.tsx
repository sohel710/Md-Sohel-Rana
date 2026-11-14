import React, { useState } from 'react';
import {
  Check,
  Cloud,
  CloudOff,
  Code2,
  Copy,
  Database,
  Download,
  Lock,
  Moon,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Sun,
  Upload,
} from 'lucide-react';
import {
  ANDROID_PROJECT_TREE,
  DEVELOPMENT_PHASES,
  PHASE1_FILES,
} from '../data/androidBlueprint';
import {
  AppSettings,
  BusinessMember,
  BusinessRecord,
  Language,
  SyncQueueItem,
  ThemeMode,
} from '../types/bookkeeping';
import { getT } from '../i18n/translations';
import { downloadJson, formatDateTime } from '../utils/currency';

interface MoreViewProps {
  business: BusinessRecord;
  members: BusinessMember[];
  settings: AppSettings;
  syncQueue: SyncQueueItem[];
  fullDatabaseExport: unknown;
  lang: Language;
  onSetLanguage: (lang: Language) => void;
  onSetTheme: (theme: ThemeMode) => void;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onUpdateBusiness: (patch: Partial<BusinessRecord>) => void;
  onSyncNow: () => void;
  onLockNow: () => void;
  onImportBackup: (raw: string) => boolean;
  onResetDemo: () => void;
}

export const MoreView: React.FC<MoreViewProps> = ({
  business,
  members,
  settings,
  syncQueue,
  fullDatabaseExport,
  lang,
  onSetLanguage,
  onSetTheme,
  onUpdateSettings,
  onUpdateBusiness,
  onSyncNow,
  onLockNow,
  onImportBackup,
  onResetDemo,
}) => {
  const t = getT(lang);
  const [activeSection, setActiveSection] = useState<'settings' | 'android'>('settings');
  const [selectedBlueprintId, setSelectedBlueprintId] = useState<string>(PHASE1_FILES[0].id);
  const [copiedCode, setCopiedCode] = useState(false);

  const [shopName, setShopName] = useState(business.name);
  const [shopAddress, setShopAddress] = useState(business.address);
  const [pinInput, setPinInput] = useState(settings.pinCode);
  const [notice, setNotice] = useState('');

  const selectedFile = PHASE1_FILES.find((f) => f.id === selectedBlueprintId) ?? PHASE1_FILES[0];

  const handleSaveShop = (e: React.FormEvent) => {
    e.preventDefault();
    if (!shopName.trim()) return;
    onUpdateBusiness({ name: shopName.trim(), address: shopAddress.trim() });
    setNotice(lang === 'bn' ? 'দোকানের তথ্য সংরক্ষণ করা হয়েছে' : 'Business profile updated');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleSavePin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pinInput)) {
      setNotice(lang === 'bn' ? 'পিন অবশ্যই ৪ সংখ্যার হতে হবে' : 'PIN must be exactly 4 digits');
      return;
    }
    onUpdateSettings({ pinCode: pinInput, pinEnabled: true });
    setNotice(lang === 'bn' ? '৪-সংখ্যার পিন লক চালু করা হয়েছে' : '4-digit PIN lock saved and enabled');
    setTimeout(() => setNotice(''), 2500);
  };

  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const ok = onImportBackup(reader.result);
        setNotice(
          ok
            ? lang === 'bn'
              ? 'ব্যাকআপ সফলভাবে রিস্টোর হয়েছে'
              : 'Backup restored successfully'
            : lang === 'bn'
            ? 'সঠিক Due Note JSON ব্যাকআপ ফাইল নির্বাচন করুন'
            : 'Invalid backup JSON file'
        );
      }
    };
    reader.readAsText(file);
  };

  const handleCopyCode = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 1800);
  };

  return (
    <div className="space-y-6">
      {/* Header & Top Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.nav.more}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.appName} · {t.tagline}
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setActiveSection('settings')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap ${
              activeSection === 'settings'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.more.businessProfile} & {t.more.security}
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('android')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap ${
              activeSection === 'android'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" />
            {t.more.androidBlueprint}
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
          {notice}
        </div>
      )}

      {activeSection === 'settings' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Business Profile */}
          <form
            onSubmit={handleSaveShop}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.more.businessProfile}</h2>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Shop Name</label>
              <input
                type="text"
                value={shopName}
                onChange={(e) => setShopName(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Address</label>
              <input
                type="text"
                value={shopAddress}
                onChange={(e) => setShopAddress(e.target.value)}
                className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div className="pt-1 flex items-center justify-between">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {members.length} Team Roles ({members.map((m) => m.role).join(' · ')})
              </p>
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white"
              >
                {t.ledger.saveEntry}
              </button>
            </div>
          </form>

          {/* Language & Appearance */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.more.preferences}</h2>

            <div className="flex items-center justify-between gap-4 py-2 border-b border-slate-100 dark:border-slate-800">
              <span className="text-sm font-medium">{t.more.languageLabel}</span>
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => onSetLanguage('en')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    lang === 'en' ? 'bg-white dark:bg-slate-900 text-[#1769D2]' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => onSetLanguage('bn')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${
                    lang === 'bn' ? 'bg-white dark:bg-slate-900 text-[#1769D2]' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  বাংলা
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-4 py-2">
              <span className="text-sm font-medium">{t.more.themeLabel}</span>
              <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <button
                  type="button"
                  onClick={() => onSetTheme('light')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 ${
                    settings.theme === 'light' ? 'bg-white text-[#1769D2]' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  {t.more.light}
                </button>
                <button
                  type="button"
                  onClick={() => onSetTheme('dark')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 ${
                    settings.theme === 'dark' ? 'bg-slate-900 text-blue-400' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  {t.more.dark}
                </button>
              </div>
            </div>
          </div>

          {/* Offline-First & Sync Queue */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {settings.offlineMode ? (
                  <CloudOff className="w-4 h-4 text-amber-500" />
                ) : (
                  <Cloud className="w-4 h-4 text-emerald-500" />
                )}
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.more.offlineSync}</h2>
              </div>
              <span className="text-xs font-mono-nums text-slate-500">
                {syncQueue.length > 0 ? `${syncQueue.length} ${t.more.pendingSyncItems}` : t.more.allSynced}
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lang === 'bn'
                ? 'ইন্টারনেট ছাড়াই সকল লেনদেন লোকাল ডাটাবেজে সংরক্ষিত হয় এবং অনলাইন হলে সিঙ্ক হয়।'
                : 'Transactions are saved to local storage first and queued for background synchronization.'}
            </p>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ offlineMode: !settings.offlineMode })}
                className={`min-h-[42px] px-3.5 py-2 text-xs font-semibold rounded-xl border ${
                  settings.offlineMode
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
              >
                {settings.offlineMode ? 'Offline Mode: ON' : t.more.offlineToggle}
              </button>
              <button
                type="button"
                onClick={onSyncNow}
                className="min-h-[42px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                {t.more.syncNow}
              </button>
            </div>
          </div>

          {/* Security & PIN Lock */}
          <form
            onSubmit={handleSavePin}
            className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#1769D2]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.more.security}</h2>
              </div>
              <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.pinEnabled}
                  onChange={(e) => onUpdateSettings({ pinEnabled: e.target.checked })}
                  className="w-4 h-4 accent-[#1769D2]"
                />
                PIN Active
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                value={pinInput}
                onChange={(e) => setPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="4-digit PIN"
                className="w-36 min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 font-mono-nums text-sm"
              />
              <button
                type="submit"
                className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white"
              >
                Save PIN
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateSettings({ pinEnabled: true, pinCode: pinInput || '1234' });
                  onLockNow();
                }}
                className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5"
              >
                <Lock className="w-3.5 h-3.5" />
                {t.more.lockNow}
              </button>
            </div>
          </form>

          {/* Backup & Restore */}
          <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#1769D2]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">{t.more.backupRestore}</h2>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {settings.lastBackupAt
                  ? `Last backup: ${formatDateTime(settings.lastBackupAt, lang)}`
                  : 'Export complete local database to JSON or restore from a saved file.'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  downloadJson(`duenote-backup-${new Date().toISOString().split('T')[0]}.json`, fullDatabaseExport);
                  onUpdateSettings({ lastBackupAt: new Date().toISOString() });
                }}
                className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                {t.more.exportBackup}
              </button>

              <label className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800">
                <Upload className="w-4 h-4" />
                {t.more.importBackup}
                <input type="file" accept="application/json" onChange={handleRestoreFile} className="hidden" />
              </label>

              <button
                type="button"
                onClick={() => {
                  onResetDemo();
                  setNotice(lang === 'bn' ? 'ডেমো ডাটা রিসেট করা হয়েছে' : 'Demo data reset to Sohel General Store defaults');
                }}
                className="min-h-[44px] px-3.5 py-2 text-xs font-medium rounded-xl border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 inline-flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.dashboard.resetDemo}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Android Studio Phase 1 Blueprint & Code Explorer */
        <div className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Android Studio Clean Architecture Tree
              </h2>
              <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-100 text-[11px] font-mono overflow-x-auto leading-relaxed">
                {ANDROID_PROJECT_TREE}
              </pre>
            </div>

            <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                10-Phase Delivery & Play Store Readiness
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {DEVELOPMENT_PHASES.map((p) => (
                  <div key={p.phase} className="py-2 flex items-center justify-between gap-3 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Phase {p.phase}: {p.title}
                    </span>
                    <span className="text-[11px] text-[#1769D2] dark:text-blue-400 font-semibold shrink-0">
                      {p.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
                {PHASE1_FILES.map((file) => (
                  <button
                    key={file.id}
                    type="button"
                    onClick={() => setSelectedBlueprintId(file.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${
                      selectedBlueprintId === file.id
                        ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {file.title}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleCopyCode(selectedFile.code)}
                className="min-h-[40px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5 shrink-0"
              >
                {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                {copiedCode ? 'Copied Code' : 'Copy Code'}
              </button>
            </div>

            <div>
              <p className="text-xs font-mono text-[#1769D2] dark:text-blue-400">{selectedFile.path}</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">{selectedFile.explanation}</p>
            </div>

            <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 text-xs font-mono overflow-x-auto max-h-[460px] leading-relaxed">
              {selectedFile.code}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
