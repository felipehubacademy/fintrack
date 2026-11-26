/** Home banner: last 3 days of the trial, and always once it ended. */
export function bannerKind({ status, daysLeft }, paywallEnabled = true) {
  if (!paywallEnabled) return null;
  if (status === 'expired') return 'expired';
  if (status === 'trial' && daysLeft > 0 && daysLeft <= 3) return 'trialEnding';
  return null;
}

/**
 * Text for the "Your plan" row in Settings (pure, unit-tested).
 * billing: the useBilling() state.
 */
export function planStatusText(billing, t, formatDate) {
  if (billing.status === 'active') {
    if (!billing.renewsAt) return t('billing.plan.activeNoDate');
    const date = formatDate(billing.renewsAt, 'medium');
    return billing.willRenew === false
      ? t('billing.plan.activeUntil', { date })
      : t('billing.plan.active', { date });
  }
  if (billing.status === 'expired') return t('billing.plan.expired');
  return t('billing.plan.trial', { count: billing.daysLeft });
}

/** Store subscriptions can be managed in the app; web/promotional ones cannot. */
export function canManageInStore(billing) {
  return billing.isPlus && (billing.source === 'app_store' || billing.source === 'play_store');
}
