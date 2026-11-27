import { useI18n } from '../contexts/I18nContext';

// Compact EN / PT / ES switcher for public pages.
export default function LanguageSwitcher({ tone = 'light', className = '' }) {
  const { t, language, languages, setLanguage } = useI18n();
  const base = tone === 'dark'
    ? 'text-white/70 hover:text-white'
    : 'text-gray-500 hover:text-gray-900';
  const active = tone === 'dark' ? 'bg-white/15 text-white' : 'bg-brand-50 text-brand-500';
  return (
    <div role="group" aria-label={t('common.language')} className={`inline-flex items-center gap-0.5 ${className}`}>
      {languages.map((lng) => (
        <button
          key={lng}
          type="button"
          lang={lng}
          onClick={() => setLanguage(lng)}
          aria-pressed={language === lng}
          title={t(`common.languages.${lng}`)}
          className={`rounded-full px-2 py-1 text-xs font-semibold uppercase transition-colors ${language === lng ? active : base}`}
        >
          {lng}
        </button>
      ))}
    </div>
  );
}
