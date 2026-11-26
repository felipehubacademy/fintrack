import { useMemo } from 'react';
import Head from 'next/head';
import { getFixedT, formatMoney, localeTagFor } from '@fintrack/shared/i18n';
import { zulChatLink } from '@fintrack/shared/config';
import { pricesFor } from '@fintrack/shared/billing';
import LandingHeader from '../LandingHeader';
import WhatsAppIcon from '../WhatsAppIcon';
import PlanPrices from './PlanPrices';
import { useI18n } from '../../contexts/I18nContext';
import { useApplyLanguage } from '../../lib/publicLocale';

/**
 * Shown by /assinar, /subscribe, /suscribirme, /oferta and /offer while the
 * RevenueCat Web Purchase Link is not configured: a short note that payments
 * open soon and a button to message Zul.
 */
export default function PaymentsSoonPage({ kind = 'subscribe', lang = 'en' }) {
  useApplyLanguage(lang, true);
  const { currency } = useI18n();
  const t = useMemo(() => getFixedT(lang), [lang]);
  const prices = pricesFor(currency);
  const money = (v) => formatMoney(v, { currency: prices.currency, locale: localeTagFor(lang) });
  const isOffer = kind === 'offer';

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
                {t('web.billing.soonOfferTitle', { price: money(prices.winback) })}
              </h1>
              <p className="mb-6 text-ink-500">{t('web.billing.soonOfferBody', { monthly: money(prices.monthly) })}</p>
            </>
          ) : (
            <>
              <h1 className="mb-3 text-2xl font-bold text-ink-900 sm:text-3xl">{t('web.billing.soonTitle')}</h1>
              <p className="mb-6 text-ink-500">{t('web.billing.soonBody')}</p>
              <PlanPrices currency={prices.currency} lang={lang} compact className="mb-6" />
            </>
          )}
          <a
            href={zulChatLink(t(isOffer ? 'web.billing.zulOffer' : 'web.billing.zulSubscribe'))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-whatsapp px-6 py-3 text-base font-semibold text-white transition hover:brightness-95"
          >
            <WhatsAppIcon className="h-5 w-5" />
            {t('web.billing.soonCta')}
          </a>
          <p className="mt-4 text-center text-sm text-ink-500">{t('web.billing.cancelAnytime')}</p>
        </div>
      </main>
    </div>
  );
}
