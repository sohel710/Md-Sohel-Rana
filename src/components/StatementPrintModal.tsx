import React from 'react';
import { Printer, X } from 'lucide-react';
import {
  BusinessRecord,
  CustomerRecord,
  Language,
  SupplierRecord,
  TransactionRecord,
} from '../types/bookkeeping';
import { formatDateShort, formatTaka } from '../utils/currency';

interface StatementPrintModalProps {
  open: boolean;
  business: BusinessRecord;
  person?: CustomerRecord | SupplierRecord | null;
  personType?: 'CUSTOMER' | 'SUPPLIER';
  transactions: TransactionRecord[];
  totalReceivablePaisa: number;
  totalPayablePaisa: number;
  lang: Language;
  onClose: () => void;
}

export const StatementPrintModal: React.FC<StatementPrintModalProps> = ({
  open,
  business,
  person,
  personType,
  transactions,
  totalReceivablePaisa,
  totalPayablePaisa,
  lang,
  onClose,
}) => {
  if (!open) return null;

  const filteredTx = person
    ? transactions.filter((tx) => tx.partyId === person.id)
    : transactions.slice(0, 30);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-h-[92vh] overflow-y-auto print-only-container">
        <div className="no-print flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {lang === 'bn' ? 'প্রিন্ট ও PDF স্টেটমেন্ট প্রিভিউ' : 'PDF Statement Preview'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="min-h-[40px] px-4 py-2 text-xs font-semibold rounded-xl bg-[#1769D2] text-white inline-flex items-center gap-2 hover:bg-[#1254AA]"
            >
              <Printer className="w-4 h-4" />
              {lang === 'bn' ? 'প্রিন্ট / PDF সেভ' : 'Print / Save PDF'}
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close statement"
              className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 sm:p-8 space-y-6 text-slate-900 dark:text-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-5 border-b border-slate-200 dark:border-slate-800">
            <div>
              <p className="text-xs font-semibold text-[#1769D2]">DUE NOTE STATEMENT</p>
              <h1 className="text-2xl font-bold mt-1">
                {lang === 'bn' ? business.nameBn : business.name}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {business.address} · {business.phone}
              </p>
            </div>
            <div className="sm:text-right text-xs text-slate-500 dark:text-slate-400">
              <p>{lang === 'bn' ? 'প্রস্তুতির তারিখ:' : 'Generated:'} {formatDateShort(new Date().toISOString(), lang)}</p>
              <p className="mt-1">{lang === 'bn' ? 'মুদ্রা:' : 'Currency:'} BDT (৳)</p>
            </div>
          </div>

          {person ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {personType === 'CUSTOMER' ? (lang === 'bn' ? 'কাস্টমার' : 'Customer') : (lang === 'bn' ? 'সাপ্লায়ার' : 'Supplier')}
                </p>
                <p className="text-base font-bold mt-0.5">{person.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{person.phone} · {person.address}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {lang === 'bn' ? 'বর্তমান ব্যালেন্স' : 'Outstanding Balance'}
                </p>
                <p className="text-2xl font-bold font-mono-nums text-[#1769D2] dark:text-blue-400 mt-0.5">
                  {formatTaka(person.balancePaisa, lang)}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'মোট পাওনা' : 'Total Receivable'}</p>
                <p className="text-xl font-bold font-mono-nums text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {formatTaka(totalReceivablePaisa, lang)}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{lang === 'bn' ? 'মোট দেনা' : 'Total Payable'}</p>
                <p className="text-xl font-bold font-mono-nums text-red-600 dark:text-red-400 mt-0.5">
                  {formatTaka(totalPayablePaisa, lang)}
                </p>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">{lang === 'bn' ? 'তারিখ' : 'Date'}</th>
                  <th className="py-2.5 pr-3 font-medium">{lang === 'bn' ? 'বিবরণ' : 'Details'}</th>
                  <th className="py-2.5 pr-3 font-medium">{lang === 'bn' ? 'ধরন' : 'Type'}</th>
                  <th className="py-2.5 text-right font-medium">{lang === 'bn' ? 'পরিমাণ' : 'Amount'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTx.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-500">
                      {lang === 'bn' ? 'এই সময়ের কোনো লেনদেন নেই' : 'No ledger transactions for this statement.'}
                    </td>
                  </tr>
                ) : (
                  filteredTx.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2.5 pr-3 whitespace-nowrap">{formatDateShort(tx.date, lang)}</td>
                      <td className="py-2.5 pr-3">
                        <span className="font-medium">{tx.partyName}</span>
                        {tx.note ? <span className="text-slate-500"> · {tx.note}</span> : null}
                      </td>
                      <td className="py-2.5 pr-3 whitespace-nowrap text-slate-500">{tx.kind.replace('_', ' ')}</td>
                      <td className="py-2.5 text-right font-mono-nums font-semibold whitespace-nowrap">
                        {formatTaka(tx.amountPaisa, lang)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
