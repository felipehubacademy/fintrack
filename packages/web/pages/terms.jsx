import { LegalDocument } from './privacy';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';

export default function TermsPage({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  return <LegalDocument doc="terms" lang={lang} />;
}

export const getServerSideProps = localeServerSideProps();
