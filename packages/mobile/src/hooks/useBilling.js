import { createContext, useContext } from 'react';

/** Provided by BillingProvider (contexts/BillingContext.js). */
export const BillingContext = createContext(null);

const NO_PROVIDER = {
  loading: false,
  status: 'trial',
  isPlus: false,
  hasAccess: true,
  gated: false,
  daysLeft: 0,
  renewsAt: null,
  willRenew: null,
  source: null,
  managementURL: null,
  packages: { monthly: null, annual: null, winback: null },
  winbackOffer: null,
  offerings: null,
  purchasesAvailable: false,
  purchasing: false,
  restoring: false,
  paywallVisible: false,
  purchase: async () => ({ ok: false }),
  restore: async () => ({ ok: false }),
  refresh: async () => {},
  showPaywall: () => {},
  hidePaywall: () => {},
  requireAccess: (action) => {
    if (typeof action === 'function') action();
    return true;
  },
};

/**
 * Billing state for the signed-in organization:
 * { status: 'trial'|'active'|'expired', isPlus, hasAccess, gated, daysLeft,
 *   renewsAt, willRenew, source, packages, winbackOffer, purchasesAvailable,
 *   purchase(pkg, { winback }), restore(), showPaywall(), requireAccess(fn) }.
 * `gated` = paywall flag on and no access: adding is blocked, reading is not.
 * Outside BillingProvider it never gates.
 */
export function useBilling() {
  return useContext(BillingContext) || NO_PROVIDER;
}

export default useBilling;
