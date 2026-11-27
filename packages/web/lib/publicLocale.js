/**
 * Language for public pages (login, legal, delete-account).
 *
 * Server: resolveRequestLanguage() picks ?lang=en|pt|es, else the
 * Accept-Language header, else English, so the first paint is already in
 * the right language. Client: useApplyLanguage() pushes it into the shared
 * locale settings so formatters and later t() calls follow it.
 */

import { useEffect } from 'react';
import { SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE, setLocaleSettings, getLocaleSettings } from '@fintrack/shared/i18n';

export function pickLanguage(value) {
  const base = String(value || '').toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.includes(base) ? base : null;
}

/** "pt-BR,pt;q=0.9,en;q=0.8" -> 'pt' (first supported, by q order). */
export function languageFromAcceptLanguage(header) {
  if (!header) return null;
  const entries = String(header).split(',').map((part, index) => {
    const [tag, ...params] = part.trim().split(';');
    const q = params.map((p) => p.trim()).find((p) => p.startsWith('q='));
    return { tag, q: q ? Number(q.slice(2)) || 0 : 1, index };
  }).sort((a, b) => (b.q - a.q) || (a.index - b.index));
  for (const { tag } of entries) {
    const lang = pickLanguage(tag);
    if (lang) return lang;
  }
  return null;
}

export function resolveRequestLanguage({ query, req, fallback = null } = {}) {
  const fromQuery = pickLanguage(Array.isArray(query?.lang) ? query.lang[0] : query?.lang);
  if (fromQuery) return fromQuery;
  if (fallback) return fallback;
  return languageFromAcceptLanguage(req?.headers?.['accept-language']) || DEFAULT_LANGUAGE;
}

/**
 * getServerSideProps for public pages: { props: { lang, langExplicit } }.
 * langExplicit is true when the language came from ?lang= or from the page
 * itself (e.g. /privacidade), not just from the browser.
 */
export function localeServerSideProps(defaultLanguage = null) {
  return async ({ query, req }) => ({
    props: {
      lang: resolveRequestLanguage({ query, req, fallback: defaultLanguage }),
      langExplicit: Boolean(pickLanguage(query?.lang) || defaultLanguage),
    },
  });
}

/**
 * Apply an explicitly chosen page language to the shared locale settings on
 * mount (a browser-derived language does not override a saved preference).
 */
export function useApplyLanguage(lang, explicit = true) {
  useEffect(() => {
    if (explicit && lang && getLocaleSettings().language !== lang) {
      setLocaleSettings({ language: lang });
    }
  }, [lang, explicit]);
}
