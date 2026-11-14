import React, { useMemo, useState } from 'react';
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Paperclip,
  Plus,
  RotateCcw,
} from 'lucide-react';
import {
  AttachmentRecord,
  AuditLogRecord,
  ExpenseRecord,
  Language,
  LedgerEntryRecord,
  TransactionRecord,
} from '../types/bookkeeping';
import { getT } from '../i18n/translations';
import { formatDateShort, formatDateTime, formatTaka } from '../utils/currency';
import { TransactionModalMode } from './TransactionModal';

interface LedgerViewProps {
  transactions: TransactionRecord[];
  ledgerEntries: LedgerEntryRecord[];
  expenses: ExpenseRecord[];
  attachments: AttachmentRecord[];
  auditLogs: AuditLogRecord[];
  lang: Language;
  onOpenTxModal: (mode: TransactionModalMode) => void;
  onReverseTx: (txId: string, reason: string) => void;
  onToggleArchiveExpense: (id: string) => void;
}

export const LedgerView: React.FC<LedgerViewProps> = ({
  transactions,
  ledgerEntries,
  expenses,
  attachments,
  auditLogs,
  lang,
  onOpenTxModal,
  onReverseTx,
  onToggleArchiveExpense,
}) => {
  const t = getT(lang);
  const [subTab, setSubTab] = useState<'transactions' | 'expenses' | 'audit'>('transactions');
  const [txFilter, setTxFilter] = useState<'ALL' | 'CUSTOMER' | 'SUPPLIER' | 'EXPENSE'>('ALL');
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentRecord | null>(null);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (txFilter === 'ALL') return true;
      if (txFilter === 'EXPENSE') return tx.kind === 'EXPENSE';
      return tx.partyType === txFilter;
    });
  }, [transactions, txFilter]);

  const activeExpenses = expenses.filter((e) => !e.archived);
  const totalExpensePaisa = activeExpenses.reduce((sum, e) => sum + e.amountPaisa, 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{t.ledger.allTransactions}</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {t.ledger.doubleEntryNote} · {ledgerEntries.length} {lang === 'bn' ? 'লেজার এন্ট্রি' : 'double-entry postings'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenTxModal('CUSTOMER_CREDIT')}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-red-600 hover:bg-red-700 text-white whitespace-nowrap"
          >
            {t.dashboard.giveCredit}
          </button>
          <button
            type="button"
            onClick={() => onOpenTxModal('CUSTOMER_PAYMENT')}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white whitespace-nowrap"
          >
            {t.dashboard.receivePayment}
          </button>
          <button
            type="button"
            onClick={() => onOpenTxModal('EXPENSE')}
            className="min-h-[44px] px-3.5 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] hover:bg-[#1254AA] text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t.dashboard.addExpense}
          </button>
        </div>
      </div>

      {/* Sub-navigation tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setSubTab('transactions')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap ${
              subTab === 'transactions'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.ledger.allTransactions} ({transactions.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('expenses')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap ${
              subTab === 'expenses'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.ledger.expenses} ({activeExpenses.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('audit')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg whitespace-nowrap ${
              subTab === 'audit'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.ledger.auditTrail} ({auditLogs.length})
          </button>
        </div>

        {subTab === 'transactions' && (
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
            {(['ALL', 'CUSTOMER', 'SUPPLIER', 'EXPENSE'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setTxFilter(f)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                  txFilter === f
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {f === 'ALL' ? t.people.filterAll : f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Sub-Tab 1: Immutable Transactions */}
      {subTab === 'transactions' && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {filteredTransactions.map((tx) => {
            const isIn = tx.kind === 'CUSTOMER_PAYMENT';
            const att = tx.attachmentId ? attachments.find((a) => a.id === tx.attachmentId) : undefined;
            return (
              <div key={tx.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5">
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                      tx.kind === 'REVERSAL'
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                        : isIn
                        ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        : 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                    }`}
                  >
                    {tx.kind === 'REVERSAL' ? (
                      <RotateCcw className="w-4 h-4" />
                    ) : isIn ? (
                      <ArrowDownLeft className="w-4 h-4" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold ${tx.reversedByTxId ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                      {tx.partyName}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {tx.note} · {formatDateTime(tx.date, lang)} · {tx.kind.replace('_', ' ')}
                      {tx.reversedByTxId ? ` · ${t.ledger.reversed}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  {att && (
                    <button
                      type="button"
                      onClick={() => setPreviewAttachment(att)}
                      className="min-h-[36px] px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-[#1769D2] inline-flex items-center gap-1"
                    >
                      <Paperclip className="w-3.5 h-3.5" />
                      Receipt
                    </button>
                  )}

                  <span
                    className={`text-sm font-bold font-mono-nums ${
                      tx.reversedByTxId
                        ? 'text-slate-400 line-through'
                        : isIn
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {isIn ? '+' : '-'}
                    {formatTaka(tx.amountPaisa, lang)}
                  </span>

                  {!tx.reversedByTxId && tx.kind !== 'REVERSAL' && (
                    <button
                      type="button"
                      onClick={() => onReverseTx(tx.id, 'Ledger correction')}
                      className="min-h-[36px] px-3 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      {t.ledger.reverseEntry}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sub-Tab 2: Expenses */}
      {subTab === 'expenses' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {lang === 'bn' ? 'মোট সক্রিয় দোকান খরচ' : 'Total Active Business Expenses'}
              </p>
              <p className="text-2xl font-bold font-mono-nums text-red-600 dark:text-red-400 mt-1">
                {formatTaka(totalExpensePaisa, lang)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onOpenTxModal('EXPENSE')}
              className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white"
            >
              {t.dashboard.addExpense}
            </button>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {expenses.map((exp) => (
              <div key={exp.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${exp.archived ? 'line-through text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>
                    {exp.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {exp.category} · {formatDateShort(exp.date, lang)} {exp.note ? `· ${exp.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold font-mono-nums text-red-600 dark:text-red-400">
                    {formatTaka(exp.amountPaisa, lang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onToggleArchiveExpense(exp.id)}
                    aria-label="Toggle archive expense"
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800"
                  >
                    <Archive className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Audit Trail & Double-Entry Verification */}
      {subTab === 'audit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              {lang === 'bn' ? 'অডিট লগ ইতিহাস' : 'Immutable Audit Log'}
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-[420px] overflow-y-auto">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3">
                  <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{log.summary}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    {log.action} · {log.actorName} · {formatDateTime(log.timestamp, lang)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-3">
              {lang === 'bn' ? 'ডাবল-এন্ট্রি জার্নাল' : 'Double-Entry Ledger Postings'}
            </h2>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                    <th className="py-2 pr-2 font-medium">Account</th>
                    <th className="py-2 pr-2 text-right font-medium">Debit</th>
                    <th className="py-2 text-right font-medium">Credit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {ledgerEntries.slice(0, 30).map((le) => (
                    <tr key={le.id}>
                      <td className="py-2 pr-2 font-medium text-slate-800 dark:text-slate-200">{le.accountName}</td>
                      <td className="py-2 pr-2 text-right font-mono-nums text-emerald-600 dark:text-emerald-400">
                        {le.debitPaisa > 0 ? formatTaka(le.debitPaisa, lang) : '—'}
                      </td>
                      <td className="py-2 text-right font-mono-nums text-red-600 dark:text-red-400">
                        {le.creditPaisa > 0 ? formatTaka(le.creditPaisa, lang) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Attachment Preview Modal */}
      {previewAttachment && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4"
          onClick={() => setPreviewAttachment(null)}
        >
          <div className="max-w-lg w-full bg-white dark:bg-slate-900 rounded-2xl p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">{previewAttachment.fileName}</p>
              <button
                type="button"
                onClick={() => setPreviewAttachment(null)}
                className="px-3 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-800"
              >
                Close
              </button>
            </div>
            <img
              src={previewAttachment.dataUrl}
              alt={previewAttachment.fileName}
              className="w-full max-h-[70vh] object-contain rounded-xl border border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>
      )}
    </div>
  );
};
