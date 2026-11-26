import { useMemo } from 'react';
import { Globe } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/Card';
import { useI18n } from '../contexts/I18nContext';

function currencyLabel(code, locale) {
  try {
    const name = new Intl.DisplayNames([locale], { type: 'currency' }).of(code);
    return name && name !== code ? `${code} · ${name}` : code;
  } catch (_) {
    return code;
  }
}

// Language and currency picker for the settings page. Saved in this browser
// (localStorage + cookie) by the I18n provider.
export default function LanguageCurrencySettings({ className = '', style }) {
  const { t, language, currency, locale, languages, currencies, setLanguage, setCurrency } = useI18n();
  const currencyOptions = useMemo(
    () => currencies.map((code) => ({ code, label: currencyLabel(code, locale) })),
    [currencies, locale]
  );

  return (
    <Card className={className} style={style}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
          <Globe className="h-5 w-5 text-brand-500" />
          {t('web.localeSettings.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="settings-language" className="mb-2 block text-sm font-medium text-gray-700">
              {t('common.language')}
            </label>
            <select
              id="settings-language"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            >
              {languages.map((lng) => (
                <option key={lng} value={lng}>{t(`common.languages.${lng}`)}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="settings-currency" className="mb-2 block text-sm font-medium text-gray-700">
              {t('common.currency')}
            </label>
            <select
              id="settings-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-11 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-500"
            >
              {currencyOptions.map(({ code, label }) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">{t('web.localeSettings.note')}</p>
      </CardContent>
    </Card>
  );
}
