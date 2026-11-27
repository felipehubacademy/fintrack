import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  t as translate,
  getLocaleSettings,
  setLocaleSettings,
  normalizeLanguage,
  localeTagFor,
  defaultCurrencyFor,
  detectDeviceLocale,
  formatMoney,
  formatMoneyCompact,
  formatDate,
  formatRelativeDay,
  formatPercent,
  formatNumber,
  parseMoney,
  currencySymbol,
  decimalSeparator,
  SUPPORTED_LANGUAGES,
  SUPPORTED_CURRENCIES,
} from '@fintrack/shared/i18n';

export const LOCALE_STORAGE_KEY = 'meuazulao.locale.v1';
// Mirror of the saved choice so the server can render the right language.
export const LOCALE_COOKIE = 'meuazulao_locale';

const I18nContext = createContext(null);

function readSaved() {
  try {
    const raw = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    return saved && typeof saved === 'object' ? saved : null;
  } catch (_) {
    return null;
  }
}

function persist(settings) {
  try {
    window.localStorage.setItem(
      LOCALE_STORAGE_KEY,
      JSON.stringify({ language: settings.language, currency: settings.currency })
    );
  } catch (_) { /* private mode, blocked storage */ }
  try {
    const value = encodeURIComponent(`${settings.language}.${settings.currency}`);
    document.cookie = `${LOCALE_COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
  } catch (_) { /* ignore */ }
}

/** Parse "pt.BRL" (cookie) into { language, currency }. */
export function parseLocaleCookie(value) {
  if (!value) return null;
  const [lang, currency] = decodeURIComponent(value).split('.');
  if (!lang) return null;
  const language = normalizeLanguage(lang);
  return {
    language,
    currency: SUPPORTED_CURRENCIES.includes(currency) ? currency : undefined,
  };
}

/**
 * Server-side choice of language, used by _app getInitialProps:
 * saved choice (cookie) > ?lang= > Accept-Language. Returns plain data.
 */
export function resolveInitialLocale({ cookieHeader, queryLang, acceptLanguage } = {}) {
  const cookieMatch = String(cookieHeader || '').match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  const saved = cookieMatch ? parseLocaleCookie(cookieMatch[1]) : null;
  const acceptTag = String(acceptLanguage || '').split(',')[0].split(';')[0].trim() || null;
  const queryOk = queryLang && SUPPORTED_LANGUAGES.includes(String(queryLang).toLowerCase().slice(0, 2));
  const language = saved?.language
    || (queryOk ? normalizeLanguage(queryLang) : null)
    || normalizeLanguage(acceptTag || 'en');
  const locale = localeTagFor(language, acceptTag);
  return {
    language,
    locale,
    currency: saved?.currency || defaultCurrencyFor(locale),
  };
}

function buildInitial(initial) {
  if (initial && initial.language) {
    return {
      ...getLocaleSettings(),
      language: normalizeLanguage(initial.language),
      locale: initial.locale || localeTagFor(initial.language),
      currency: initial.currency || defaultCurrencyFor(initial.locale || localeTagFor(initial.language)),
    };
  }
  return getLocaleSettings();
}

function sameSettings(a, b) {
  return a.language === b.language && a.locale === b.locale && a.currency === b.currency;
}

/**
 * Holds language + currency for the web app. The initial value comes from
 * the server (cookie / ?lang= / Accept-Language) so the first paint is in
 * the right language; after mount a choice saved in localStorage wins.
 * The global i18n core is kept in sync, so plain helpers (formatCurrency,
 * module-level t) follow the same settings.
 */
export function I18nProvider({ initial, children }) {
  const [settings, setSettings] = useState(() => buildInitial(initial));

  // Keep the shared core in sync during render: helpers called while
  // rendering (formatCurrency, t) must see the same language as the tree.
  if (!sameSettings(getLocaleSettings(), settings)) {
    setLocaleSettings({ language: settings.language, locale: settings.locale, currency: settings.currency });
  }

  useEffect(() => {
    const saved = readSaved();
    let next = null;
    if (saved && (saved.language || saved.currency)) {
      const language = saved.language ? normalizeLanguage(saved.language) : settings.language;
      const locale = language === settings.language ? settings.locale : localeTagFor(language, detectDeviceLocale());
      const currency = SUPPORTED_CURRENCIES.includes(saved.currency) ? saved.currency : settings.currency;
      next = { ...settings, language, locale, currency };
    } else if (!initial || !initial.language) {
      // No server hint (static page): use ?lang= or the browser language.
      let lang = null;
      try {
        lang = new URLSearchParams(window.location.search).get('lang');
      } catch (_) { /* ignore */ }
      const device = detectDeviceLocale();
      const language = lang && SUPPORTED_LANGUAGES.includes(lang.slice(0, 2).toLowerCase())
        ? normalizeLanguage(lang)
        : normalizeLanguage(device);
      const locale = localeTagFor(language, device);
      next = { ...settings, language, locale, currency: defaultCurrencyFor(locale) };
    }
    if (next && !sameSettings(next, settings)) setSettings(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      document.documentElement.lang = settings.locale;
    } catch (_) { /* ignore */ }
  }, [settings.locale]);

  const setLanguage = useCallback((language) => {
    setSettings((prev) => {
      const lang = normalizeLanguage(language);
      const next = { ...prev, language: lang, locale: localeTagFor(lang, detectDeviceLocale()) };
      persist(next);
      return next;
    });
  }, []);

  const setCurrency = useCallback((currency) => {
    if (!SUPPORTED_CURRENCIES.includes(currency)) return;
    setSettings((prev) => {
      const next = { ...prev, currency };
      persist(next);
      return next;
    });
  }, []);

  const value = useMemo(() => {
    const opts = { locale: settings.locale, currency: settings.currency };
    const tFn = (key, params) => translate(key, { ...(params || {}), lng: settings.language });
    return {
      ...settings,
      t: tFn,
      formatMoney: (v, o) => formatMoney(v, { ...opts, ...(o || {}) }),
      formatMoneyCompact: (v, o) => formatMoneyCompact(v, { ...opts, ...(o || {}) }),
      formatNumber: (v, o) => formatNumber(v, { ...opts, ...(o || {}) }),
      formatDate: (v, style, o) => formatDate(v, style, { ...opts, ...(o || {}) }),
      formatRelativeDay: (v, o) => formatRelativeDay(v, {
        today: tFn('common.today'),
        yesterday: tFn('common.yesterday'),
      }, { ...opts, ...(o || {}) }),
      formatPercent: (v, o) => formatPercent(v, { ...opts, ...(o || {}) }),
      parseMoney: (v, o) => parseMoney(v, { ...opts, ...(o || {}) }),
      currencySymbol: () => currencySymbol(opts),
      decimalSeparator: () => decimalSeparator(opts),
      setLanguage,
      setCurrency,
      languages: SUPPORTED_LANGUAGES,
      currencies: SUPPORTED_CURRENCIES,
    };
  }, [settings, setLanguage, setCurrency]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * const { t, formatMoney, formatDate, language } = useI18n();
 * Outside the provider it falls back to the global core, so components
 * never crash for lack of a provider.
 */
export function useI18n() {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  const s = getLocaleSettings();
  return {
    ...s,
    t: translate,
    formatMoney,
    formatMoneyCompact,
    formatNumber,
    formatDate,
    formatRelativeDay: (v, o) => formatRelativeDay(v, {
      today: translate('common.today'),
      yesterday: translate('common.yesterday'),
    }, o),
    formatPercent,
    parseMoney,
    currencySymbol: () => currencySymbol(),
    decimalSeparator: () => decimalSeparator(),
    setLanguage: (language) => setLocaleSettings({ language, keepCurrency: true }),
    setCurrency: (currency) => setLocaleSettings({ currency }),
    languages: SUPPORTED_LANGUAGES,
    currencies: SUPPORTED_CURRENCIES,
  };
}

export { translate as t };
