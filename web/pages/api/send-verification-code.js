import { createClient } from '@supabase/supabase-js';
import axios from 'axios';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

// Função para enviar WhatsApp com template
async function sendWhatsAppVerificationCode(to, code, userName) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  if (!phoneId || !token) {
    console.error('❌ Credenciais WhatsApp não configuradas');
    return false;
  }

  const normalizedTo = String(to || '').replace(/\D/g, '');

  // Template de Autenticação (verification_code)
  // Body com {{1}} = código + Botão URL com parâmetro
  const message = {
    messaging_product: 'whatsapp',
    to: normalizedTo,
    type: 'template',
    template: {
      name: 'verification_code',
      language: {
        code: 'pt_BR'
      },
      components: [
        {
          type: 'body',
          parameters: [
            {
              type: 'text',
              text: code // {{1}} no body = código de verificação
            }
          ]
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            {
              type: 'text',
              text: code // Parâmetro para o botão URL
            }
          ]
        }
      ]
    }
  };
  
  console.log('📤 Enviando código via WhatsApp:', code);
  console.log('📋 Template payload:', JSON.stringify(message, null, 2));

  try {
    const response = await axios.post(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      }
    );
    console.log(`✅ Template de verificação enviado para ${normalizedTo}:`, response.data);
    return true;
  } catch (error) {
    console.error(`❌ Erro ao enviar template:`, error.message);
    if (error.response) {
      console.error('📄 Detalhes do erro:', error.response.data);
    }
    return false;
  }
}

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
        const secondsLeft = Math.ceil(60 - (diffMinutes * 60));
        return res.status(429).json({ 
          error: `Por favor, aguarde ${secondsLeft} segundos antes de solicitar um novo código.`,
          retryAfter: secondsLeft
        });
      }
    }

    // Rate limiting: verificar tentativas por hora (10 tentativas)
    if (user.verification_attempts >= 10) {
      const lastAttempt = new Date(user.last_verification_attempt);
      const now = new Date();
      const diffHours = (now - lastAttempt) / 1000 / 60 / 60;

      if (diffHours < 1) {
        const secondsLeft = Math.ceil(3600 - (diffHours * 3600));
        const minutesLeft = Math.ceil(secondsLeft / 60);
        
        return res.status(429).json({ 
          error: minutesLeft > 60 
            ? 'Você atingiu o limite de tentativas. Tente novamente em 1 hora.' 
            : `Você atingiu o limite de tentativas. Tente novamente em ${minutesLeft} minutos.`,
          retryAfter: secondsLeft
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

    // Log para desenvolvimento
    console.log('📱 Código de verificação:', code);
    console.log('🔗 Token:', token);
    console.log('📞 Telefone:', userPhone);
    console.log('👤 Usuário:', user.name);

    // Enviar via WhatsApp Business API usando template
    const sent = await sendWhatsAppVerificationCode(userPhone, code, user.name);
    
    if (!sent) {
      console.warn('⚠️ Não foi possível enviar via WhatsApp, mas código foi gerado');
    }

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

