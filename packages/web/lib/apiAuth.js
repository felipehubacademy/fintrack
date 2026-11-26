/**
 * Server-side auth helpers for pages/api/**.
 *
 * - requireUser(req, res): validates `Authorization: Bearer <supabase access
 *   token>` with the admin client and resolves the caller's public `users`
 *   row. Routes must derive user/organization ids from the returned context,
 *   never from the request body.
 * - requireCronSecret(req, res): for cron endpoints (CRON_SECRET, compared in
 *   constant time).
 * - rateLimit(req, res, opts): best-effort in-memory per-IP limiter for the
 *   few public routes (per serverless instance, not global).
 *
 * Every helper takes an optional { admin } so tests can inject a mock client.
 */

import { createHash, timingSafeEqual } from 'crypto';
import { getSupabaseAdmin } from './supabaseAdmin.js';

const PROFILE_COLUMNS = 'id, organization_id, name, email, phone, role, is_active, created_at';

export function getBearerToken(req) {
  const header = req?.headers?.authorization || req?.headers?.Authorization;
  if (!header || typeof header !== 'string') return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match ? match[1].trim() : '';
  return token || null;
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

/**
 * Find the public `users` row for an auth user. Order: same id; then the
 * confirmed email; then the confirmed phone (WhatsApp/SMS OTP sign-in).
 */
export async function resolveProfile(admin, authUser) {
  if (!authUser?.id) return null;

  const byId = await admin.from('users').select(PROFILE_COLUMNS).eq('id', authUser.id).limit(1);
  if (byId.error) throw byId.error;
  if (byId.data?.[0]) return byId.data[0];

  if (authUser.email && authUser.email_confirmed_at) {
    const byEmail = await admin
      .from('users')
      .select(PROFILE_COLUMNS)
      // Case-insensitive exact match (escape LIKE wildcards such as "_").
      .ilike('email', String(authUser.email).trim().replace(/[\\%_]/g, '\\$&'))
      .limit(1);
    if (byEmail.error) throw byEmail.error;
    if (byEmail.data?.[0]) return byEmail.data[0];
  }

  const phone = digitsOnly(authUser.phone);
  if (phone && authUser.phone_confirmed_at) {
    const byPhone = await admin
      .from('users')
      .select(PROFILE_COLUMNS)
      .eq('phone', phone)
      .order('created_at', { ascending: true })
      .limit(1);
    if (byPhone.error) throw byPhone.error;
    if (byPhone.data?.[0]) return byPhone.data[0];
  }

  return null;
}

/**
 * Validate the bearer token. Returns the auth context, or null when the
 * request is anonymous or the token is invalid. Never sends a response.
 */
export async function getUserFromRequest(req, { admin } = {}) {
  const token = getBearerToken(req);
  if (!token) return null;
  const client = admin || getSupabaseAdmin();
  const { data, error } = await client.auth.getUser(token);
  const authUser = data?.user;
  if (error || !authUser) return null;

  const profile = await resolveProfile(client, authUser);
  return {
    token,
    authUser,
    authUserId: authUser.id,
    profile,
    userId: profile?.id || null,
    organizationId: profile?.organization_id || null,
    role: profile?.role || null,
  };
}

/**
 * Require an authenticated caller. On failure sends 401 (bad/missing token)
 * or 403 (no profile, when requireProfile is true) and returns null.
 */
export async function requireUser(req, res, { admin, requireProfile = true } = {}) {
  let ctx;
  try {
    ctx = await getUserFromRequest(req, { admin });
  } catch (err) {
    console.error('[apiAuth] auth lookup failed:', err?.message || err);
    res.status(500).json({ success: false, error: 'auth_lookup_failed' });
    return null;
  }
  if (!ctx) {
    res.setHeader?.('WWW-Authenticate', 'Bearer');
    res.status(401).json({ success: false, error: 'unauthorized' });
    return null;
  }
  if (requireProfile && !ctx.profile) {
    res.status(403).json({ success: false, error: 'profile_not_found' });
    return null;
  }
  return ctx;
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest();
}

/** Constant-time string comparison (hashing first hides length differences). */
export function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  return timingSafeEqual(sha256(a), sha256(b));
}

/**
 * Require the cron secret as `Authorization: Bearer <CRON_SECRET>` (or the
 * `x-cron-secret` header). Sends 500 if the secret is not configured and 401
 * on mismatch; returns true when the caller may proceed.
 */
export function requireCronSecret(req, res, { secret = process.env.CRON_SECRET } = {}) {
  if (!secret) {
    console.error('[apiAuth] CRON_SECRET is not configured');
    res.status(500).json({ success: false, error: 'server_misconfigured' });
    return false;
  }
  const provided = getBearerToken(req) || req?.headers?.['x-cron-secret'] || '';
  if (!safeEqual(String(provided), secret)) {
    res.status(401).json({ success: false, error: 'unauthorized' });
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Rate limiting (best effort, per instance)
// ---------------------------------------------------------------------------

const buckets = new Map();

export function getClientIp(req) {
  const forwarded = req?.headers?.['x-forwarded-for'];
  if (forwarded) return String(forwarded).split(',')[0].trim();
  return req?.headers?.['x-real-ip'] || req?.socket?.remoteAddress || 'unknown';
}

/**
 * Fixed-window limiter. Returns true when allowed; otherwise sends 429.
 */
export function rateLimit(req, res, { key = 'default', limit = 10, windowMs = 60_000, now = Date.now() } = {}) {
  const id = `${key}:${getClientIp(req)}`;
  let bucket = buckets.get(id);
  if (!bucket || now >= bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(id, bucket);
  }
  bucket.count += 1;

  if (buckets.size > 5000) {
    for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
  }

  if (bucket.count > limit) {
    res.setHeader?.('Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))));
    res.status(429).json({ success: false, error: 'too_many_requests' });
    return false;
  }
  return true;
}

export function resetRateLimits() {
  buckets.clear();
}

// ---------------------------------------------------------------------------
// Small input validators shared by public routes
// ---------------------------------------------------------------------------

export function isValidEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

/** E.164-ish: 8 to 15 digits once formatting is removed. */
export function isValidPhone(phone) {
  const digits = digitsOnly(phone);
  return digits.length >= 8 && digits.length <= 15;
}

export function isShortText(value, max = 200) {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}
