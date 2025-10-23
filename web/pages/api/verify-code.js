import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Função para enviar mensagem de boas-vindas via WhatsApp
async function sendWelcomeMessage(phone, userName) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;
  const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${phoneId}/messages`;

  const firstName = userName?.split(' ')[0] || 'amigo(a)';

  const payload = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: 'welcome_verified', // Template: "Oi {{1}}, aqui é o Zul! 👋..."
      language: {
        code: 'pt_BR'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: firstName // Ex: "Felipe", "Maria"
            }
          ]
        }
      ]
    }
  };

  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(error)}`);
  }

  return await response.json();
}

export default async function handler(req, res) {
  // Headers para evitar cache e permitir CORS
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Permitir preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, code } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ error: 'userId e code são obrigatórios' });
    }

    // Buscar código válido
    const { data: verificationCode, error: codeError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('user_id', userId)
      .eq('code', code)
      .is('used_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !verificationCode) {
      return res.status(400).json({ 
        error: 'Código inválido ou expirado',
        details: 'Verifique se digitou corretamente ou solicite um novo código'
      });
    }

    // Marcar código como usado
    const { error: updateCodeError } = await supabase
      .from('verification_codes')
      .update({ used_at: new Date().toISOString() })
      .eq('id', verificationCode.id);

    if (updateCodeError) {
      console.error('Erro ao atualizar código:', updateCodeError);
      return res.status(500).json({ error: 'Erro ao validar código' });
    }

    // Buscar dados do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('name, phone')
      .eq('id', userId)
      .single();

    if (userError) {
      console.error('Erro ao buscar usuário:', userError);
      return res.status(500).json({ error: 'Erro ao buscar dados do usuário' });
    }

    // Marcar telefone como verificado
    const { error: updateUserError } = await supabase
      .from('users')
      .update({
        phone_verified: true,
        phone_verified_at: new Date().toISOString(),
        verification_attempts: 0 // Resetar contador
      })
      .eq('id', userId);

    if (updateUserError) {
      console.error('Erro ao atualizar usuário:', updateUserError);
      return res.status(500).json({ error: 'Erro ao verificar telefone' });
    }

    // Enviar mensagem de boas-vindas via WhatsApp
    try {
      await sendWelcomeMessage(user.phone, user.name);
    } catch (welcomeError) {
      // Não falhar a verificação se a mensagem de boas-vindas falhar
      console.error('Erro ao enviar mensagem de boas-vindas:', welcomeError);
    }

    return res.status(200).json({ 
      success: true,
      message: 'Telefone verificado com sucesso!'
    });

  } catch (error) {
    console.error('Erro ao verificar código:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

