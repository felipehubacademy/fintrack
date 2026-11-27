import { useEffect, useState } from 'react';
import { Clock, X } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useBillingStatus } from '../../hooks/useBillingStatus';

const DISMISS_KEY = 'meuazulao.trialBanner.dismissed';

/**
 * Dashboard banner: the last 3 days of the free trial (dismissible for the
 * session) and, once it is over without Plus, a permanent reminder.
 */
export default function TrialBanner() {
  const { t } = useI18n();
  const { status, paywallEnabled, subscribePath } = useBillingStatus();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      setDismissed(window.sessionStorage.getItem(DISMISS_KEY) === '1');
    } catch (_) { /* storage blocked */ }
  }, []);

  if (!paywallEnabled || !status) return null;
  const expired = status.status === 'expired';
  const endingSoon = status.status === 'trial' && status.daysLeft <= 3;
  if (!expired && !(endingSoon && !dismissed)) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISS_KEY, '1');
    } catch (_) { /* storage blocked */ }
  };

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-3 px-4 py-3 text-sm sm:px-6 lg:px-8 ${
        expired ? 'bg-negative/10 text-ink-900' : 'bg-warning/10 text-ink-900'
      }`}
    >
      <Clock className={`h-5 w-5 flex-shrink-0 ${expired ? 'text-negative' : 'text-warning'}`} />
      <p className="min-w-0 flex-1">
        {expired
          ? t('web.billing.trialEnded')
          : t('web.billing.trialDaysLeft', { count: Math.max(1, status.daysLeft) })}
      </p>
      {subscribePath && (
        <a
          href={subscribePath}
          className="inline-flex items-center rounded-full bg-brand-500 px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110"
        >
          {t('web.billing.subscribe')}
        </a>
      )}
      {!expired && (
        <button
          type="button"
          onClick={dismiss}
          className="rounded-full p-1 text-ink-500 hover:bg-black/5"
          aria-label={t('web.billing.dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
