import dotenv from 'dotenv';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

/**
 * Webhook FinTrack V2 - Processamento Inteligente
 */
export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    // Webhook verification (Meta format)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    if (mode === 'subscribe' && token === 'fintrack_verify_token') {
      console.log('✅ Webhook verified (Meta format)');
      return res.status(200).send(challenge);
    } else if (req.query.challenge) {
      // Fallback for simple challenge
      console.log('✅ Webhook verified (simple format)');
      return res.status(200).send(req.query.challenge);
    } else {
      console.log('❌ Webhook verification failed');
      return res.status(403).send('Forbidden');
    }
  }

  if (req.method === 'POST') {
    // Webhook event handler
    const body = req.body;
    console.log('📩 Received webhook:', JSON.stringify(body, null, 2));
    
    // Process webhook
    processWebhook(body)
      .then(() => {
        console.log('✅ Webhook processed successfully');
        res.status(200).send('OK');
      })
      .catch(error => {
        console.error('❌ Error processing webhook:', error);
        res.status(200).send('OK'); // Still respond OK
      });
  } else {
    res.status(405).send('Method Not Allowed');
  }
}

/**
 * Process webhook messages
 */
async function processWebhook(body) {
  try {
    console.log('🔄 Processing webhook...');
    
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    // Process messages
    if (value?.messages) {
      for (const message of value.messages) {
        await processMessage(message);
      }
    }
    
    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 Status: ${status.status} for ${status.id}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error in processWebhook:', error);
    throw error;
  }
}

/**
 * Process individual message
 */
async function processMessage(message) {
  try {
    const from = message.from;
    const messageType = message.type;
    
    console.log(`📱 Message from ${from}: ${messageType}`);
    
    if (messageType === 'text') {
      const text = message.text.body;
      console.log(`💬 Text: "${text}"`);
      
      // Analyze message with OpenAI
      const analysis = await analyzeExpenseMessage(text);
      
      if (!analysis) {
        await sendWhatsAppMessage(from, 
          "❌ Não consegui entender sua mensagem. Tente: 'Gastei 50 no mercado no débito'"
        );
        return;
      }
      
      // Find user by phone
      const user = await getUserByPhone(from);
      
      if (!user) {
        await sendWhatsAppMessage(from, 
          "❌ Usuário não encontrado. Entre em contato com o administrador."
        );
        return;
      }
      
      // Check if information is complete
      if (analysis.precisa_confirmar) {
        await handleIncompleteInfo(user, analysis, from);
      } else {
        await handleCompleteInfo(user, analysis, from);
      }
    }
    
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
}

/**
 * Analyze expense message with OpenAI
 */
async function analyzeExpenseMessage(text) {
  try {
    const openaiKey = process.env.OPENAI_API_KEY;
    
    const prompt = `Analise a seguinte mensagem sobre uma despesa e extraia as informações disponíveis.

INFORMAÇÕES A EXTRAIR:
- valor: número em reais (ex: 50.00, 150.50)
- descricao: o que foi comprado/onde
- categoria: Alimentação, Transporte, Saúde, Lazer, Contas, Casa, Educação, Investimentos, Outros
- metodo_pagamento: credit_card, debit_card, pix, cash, other
- responsavel: nome da pessoa (Felipe, Letícia, etc.) ou "compartilhado"
- data: data da compra (hoje, ontem, ou data específica)
- confianca: nível de confiança (0.0 a 1.0)
- precisa_confirmar: true se alguma informação crucial estiver faltando

EXEMPLOS:
"Gastei 50 no mercado no débito" → {valor: 50, descricao: "mercado", categoria: "Alimentação", metodo_pagamento: "debit_card", responsavel: null, data: "hoje", confianca: 0.9, precisa_confirmar: true}

Retorne APENAS um JSON válido:`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' }
      },
      {
        headers: {
          'Authorization': `Bearer ${openaiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const result = JSON.parse(response.data.choices[0].message.content);
    console.log(`✅ Analysis:`, result);
    return result;
    
  } catch (error) {
    console.error('❌ Error analyzing message:', error.message);
    return null;
  }
}

/**
 * Get user by phone (V1 fallback)
 */
async function getUserByPhone(phone) {
  try {
    // Try V2 first
    const { data: v2User, error: v2Error } = await supabase
      .from('users')
      .select('*, organization:organizations(*)')
      .eq('phone', phone)
      .eq('is_active', true)
      .single();

    if (v2User && !v2Error) {
      return v2User;
    }

    // Fallback to V1 - create mock user
    console.log('📝 Using V1 fallback for user');
    return {
      id: 'v1_user',
      phone: phone,
      name: 'Usuário V1',
      organization_id: 'v1_org',
      organization: {
        id: 'v1_org',
        name: 'FinTrack V1'
      }
    };
    
  } catch (error) {
    console.error('❌ Error getting user:', error.message);
    return null;
  }
}

/**
 * Handle incomplete information
 */
async function handleIncompleteInfo(user, analysis, phone) {
  let message = `💰 R$ ${analysis.valor?.toFixed(2) || '?'} - ${analysis.descricao || '?'} (${analysis.categoria || '?'})`;
  
  const missingInfo = [];
  if (!analysis.metodo_pagamento) missingInfo.push('método de pagamento');
  if (!analysis.responsavel) missingInfo.push('responsável');

  if (missingInfo.length > 0) {
    message += `\n\nPreciso saber: ${missingInfo.join(' e ')}`;
    
    if (!analysis.metodo_pagamento) {
      message += `\n\nMétodo de pagamento: Débito, Crédito, PIX ou Dinheiro?`;
    } else if (!analysis.responsavel) {
      message += `\n\nResponsável: Felipe, Letícia ou Compartilhado?`;
    }
  }
  
  await sendWhatsAppMessage(phone, message);
}

/**
 * Handle complete information
 */
async function handleCompleteInfo(user, analysis, phone) {
  try {
    // For V1 fallback, just save to expenses table
    const expenseData = {
      amount: analysis.valor,
      description: analysis.descricao,
      category: analysis.categoria,
      payment_method: analysis.metodo_pagamento,
      date: parseDate(analysis.data).toISOString(),
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      whatsapp_message_id: `msg_${Date.now()}`
    };

    const { error } = await supabase
      .from('expenses')
      .insert(expenseData);

    if (error) throw error;

    // Send confirmation
    const confirmationMessage = `✅ Despesa registrada!\n\n` +
      `💰 R$ ${analysis.valor.toFixed(2)} - ${analysis.descricao}\n` +
      `📂 ${analysis.categoria}\n` +
      `💳 ${getPaymentMethodName(analysis.metodo_pagamento)}\n` +
      `📅 ${parseDate(analysis.data).toLocaleDateString('pt-BR')}`;

    await sendWhatsAppMessage(phone, confirmationMessage);
    
  } catch (error) {
    console.error('❌ Error saving expense:', error);
    await sendWhatsAppMessage(phone, 
      "❌ Erro ao salvar despesa. Tente novamente."
    );
  }
}

/**
 * Send WhatsApp message
 */
async function sendWhatsAppMessage(to, text) {
  const phoneId = process.env.PHONE_ID;
  const token = process.env.WHATSAPP_TOKEN;

  const message = {
    messaging_product: 'whatsapp',
    to: to,
    type: 'text',
    text: { body: text }
  };

  try {
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneId}/messages`,
      message,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );
    console.log(`✅ Message sent to ${to}`);
  } catch (error) {
    console.error(`❌ Error sending message:`, error.response?.data || error.message);
  }
}

/**
 * Parse date string
 */
function parseDate(dateStr) {
  const today = new Date();
  
  if (dateStr === 'hoje') return today;
  if (dateStr === 'ontem') {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday;
  }
  
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? today : parsed;
}

/**
 * Get payment method name
 */
function getPaymentMethodName(method) {
  const names = {
    'credit_card': 'Cartão de Crédito',
    'debit_card': 'Cartão de Débito',
    'pix': 'PIX',
    'cash': 'Dinheiro',
    'other': 'Outro'
  };
  return names[method] || method;
}