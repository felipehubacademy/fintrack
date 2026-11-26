import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import Head from 'next/head';
import { ArrowLeft, Mail, Loader2, Lock, Eye, EyeOff, MessageCircle } from 'lucide-react';
import { getFixedT, getLocaleSettings } from '@fintrack/shared/i18n';
import { zulChatLink } from '@fintrack/shared/config';
import { supabase } from '../lib/supabaseClient';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';
import {
  COUNTRIES, countryByCode, countryName, defaultCountryFor, flagEmoji, splitInternational, toE164,
} from '../lib/phoneCountries';

const RESEND_SECONDS = 30;
const LANGS = ['en', 'pt', 'es'];

/** Only same-site paths ("/x"), never "//host" or absolute URLs. */
export function safeRedirect(value) {
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : null;
}

function initialPhoneState(rawPhone, fallbackCountry) {
  const raw = Array.isArray(rawPhone) ? rawPhone[0] : rawPhone;
  if (!raw) return { country: fallbackCountry, national: '' };
  const digits = String(raw).replace(/\D/g, '');
  const looksInternational = String(raw).trim().startsWith('+') || digits.length >= 12;
  const split = looksInternational ? splitInternational(digits, fallbackCountry) : null;
  return split || { country: fallbackCountry, national: digits };
}

/**
 * Sign-in form: WhatsApp code first, email + password as a fallback.
 * onSignedIn(session, method) runs after a successful sign-in.
 */
export function LoginForm({ lang, onSignedIn, initialPhone, initialEmail, compact = false }) {
  const t = useMemo(() => getFixedT(lang), [lang]);
  const fallbackCountry = defaultCountryFor(null, lang);
  const start = initialPhoneState(initialPhone, fallbackCountry);

  const [mode, setMode] = useState(initialEmail ? 'email' : 'phone');
  const [step, setStep] = useState('phone');
  const [country, setCountry] = useState(start.country);
  const [national, setNational] = useState(start.national);
  const [e164, setE164] = useState('');
  const [code, setCode] = useState('');
  const [email, setEmail] = useState(initialEmail || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const countryTouched = useRef(Boolean(initialPhone));
  const codeInput = useRef(null);

  // Refine the default country from the browser region (es-CO -> CO).
  useEffect(() => {
    if (countryTouched.current) return;
    const nav = typeof navigator !== 'undefined' ? (navigator.languages?.[0] || navigator.language) : null;
    const tag = [nav, getLocaleSettings().locale].find((x) => /[-_][A-Za-z]{2}(?![A-Za-z0-9])/.test(String(x || '')));
    setCountry(defaultCountryFor(tag, lang));
  }, [lang]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeInput.current?.focus();
  }, [step]);

  const countryOptions = useMemo(() => COUNTRIES
    .map((c) => ({ ...c, name: countryName(c.code, lang) }))
    .sort((a, b) => a.name.localeCompare(b.name, lang)), [lang]);

  const sendCode = async (e) => {
    e?.preventDefault();
    setError('');
    const phone = toE164(country, national);
    if (!phone) {
      setError(t('account.login.errors.invalidPhone'));
      return;
    }
    setLoading(true);
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone });
      if (otpError) {
        const tooMany = otpError.status === 429 || /rate|too many|security purposes/i.test(otpError.message || '');
        setError(t(tooMany ? 'account.login.errors.tooMany' : 'account.login.errors.sendFailed'));
        return;
      }
      setE164(phone);
      setCode('');
      setStep('code');
      setCooldown(RESEND_SECONDS);
    } catch (_) {
      setError(t('account.login.errors.sendFailed'));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e) => {
    e?.preventDefault();
    const token = code.replace(/\D/g, '');
    if (token.length !== 6) {
      setError(t('account.login.errors.invalidCode'));
      return;
    }
    setError('');
    setLoading(true);
    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone: e164, token, type: 'sms' });
      if (verifyError || !data?.session) {
        const tooMany = verifyError?.status === 429;
        setError(t(tooMany ? 'account.login.errors.tooMany' : 'account.login.errors.invalidCode'));
        return;
      }
      await onSignedIn?.(data.session, 'phone');
    } catch (_) {
      setError(t('account.login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const signInWithEmail = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError || !data?.session) {
        const bad = /invalid login credentials|email not confirmed/i.test(authError?.message || '');
        setError(t(bad ? 'account.login.errors.invalidCredentials' : 'account.login.errors.generic'));
        return;
      }
      await onSignedIn?.(data.session, 'email');
    } catch (_) {
      setError(t('account.login.errors.generic'));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full py-3.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-azulao-500 focus:border-transparent transition-all bg-white text-gray-900 placeholder-gray-400';
  const primaryButton = 'w-full bg-[#1F5BFF] text-white font-semibold py-3.5 px-4 rounded-full hover:bg-azulao-600 focus:outline-none focus:ring-2 focus:ring-azulao-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed';
  const linkButton = 'text-sm font-medium text-[#1F5BFF] hover:underline';
  const spinner = (label) => (
    <span className="flex items-center justify-center">
      <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
      {label}
    </span>
  );

  return (
    <div>
      {!compact && (
        <div className="text-center mb-6">
          <h2 className="text-xl font-semibold text-[#0B1220]">{t('account.login.title')}</h2>
          {mode === 'phone' && step === 'phone' && (
            <p className="mt-1 text-sm text-[#5B6475]">{t('account.login.subtitle')}</p>
          )}
        </div>
      )}

      {mode === 'phone' && step === 'phone' && (
        <form onSubmit={sendCode} className="space-y-4" noValidate>
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('account.login.countryLabel')}
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => { countryTouched.current = true; setCountry(e.target.value); }}
              className={`${inputClass} px-4`}
            >
              {countryOptions.map((c) => (
                <option key={c.code} value={c.code} suppressHydrationWarning>
                  {`${flagEmoji(c.code)} ${c.name} (+${c.dial})`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('account.login.phoneLabel')}
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-gray-500 pointer-events-none">
                +{countryByCode(country)?.dial}
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                placeholder={t('account.login.phonePlaceholder')}
                value={national}
                onChange={(e) => setNational(e.target.value)}
                required
                className={`${inputClass} pl-16 pr-4`}
              />
            </div>
          </div>
          <button type="submit" disabled={loading} className={primaryButton}>
            {loading ? spinner(t('account.login.sending')) : (
              <span className="flex items-center justify-center">
                <MessageCircle className="mr-2 h-5 w-5" />
                {t('account.login.sendCode')}
              </span>
            )}
          </button>
        </form>
      )}

      {mode === 'phone' && step === 'code' && (
        <form onSubmit={verifyCode} className="space-y-4" noValidate>
          <p className="text-sm text-[#5B6475] text-center">
            {t('account.login.codeSentTo', { phone: e164 })}
          </p>
          <div>
            <label htmlFor="otp" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('account.login.codeLabel')}
            </label>
            <input
              id="otp"
              ref={codeInput}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]*"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={`${inputClass} px-4 text-center text-2xl tracking-[0.5em] font-semibold`}
            />
          </div>
          <button type="submit" disabled={loading || code.length !== 6} className={primaryButton}>
            {loading ? spinner(t('account.login.verifying')) : t('account.login.verify')}
          </button>
          <div className="flex items-center justify-between">
            <button type="button" className={linkButton} onClick={() => { setStep('phone'); setError(''); }}>
              {t('account.login.changeNumber')}
            </button>
            {cooldown > 0 ? (
              <span className="text-sm text-gray-400">{t('account.login.resendIn', { seconds: cooldown })}</span>
            ) : (
              <button type="button" className={linkButton} onClick={sendCode} disabled={loading}>
                {t('account.login.resend')}
              </button>
            )}
          </div>
        </form>
      )}

      {mode === 'email' && (
        <form onSubmit={signInWithEmail} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
              {t('account.login.emailLabel')}
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t('account.login.emailPlaceholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className={`${inputClass} pl-12 pr-4`}
              />
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('account.login.passwordLabel')}
              </label>
              <Link href="/reset-password" className={linkButton}>
                {t('account.login.forgotPassword')}
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className={`${inputClass} pl-12 pr-12`}
              />
              <button
                type="button"
                aria-label={t(showPassword ? 'account.login.hidePassword' : 'account.login.showPassword')}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>
          <button type="submit" disabled={loading} className={primaryButton}>
            {loading ? spinner(t('account.login.signingIn')) : t('account.login.verify')}
          </button>
        </form>
      )}

      {error && (
        <div role="alert" className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-sm text-[#F04438] text-center">{error}</p>
        </div>
      )}

      <div className="mt-5 text-center">
        <button
          type="button"
          className={linkButton}
          onClick={() => { setMode(mode === 'phone' ? 'email' : 'phone'); setStep('phone'); setError(''); }}
        >
          {mode === 'phone' ? t('account.login.useEmail') : t('account.login.useWhatsApp')}
        </button>
      </div>
    </div>
  );
}

export default function Login({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  const t = useMemo(() => getFixedT(lang), [lang]);
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);
  const [noAccount, setNoAccount] = useState(false);

  const handleSignedIn = async (session, method) => {
    const redirect = safeRedirect(router.query.redirect);
    if (method === 'email') {
      // Same routing as before: /auth/callback resolves the dashboard URL.
      setRedirecting(true);
      await new Promise((resolve) => setTimeout(resolve, 500));
      window.location.href = redirect || '/auth/callback';
      return;
    }

    // WhatsApp code: the session may have no email, so ask the server who
    // this is (it links the phone to the user's profile).
    setRedirecting(true);
    try {
      const response = await fetch('/api/me', { headers: { Authorization: `Bearer ${session.access_token}` } });
      const me = response.ok ? await response.json() : null;
      if (me && !me.hasProfile) {
        setRedirecting(false);
        setNoAccount(true);
        return;
      }
      if (me?.organizationId && me?.userId) {
        window.location.href = redirect || `/org/${me.organizationId}/user/${me.userId}/dashboard`;
        return;
      }
    } catch (_) { /* fall through */ }
    window.location.href = redirect || '/auth/callback';
  };

  const languageLink = (l) => ({ pathname: router.pathname, query: { ...router.query, lang: l } });

  return (
    <>
      <Head>
        <title>{t('account.login.metaTitle')}</title>
        <meta name="description" content={t('account.login.metaDescription')} />
      </Head>

      <div className="min-h-screen flex flex-col" lang={lang}>
        <div className="relative bg-gradient-to-br from-azulao-500 via-azulao-600 to-azulao-700 pt-16 pb-32 px-4 text-center overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-azulao-400/30 rounded-full blur-3xl" />
          <Link
            href="/"
            className="absolute top-6 left-6 flex items-center space-x-2 text-white/70 hover:text-white transition-colors z-10 group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm">{t('common.back')}</span>
          </Link>
          <div className="relative z-10">
            <img src="/images/logo_flat.svg" alt="MeuAzulão" className="w-20 h-20 mx-auto mb-4 brightness-0 invert" />
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">MeuAzulão</h1>
            <p className="text-white/80 text-lg">{t('account.login.tagline')}</p>
          </div>
        </div>

        <div className="flex-1 bg-[#F5F7FB] px-4 pb-8">
          <div className="relative z-10 w-full max-w-md mx-auto -mt-20">
            <div className="bg-white rounded-xl p-8 md:p-10 shadow-xl border border-gray-100">
              {noAccount ? (
                <div className="text-center space-y-4">
                  <h2 className="text-xl font-semibold text-[#0B1220]">{t('account.login.noAccount.title')}</h2>
                  <p className="text-[#5B6475]">{t('account.login.noAccount.body')}</p>
                  <a
                    href={zulChatLink(t('account.login.noAccount.zulText'))}
                    className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-[#25D366] text-white rounded-full font-semibold"
                  >
                    <MessageCircle className="mr-2 h-5 w-5" />
                    {t('account.login.noAccount.cta')}
                  </a>
                </div>
              ) : redirecting ? (
                <div className="flex flex-col items-center py-8 text-[#5B6475]">
                  <Loader2 className="animate-spin h-8 w-8 text-[#1F5BFF] mb-3" />
                  {t('account.login.redirecting')}
                </div>
              ) : (
                <LoginForm
                  lang={lang}
                  onSignedIn={handleSignedIn}
                  initialPhone={router.query.phone}
                  initialEmail={typeof router.query.email === 'string' ? router.query.email : ''}
                />
              )}

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">{t('account.login.noAccountYet')}</span>
                </div>
              </div>
              <Link
                href="/account-type"
                className="w-full inline-flex items-center justify-center px-6 py-3.5 bg-gray-50 border-2 border-gray-200 text-gray-700 rounded-full hover:bg-gray-100 transition-all font-semibold"
              >
                {t('account.login.createAccount')}
              </Link>
            </div>

            <nav className="mt-6 flex flex-wrap items-center justify-center gap-4 text-sm text-[#5B6475]">
              {LANGS.map((l) => (
                <Link key={l} href={languageLink(l)} className={l === lang ? 'font-semibold text-[#0B1220]' : 'hover:underline'}>
                  {t(`common.languages.${l}`)}
                </Link>
              ))}
              <span aria-hidden="true">·</span>
              <Link href={`/terms?lang=${lang}`} className="hover:underline">{t('legal.terms.shortTitle')}</Link>
              <Link href={`/privacy?lang=${lang}`} className="hover:underline">{t('legal.privacy.shortTitle')}</Link>
            </nav>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps = localeServerSideProps();
