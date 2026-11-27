/**
 * Daily trial funnel (route /api/cron/trial-funnel), see zul/funnel.js and
 * docs/launch/BILLING.md "Job diário".
 *
 * Auth: `Authorization: Bearer <CRON_SECRET>` or `x-cron-secret: <CRON_SECRET>`
 * (same as the web cron endpoints; Vercel Cron sends the Bearer form itself).
 * Dry run (logs and returns what would be sent, marks nothing):
 * WEBHOOK_DRY_RUN=1 or ?dry_run=1.
 */
import { createHash, timingSafeEqual } from 'node:crypto';
import { getQuery, send } from '../../zul/security.js';
import { createWhatsApp } from '../../zul/whatsapp.js';
import { createFunnelStore, runTrialFunnel, BillingMigrationPending } from '../../zul/funnel.js';

const sha256 = (v) => createHash('sha256').update(String(v)).digest();

export function cronAuthorized(headers = {}, secret = process.env.CRON_SECRET) {
  if (!secret) return { ok: false, status: 500, error: 'server_misconfigured' };
  const auth = String(headers.authorization || headers.Authorization || '');
  const bearer = auth.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const provided = bearer || String(headers['x-cron-secret'] || '');
  if (!provided || !timingSafeEqual(sha256(provided), sha256(secret))) return { ok: false, status: 401, error: 'unauthorized' };
  return { ok: true };
}

export function isDryRun(query = {}, env = process.env) {
  if (env.WEBHOOK_DRY_RUN === '1' || env.WEBHOOK_DRY_RUN === 'true') return true;
  const q = String(query.dry_run ?? query.dryRun ?? query['dry-run'] ?? '').toLowerCase();
  return q === '1' || q === 'true' || q === 'yes';
}

export function createHandler(deps = {}) {
  return async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') return send(res, 405, { error: 'method_not_allowed' }, 'application/json');
    const auth = cronAuthorized(req.headers || {});
    if (!auth.ok) {
      if (auth.status === 500) console.error('[trial-funnel] CRON_SECRET is not configured');
      return send(res, auth.status, { error: auth.error }, 'application/json');
    }

    const dryRun = isDryRun(getQuery(req));
    const now = deps.now ? deps.now() : new Date();
    try {
      const result = await runTrialFunnel({
        store: deps.store || createFunnelStore(),
        wa: deps.wa || createWhatsApp(),
        now,
        dryRun,
        deadline: Date.now() + (deps.budgetMs ?? 50_000), // stay under the function's maxDuration
      });
      console.log(`[trial-funnel] ${dryRun ? 'dry run: ' : ''}candidates=${result.candidates} sent=${result.sent.length} planned=${result.planned.length} failed=${result.failed.length} done=${result.done}`);
      return send(res, 200, { ok: true, ...result }, 'application/json');
    } catch (err) {
      if (err instanceof BillingMigrationPending) {
        console.warn('[trial-funnel]', err.message);
        return send(res, 200, { ok: true, skipped: err.code }, 'application/json');
      }
      console.error('[trial-funnel] failed:', err);
      return send(res, 500, { ok: false, error: 'funnel_failed' }, 'application/json');
    }
  };
}

export default createHandler();
