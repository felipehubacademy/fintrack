/**
 * PUT /api/notifications/mark-all-read  (Authorization: Bearer <token>)
 * Marks all of the caller's notifications as read.
 */

import { requireUser } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  try {
    let query = getSupabaseAdmin()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', ctx.userId)
      .is('read_at', null);
    if (ctx.organizationId) query = query.eq('organization_id', ctx.organizationId);
    const { data, error } = await query.select('id');
    if (error) throw error;
    return res.status(200).json({ success: true, count: (data || []).length });
  } catch (error) {
    console.error('[notifications/mark-all-read] failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
