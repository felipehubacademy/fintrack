import { LegalDocument } from './privacy';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';

// Localized alias of /privacy (defaults to pt; ?lang= still wins).
export default function PrivacyPagePT({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  return <LegalDocument doc="privacy" lang={lang} />;
}

export const getServerSideProps = localeServerSideProps('pt');
