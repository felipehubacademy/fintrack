import { Crown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import { useI18n } from '../../contexts/I18nContext';
import { useBillingStatus } from '../../hooks/useBillingStatus';
import PlanPrices from './PlanPrices';

// Official subscription-management pages of each store.
const STORE_LINKS = {
  app_store: 'https://apps.apple.com/account/subscriptions',
  play_store: 'https://play.google.com/store/account/subscriptions',
};

const BADGE = {
  trial: 'bg-brand-50 text-brand-500',
  active: 'bg-positive/10 text-positive',
  expired: 'bg-negative/10 text-negative',
};

/** Settings > Plan: status, renewal date and how to cancel for the store used. */
export default function PlanCard({ className = '', style }) {
  const { t, formatDate } = useI18n();
  const { status, error, paywallEnabled, subscribePath } = useBillingStatus();

  if (!paywallEnabled) return null;

  const kind = status?.status;
  const label = kind === 'active'
    ? t('web.billing.statusActive')
    : kind === 'expired' ? t('web.billing.statusExpired') : t('web.billing.statusTrial');

  let description = null;
  if (kind === 'active') {
    description = t('web.billing.activeUntil', { date: formatDate(status.plusUntil, 'long') });
  } else if (kind === 'expired') {
    description = status.trialEndsAt
      ? t('web.billing.expiredSince', { date: formatDate(status.trialEndsAt, 'long') })
      : t('web.billing.expiredNoDate');
  } else if (kind === 'trial') {
    description = status.trialEndsAt
      ? t('web.billing.trialUntil', { date: formatDate(status.trialEndsAt, 'long') })
      : t('web.billing.trialUntilUnknown');
  }

  const source = status?.source;
  const cancelText = {
    app_store: t('web.billing.cancelAppStore'),
    play_store: t('web.billing.cancelPlayStore'),
    promotional: t('web.billing.cancelPromotional'),
  }[source];
  const storeButton = {
    app_store: t('web.billing.cancelAppStoreButton'),
    play_store: t('web.billing.cancelPlayStoreButton'),
  }[source];

  return (
    <Card className={className} style={style}>
      <CardHeader>
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <Crown className="h-5 w-5 text-brand-500" />
            {t('web.billing.planTitle')}
          </CardTitle>
          {status && (
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[kind] || BADGE.trial}`}>{label}</span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {!status && error && <p className="text-sm text-ink-500">{t('web.billing.loadError')}</p>}
        {!status && !error && <div className="h-12 animate-pulse rounded-lg bg-surface-2" />}
        {status && (
          <div className="space-y-4">
            {description && <p className="text-ink-900">{description}</p>}

            {kind === 'active' && cancelText && (
              <div className="rounded-xl bg-surface-2 p-4">
                <p className="mb-1 text-sm font-semibold text-ink-900">{t('web.billing.howToCancel')}</p>
                <p className="text-sm text-ink-500">{cancelText}</p>
                {storeButton && (
                  <a
                    href={STORE_LINKS[source]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center rounded-full border border-gray-200 px-4 py-1.5 text-sm font-semibold text-ink-900 hover:bg-surface"
                  >
                    {storeButton}
                  </a>
                )}
              </div>
            )}

            {kind !== 'active' && (
              <>
                <PlanPrices currency={status.currency} compact />
                {subscribePath && (
                  <a
                    href={subscribePath}
                    className="inline-flex w-full items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:brightness-110 sm:w-auto"
                  >
                    {t('web.billing.subscribe')}
                  </a>
                )}
                <p className="text-sm text-ink-500">{t('web.billing.cancelAnytime')}</p>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
