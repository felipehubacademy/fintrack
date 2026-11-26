import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import { setFeatureOverride } from '@fintrack/shared/config';
import { createMockSupabase, filterValue, mockRes } from './mockSupabase.mjs';
import {
  applyRevenueCatEvent,
  buildBillingStatus,
  organizationIdFromEvent,
  sourceForStore,
  isUuid,
} from '../billingServer.js';
import { createStatusHandler } from '../../pages/api/billing/status.js';
import { createWebhookHandler } from '../../pages/api/billing/revenuecat-webhook.js';

const ORG = '3f2a9c1e-1111-4222-8333-444455556666';
const ORG2 = '9b8a7c6d-1111-4222-8333-444455556666';
const NOW = new Date('2026-12-01T12:00:00Z');
const DAY = 24 * 60 * 60 * 1000;
const silent = { info() {}, warn() {}, error() {} };

afterEach(() => setFeatureOverride('paywall', undefined));

/** In-memory organizations table on top of the chainable mock. */
function orgDb(rows = {}, { selectError } = {}) {
  const db = { ...rows };
  const admin = createMockSupabase({
    resolve(op) {
      if (op.table === 'organizations') {
        const id = filterValue(op, 'eq', 'id');
        if (op.action === 'update') {
          if (db[id]) db[id] = { ...db[id], ...op.values };
          return { data: null, error: null };
        }
        if (selectError) return { data: null, error: selectError };
        return { data: db[id] ? { id, ...db[id] } : null, error: null };
      }
      if (op.table === 'users') {
        const id = filterValue(op, 'eq', 'id');
        if (op.single === 'maybe') return { data: db.__userCurrency ? { currency: db.__userCurrency } : null, error: null };
        return { data: id === 'u1' ? [{ id: 'u1', organization_id: ORG, role: 'admin' }] : [], error: null };
      }
      return { data: [], error: null };
    },
    users: { tok: { id: 'u1' } },
  });
  return { db, admin };
}

function updates(admin) {
  return admin.calls.filter((c) => c.table === 'organizations' && c.action === 'update');
}

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

test('isUuid / organizationIdFromEvent pick the organization id', () => {
  assert.equal(isUuid(ORG), true);
  assert.equal(isUuid('$RCAnonymousID:abc'), false);
  assert.equal(organizationIdFromEvent({ app_user_id: ORG }), ORG);
  assert.equal(organizationIdFromEvent({ app_user_id: '$RCAnonymousID:x', aliases: ['$RCAnonymousID:x', ORG] }), ORG);
  assert.equal(organizationIdFromEvent({ app_user_id: 'nope' }), null);
});

test('sourceForStore maps RevenueCat stores', () => {
  assert.equal(sourceForStore('APP_STORE'), 'app_store');
  assert.equal(sourceForStore('PLAY_STORE'), 'play_store');
  assert.equal(sourceForStore('STRIPE'), 'stripe');
  assert.equal(sourceForStore('RC_BILLING'), 'stripe');
  assert.equal(sourceForStore('PROMOTIONAL'), 'promotional');
  assert.equal(sourceForStore('AMAZON'), null);
});

test('buildBillingStatus: missing row/columns reads as trial with access', () => {
  const s = buildBillingStatus(null, { currency: 'BRL', now: NOW });
  assert.equal(s.status, 'trial');
  assert.equal(s.hasAccess, true);
  assert.equal(s.currency, 'BRL');
  assert.deepEqual(s.prices, { monthly: 9.9, annual: 79.9, winback: 0.99 });
  assert.ok(s.savingsPercent > 0);
});

test('buildBillingStatus: expired trial has no access, unless the paywall flag is off', () => {
  const org = { trial_ends_at: new Date(NOW - DAY).toISOString(), plus_until: null };
  assert.equal(buildBillingStatus(org, { now: NOW }).hasAccess, false);
  assert.equal(buildBillingStatus(org, { now: NOW }).status, 'expired');
  setFeatureOverride('paywall', false);
  assert.equal(buildBillingStatus(org, { now: NOW }).hasAccess, true);
});

test('buildBillingStatus: active Plus and unknown currency falls back to USD', () => {
  const org = { trial_ends_at: null, plus_until: new Date(+NOW + 10 * DAY).toISOString(), plus_source: 'play_store' };
  const s = buildBillingStatus(org, { currency: 'ARS', now: NOW });
  assert.equal(s.status, 'active');
  assert.equal(s.isPlus, true);
  assert.equal(s.source, 'play_store');
  assert.equal(s.currency, 'USD');
});

// ---------------------------------------------------------------------------
// GET /api/billing/status
// ---------------------------------------------------------------------------

test('status: 401 without a token', async () => {
  const { admin } = orgDb();
  const res = mockRes();
  await createStatusHandler({ getAdmin: () => admin })({ method: 'GET', headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 401);
});

test('status: 405 for POST', async () => {
  const { admin } = orgDb();
  const res = mockRes();
  await createStatusHandler({ getAdmin: () => admin })({ method: 'POST', headers: {}, query: {} }, res);
  assert.equal(res.statusCode, 405);
});

test('status: reads the caller organization (expired trial)', async () => {
  const { admin } = orgDb({ [ORG]: { trial_ends_at: new Date(NOW - 2 * DAY).toISOString(), plus_until: null, plus_source: null } });
  const res = mockRes();
  await createStatusHandler({ getAdmin: () => admin, now: () => NOW })(
    { method: 'GET', headers: { authorization: 'Bearer tok' }, query: { currency: 'MXN' } }, res,
  );
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'expired');
  assert.equal(res.body.hasAccess, false);
  assert.equal(res.body.currency, 'MXN');
  assert.equal(res.body.prices.monthly, 59);
  assert.equal(res.headers['cache-control'], 'no-store');
});

test('status: saved user currency wins over ?currency=', async () => {
  const { admin } = orgDb({ __userCurrency: 'BRL', [ORG]: { trial_ends_at: new Date(+NOW + 3 * DAY).toISOString() } });
  const res = mockRes();
  await createStatusHandler({ getAdmin: () => admin, now: () => NOW })(
    { method: 'GET', headers: { authorization: 'Bearer tok' }, query: { currency: 'USD' } }, res,
  );
  assert.equal(res.body.currency, 'BRL');
  assert.equal(res.body.status, 'trial');
  assert.equal(res.body.daysLeft, 3);
});

test('status: missing billing columns read as trial', async () => {
  const { admin } = orgDb({}, { selectError: { message: 'column organizations.trial_ends_at does not exist' } });
  const origWarn = console.warn;
  console.warn = () => {};
  const res = mockRes();
  try {
    await createStatusHandler({ getAdmin: () => admin, now: () => NOW })(
      { method: 'GET', headers: { authorization: 'Bearer tok' }, query: {} }, res,
    );
  } finally {
    console.warn = origWarn;
  }
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'trial');
  assert.equal(res.body.hasAccess, true);
});

// ---------------------------------------------------------------------------
// RevenueCat events
// ---------------------------------------------------------------------------

function ev(type, extra = {}) {
  return { id: `evt-${type}`, type, app_user_id: ORG, store: 'APP_STORE', entitlement_ids: ['plus'], ...extra };
}

test('INITIAL_PURCHASE sets plus_until and plus_source', async () => {
  const { db, admin } = orgDb({ [ORG]: { plus_until: null, plus_source: null } });
  const exp = Date.parse('2027-01-01T00:00:00Z');
  const r = await applyRevenueCatEvent(admin, ev('INITIAL_PURCHASE', { expiration_at_ms: exp }), { log: silent });
  assert.equal(r.handled, true);
  assert.equal(db[ORG].plus_until, new Date(exp).toISOString());
  assert.equal(db[ORG].plus_source, 'app_store');
});

test('purchase events are idempotent and never shorten plus_until', async () => {
  const later = Date.parse('2027-02-01T00:00:00Z');
  const earlier = Date.parse('2027-01-01T00:00:00Z');
  const { db, admin } = orgDb({ [ORG]: { plus_until: null, plus_source: null } });
  for (const type of ['RENEWAL', 'RENEWAL']) {
    await applyRevenueCatEvent(admin, ev(type, { expiration_at_ms: later, store: 'PLAY_STORE' }), { log: silent });
  }
  assert.equal(db[ORG].plus_until, new Date(later).toISOString());
  await applyRevenueCatEvent(admin, ev('PRODUCT_CHANGE', { expiration_at_ms: earlier, store: 'PLAY_STORE' }), { log: silent });
  assert.equal(db[ORG].plus_until, new Date(later).toISOString());
  assert.equal(db[ORG].plus_source, 'play_store');
});

test('UNCANCELLATION and NON_RENEWING_PURCHASE grant access; web billing maps to stripe', async () => {
  const exp = Date.parse('2027-03-01T00:00:00Z');
  const { db, admin } = orgDb({ [ORG]: { plus_until: null, plus_source: null } });
  await applyRevenueCatEvent(admin, ev('UNCANCELLATION', { expiration_at_ms: exp, store: 'RC_BILLING' }), { log: silent });
  assert.equal(db[ORG].plus_source, 'stripe');
  const r = await applyRevenueCatEvent(admin, ev('NON_RENEWING_PURCHASE', { expiration_at_ms: exp + DAY, store: 'PROMOTIONAL' }), { log: silent });
  assert.equal(r.handled, true);
  assert.equal(db[ORG].plus_source, 'promotional');
});

test('CANCELLATION and BILLING_ISSUE keep plus_until (access until expiry)', async () => {
  const until = '2027-01-01T00:00:00.000Z';
  const { db, admin } = orgDb({ [ORG]: { plus_until: until, plus_source: 'app_store' } });
  await applyRevenueCatEvent(admin, ev('CANCELLATION', { expiration_at_ms: Date.parse(until) }), { log: silent });
  await applyRevenueCatEvent(admin, ev('BILLING_ISSUE'), { log: silent });
  assert.equal(db[ORG].plus_until, until);
  assert.equal(updates(admin).length, 0);
});

test('EXPIRATION sets plus_until to the expiration time', async () => {
  const { db, admin } = orgDb({ [ORG]: { plus_until: '2027-06-01T00:00:00.000Z', plus_source: 'app_store' } });
  const exp = Date.parse('2026-11-30T10:00:00Z');
  await applyRevenueCatEvent(admin, ev('EXPIRATION', { expiration_at_ms: exp }), { log: silent });
  assert.equal(db[ORG].plus_until, new Date(exp).toISOString());
});

test('ids that are not an organization are ignored without writes', async () => {
  const { admin } = orgDb({});
  const r1 = await applyRevenueCatEvent(admin, ev('INITIAL_PURCHASE', { app_user_id: '$RCAnonymousID:1', expiration_at_ms: 1 }), { log: silent });
  assert.equal(r1.reason, 'not_an_organization');
  const r2 = await applyRevenueCatEvent(admin, ev('INITIAL_PURCHASE', { app_user_id: ORG2, expiration_at_ms: 1 }), { log: silent });
  assert.equal(r2.reason, 'unknown_organization');
  assert.equal(updates(admin).length, 0);
});

test('events for another entitlement are ignored', async () => {
  const { admin } = orgDb({ [ORG]: {} });
  const r = await applyRevenueCatEvent(admin, ev('INITIAL_PURCHASE', { entitlement_ids: ['other'], expiration_at_ms: 1 }), { log: silent });
  assert.equal(r.reason, 'other_entitlement');
});

test('TRANSFER moves Plus from the old organization to the new one', async () => {
  const until = '2027-05-01T00:00:00.000Z';
  const { db, admin } = orgDb({
    [ORG]: { plus_until: until, plus_source: 'app_store' },
    [ORG2]: { plus_until: null, plus_source: null },
  });
  const r = await applyRevenueCatEvent(admin, {
    type: 'TRANSFER', transferred_from: [ORG, '$RCAnonymousID:z'], transferred_to: [ORG2],
  }, { log: silent });
  assert.equal(r.handled, true);
  assert.equal(db[ORG].plus_until, null);
  assert.equal(db[ORG2].plus_until, until);
  assert.equal(db[ORG2].plus_source, 'app_store');
});

test('database errors propagate (so RevenueCat retries)', async () => {
  const admin = createMockSupabase({ resolve: () => ({ data: null, error: { message: 'boom' } }) });
  await assert.rejects(applyRevenueCatEvent(admin, ev('RENEWAL', { expiration_at_ms: 1 }), { log: silent }));
});

// ---------------------------------------------------------------------------
// POST /api/billing/revenuecat-webhook
// ---------------------------------------------------------------------------

function hook(admin, secret = 's3cret') {
  return createWebhookHandler({ getAdmin: () => admin, getSecret: () => secret, log: silent });
}

test('webhook: rejects a wrong or missing Authorization header', async () => {
  const { admin } = orgDb({ [ORG]: {} });
  for (const headers of [{}, { authorization: 'nope' }, { authorization: 'Bearer nope' }]) {
    const res = mockRes();
    await hook(admin)({ method: 'POST', headers, body: { event: ev('TEST') } }, res);
    assert.equal(res.statusCode, 401);
  }
  assert.equal(admin.calls.length, 0);
});

test('webhook: 500 when the secret is not configured', async () => {
  const { admin } = orgDb();
  const res = mockRes();
  await hook(admin, '')({ method: 'POST', headers: { authorization: 'x' }, body: { event: ev('TEST') } }, res);
  assert.equal(res.statusCode, 500);
});

test('webhook: TEST event returns 200', async () => {
  const { admin } = orgDb();
  const res = mockRes();
  await hook(admin)({ method: 'POST', headers: { authorization: 's3cret' }, body: { event: { type: 'TEST', app_user_id: 'x' } } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.reason, 'test');
});

test('webhook: applies a purchase (Bearer form accepted, string body parsed)', async () => {
  const { db, admin } = orgDb({ [ORG]: { plus_until: null } });
  const exp = Date.parse('2027-01-10T00:00:00Z');
  const res = mockRes();
  await hook(admin)({
    method: 'POST',
    headers: { authorization: 'Bearer s3cret' },
    body: JSON.stringify({ api_version: '1.0', event: ev('INITIAL_PURCHASE', { expiration_at_ms: exp }) }),
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(db[ORG].plus_until, new Date(exp).toISOString());
});

test('webhook: unknown organization is acknowledged with 200', async () => {
  const { admin } = orgDb({});
  const res = mockRes();
  await hook(admin)({ method: 'POST', headers: { authorization: 's3cret' }, body: { event: ev('RENEWAL', { app_user_id: 'not-an-org', expiration_at_ms: 1 }) } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.handled, false);
});

test('webhook: 500 on database errors, 400 without an event, 405 for GET', async () => {
  const broken = createMockSupabase({ resolve: () => ({ data: null, error: { message: 'boom' } }) });
  let res = mockRes();
  await hook(broken)({ method: 'POST', headers: { authorization: 's3cret' }, body: { event: ev('RENEWAL', { expiration_at_ms: 1 }) } }, res);
  assert.equal(res.statusCode, 500);
  res = mockRes();
  await hook(broken)({ method: 'POST', headers: { authorization: 's3cret' }, body: {} }, res);
  assert.equal(res.statusCode, 400);
  res = mockRes();
  await hook(broken)({ method: 'GET', headers: {} }, res);
  assert.equal(res.statusCode, 405);
});
