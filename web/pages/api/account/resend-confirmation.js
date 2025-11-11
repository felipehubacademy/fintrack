import { supabaseAdmin } from '../../../lib/supabaseAdmin';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { email } = req.body ?? {};

    if (!email) {
      return res.status(400).json({ error: 'email é obrigatório' });
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return res.status(500).json({
        error: 'Configuração do Supabase ausente'
      });
    }

    const { data: userList, error: listError } = await supabaseAdmin.auth.admin.listUsers({
      page: 1,
      perPage: 1,
      email
    });

    if (listError) {
      throw listError;
    }

    const user = userList?.users?.[0];

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

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
        redirect_to: `${SITE_URL}/auth/email-confirmed`
      })
    });

    if (!response.ok) {
      const body = await response.text();
      return res.status(500).json({
        error: 'Falha ao reenviar e-mail de confirmação',
        details: body
      });
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('❌ [API] Erro ao reenviar confirmação:', err);
    return res.status(500).json({
      success: false,
      error: 'Erro interno ao reenviar confirmação',
      details: err.message
    });
  }
}


