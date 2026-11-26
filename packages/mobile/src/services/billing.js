/**
 * Billing (docs/launch/BILLING.md): RevenueCat in the app, organization
 * billing columns in Supabase. Either one grants Plus.
 *
 * The SDK is optional at runtime: without a public key (dev, CI, Expo Go
 * without a key, web) every call here is a no-op and the app keeps working
 * on the Supabase columns alone.
 */
import { Platform, Linking } from 'react-native';
import {
  ENTITLEMENT_ID,
  OFFERING_ID,
  WINBACK_OFFERING_ID,
  WINBACK_OFFER_ID,
  PRODUCT_IDS,
  getBillingState,
  pricesFor,
  billingCurrency,
  annualSavingsPercent,
} from '@fintrack/shared/billing';

// Literal reads so Expo inlines them at build time.
const KEYS = {
  ios: process.env.EXPO_PUBLIC_RC_IOS_KEY || '',
  android: process.env.EXPO_PUBLIC_RC_ANDROID_KEY || '',
};

export const APP_PACKAGE = 'com.meuazulao.app';
export const STORE_SUBSCRIPTIONS_URL = {
  ios: 'https://apps.apple.com/account/subscriptions',
  android: `https://play.google.com/store/account/subscriptions?package=${APP_PACKAGE}`,
};

export function getRevenueCatKey(os = Platform.OS, keys = KEYS) {
  return (keys[os] || '').trim();
}

let sdkModule; // undefined = not loaded yet, null = unavailable
function loadSdk() {
  if (sdkModule !== undefined) return sdkModule;
  try {
    // eslint-disable-next-line global-require
    const mod = require('react-native-purchases');
    sdkModule = (mod && (mod.default || mod)) || null;
  } catch (_) {
    sdkModule = null;
  }
  return sdkModule;
}

const session = { configured: false, appUserId: null };

/** Purchases is usable on this build (native platform, key set, module present). */
export function isPurchasesAvailable() {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') return false;
  if (!getRevenueCatKey()) return false;
  return Boolean(loadSdk());
}

function sdk() {
  return isPurchasesAvailable() ? loadSdk() : null;
}

/**
 * Configure on first use with appUserID = organization id; logIn when the
 * organization changes. Returns the CustomerInfo, or null when unavailable.
 */
export async function identifyOrganization(organizationId) {
  const P = sdk();
  if (!P || !organizationId) return null;
  const id = String(organizationId);
  if (!session.configured) {
    P.configure({ apiKey: getRevenueCatKey(), appUserID: id });
    session.configured = true;
    session.appUserId = id;
    return P.getCustomerInfo();
  }
  if (session.appUserId !== id) {
    const result = await P.logIn(id);
    session.appUserId = id;
    return result?.customerInfo ?? null;
  }
  return P.getCustomerInfo();
}

/** On sign-out: back to an anonymous RevenueCat user. Never throws. */
export async function resetPurchasesUser() {
  const P = sdk();
  if (!P || !session.configured || !session.appUserId) return;
  session.appUserId = null;
  try {
    await P.logOut();
  } catch (_) {
    // Already anonymous: nothing to do.
  }
}

export async function getCustomerInfo() {
  const P = sdk();
  if (!P || !session.configured) return null;
  return P.getCustomerInfo();
}

export async function getOfferings() {
  const P = sdk();
  if (!P || !session.configured) return null;
  return P.getOfferings();
}

/** Subscribe to CustomerInfo changes (renewals, purchases on another device). */
export function addCustomerInfoListener(listener) {
  const P = sdk();
  if (!P || typeof P.addCustomerInfoUpdateListener !== 'function') return () => {};
  P.addCustomerInfoUpdateListener(listener);
  return () => {
    try { P.removeCustomerInfoUpdateListener?.(listener); } catch (_) { /* ignore */ }
  };
}

export class PurchaseUnavailableError extends Error {
  constructor() {
    super('purchases_unavailable');
    this.name = 'PurchaseUnavailableError';
  }
}

/**
 * Buy a package. With { winback: true } the first-month offer is applied:
 * iOS promotional offer `first_month_winback`, Android subscription option
 * of the same id; otherwise the plain package is bought.
 * Resolves to the new CustomerInfo. A cancelled purchase rejects with
 * error.userCancelled === true.
 */
export async function purchasePackage(pkg, { winback = false } = {}) {
  const P = sdk();
  if (!P || !session.configured || !pkg) throw new PurchaseUnavailableError();

  if (winback) {
    if (Platform.OS === 'ios') {
      const discount = findWinbackDiscount(pkg.product);
      if (discount && typeof P.getPromotionalOffer === 'function') {
        const offer = await P.getPromotionalOffer(pkg.product, discount);
        if (offer) {
          const { customerInfo } = await P.purchaseDiscountedPackage(pkg, offer);
          return customerInfo;
        }
      }
    } else if (Platform.OS === 'android') {
      const option = findWinbackOption(pkg.product);
      if (option && typeof P.purchaseSubscriptionOption === 'function') {
        const { customerInfo } = await P.purchaseSubscriptionOption(option);
        return customerInfo;
      }
    }
  }

  const { customerInfo } = await P.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases() {
  const P = sdk();
  if (!P || !session.configured) throw new PurchaseUnavailableError();
  return P.restorePurchases();
}

/** Store subscription settings: native sheet when possible, store URL otherwise. */
export async function openManageSubscriptions(managementURL) {
  const P = sdk();
  if (P && session.configured && typeof P.showManageSubscriptions === 'function') {
    try {
      await P.showManageSubscriptions();
      return true;
    } catch (_) { /* fall through to a URL */ }
  }
  const url = managementURL || STORE_SUBSCRIPTIONS_URL[Platform.OS] || STORE_SUBSCRIPTIONS_URL.ios;
  await Linking.openURL(url);
  return true;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested)
// ---------------------------------------------------------------------------

export function activePlusEntitlement(customerInfo) {
  return customerInfo?.entitlements?.active?.[ENTITLEMENT_ID] || null;
}

export function hasPlusEntitlement(customerInfo) {
  return Boolean(activePlusEntitlement(customerInfo));
}

const STORE_SOURCES = {
  APP_STORE: 'app_store',
  MAC_APP_STORE: 'app_store',
  PLAY_STORE: 'play_store',
  STRIPE: 'stripe',
  RC_BILLING: 'stripe',
  PROMOTIONAL: 'promotional',
};

/**
 * Supabase organization billing columns. A query error (columns not migrated
 * yet) reads as "no dates", which getBillingState treats as trial.
 */
export async function fetchOrganizationBilling(supabase, organizationId) {
  const empty = { trialEndsAt: null, plusUntil: null, source: null };
  if (!supabase || !organizationId) return empty;
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('trial_ends_at, plus_until, plus_source')
      .eq('id', organizationId)
      .maybeSingle();
    if (error || !data) return empty;
    return {
      trialEndsAt: data.trial_ends_at || null,
      plusUntil: data.plus_until || null,
      source: data.plus_source || null,
    };
  } catch (_) {
    return empty;
  }
}

/**
 * Combine the organization columns and the RevenueCat entitlement.
 * @returns {{ status, isPlus, hasAccess, daysLeft, gated, renewsAt, willRenew, source, managementURL }}
 */
export function combineBillingState({ org, customerInfo, paywallEnabled = true, now = new Date() } = {}) {
  const base = getBillingState({ trialEndsAt: org?.trialEndsAt, plusUntil: org?.plusUntil, now });
  const entitlement = activePlusEntitlement(customerInfo);
  const state = entitlement && !base.isPlus
    ? { status: 'active', isPlus: true, hasAccess: true, daysLeft: 0 }
    : base;

  let renewsAt = null;
  if (entitlement?.expirationDate) renewsAt = entitlement.expirationDate;
  else if (base.isPlus) renewsAt = org?.plusUntil || null;

  return {
    ...state,
    gated: Boolean(paywallEnabled) && !state.hasAccess,
    renewsAt,
    // Unknown when Plus comes only from the server (web, promotional).
    willRenew: entitlement ? entitlement.willRenew !== false : null,
    source: (entitlement && STORE_SOURCES[entitlement.store]) || org?.source || null,
    managementURL: customerInfo?.managementURL || null,
  };
}

function findByProduct(offering, productId) {
  const list = offering?.availablePackages || [];
  return list.find((p) => String(p?.product?.identifier || '').startsWith(productId)) || null;
}

/** { monthly, annual, winback } packages from RevenueCat offerings (null when missing). */
export function pickPackages(offerings) {
  const main = offerings?.all?.[OFFERING_ID] || offerings?.current || null;
  const winbackOffering = offerings?.all?.[WINBACK_OFFERING_ID] || null;
  return {
    monthly: main?.monthly || findByProduct(main, PRODUCT_IDS.monthly),
    annual: main?.annual || findByProduct(main, PRODUCT_IDS.annual),
    winback: winbackOffering
      ? (winbackOffering.monthly
        || findByProduct(winbackOffering, PRODUCT_IDS.monthly)
        || winbackOffering.availablePackages?.[0]
        || null)
      : null,
  };
}

export function findWinbackDiscount(product) {
  return (product?.discounts || []).find((d) => d?.identifier === WINBACK_OFFER_ID) || null;
}

export function findWinbackOption(product) {
  return (product?.subscriptionOptions || []).find((o) => String(o?.id || '').includes(WINBACK_OFFER_ID)) || null;
}

/** First-month price string of the win-back package, if the store gives one. */
function winbackPriceString(pkg) {
  const product = pkg?.product;
  if (!product) return null;
  const discount = findWinbackDiscount(product);
  if (discount?.priceString) return discount.priceString;
  const option = findWinbackOption(product);
  const phase = option?.introPhase || option?.discountPhase;
  if (phase?.price?.formatted) return phase.price.formatted;
  return product.introPrice?.priceString || null;
}

/**
 * Prices shown on the paywall. Store products first (priceString); when the
 * offerings are unavailable, the shared price table in the billing currency.
 */
export function paywallPrices({ packages, currency, formatMoney }) {
  const monthlyProduct = packages?.monthly?.product;
  const annualProduct = packages?.annual?.product;
  const storeCurrency = annualProduct?.currencyCode || monthlyProduct?.currencyCode;
  const table = pricesFor(storeCurrency || currency);
  const fmt = (value) => formatMoney(value, { currency: table.currency });

  const annualPerMonth = annualProduct
    ? (annualProduct.pricePerMonthString || (Number.isFinite(annualProduct.price)
      ? formatMoney(annualProduct.price / 12, { currency: annualProduct.currencyCode || table.currency })
      : null))
    : fmt(table.annual / 12);

  return {
    currency: billingCurrency(storeCurrency || currency),
    monthly: monthlyProduct?.priceString || fmt(table.monthly),
    annual: annualProduct?.priceString || fmt(table.annual),
    annualPerMonth,
    winback: packages?.winback ? (winbackPriceString(packages.winback) || fmt(table.winback)) : null,
    savingsPercent: annualSavingsPercent(storeCurrency || currency),
    fromStore: Boolean(monthlyProduct || annualProduct),
  };
}

/** Test hook: forget the SDK session (configure/logIn state). */
export function __resetBillingSessionForTests() {
  session.configured = false;
  session.appUserId = null;
  sdkModule = undefined;
}
