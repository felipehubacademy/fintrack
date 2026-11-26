/**
 * POST /api/account/resend-confirmation
 * Public (the user cannot sign in before confirming). Rate limited and
 * always answers the same way, so it cannot be used to probe which emails
 * have accounts. Supabase ignores unknown or already-confirmed emails.
 */

import { rateLimit, isValidEmail } from '../../../lib/apiAuth.js';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }
  if (!rateLimit(req, res, { key: 'resend-confirmation', limit: 3, windowMs: 10 * 60_000 })) return;

  const { email } = req.body ?? {};
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'email é obrigatório' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ error: 'Configuração do Supabase ausente' });
  }

  try {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/resend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({
        type: 'signup',
        email: email.trim(),
        redirect_to: `${SITE_URL}/auth/email-confirmed`
      })
    });
    if (!response.ok) {
      console.warn('[resend-confirmation] Supabase answered', response.status);
    }
  } catch (err) {
    console.error('[resend-confirmation] failed:', err?.message || err);
  }
  return res.status(200).json({ success: true });
}
