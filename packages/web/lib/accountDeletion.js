/**
 * Full account deletion for the authenticated caller (Apple/Google
 * requirement). Server-only: pass the admin (service role) client.
 *
 * - Caller is the only member of their organization: delete the whole
 *   organization with the existing SQL function delete_account(org, user).
 * - Other members remain: delete only the caller's own data and users row.
 *   If the caller is the admin, admin moves to the oldest other member first.
 * - Finally delete the auth user(s), which signs the caller out everywhere.
 *
 * Tables that may not exist in an older database are skipped quietly.
 */

// Postgres / PostgREST codes for "table or column does not exist".
const MISSING_CODES = new Set(['42P01', '42703', 'PGRST204', 'PGRST205']);

function isMissing(error) {
  return !!error && MISSING_CODES.has(error.code);
}

async function tolerant(label, promise, log) {
  const { error } = await promise;
  if (error && !isMissing(error)) {
    log.push({ step: label, error: error.message || String(error) });
  }
  return !error;
}

async function idsOf(admin, table, column, value) {
  const { data, error } = await admin.from(table).select('id').eq(column, value);
  if (error) return [];
  return (data || []).map((row) => row.id);
}

/** Org-level tables that delete_account (2025-11-11) does not know about. */
async function deleteOrgExtras(admin, orgId, log) {
  // card_invoice_payments cascade from card_invoices and RESTRICT the bank
  // transactions delete_account removes, so drop invoices first.
  for (const table of ['card_invoices', 'payment_allocations', 'transfers', 'investments',
    'goal_contributions', 'financial_goals', 'belvo_links']) {
    await tolerant(`org:${table}`, admin.from(table).delete().eq('organization_id', orgId), log);
  }
}

/** Delete one member's own rows inside a shared organization. */
export async function deleteMemberData(admin, profile, log = []) {
  const uid = profile.id;

  // bills.expense_id references expenses without ON DELETE CASCADE, so bills go first:
  // the member's own bills are deleted, and other members' bills only lose the link.
  await tolerant('bills', admin.from('bills').delete().eq('user_id', uid), log);
  const expenseIds = await idsOf(admin, 'expenses', 'user_id', uid);
  if (expenseIds.length) {
    await tolerant('bills.expense_id', admin.from('bills').update({ expense_id: null }).in('expense_id', expenseIds), log);
    await tolerant('expense_splits', admin.from('expense_splits').delete().in('expense_id', expenseIds), log);
  }
  await tolerant('expenses', admin.from('expenses').delete().eq('user_id', uid), log);

  const incomeIds = await idsOf(admin, 'incomes', 'user_id', uid);
  if (incomeIds.length) {
    await tolerant('income_splits', admin.from('income_splits').delete().in('income_id', incomeIds), log);
  }
  await tolerant('incomes', admin.from('incomes').delete().eq('user_id', uid), log);

  const steps = [
    ['bills', 'user_id'],
    ['card_invoices', 'user_id'],
    ['cards', 'owner_id'],
    ['payment_allocations', 'user_id'],
    ['bank_account_transactions', 'user_id'],
    ['bank_accounts', 'user_id'],
    ['budgets', 'user_id'],
    ['notification_history', 'user_id'],
    ['notifications', 'user_id'],
    ['investment_contributions', 'user_id'],
    ['investments', 'user_id'],
    ['investment_goals', 'user_id'],
    ['financial_goals', 'user_id'],
    ['belvo_links', 'user_id'],
    ['conversations', 'user_id'],
    ['user_preferences', 'user_id'],
    ['user_tours', 'user_id'],
    ['onboarding_progress', 'user_id'],
    ['verification_codes', 'user_id'],
    ['pending_invites', 'invited_by'],
  ];
  for (const [table, column] of steps) {
    await tolerant(table, admin.from(table).delete().eq(column, uid), log);
  }
  if (profile.email) {
    await tolerant('pending_invites:email', admin.from('pending_invites').delete().eq('email', profile.email), log);
  }

  // The member's cost center may still be referenced by other members'
  // records; if it cannot be deleted, unlink and deactivate it.
  const { error: ccError } = await admin.from('cost_centers').delete().eq('user_id', uid);
  if (ccError && !isMissing(ccError)) {
    await tolerant('cost_centers:deactivate', admin.from('cost_centers')
      .update({ is_active: false, user_id: null, linked_email: null })
      .eq('user_id', uid), log);
  }

  const { error: userError } = await admin.from('users').delete().eq('id', uid);
  if (userError) throw new Error(`Could not delete user row: ${userError.message}`);
  return log;
}

/**
 * Delete the caller's account. `ctx` is what requireUser() returned.
 * Returns { mode, transferredAdminTo, warnings }.
 */
export async function deleteAccount(admin, ctx) {
  const profile = ctx.profile;
  const warnings = [];
  let mode = 'auth_only';
  let transferredAdminTo = null;

  if (profile?.organization_id) {
    const orgId = profile.organization_id;
    const { data: others, error: othersError } = await admin
      .from('users')
      .select('id, role, created_at')
      .eq('organization_id', orgId)
      .neq('id', profile.id)
      .order('created_at', { ascending: true });
    if (othersError) throw new Error(`Could not list members: ${othersError.message}`);

    if (!others || others.length === 0) {
      mode = 'organization';
      await deleteOrgExtras(admin, orgId, warnings);
      const { error } = await admin.rpc('delete_account', {
        p_organization_id: orgId,
        p_user_id: profile.id,
      });
      if (error) throw new Error(`delete_account failed: ${error.message}`);
    } else {
      mode = 'member';
      const { data: org } = await admin
        .from('organizations')
        .select('id, admin_id')
        .eq('id', orgId)
        .maybeSingle();
      const callerIsAdmin = profile.role === 'admin'
        || (org?.admin_id && [profile.id, ctx.authUserId].includes(org.admin_id));
      const otherAdmin = others.find((m) => m.role === 'admin');

      if (callerIsAdmin) {
        const heir = otherAdmin || others[0];
        if (!otherAdmin) {
          const { error } = await admin.from('users').update({ role: 'admin' }).eq('id', heir.id);
          if (error) throw new Error(`Could not promote new admin: ${error.message}`);
        }
        if (!org || [profile.id, ctx.authUserId].includes(org.admin_id)) {
          const { error } = await admin.from('organizations').update({ admin_id: heir.id }).eq('id', orgId);
          if (error) throw new Error(`Could not transfer organization: ${error.message}`);
        }
        transferredAdminTo = heir.id;
      }
      await deleteMemberData(admin, profile, warnings);
    }
  } else if (profile) {
    mode = 'member';
    await deleteMemberData(admin, profile, warnings);
  }

  // Auth user(s). Older accounts may have a users row whose id differs from
  // the auth id (linked by email/phone); delete both when they differ.
  const authIds = [...new Set([ctx.authUserId, profile?.id].filter(Boolean))];
  for (const id of authIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error && id === ctx.authUserId && !/not.?found/i.test(error.message || '')) {
      throw new Error(`Could not delete auth user: ${error.message}`);
    }
  }

  if (warnings.length) console.warn('[account/delete] non-fatal cleanup errors:', warnings);
  return { mode, transferredAdminTo, warnings };
}
