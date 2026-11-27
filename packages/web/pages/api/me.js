/**
 * GET /api/me  (Authorization: Bearer <token>)
 * Who am I: the caller's users row ids, resolved server-side (by auth id,
 * confirmed email or confirmed WhatsApp/SMS phone). Used by the login page
 * to route after a WhatsApp-code sign-in, where the session has no email.
 */

import { requireUser } from '../../lib/apiAuth.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }
  res.setHeader('Cache-Control', 'no-store');

  const ctx = await requireUser(req, res, { requireProfile: false });
  if (!ctx) return;

  return res.status(200).json({
    success: true,
    hasProfile: !!ctx.profile,
    userId: ctx.userId,
    organizationId: ctx.organizationId,
  });
}
