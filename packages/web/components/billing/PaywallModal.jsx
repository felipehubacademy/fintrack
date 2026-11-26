import { useEffect } from 'react';
import { X, Lock } from 'lucide-react';
import { useI18n } from '../../contexts/I18nContext';
import { useBillingStatus } from '../../hooks/useBillingStatus';
import PlanPrices from './PlanPrices';

/**
 * Shown instead of an add/edit form when the free trial is over and the
 * household has no Plus. Data stays readable; only new entries need Plus.
 */
export default function PaywallModal({ isOpen, onClose }) {
  const { t } = useI18n();
  const { status, subscribePath } = useBillingStatus();

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="paywall-title"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div className="w-full max-w-lg rounded-t-2xl bg-surface p-6 shadow-xl sm:rounded-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-50">
            <Lock className="h-5 w-5 text-brand-500" />
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-ink-500 hover:bg-surface-2"
            aria-label={t('web.billing.dismiss')}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <h2 id="paywall-title" className="mb-2 text-xl font-bold text-ink-900">{t('web.billing.paywallTitle')}</h2>
        <p className="mb-6 text-ink-500">{t('web.billing.paywallBody')}</p>

        <PlanPrices currency={status?.currency} compact className="mb-6" />

        <div className="flex flex-col gap-3 sm:flex-row-reverse">
          {subscribePath && (
            <a
              href={subscribePath}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-brand-500 px-6 py-3 text-base font-semibold text-white transition hover:brightness-110"
            >
              {t('web.billing.subscribe')}
            </a>
          )}
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-full border border-gray-200 px-6 py-3 text-base font-semibold text-ink-900 hover:bg-surface-2"
          >
            {t('web.billing.notNow')}
          </button>
        </div>
        <p className="mt-4 text-center text-sm text-ink-500">{t('web.billing.cancelAnytime')}</p>
      </div>
    </div>
  );
}
