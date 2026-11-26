/**
 * Language, country, currency and timezone helpers for Zul.
 * Everything is derived from the WhatsApp number (E.164 digits) unless the
 * user chose otherwise.
 */

export const LANGUAGES = ['en', 'pt', 'es'];

// Calling code -> country data. Longest prefix wins (1809 before 1).
const COUNTRIES = {
  55: { country: 'BR', lang: 'pt', currency: 'BRL', tz: 'America/Sao_Paulo' },
  52: { country: 'MX', lang: 'es', currency: 'MXN', tz: 'America/Mexico_City' },
  57: { country: 'CO', lang: 'es', currency: 'COP', tz: 'America/Bogota' },
  54: { country: 'AR', lang: 'es', currency: 'ARS', tz: 'America/Argentina/Buenos_Aires' },
  56: { country: 'CL', lang: 'es', currency: 'CLP', tz: 'America/Santiago' },
  51: { country: 'PE', lang: 'es', currency: 'PEN', tz: 'America/Lima' },
  593: { country: 'EC', lang: 'es', currency: 'USD', tz: 'America/Guayaquil' },
  58: { country: 'VE', lang: 'es', currency: 'VES', tz: 'America/Caracas' },
  591: { country: 'BO', lang: 'es', currency: 'BOB', tz: 'America/La_Paz' },
  595: { country: 'PY', lang: 'es', currency: 'PYG', tz: 'America/Asuncion' },
  598: { country: 'UY', lang: 'es', currency: 'UYU', tz: 'America/Montevideo' },
  506: { country: 'CR', lang: 'es', currency: 'CRC', tz: 'America/Costa_Rica' },
  507: { country: 'PA', lang: 'es', currency: 'USD', tz: 'America/Panama' },
  503: { country: 'SV', lang: 'es', currency: 'USD', tz: 'America/El_Salvador' },
  502: { country: 'GT', lang: 'es', currency: 'GTQ', tz: 'America/Guatemala' },
  504: { country: 'HN', lang: 'es', currency: 'HNL', tz: 'America/Tegucigalpa' },
  505: { country: 'NI', lang: 'es', currency: 'NIO', tz: 'America/Managua' },
  53: { country: 'CU', lang: 'es', currency: 'USD', tz: 'America/Havana' },
  1809: { country: 'DO', lang: 'es', currency: 'DOP', tz: 'America/Santo_Domingo' },
  1829: { country: 'DO', lang: 'es', currency: 'DOP', tz: 'America/Santo_Domingo' },
  1849: { country: 'DO', lang: 'es', currency: 'DOP', tz: 'America/Santo_Domingo' },
  1: { country: 'US', lang: 'en', currency: 'USD', tz: 'America/New_York' },
  44: { country: 'GB', lang: 'en', currency: 'GBP', tz: 'Europe/London' },
  351: { country: 'PT', lang: 'en', currency: 'EUR', tz: 'Europe/Lisbon' },
  34: { country: 'ES', lang: 'en', currency: 'EUR', tz: 'Europe/Madrid' },
  49: { country: 'DE', lang: 'en', currency: 'EUR', tz: 'Europe/Berlin' },
  33: { country: 'FR', lang: 'en', currency: 'EUR', tz: 'Europe/Paris' },
  39: { country: 'IT', lang: 'en', currency: 'EUR', tz: 'Europe/Rome' },
  353: { country: 'IE', lang: 'en', currency: 'EUR', tz: 'Europe/Dublin' },
  61: { country: 'AU', lang: 'en', currency: 'AUD', tz: 'Australia/Sydney' },
  91: { country: 'IN', lang: 'en', currency: 'INR', tz: 'Asia/Kolkata' },
};

const PREFIXES = Object.keys(COUNTRIES).sort((a, b) => b.length - a.length);
const FALLBACK = { country: null, lang: 'en', currency: 'USD', tz: 'UTC' };
const COUNTRIES_ES = new Set(['MX', 'CO', 'AR', 'CL', 'PE', 'EC', 'VE', 'BO', 'PY', 'UY', 'CR', 'PA', 'SV', 'GT', 'HN', 'NI', 'DO', 'CU']);

export function digitsOnly(phone) {
  return String(phone || '').replace(/\D/g, '');
}

/** '+55 11 98765-4321' -> '+5511987654321' */
export function toE164(phone) {
  const d = digitsOnly(phone);
  return d ? `+${d}` : '';
}

export function countryInfo(phone) {
  const d = digitsOnly(phone);
  const prefix = PREFIXES.find((p) => d.startsWith(p));
  return prefix ? { callingCode: prefix, ...COUNTRIES[prefix] } : { callingCode: null, ...FALLBACK };
}

/** Rule from the plan: +55 -> pt, LatAm codes -> es, everything else -> en. */
export function languageFromPhone(phone) {
  return countryInfo(phone).lang;
}

export function currencyFromPhone(phone) {
  return countryInfo(phone).currency;
}

export function timezoneFromPhone(phone) {
  return countryInfo(phone).tz;
}

export function normalizeLanguage(lang) {
  const base = String(lang || '').toLowerCase().split(/[-_]/)[0];
  return LANGUAGES.includes(base) ? base : null;
}

/** Lowercase, no accents, single spaces. */
export function normalizeText(text) {
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}+/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const SWITCH = {
  en: ['english', 'ingles', 'in english', 'em ingles', 'en ingles'],
  es: ['espanol', 'spanish', 'espanhol', 'en espanol', 'em espanhol', 'in spanish'],
  pt: ['portugues', 'portuguese', 'em portugues', 'en portugues', 'in portuguese'],
};

/** Returns 'en' | 'es' | 'pt' when the whole message is a language switch. */
export function languageSwitch(text) {
  const n = normalizeText(text).replace(/[.!?¡¿]/g, '').trim();
  for (const [lang, words] of Object.entries(SWITCH)) {
    if (words.includes(n)) return lang;
  }
  return null;
}

/** BCP-47 locale used for Intl formatting. */
export function localeFor(lang, phone) {
  const { country } = countryInfo(phone);
  if (lang === 'pt') return 'pt-BR';
  if (lang === 'es') return country && COUNTRIES_ES.has(country) ? `es-${country}` : 'es-419';
  return country === 'GB' ? 'en-GB' : 'en-US';
}

export const SUPPORTED_CURRENCIES = [
  'USD', 'BRL', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN',
  'UYU', 'PYG', 'BOB', 'CRC', 'DOP', 'GTQ', 'HNL', 'NIO', 'VES', 'CHF', 'INR', 'JPY',
];

const ZERO_DECIMALS = new Set(['CLP', 'PYG', 'JPY', 'COP']);

/** Intl money formatting with plain spaces (WhatsApp renders NBSP oddly on some phones). */
export function formatMoney(amount, { currency = 'USD', lang = 'en', phone = '' } = {}) {
  const value = Number(amount) || 0;
  const digits = ZERO_DECIMALS.has(currency) && Number.isInteger(value) ? 0 : 2;
  let out;
  try {
    out = new Intl.NumberFormat(localeFor(lang, phone), {
      style: 'currency',
      currency,
      minimumFractionDigits: digits,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (_) {
    out = `${currency} ${value.toFixed(2)}`;
  }
  return out.replace(/[  ]/g, ' ');
}

/** YYYY-MM-DD for "now" in a timezone. */
export function localDate(tz = 'UTC', now = new Date()) {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);
  } catch (_) {
    return now.toISOString().slice(0, 10);
  }
}

export function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Same day-of-month N months later (clamped to the month's last day). */
export function addMonths(isoDate, months, day = null) {
  const [y, m, d] = isoDate.split('-').map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1, 12));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0, 12)).getUTCDate();
  target.setUTCDate(Math.min(day || d, lastDay));
  return target.toISOString().slice(0, 10);
}

export function monthStart(isoDate) {
  return `${isoDate.slice(0, 7)}-01`;
}

/** Short human date: "26 de nov." (pt) or "Nov 26" (en). */
export function formatShortDate(isoDate, lang, phone) {
  try {
    const d = new Date(`${isoDate}T12:00:00Z`);
    return new Intl.DateTimeFormat(localeFor(lang, phone), {
      day: 'numeric', month: 'short', timeZone: 'UTC',
    }).format(d);
  } catch (_) {
    return isoDate;
  }
}
