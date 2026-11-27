/**
 * DELETE /api/notifications/delete  (Authorization: Bearer <token>)
 * Body: { notification_id }. Only the caller's own notification is deleted.
 */

import { requireUser } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { notification_id: notificationId } = req.body || {};
  if (!notificationId) {
    return res.status(400).json({ error: 'notification_id is required' });
  }

  try {
    const { error } = await getSupabaseAdmin()
      .from('notifications')
      .delete()
      .eq('id', notificationId)
      .eq('user_id', ctx.userId);
    if (error) throw error;
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('[notifications/delete] failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
