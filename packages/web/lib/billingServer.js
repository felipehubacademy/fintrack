/**
 * Server-side billing helpers for pages/api/billing/** and the subscribe
 * pages. Pure functions that take the Supabase admin client, so tests can
 * pass a mock.
 *
 * Data contract (docs/launch/BILLING.md, migration 2026-11-26-billing-01):
 *   organizations.trial_ends_at, plus_until, plus_source.
 * Until the migration runs those columns are missing: reads then fall back
 * to "trial" so nobody is locked out.
 */

import {
  getBillingState,
  pricesFor,
  annualSavingsPercent,
  billingCurrency,
  ENTITLEMENT_ID,
} from '@fintrack/shared/billing';
import { isFeatureEnabled } from '@fintrack/shared/config';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value);
}

function toIso(value) {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function toTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

/** Billing columns of an organization, or null when unavailable (missing columns, no row). */
export async function readOrganizationBilling(admin, organizationId) {
  if (!organizationId) return null;
  const { data, error } = await admin
    .from('organizations')
    .select('id, trial_ends_at, plus_until, plus_source')
    .eq('id', organizationId)
    .maybeSingle();
  if (error) {
    // Most likely the billing migration has not run yet.
    console.warn('[billing] could not read organization billing columns:', error.message || error);
    return null;
  }
  return data || null;
}

/** Saved currency of the caller (users.currency), if the column exists. */
async function readUserCurrency(admin, userId) {
  if (!userId) return null;
  const { data, error } = await admin.from('users').select('currency').eq('id', userId).maybeSingle();
  if (error) return null;
  return data?.currency || null;
}

/**
 * The GET /api/billing/status payload:
 * { status, isPlus, hasAccess, daysLeft, trialEndsAt, plusUntil, source,
 *   currency, prices, savingsPercent, paywallEnabled } (plus organizationId
 *   from getBillingStatusFor).
 * When the paywall flag is off, hasAccess is always true.
 */
export function buildBillingStatus(org, { currency, now = new Date() } = {}) {
  const trialEndsAt = toIso(org?.trial_ends_at);
  const plusUntil = toIso(org?.plus_until);
  const state = getBillingState({ trialEndsAt, plusUntil, now });
  const paywallEnabled = isFeatureEnabled('paywall');
  const prices = pricesFor(currency);
  return {
    status: state.status,
    isPlus: state.isPlus,
    hasAccess: paywallEnabled ? state.hasAccess : true,
    daysLeft: state.daysLeft,
    trialEndsAt,
    plusUntil,
    source: org?.plus_source || null,
    currency: prices.currency,
    prices: { monthly: prices.monthly, annual: prices.annual, winback: prices.winback },
    savingsPercent: annualSavingsPercent(prices.currency),
    paywallEnabled,
  };
}

/** Status for the authenticated caller (ctx from requireUser). */
export async function getBillingStatusFor(admin, ctx, { requestedCurrency, now } = {}) {
  const [org, savedCurrency] = await Promise.all([
    readOrganizationBilling(admin, ctx?.organizationId),
    readUserCurrency(admin, ctx?.userId),
  ]);
  const currency = billingCurrency(savedCurrency || requestedCurrency);
  return { organizationId: ctx?.organizationId || null, ...buildBillingStatus(org, { currency, now }) };
}

// ---------------------------------------------------------------------------
// RevenueCat webhook
// ---------------------------------------------------------------------------

const GRANT_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'PRODUCT_CHANGE',
  'UNCANCELLATION',
  'NON_RENEWING_PURCHASE',
]);

const STORE_SOURCES = {
  APP_STORE: 'app_store',
  MAC_APP_STORE: 'app_store',
  PLAY_STORE: 'play_store',
  STRIPE: 'stripe',
  RC_BILLING: 'stripe', // RevenueCat Web Billing (Stripe under the hood)
  PROMOTIONAL: 'promotional',
};

export function sourceForStore(store) {
  return STORE_SOURCES[String(store || '').toUpperCase()] || null;
}

/** The organization id an event is about: app_user_id, else original id, else an alias that is a UUID. */
export function organizationIdFromEvent(event) {
  const candidates = [event?.app_user_id, event?.original_app_user_id, ...(Array.isArray(event?.aliases) ? event.aliases : [])];
  return candidates.find(isUuid) || null;
}

function concernsPlus(event) {
  const ids = event?.entitlement_ids || (event?.entitlement_id ? [event.entitlement_id] : null);
  // No entitlement info: assume it is ours (single entitlement app).
  if (!Array.isArray(ids) || ids.length === 0) return true;
  return ids.includes(ENTITLEMENT_ID);
}

async function updateOrganization(admin, organizationId, values) {
  const { error } = await admin.from('organizations').update(values).eq('id', organizationId);
  if (error) throw error;
}

/** Org row by id, or null when the id is not an organization. Throws on query errors. */
async function findOrganization(admin, organizationId) {
  const { data, error } = await admin
    .from('organizations')
    .select('id, plus_until, plus_source')
    .eq('id', organizationId)
    .maybeSingle();
  if (error) throw error;
  return data || null;
}

/**
 * Apply one RevenueCat webhook event. Idempotent: every write sets absolute
 * values derived from the event (re-delivery gives the same row), and a
 * purchase never shortens an existing plus_until, so an older event that
 * arrives late can't take away time from a newer one.
 *
 * Returns { handled: boolean, reason?, organizationId?, update? } and throws
 * only on database errors (so RevenueCat retries).
 */
export async function applyRevenueCatEvent(admin, event, { log = console } = {}) {
  const type = String(event?.type || '').toUpperCase();
  if (!type) return { handled: false, reason: 'no_type' };
  if (type === 'TEST') return { handled: true, reason: 'test' };

  if (type === 'TRANSFER') return applyTransfer(admin, event, { log });

  if (!GRANT_EVENTS.has(type) && type !== 'CANCELLATION' && type !== 'EXPIRATION' && type !== 'BILLING_ISSUE') {
    return { handled: false, reason: 'ignored_type' };
  }
  if (!concernsPlus(event)) return { handled: false, reason: 'other_entitlement' };

  const organizationId = organizationIdFromEvent(event);
  if (!organizationId) {
    log.warn?.('[revenuecat] event for a non-organization app_user_id ignored', { type, app_user_id: event?.app_user_id });
    return { handled: false, reason: 'not_an_organization' };
  }
  const org = await findOrganization(admin, organizationId);
  if (!org) {
    log.warn?.('[revenuecat] event for an unknown organization ignored', { type, organizationId });
    return { handled: false, reason: 'unknown_organization', organizationId };
  }

  // Access lasts until expiration; a cancellation or a billing issue changes nothing now.
  if (type === 'CANCELLATION' || type === 'BILLING_ISSUE') {
    return { handled: true, reason: 'no_change', organizationId };
  }

  const expiration = toTime(event.expiration_at_ms);

  if (type === 'EXPIRATION') {
    const plusUntil = toIso(expiration ?? event.event_timestamp_ms ?? Date.now());
    const update = { plus_until: plusUntil };
    await updateOrganization(admin, organizationId, update);
    return { handled: true, organizationId, update };
  }

  // Purchase-like events
  if (!expiration) {
    log.warn?.('[revenuecat] purchase event without expiration ignored', { type, organizationId });
    return { handled: false, reason: 'no_expiration', organizationId };
  }
  const current = toTime(org.plus_until);
  const update = {
    plus_until: toIso(current && current > expiration ? current : expiration),
    plus_source: sourceForStore(event.store) || org.plus_source || null,
  };
  await updateOrganization(admin, organizationId, update);
  return { handled: true, organizationId, update };
}

/**
 * TRANSFER: the purchase moved between app_user_ids (e.g. the same store
 * account restored on another household). Move plus_until/plus_source from
 * the old organization(s) to the new one.
 */
async function applyTransfer(admin, event, { log }) {
  const from = (Array.isArray(event?.transferred_from) ? event.transferred_from : []).filter(isUuid);
  const to = (Array.isArray(event?.transferred_to) ? event.transferred_to : []).filter(isUuid);

  let bestUntil = null;
  let bestSource = null;
  const moved = [];
  for (const id of from) {
    const org = await findOrganization(admin, id);
    if (!org) continue;
    const until = toTime(org.plus_until);
    if (until && (!bestUntil || until > bestUntil)) {
      bestUntil = until;
      bestSource = org.plus_source || null;
    }
    if (org.plus_until || org.plus_source) {
      await updateOrganization(admin, id, { plus_until: null, plus_source: null });
      moved.push(id);
    }
  }

  const targets = [];
  if (bestUntil) {
    for (const id of to) {
      const org = await findOrganization(admin, id);
      if (!org) {
        log.warn?.('[revenuecat] transfer to an unknown organization ignored', { organizationId: id });
        continue;
      }
      const current = toTime(org.plus_until);
      const until = current && current > bestUntil ? current : bestUntil;
      await updateOrganization(admin, id, { plus_until: toIso(until), plus_source: bestSource || org.plus_source || null });
      targets.push(id);
    }
  }
  return { handled: true, reason: 'transfer', from: moved, to: targets };
}
