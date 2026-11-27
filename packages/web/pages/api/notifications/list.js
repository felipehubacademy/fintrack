/**
 * GET /api/notifications/list  (Authorization: Bearer <token>)
 * Lists the caller's notifications. user_id/organization_id query params are
 * ignored: they come from the token.
 */

import { requireUser } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const ctx = await requireUser(req, res);
  if (!ctx) return;

  try {
    const supabase = getSupabaseAdmin();
    const { type, unread_only: unreadOnly = 'false' } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const offset = (page - 1) * limit;

    let query = supabase
      .from('notifications')
      .select('*')
      .eq('user_id', ctx.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    let countQuery = supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId);

    if (ctx.organizationId) {
      query = query.eq('organization_id', ctx.organizationId);
      countQuery = countQuery.eq('organization_id', ctx.organizationId);
    }
    if (type) {
      query = query.eq('type', String(type));
      countQuery = countQuery.eq('type', String(type));
    }
    if (unreadOnly === 'true') {
      query = query.is('read_at', null);
      countQuery = countQuery.is('read_at', null);
    }

    const [{ data: notifications, error }, { count, error: countError }] = await Promise.all([query, countQuery]);
    if (error) throw error;
    if (countError) throw countError;

    // Grouped by ISO day (YYYY-MM-DD); clients format it for display.
    const grouped = {};
    (notifications || []).forEach((n) => {
      const day = String(n.created_at || '').slice(0, 10);
      (grouped[day] = grouped[day] || []).push(n);
    });

    return res.status(200).json({
      success: true,
      notifications: notifications || [],
      grouped,
      pagination: { page, limit, total: count || 0, pages: Math.ceil((count || 0) / limit) },
    });
  } catch (error) {
    console.error('[notifications/list] failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
