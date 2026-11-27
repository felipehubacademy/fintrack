/**
 * Browser helpers that attach the Supabase access token to calls to our own
 * API routes (pages/api/**), which now require `Authorization: Bearer`.
 *
 *   import { apiFetch } from '../lib/apiFetch';
 *   await apiFetch('/api/account/delete', { method: 'POST' });
 *
 * installApiAuthFetch() patches window.fetch once so that every same-origin
 * request to /api/* carries the token, without touching each call site.
 * Call it once on the client (e.g. in pages/_app.jsx).
 */

import { supabase } from './supabaseClient';

export async function getAccessToken() {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || null;
  } catch (_) {
    return null;
  }
}

function withAuthHeader(headersInit, token) {
  const headers = new Headers(headersInit || {});
  if (token && !headers.has('Authorization')) headers.set('Authorization', `Bearer ${token}`);
  return headers;
}

export async function apiFetch(input, init = {}) {
  const token = await getAccessToken();
  return fetch(input, { ...init, headers: withAuthHeader(init.headers, token) });
}

/** True for "/api/..." and for absolute URLs to this origin's /api/. */
export function isOwnApiUrl(url, origin) {
  if (!url) return false;
  try {
    const parsed = new URL(String(url), origin);
    return parsed.origin === origin && parsed.pathname.startsWith('/api/');
  } catch (_) {
    return false;
  }
}

export function installApiAuthFetch() {
  if (typeof window === 'undefined' || window.__apiAuthFetchInstalled) return;
  window.__apiAuthFetchInstalled = true;
  const originalFetch = window.fetch.bind(window);
  const origin = window.location.origin;

  window.fetch = async (input, init) => {
    const isRequest = typeof Request !== 'undefined' && input instanceof Request;
    const url = isRequest ? input.url : input;
    if (!isOwnApiUrl(url, origin)) return originalFetch(input, init);

    const token = await getAccessToken();
    if (!token) return originalFetch(input, init);
    if (isRequest) {
      return originalFetch(new Request(input, { headers: withAuthHeader(input.headers, token) }), init);
    }
    return originalFetch(input, { ...(init || {}), headers: withAuthHeader(init?.headers, token) });
  };
}
