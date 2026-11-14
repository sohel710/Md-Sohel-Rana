import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Play,
  Plus,
  Receipt,
  RotateCcw,
  UserPlus,
  Users,
  Store,
} from 'lucide-react';
import {
  AppTab,
  BusinessRecord,
  CustomerRecord,
  Language,
  TransactionRecord,
} from '../types/bookkeeping';
import { getT } from '../i18n/translations';
import { formatCount, formatDateTime, formatTaka } from '../utils/currency';
import { TransactionModalMode } from './TransactionModal';

interface DashboardViewProps {
  business: BusinessRecord;
  metrics: {
    customerCount: number;
    supplierCount: number;
    totalReceivablePaisa: number;
    totalPayablePaisa: number;
    netPositionPaisa: number;
    todayReceivedPaisa: number;
    todayGivenPaisa: number;
  };
  transactions: TransactionRecord[];
  lang: Language;
  onOpenTxModal: (mode: TransactionModalMode) => void;
  onNavigateTab: (tab: AppTab) => void;
  onOpenAddCustomer: () => void;
  onRunGuidedDemo: () => CustomerRecord;
  onInspectCustomer: (customer: CustomerRecord) => void;
  onResetDemo: () => void;
}

const MONTHLY_CHART_DATA = [
  { month: 'Jun', monthBn: 'জুন', income: 112000, expense: 31000 },
  { month: 'Jul', monthBn: 'জুলাই', income: 128000, expense: 34500 },
  { month: 'Aug', monthBn: 'আগস্ট', income: 118500, expense: 29800 },
  { month: 'Sep', monthBn: 'সেপ্ট', income: 141000, expense: 36200 },
  { month: 'Oct', monthBn: 'অক্টো', income: 154500, expense: 38900 },
  { month: 'Nov', monthBn: 'নভে', income: 162000, expense: 33400 },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  business,
  metrics,
  transactions,
  lang,
  onOpenTxModal,
  onNavigateTab,
  onOpenAddCustomer,
  onRunGuidedDemo,
  onInspectCustomer,
  onResetDemo,
}) => {
  const t = getT(lang);
  const [demoCustomer, setDemoCustomer] = useState<CustomerRecord | null>(null);

  const maxChartVal = Math.max(...MONTHLY_CHART_DATA.map((d) => Math.max(d.income, d.expense)));
  const recentTx = transactions.slice(0, 6);

  const handleRunDemo = () => {
    const created = onRunGuidedDemo();
    setDemoCustomer(created);
  };

  return (
    <div className="space-y-6">
      {/* Shop Overview Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium text-[#1769D2] dark:text-blue-400">
            {lang === 'bn' ? 'ডেমো দোকান · অফলাইন-প্রস্তুত খাতা' : 'Demo Shop · Offline-Ready Khata'}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 mt-1 text-balance">
            {lang === 'bn' ? business.nameBn : business.name}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {business.ownerName} · {business.address} · {business.category}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenTxModal('CUSTOMER_CREDIT')}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <ArrowUpRight className="w-4 h-4" />
            {t.dashboard.giveCredit}
          </button>
          <button
            type="button"
            onClick={() => onOpenTxModal('CUSTOMER_PAYMENT')}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
          >
            <ArrowDownLeft className="w-4 h-4" />
            {t.dashboard.receivePayment}
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.dashboard.totalReceivable}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-nums text-emerald-600 dark:text-emerald-400 mt-2">
            {formatTaka(metrics.totalReceivablePaisa, lang)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {t.dashboard.totalReceivableSub} · {formatCount(metrics.customerCount, lang)} {t.dashboard.totalCustomers}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.dashboard.totalPayable}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-nums text-red-600 dark:text-red-400 mt-2">
            {formatTaka(metrics.totalPayablePaisa, lang)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {t.dashboard.totalPayableSub} · {formatCount(metrics.supplierCount, lang)} {t.dashboard.totalSuppliers}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.dashboard.todayReceived}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-nums text-[#1769D2] dark:text-blue-400 mt-2">
            {formatTaka(metrics.todayReceivedPaisa, lang)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {t.dashboard.todayGiven}: <span className="font-mono-nums">{formatTaka(metrics.todayGivenPaisa, lang)}</span>
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {t.dashboard.netPosition}
          </p>
          <p className="text-2xl sm:text-3xl font-bold font-mono-nums text-slate-900 dark:text-slate-100 mt-2">
            {formatTaka(metrics.netPositionPaisa, lang)}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
            {lang === 'bn' ? 'পাওনা বনাম দেনার পার্থক্য' : 'Receivable minus Payable'}
          </p>
        </div>
      </div>

      {/* Interactive Demo Sandbox */}
      <div className="p-5 rounded-2xl bg-[#1769D2]/6 dark:bg-blue-950/30 border border-[#1769D2]/20 dark:border-blue-800/60 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t.dashboard.demoSandboxTitle}
          </h2>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-2xl">
            {t.dashboard.demoSandboxDesc}
          </p>
          {demoCustomer && (
            <p className="text-xs font-medium text-emerald-700 dark:text-emerald-300 pt-1">
              {t.dashboard.demoCompleted}: {demoCustomer.name} — ৳5,000 − ৳2,000 ={' '}
              <span className="font-mono-nums font-bold">{formatTaka(demoCustomer.balancePaisa, lang)}</span>
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleRunDemo}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] hover:bg-[#1254AA] text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Play className="w-3.5 h-3.5" />
            {t.dashboard.runDemoFlow}
          </button>
          {demoCustomer && (
            <button
              type="button"
              onClick={() => onInspectCustomer(demoCustomer)}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 whitespace-nowrap"
            >
              {t.people.viewLedger}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              onResetDemo();
              setDemoCustomer(null);
            }}
            className="min-h-[44px] px-3 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {t.dashboard.resetDemo}
          </button>
        </div>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={onOpenAddCustomer}
          className="min-h-[56px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#1769D2] flex items-center gap-3 text-left transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-[#1769D2]/10 text-[#1769D2] dark:text-blue-400 flex items-center justify-center shrink-0">
            <UserPlus className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.dashboard.addCustomer}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenTxModal('EXPENSE')}
          className="min-h-[56px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#1769D2] flex items-center gap-3 text-left transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <Receipt className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.dashboard.addExpense}</span>
        </button>

        <button
          type="button"
          onClick={() => onOpenTxModal('SUPPLIER_PAYMENT')}
          className="min-h-[56px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#1769D2] flex items-center gap-3 text-left transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center shrink-0">
            <Store className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">{t.ledger.supplierPaymentTitle}</span>
        </button>

        <button
          type="button"
          onClick={() => onNavigateTab('people')}
          className="min-h-[56px] p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-[#1769D2] flex items-center gap-3 text-left transition-colors"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
            {formatCount(metrics.customerCount, lang)} {t.people.customers}
          </span>
        </button>
      </div>

      {/* Main 2-Column Content: Monthly Income & Expense Chart + Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Chart */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2 mb-4">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.dashboard.monthlyChartTitle}
            </h2>
            <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-[#1769D2]" />
                {t.dashboard.income}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 dark:bg-slate-600" />
                {t.dashboard.expense}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-6 gap-3 items-end h-48 pt-4">
            {MONTHLY_CHART_DATA.map((item) => {
              const incH = Math.max(12, Math.round((item.income / maxChartVal) * 140));
              const expH = Math.max(8, Math.round((item.expense / maxChartVal) * 140));
              return (
                <div key={item.month} className="flex flex-col items-center justify-end h-full">
                  <div className="flex items-end gap-1.5 h-[145px]">
                    <div
                      style={{ height: `${incH}px` }}
                      title={`${t.dashboard.income}: ৳${item.income.toLocaleString()}`}
                      className="w-3.5 sm:w-4 rounded-t-md bg-[#1769D2] transition-all"
                    />
                    <div
                      style={{ height: `${expH}px` }}
                      title={`${t.dashboard.expense}: ৳${item.expense.toLocaleString()}`}
                      className="w-3.5 sm:w-4 rounded-t-md bg-slate-300 dark:bg-slate-700 transition-all"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-2">
                    {lang === 'bn' ? item.monthBn : item.month}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              {t.dashboard.recentTransactions}
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('ledger')}
              className="text-xs font-semibold text-[#1769D2] dark:text-blue-400 hover:underline min-h-[36px] px-2"
            >
              {t.dashboard.viewAll}
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
            {recentTx.map((tx) => {
              const isIncoming = tx.kind === 'CUSTOMER_PAYMENT';
              return (
                <div key={tx.id} className="flex items-center justify-between gap-3 py-3 min-h-[56px]">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                        tx.kind === 'REVERSAL'
                          ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          : isIncoming
                          ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isIncoming ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${tx.reversedByTxId ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                        {tx.partyName}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {tx.note} · {formatDateTime(tx.date, lang)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={`text-sm font-bold font-mono-nums ${
                        tx.reversedByTxId
                          ? 'text-slate-400 line-through'
                          : isIncoming
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {isIncoming ? '+' : '-'}
                      {formatTaka(tx.amountPaisa, lang)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {tx.syncStatus === 'pending' ? (lang === 'bn' ? 'অফলাইন অপেক্ষমাণ' : 'Pending Sync') : tx.kind.replace('_', ' ')}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating mobile quick entry trigger */}
      <div className="sm:hidden flex justify-end">
        <button
          type="button"
          onClick={() => onOpenTxModal('CUSTOMER_CREDIT')}
          className="w-full min-h-[48px] rounded-xl bg-[#1769D2] text-white font-semibold text-sm inline-flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          {t.dashboard.giveCredit} / {t.dashboard.receivePayment}
        </button>
      </div>
    </div>
  );
};
