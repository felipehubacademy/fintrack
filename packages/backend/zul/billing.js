/**
 * Billing for Zul: trial / Plus state, prices and subscribe links.
 *
 * The model, prices and template names mirror @fintrack/shared/billing
 * (packages/shared/src/billing/index.js). The backend is deployed on its own
 * and does not depend on the shared workspace package, so the few pieces it
 * needs are copied here; __tests__/billing.test.js fails if they drift.
 *
 * Organization columns (docs/migrations/2026-11-26-billing-01.sql):
 *   trial_ends_at, plus_until, plus_source, trial_ending_sent_at, winback_sent_at.
 * Before the migration runs those columns are missing, which reads as "trial",
 * so nobody is locked out.
 */
import { localeFor } from './language.js';

export const TRIAL_DAYS = 7;

export const PRICES = {
  BRL: { monthly: 9.9, annual: 79.9, winback: 0.99 },
  MXN: { monthly: 59, annual: 449, winback: 9 },
  COP: { monthly: 9900, annual: 79900, winback: 2900 },
  USD: { monthly: 4.99, annual: 39.99, winback: 0.99 },
};

export const BILLING_TEMPLATES = {
  trialEnding: 'fim_teste', // day 7
  winback: 'oferta_primeiro_mes', // day 8
};

/** Same default as FEATURE_DEFAULTS.paywall in @fintrack/shared/config. */
export const PAYWALL_DEFAULT = true;

/** Trial nudge: appended once to a normal reply when this many days (or fewer) are left. */
export const TRIAL_NOTICE_DAYS = 2;

const DAY = 24 * 60 * 60 * 1000;

export function billingCurrency(currency) {
  const c = String(currency || '').toUpperCase();
  return PRICES[c] ? c : 'USD';
}

export function pricesFor(currency) {
  const c = billingCurrency(currency);
  return { currency: c, ...PRICES[c] };
}

export function annualSavingsPercent(currency) {
  const p = pricesFor(currency);
  return Math.max(0, Math.floor((1 - p.annual / (p.monthly * 12)) * 100));
}

function toTime(v) {
  if (!v) return null;
  const t = v instanceof Date ? v.getTime() : Date.parse(v);
  return Number.isNaN(t) ? null : t;
}

/** Copy of getBillingState from @fintrack/shared/billing. */
export function getBillingState({ trialEndsAt, plusUntil, now = new Date() } = {}) {
  const t = now.getTime();
  const plus = toTime(plusUntil);
  if (plus && plus > t) return { status: 'active', isPlus: true, hasAccess: true, daysLeft: 0 };
  const trial = toTime(trialEndsAt);
  if (trial && trial > t) {
    return { status: 'trial', isPlus: false, hasAccess: true, daysLeft: Math.ceil((trial - t) / DAY) };
  }
  if (!trial) return { status: 'trial', isPlus: false, hasAccess: true, daysLeft: TRIAL_DAYS };
  return { status: 'expired', isPlus: false, hasAccess: false, daysLeft: 0 };
}

/** Billing state of an organization row (snake_case columns). */
export function orgBillingState(org, now = new Date()) {
  return getBillingState({ trialEndsAt: org?.trial_ends_at, plusUntil: org?.plus_until, now });
}

// ------------------------------------------------------------------ paywall flag

let paywallOverride;

/** isFeatureEnabled('paywall') for the backend: FEATURE_PAYWALL=true|false|1|0 overrides the default. */
export function paywallEnabled() {
  if (paywallOverride !== undefined) return paywallOverride;
  const v = process.env.FEATURE_PAYWALL;
  if (v === 'true' || v === '1') return true;
  if (v === 'false' || v === '0') return false;
  return PAYWALL_DEFAULT;
}

/** Tests only. Pass undefined to clear. */
export function setPaywallOverride(value) {
  paywallOverride = value === undefined ? undefined : Boolean(value);
}

/** True when this organization may not record anything new. */
export function isBlocked(org, now = new Date()) {
  return paywallEnabled() && !orgBillingState(org, now).hasAccess;
}

// ------------------------------------------------------------------------ links

export function siteBase() {
  return (process.env.ZUL_DASHBOARD_URL || 'https://www.meuazulao.com.br').replace(/\/+$/, '');
}

/** Redirects to the RevenueCat Web Purchase Link of the `default` offering. */
export function subscribeLink(organizationId) {
  return `${siteBase()}/assinar/${encodeURIComponent(organizationId || '')}`;
}

/** Redirects to the Web Purchase Link of the `winback` offering (day 8). */
export function winbackLink(organizationId) {
  return `${siteBase()}/oferta/${encodeURIComponent(organizationId || '')}`;
}

// ----------------------------------------------------------------------- prices

/** "R$ 9,90", "$4.99", "$59" (no decimals for whole prices), plain spaces. */
export function formatPrice(value, { currency, lang = 'en', phone = '' } = {}) {
  const amount = Number(value) || 0;
  const digits = Number.isInteger(amount) ? 0 : 2;
  let out;
  try {
    out = new Intl.NumberFormat(localeFor(lang, phone), {
      style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits,
    }).format(amount);
  } catch (_) {
    out = `${currency} ${amount.toFixed(digits)}`;
  }
  return out.replace(/[  ]/g, ' ');
}

/** Formatted prices in the user's currency (non-Plus currencies pay in USD). */
export function priceParams({ currency, lang, phone } = {}) {
  const p = pricesFor(currency);
  const fmt = (v) => formatPrice(v, { currency: p.currency, lang, phone });
  return {
    currency: p.currency,
    monthly: fmt(p.monthly),
    annual: fmt(p.annual),
    winback: fmt(p.winback),
    savings: annualSavingsPercent(p.currency),
  };
}
