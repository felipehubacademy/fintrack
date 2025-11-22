import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { email, phone } = req.body;

    if (!email && !phone) {
      return res.status(400).json({ 
        error: 'Email ou telefone é obrigatório' 
      });
    }

    const checks = {};

    // Verificar duplicata de email
    if (email) {
      const { data: emailUser, error: emailError } = await supabase
        .from('users')
        .select('id, email, name, organization_id, role')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (emailError) throw emailError;

      checks.email = {
        exists: !!emailUser,
        user: emailUser
      };
    }

    // Verificar duplicata de telefone
    if (phone) {
      // Normalizar telefone (remover formatação)
      let normalizedPhone = phone.replace(/\D/g, '');
      
      // Se não começar com 55, adicionar
      if (!normalizedPhone.startsWith('55')) {
        normalizedPhone = '55' + normalizedPhone;
      }
      
      // Verificar com o número completo
      const { data: phoneUser, error: phoneError } = await supabase
        .from('users')
        .select('id, email, name, phone, organization_id, role')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (phoneError) throw phoneError;

      checks.phone = {
        exists: !!phoneUser,
        user: phoneUser
      };
    }

    // Verificar se existe organização com o mesmo email
    if (email) {
      const { data: orgEmail, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, email')
        .eq('email', email.toLowerCase().trim())
        .maybeSingle();

      if (orgError) throw orgError;

      checks.organizationEmail = {
        exists: !!orgEmail,
        organization: orgEmail
      };
    }

    return res.status(200).json({
      success: true,
      checks,
      hasDuplicates: Object.values(checks).some(check => check.exists)
    });

  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
    return res.status(500).json({
      success: false,
      error: 'Erro interno do servidor',
      message: error.message
    });
  }
}
