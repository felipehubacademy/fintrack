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

// Configuração do debounce de mensagens
const MESSAGE_DEBOUNCE_MS = 3000; // 3 segundos
const MAX_BUFFERED_MESSAGES = 5;  // Máximo de mensagens para agrupar

// Map para armazenar timers ativos por usuário (em memória)
const activeTimers = new Map();

/**
 * Adicionar mensagem ao buffer e retornar se deve processar agora
 */
async function addToMessageBuffer(userPhone, messageText, messageType = 'text') {
  try {
    const normalized = String(userPhone || '').replace(/\D/g, '');
    
    // Buscar buffer atual
    const { data: current } = await supabase
      .from('conversation_state')
      .select('temp_data, state')
      .eq('user_phone', normalized)
      .maybeSingle();
    
    const buffer = current?.temp_data?.message_buffer || [];
    const lastUpdate = current?.temp_data?.last_buffer_update || null;
    
    // Adicionar nova mensagem ao buffer
    buffer.push({
      text: messageText,
      type: messageType,
      timestamp: new Date().toISOString()
    });
    
    // Limitar a MAX_BUFFERED_MESSAGES
    const limitedBuffer = buffer.slice(-MAX_BUFFERED_MESSAGES);
    
    // Atualizar no banco
    await supabase
      .from('conversation_state')
      .upsert({
        user_phone: normalized,
        state: current?.state || 'buffering',
        temp_data: {
          ...current?.temp_data,
          message_buffer: limitedBuffer,
          last_buffer_update: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_phone'
      });
    
    console.log(`📦 [BUFFER] Mensagem adicionada ao buffer de ${normalized}. Total: ${limitedBuffer.length} msgs`);
    
    return {
      shouldProcess: false, // Ainda não processar, aguardar debounce
      bufferSize: limitedBuffer.length
    };
  } catch (error) {
    console.error('❌ Erro ao adicionar mensagem ao buffer:', error);
    return {
      shouldProcess: true, // Em caso de erro, processar imediatamente
      bufferSize: 1
    };
  }
}

/**
 * Obter e limpar buffer de mensagens
 */
async function getAndClearMessageBuffer(userPhone) {
  try {
    const normalized = String(userPhone || '').replace(/\D/g, '');
    
    // Buscar buffer atual
    const { data: current } = await supabase
      .from('conversation_state')
      .select('temp_data')
      .eq('user_phone', normalized)
      .maybeSingle();
    
    const buffer = current?.temp_data?.message_buffer || [];
    
    if (buffer.length === 0) {
      return null;
    }
    
    // Limpar buffer
    await supabase
      .from('conversation_state')
      .update({
        temp_data: {
          ...current?.temp_data,
          message_buffer: [],
          last_buffer_update: null
        },
        updated_at: new Date().toISOString()
      })
      .eq('user_phone', normalized);
    
    console.log(`📦 [BUFFER] Buffer de ${normalized} limpado. ${buffer.length} msgs recuperadas`);
    
    // Concatenar mensagens
    const concatenated = buffer
      .map(msg => msg.text)
      .join('\n');
    
    return {
      concatenatedText: concatenated,
      messageCount: buffer.length,
      messages: buffer
    };
  } catch (error) {
    console.error('❌ Erro ao obter buffer:', error);
    return null;
  }
}

/**
 * Processar buffer de mensagens após debounce
 */
async function processBufferedMessages(userPhone) {
  try {
    console.log(`⏰ [DEBOUNCE] Timer expirado para ${userPhone}. Processando buffer...`);
    
    // Remover timer ativo
    activeTimers.delete(userPhone);
    
    // Obter mensagens do buffer
    const buffer = await getAndClearMessageBuffer(userPhone);
    
    if (!buffer || buffer.messageCount === 0) {
      console.log(`⚠️ [DEBOUNCE] Buffer vazio para ${userPhone}, nada a processar`);
      return;
    }
    
    console.log(`📨 [DEBOUNCE] Processando ${buffer.messageCount} mensagens concatenadas`);
    
    // Processar com ZulAssistant
    const { default: ZulAssistant } = await import('../services/zulAssistant.js');
    const zul = new ZulAssistant();
    
    const user = await getUserByPhone(userPhone);
    
    if (!user) {
      console.log('❌ [DEBOUNCE] Usuário não encontrado');
      await sendWhatsAppMessage(userPhone, 
        'Opa! Não consegui te identificar aqui. 🤔\n\nVocê já fez parte de uma organização no MeuAzulão? Se sim, verifica se teu número está cadastrado direitinho!'
      );
      return;
    }
    
    // Buscar cartões
    const { data: cards } = await supabase
      .from('cards')
      .select('name')
      .eq('organization_id', user.organization_id)
      .eq('is_active', true);
    
    const orgType = user.organization?.type || 'family';
    const organizationName = user.organization?.name || 'Família';
    
    const context = {
      userName: user.name,
      userId: user.id,
      organizationId: user.organization_id,
      organizationType: orgType,
      organizationName: organizationName,
      isSoloUser: orgType === 'solo',
      availableCards: cards?.map(c => c.name) || []
    };
    
    // Processar mensagem concatenada
    const result = await zul.processMessage(
      buffer.concatenatedText,
      user.id,
      user.name,
      userPhone,
      context
    );
    
    // Enviar resposta
    if (result && result.message) {
      await sendWhatsAppMessage(userPhone, result.message);
    }
    
    console.log('✅ [DEBOUNCE] Buffer processado com sucesso');
  } catch (error) {
    console.error('❌ [DEBOUNCE] Erro ao processar buffer:', error);
    
    try {
      await sendWhatsAppMessage(userPhone, 
        'Ops! Tive um problema aqui. 😅\n\nTenta de novo? Se continuar, melhor falar com o suporte!'
      );
    } catch (sendError) {
      console.error('❌ Erro ao enviar mensagem de erro:', sendError);
    }
  }
}

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

/**
 * Obter URL de download da mídia do WhatsApp
 */
async function getMediaUrl(mediaId) {
  try {
    const axios = (await import('axios')).default;
    const token = process.env.WHATSAPP_TOKEN;
    
    console.log('🎤 [AUDIO] Obtendo URL de download para media_id:', mediaId);
    
    const response = await axios.get(
      `${WHATSAPP_API_URL}/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const mediaUrl = response.data?.url;
    if (!mediaUrl) {
      throw new Error('URL de mídia não encontrada na resposta');
    }
    
    console.log('✅ [AUDIO] URL de download obtida:', mediaUrl);
    return mediaUrl;
  } catch (error) {
    console.error('❌ [AUDIO] Erro ao obter URL de mídia:', error.message);
    throw error;
  }
}

/**
 * Função helper para escolher mensagem de erro variada
 */
function pickVariation(variations, seed = null) {
  if (!variations || variations.length === 0) return '';
  if (variations.length === 1) return variations[0];
  
  // Usar timestamp + seed para criar um índice mais variado
  const timestamp = Date.now();
  const seedValue = seed ? String(seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
  const random = ((timestamp % 1000) + seedValue) % variations.length;
  
  return variations[random];
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
          console.log(`📱 [B1] Message from ${message.from}: "${message.text.body}"`);

          try {
            // Fast path para testes
            if (message.id?.includes('test_') || process.env.WEBHOOK_DRY_RUN === '1') {
              console.log('🧪 [B2][DEBUG] Dry-run/test payload detected. Skipping.');
              continue;
            }

            // Verificar usuário primeiro
            const user = await getUserByPhone(message.from);
            if (!user) {
              console.log('❌ User not found for phone:', message.from);
              await sendWhatsAppMessage(message.from, 
                'Opa! Não consegui te identificar aqui. 🤔\n\nVocê já fez parte de uma organização no MeuAzulão? Se sim, verifica se teu número está cadastrado direitinho!'
              );
              continue;
            }

            // ===== SISTEMA DE DEBOUNCE =====
            // Adicionar mensagem ao buffer
            const bufferResult = await addToMessageBuffer(message.from, message.text.body, 'text');
            
            // Cancelar timer anterior se existir
            if (activeTimers.has(message.from)) {
              clearTimeout(activeTimers.get(message.from));
              console.log(`⏱️ [DEBOUNCE] Timer anterior cancelado para ${message.from}`);
            }
            
            // Criar novo timer para processar após MESSAGE_DEBOUNCE_MS
            const timer = setTimeout(() => {
              processBufferedMessages(message.from).catch(err => {
                console.error('❌ [DEBOUNCE] Erro ao processar buffer:', err);
              });
            }, MESSAGE_DEBOUNCE_MS);
            
            activeTimers.set(message.from, timer);
            console.log(`⏱️ [DEBOUNCE] Novo timer criado para ${message.from} (${bufferResult.bufferSize} msgs no buffer)`);
            
          } catch (error) {
            console.error('❌ [B2][DEBUG] Error processing message:', error);
            console.error('❌ [B2][DEBUG] Error stack:', error?.stack);
            
            try {
              await sendWhatsAppMessage(message.from, 
                'Ops! Tive um problema aqui. 😅\n\nTenta de novo? Se continuar, melhor falar com o suporte!'
              );
            } catch (sendError) {
              console.error('❌ Erro ao enviar mensagem de erro:', sendError);
            }
          }
        } else if (message.type === 'audio' || message.type === 'voice') {
          console.log(`🎤 [AUDIO] Recebida mensagem de áudio de ${message.from}`);
          
          try {
            // Fast path para testes
            if (message.id?.includes('test_') || process.env.WEBHOOK_DRY_RUN === '1') {
              console.log('🧪 [AUDIO][DEBUG] Dry-run/test payload detected. Skipping audio processing.');
              continue;
            }

            // Verificar usuário primeiro
            const user = await getUserByPhone(message.from);
            if (!user) {
              console.log('❌ [AUDIO] User not found for phone:', message.from);
              await sendWhatsAppMessage(message.from, 
                'Opa! Não consegui te identificar aqui. 🤔\n\nVocê já fez parte de uma organização no MeuAzulão? Se sim, verifica se teu número está cadastrado direitinho!'
              );
              continue;
            }

            // Extrair media_id
            const mediaId = message.audio?.id || message.voice?.id;
            if (!mediaId) {
              console.warn('⚠️ [AUDIO] Media ID não encontrado na mensagem');
              continue;
            }
            
            console.log('🎤 [AUDIO] Media ID:', mediaId);

            // Obter URL de download
            console.log('🎤 [AUDIO] Obtendo URL de download...');
            const audioUrl = await getMediaUrl(mediaId);

            // Transcrever com Whisper
            console.log('🎤 [AUDIO] Transcrevendo com Whisper...');
            const { default: OpenAIService } = await import('../services/openaiService.js');
            const openaiService = new OpenAIService();
            const transcription = await openaiService.transcribeAudio(audioUrl, process.env.WHATSAPP_TOKEN);
            
            if (!transcription || transcription.trim().length === 0) {
              throw new Error('Transcrição vazia ou inválida');
            }
            
            console.log('✅ [AUDIO] Transcrição:', `"${transcription}"`);

            // ===== SISTEMA DE DEBOUNCE (mesmo que texto) =====
            // Adicionar transcrição ao buffer
            const bufferResult = await addToMessageBuffer(message.from, transcription, 'audio');
            
            // Cancelar timer anterior se existir
            if (activeTimers.has(message.from)) {
              clearTimeout(activeTimers.get(message.from));
              console.log(`⏱️ [DEBOUNCE] Timer anterior cancelado para ${message.from}`);
            }
            
            // Criar novo timer para processar após MESSAGE_DEBOUNCE_MS
            const timer = setTimeout(() => {
              processBufferedMessages(message.from).catch(err => {
                console.error('❌ [DEBOUNCE] Erro ao processar buffer:', err);
              });
            }, MESSAGE_DEBOUNCE_MS);
            
            activeTimers.set(message.from, timer);
            console.log(`⏱️ [DEBOUNCE] Novo timer criado para ${message.from} (${bufferResult.bufferSize} msgs no buffer)`);

          } catch (audioError) {
            console.error('❌ [AUDIO][DEBUG] Error processing audio:', audioError);
            console.error('❌ [AUDIO][DEBUG] Error stack:', audioError?.stack);
            
            // Enviar mensagem de erro variada
            try {
              const errorMessages = [
                'Ops! Não consegui entender o áudio. 😅\n\nPode repetir ou enviar por texto?',
                'Eita, não deu pra entender o áudio. 😅\n\nTenta de novo ou manda por texto?',
                'Poxa, não consegui processar o áudio. 😅\n\nRepete ou manda por texto?',
                'Hmm, não entendi o áudio. 😅\n\nPode repetir ou escrever?',
                'Opa, não consegui entender o que você falou. 😅\n\nRepete ou manda por texto?',
                'Eita, não consegui processar o áudio. 😅\n\nPode repetir ou enviar por texto?',
                'Poxa, não deu certo com o áudio. 😅\n\nTenta de novo ou manda por texto?'
              ];
              
              const errorMessage = pickVariation(errorMessages, message.from);
              await sendWhatsAppMessage(message.from, errorMessage);
            } catch (sendError) {
              console.error('❌ [AUDIO] Erro ao enviar mensagem de erro:', sendError);
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


