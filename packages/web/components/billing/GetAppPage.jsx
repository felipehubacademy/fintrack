import { useMemo } from 'react';
import Head from 'next/head';
import { getFixedT, formatMoney, localeTagFor } from '@fintrack/shared/i18n';
import { pricesFor } from '@fintrack/shared/billing';
import LandingHeader from '../LandingHeader';
import PlanPrices from './PlanPrices';
import { useI18n } from '../../contexts/I18nContext';
import { useApplyLanguage } from '../../lib/publicLocale';

/**
 * Shown by /assinar, /subscribe, /suscribirme, /oferta and /offer when the
 * visitor is not on a phone we can send straight to its store (see
 * lib/billingPages.js). Plus is sold only in the app, so this page explains
 * that and links to the App Store and Google Play.
 */
export default function GetAppPage({ kind = 'subscribe', lang = 'en', stores = {} }) {
  useApplyLanguage(lang, true);
  const { currency } = useI18n();
  const t = useMemo(() => getFixedT(lang), [lang]);
  const prices = pricesFor(currency);
  const money = (v) => formatMoney(v, { currency: prices.currency, locale: localeTagFor(lang) });
  const isOffer = kind === 'offer';

  const buttons = [
    stores.appStore && { href: stores.appStore, label: t('web.billing.appStoreButton') },
    stores.playStore && { href: stores.playStore, label: t('web.billing.playStoreButton') },
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-surface-2" lang={lang}>
      <Head>
        <title>{t(isOffer ? 'web.billing.offerMetaTitle' : 'web.billing.subscribeMetaTitle')}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>
      <LandingHeader currentPage="subscribe" />
      <main className="mx-auto max-w-xl px-4 pb-16 pt-28 sm:px-6">
        <div className="rounded-xl bg-surface p-6 shadow-sm sm:p-8">
          {isOffer ? (
            <>
              <h1 className="mb-3 text-2xl font-bold text-ink-900 sm:text-3xl">
                {t('web.billing.getAppOfferTitle', { price: money(prices.winback) })}
              </h1>
              <p className="mb-6 text-ink-500">{t('web.billing.getAppOfferBody', { monthly: money(prices.monthly) })}</p>
            </>
          ) : (
            <>
              <h1 className="mb-3 text-2xl font-bold text-ink-900 sm:text-3xl">{t('web.billing.getAppTitle')}</h1>
              <p className="mb-6 text-ink-500">{t('web.billing.getAppBody')}</p>
              <PlanPrices currency={prices.currency} lang={lang} compact className="mb-6" />
            </>
          )}
          <div className="flex flex-col gap-3 sm:flex-row">
            {buttons.map((b) => (
              <a
                key={b.href}
                href={b.href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center rounded-full bg-ink-900 px-6 py-3 text-base font-semibold text-surface transition hover:brightness-110"
              >
                {b.label}
              </a>
            ))}
          </div>
          <p className="mt-4 text-center text-sm text-ink-500">{t('web.billing.getAppHasApp')}</p>
          <p className="mt-2 text-center text-sm text-ink-500">{t('web.billing.cancelAnytime')}</p>
        </div>
      </main>
    </div>
  );
}
