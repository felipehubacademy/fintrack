// Date helpers that follow the user's locale (from @fintrack/shared/i18n).
//
// The formatBrazil* names are kept so existing call sites keep working; they
// are no longer Brazil-specific: they format in the active language/region
// (26/11/2026 in pt-BR, 11/26/2026 in en-US, 26/11/2026 in es-419...).
import { getLocaleSettings } from '@fintrack/shared/i18n';

export const parseDateParts = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    const isoMatch = value.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?/);
    if (isoMatch) {
      return {
        year: Number(isoMatch[1]),
        month: Number(isoMatch[2]),
        day: isoMatch[3] ? Number(isoMatch[3]) : 1,
      };
    }
    if (value.includes('T')) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        return parseDateParts(date);
      }
    }
    return null;
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return {
      year: value.getFullYear(),
      month: value.getMonth() + 1,
      day: value.getDate(),
    };
  }

  if (typeof value === 'number') {
    return parseDateParts(new Date(value));
  }

  return null;
};

/** Local Date (midnight) for a date-only value; null if it can't be parsed. */
export const toLocalDate = (value) => {
  const parts = parseDateParts(value);
  if (!parts) return null;
  return new Date(parts.year, parts.month - 1, parts.day);
};

const fmtCache = new Map();
function fmt(options, locale = getLocaleSettings().locale) {
  const key = `${locale}|${JSON.stringify(options)}`;
  if (!fmtCache.has(key)) {
    try {
      fmtCache.set(key, new Intl.DateTimeFormat(locale, options));
    } catch (_) {
      fmtCache.set(key, new Intl.DateTimeFormat('en-US', options));
    }
  }
  return fmtCache.get(key);
}

function format(value, options) {
  const date = toLocalDate(value);
  if (!date) return '';
  try {
    return fmt(options).format(date);
  } catch (_) {
    return date.toISOString().slice(0, 10);
  }
}

/** 26/11/2026 · 11/26/2026 (withYear: false -> 26/11 · 11/26) */
export const formatShortDate = (value, { withYear = true } = {}) => format(
  value,
  withYear ? { day: '2-digit', month: '2-digit', year: 'numeric' } : { day: '2-digit', month: '2-digit' },
);

/** 26 de novembro de 2026 · November 26, 2026 */
export const formatLongDate = (value, { includeYear = true } = {}) => format(
  value,
  includeYear ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'long' },
);

/** novembro de 2026 · November 2026 (short: nov. de 2026 · Nov 2026) */
export const formatMonthYear = (value, { short = false, includeYear = true } = {}) => format(
  value,
  includeYear ? { month: short ? 'short' : 'long', year: 'numeric' } : { month: short ? 'short' : 'long' },
);

/** nov. de 26 · Nov 26 (month + 2-digit year, for chart axes) */
export const formatMonthShort = (value) => format(value, { month: 'short', year: '2-digit' });

/** Month name alone: Nov · nov. */
export const formatMonthName = (value, { short = true } = {}) => format(value, { month: short ? 'short' : 'long' });

/** 26 nov · Nov 26 */
export const formatDayMonthShort = (value) => format(value, { day: 'numeric', month: 'short' });

/** 26/11 · 11/26 */
export const formatDayMonthNumeric = (value) => formatShortDate(value, { withYear: false });

/** YYYY-MM key -> "Nov" label in the active locale (month pills). */
export const monthKeyLabel = (monthKey, { short = true } = {}) => formatMonthName(`${monthKey}-01`, { short });

// Backwards-compatible names (used across the app).
export const formatBrazilDate = formatShortDate;
export const formatBrazilDateLong = formatLongDate;
export const formatBrazilMonthYear = formatMonthYear;
export const formatBrazilMonthShort = formatMonthShort;
export const formatBrazilTimelineLabel = formatMonthShort;
export const formatBrazilDayMonthShort = formatDayMonthShort;
export const formatBrazilDayMonthNumeric = formatDayMonthNumeric;
