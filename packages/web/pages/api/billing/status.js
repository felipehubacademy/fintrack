/**
 * GET /api/billing/status  (Authorization: Bearer <token>)
 *
 * Billing state of the caller's organization:
 * { status: 'trial'|'active'|'expired', isPlus, hasAccess, daysLeft,
 *   trialEndsAt, plusUntil, source, currency, prices: { monthly, annual,
 *   winback }, savingsPercent, paywallEnabled }
 *
 * Currency: the caller's saved users.currency, else ?currency= (the web
 * app's current currency), mapped to a billing currency (USD fallback).
 * Missing billing columns (migration not run yet) read as trial.
 */

import { requireUser } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';
import { getBillingStatusFor } from '../../../lib/billingServer.js';

export function createStatusHandler({ getAdmin = getSupabaseAdmin, now } = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ success: false, error: 'method_not_allowed' });
    }
    res.setHeader('Cache-Control', 'no-store');

    let admin;
    try {
      admin = getAdmin();
    } catch (err) {
      console.error('[billing/status] admin client unavailable:', err?.message || err);
      return res.status(500).json({ success: false, error: 'server_misconfigured' });
    }
    const ctx = await requireUser(req, res, { admin, requireProfile: false });
    if (!ctx) return;

    const requested = Array.isArray(req.query?.currency) ? req.query.currency[0] : req.query?.currency;
    try {
      const status = await getBillingStatusFor(admin, ctx, {
        requestedCurrency: requested,
        now: now ? now() : new Date(),
      });
      return res.status(200).json({ success: true, ...status });
    } catch (err) {
      console.error('[billing/status] failed:', err?.message || err);
      return res.status(500).json({ success: false, error: 'status_failed' });
    }
  };
}

export default createStatusHandler();
