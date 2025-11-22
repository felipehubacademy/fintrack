import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: 'Token é obrigatório' });
    }

    // Buscar token válido
    const { data: verificationCode, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('token', token)
      .eq('type', 'whatsapp_code')
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (codeError || !verificationCode) {
      return res.status(400).json({ 
        error: 'Link inválido ou expirado',
        details: 'Este link pode ter expirado ou já foi usado. Solicite um novo código.'
      });
    }

    // Marcar token como usado
    const { error: updateCodeError } = await supabase
      .from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verificationCode.id);

    if (updateCodeError) {
      console.error('Erro ao atualizar token:', updateCodeError);
      return res.status(500).json({ error: 'Erro ao validar link' });
    }

    // Marcar telefone como verificado
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        verification_attempts: 0
      })
      .eq('id', verificationCode.user_id);

    if (updateUserError) {
      console.error('Erro ao atualizar usuário:', updateUserError);
      return res.status(500).json({ error: 'Erro ao verificar telefone' });
    }

    return res.status(200).json({ 
      success: true,
      message: 'Telefone verificado com sucesso!',
      userId: verificationCode.user_id
    });

  } catch (error) {
    console.error('Erro ao verificar token:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

