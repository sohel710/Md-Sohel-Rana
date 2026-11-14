import React, { useMemo, useState } from 'react';
import { ChevronRight, Plus, Search, UserPlus, X } from 'lucide-react';
import { CustomerRecord, Language, SupplierRecord } from '../types/bookkeeping';
import { getT } from '../i18n/translations';
import { formatCount, formatTaka } from '../utils/currency';

interface PeopleViewProps {
  customers: CustomerRecord[];
  suppliers: SupplierRecord[];
  lang: Language;
  addModalOpen: boolean;
  onSetAddModalOpen: (open: boolean) => void;
  onAddCustomer: (input: { name: string; phone: string; address: string; openingBalanceTaka: number }) => void;
  onAddSupplier: (input: { name: string; phone: string; address: string; openingBalanceTaka: number }) => void;
  onSelectCustomer: (customer: CustomerRecord) => void;
  onSelectSupplier: (supplier: SupplierRecord) => void;
}

export const PeopleView: React.FC<PeopleViewProps> = ({
  customers,
  suppliers,
  lang,
  addModalOpen,
  onSetAddModalOpen,
  onAddCustomer,
  onAddSupplier,
  onSelectCustomer,
  onSelectSupplier,
}) => {
  const t = getT(lang);
  const [segment, setSegment] = useState<'customers' | 'suppliers' | 'archived'>('customers');
  const [balanceFilter, setBalanceFilter] = useState<'all' | 'due' | 'settled'>('all');
  const [search, setSearch] = useState('');

  // Add Contact Form
  const [newRole, setNewRole] = useState<'CUSTOMER' | 'SUPPLIER'>('CUSTOMER');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newOpening, setNewOpening] = useState('');
  const [formError, setFormError] = useState('');

  const filteredList = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (segment === 'archived') {
      const archCust = customers.filter((c) => c.archived).map((c) => ({ ...c, kind: 'CUSTOMER' as const }));
      const archSupp = suppliers.filter((s) => s.archived).map((s) => ({ ...s, kind: 'SUPPLIER' as const }));
      return [...archCust, ...archSupp].filter(
        (item) => !q || item.name.toLowerCase().includes(q) || item.phone.toLowerCase().includes(q)
      );
    }

    const base =
      segment === 'customers'
        ? customers.filter((c) => !c.archived).map((c) => ({ ...c, kind: 'CUSTOMER' as const }))
        : suppliers.filter((s) => !s.archived).map((s) => ({ ...s, kind: 'SUPPLIER' as const }));

    return base.filter((item) => {
      const matchesQuery = !q || item.name.toLowerCase().includes(q) || item.phone.toLowerCase().includes(q);
      if (!matchesQuery) return false;
      if (balanceFilter === 'due') return item.balancePaisa > 0;
      if (balanceFilter === 'settled') return item.balancePaisa === 0;
      return true;
    });
  }, [customers, suppliers, segment, balanceFilter, search]);

  const handleOpenAdd = (role: 'CUSTOMER' | 'SUPPLIER') => {
    setNewRole(role);
    setNewName('');
    setNewPhone('');
    setNewAddress('');
    setNewOpening('');
    setFormError('');
    onSetAddModalOpen(true);
  };

  const handleSaveContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      setFormError(lang === 'bn' ? 'নাম লেখা আবশ্যক' : 'Contact name is required');
      return;
    }
    if (!newPhone.trim()) {
      setFormError(lang === 'bn' ? 'মোবাইল নম্বর লেখা আবশ্যক' : 'Phone number is required');
      return;
    }
    const openingVal = Number(newOpening) || 0;
    if (newRole === 'CUSTOMER') {
      onAddCustomer({ name: newName, phone: newPhone, address: newAddress, openingBalanceTaka: openingVal });
      setSegment('customers');
    } else {
      onAddSupplier({ name: newName, phone: newPhone, address: newAddress, openingBalanceTaka: openingVal });
      setSegment('suppliers');
    }
    onSetAddModalOpen(false);
  };

  const activeCustomersCount = customers.filter((c) => !c.archived).length;
  const activeSuppliersCount = suppliers.filter((s) => !s.archived).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            {segment === 'suppliers' ? t.people.suppliers : segment === 'archived' ? t.people.archived : t.people.customers}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {formatCount(activeCustomersCount, lang)} {t.people.customers} · {formatCount(activeSuppliersCount, lang)} {t.people.suppliers}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => handleOpenAdd('CUSTOMER')}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] hover:bg-[#1254AA] text-white inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <UserPlus className="w-4 h-4" />
            {t.people.addCustomer}
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd('SUPPLIER')}
            className="min-h-[44px] px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            {t.people.addSupplier}
          </button>
        </div>
      </div>

      {/* Controls: Segment Tabs + Search + Balance Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setSegment('customers')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              segment === 'customers'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.people.customers} ({formatCount(activeCustomersCount, lang)})
          </button>
          <button
            type="button"
            onClick={() => setSegment('suppliers')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              segment === 'suppliers'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.people.suppliers} ({formatCount(activeSuppliersCount, lang)})
          </button>
          <button
            type="button"
            onClick={() => setSegment('archived')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap ${
              segment === 'archived'
                ? 'bg-white dark:bg-slate-900 text-[#1769D2] dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            {t.people.archived}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 flex-1 lg:max-w-xl justify-end">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.people.searchPlaceholder}
              className="w-full min-h-[44px] pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-[#1769D2]"
            />
          </div>

          {segment !== 'archived' && (
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl shrink-0">
              {(['all', 'due', 'settled'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setBalanceFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap ${
                    balanceFilter === f
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {f === 'all' ? t.people.filterAll : f === 'due' ? t.people.filterDue : t.people.filterSettled}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Contact List */}
      {filteredList.length === 0 ? (
        <div className="py-16 px-4 text-center rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">{t.people.emptyTitle}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.people.emptyDesc}</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {filteredList.slice(0, 60).map((item) => {
            const isCust = item.kind === 'CUSTOMER';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => (isCust ? onSelectCustomer(item) : onSelectSupplier(item))}
                className="w-full flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 min-h-[64px] hover:bg-slate-50 dark:hover:bg-slate-800/60 text-left transition-colors"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-[#1769D2]/10 text-[#1769D2] dark:text-blue-400 font-bold text-sm flex items-center justify-center shrink-0">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {item.name}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {item.phone} · {item.address}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right">
                    <p
                      className={`text-sm font-bold font-mono-nums ${
                        item.balancePaisa === 0
                          ? 'text-slate-500 dark:text-slate-400'
                          : isCust
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatTaka(item.balancePaisa, lang)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {item.balancePaisa === 0
                        ? t.people.settled
                        : isCust
                        ? t.people.willReceive
                        : t.people.willPay}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </button>
            );
          })}
          {filteredList.length > 60 && (
            <div className="px-5 py-3 text-xs text-center text-slate-500 dark:text-slate-400">
              {lang === 'bn'
                ? `প্রথম ৬০টি দেখানো হচ্ছে (মোট ${formatCount(filteredList.length, lang)}টি) — নির্দিষ্ট নাম খুঁজতে সার্চ ব্যবহার করুন`
                : `Showing top 60 of ${formatCount(filteredList.length, lang)} contacts — use search to locate any record`}
            </div>
          )}
        </div>
      )}

      {/* Add Customer / Supplier Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/60 backdrop-blur-xs p-0 sm:p-4" role="dialog" aria-modal="true">
          <div className="w-full sm:max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                {newRole === 'CUSTOMER' ? t.people.addCustomer : t.people.addSupplier}
              </h2>
              <button
                type="button"
                onClick={() => onSetAddModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setNewRole('CUSTOMER')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg ${
                  newRole === 'CUSTOMER' ? 'bg-white dark:bg-slate-900 text-[#1769D2]' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.people.customers}
              </button>
              <button
                type="button"
                onClick={() => setNewRole('SUPPLIER')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg ${
                  newRole === 'SUPPLIER' ? 'bg-white dark:bg-slate-900 text-[#1769D2]' : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                {t.people.suppliers}
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 text-xs text-red-700 dark:text-red-300">
                {formError}
              </div>
            )}

            <form onSubmit={handleSaveContact} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t.people.name}</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., Salam Traders"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t.people.phone}</label>
                <input
                  type="tel"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="+88017XXXXXXXX"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t.people.address}</label>
                <input
                  type="text"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  placeholder="Mirpur-10, Dhaka"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 dark:text-slate-300 mb-1">{t.people.openingBalance}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newOpening}
                  onChange={(e) => setNewOpening(e.target.value)}
                  placeholder="0"
                  className="w-full min-h-[44px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono-nums"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => onSetAddModalOpen(false)}
                  className="flex-1 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-medium"
                >
                  {t.ledger.cancel}
                </button>
                <button
                  type="submit"
                  className="flex-1 min-h-[44px] rounded-xl bg-[#1769D2] text-white text-xs font-semibold"
                >
                  {t.ledger.saveEntry}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
