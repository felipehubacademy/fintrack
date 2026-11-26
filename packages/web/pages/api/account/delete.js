/**
 * POST /api/account/delete
 * Authorization: Bearer <supabase access token>
 *
 * Deletes the CALLER's account completely (data, users row, auth user, and
 * the organization when the caller is its only member). Ids in the body are
 * ignored: the account is always derived from the token. Used by web, by the
 * mobile app (Apple/Google account deletion requirement) and by the public
 * /delete-account page.
 */

import { requireUser, rateLimit } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';
import { deleteAccount } from '../../../lib/accountDeletion.js';

export default async function handler(req, res) {
  if (req.method !== 'POST' && req.method !== 'DELETE') {
    res.setHeader('Allow', 'POST, DELETE');
    return res.status(405).json({ success: false, error: 'method_not_allowed' });
  }
  if (!rateLimit(req, res, { key: 'account-delete', limit: 5, windowMs: 60_000 })) return;

  const ctx = await requireUser(req, res, { requireProfile: false });
  if (!ctx) return;

  try {
    const result = await deleteAccount(getSupabaseAdmin(), ctx);
    return res.status(200).json({
      success: true,
      mode: result.mode,
      transferredAdminTo: result.transferredAdminTo,
    });
  } catch (err) {
    console.error('[account/delete] failed:', err?.message || err);
    return res.status(500).json({ success: false, error: 'delete_failed' });
  }
}
