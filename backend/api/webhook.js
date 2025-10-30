/**
 * Webhook FinTrack V2 (backend/api) - VERSION B2 (CONSOLIDATED)
 * Consolidado para usar apenas ZulAssistant
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Buscar usuário por telefone
 */
async function getUserByPhone(phone) {
  try {
    const normalized = String(phone || '').replace(/\D/g, '');
    
    const { data: user, error } = await supabase
      .from('users')
      .select('*')
      .ilike('phone', `%${normalized}%`)
      .eq('is_active', true)
      .maybeSingle();

    if (error || !user) return null;
    
    const { data: organization } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.organization_id)
      .single();

    const { data: costCenters } = await supabase
      .from('cost_centers')
      .select('*')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true);

    return {
      ...user,
      organization,
      cost_centers: costCenters || []
    };
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    return null;
  }
}

<<<<<<< HEAD
=======


>>>>>>> a40cb5ee21be9d4d05373ccaa03e1d03d68f504c
/**
 * Enviar mensagem WhatsApp
 */
async function sendWhatsAppMessage(to, message) {
  try {
    const axios = (await import('axios')).default;
    const phoneNumberId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;
    
    await axios.post(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: { body: message }
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('✅ Mensagem WhatsApp enviada para', to);
  } catch (error) {
    console.error('❌ Erro ao enviar WhatsApp:', error);
  }
}

// Process webhook synchronously com logs detalhados
async function processWebhook(body) {
  console.log('🔄 [B1][DEBUG] Starting processWebhook...');
  try {
    const entry = body.entry?.[0];
    console.log('🔄 [B1][DEBUG] Entry:', entry ? 'found' : 'not found');

    const change = entry?.changes?.[0];
    console.log('🔄 [B1][DEBUG] Change:', change ? 'found' : 'not found');

    const value = change?.value;
    console.log('🔄 [B1][DEBUG] Value:', value ? 'found' : 'not found');

    // Process messages
    if (value?.messages) {
      console.log('🔄 [B1][DEBUG] Messages found:', value.messages.length);
      for (const message of value.messages) {
        console.log('🔄 [B1][DEBUG] Message type:', message.type);
        
        if (message.type === 'text') {
          console.log(`📱 [B1] Processing message from ${message.from}: "${message.text.body}"`);

          try {
            // Fast path para testes: evitar processamento pesado em payloads de teste
            if (message.id?.includes('test_') || process.env.WEBHOOK_DRY_RUN === '1') {
              console.log('🧪 [B2][DEBUG] Dry-run/test payload detected. Skipping ZulAssistant.');
              continue;
            }

            console.log('🔄 [B2][DEBUG] Importing ZulAssistant...');
            // Import dinâmico do ZulAssistant (consolidado)
            const { default: ZulAssistant } = await import('../services/zulAssistant.js');
            console.log('🔄 [B2][DEBUG] ZulAssistant imported successfully');

            console.log('🔄 [B2][DEBUG] Creating ZulAssistant instance...');
            const zul = new ZulAssistant();
            console.log('🔄 [B2][DEBUG] ZulAssistant instance created');

            // Buscar usuário por telefone
            console.log('🔄 [B2][DEBUG] Looking up user by phone...');
            const user = await getUserByPhone(message.from);

            // Importar a nova função de persistência
            const { saveExpense } = await import('../services/supabase.js');
            
            if (!user) {
              console.log('❌ [B2][DEBUG] User not found for phone:', message.from);
              // Enviar mensagem de erro via WhatsApp
              await sendWhatsAppMessage(message.from, 
                'Opa! Não consegui te identificar aqui. 🤔\n\nVocê já fez parte de uma organização no MeuAzulão? Se sim, verifica se teu número está cadastrado direitinho!'
              );
              continue;
            }
            
            console.log('✅ [B2][DEBUG] User found:', user.name);

            console.log('🔄 [B2][DEBUG] Calling ZulAssistant processMessage...');
            console.log('🔄 [B2][DEBUG] User organization_id:', user.organization_id);
            
            // Buscar cartões disponíveis
            const { data: cards } = await supabase
              .from('cards')
              .select('name')
              .eq('organization_id', user.organization_id)
              .eq('is_active', true);
            
            console.log('🔄 [B2][DEBUG] Found cards:', cards?.map(c => c.name));
            
            // Importar função de persistência refatorada
            // Nota: A lógica completa de saveExpense está em zulAssistant.js (context.saveExpense)
            // Aqui apenas garantimos que o contexto tem os dados necessários
            const context = {
              userName: user.name,
              userId: user.id,
              organizationId: user.organization_id,
              availableCards: cards?.map(c => c.name) || []
            };
            
            // Adicionar a função saveExpense ao contexto
            const contextWithFunctions = {
              ...context,
              saveExpense: saveExpense // Injeta a função de persistência refatorada
            };

            console.log('🔄 [B2][DEBUG] Context montado:', JSON.stringify(contextWithFunctions, null, 2));
            
            const result = await zul.processMessage(
              message.text.body,
              user.id,
              user.name,
              message.from,
              contextWithFunctions
            );
            
            // Enviar resposta via WhatsApp
            if (result && result.message) {
              await sendWhatsAppMessage(message.from, result.message);
            }
            
            console.log('🔄 [B2][DEBUG] ProcessMessage completed');

            console.log('💬 [B1] Message processed successfully');
          } catch (zulError) {
            console.error('❌ [B2][DEBUG] Error in ZulAssistant:', zulError);
            console.error('❌ [B2][DEBUG] Error stack:', zulError?.stack);
            
            // Enviar mensagem de erro ao usuário
            try {
              await sendWhatsAppMessage(message.from, 
                'Ops! Tive um problema aqui. 😅\n\nTenta de novo? Se continuar, melhor falar com o suporte!'
              );
            } catch (sendError) {
              console.error('❌ Erro ao enviar mensagem de erro:', sendError);
            }
          }
        }
      }
    } else {
      console.log('🔄 [B1][DEBUG] No messages found in value');
    }

    // Process status updates
    if (value?.statuses) {
      for (const status of value.statuses) {
        console.log(`📊 [B1] Message status: ${status.status} for ${status.id}`);
      }
    }

  } catch (error) {
    console.error('❌ [B1] Error processing webhook:', error);
    console.error('❌ [B1] Error stack:', error?.stack);
  }
  console.log('🔄 [B1][DEBUG] processWebhook completed');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === 'fintrack_verify_token') {
      return res.status(200).send(challenge);
    }
    if (challenge) {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  if (req.method === 'POST') {
    console.log('🚀 [B2][WEBHOOK] POST received - VERSION B2 (CONSOLIDATED ZulAssistant)');
    try {
      console.log('📩 [B2] Received webhook');
      await processWebhook(req.body);
      console.log('✅ [B2] Processing completed');
      return res.status(200).send('OK');
    } catch (error) {
      console.error('❌ [B1] Webhook error:', error);
      console.error('❌ [B1] Error stack:', error?.stack);
      return res.status(500).send('Error');
    }
  }

  return res.status(405).send('Method Not Allowed');
}


