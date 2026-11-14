import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  Bell,
  Calendar,
  Camera,
  FileText,
  MoreVertical,
  Pencil,
  Phone,
  RotateCcw,
  Send,
  X,
} from 'lucide-react';
import {
  CustomerRecord,
  Language,
  ReminderChannel,
  SupplierRecord,
  TransactionRecord,
} from '../types/bookkeeping';
import { getT } from '../i18n/translations';
import { formatDateShort, formatTaka, toPaisa } from '../utils/currency';

interface PersonLedgerModalProps {
  person: CustomerRecord | SupplierRecord | null;
  type: 'CUSTOMER' | 'SUPPLIER';
  transactions: TransactionRecord[];
  lang: Language;
  shopName: string;
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
  onUpdatePerson: (id: string, patch: { name: string; phone: string; address: string }) => void;
  onToggleArchive: (id: string) => void;
  onReverseTx: (txId: string, reason: string) => void;
  onOpenStatement: () => void;
  onSendReminder?: (input: {
    customerId: string;
    dueDate: string;
    channel: ReminderChannel;
    message: string;
    sendImmediately?: boolean;
  }) => void;
}

export const PersonLedgerModal: React.FC<PersonLedgerModalProps> = ({
  person,
  type,
  transactions,
  lang,
  shopName,
  onClose,
  onSavePartyTx,
  onUpdatePerson,
  onToggleArchive,
  onReverseTx,
  onOpenStatement,
  onSendReminder,
}) => {
  const t = getT(lang);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Contact edit / menu states
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');

  // Inline TallyKhata-style dual entry states
  const [givenAmount, setGivenAmount] = useState('');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [note, setNote] = useState('');
  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [tallyMessageOn, setTallyMessageOn] = useState(true);
  const [attachment, setAttachment] = useState<
    { fileName: string; mimeType: string; dataUrl: string } | undefined
  >();
  const [entryError, setEntryError] = useState('');
  const [entrySuccess, setEntrySuccess] = useState('');

  // Custom reminder panel states
  const [showReminderForm, setShowReminderForm] = useState(false);
  const [reminderChannel, setReminderChannel] = useState<ReminderChannel>('SMS');
  const [reminderDate, setReminderDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [customMessage, setCustomMessage] = useState('');

  const personTransactions = useMemo(() => {
    if (!person) return [];
    return transactions
      .filter((tx) => tx.partyId === person.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [person, transactions]);

  useEffect(() => {
    setMenuOpen(false);
    setEditing(false);
    setShowReminderForm(false);
    setGivenAmount('');
    setReceivedAmount('');
    setNote('');
    setAttachment(undefined);
    setEntryError('');
    setEntrySuccess('');
    setEntryDate(new Date().toISOString().split('T')[0]);
    if (person) {
      setCustomMessage(
        lang === 'bn'
          ? `আসসালামু আলাইকুম ${person.name}, ${shopName}-এ আপনার বর্তমান বকেয়া ${formatTaka(person.balancePaisa, 'bn')}। অনুগ্রহ করে সুবিধামতো পরিশোধ করবেন। ধন্যবাদ।`
          : `Hello ${person.name}, gentle reminder from ${shopName} that your current due balance is ${formatTaka(person.balancePaisa, 'en')}. Thank you.`
      );
    } else {
      setCustomMessage('');
    }
  }, [person?.id, lang, shopName]);

  if (!person) return null;

  const isCustomer = type === 'CUSTOMER';
  const parsedGiven = Number(givenAmount);
  const parsedReceived = Number(receivedAmount);
  const hasGiven = givenAmount.trim() !== '' && Number.isFinite(parsedGiven) && parsedGiven > 0;
  const hasReceived =
    receivedAmount.trim() !== '' && Number.isFinite(parsedReceived) && parsedReceived > 0;

  const deltaPaisa = hasGiven
    ? toPaisa(parsedGiven)
    : hasReceived
    ? -toPaisa(parsedReceived)
    : 0;
  const projectedBalancePaisa = person.balancePaisa + deltaPaisa;

  const defaultReminderMessage =
    lang === 'bn'
      ? `আসসালামু আলাইকুম ${person.name}, ${shopName}-এ আপনার বর্তমান বকেয়া ${formatTaka(person.balancePaisa, 'bn')}। অনুগ্রহ করে সুবিধামতো পরিশোধ করবেন। ধন্যবাদ।`
      : `Hello ${person.name}, gentle reminder from ${shopName} that your current due balance is ${formatTaka(person.balancePaisa, 'en')}. Thank you.`;

  const startEdit = () => {
    setEditName(person.name);
    setEditPhone(person.phone);
    setEditAddress(person.address);
    setEditing(true);
    setMenuOpen(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return;
    onUpdatePerson(person.id, { name: editName, phone: editPhone, address: editAddress });
    setEditing(false);
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_500_000) {
      setEntryError(
        lang === 'bn' ? 'ছবির আকার ১.৫ MB-এর কম হতে হবে' : 'Receipt photo must be under 1.5 MB'
      );
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
        setEntryError('');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleInlineEntrySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEntryError('');
    setEntrySuccess('');

    if (!hasGiven && !hasReceived) {
      setEntryError(
        lang === 'bn'
          ? 'দিলাম/বেচা অথবা পেলাম ঘরে সঠিক টাকার পরিমাণ লিখুন'
          : 'Enter a valid amount in Give Credit or Got / Received'
      );
      return;
    }

    const txKind = isCustomer
      ? hasGiven
        ? 'CUSTOMER_CREDIT'
        : 'CUSTOMER_PAYMENT'
      : hasGiven
      ? 'SUPPLIER_PURCHASE'
      : 'SUPPLIER_PAYMENT';

    const amountTaka = hasGiven ? parsedGiven : parsedReceived;

    onSavePartyTx({
      kind: txKind,
      partyId: person.id,
      amountTaka,
      note:
        note.trim() ||
        (hasGiven
          ? lang === 'bn'
            ? 'বাকি বিক্রয়'
            : 'Credit entry'
          : lang === 'bn'
          ? 'নগদ জমা'
          : 'Payment received'),
      date: entryDate,
      attachment,
    });

    if (tallyMessageOn && isCustomer && onSendReminder) {
      const nextBalFormatted = formatTaka(projectedBalancePaisa, lang);
      const autoMsg =
        lang === 'bn'
          ? `${shopName}: ${hasGiven ? 'বাকি' : 'জমা'} ${formatTaka(toPaisa(amountTaka), 'bn')}। বর্তমান ${projectedBalancePaisa >= 0 ? 'বকেয়া' : 'অগ্রিম'} ${nextBalFormatted}। ধন্যবাদ।`
          : `${shopName}: ${hasGiven ? 'Credit' : 'Received'} ${formatTaka(toPaisa(amountTaka), 'en')}. Current balance: ${nextBalFormatted}. Thank you.`;

      onSendReminder({
        customerId: person.id,
        dueDate: entryDate,
        channel: 'SMS',
        message: autoMsg,
        sendImmediately: true,
      });
    }

    setGivenAmount('');
    setReceivedAmount('');
    setNote('');
    setAttachment(undefined);
    setEntrySuccess(
      tallyMessageOn && isCustomer
        ? lang === 'bn'
          ? 'হিসাব সংরক্ষিত এবং টালি মেসেজ প্রস্তুত হয়েছে'
          : 'Entry saved and Tally SMS logged'
        : lang === 'bn'
        ? 'হিসাব সফলভাবে সংরক্ষিত হয়েছে'
        : 'Entry saved to digital ledger'
    );
  };

  const handleReminderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onSendReminder) return;
    onSendReminder({
      customerId: person.id,
      dueDate: reminderDate,
      channel: reminderChannel,
      message: customMessage || defaultReminderMessage,
      sendImmediately: true,
    });
    setEntrySuccess(
      lang === 'bn'
        ? `${reminderChannel} তাগাদা লগ ও প্রস্তুত করা হয়েছে`
        : `${reminderChannel} reminder logged and ready`
    );
    setShowReminderForm(false);
  };

  const avatarText = person.name.trim().slice(0, 2);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full sm:max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[94vh] flex flex-col overflow-hidden">
        {/* Top App Bar matching Screenshot 2 */}
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={onClose}
              aria-label="Back"
              className="min-h-[44px] min-w-[44px] -ml-2 flex items-center justify-center rounded-full text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="w-11 h-11 rounded-full bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 font-bold text-sm flex items-center justify-center shrink-0">
              {avatarText}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
                  {person.name}
                </h2>
                {person.archived && (
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-medium shrink-0">
                    · {t.people.archived}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 truncate mt-0.5">
                <Phone className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                <span className="truncate">{person.phone}</span>
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={onOpenStatement}
              title={t.people.statement}
              className="min-h-[40px] px-2.5 py-1.5 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 hidden sm:inline-flex items-center gap-1.5"
            >
              <FileText className="w-3.5 h-3.5 text-[#1769D2]" />
              {t.people.statement}
            </button>

            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label="Contact actions"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-12 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl py-1.5 z-20">
                <button
                  type="button"
                  onClick={startEdit}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {lang === 'bn' ? 'তথ্য পরিবর্তন' : 'Edit Contact'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onOpenStatement();
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <FileText className="w-3.5 h-3.5 text-[#1769D2]" />
                  {t.people.statement}
                </button>
                {isCustomer && person.balancePaisa > 0 && onSendReminder && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setCustomMessage(defaultReminderMessage);
                      setShowReminderForm((s) => !s);
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                  >
                    <Bell className="w-3.5 h-3.5 text-[#1769D2]" />
                    {t.people.sendReminder}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    onToggleArchive(person.id);
                  }}
                  className="w-full px-4 py-2.5 text-left text-xs font-medium text-amber-700 dark:text-amber-400 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  {person.archived ? t.people.restore : t.people.archive}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Balance Summary Strip matching Screenshot 2 */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 shrink-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {isCustomer
                ? lang === 'bn'
                  ? 'পাবো'
                  : 'Receivable'
                : lang === 'bn'
                ? 'দেনা'
                : 'Payable'}
            </span>
            <span
              className={`text-lg font-bold font-mono-nums ${
                person.balancePaisa === 0
                  ? 'text-slate-600 dark:text-slate-300'
                  : isCustomer
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-red-700 dark:text-red-400'
              }`}
            >
              {formatTaka(person.balancePaisa, lang, true)}
            </span>
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400">
            {person.dueDate
              ? `${lang === 'bn' ? 'তারিখ:' : 'Due'} ${formatDateShort(person.dueDate, lang)}`
              : `${lang === 'bn' ? 'হালনাগাদ:' : 'Updated'} ${formatDateShort(person.updatedAt, lang)}`}
          </span>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* Edit Contact Form */}
          {editing && (
            <form
              onSubmit={handleSaveEdit}
              className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder={t.people.name}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder={t.people.phone}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder={t.people.address}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 text-xs font-medium rounded-xl border border-slate-300 dark:border-slate-600"
                >
                  {t.ledger.cancel}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white"
                >
                  {t.ledger.saveEntry}
                </button>
              </div>
            </form>
          )}

          {/* Inline TallyKhata-Style Dual Outlined Input Form */}
          <form onSubmit={handleInlineEntrySubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 pt-1">
              {/* Left Box: দিলাম/বেচা (Give Credit / Purchase) */}
              <div className="relative">
                <label
                  htmlFor="inline-given-input"
                  className={`absolute -top-2.5 left-3 px-1.5 text-xs font-semibold bg-white dark:bg-slate-900 transition-colors ${
                    hasGiven
                      ? 'text-red-700 dark:text-red-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isCustomer
                    ? lang === 'bn'
                      ? 'দিলাম/বেচা'
                      : 'Give Credit'
                    : lang === 'bn'
                    ? 'বাকি ক্রয়'
                    : 'Purchase'}
                </label>
                <div
                  className={`flex items-center min-h-[54px] px-3.5 rounded-xl border-2 transition-colors bg-white dark:bg-slate-950 ${
                    hasGiven
                      ? 'border-red-600 dark:border-red-500'
                      : 'border-slate-200 dark:border-slate-700 focus-within:border-red-600'
                  }`}
                >
                  <span className="text-lg font-semibold text-slate-700 dark:text-slate-300 mr-1.5">
                    ৳
                  </span>
                  <input
                    id="inline-given-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={givenAmount}
                    onChange={(e) => {
                      setGivenAmount(e.target.value);
                      if (e.target.value) setReceivedAmount('');
                      setEntryError('');
                      setEntrySuccess('');
                    }}
                    placeholder={
                      isCustomer
                        ? lang === 'bn'
                          ? 'দিলাম'
                          : '0'
                        : lang === 'bn'
                        ? 'ক্রয়'
                        : '0'
                    }
                    className="w-full bg-transparent text-lg font-bold font-mono-nums text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>

              {/* Right Box: পেলাম (Received / Paid) */}
              <div className="relative">
                <label
                  htmlFor="inline-received-input"
                  className={`absolute -top-2.5 left-3 px-1.5 text-xs font-semibold bg-white dark:bg-slate-900 transition-colors ${
                    hasReceived
                      ? 'text-emerald-700 dark:text-emerald-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isCustomer
                    ? lang === 'bn'
                      ? 'পেলাম'
                      : 'Got / Received'
                    : lang === 'bn'
                    ? 'পরিশোধ'
                    : 'Paid'}
                </label>
                <div
                  className={`flex items-center min-h-[54px] px-3.5 rounded-xl border-2 transition-colors bg-white dark:bg-slate-950 ${
                    hasReceived
                      ? 'border-emerald-600 dark:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-700 focus-within:border-emerald-600'
                  }`}
                >
                  <span className="text-lg font-semibold text-slate-700 dark:text-slate-300 mr-1.5">
                    ৳
                  </span>
                  <input
                    id="inline-received-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={receivedAmount}
                    onChange={(e) => {
                      setReceivedAmount(e.target.value);
                      if (e.target.value) setGivenAmount('');
                      setEntryError('');
                      setEntrySuccess('');
                    }}
                    placeholder={
                      isCustomer
                        ? lang === 'bn'
                          ? 'পেলাম'
                          : '0'
                        : lang === 'bn'
                        ? 'দিলাম'
                        : '0'
                    }
                    className="w-full bg-transparent text-lg font-bold font-mono-nums text-slate-900 dark:text-slate-100 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Outlined বিবরণ (Details) field */}
            <div className="relative pt-1">
              <label
                htmlFor="inline-note-input"
                className="absolute -top-1.5 left-3 px-1.5 text-xs font-medium bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400"
              >
                {lang === 'bn' ? 'বিবরণ' : 'Details / Note'}
              </label>
              <div className="flex items-center min-h-[52px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 focus-within:border-[#1769D2]">
                <FileText className="w-4 h-4 text-slate-500 dark:text-slate-400 mr-2.5 shrink-0" />
                <input
                  id="inline-note-input"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={lang === 'bn' ? 'চাল, চিনি বা পরিশোধের বিবরণ' : 'e.g., Rice, oil, or cash note'}
                  className="w-full bg-transparent text-sm text-slate-900 dark:text-slate-100 focus:outline-none"
                />
              </div>
            </div>

            {/* Bottom 3-control bar: Date + Tally SMS Toggle + Photo */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => dateInputRef.current?.showPicker?.() ?? dateInputRef.current?.click()}
                className="min-h-[42px] px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-2 relative"
              >
                <Calendar className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                <span>{formatDateShort(entryDate, lang)}</span>
                <input
                  ref={dateInputRef}
                  type="date"
                  value={entryDate}
                  onChange={(e) => setEntryDate(e.target.value)}
                  className="sr-only"
                  aria-label="Transaction date"
                />
              </button>

              {isCustomer && (
                <button
                  type="button"
                  role="switch"
                  aria-checked={tallyMessageOn}
                  onClick={() => setTallyMessageOn((v) => !v)}
                  className="min-h-[42px] px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-semibold inline-flex items-center gap-2.5"
                >
                  <span
                    className={
                      tallyMessageOn
                        ? 'text-red-700 dark:text-red-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }
                  >
                    {lang === 'bn' ? 'টালি মেসেজ' : 'Tally SMS'}
                  </span>
                  <span
                    className={`w-9 h-5 rounded-full p-0.5 transition-colors flex items-center ${
                      tallyMessageOn ? 'bg-red-700 justify-end' : 'bg-slate-300 dark:bg-slate-600 justify-start'
                    }`}
                  >
                    <span className="w-4 h-4 rounded-full bg-white shadow-xs" />
                  </span>
                </button>
              )}

              <label className="min-h-[42px] px-3.5 py-2 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300 inline-flex items-center gap-1.5 cursor-pointer">
                <Camera className="w-4 h-4" />
                <span className="max-w-[90px] truncate">
                  {attachment ? attachment.fileName : lang === 'bn' ? 'ছবি' : 'Photo'}
                </span>
                <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
              </label>
            </div>

            {/* Live balance projection + Save button */}
            {(hasGiven || hasReceived) && (
              <div className="flex items-center justify-between text-xs px-1 text-slate-600 dark:text-slate-300">
                <span>
                  {lang === 'bn' ? 'এন্ট্রির পর ব্যালেন্স:' : 'New Balance After Save:'}
                </span>
                <span className="font-mono-nums font-bold text-[#1769D2] dark:text-blue-400">
                  {formatTaka(projectedBalancePaisa, lang, true)}
                </span>
              </div>
            )}

            {entryError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs font-medium text-red-700 dark:text-red-300">
                {entryError}
              </div>
            )}

            {entrySuccess && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-xs font-medium text-emerald-700 dark:text-emerald-300">
                {entrySuccess}
              </div>
            )}

            <button
              type="submit"
              className={`w-full min-h-[48px] rounded-xl text-sm font-semibold text-white transition-colors ${
                hasGiven
                  ? 'bg-red-700 hover:bg-red-800'
                  : hasReceived
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-[#1769D2] hover:bg-[#1254AA]'
              }`}
            >
              {hasGiven
                ? isCustomer
                  ? lang === 'bn'
                    ? 'বাকি হিসাব সংরক্ষণ করুন'
                    : 'Save Give Credit'
                  : lang === 'bn'
                  ? 'বাকি ক্রয় সংরক্ষণ করুন'
                  : 'Save Supplier Purchase'
                : hasReceived
                ? isCustomer
                  ? lang === 'bn'
                    ? 'জমা হিসাব সংরক্ষণ করুন'
                    : 'Save Received Payment'
                  : lang === 'bn'
                  ? 'পরিশোধ সংরক্ষণ করুন'
                  : 'Save Supplier Payment'
                : t.ledger.saveEntry}
            </button>
          </form>

          {/* Optional Custom Reminder Composer */}
          {showReminderForm && (
            <form
              onSubmit={handleReminderSubmit}
              className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {t.reports.dueReminders}
                </p>
                <button
                  type="button"
                  onClick={() => setShowReminderForm(false)}
                  className="p-1 text-slate-400 hover:text-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <select
                  value={reminderChannel}
                  onChange={(e) => setReminderChannel(e.target.value as ReminderChannel)}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-medium"
                >
                  <option value="WhatsApp">WhatsApp</option>
                  <option value="SMS">SMS</option>
                  <option value="Local Notification">Local Notification</option>
                </select>
                <input
                  type="date"
                  value={reminderDate}
                  onChange={(e) => setReminderDate(e.target.value)}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
                />
              </div>
              <textarea
                rows={2}
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  {t.reports.scheduleReminder}
                </button>
              </div>
            </form>
          )}

          {/* Individual Digital Ledger History */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3">
              {lang === 'bn' ? 'ব্যক্তিগত খাতা বিবরণী' : 'Individual Digital Ledger'}
            </h3>
            {personTransactions.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 dark:text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
                {lang === 'bn'
                  ? 'এখনো কোনো লেনদেন যোগ করা হয়নি।'
                  : 'No individual transactions recorded yet. Opening balance applies.'}
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
                {personTransactions.map((tx) => {
                  const isIncrease =
                    tx.kind === 'CUSTOMER_CREDIT' || tx.kind === 'SUPPLIER_PURCHASE';
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 px-4 py-3 bg-white dark:bg-slate-900"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                            tx.kind === 'REVERSAL'
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                              : isIncrease
                              ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                              : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {tx.kind === 'REVERSAL' ? (
                            <RotateCcw className="w-4 h-4" />
                          ) : isIncrease ? (
                            <ArrowUpRight className="w-4 h-4" />
                          ) : (
                            <ArrowDownLeft className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium truncate ${
                              tx.reversedByTxId
                                ? 'line-through text-slate-400'
                                : 'text-slate-900 dark:text-slate-100'
                            }`}
                          >
                            {tx.note}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {formatDateShort(tx.date, lang)} · {tx.kind.replace('_', ' ')}
                            {tx.reversedByTxId ? ` · ${t.ledger.reversed}` : ''}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`text-sm font-semibold font-mono-nums ${
                            tx.reversedByTxId
                              ? 'text-slate-400 line-through'
                              : isIncrease
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          {isIncrease ? '+' : '-'}
                          {formatTaka(tx.amountPaisa, lang)}
                        </span>
                        {!tx.reversedByTxId && tx.kind !== 'REVERSAL' && (
                          <button
                            type="button"
                            onClick={() => onReverseTx(tx.id, 'Corrected from ledger')}
                            title={t.ledger.reverseEntry}
                            className="min-h-[34px] px-2.5 py-1 text-xs font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
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
          </div>
        </div>
      </div>
    </div>
  );
};
