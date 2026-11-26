/**
 * Account helpers shared by Settings, More and Login:
 * - base URL of the web app / API (EXPO_PUBLIC_API_URL, default production)
 * - links to the hosted privacy policy and terms in the user's language
 * - account deletion through the web API (deletes data AND the Auth user
 *   server-side; required by Apple guideline 5.1.1(v))
 */

export const DEFAULT_WEB_URL = 'https://meuazulao.com.br';

export function getWebBaseUrl(envValue = process.env.EXPO_PUBLIC_API_URL) {
  const raw = (envValue || '').trim() || DEFAULT_WEB_URL;
  return raw.replace(/\/+$/, '').replace(/\/api$/, '');
}

const LEGAL_PATHS = { privacy: '/privacy', terms: '/terms' };

/** legalUrl('privacy', 'pt') -> https://meuazulao.com.br/privacy?lang=pt */
export function legalUrl(kind, language = 'en', baseUrl = getWebBaseUrl()) {
  const path = LEGAL_PATHS[kind];
  if (!path) throw new Error(`Unknown legal page: ${kind}`);
  const lang = ['en', 'pt', 'es'].includes(language) ? language : 'en';
  return `${baseUrl}${path}?lang=${lang}`;
}

/** The typed confirmation must match the localized word (case/space-insensitive). */
export function confirmationMatches(input, word) {
  const norm = (s) => {
    const upper = String(s || '').trim().toUpperCase();
    try {
      return upper.normalize('NFD').replace(/[̀-ͯ]/g, '');
    } catch (_) {
      return upper;
    }
  };
  return Boolean(word) && norm(input) === norm(word);
}

export class AccountDeletionError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'AccountDeletionError';
    this.status = status;
  }
}

/**
 * POST {base}/api/account/delete with the user's access token.
 * The server identifies the caller from the token; no ids are sent.
 */
export async function requestAccountDeletion({
  accessToken,
  fetchImpl = (typeof fetch !== 'undefined' ? fetch : undefined),
  baseUrl = getWebBaseUrl(),
} = {}) {
  if (!accessToken) throw new AccountDeletionError('not_signed_in', 401);
  if (!fetchImpl) throw new AccountDeletionError('no_network', 0);

  let response;
  try {
    response = await fetchImpl(`${baseUrl}/api/account/delete`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({}),
    });
  } catch (err) {
    throw new AccountDeletionError('no_network', 0);
  }

  if (!response.ok) {
    let message = `http_${response.status}`;
    try {
      const data = await response.json();
      if (data && (data.error || data.message)) message = data.error || data.message;
    } catch (_) { /* body not JSON */ }
    throw new AccountDeletionError(message, response.status);
  }
  return true;
}

/**
 * Full flow used by the Settings screen: read the session, call the API,
 * then sign out locally (the Auth user no longer exists on the server).
 */
export async function deleteMyAccount(supabase, options = {}) {
  if (!supabase) throw new AccountDeletionError('not_signed_in', 401);
  const { data } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  await requestAccountDeletion({ ...options, accessToken });
  try {
    await supabase.auth.signOut({ scope: 'local' });
  } catch (_) {
    // The session is gone server-side already; local sign-out errors are harmless.
  }
  return true;
}
