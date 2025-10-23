import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  // Headers para evitar cache e permitir CORS
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  console.log('🔍 [send-verification-code] Method:', req.method);
  console.log('🔍 [send-verification-code] Headers:', req.headers);
  
  // Permitir preflight requests (CORS)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method !== 'POST') {
    console.log('❌ [send-verification-code] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { userId, userPhone } = req.body;
    console.log('🔍 [send-verification-code] Body:', { userId, userPhone });

    if (!userId || !userPhone) {
      return res.status(400).json({ error: 'userId e userPhone são obrigatórios' });
    }

    // Buscar usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Verificar se já está verificado
    if (user.phone_verified) {
      return res.status(400).json({ error: 'Telefone já verificado' });
    }

    // Rate limiting: verificar última tentativa
    if (user.last_verification_attempt) {
      const lastAttempt = new Date(user.last_verification_attempt);
      const now = new Date();
      const diffMinutes = (now - lastAttempt) / 1000 / 60;

      if (diffMinutes < 1) {
        return res.status(429).json({ 
          error: 'Aguarde 1 minuto antes de solicitar novo código',
          retryAfter: Math.ceil(60 - (diffMinutes * 60))
        });
      }
    }

    // Rate limiting: verificar tentativas por hora
    if (user.verification_attempts >= 3) {
      const lastAttempt = new Date(user.last_verification_attempt);
      const now = new Date();
      const diffHours = (now - lastAttempt) / 1000 / 60 / 60;

      if (diffHours < 1) {
        return res.status(429).json({ 
          error: 'Limite de tentativas excedido. Tente novamente em 1 hora.',
          retryAfter: Math.ceil(3600 - (diffHours * 3600))
        });
      } else {
        // Resetar contador após 1 hora
        await supabase
          .from('users')
          .update({ verification_attempts: 0 })
          .eq('id', userId);
      }
    }

    // Gerar código de 6 dígitos
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Gerar token para link alternativo
    const token = require('crypto').randomBytes(32).toString('hex');

    // Salvar código no banco
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutos

    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        user_id: userId,
        code: code,
        type: 'whatsapp_code',
        token: token,
        expires_at: expiresAt.toISOString(),
        ip_address: req.headers['x-forwarded-for'] || req.socket.remoteAddress,
        user_agent: req.headers['user-agent']
      });

    if (codeError) {
      console.error('Erro ao salvar código:', codeError);
      return res.status(500).json({ error: 'Erro ao gerar código de verificação' });
    }

    // Atualizar tentativas do usuário
    await supabase
      .from('users')
      .update({
        verification_attempts: (user.verification_attempts || 0) + 1,
        last_verification_attempt: new Date().toISOString()
      })
      .eq('id', userId);

    // TODO: Enviar código via WhatsApp Business API
    // Aqui você deve integrar com seu serviço de WhatsApp
    const message = `🔐 *MeuAzulão - Verificação*

Olá ${user.name}! 👋

Para começar a usar o MeuAzulão, confirme seu WhatsApp:

*Código:* \`${code}\`

ou

Clique aqui: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://meuazulao.com.br'}/verify?token=${token}

_Este código expira em 10 minutos._

---
💡 *Dica:* Após verificar, você poderá conversar com o Zul direto por aqui!`;

    // Log para desenvolvimento (remover em produção)
    console.log('📱 Código de verificação:', code);
    console.log('🔗 Token:', token);
    console.log('📞 Telefone:', userPhone);
    console.log('💬 Mensagem:', message);

    // Simular envio bem-sucedido (substituir por chamada real à API WhatsApp)
    // await sendWhatsAppMessage(userPhone, message);

    return res.status(200).json({ 
      success: true,
      message: 'Código de verificação enviado',
      // Em desenvolvimento, retornar o código (remover em produção)
      ...(process.env.NODE_ENV === 'development' && { code, token })
    });

  } catch (error) {
    console.error('Erro ao enviar código:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

