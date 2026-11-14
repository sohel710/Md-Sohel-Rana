import React, { useState } from 'react';
import { Delete, Lock } from 'lucide-react';
import { Language } from '../types/bookkeeping';

interface PinLockOverlayProps {
  expectedPin: string;
  shopName: string;
  lang: Language;
  onUnlock: () => void;
}

export const PinLockOverlay: React.FC<PinLockOverlayProps> = ({
  expectedPin,
  shopName,
  lang,
  onUnlock,
}) => {
  const [entered, setEntered] = useState('');
  const [error, setError] = useState(false);

  const handleDigit = (digit: string) => {
    if (entered.length >= 4) return;
    const next = entered + digit;
    setEntered(next);
    setError(false);

    if (next.length === 4) {
      if (next === expectedPin) {
        onUnlock();
        setEntered('');
      } else {
        setError(true);
        setTimeout(() => setEntered(''), 350);
      }
    }
  };

  const handleBackspace = () => {
    setEntered((prev) => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 backdrop-blur-md p-6">
      <div className="w-full max-w-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 text-center shadow-2xl">
        <div className="w-12 h-12 rounded-2xl bg-[#1769D2]/10 text-[#1769D2] flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-4">{shopName}</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          {lang === 'bn' ? 'অ্যাপ আনলক করতে ৪-সংখ্যার পিন দিন' : 'Enter your 4-digit PIN to unlock'}
        </p>

        <div className="flex items-center justify-center gap-3 my-6">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-colors ${
                error
                  ? 'bg-red-500 border-red-500'
                  : idx < entered.length
                  ? 'bg-[#1769D2] border-[#1769D2]'
                  : 'border-slate-300 dark:border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 mb-3">
            {lang === 'bn' ? 'ভুল পিন কোড। আবার চেষ্টা করুন।' : 'Incorrect PIN. Try again.'}
          </p>
        )}

        <div className="grid grid-cols-3 gap-2.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="min-h-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-lg font-semibold font-mono-nums text-slate-900 dark:text-slate-100"
            >
              {digit}
            </button>
          ))}
          <div />
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="min-h-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-lg font-semibold font-mono-nums text-slate-900 dark:text-slate-100"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="Delete digit"
            className="min-h-[48px] rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-200"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <p className="text-[11px] text-slate-400 mt-4">
          {lang === 'bn' ? 'ডিফল্ট ডেমো পিন: 1234' : 'Default demo PIN: 1234'}
        </p>
      </div>
    </div>
  );
};
