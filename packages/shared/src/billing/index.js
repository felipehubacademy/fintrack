/**
 * Billing model approved by Felipe on 2026-11-26:
 * - 7-day free trial, no card, starts when the account is created (usually on WhatsApp).
 * - Day 7: offer Plus monthly or annual (annual highlighted).
 * - Day 8, not subscribed: Zul offers the first month at the win-back price.
 *
 * Purchases go through RevenueCat: App Store and Google Play in the app,
 * RevenueCat Web Billing (Stripe) for links sent on WhatsApp and the web.
 * The subscriber is the organization (a couple shares one plan), so the
 * RevenueCat app_user_id is the organization id.
 *
 * Product ids, prices and template names here are the single source of truth
 * for docs/launch/BILLING.md and the store setup.
 */

export const TRIAL_DAYS = 7;
export const ENTITLEMENT_ID = 'plus';
export const OFFERING_ID = 'default';
export const WINBACK_OFFERING_ID = 'winback';

export const PRODUCT_IDS = {
  monthly: 'meuazulao_plus_monthly',
  annual: 'meuazulao_plus_annual',
};

/** Store intro offer (first month at the win-back price) on the monthly product. */
export const WINBACK_OFFER_ID = 'first_month_winback';

/**
 * Prices per currency. ARS, CLP, PEN and anything else are charged in USD.
 * winback = first month for subscribers who did not buy at day 7.
 */
export const PRICES = {
  BRL: { monthly: 9.9, annual: 79.9, winback: 0.99 },
  MXN: { monthly: 59, annual: 449, winback: 9 },
  COP: { monthly: 9900, annual: 79900, winback: 2900 },
  USD: { monthly: 4.99, annual: 39.99, winback: 0.99 },
};

export function billingCurrency(currency) {
  const c = String(currency || '').toUpperCase();
  return PRICES[c] ? c : 'USD';
}

export function pricesFor(currency) {
  const c = billingCurrency(currency);
  return { currency: c, ...PRICES[c] };
}

/** Months saved by paying annually, rounded down (for the "save X%" badge). */
export function annualSavingsPercent(currency) {
  const p = pricesFor(currency);
  return Math.max(0, Math.floor((1 - p.annual / (p.monthly * 12)) * 100));
}

/** Outbound WhatsApp templates for the trial funnel (see docs/launch/BILLING.md). */
export const BILLING_TEMPLATES = {
  trialEnding: 'fim_teste', // day 7
  winback: 'oferta_primeiro_mes', // day 8
};

const DAY = 24 * 60 * 60 * 1000;

function toTime(v) {
  if (!v) return null;
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/**
 * Billing state of an organization.
 * @param {{ trialEndsAt?: string|Date, plusUntil?: string|Date, now?: Date }} org
 * @returns {{ status: 'trial'|'active'|'expired', isPlus: boolean, hasAccess: boolean, daysLeft: number }}
 *   daysLeft counts trial days remaining (ceil), 0 when not in trial.
 */
export function getBillingState({ trialEndsAt, plusUntil, now = new Date() } = {}) {
  const t = now.getTime();
  const plus = toTime(plusUntil);
  if (plus && plus > t) return { status: 'active', isPlus: true, hasAccess: true, daysLeft: 0 };
  const trial = toTime(trialEndsAt);
  if (trial && trial > t) {
    return { status: 'trial', isPlus: false, hasAccess: true, daysLeft: Math.ceil((trial - t) / DAY) };
  }
  // No trial date yet (legacy rows before the migration): treat as trial so nobody is locked out by a missing column.
  if (!trial) return { status: 'trial', isPlus: false, hasAccess: true, daysLeft: TRIAL_DAYS };
  return { status: 'expired', isPlus: false, hasAccess: false, daysLeft: 0 };
}

/**
 * RevenueCat Web Purchase Link for an organization. The base URL comes from
 * the RevenueCat dashboard (one per offering) and is passed in by the caller,
 * because bundlers only inline literal process.env reads.
 */
export function webPurchaseLink(baseUrl, organizationId) {
  if (!baseUrl || !organizationId) return '';
  return `${String(baseUrl).replace(/\/+$/, '')}/${encodeURIComponent(organizationId)}`;
}
