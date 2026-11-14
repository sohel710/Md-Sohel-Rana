import React, { useMemo, useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  Download,
  FileText,
  MessageSquare,
  MessageSquareReply,
  Send,
} from 'lucide-react';
import {
  CustomerRecord,
  ExpenseRecord,
  Language,
  ReminderChannel,
  ReminderRecord,
  SupplierRecord,
  TransactionRecord,
} from '../types/bookkeeping';
import { getT } from '../i18n/translations';
import {
  downloadCsv,
  formatCount,
  formatDateShort,
  formatDateTime,
  formatTaka,
  fromPaisa,
} from '../utils/currency';

interface ReportsViewProps {
  shopName: string;
  customers: CustomerRecord[];
  suppliers: SupplierRecord[];
  transactions: TransactionRecord[];
  expenses: ExpenseRecord[];
  reminders: ReminderRecord[];
  lang: Language;
  onAddReminder: (input: {
    customerId: string;
    dueDate: string;
    channel: ReminderChannel;
    message: string;
    sendImmediately?: boolean;
  }) => void;
  onMarkReminderSent: (id: string) => void;
  onAddReminderReply: (id: string, replyNote: string) => void;
  onOpenPrintStatement: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  shopName,
  customers,
  suppliers,
  transactions,
  expenses,
  reminders,
  lang,
  onAddReminder,
  onMarkReminderSent,
  onAddReminderReply,
  onOpenPrintStatement,
}) => {
  const t = getT(lang);
  const [section, setSection] = useState<'reminders' | 'reports'>('reminders');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('monthly');

  const dueCustomers = useMemo(
    () =>
      customers
        .filter((c) => !c.archived && c.balancePaisa > 0)
        .sort((a, b) => b.balancePaisa - a.balancePaisa),
    [customers]
  );

  const dueSuppliers = useMemo(
    () =>
      suppliers
        .filter((s) => !s.archived && s.balancePaisa > 0)
        .sort((a, b) => b.balancePaisa - a.balancePaisa),
    [suppliers]
  );

  const [selectedCustId, setSelectedCustId] = useState<string>(() => dueCustomers[0]?.id || '');
  const [channel, setChannel] = useState<ReminderChannel>('WhatsApp');
  const [dueDate, setDueDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [replyingId, setReplyingId] = useState<string | null>(null);

  const selectedCustomer = dueCustomers.find((c) => c.id === selectedCustId) ?? dueCustomers[0];
  const buildTemplateMessage = (cust: CustomerRecord | undefined) => {
    if (!cust) return '';
    return lang === 'bn'
      ? `আসসালামু আলাইকুম ${cust.name}, ${shopName}-এ আপনার বকেয়া ${formatTaka(cust.balancePaisa, 'bn')}। অনুগ্রহ করে পরিশোধ করবেন।`
      : `Hello ${cust.name}, friendly reminder from ${shopName} regarding your due balance of ${formatTaka(cust.balancePaisa, 'en')}. Thank you!`;
  };

  const [messageDraft, setMessageDraft] = useState<string>(() =>
    buildTemplateMessage(selectedCustomer)
  );

  const periodCutoffMs = useMemo(() => {
    const now = Date.now();
    if (period === 'daily') return now - 1 * 86400_000;
    if (period === 'weekly') return now - 7 * 86400_000;
    if (period === 'monthly') return now - 30 * 86400_000;
    return 0;
  }, [period]);

  const periodStats = useMemo(() => {
    let cashInPaisa = 0;
    let creditOutPaisa = 0;
    let expensePaisa = 0;

    transactions.forEach((tx) => {
      if (tx.reversedByTxId || tx.kind === 'REVERSAL') return;
      const ms = new Date(tx.date).getTime();
      if (ms < periodCutoffMs) return;
      if (tx.kind === 'CUSTOMER_PAYMENT') cashInPaisa += tx.amountPaisa;
      if (tx.kind === 'CUSTOMER_CREDIT') creditOutPaisa += tx.amountPaisa;
      if (tx.kind === 'EXPENSE') expensePaisa += tx.amountPaisa;
    });

    const totalReceivablePaisa = dueCustomers.reduce((s, c) => s + c.balancePaisa, 0);
    const totalPayablePaisa = dueSuppliers.reduce((s, sup) => s + sup.balancePaisa, 0);

    return {
      cashInPaisa,
      creditOutPaisa,
      expensePaisa,
      totalReceivablePaisa,
      totalPayablePaisa,
    };
  }, [transactions, periodCutoffMs, dueCustomers, dueSuppliers]);

  const expenseBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    expenses
      .filter((e) => !e.archived && new Date(e.date).getTime() >= periodCutoffMs)
      .forEach((e) => {
        map.set(e.category, (map.get(e.category) ?? 0) + e.amountPaisa);
      });
    const list = Array.from(map.entries()).map(([category, paisa]) => ({ category, paisa }));
    const maxPaisa = Math.max(1, ...list.map((i) => i.paisa));
    return { list, maxPaisa };
  }, [expenses, periodCutoffMs]);

  const handleExportCsv = () => {
    const headers = ['Date', 'Type', 'Party', 'Note', 'Amount (BDT)', 'Sync Status'];
    const rows = transactions.map((tx) => [
      tx.date.split('T')[0],
      tx.kind,
      tx.partyName,
      tx.note,
      fromPaisa(tx.amountPaisa).toFixed(2),
      tx.syncStatus,
    ]);
    downloadCsv(`due-note-report-${new Date().toISOString().split('T')[0]}.csv`, headers, rows);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleSelectCustomerForReminder = (cust: CustomerRecord) => {
    setSelectedCustId(cust.id);
    setMessageDraft(buildTemplateMessage(cust));
  };

  const handleScheduleReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    onAddReminder({
      customerId: selectedCustomer.id,
      dueDate,
      channel,
      message: messageDraft.trim() || buildTemplateMessage(selectedCustomer),
      sendImmediately: true,
    });
  };

  const handleSaveReply = (reminderId: string, presetText?: string) => {
    const text = (presetText ?? replyDrafts[reminderId] ?? '').trim();
    if (!text) return;
    onAddReminderReply(reminderId, text);
    setReplyDrafts((prev) => ({ ...prev, [reminderId]: '' }));
    setReplyingId(null);
  };

  const sentCount = reminders.filter((r) => r.status === 'Sent').length;
  const replyCount = reminders.filter((r) => Boolean(r.replyNote)).length;

  const quickReplyPresets =
    lang === 'bn'
      ? ['আগামীকাল পরিশোধ করবে', 'বিকাশে পাঠাবে', '৩ দিন সময় চেয়েছে']
      : ['Will pay tomorrow', 'Paying via bKash', 'Requested 3 days'];

  return (
    <div className="space-y-6">
      {/* Header & Top Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {section === 'reminders'
              ? lang === 'bn'
                ? 'বাকি তাগাদা ও কাস্টমার উত্তর'
                : 'Due Reminders & Replies'
              : t.reports.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {shopName} ·{' '}
            {section === 'reminders'
              ? lang === 'bn'
                ? 'হোয়াটসঅ্যাপ/এসএমএস তাগাদা পাঠান এবং কাস্টমারের উত্তর ট্র্যাক করুন'
                : 'Send WhatsApp/SMS reminders and track customer payment replies'
              : lang === 'bn'
              ? 'পাওনা, দেনা, আয়-ব্যয় ও স্টেটমেন্ট'
              : 'Receivables, payables, expenses & statements'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            className="min-h-[42px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Download className="w-4 h-4 text-[#1769D2]" />
            {t.reports.exportCsv}
          </button>
          <button
            type="button"
            onClick={onOpenPrintStatement}
            className="min-h-[42px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] hover:bg-[#1254AA] text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileText className="w-4 h-4" />
            {t.reports.printPdf}
          </button>
        </div>
      </div>

      {/* Segmented Switcher: Due Reminders (Primary) | Reports & Analytics */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
        <button
          type="button"
          onClick={() => setSection('reminders')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg inline-flex items-center gap-1.5 whitespace-nowrap transition-colors ${
            section === 'reminders'
              ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          {t.reports.dueReminders} ({reminders.length})
        </button>
        <button
          type="button"
          onClick={() => setSection('reports')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg whitespace-nowrap transition-colors ${
            section === 'reports'
              ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
              : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          {t.reports.title}
        </button>
      </div>

      {section === 'reminders' ? (
        <div className="space-y-6">
          {/* Reminder KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t.reports.receivableSummary}
              </p>
              <p className="text-2xl font-bold font-mono-nums text-emerald-600 dark:text-emerald-400 mt-1">
                {formatTaka(periodStats.totalReceivablePaisa, lang)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'বকেয়া কাস্টমার' : 'Due Customers'}
              </p>
              <p className="text-2xl font-bold font-mono-nums text-slate-900 dark:text-slate-100 mt-1">
                {formatCount(dueCustomers.length, lang)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'পাঠানো তাগাদা' : 'Reminders Sent'}
              </p>
              <p className="text-2xl font-bold font-mono-nums text-[#1769D2] dark:text-blue-400 mt-1">
                {formatCount(sentCount, lang)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'কাস্টমার উত্তর' : 'Replies Logged'}
              </p>
              <p className="text-2xl font-bold font-mono-nums text-slate-900 dark:text-slate-100 mt-1">
                {formatCount(replyCount, lang)}
              </p>
            </div>
          </div>

          {/* Composer + Due Queue */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <form
              onSubmit={handleScheduleReminder}
              className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3.5"
            >
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#1769D2]" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {lang === 'bn' ? 'নতুন তাগাদা পাঠান' : 'Send Due Reminder'}
                </h2>
              </div>

              <select
                value={selectedCustomer?.id || ''}
                onChange={(e) => {
                  const nextCust = dueCustomers.find((c) => c.id === e.target.value);
                  if (nextCust) handleSelectCustomerForReminder(nextCust);
                }}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-medium"
              >
                {dueCustomers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({formatTaka(c.balancePaisa, lang)})
                  </option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={channel}
                  onChange={(e) => setChannel(e.target.value as ReminderChannel)}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Local Notification">Local Notification</option>
                </select>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                />
              </div>

              <textarea
                rows={3}
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
              />

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="submit"
                  className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] hover:bg-[#1254AA] text-white inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t.reports.scheduleReminder}
                </button>
                {selectedCustomer && (
                  <a
                    href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                      messageDraft || buildTemplateMessage(selectedCustomer)
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl border border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 inline-flex items-center gap-1.5"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </form>

            {/* Quick Due Customer Queue */}
            <div className="lg:col-span-7 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {t.reports.topReceivables}
                </h2>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'তাগাদার জন্য নির্বাচন করুন' : 'Select to draft reminder'}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dueCustomers.slice(0, 6).map((c) => (
                  <div
                    key={c.id}
                    className="py-2.5 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {c.phone}
                        {c.dueDate ? ` · Due ${formatDateShort(c.dueDate, lang)}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono-nums text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatTaka(c.balancePaisa, lang)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSelectCustomerForReminder(c)}
                        className="min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-[#1769D2] hover:text-white text-slate-700 dark:text-slate-200 transition-colors"
                      >
                        {t.people.sendReminder}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Reminder History & Replies (Clean full-flow list, no clipped inner scrollbar) */}
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              {lang === 'bn' ? 'তাগাদা ইতিহাস ও কাস্টমার উত্তর' : 'Reminder History & Customer Replies'}
            </h2>
            {reminders.length === 0 ? (
              <p className="text-xs text-slate-500 py-8 text-center">
                {lang === 'bn' ? 'এখনো কোনো তাগাদা পাঠানো হয়নি' : 'No reminders sent or scheduled yet.'}
              </p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {reminders.map((r) => (
                  <div key={r.id} className="py-4 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {r.customerName} ·{' '}
                          <span className="font-mono-nums text-[#1769D2] dark:text-blue-400">
                            {formatTaka(r.amountPaisa, lang)}
                          </span>
                        </p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                          {r.message}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {r.channel} · {r.status} · Due {formatDateShort(r.dueDate, lang)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyText(r.id, r.message)}
                          className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 inline-flex items-center gap-1.5"
                        >
                          {copiedId === r.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          {copiedId === r.id ? 'Copied' : 'Copy'}
                        </button>
                        {r.status !== 'Sent' && (
                          <button
                            type="button"
                            onClick={() => onMarkReminderSent(r.id)}
                            className="min-h-[38px] px-3 py-1.5 text-xs font-semibold rounded-xl bg-[#1769D2] text-white"
                          >
                            Mark Sent
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setReplyingId((cur) => (cur === r.id ? null : r.id))}
                          className="min-h-[38px] px-3 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
                        >
                          <MessageSquareReply className="w-3.5 h-3.5 text-[#1769D2]" />
                          {r.replyNote
                            ? lang === 'bn'
                              ? 'উত্তর পরিবর্তন'
                              : 'Edit Reply'
                            : lang === 'bn'
                            ? 'উত্তর লিখুন'
                            : 'Log Reply'}
                        </button>
                      </div>
                    </div>

                    {/* Existing Customer Reply Display */}
                    {r.replyNote && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <p className="text-xs font-medium text-slate-800 dark:text-slate-200">
                          {r.replyNote}
                        </p>
                        {r.repliedAt && (
                          <span className="text-[11px] text-slate-400 shrink-0">
                            {formatDateTime(r.repliedAt, lang)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Reply Composer */}
                    {replyingId === r.id && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5">
                        <div className="flex flex-wrap gap-1.5">
                          {quickReplyPresets.map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleSaveReply(r.id, preset)}
                              className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 hover:border-[#1769D2] text-slate-700 dark:text-slate-200"
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={replyDrafts[r.id] ?? ''}
                            onChange={(e) =>
                              setReplyDrafts((prev) => ({ ...prev, [r.id]: e.target.value }))
                            }
                            placeholder={
                              lang === 'bn'
                                ? 'কাস্টমারের উত্তর লিখুন (যেমন: শুক্রবার বিকাশে দিবে)...'
                                : 'Type customer reply (e.g., Will pay ৳5,000 Friday)...'
                            }
                            className="flex-1 min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => handleSaveReply(r.id)}
                            className="min-h-[40px] px-4 py-1.5 text-xs font-semibold rounded-xl bg-[#1769D2] text-white shrink-0"
                          >
                            {t.ledger.saveEntry}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Reports & Exports Sub-View */
        <div className="space-y-6">
          {/* Period Filter */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap ${
                  period === p
                    ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {p === 'daily'
                  ? t.reports.daily
                  : p === 'weekly'
                  ? t.reports.weekly
                  : p === 'monthly'
                  ? t.reports.monthly
                  : t.reports.allTime}
              </button>
            ))}
          </div>

          {/* Summary Metric Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.reports.receivableSummary}</p>
              <p className="text-2xl font-bold font-mono-nums text-emerald-600 dark:text-emerald-400 mt-1.5">
                {formatTaka(periodStats.totalReceivablePaisa, lang)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.reports.payableSummary}</p>
              <p className="text-2xl font-bold font-mono-nums text-red-600 dark:text-red-400 mt-1.5">
                {formatTaka(periodStats.totalPayablePaisa, lang)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.dashboard.receivePayment}</p>
              <p className="text-2xl font-bold font-mono-nums text-[#1769D2] dark:text-blue-400 mt-1.5">
                {formatTaka(periodStats.cashInPaisa, lang)}
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 dark:text-slate-400">{t.ledger.expenses}</p>
              <p className="text-2xl font-bold font-mono-nums text-slate-900 dark:text-slate-100 mt-1.5">
                {formatTaka(periodStats.expensePaisa, lang)}
              </p>
            </div>
          </div>

          {/* Top Receivables / Payables + Expense Breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                {t.reports.topReceivables}
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dueCustomers.slice(0, 6).map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                      {c.name}
                    </span>
                    <span className="font-mono-nums font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                      {formatTaka(c.balancePaisa, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                {t.reports.topPayables}
              </h2>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {dueSuppliers.slice(0, 6).map((s) => (
                  <div key={s.id} className="flex items-center justify-between py-2.5 text-xs">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                      {s.name}
                    </span>
                    <span className="font-mono-nums font-bold text-red-600 dark:text-red-400 shrink-0">
                      {formatTaka(s.balancePaisa, lang)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
                {t.reports.expenseBreakdown}
              </h2>
              {expenseBreakdown.list.length === 0 ? (
                <p className="text-xs text-slate-500 py-8 text-center">
                  {lang === 'bn' ? 'এই সময়ের কোনো খরচ নেই' : 'No expenses recorded in this period.'}
                </p>
              ) : (
                <div className="space-y-3">
                  {expenseBreakdown.list.map((item) => {
                    const pct = Math.max(8, Math.round((item.paisa / expenseBreakdown.maxPaisa) * 100));
                    return (
                      <div key={item.category} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {item.category}
                          </span>
                          <span className="font-mono-nums font-semibold text-slate-900 dark:text-slate-100">
                            {formatTaka(item.paisa, lang)}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full bg-[#1769D2]" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
