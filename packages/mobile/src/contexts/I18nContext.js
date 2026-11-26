import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  t as translate,
  getLocaleSettings,
  setLocaleSettings,
  subscribeLocale,
  formatMoney,
  formatMoneyCompact,
  formatDate,
  formatRelativeDay,
  formatPercent,
  parseMoney,
  currencySymbol,
  SUPPORTED_LANGUAGES,
  SUPPORTED_CURRENCIES,
} from '@fintrack/shared/i18n';

const STORAGE_KEY = 'meuazulao.locale.v1';
const I18nContext = createContext(null);

/**
 * Holds language + currency. Defaults come from the device locale
 * (shared i18n core); a user choice is persisted in AsyncStorage.
 * Components re-render on change because the context value changes.
 */
export function I18nProvider({ children }) {
  const [settings, setSettings] = useState(getLocaleSettings());

  useEffect(() => {
    const unsubscribe = subscribeLocale(setSettings);
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setLocaleSettings({
          language: saved.language,
          currency: saved.currency,
        });
      })
      .catch(() => {});
    return unsubscribe;
  }, []);

  const persist = useCallback((next) => {
    AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ language: next.language, currency: next.currency })
    ).catch(() => {});
  }, []);

  const setLanguage = useCallback((language) => {
    persist(setLocaleSettings({ language, keepCurrency: true }));
  }, [persist]);

  const setCurrency = useCallback((currency) => {
    persist(setLocaleSettings({ currency }));
  }, [persist]);

  const value = useMemo(() => ({
    ...settings,
    t: (key, params) => translate(key, params),
    formatMoney: (v, o) => formatMoney(v, o),
    formatMoneyCompact: (v, o) => formatMoneyCompact(v, o),
    formatDate: (v, style, o) => formatDate(v, style, o),
    formatRelativeDay: (v, o) => formatRelativeDay(v, {
      today: translate('common.today'),
      yesterday: translate('common.yesterday'),
    }, o),
    formatPercent: (v, o) => formatPercent(v, o),
    parseMoney: (v, o) => parseMoney(v, o),
    currencySymbol: () => currencySymbol(),
    setLanguage,
    setCurrency,
    languages: SUPPORTED_LANGUAGES,
    currencies: SUPPORTED_CURRENCIES,
  }), [settings, setLanguage, setCurrency]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/**
 * const { t, formatMoney, formatDate, language } = useI18n();
 * Outside the provider (tests, utils) it falls back to the global core,
 * so components never crash for lack of a provider.
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
    formatDate,
    formatRelativeDay: (v, o) => formatRelativeDay(v, {
      today: translate('common.today'),
      yesterday: translate('common.yesterday'),
    }, o),
    formatPercent,
    parseMoney,
    currencySymbol,
    setLanguage: (language) => setLocaleSettings({ language, keepCurrency: true }),
    setCurrency: (currency) => setLocaleSettings({ currency }),
    languages: SUPPORTED_LANGUAGES,
    currencies: SUPPORTED_CURRENCIES,
  };
}

export { translate as t };
