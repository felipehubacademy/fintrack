/**
 * PUT /api/notifications/mark-read  (Authorization: Bearer <token>)
 * Body: { notification_id }. Only the caller's own notification is updated.
 */

import { requireUser } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  const { notification_id: notificationId } = req.body || {};
  if (!notificationId) {
    return res.status(400).json({ error: 'notification_id is required' });
  }

  try {
    const { data: notification, error } = await getSupabaseAdmin()
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)
      .eq('user_id', ctx.userId)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!notification) return res.status(404).json({ error: 'not_found' });
    return res.status(200).json({ success: true, notification });
  } catch (error) {
    console.error('[notifications/mark-read] failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
