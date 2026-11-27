import { LegalDocument } from './privacy';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';

// Localized alias of /terms (defaults to es; ?lang= still wins).
export default function TermsPageES({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  return <LegalDocument doc="terms" lang={lang} />;
}

export const getServerSideProps = localeServerSideProps('es');
