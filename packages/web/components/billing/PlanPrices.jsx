import { useMemo } from 'react';
import { pricesFor, annualSavingsPercent } from '@fintrack/shared/billing';
import { getFixedT, formatMoney as formatMoneyCore, localeTagFor } from '@fintrack/shared/i18n';
import { useI18n } from '../../contexts/I18nContext';

/**
 * Plus monthly and annual prices side by side, annual highlighted with the
 * "save N%" badge. Prices come from @fintrack/shared/billing in the
 * visitor's currency (anything without its own table is charged in USD).
 */
export default function PlanPrices({ currency: currencyProp, lang, compact = false, className = '' }) {
  const i18n = useI18n();
  // Public pages pass their own language (it may differ from the app's).
  const fixedT = useMemo(() => (lang ? getFixedT(lang) : null), [lang]);
  const t = fixedT || i18n.t;
  const prices = pricesFor(currencyProp || i18n.currency);
  const money = (v) => (lang
    ? formatMoneyCore(v, { currency: prices.currency, locale: localeTagFor(lang) })
    : i18n.formatMoney(v, { currency: prices.currency }));
  const savings = annualSavingsPercent(prices.currency);
  const pad = compact ? 'p-4' : 'p-6';
  const amountSize = compact ? 'text-2xl' : 'text-3xl sm:text-4xl';

  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${className}`}>
      <div className={`rounded-xl border border-gray-200 bg-surface ${pad}`}>
        <p className="text-sm font-semibold text-ink-500">{t('web.billing.monthly')}</p>
        <p className="mt-2 text-ink-900">
          <span className={`${amountSize} font-bold`}>{money(prices.monthly)}</span>
          <span className="text-ink-500">{t('web.billing.perMonth')}</span>
        </p>
      </div>
      <div className={`relative rounded-xl border-2 border-brand-500 bg-brand-50 ${pad}`}>
        {savings > 0 && (
          <span className="absolute -top-3 right-4 rounded-full bg-brand-500 px-3 py-0.5 text-xs font-semibold text-white">
            {t('web.billing.save', { percent: savings })}
          </span>
        )}
        <p className="text-sm font-semibold text-brand-500">{t('web.billing.annual')}</p>
        <p className="mt-2 text-ink-900">
          <span className={`${amountSize} font-bold`}>{money(prices.annual)}</span>
          <span className="text-ink-500">{t('web.billing.perYear')}</span>
        </p>
        <p className="mt-1 text-sm text-ink-500">
          {t('web.billing.annualMonthly', { amount: money(Math.floor((prices.annual / 12) * 100) / 100) })}
        </p>
      </div>
    </div>
  );
}
