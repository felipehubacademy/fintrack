/**
 * POST /api/auth/check-duplicates
 * Public (used during sign-up). Says whether an email/phone is already taken,
 * without leaking other people's data: anonymous callers only get back what
 * they sent plus a first name. Full organization ids are returned only to an
 * authenticated caller and only for members of the caller's own organization.
 */

import { getUserFromRequest, rateLimit, isValidEmail, isValidPhone } from '../../../lib/apiAuth.js';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin.js';

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  // Legacy behaviour: numbers without a country code are Brazilian.
  return digits.startsWith('55') || digits.length > 11 ? digits : `55${digits}`;
}

function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || null;
}

function publicView(row, echo, caller) {
  if (!row) return null;
  const sameOrg = !!caller?.organizationId && row.organization_id === caller.organizationId;
  return {
    name: firstName(row.name),
    ...echo,
    // Truthy/falsy is all anonymous callers need ("linked to an organization").
    organization_id: sameOrg ? row.organization_id : (row.organization_id ? 'other' : null),
    ...(sameOrg ? { id: row.id, role: row.role } : {}),
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  if (!rateLimit(req, res, { key: 'check-duplicates', limit: 30, windowMs: 60_000 })) return;

  const { email, phone } = req.body || {};
  if (!email && !phone) {
    return res.status(400).json({ error: 'Email ou telefone é obrigatório' });
  }
  if (email && !isValidEmail(email)) {
    return res.status(400).json({ error: 'invalid_email' });
  }
  if (phone && !isValidPhone(phone)) {
    return res.status(400).json({ error: 'invalid_phone' });
  }

  try {
    const supabase = getSupabaseAdmin();
    const caller = await getUserFromRequest(req).catch(() => null);
    const checks = {};

    if (email) {
      const normalizedEmail = email.toLowerCase().trim();
      const { data: emailUser, error } = await supabase
        .from('users')
        .select('id, name, organization_id, role')
        .eq('email', normalizedEmail)
        .limit(1);
      if (error) throw error;
      checks.email = {
        exists: !!emailUser?.[0],
        user: publicView(emailUser?.[0], { email: normalizedEmail }, caller),
      };

      const { data: orgEmail, error: orgError } = await supabase
        .from('organizations')
        .select('id, name')
        .eq('email', normalizedEmail)
        .limit(1);
      if (orgError) throw orgError;
      checks.organizationEmail = {
        exists: !!orgEmail?.[0],
        organization: orgEmail?.[0] ? { name: orgEmail[0].name } : null,
      };
    }

    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      const { data: phoneUser, error } = await supabase
        .from('users')
        .select('id, name, organization_id, role')
        .eq('phone', normalizedPhone)
        .limit(1);
      if (error) throw error;
      checks.phone = {
        exists: !!phoneUser?.[0],
        user: publicView(phoneUser?.[0], { phone: normalizedPhone }, caller),
      };
    }

    return res.status(200).json({
      success: true,
      checks,
      hasDuplicates: Object.values(checks).some((check) => check.exists),
    });
  } catch (error) {
    console.error('[check-duplicates] failed:', error?.message || error);
    return res.status(500).json({ success: false, error: 'internal_error' });
  }
}
