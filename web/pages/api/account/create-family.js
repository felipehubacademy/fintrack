/**
 * API: Create Family Account
 * Cria organização familiar + usuário admin + cost center padrão
 */

import { randomUUID } from 'crypto';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

function normalizePhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('55')) return digits;
  return `55${digits}`;
}

async function sendConfirmationEmail(email, redirectTo) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    console.warn('⚠️ [API] Variáveis do Supabase ausentes, não foi possível reenviar e-mail de confirmação');
    return;
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
        email,
        redirect_to: redirectTo
      })
    });

    if (!response.ok) {
      const body = await response.text();
      console.warn('⚠️ [API] Falha ao reenviar e-mail de confirmação:', response.status, body);
    }
  } catch (emailErr) {
    console.warn('⚠️ [API] Erro ao reenviar e-mail de confirmação:', emailErr);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const {
      organizationId,
      organizationName,
      adminEmail,
      adminName,
      adminPhone,
      password,
      inviteCode
    } = req.body ?? {};

    if (!organizationName || !adminEmail || !adminName || !password) {
      return res.status(400).json({
        error: 'organizationName, adminEmail, adminName e password são obrigatórios'
      });
    }

    const normalizedPhone = normalizePhone(adminPhone);
    const orgId = organizationId || randomUUID();
    const redirectTo = `${SITE_URL}/auth/email-confirmed`;

    const { data: createdUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: adminEmail,
      password,
      email_confirm: false,
      user_metadata: {
        name: adminName,
        phone: normalizedPhone
      }
    });

    if (createUserError) {
      console.error('❌ [API] Erro ao criar usuário no Auth:', createUserError);
      return res.status(400).json({
        success: false,
        error: 'Não foi possível criar o usuário',
        details: createUserError.message
      });
    }

    const adminId = createdUser?.user?.id;

    if (!adminId) {
      console.error('❌ [API] Usuário criado sem ID válido');
      return res.status(500).json({
        success: false,
        error: 'Usuário criado sem ID válido'
      });
    }

    try {
      const { data, error } = await supabaseAdmin.rpc('create_family_account', {
        p_org_id: orgId,
        p_org_name: organizationName,
        p_admin_id: adminId,
        p_admin_email: adminEmail,
        p_admin_name: adminName,
        p_admin_phone: normalizedPhone,
        p_invite_code: inviteCode ?? null
      });

      if (error) {
        console.error('❌ [API] Erro ao executar create_family_account:', error);
        await supabaseAdmin.auth.admin.deleteUser(adminId);
        return res.status(500).json({
          success: false,
          error: 'Erro ao criar organização familiar',
          details: error.message
        });
      }

      await sendConfirmationEmail(adminEmail, redirectTo);

      return res.status(200).json({
        success: true,
        result: data
      });
    } catch (rpcErr) {
      console.error('❌ [API] Erro inesperado na criação da conta familiar:', rpcErr);
      await supabaseAdmin.auth.admin.deleteUser(adminId);
      return res.status(500).json({
        success: false,
        error: 'Erro ao criar organização familiar',
        details: rpcErr.message
      });
    }
  } catch (err) {
    console.error('❌ [API] Erro inesperado ao criar conta familiar:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      details: err.message
    });
  }
}



