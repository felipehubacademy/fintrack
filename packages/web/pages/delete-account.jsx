import { useEffect, useMemo, useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Smartphone, MessageCircle, Globe, Trash2, Loader2, CheckCircle2 } from 'lucide-react';
import { getFixedT } from '@fintrack/shared/i18n';
import { zulChatLink } from '@fintrack/shared/config';
import { supabase } from '../lib/supabaseClient';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';
import { LoginForm } from './login';
import { LEGAL, LEGAL_PATHS } from './privacy';

const LANGS = ['en', 'pt', 'es'];

function whoIs(session) {
  const user = session?.user;
  if (!user) return '';
  if (user.email) return user.email;
  return user.phone ? `+${String(user.phone).replace(/^\+/, '')}` : '';
}

/**
 * Public account deletion page (Google Play needs a web URL). Explains the
 * three ways to delete and lets the person sign in here and confirm.
 * Also served at /excluir-conta (pt) and /eliminar-cuenta (es).
 */
export function DeleteAccountPage({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  const t = useMemo(() => getFixedT(lang), [lang]);
  const [session, setSession] = useState(null);
  const [checking, setChecking] = useState(true);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active) {
        setSession(data?.session || null);
        setChecking(false);
      }
    }).catch(() => active && setChecking(false));
    return () => { active = false; };
  }, []);

  const confirmWord = t('account.deleteAccount.confirmWord');
  const canDelete = confirmText.trim().toUpperCase() === confirmWord.toUpperCase();

  const handleDelete = async () => {
    if (!canDelete || !session) return;
    setDeleting(true);
    setError('');
    try {
      // Fresh token in case the session was refreshed since the page loaded.
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || session.access_token;
      const response = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: '{}',
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.success) throw new Error(result.error || 'delete_failed');
      await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      setSession(null);
      setDone(true);
    } catch (_) {
      setError(t('account.deleteAccount.error', { email: LEGAL.privacyEmail }));
    } finally {
      setDeleting(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut().catch(() => {});
    setSession(null);
    setConfirmText('');
  };

  const ways = [
    { icon: Smartphone, title: t('account.deleteAccount.inApp.title'), body: t('account.deleteAccount.inApp.body') },
    {
      icon: MessageCircle,
      title: t('account.deleteAccount.whatsapp.title'),
      body: t('account.deleteAccount.whatsapp.body', { phrase: t('account.deleteAccount.whatsapp.phrase') }),
      action: (
        <a
          href={zulChatLink(t('account.deleteAccount.whatsapp.phrase'))}
          className="mt-3 inline-flex items-center px-4 py-2 rounded-full bg-[#25D366] text-white text-sm font-semibold"
        >
          <MessageCircle className="w-4 h-4 mr-2" />
          {t('account.deleteAccount.whatsapp.cta')}
        </a>
      ),
    },
    { icon: Globe, title: t('account.deleteAccount.web.title'), body: t('account.deleteAccount.web.body') },
  ];
  const whatItems = t('account.deleteAccount.whatItems');
  const contactParts = t('account.deleteAccount.contact', { email: '\u0000' }).split('\u0000');

  return (
    <div className="min-h-screen bg-[#F5F7FB]" lang={lang}>
      <Head>
        <title>{t('account.deleteAccount.metaTitle')}</title>
        <meta name="description" content={t('account.deleteAccount.metaDescription')} />
        <meta name="robots" content="index, follow" />
      </Head>

      <header className="bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-[#0B1220]">
            <img src="/images/logo_flat.svg" alt="" className="w-8 h-8" />
            MeuAzulão
          </Link>
          <nav className="flex gap-3 text-sm">
            {LANGS.map((l) => (
              <Link key={l} href={LEGAL_PATHS.deleteAccount[l]} hrefLang={l}
                className={l === lang ? 'font-semibold text-[#0B1220]' : 'text-[#5B6475] hover:underline'}>
                {l.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-[#0B1220] mb-3">{t('account.deleteAccount.title')}</h1>
          <p className="text-lg text-[#5B6475]">{t('account.deleteAccount.intro')}</p>
        </div>

        <section>
          <h2 className="text-xl font-semibold text-[#0B1220] mb-4">{t('account.deleteAccount.waysTitle')}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {ways.map(({ icon: Icon, title, body, action }) => (
              <div key={title} className="bg-white rounded-xl p-5 border border-gray-100">
                <Icon className="w-6 h-6 text-[#1F5BFF] mb-3" />
                <h3 className="font-semibold text-[#0B1220] mb-1">{title}</h3>
                <p className="text-sm text-[#5B6475]">{body}</p>
                {action}
              </div>
            ))}
          </div>
        </section>

        <section id="delete" className="bg-white rounded-xl p-6 md:p-8 border border-gray-100">
          {done ? (
            <div className="text-center py-6">
              <CheckCircle2 className="w-12 h-12 text-[#12B76A] mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#0B1220] mb-2">{t('account.deleteAccount.doneTitle')}</h2>
              <p className="text-[#5B6475]">{t('account.deleteAccount.doneBody')}</p>
            </div>
          ) : checking ? (
            <div className="flex justify-center py-8"><Loader2 className="w-8 h-8 animate-spin text-[#1F5BFF]" /></div>
          ) : !session ? (
            <div className="max-w-md mx-auto">
              <h2 className="text-xl font-semibold text-[#0B1220] text-center mb-6">{t('account.deleteAccount.signInTitle')}</h2>
              <LoginForm lang={lang} compact onSignedIn={(s) => setSession(s)} />
            </div>
          ) : (
            <div className="max-w-md mx-auto space-y-4">
              <p className="text-sm text-[#5B6475] text-center">
                {t('account.deleteAccount.signedInAs', { who: whoIs(session) })}
                {' · '}
                <button type="button" onClick={handleSignOut} className="text-[#1F5BFF] hover:underline">
                  {t('account.deleteAccount.notYou')}
                </button>
              </p>
              <h2 className="text-xl font-semibold text-[#0B1220]">{t('account.deleteAccount.confirmTitle')}</h2>
              <p className="text-[#0B1220]">{t('account.deleteAccount.confirmBody')}</p>
              <label htmlFor="confirm" className="block text-sm font-medium text-[#5B6475]">
                {t('account.deleteAccount.typeToConfirm', { word: confirmWord })}
              </label>
              <input
                id="confirm"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#F04438] focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete || deleting}
                className="w-full inline-flex items-center justify-center px-6 py-3.5 rounded-full bg-[#F04438] text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting
                  ? (<><Loader2 className="w-5 h-5 mr-2 animate-spin" />{t('account.deleteAccount.deleting')}</>)
                  : (<><Trash2 className="w-5 h-5 mr-2" />{t('account.deleteAccount.deleteButton')}</>)}
              </button>
              {error && <p role="alert" className="text-sm text-[#F04438] text-center">{error}</p>}
            </div>
          )}
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="text-lg font-semibold text-[#0B1220] mb-3">{t('account.deleteAccount.whatTitle')}</h2>
            <ul className="list-disc pl-5 space-y-2 text-sm text-[#0B1220]">
              {(Array.isArray(whatItems) ? whatItems : []).map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-[#0B1220] mb-2">{t('account.deleteAccount.whenTitle')}</h2>
              <p className="text-sm text-[#0B1220]">{t('account.deleteAccount.whenBody')}</p>
            </div>
            <div className="bg-white rounded-xl p-6 border border-gray-100">
              <h2 className="text-lg font-semibold text-[#0B1220] mb-2">{t('account.deleteAccount.sharedTitle')}</h2>
              <p className="text-sm text-[#0B1220]">{t('account.deleteAccount.sharedBody')}</p>
            </div>
          </div>
        </section>

        <p className="text-sm text-[#5B6475] text-center">
          {contactParts[0]}
          <a href={`mailto:${LEGAL.privacyEmail}`} className="text-[#1F5BFF] hover:underline">{LEGAL.privacyEmail}</a>
          {contactParts[1]}
          {' · '}
          <Link href={LEGAL_PATHS.privacy[lang]} className="text-[#1F5BFF] hover:underline">{t('legal.privacy.title')}</Link>
        </p>
      </main>
    </div>
  );
}

export default DeleteAccountPage;

export const getServerSideProps = localeServerSideProps();
