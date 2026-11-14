import { Language } from '../types/bookkeeping';

const BANGLA_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(input: string): string {
  return input.replace(/\d/g, (d) => BANGLA_DIGITS[Number(d)]);
}

export function toPaisa(taka: number): number {
  if (!Number.isFinite(taka)) return 0;
  return Math.round(taka * 100);
}

export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

export function formatTaka(
  paisa: number,
  lang: Language = 'en',
  showDecimals = false
): string {
  const value = fromPaisa(Math.abs(paisa));
  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(value);

  const prefix = paisa < 0 ? '-৳' : '৳';
  const raw = `${prefix}${formatted}`;
  return lang === 'bn' ? toBanglaDigits(raw) : raw;
}

export function formatCount(count: number, lang: Language = 'en'): string {
  const formatted = new Intl.NumberFormat('en-IN').format(count);
  return lang === 'bn' ? toBanglaDigits(formatted) : formatted;
}

export function formatDateShort(iso: string, lang: Language = 'en'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const formatted = d.toLocaleDateString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  return formatted;
}

export function formatDateTime(iso: string, lang: Language = 'en'): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function downloadCsv(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
