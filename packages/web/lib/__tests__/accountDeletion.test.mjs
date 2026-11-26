import { test } from 'node:test';
import assert from 'node:assert/strict';

import { deleteAccount } from '../accountDeletion.js';
import { createMockSupabase, filterValue, mockRes } from './mockSupabase.mjs';
import handler from '../../pages/api/account/delete.js';

function ctxFor(profile, authUserId = profile?.id) {
  return { authUserId, profile, userId: profile?.id || null, organizationId: profile?.organization_id || null };
}

function membersResolver(members, org = { id: 'org1', admin_id: 'u1' }) {
  return (op) => {
    if (op.table === 'users' && op.action === 'select' && filterValue(op, 'neq', 'id')) {
      return { data: members, error: null };
    }
    if (op.table === 'organizations' && op.action === 'select') return { data: org, error: null };
    return { data: [], error: null };
  };
}

test('only member: deletes the whole organization with delete_account and the auth user', async () => {
  const admin = createMockSupabase({ resolve: membersResolver([]) });
  const result = await deleteAccount(admin, ctxFor({ id: 'u1', organization_id: 'org1', role: 'admin' }));

  assert.equal(result.mode, 'organization');
  const rpc = admin.calls.find((c) => c.rpc);
  assert.deepEqual(rpc, { rpc: 'delete_account', params: { p_organization_id: 'org1', p_user_id: 'u1' } });
  assert.ok(admin.calls.some((c) => c.deleteUser === 'u1'));
  // card invoices are removed before delete_account (they block bank tx deletes)
  const invoices = admin.calls.findIndex((c) => c.table === 'card_invoices' && c.action === 'delete');
  assert.ok(invoices >= 0 && invoices < admin.calls.indexOf(rpc));
});

test('member of a shared organization: removes only the caller', async () => {
  const admin = createMockSupabase({
    resolve: membersResolver([{ id: 'u2', role: 'admin', created_at: '2025-01-01' }], { id: 'org1', admin_id: 'u2' }),
  });
  const result = await deleteAccount(admin, ctxFor({ id: 'u1', organization_id: 'org1', role: 'member', email: 'a@x.com' }));

  assert.equal(result.mode, 'member');
  assert.equal(result.transferredAdminTo, null);
  assert.ok(!admin.calls.some((c) => c.rpc), 'must not call delete_account');
  const userDelete = admin.calls.find((c) => c.table === 'users' && c.action === 'delete');
  assert.equal(filterValue(userDelete, 'eq', 'id'), 'u1');
  for (const c of admin.calls.filter((x) => x.action === 'delete')) {
    assert.ok(!c.filters.some(([m, col]) => m === 'eq' && col === 'organization_id'),
      `member deletion must not delete by organization (${c.table})`);
  }
  assert.ok(!admin.calls.some((c) => c.action === 'update' && c.table === 'organizations'));
  assert.ok(admin.calls.some((c) => c.deleteUser === 'u1'));
});

test('admin with other members: admin moves to the oldest other member first', async () => {
  const admin = createMockSupabase({
    resolve: membersResolver([
      { id: 'u3', role: 'member', created_at: '2025-01-01' },
      { id: 'u4', role: 'member', created_at: '2025-06-01' },
    ]),
  });
  const result = await deleteAccount(admin, ctxFor({ id: 'u1', organization_id: 'org1', role: 'admin' }));

  assert.equal(result.transferredAdminTo, 'u3');
  const promote = admin.calls.find((c) => c.table === 'users' && c.action === 'update');
  assert.deepEqual(promote.values, { role: 'admin' });
  assert.equal(filterValue(promote, 'eq', 'id'), 'u3');
  const orgUpdate = admin.calls.find((c) => c.table === 'organizations' && c.action === 'update');
  assert.deepEqual(orgUpdate.values, { admin_id: 'u3' });
  const promoteIdx = admin.calls.indexOf(promote);
  const userDeleteIdx = admin.calls.findIndex((c) => c.table === 'users' && c.action === 'delete');
  assert.ok(promoteIdx < userDeleteIdx);
});

test('missing tables are skipped; a failing users delete aborts before the auth user is removed', async () => {
  const admin = createMockSupabase({
    resolve: (op) => {
      if (op.table === 'users' && op.action === 'select') return { data: [{ id: 'u2', role: 'admin' }], error: null };
      if (op.table === 'organizations') return { data: { id: 'org1', admin_id: 'u2' }, error: null };
      if (op.table === 'belvo_links') return { data: null, error: { code: '42P01', message: 'missing' } };
      if (op.table === 'users' && op.action === 'delete') return { data: null, error: { code: '23503', message: 'fk' } };
      return { data: [], error: null };
    },
  });
  await assert.rejects(() => deleteAccount(admin, ctxFor({ id: 'u1', organization_id: 'org1', role: 'member' })), /user row/);
  assert.ok(!admin.calls.some((c) => c.deleteUser));
});

test('auth user without a profile: only the auth user is deleted', async () => {
  const admin = createMockSupabase();
  const result = await deleteAccount(admin, ctxFor(null, 'auth-9'));
  assert.equal(result.mode, 'auth_only');
  assert.deepEqual(admin.calls, [{ deleteUser: 'auth-9' }]);
});

test('legacy profile id different from the auth id: both auth users are deleted', async () => {
  const admin = createMockSupabase({ resolve: membersResolver([]) });
  await deleteAccount(admin, ctxFor({ id: 'legacy', organization_id: 'org1', role: 'admin' }, 'auth-new'));
  const deleted = admin.calls.filter((c) => c.deleteUser).map((c) => c.deleteUser);
  assert.deepEqual(deleted.sort(), ['auth-new', 'legacy']);
});

test('POST /api/account/delete: 401 without a bearer token, even with ids in the body', async () => {
  const res = mockRes();
  await handler({
    method: 'POST',
    headers: {},
    socket: { remoteAddress: '5.5.5.5' },
    body: { organizationId: 'org1', userId: 'u1' },
  }, res);
  assert.equal(res.statusCode, 401);
});

test('GET /api/account/delete: 405', async () => {
  const res = mockRes();
  await handler({ method: 'GET', headers: {}, socket: {} }, res);
  assert.equal(res.statusCode, 405);
});
