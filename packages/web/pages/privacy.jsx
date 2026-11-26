import { Fragment, useMemo } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Shield, FileText } from 'lucide-react';
import { getFixedT, formatDate, localeTagFor } from '@fintrack/shared/i18n';
import { EARLY_ACCESS_END } from '@fintrack/shared/config';
import LandingHeader from '../components/LandingHeader';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';

// TODO(Felipe): replace with the legal entity name (razão social) and add the
// CNPJ before launch, e.g. 'Hub Academy Ltda. (MeuAzulão), CNPJ 00.000.000/0001-00'.
export const LEGAL = {
  controller: 'Hub Academy / MeuAzulão',
  cnpj: null, // TODO(Felipe): CNPJ
  privacyEmail: 'privacidade@meuazulao.com.br',
  contactEmail: 'contato@meuazulao.com.br',
  site: 'https://www.meuazulao.com.br',
};

export const LEGAL_PATHS = {
  privacy: { en: '/privacy', pt: '/privacidade', es: '/privacidad' },
  terms: { en: '/terms', pt: '/termos', es: '/terminos' },
  deleteAccount: { en: '/delete-account', pt: '/excluir-conta', es: '/eliminar-cuenta' },
};

const LANGS = ['en', 'pt', 'es'];

/** Turns emails and site paths inside a sentence into links. */
function RichText({ text }) {
  const parts = String(text).split(/([\w.+-]+@[\w-]+(?:\.[\w-]+)+|meuazulao\.com\.br\/[\w-]+)/g);
  return parts.map((part, i) => {
    if (/^[\w.+-]+@/.test(part)) {
      return <a key={i} href={`mailto:${part}`} className="text-[#1F5BFF] font-medium hover:underline">{part}</a>;
    }
    if (/^meuazulao\.com\.br\//.test(part)) {
      return <a key={i} href={part.replace('meuazulao.com.br', '')} className="text-[#1F5BFF] font-medium hover:underline">{part}</a>;
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}

function fill(text, params) {
  return String(text).replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k) => (params[k] !== undefined ? params[k] : m));
}

/** Shared renderer for the privacy policy and the terms (namespace `legal`). */
export function LegalDocument({ doc, lang }) {
  const t = useMemo(() => getFixedT(lang), [lang]);
  const params = {
    controller: LEGAL.cnpj ? `${LEGAL.controller} (CNPJ ${LEGAL.cnpj})` : LEGAL.controller,
    email: LEGAL.privacyEmail,
    contactEmail: LEGAL.contactEmail,
    deleteUrl: `meuazulao.com.br${LEGAL_PATHS.deleteAccount[lang]}`,
    earlyAccessEnd: formatDate(EARLY_ACCESS_END, 'long', { locale: localeTagFor(lang) }),
  };
  const sections = t(`legal.${doc}.sections`);
  const list = Array.isArray(sections) ? sections : [];
  const Icon = doc === 'privacy' ? Shield : FileText;
  const other = doc === 'privacy' ? 'terms' : 'privacy';

  return (
    <div className="min-h-screen bg-white" lang={lang}>
      <Head>
        <title>{t(`legal.${doc}.metaTitle`)}</title>
        <meta name="description" content={t(`legal.${doc}.metaDescription`)} />
        {LANGS.map((l) => (
          <link key={l} rel="alternate" hrefLang={l === 'pt' ? 'pt-BR' : l === 'es' ? 'es-419' : 'en'} href={`${LEGAL.site}${LEGAL_PATHS[doc][l]}`} />
        ))}
      </Head>

      <LandingHeader currentPage={doc} />

      <section className="pt-32 pb-12 bg-[#EEF3FF]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full text-[#1F5BFF] text-sm font-medium mb-6">
            <Icon className="w-4 h-4" />
            <span>{t(`legal.${doc}.badge`)}</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-[#0B1220] mb-4">{t(`legal.${doc}.title`)}</h1>
          <p className="text-[#5B6475]">{t('legal.lastUpdated', { date: t('legal.updatedDate') })}</p>
          <p className="mt-4 text-sm text-[#5B6475]">
            {t('legal.otherLanguages')}{' '}
            {LANGS.filter((l) => l !== lang).map((l, i) => (
              <Fragment key={l}>
                {i > 0 && ' · '}
                <Link href={LEGAL_PATHS[doc][l]} className="text-[#1F5BFF] hover:underline" hrefLang={l}>
                  {t(`common.languages.${l}`)}
                </Link>
              </Fragment>
            ))}
          </p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <p className="text-lg text-[#0B1220] leading-relaxed mb-10">{fill(t(`legal.${doc}.intro`), params)}</p>

        <nav aria-label={t('legal.onThisPage')} className="mb-12 rounded-xl bg-[#F5F7FB] p-6">
          <p className="text-sm font-semibold text-[#0B1220] mb-3">{t('legal.onThisPage')}</p>
          <ol className="grid gap-2 sm:grid-cols-2 text-sm">
            {list.map((s, i) => (
              <li key={s.title}>
                <a href={`#s${i + 1}`} className="text-[#1F5BFF] hover:underline">{s.title}</a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="space-y-10">
          {list.map((s, i) => (
            <section key={s.title} id={`s${i + 1}`} className="scroll-mt-24">
              <h2 className="text-2xl font-bold text-[#0B1220] mb-4">{s.title}</h2>
              {(s.body || []).map((p) => (
                <p key={p} className="text-[#0B1220] leading-relaxed mb-3"><RichText text={fill(p, params)} /></p>
              ))}
              {s.items?.length > 0 && (
                <ul className="list-disc pl-6 space-y-2 mb-3 text-[#0B1220] leading-relaxed">
                  {s.items.map((item) => <li key={item}><RichText text={fill(item, params)} /></li>)}
                </ul>
              )}
              {(s.after || []).map((p) => (
                <p key={p} className="text-[#0B1220] leading-relaxed mb-3 font-medium"><RichText text={fill(p, params)} /></p>
              ))}
            </section>
          ))}
        </div>

        <div className="mt-16 pt-8 border-t border-gray-200 flex flex-wrap gap-4 text-sm">
          <Link href={LEGAL_PATHS[other][lang]} className="text-[#1F5BFF] hover:underline">{t(`legal.${other}.title`)}</Link>
          <Link href={LEGAL_PATHS.deleteAccount[lang]} className="text-[#1F5BFF] hover:underline">{t('account.deleteAccount.title')}</Link>
        </div>
      </main>
    </div>
  );
}

export default function PrivacyPage({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  return <LegalDocument doc="privacy" lang={lang} />;
}

export const getServerSideProps = localeServerSideProps();
