import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  getBearerToken,
  requireUser,
  requireCronSecret,
  safeEqual,
  rateLimit,
  resetRateLimits,
  isValidEmail,
  isValidPhone,
} from '../apiAuth.js';
import { createMockSupabase, filterValue, mockRes } from './mockSupabase.mjs';

const PROFILE = { id: 'u1', organization_id: 'org1', name: 'Ana', role: 'admin' };

function req(headers = {}) {
  return { headers, socket: { remoteAddress: '1.2.3.4' } };
}

beforeEach(() => resetRateLimits());

test('getBearerToken parses the Authorization header', () => {
  assert.equal(getBearerToken(req({ authorization: 'Bearer abc' })), 'abc');
  assert.equal(getBearerToken(req({ authorization: 'bearer  xyz ' })), 'xyz');
  assert.equal(getBearerToken(req({ authorization: 'Basic abc' })), null);
  assert.equal(getBearerToken(req({ authorization: 'Bearer ' })), null);
  assert.equal(getBearerToken(req({})), null);
});

test('requireUser: 401 without a token, and never calls Supabase', async () => {
  const admin = createMockSupabase();
  const res = mockRes();
  const ctx = await requireUser(req(), res, { admin });
  assert.equal(ctx, null);
  assert.equal(res.statusCode, 401);
  assert.equal(admin.calls.length, 0);
});

test('requireUser: 401 for an invalid token', async () => {
  const admin = createMockSupabase({ users: {} });
  const res = mockRes();
  const ctx = await requireUser(req({ authorization: 'Bearer nope' }), res, { admin });
  assert.equal(ctx, null);
  assert.equal(res.statusCode, 401);
});

test('requireUser: resolves the profile by auth id', async () => {
  const admin = createMockSupabase({
    users: { good: { id: 'u1', email: 'a@x.com' } },
    resolve: (op) => (op.table === 'users' && filterValue(op, 'eq', 'id') === 'u1'
      ? { data: [PROFILE], error: null }
      : { data: [], error: null }),
  });
  const res = mockRes();
  const ctx = await requireUser(req({ authorization: 'Bearer good' }), res, { admin });
  assert.equal(res.statusCode, 200);
  assert.equal(ctx.userId, 'u1');
  assert.equal(ctx.organizationId, 'org1');
  assert.equal(ctx.authUserId, 'u1');
  assert.equal(ctx.role, 'admin');
});

test('requireUser: links a WhatsApp/SMS sign-in to the profile by confirmed phone', async () => {
  const admin = createMockSupabase({
    users: { tok: { id: 'auth-2', phone: '+55 11 99999-0000', phone_confirmed_at: '2026-11-26' } },
    resolve: (op) => (op.table === 'users' && filterValue(op, 'eq', 'phone') === '5511999990000'
      ? { data: [{ ...PROFILE, id: 'legacy-1' }], error: null }
      : { data: [], error: null }),
  });
  const ctx = await requireUser(req({ authorization: 'Bearer tok' }), mockRes(), { admin });
  assert.equal(ctx.userId, 'legacy-1');
  assert.equal(ctx.authUserId, 'auth-2');
});

test('requireUser: an unconfirmed email or phone never links to a profile', async () => {
  const admin = createMockSupabase({
    users: { tok: { id: 'auth-3', email: 'victim@x.com', phone: '5511999990000' } },
    resolve: (op) => (op.table === 'users' && filterValue(op, 'eq', 'id') === undefined
      ? { data: [PROFILE], error: null }
      : { data: [], error: null }),
  });
  const res = mockRes();
  const ctx = await requireUser(req({ authorization: 'Bearer tok' }), res, { admin });
  assert.equal(ctx, null);
  assert.equal(res.statusCode, 403);
});

test('requireUser: requireProfile=false returns the auth user without a profile', async () => {
  const admin = createMockSupabase({ users: { tok: { id: 'auth-4' } } });
  const ctx = await requireUser(req({ authorization: 'Bearer tok' }), mockRes(), { admin, requireProfile: false });
  assert.equal(ctx.authUserId, 'auth-4');
  assert.equal(ctx.profile, null);
  assert.equal(ctx.userId, null);
});

test('requireUser: 500 when the profile lookup fails', async () => {
  const admin = createMockSupabase({
    users: { tok: { id: 'u1' } },
    resolve: () => ({ data: null, error: { message: 'db down' } }),
  });
  const res = mockRes();
  const ctx = await requireUser(req({ authorization: 'Bearer tok' }), res, { admin });
  assert.equal(ctx, null);
  assert.equal(res.statusCode, 500);
});

test('requireCronSecret: 500 when CRON_SECRET is not configured', () => {
  const res = mockRes();
  assert.equal(requireCronSecret(req({ authorization: 'Bearer undefined' }), res, { secret: '' }), false);
  assert.equal(res.statusCode, 500);
});

test('requireCronSecret: rejects a wrong or missing secret', () => {
  for (const headers of [{}, { authorization: 'Bearer wrong' }, { authorization: 'Bearer s3cret-but-longer' }]) {
    const res = mockRes();
    assert.equal(requireCronSecret(req(headers), res, { secret: 's3cret' }), false);
    assert.equal(res.statusCode, 401);
  }
});

test('requireCronSecret: accepts the bearer or x-cron-secret header', () => {
  assert.equal(requireCronSecret(req({ authorization: 'Bearer s3cret' }), mockRes(), { secret: 's3cret' }), true);
  assert.equal(requireCronSecret(req({ 'x-cron-secret': 's3cret' }), mockRes(), { secret: 's3cret' }), true);
});

test('safeEqual compares in constant time and rejects empties', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), false);
  assert.equal(safeEqual(undefined, 'a'), false);
});

test('rateLimit allows up to the limit per IP, then answers 429', () => {
  const opts = { key: 't', limit: 2, windowMs: 1000, now: 0 };
  assert.equal(rateLimit(req(), mockRes(), opts), true);
  assert.equal(rateLimit(req(), mockRes(), opts), true);
  const res = mockRes();
  assert.equal(rateLimit(req(), res, opts), false);
  assert.equal(res.statusCode, 429);
  assert.equal(res.headers['retry-after'], '1');
  // Another IP is independent; a new window resets.
  assert.equal(rateLimit(req({ 'x-forwarded-for': '9.9.9.9, 1.1.1.1' }), mockRes(), opts), true);
  assert.equal(rateLimit(req(), mockRes(), { ...opts, now: 1000 }), true);
});

test('input validators', () => {
  assert.equal(isValidEmail('a@b.co'), true);
  assert.equal(isValidEmail('a b@c.co'), false);
  assert.equal(isValidPhone('+55 (11) 99999-0000'), true);
  assert.equal(isValidPhone('123'), false);
});
