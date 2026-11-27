import { LegalDocument } from './privacy';
import { localeServerSideProps, useApplyLanguage } from '../lib/publicLocale';

// Localized alias of /privacy (defaults to es; ?lang= still wins).
export default function PrivacyPageES({ lang, langExplicit }) {
  useApplyLanguage(lang, langExplicit);
  return <LegalDocument doc="privacy" lang={lang} />;
}

export const getServerSideProps = localeServerSideProps('es');
