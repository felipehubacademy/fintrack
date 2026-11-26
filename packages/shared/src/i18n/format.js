import { getLocaleSettings } from './core.js';

const nfCache = new Map();
function numberFormat(locale, options) {
  const key = `${locale}|${JSON.stringify(options)}`;
  if (!nfCache.has(key)) nfCache.set(key, new Intl.NumberFormat(locale, options));
  return nfCache.get(key);
}

/** Money in the user's currency and locale. formatMoney(1234.5) -> "$1,234.50" / "R$ 1.234,50" */
export function formatMoney(value, opts = {}) {
  const { locale, currency } = { ...getLocaleSettings(), ...opts };
  const n = Number(value);
  const safe = Number.isFinite(n) ? n : 0;
  try {
    return numberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: opts.minimumFractionDigits,
      maximumFractionDigits: opts.maximumFractionDigits,
    }).format(safe);
  } catch (_) {
    return `${currency} ${safe.toFixed(2)}`;
  }
}

/** Compact money: "$1.2K", "R$ 1,2 mil" */
export function formatMoneyCompact(value, opts = {}) {
  const { locale, currency } = { ...getLocaleSettings(), ...opts };
  const n = Number(value) || 0;
  try {
    return numberFormat(locale, { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 1 }).format(n);
  } catch (_) {
    return formatMoney(n, opts);
  }
}

export function formatNumber(value, opts = {}) {
  const { locale } = { ...getLocaleSettings(), ...opts };
  return numberFormat(locale, opts.numberOptions || {}).format(Number(value) || 0);
}

export function formatPercent(value, opts = {}) {
  const { locale } = { ...getLocaleSettings(), ...opts };
  return numberFormat(locale, { style: 'percent', maximumFractionDigits: opts.maximumFractionDigits ?? 0 }).format(Number(value) || 0);
}

/** Currency symbol for the active currency ("R$", "$", "€"). */
export function currencySymbol(opts = {}) {
  const { locale, currency } = { ...getLocaleSettings(), ...opts };
  try {
    const part = numberFormat(locale, { style: 'currency', currency }).formatToParts(0).find((p) => p.type === 'currency');
    return part ? part.value : currency;
  } catch (_) {
    return currency;
  }
}

/** Decimal separator for the active locale ("," or "."). */
export function decimalSeparator(opts = {}) {
  const { locale } = { ...getLocaleSettings(), ...opts };
  try {
    return numberFormat(locale, {}).formatToParts(1.1).find((p) => p.type === 'decimal')?.value || '.';
  } catch (_) {
    return '.';
  }
}

/**
 * Parse a user-typed amount in the active locale: "1.234,56" (pt) or "1,234.56" (en).
 * Also accepts a plain "12.5" / "12,5".
 */
export function parseMoney(input, opts = {}) {
  if (typeof input === 'number') return input;
  let s = String(input || '').replace(/[^\d.,-]/g, '');
  if (!s) return 0;
  const dec = decimalSeparator(opts);
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  let decimalChar = dec;
  if (lastComma >= 0 && lastDot >= 0) decimalChar = lastComma > lastDot ? ',' : '.';
  else if (lastComma >= 0 && s.length - lastComma - 1 <= 2) decimalChar = ',';
  else if (lastDot >= 0 && s.length - lastDot - 1 <= 2) decimalChar = '.';
  const thousands = decimalChar === ',' ? '.' : ',';
  s = s.split(thousands).join('').replace(decimalChar, '.');
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

function toDate(d) {
  if (d instanceof Date) return d;
  if (typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [y, m, day] = d.split('-').map(Number);
    return new Date(y, m - 1, day); // date-only strings are local dates
  }
  return new Date(d);
}

/**
 * Dates in the user's locale. style: 'short' (26/11/2026, 11/26/2026),
 * 'medium' (Nov 26, 2026), 'long', 'dayMonth' (26 Nov), 'monthYear' (November 2026),
 * 'weekday' (Thursday), 'time' (14:30 / 2:30 PM).
 */
export function formatDate(value, style = 'medium', opts = {}) {
  const { locale } = { ...getLocaleSettings(), ...opts };
  const d = toDate(value);
  if (Number.isNaN(d.getTime())) return '';
  const presets = {
    short: { day: '2-digit', month: '2-digit', year: 'numeric' },
    medium: { day: 'numeric', month: 'short', year: 'numeric' },
    long: { day: 'numeric', month: 'long', year: 'numeric' },
    dayMonth: { day: 'numeric', month: 'short' },
    monthYear: { month: 'long', year: 'numeric' },
    month: { month: 'long' },
    monthShort: { month: 'short' },
    weekday: { weekday: 'long' },
    weekdayShort: { weekday: 'short' },
    time: { hour: 'numeric', minute: '2-digit' },
    dateTime: { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' },
  };
  try {
    return new Intl.DateTimeFormat(locale, presets[style] || presets.medium).format(d);
  } catch (_) {
    return d.toISOString().slice(0, 10);
  }
}

/** "Today" / "Yesterday" aware label, falling back to formatDate(dayMonth). */
export function formatRelativeDay(value, labels = {}, opts = {}) {
  const d = toDate(value);
  const today = new Date();
  const start = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(today) - start(d)) / 86400000);
  if (diff === 0 && labels.today) return labels.today;
  if (diff === 1 && labels.yesterday) return labels.yesterday;
  return formatDate(d, 'dayMonth', opts);
}
