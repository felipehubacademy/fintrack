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

// Sistema híbrido: agrupa mensagens rápidas, processa normais diretamente
const RAPID_SEQUENCE_SILENCE_MS = 500; // 500ms de SILÊNCIO após última msg para processar
const MAX_BUFFERED_MESSAGES = 10;

// Armazenar timeouts pendentes (em memória, ok para serverless pois é por request)
const pendingTimeouts = new Map();

/**
 * Verificar se usuário está mandando mensagens em sequência rápida
 * Retorna: { shouldBuffer: boolean, bufferSize: number }
 */
async function checkRapidSequence(userPhone) {
  try {
    const normalized = String(userPhone || '').replace(/\D/g, '');
    
    const { data: current } = await supabase
      .from('conversation_state')
      .select('temp_data, updated_at')
      .eq('user_phone', normalized)
      .maybeSingle();
    
    if (!current || !current.temp_data?.message_buffer) {
      return { shouldBuffer: false, bufferSize: 0 };
    }
    
    const buffer = current.temp_data.message_buffer || [];
    const lastUpdate = new Date(current.updated_at || current.temp_data.last_buffer_update);
    const now = new Date();
    const timeSinceLastMessage = now - lastUpdate;
    
    // Se última mensagem foi recente E já há mensagens no buffer, é sequência rápida
    const isRapidSequence = timeSinceLastMessage < 5000 && buffer.length > 0;
    
    console.log(`⚡ [RAPID-CHECK] ${normalized}: ${timeSinceLastMessage}ms desde última msg. Buffer: ${buffer.length}. Rapid: ${isRapidSequence}`);
    
    return {
      shouldBuffer: isRapidSequence,
      bufferSize: buffer.length
    };
  } catch (error) {
    console.error('❌ Erro ao verificar sequência rápida:', error);
    return { shouldBuffer: false, bufferSize: 0 };
  }
}

/**
 * Adicionar mensagem ao buffer (apenas para sequências rápidas)
 */
async function addToRapidBuffer(userPhone, messageText, messageType = 'text') {
  try {
    const normalized = String(userPhone || '').replace(/\D/g, '');
    
    const { data: current } = await supabase
      .from('conversation_state')
      .select('temp_data')
      .eq('user_phone', normalized)
      .maybeSingle();
    
    const buffer = current?.temp_data?.message_buffer || [];
    buffer.push({
      text: messageText,
      type: messageType,
      timestamp: new Date().toISOString()
    });
    
    // Limitar buffer
    const limitedBuffer = buffer.slice(-MAX_BUFFERED_MESSAGES);
    
    await supabase
      .from('conversation_state')
      .upsert({
        user_phone: normalized,
        temp_data: {
          ...current?.temp_data,
          message_buffer: limitedBuffer,
          last_buffer_update: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_phone'
      });
    
    console.log(`📦 [RAPID-BUFFER] Adicionada ao buffer de ${normalized}. Total: ${limitedBuffer.length}`);
    
    return limitedBuffer.length;
  } catch (error) {
    console.error('❌ Erro ao adicionar ao buffer rápido:', error);
    return 1;
  }
}

/**
 * Obter e limpar buffer de sequência rápida
 */
async function getAndClearRapidBuffer(userPhone) {
  try {
    const normalized = String(userPhone || '').replace(/\D/g, '');
    
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
    
    console.log(`📦 [RAPID-BUFFER] Buffer limpo. ${buffer.length} mensagens recuperadas.`);
    
    // Concatenar mensagens
    const concatenated = buffer.map(msg => msg.text).join('\n');
    
    return {
      concatenatedText: concatenated,
      messageCount: buffer.length,
      messages: buffer
    };
  } catch (error) {
    console.error('❌ Erro ao obter buffer rápido:', error);
    return null;
  }
}

/**
 * Processar mensagem diretamente (sem buffer/debounce)
 * O thread do OpenAI JÁ mantém o contexto entre mensagens
 */
async function processMessageDirect(userPhone, messageText, messageType = 'text') {
  try {
    console.log(`📨 [DIRECT] Processando mensagem ${messageType} de ${userPhone}`);
    
    const user = await getUserByPhone(userPhone);
    
    if (!user) {
      console.log('❌ [DIRECT] Usuário não encontrado');
      await sendWhatsAppMessage(userPhone, 
        'Opa! Não consegui te identificar aqui. 🤔\n\nVocê já fez parte de uma organização no MeuAzulão? Se sim, verifica se teu número está cadastrado direitinho!'
      );
      return;
    }
    
    // 🔧 PRÉ-PROCESSAMENTO: Normalizar erros de transcrição APENAS para mensagens de ÁUDIO
    // Não afeta texto digitado - MUITO RÁPIDO (< 0.01ms)
    let processedMessage = messageText;
    if (messageType && messageType.includes('audio')) {
      const { default: ZulAssistant } = await import('../services/zulAssistant.js');
      const zul = new ZulAssistant();
      processedMessage = zul.normalizeTranscriptionErrors(messageText);
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
    
    // Processar mensagem diretamente com ZulAssistant (mantém thread/contexto)
    const { default: ZulAssistant } = await import('../services/zulAssistant.js');
    const zul = new ZulAssistant();
    
    const result = await zul.processMessage(
      processedMessage,  // ✅ Usa mensagem normalizada (se for áudio)
      user.id,
      user.name,
      userPhone,
      context
    );
    
    // Enviar resposta
    if (result && result.message) {
      await sendWhatsAppMessage(userPhone, result.message);
    }
    
    console.log('✅ [DIRECT] Mensagem processada com sucesso');
  } catch (error) {
    console.error('❌ [DIRECT] Erro ao processar mensagem:', error);
    
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

            // Sistema híbrido: detectar sequência rápida
            const rapidCheck = await checkRapidSequence(message.from);
            
            // Adicionar ao buffer
            const bufferSize = await addToRapidBuffer(message.from, message.text.body, 'text');
            
            // Cancelar timeout anterior se existir
            if (pendingTimeouts.has(message.from)) {
              clearTimeout(pendingTimeouts.get(message.from));
              console.log(`⚡ [RAPID] Timeout anterior cancelado. Nova msg recebida.`);
            }
            
            if (rapidCheck.shouldBuffer || bufferSize > 1) {
              // Há buffer - agendar processamento após silêncio
              console.log(`⚡ [RAPID] Mensagem adicionada ao buffer. Total: ${bufferSize}. Aguardando ${RAPID_SEQUENCE_SILENCE_MS}ms de silêncio...`);
              
              const timeoutId = setTimeout(async () => {
                const buffer = await getAndClearRapidBuffer(message.from);
                pendingTimeouts.delete(message.from);
                
                if (buffer && buffer.messageCount > 0) {
                  console.log(`⚡ [RAPID] ${RAPID_SEQUENCE_SILENCE_MS}ms de silêncio. Processando ${buffer.messageCount} mensagens concatenadas`);
                  await processMessageDirect(message.from, buffer.concatenatedText, 'text-batch');
                }
              }, RAPID_SEQUENCE_SILENCE_MS);
              
              pendingTimeouts.set(message.from, timeoutId);
            } else {
              // Primeira mensagem - processar direto SEM delay
              console.log(`📨 [DIRECT] Primeira mensagem. Processando imediatamente (0ms delay)`);
              await processMessageDirect(message.from, message.text.body, 'text');
            }
            
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

            // Sistema híbrido: detectar sequência rápida
            const rapidCheck = await checkRapidSequence(message.from);
            
            // Adicionar transcrição ao buffer
            const bufferSize = await addToRapidBuffer(message.from, transcription, 'audio');
            
            // Cancelar timeout anterior se existir
            if (pendingTimeouts.has(message.from)) {
              clearTimeout(pendingTimeouts.get(message.from));
              console.log(`⚡ [RAPID-AUDIO] Timeout anterior cancelado. Novo áudio recebido.`);
            }
            
            if (rapidCheck.shouldBuffer || bufferSize > 1) {
              // Há buffer - agendar processamento após silêncio
              console.log(`⚡ [RAPID-AUDIO] Transcrição adicionada ao buffer. Total: ${bufferSize}. Aguardando ${RAPID_SEQUENCE_SILENCE_MS}ms de silêncio...`);
              
              const timeoutId = setTimeout(async () => {
                const buffer = await getAndClearRapidBuffer(message.from);
                pendingTimeouts.delete(message.from);
                
                if (buffer && buffer.messageCount > 0) {
                  console.log(`⚡ [RAPID-AUDIO] ${RAPID_SEQUENCE_SILENCE_MS}ms de silêncio. Processando ${buffer.messageCount} áudios concatenados`);
                  await processMessageDirect(message.from, buffer.concatenatedText, 'audio-batch');
                }
              }, RAPID_SEQUENCE_SILENCE_MS);
              
              pendingTimeouts.set(message.from, timeoutId);
            } else {
              // Primeiro áudio - processar direto SEM delay
              console.log(`📨 [DIRECT-AUDIO] Primeiro áudio. Processando imediatamente (0ms delay)`);
              await processMessageDirect(message.from, transcription, 'audio');
            }

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


