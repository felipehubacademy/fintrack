import {
  getWebBaseUrl,
  legalUrl,
  confirmationMatches,
  requestAccountDeletion,
  deleteMyAccount,
} from '../accountApi';
import { t } from '@fintrack/shared/i18n';

describe('getWebBaseUrl', () => {
  it('defaults to production and trims slashes or /api', () => {
    expect(getWebBaseUrl('')).toBe('https://meuazulao.com.br');
    expect(getWebBaseUrl(undefined)).toBe('https://meuazulao.com.br');
    expect(getWebBaseUrl('https://preview.example.com/')).toBe('https://preview.example.com');
    expect(getWebBaseUrl('https://preview.example.com/api')).toBe('https://preview.example.com');
  });
});

describe('legalUrl', () => {
  it('links to the hosted pages in the user language', () => {
    expect(legalUrl('privacy', 'pt', 'https://meuazulao.com.br')).toBe('https://meuazulao.com.br/privacy?lang=pt');
    expect(legalUrl('terms', 'es', 'https://meuazulao.com.br')).toBe('https://meuazulao.com.br/terms?lang=es');
    expect(legalUrl('terms', 'fr', 'https://x.com')).toBe('https://x.com/terms?lang=en');
    expect(() => legalUrl('cookies', 'en')).toThrow();
  });
});

describe('confirmationMatches', () => {
  it('accepts the localized word, any case', () => {
    for (const lng of ['en', 'pt', 'es']) {
      const word = t('settings.deleteAccount.confirmWord', { lng });
      expect(confirmationMatches(word.toLowerCase(), word)).toBe(true);
      expect(confirmationMatches(` ${word} `, word)).toBe(true);
      expect(confirmationMatches('nope', word)).toBe(false);
    }
    expect(confirmationMatches('', '')).toBe(false);
  });

  it('uses a different word per language', () => {
    expect(t('settings.deleteAccount.confirmWord', { lng: 'en' })).toBe('DELETE');
    expect(t('settings.deleteAccount.confirmWord', { lng: 'pt' })).toBe('EXCLUIR');
    expect(t('settings.deleteAccount.confirmWord', { lng: 'es' })).toBe('ELIMINAR');
  });
});

describe('requestAccountDeletion', () => {
  it('POSTs to /api/account/delete with the bearer token', async () => {
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    await requestAccountDeletion({ accessToken: 'tok', fetchImpl, baseUrl: 'https://meuazulao.com.br' });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe('https://meuazulao.com.br/api/account/delete');
    expect(init.method).toBe('POST');
    expect(init.headers.Authorization).toBe('Bearer tok');
    expect(init.body).toBe('{}');
  });

  it('fails without a token, on network errors and on HTTP errors', async () => {
    const ok = jest.fn();
    await expect(requestAccountDeletion({ accessToken: null, fetchImpl: ok })).rejects.toMatchObject({ status: 401 });
    expect(ok).not.toHaveBeenCalled();

    const offline = jest.fn(() => Promise.reject(new TypeError('Network request failed')));
    await expect(requestAccountDeletion({ accessToken: 't', fetchImpl: offline })).rejects.toMatchObject({ status: 0 });

    const serverError = jest.fn(() => Promise.resolve({ ok: false, status: 500, json: () => Promise.resolve({ error: 'boom' }) }));
    await expect(requestAccountDeletion({ accessToken: 't', fetchImpl: serverError })).rejects.toMatchObject({ status: 500, message: 'boom' });
  });
});

describe('deleteMyAccount', () => {
  function fakeSupabase(token = 'tok') {
    return {
      auth: {
        getSession: jest.fn(() => Promise.resolve({ data: { session: token ? { access_token: token } : null } })),
        signOut: jest.fn(() => Promise.resolve({})),
      },
    };
  }

  it('calls the API with the session token, then signs out locally', async () => {
    const supabase = fakeSupabase();
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    await deleteMyAccount(supabase, { fetchImpl, baseUrl: 'https://x.test' });
    expect(fetchImpl.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
    expect(supabase.auth.signOut).toHaveBeenCalledWith({ scope: 'local' });
  });

  it('does not sign out when the server refuses', async () => {
    const supabase = fakeSupabase();
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: false, status: 403, json: () => Promise.resolve({}) }));
    await expect(deleteMyAccount(supabase, { fetchImpl, baseUrl: 'https://x.test' })).rejects.toMatchObject({ status: 403 });
    expect(supabase.auth.signOut).not.toHaveBeenCalled();
  });

  it('never touches database tables directly', async () => {
    const supabase = { ...fakeSupabase(), from: jest.fn() };
    const fetchImpl = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    await deleteMyAccount(supabase, { fetchImpl, baseUrl: 'https://x.test' });
    expect(supabase.from).not.toHaveBeenCalled();
  });
});
