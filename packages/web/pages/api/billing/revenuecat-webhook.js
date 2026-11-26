/**
 * POST /api/billing/revenuecat-webhook
 *
 * RevenueCat -> us. The dashboard sends the Authorization header we set
 * there; it must equal REVENUECAT_WEBHOOK_SECRET (compared in constant
 * time). app_user_id is the organization id. Events about ids that are not
 * an organization are acknowledged (200) and logged, so RevenueCat does
 * not retry them forever. Database errors return 500 so RevenueCat retries.
 * See lib/billingServer.js for how each event type maps to plus_until.
 */

import { safeEqual } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';
import { applyRevenueCatEvent } from '../../../lib/billingServer.js';

function authorized(req, secret) {
  const header = req?.headers?.authorization || req?.headers?.Authorization || '';
  if (typeof header !== 'string' || !header) return false;
  if (safeEqual(header, secret)) return true;
  // Also accept "Bearer <secret>" in case the dashboard value includes the scheme.
  const match = header.match(/^Bearer\s+(.+)$/i);
  return Boolean(match && safeEqual(match[1].trim(), secret));
}

export function createWebhookHandler({
  getAdmin = getSupabaseAdmin,
  getSecret = () => process.env.REVENUECAT_WEBHOOK_SECRET,
  log = console,
} = {}) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ success: false, error: 'method_not_allowed' });
    }
    const secret = getSecret();
    if (!secret) {
      log.error('[revenuecat] REVENUECAT_WEBHOOK_SECRET is not configured');
      return res.status(500).json({ success: false, error: 'server_misconfigured' });
    }
    if (!authorized(req, secret)) {
      return res.status(401).json({ success: false, error: 'unauthorized' });
    }

    let body = req.body;
    if (typeof body === 'string') {
      try {
        body = JSON.parse(body);
      } catch (_) {
        return res.status(400).json({ success: false, error: 'invalid_json' });
      }
    }
    const event = body?.event;
    if (!event || typeof event !== 'object') {
      return res.status(400).json({ success: false, error: 'missing_event' });
    }

    try {
      const result = await applyRevenueCatEvent(getAdmin(), event, { log });
      log.info?.('[revenuecat] event', { id: event.id, type: event.type, ...result });
      return res.status(200).json({ success: true, ...result });
    } catch (err) {
      log.error('[revenuecat] failed to apply event:', event?.id, event?.type, err?.message || err);
      return res.status(500).json({ success: false, error: 'apply_failed' });
    }
  };
}

export default createWebhookHandler();
