/**
 * MeuAzulão i18n core, shared by mobile, web and backend.
 *
 * - Languages: en (default, international), pt (Brazil), es (Latin America).
 * - One global "locale settings" object (language, BCP-47 locale, currency)
 *   that formatCurrency/formatDate read, so existing call sites become
 *   locale-aware without changes.
 * - Dictionaries are plain objects: resources[lang][namespace][key...].
 *   Keys are "namespace.path.to.key". Missing keys fall back to English,
 *   then to the key itself.
 * - Interpolation: "Hi {{name}}". Plurals: pass { count } and define
 *   "key_one" / "key_other" (key_zero optional).
 */

export const SUPPORTED_LANGUAGES = ['en', 'pt', 'es'];
export const DEFAULT_LANGUAGE = 'en';

// Default BCP-47 tag per language when the device gives no region.
const DEFAULT_TAG = { en: 'en-US', pt: 'pt-BR', es: 'es-419' };

// Region -> currency. Anything not listed falls back by language.
const REGION_CURRENCY = {
  BR: 'BRL', US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD', NZ: 'NZD', IE: 'EUR',
  PT: 'EUR', ES: 'EUR', DE: 'EUR', FR: 'EUR', IT: 'EUR', NL: 'EUR', BE: 'EUR',
  AT: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR', CH: 'CHF', IN: 'INR', JP: 'JPY',
  MX: 'MXN', AR: 'ARS', CO: 'COP', CL: 'CLP', PE: 'PEN', UY: 'UYU', PY: 'PYG',
  BO: 'BOB', EC: 'USD', VE: 'VES', CR: 'CRC', PA: 'USD', DO: 'DOP', GT: 'GTQ',
  HN: 'HNL', NI: 'NIO', SV: 'USD', PR: 'USD', AO: 'AOA', MZ: 'MZN',
};
const LANGUAGE_CURRENCY = { en: 'USD', pt: 'BRL', es: 'USD' };

export const SUPPORTED_CURRENCIES = [
  'USD', 'BRL', 'EUR', 'GBP', 'CAD', 'AUD', 'MXN', 'ARS', 'COP', 'CLP', 'PEN',
  'UYU', 'PYG', 'BOB', 'CRC', 'DOP', 'GTQ', 'CHF', 'INR', 'JPY',
];

/** 'pt-BR' | 'pt_PT' | 'es-MX' | 'en' -> 'pt' | 'es' | 'en' */
export function normalizeLanguage(tag) {
  const base = String(tag || '').toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : DEFAULT_LANGUAGE;
}

/** 'pt-BR' -> 'BR'; 'es-419' -> null */
export function regionOf(tag) {
  const parts = String(tag || '').split(/[-_]/);
  const region = parts.find((p, i) => i > 0 && /^[A-Za-z]{2}$/.test(p));
  return region ? region.toUpperCase() : null;
}

export function defaultCurrencyFor(tag) {
  const region = regionOf(tag);
  if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  return LANGUAGE_CURRENCY[normalizeLanguage(tag)] || 'USD';
}

/** Best-effort device/browser/runtime locale. */
export function detectDeviceLocale() {
  try {
    if (typeof navigator !== 'undefined') {
      const nav = navigator.languages?.[0] || navigator.language;
      if (nav) return nav;
    }
  } catch (_) { /* ignore */ }
  try {
    const tag = Intl.DateTimeFormat().resolvedOptions().locale;
    if (tag) return tag;
  } catch (_) { /* ignore */ }
  return DEFAULT_TAG[DEFAULT_LANGUAGE];
}

/** Build a full locale tag for a language, keeping the device region if it fits. */
export function localeTagFor(language, deviceTag) {
  const lang = normalizeLanguage(language);
  if (deviceTag && normalizeLanguage(deviceTag) === lang && regionOf(deviceTag)) {
    return `${lang}-${regionOf(deviceTag)}`;
  }
  return DEFAULT_TAG[lang];
}

// ---------------------------------------------------------------------------
// Global settings
// ---------------------------------------------------------------------------

let settings = buildSettings({});
const listeners = new Set();

function buildSettings({ language, locale, currency, timeZone }) {
  const device = detectDeviceLocale();
  const lang = normalizeLanguage(language || locale || device);
  const tag = locale && normalizeLanguage(locale) === lang ? locale : localeTagFor(lang, device);
  let tz = timeZone;
  if (!tz) {
    try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (_) { tz = undefined; }
  }
  return {
    language: lang,
    locale: tag,
    currency: currency || defaultCurrencyFor(tag),
    timeZone: tz || 'UTC',
  };
}

export function getLocaleSettings() {
  return settings;
}

/**
 * Update language/locale/currency/timeZone. Unspecified fields are re-derived
 * (currency is kept if it was explicitly set before and not overridden).
 */
export function setLocaleSettings(next = {}) {
  const merged = {
    language: next.language ?? settings.language,
    locale: next.locale ?? (next.language ? undefined : settings.locale),
    currency: next.currency ?? (next.language || next.locale ? undefined : settings.currency),
    timeZone: next.timeZone ?? settings.timeZone,
  };
  if (next.keepCurrency) merged.currency = settings.currency;
  settings = buildSettings(merged);
  listeners.forEach((fn) => {
    try { fn(settings); } catch (_) { /* ignore */ }
  });
  return settings;
}

export function subscribeLocale(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

// ---------------------------------------------------------------------------
// Translation
// ---------------------------------------------------------------------------

let resources = {};

/** Register dictionaries: { en: { common: {...} }, pt: {...} } (deep-merged). */
export function addResources(bundle) {
  for (const lang of Object.keys(bundle || {})) {
    resources[lang] = resources[lang] || {};
    for (const ns of Object.keys(bundle[lang] || {})) {
      resources[lang][ns] = deepMerge(resources[lang][ns] || {}, bundle[lang][ns] || {});
    }
  }
}

function deepMerge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b)) {
    out[k] = b[k] && typeof b[k] === 'object' && !Array.isArray(b[k])
      ? deepMerge(a[k] || {}, b[k])
      : b[k];
  }
  return out;
}

function lookup(lang, key) {
  let node = resources[lang];
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined;
    node = node[part];
  }
  return node;
}

function pluralKey(lang, key, count) {
  if (count === 0 && lookup(lang, `${key}_zero`) !== undefined) return `${key}_zero`;
  let rule = 'other';
  try { rule = new Intl.PluralRules(lang).select(count); } catch (_) { rule = count === 1 ? 'one' : 'other'; }
  const k = `${key}_${rule}`;
  if (lookup(lang, k) !== undefined) return k;
  if (lookup(lang, `${key}_other`) !== undefined) return `${key}_other`;
  return key;
}

function interpolate(str, params) {
  if (!params) return str;
  return str.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, name) => (
    params[name] === undefined || params[name] === null ? m : String(params[name])
  ));
}

/**
 * t('dashboard.greeting', { name: 'Ana' })
 * Optional params.lng forces a language (useful in backend/WhatsApp).
 */
export function t(key, params = {}) {
  const langs = [params.lng || settings.language, DEFAULT_LANGUAGE];
  for (const lang of langs) {
    const k = typeof params.count === 'number' ? pluralKey(lang, key, params.count) : key;
    const value = lookup(lang, k);
    if (typeof value === 'string') return interpolate(value, params);
    if (Array.isArray(value)) return value;
  }
  return params.defaultValue !== undefined ? interpolate(String(params.defaultValue), params) : key;
}

/** Returns a t() bound to one language (for server-side messages). */
export function getFixedT(lng) {
  const language = normalizeLanguage(lng);
  return (key, params = {}) => t(key, { ...params, lng: language });
}

/** For tests: has this key in this language? */
export function hasKey(lang, key) {
  return lookup(lang, key) !== undefined;
}

export function getResources() {
  return resources;
}
