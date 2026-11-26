/**
 * POST /api/notifications/create  (Authorization: Bearer <token>)
 * Creates an in-app notification FOR THE CALLER ONLY. user_id and
 * organization_id in the body are ignored (taken from the token).
 */

import { requireUser, isShortText } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';

const VALID_TYPES = [
  'bill_reminder', 'investment_reminder', 'budget_alert',
  'daily_reminder', 'weekly_report', 'monthly_report',
  'insight', 'expense_confirmation', 'system_alert',
];
const VALID_PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;
  if (!ctx.organizationId) {
    return res.status(403).json({ error: 'no_organization' });
  }

  const { type, title, message, data, priority = 'normal' } = req.body || {};
  if (!VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${VALID_TYPES.join(', ')}` });
  }
  if (!isShortText(title, 200) || !isShortText(message, 2000)) {
    return res.status(400).json({ error: 'title and message are required' });
  }

  try {
    const { data: notification, error } = await getSupabaseAdmin()
      .from('notifications')
      .insert({
        user_id: ctx.userId,
        organization_id: ctx.organizationId,
        type,
        title,
        message,
        data: data && typeof data === 'object' ? data : {},
        priority: VALID_PRIORITIES.includes(priority) ? priority : 'normal',
        sent_via: 'inapp',
      })
      .select()
      .single();
    if (error) throw error;
    return res.status(201).json({ success: true, notification });
  } catch (error) {
    console.error('[notifications/create] failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
