import { useCallback, useEffect, useState } from 'react';
import { isFeatureEnabled } from '@fintrack/shared/config';
import { useI18n } from '../contexts/I18nContext';
import { subscribePathFor } from '../lib/billingPages';

/**
 * Billing state of the signed-in household, from GET /api/billing/status
 * (installApiAuthFetch adds the token). One request is shared by every
 * component on the page and kept for a few minutes.
 *
 * Fails open: while loading, on errors or when the paywall flag is off,
 * hasAccess is true. Nobody is blocked because a request failed.
 */

const TTL_MS = 5 * 60 * 1000;
let cache = { key: null, data: null, at: 0, promise: null };
const listeners = new Set();

function notify() {
  for (const fn of listeners) fn(cache.data);
}

async function load(currency, { force = false } = {}) {
  const key = currency || '';
  const fresh = cache.key === key && cache.data && Date.now() - cache.at < TTL_MS;
  if (!force && fresh) return cache.data;
  if (!force && cache.promise && cache.key === key) return cache.promise;

  cache.key = key;
  cache.promise = (async () => {
    try {
      const res = await fetch(`/api/billing/status${currency ? `?currency=${encodeURIComponent(currency)}` : ''}`);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const body = await res.json();
      cache = { ...cache, data: body, at: Date.now(), error: null };
    } catch (err) {
      cache = { ...cache, error: err, at: Date.now() };
    } finally {
      cache.promise = null;
      notify();
    }
    return cache.data;
  })();
  return cache.promise;
}

/** For tests and after a purchase. */
export function resetBillingStatusCache() {
  cache = { key: null, data: null, at: 0, promise: null };
}

export function useBillingStatus() {
  const { currency, language } = useI18n();
  const [data, setData] = useState(cache.data);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isFeatureEnabled('paywall')) return undefined;
    const onChange = (next) => {
      setData(next);
      setError(cache.error || null);
    };
    listeners.add(onChange);
    load(currency);
    return () => listeners.delete(onChange);
  }, [currency]);

  const refresh = useCallback(() => load(currency, { force: true }), [currency]);

  const paywallEnabled = isFeatureEnabled('paywall') && data?.paywallEnabled !== false;
  return {
    status: data,
    loading: !data && !error,
    error,
    paywallEnabled,
    hasAccess: !paywallEnabled || !data || data.hasAccess !== false,
    subscribePath: subscribePathFor(language, data?.organizationId),
    refresh,
  };
}
