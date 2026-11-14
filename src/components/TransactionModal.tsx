import React, { useEffect, useState } from 'react';
import { Paperclip, X } from 'lucide-react';
import {
  CustomerRecord,
  ExpenseCategory,
  Language,
  SupplierRecord,
} from '../types/bookkeeping';
import { getT } from '../i18n/translations';
import { formatTaka } from '../utils/currency';

export type TransactionModalMode =
  | 'CUSTOMER_CREDIT'
  | 'CUSTOMER_PAYMENT'
  | 'SUPPLIER_PURCHASE'
  | 'SUPPLIER_PAYMENT'
  | 'EXPENSE';

interface TransactionModalProps {
  open: boolean;
  initialMode: TransactionModalMode;
  preselectedPartyId?: string;
  customers: CustomerRecord[];
  suppliers: SupplierRecord[];
  lang: Language;
  onClose: () => void;
  onSavePartyTx: (input: {
    kind: 'CUSTOMER_CREDIT' | 'CUSTOMER_PAYMENT' | 'SUPPLIER_PURCHASE' | 'SUPPLIER_PAYMENT';
    partyId: string;
    amountTaka: number;
    note: string;
    date: string;
    dueDate?: string;
    attachment?: { fileName: string; mimeType: string; dataUrl: string };
  }) => void;
  onSaveExpense: (input: {
    title: string;
    category: ExpenseCategory;
    amountTaka: number;
    note: string;
    date: string;
  }) => void;
}

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'Rent',
  'Electricity',
  'Transport',
  'Staff Salary',
  'Shop Supplies',
  'Packaging',
  'Other',
];

export const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  initialMode,
  preselectedPartyId,
  customers,
  suppliers,
  lang,
  onClose,
  onSavePartyTx,
  onSaveExpense,
}) => {
  const t = getT(lang);
  const [mode, setMode] = useState<TransactionModalMode>(initialMode);
  const [partyId, setPartyId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState<string>('');
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<ExpenseCategory>('Electricity');
  const [attachment, setAttachment] = useState<{ fileName: string; mimeType: string; dataUrl: string } | undefined>();
  const [error, setError] = useState<string>('');

  const activeCustomers = customers.filter((c) => !c.archived);
  const activeSuppliers = suppliers.filter((s) => !s.archived);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    setAmount('');
    setNote('');
    setDueDate('');
    setExpenseTitle('');
    setAttachment(undefined);
    setError('');
    setDate(new Date().toISOString().split('T')[0]);

    if (initialMode === 'CUSTOMER_CREDIT' || initialMode === 'CUSTOMER_PAYMENT') {
      setPartyId(preselectedPartyId || activeCustomers[0]?.id || '');
    } else if (initialMode === 'SUPPLIER_PURCHASE' || initialMode === 'SUPPLIER_PAYMENT') {
      setPartyId(preselectedPartyId || activeSuppliers[0]?.id || '');
    }
  }, [open, initialMode, preselectedPartyId]);

  if (!open) return null;

  const isCustomerMode = mode === 'CUSTOMER_CREDIT' || mode === 'CUSTOMER_PAYMENT';
  const isSupplierMode = mode === 'SUPPLIER_PURCHASE' || mode === 'SUPPLIER_PAYMENT';

  const selectedCustomer = isCustomerMode ? activeCustomers.find((c) => c.id === partyId) : undefined;
  const selectedSupplier = isSupplierMode ? activeSuppliers.find((s) => s.id === partyId) : undefined;

  const parsedAmount = Number(amount);
  const currentBalancePaisa = selectedCustomer?.balancePaisa ?? selectedSupplier?.balancePaisa ?? 0;
  const deltaPaisa =
    Number.isFinite(parsedAmount) && parsedAmount > 0
      ? Math.round(parsedAmount * 100) *
        (mode === 'CUSTOMER_CREDIT' || mode === 'SUPPLIER_PURCHASE' ? 1 : -1)
      : 0;
  const projectedBalancePaisa = currentBalancePaisa + deltaPaisa;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setError(lang === 'bn' ? 'রশিদের ফাইল ১.৫ MB-এর কম হতে হবে' : 'Receipt attachment must be under 1.5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAttachment({
          fileName: file.name,
          mimeType: file.type,
          dataUrl: reader.result,
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError(lang === 'bn' ? 'সঠিক টাকার পরিমাণ লিখুন' : 'Please enter a valid positive amount in ৳');
      return;
    }

    if (mode === 'EXPENSE') {
      if (!expenseTitle.trim()) {
        setError(lang === 'bn' ? 'খরচের বিবরণ লিখুন' : 'Please enter an expense title');
        return;
      }
      onSaveExpense({
        title: expenseTitle,
        category: expenseCategory,
        amountTaka: parsedAmount,
        note,
        date,
      });
      onClose();
      return;
    }

    if (!partyId) {
      setError(lang === 'bn' ? 'কাস্টমার বা সাপ্লায়ার নির্বাচন করুন' : 'Please select a contact');
      return;
    }

    onSavePartyTx({
      kind: mode,
      partyId,
      amountTaka: parsedAmount,
      note,
      date,
      dueDate: dueDate || undefined,
      attachment,
    });
    onClose();
  };

  const modeTabs: Array<{ id: TransactionModalMode; label: string }> = [
    { id: 'CUSTOMER_CREDIT', label: lang === 'bn' ? 'বাকি দিলাম' : 'Give Credit' },
    { id: 'CUSTOMER_PAYMENT', label: lang === 'bn' ? 'টাকা পেলাম' : 'Receive Cash' },
    { id: 'SUPPLIER_PAYMENT', label: lang === 'bn' ? 'সাপ্লায়ার পেমেন্ট' : 'Pay Supplier' },
    { id: 'SUPPLIER_PURCHASE', label: lang === 'bn' ? 'বাকি ক্রয়' : 'Supplier Purchase' },
    { id: 'EXPENSE', label: lang === 'bn' ? 'দৈনিক খরচ' : 'Expense' },
  ];

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mt-3" />

        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {mode === 'CUSTOMER_CREDIT' && t.ledger.giveCreditTitle}
              {mode === 'CUSTOMER_PAYMENT' && t.ledger.receivePaymentTitle}
              {mode === 'SUPPLIER_PURCHASE' && t.ledger.supplierPurchaseTitle}
              {mode === 'SUPPLIER_PAYMENT' && t.ledger.supplierPaymentTitle}
              {mode === 'EXPENSE' && t.ledger.addExpenseTitle}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.ledger.doubleEntryNote}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl overflow-x-auto">
            {modeTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setMode(tab.id);
                  if (tab.id === 'CUSTOMER_CREDIT' || tab.id === 'CUSTOMER_PAYMENT') {
                    if (!activeCustomers.some((c) => c.id === partyId)) {
                      setPartyId(activeCustomers[0]?.id || '');
                    }
                  } else if (tab.id === 'SUPPLIER_PURCHASE' || tab.id === 'SUPPLIER_PAYMENT') {
                    if (!activeSuppliers.some((s) => s.id === partyId)) {
                      setPartyId(activeSuppliers[0]?.id || '');
                    }
                  }
                  setError('');
                }}
                className={`px-3 py-2 text-xs font-medium rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                  mode === tab.id
                    ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 text-xs font-medium text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {mode === 'EXPENSE' ? (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  {t.ledger.expenseTitle}
                </label>
                <input
                  type="text"
                  value={expenseTitle}
                  onChange={(e) => setExpenseTitle(e.target.value)}
                  placeholder={lang === 'bn' ? 'যেমন: দোকান ভাড়া বা বিদ্যুৎ বিল' : 'e.g., Shop Rent or Electricity Bill'}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1769D2]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  {t.ledger.expenseCategory}
                </label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as ExpenseCategory)}
                  className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1769D2]"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t.ledger.selectPerson}
              </label>
              <select
                value={partyId}
                onChange={(e) => setPartyId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1769D2]"
              >
                {(isCustomerMode ? activeCustomers : activeSuppliers).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} ({formatTaka(person.balancePaisa, lang)})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {t.ledger.amount}
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono-nums font-semibold text-slate-500">
                ৳
              </span>
              <input
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                className="w-full min-h-[48px] pl-9 pr-4 py-2.5 text-lg font-mono-nums font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1769D2]"
              />
            </div>
            {(selectedCustomer || selectedSupplier) && (
              <div className="mt-2 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>
                  {lang === 'bn' ? 'বর্তমান ব্যালেন্স:' : 'Current Balance:'}{' '}
                  <strong className="font-mono-nums text-slate-700 dark:text-slate-200">
                    {formatTaka(currentBalancePaisa, lang)}
                  </strong>
                </span>
                <span>
                  {lang === 'bn' ? 'নতুন ব্যালেন্স:' : 'After Entry:'}{' '}
                  <strong className="font-mono-nums text-[#1769D2] dark:text-blue-400">
                    {formatTaka(projectedBalancePaisa, lang)}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t.ledger.date}
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
              />
            </div>
            {(mode === 'CUSTOMER_CREDIT' || mode === 'SUPPLIER_PURCHASE') && (
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                  {t.ledger.dueDate}
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
              {t.ledger.note}
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={lang === 'bn' ? 'পণ্য বা লেনদেনের বিবরণ লিখুন...' : 'Items sold, invoice no., or payment method...'}
              className="w-full min-h-[44px] px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100"
            />
          </div>

          {mode !== 'EXPENSE' && (
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5">
                {t.ledger.receipt}
              </label>
              <label className="flex items-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 cursor-pointer hover:border-[#1769D2]">
                <Paperclip className="w-4 h-4 text-[#1769D2]" />
                <span className="truncate">
                  {attachment ? attachment.fileName : lang === 'bn' ? 'রশিদ / মেমো ছবি যোগ করুন' : 'Attach receipt photo or invoice'}
                </span>
                <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              </label>
            </div>
          )}

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 min-h-[46px] px-4 py-2.5 text-sm font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              {t.ledger.cancel}
            </button>
            <button
              type="submit"
              className="flex-1 min-h-[46px] px-4 py-2.5 text-sm font-semibold rounded-xl bg-[#1769D2] hover:bg-[#1254AA] text-white transition-colors"
            >
              {t.ledger.saveEntry}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
