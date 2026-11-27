import { LegalDocument } from './privacy';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';

// Localized alias of /terms (defaults to pt; ?lang= still wins).
export default function TermsPagePT({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  return <LegalDocument doc="terms" lang={lang} />;
}

export const getServerSideProps = localeServerSideProps('pt');
