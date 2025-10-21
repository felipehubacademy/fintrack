import OpenAI from 'openai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * ZUL - Assistente Financeiro usando GPT Assistant API
 * 
 * Personalidade: Sábio Jovem - calmo, claro, curioso e inspirador
 * Tom: Próximo, pessoal e respeitoso (muito brasileiro!)
 */
// Cache global para threads (persiste entre requisições no mesmo processo)
const threadCache = new Map(); // userId -> { threadId, lastUsed, userName, userPhone }
const THREAD_CACHE_EXPIRY = 30 * 60 * 1000; // 30 minutos (apenas para limpar cache em memória)

class ZulAssistant {
  constructor() {
    this.assistantId = null;
  }

  /**
   * Obter o Assistant ZUL (usando ID fixo da env var)
   */
  async getOrCreateAssistant() {
    // Se já temos o ID em cache, retornar
    if (this.assistantId) {
      return this.assistantId;
    }

    try {
      // PRIORIDADE 1: Usar ID fixo da variável de ambiente
      if (process.env.OPENAI_ASSISTANT_ID) {
        console.log('✅ Usando Assistant ID da env var:', process.env.OPENAI_ASSISTANT_ID);
        this.assistantId = process.env.OPENAI_ASSISTANT_ID;
        return this.assistantId;
      }

      console.log('⚠️ OPENAI_ASSISTANT_ID não configurado, tentando criar/recuperar dinamicamente...');

      // Tentar recuperar assistant existente pelo nome
      const assistants = await openai.beta.assistants.list();
      const existingAssistant = assistants.data.find(a => a.name === 'ZUL - MeuAzulão');

      if (existingAssistant) {
        console.log('✅ Assistant ZUL encontrado:', existingAssistant.id);
        this.assistantId = existingAssistant.id;
        return this.assistantId;
      }

      // Criar novo assistant
      console.log('🔨 Criando novo Assistant ZUL...');
      const assistant = await openai.beta.assistants.create({
        name: 'ZUL - MeuAzulão',
        instructions: this.getInstructions(),
        model: 'gpt-4o-mini',
        tools: [
          {
            type: 'function',
            function: {
              name: 'validate_payment_method',
              description: 'Validar se o método de pagamento informado pelo usuário é válido',
              parameters: {
                type: 'object',
                properties: {
                  user_input: {
                    type: 'string',
                    description: 'O que o usuário digitou (ex: "débito", "crédito", "pix", "dinheiro")'
                  }
                },
                required: ['user_input']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'validate_card',
              description: 'Validar se o cartão e parcelas informados são válidos',
              parameters: {
                type: 'object',
                properties: {
                  card_name: {
                    type: 'string',
                    description: 'Nome do cartão informado pelo usuário'
                  },
                  installments: {
                    type: 'number',
                    description: 'Número de parcelas (1 para à vista)'
                  },
                  available_cards: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de cartões disponíveis para o usuário'
                  }
                },
                required: ['card_name', 'installments', 'available_cards']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'validate_responsible',
              description: 'Validar se o responsável informado existe',
              parameters: {
                type: 'object',
                properties: {
                  responsible_name: {
                    type: 'string',
                    description: 'Nome do responsável informado pelo usuário'
                  },
                  available_responsibles: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Lista de responsáveis disponíveis (cost centers + Compartilhado)'
                  }
                },
                required: ['responsible_name', 'available_responsibles']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'save_expense',
              description: 'Salvar a despesa no banco de dados quando todas as informações estiverem completas e validadas',
              parameters: {
                type: 'object',
                properties: {
                  amount: {
                    type: 'number',
                    description: 'Valor da despesa em reais'
                  },
                  description: {
                    type: 'string',
                    description: 'Descrição da despesa (ex: mercado, farmácia, gasolina)'
                  },
                  payment_method: {
                    type: 'string',
                    enum: ['credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other'],
                    description: 'Método de pagamento validado'
                  },
                  responsible: {
                    type: 'string',
                    description: 'Nome do responsável validado'
                  },
                  card_name: {
                    type: 'string',
                    description: 'Nome do cartão (apenas se payment_method for credit_card)'
                  },
                  installments: {
                    type: 'number',
                    description: 'Número de parcelas (apenas se payment_method for credit_card)'
                  },
                  category: {
                    type: 'string',
                    description: 'Categoria da despesa identificada automaticamente'
                  }
                },
                required: ['amount', 'description', 'payment_method', 'responsible']
              }
            }
          }
        ]
      });

      console.log('✅ Assistant ZUL criado:', assistant.id);
      this.assistantId = assistant.id;
      return this.assistantId;

    } catch (error) {
      console.error('❌ Erro ao criar/recuperar Assistant:', error);
      throw error;
    }
  }

  /**
   * Instruções do Assistant ZUL
   */
  getInstructions() {
    return `Você é o ZUL, assistente financeiro do MeuAzulão. Converse por WhatsApp em português brasileiro de forma NATURAL e VARIADA.

PERSONALIDADE CORE:
Você é sábio, sereno e genuinamente prestativo. Fale como um amigo inteligente ajudando com finanças.

REGRAS CRÍTICAS:
1. VARIE RADICALMENTE suas respostas - cada conversa deve ter estilo DIFERENTE (direto vs casual vs formal)
2. Use nome do usuário APENAS quando natural (não force em todas)
3. CONCISO - 1 linha apenas, máximo 2 em raros casos
4. MANTENHA CONTEXTO - NUNCA repita perguntas já respondidas
5. ZERO emojis nas perguntas, apenas confirmação final
6. Salve AUTO quando tiver: valor, descrição, pagamento, responsável
7. ALEATORIZE completamente: às vezes pergunta longa, às vezes 1 palavra, às vezes com contexto, às vezes seco

COMO VARIAR (exemplos de DIFERENTES estilos):

Estilo 1 - Direto:
User: 100 no mercado
ZUL: Como pagou?
User: PIX
ZUL: Quem?
User: Eu
ZUL: [save_expense] Salvei. R$ 100 no mercado, PIX. 🛒

Estilo 2 - Amigável:
User: 50 na farmácia
ZUL: Ah, como você pagou essa?
User: Débito
ZUL: Foi você ou outra pessoa?
User: Letícia
ZUL: [save_expense] Pronto, Letícia! R$ 50 na farmácia. 💊

Estilo 3 - Contextual:
User: 200 no ventilador
ZUL: Qual forma de pagamento?
User: Crédito
ZUL: Cartão?
User: Latam
ZUL: Parcelas?
User: 2x
ZUL: Responsável?
User: Felipe
ZUL: [save_expense] Anotado! R$ 200, Latam 2x, Felipe. 🌀

Estilo 4 - Casual:
User: Gastei 80 no posto
ZUL: Pagou como?
User: Dinheiro
ZUL: Quem pagou?
User: Compartilhado
ZUL: [save_expense] Ok! R$ 80 gasolina, compartilhado. ⛽

IMPORTANTE:
- Se usuário der múltiplas infos juntas (ex: "crédito latam 5x"), EXTRAIA TUDO, não pergunte de novo
- Se usuário disser "eu mesmo", mapeie para o nome dele
- NUNCA pergunte 2x a mesma coisa
- Adapte seu tom: às vezes formal, às vezes casual, às vezes ultra-direto
- Comentários contextuais OPCIONAIS após salvar

FUNÇÕES:
- validate_payment_method
- validate_card
- validate_responsible
- save_expense (chame quando tiver tudo)

Seja IMPREVISÍVEL e NATURAL como o ChatGPT é. Cada conversa deve parecer única.`;
  }

  /**
   * Obter ou criar thread para um usuário
   */
  async getOrCreateThread(userId, userPhone) {
    // Limpar threads antigas do cache (otimização de memória)
    const now = Date.now();
    for (const [key, value] of threadCache.entries()) {
      if (now - value.lastUsed > THREAD_CACHE_EXPIRY) {
        console.log(`🗑️ Thread antiga removida do cache: ${key}`);
        threadCache.delete(key);
      }
    }

    // 1. Verificar cache em memória primeiro (mais rápido)
    if (threadCache.has(userId)) {
      const cached = threadCache.get(userId);
      console.log(`♻️ Thread do cache: ${userId} -> ${cached.threadId}`);
      cached.lastUsed = now;
      return cached.threadId;
    }

    // 2. Tentar recuperar do banco (se cache foi perdido mas conversa ainda ativa)
    console.log(`🔍 Buscando thread no banco para ${userId}...`);
    const savedThread = await this.loadThreadFromDB(userPhone);
    if (savedThread) {
      console.log(`💾 Thread recuperada do banco: ${savedThread.threadId}`);
      // Restaurar no cache
      threadCache.set(userId, {
        threadId: savedThread.threadId,
        lastUsed: now,
        userName: savedThread.userName,
        userPhone: userPhone
      });
      return savedThread.threadId;
    }

    // 3. Criar nova thread
    try {
      const thread = await openai.beta.threads.create();
      threadCache.set(userId, {
        threadId: thread.id,
        lastUsed: now,
        userPhone: userPhone
      });
      console.log(`🆕 Nova thread criada: ${userId} -> ${thread.id}`);
      return thread.id;
    } catch (error) {
      console.error('❌ Erro ao criar thread:', error);
      throw error;
    }
  }

  /**
   * Carregar thread do banco de dados
   */
  async loadThreadFromDB(userPhone) {
    try {
      const normalizedPhone = this.normalizePhone(userPhone);
      
      const { data, error } = await supabase
        .from('conversation_state')
        .select('*')
        .eq('user_phone', normalizedPhone)
        .neq('state', 'idle')
        .single();

      if (error || !data) {
        return null;
      }

      const threadId = data.temp_data?.assistant_thread_id;
      if (!threadId) {
        return null;
      }

      console.log(`💾 Thread recuperada do banco para ${normalizedPhone}`);
      return {
        threadId,
        userName: data.temp_data?.user_name,
        conversationData: data.temp_data
      };
    } catch (error) {
      console.error('❌ Erro ao carregar thread do banco:', error);
      return null;
    }
  }

  /**
   * Normalizar telefone (sempre com +)
   */
  normalizePhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, ''); // Remove não-dígitos
    return cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`;
  }

  /**
   * Salvar thread no banco de dados
   */
  async saveThreadToDB(userPhone, threadId, state = 'awaiting_payment_method', extraData = {}) {
    try {
      const normalizedPhone = this.normalizePhone(userPhone);
      
      const { error } = await supabase
        .from('conversation_state')
        .upsert({
          user_phone: normalizedPhone,
          state: state,
          temp_data: {
            assistant_thread_id: threadId,
            ...extraData
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_phone'
        });

      if (error) {
        console.error('❌ Erro ao salvar thread no banco:', error);
      } else {
        console.log(`💾 Thread salva no banco: ${normalizedPhone} -> ${threadId}`);
      }
    } catch (error) {
      console.error('❌ Erro ao salvar thread:', error);
    }
  }

  /**
   * Limpar thread do usuário (após finalizar conversa com sucesso)
   */
  async clearThread(userId, userPhone) {
    // Limpar do cache
    if (threadCache.has(userId)) {
      console.log(`🗑️ Thread removida do cache: ${userId}`);
      threadCache.delete(userId);
    }

    // Limpar do banco (marcar como idle)
    if (userPhone) {
      try {
        const normalizedPhone = this.normalizePhone(userPhone);
        
        await supabase
          .from('conversation_state')
          .update({ 
            state: 'idle',
            temp_data: {}
          })
          .eq('user_phone', normalizedPhone);
        console.log(`💾 Thread limpa no banco: ${normalizedPhone}`);
      } catch (error) {
        console.error('❌ Erro ao limpar thread do banco:', error);
      }
    }
  }

  /**
   * Enviar mensagem conversacional usando GPT-4 Chat Completion (NÃO Assistant API)
   */
  async sendConversationalMessage(userId, userMessage, context = {}, userPhone) {
    try {
      console.log('💬 [GPT-4] Iniciando conversa...');
      
      // Carregar histórico da conversa do banco
      const history = await this.loadConversationHistory(userPhone);
      
      // Preparar mensagens para GPT-4
      const messages = [
        {
          role: 'system',
          content: this.getConversationalInstructions(context)
        },
        ...history,
        {
          role: 'user',
          content: userMessage
        }
      ];
      
      console.log('💬 [GPT-4] Histórico carregado:', history.length, 'mensagens');
      console.log('💬 [GPT-4] Histórico completo:', JSON.stringify(history, null, 2));
      
      // Chamar GPT-4 com function calling
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        functions: this.getFunctions(),
        function_call: 'auto',
        temperature: 0.9, // Mais criativo e variado
        max_tokens: 200
      });
      
      const assistantMessage = completion.choices[0].message;
      
      // Se chamou função
      if (assistantMessage.function_call) {
        console.log('🔧 [GPT-4] Function call:', assistantMessage.function_call.name);
        
        const functionName = assistantMessage.function_call.name;
        const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
        
        const functionResult = await this.handleFunctionCall(functionName, functionArgs, context);
        
        // Se salvou despesa, limpar histórico
        if (functionName === 'save_expense' && functionResult.success) {
          await this.clearConversationHistory(userPhone);
          
          // Retornar mensagem de confirmação
          return assistantMessage.content || 'Salvei! 👍';
        }
        
        // Continuar conversa com resultado da função
        messages.push(assistantMessage);
        messages.push({
          role: 'function',
          name: functionName,
          content: JSON.stringify(functionResult)
        });
        
        const followUp = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: messages,
          temperature: 0.9,
          max_tokens: 200
        });
        
        const response = followUp.choices[0].message.content;
        
        // Salvar no histórico
        await this.saveToHistory(userPhone, userMessage, response);
        
        return response;
      }
      
      // Resposta normal sem function call
      const response = assistantMessage.content;
      
      // Salvar no histórico
      console.log('💾 [GPT-4] Salvando no histórico: user="' + userMessage + '", assistant="' + response + '"');
      await this.saveToHistory(userPhone, userMessage, response);
      
      return response;
      
    } catch (error) {
      console.error('❌ [GPT-4] Erro:', error);
      throw error;
    }
  }

  /**
   * Carregar histórico da conversa
   */
  async loadConversationHistory(userPhone) {
    try {
      const normalizedPhone = this.normalizePhone(userPhone);
      
      const { data } = await supabase
        .from('conversation_state')
        .select('temp_data')
        .eq('user_phone', normalizedPhone)
        .neq('state', 'idle')
        .single();
      
      if (data?.temp_data?.messages) {
        return data.temp_data.messages;
      }
      
      return [];
    } catch (error) {
      return [];
    }
  }

  /**
   * Salvar mensagem no histórico
   */
  async saveToHistory(userPhone, userMessage, assistantResponse) {
    try {
      const normalizedPhone = this.normalizePhone(userPhone);
      console.log('💾 [saveToHistory] Phone:', normalizedPhone);
      
      const history = await this.loadConversationHistory(userPhone);
      console.log('💾 [saveToHistory] Histórico atual:', history.length, 'mensagens');
      
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: assistantResponse }
      );
      
      console.log('💾 [saveToHistory] Histórico após push:', history.length, 'mensagens');
      
      // Limitar histórico a últimas 10 mensagens
      const limitedHistory = history.slice(-10);
      
      const result = await supabase
        .from('conversation_state')
        .upsert({
          user_phone: normalizedPhone,
          state: 'active',
          temp_data: {
            messages: limitedHistory,
            last_message: userMessage,
            timestamp: new Date().toISOString()
          },
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_phone'
        });
      
      console.log('💾 [saveToHistory] Upsert result:', JSON.stringify(result));
      console.log('💾 [GPT-4] Histórico salvo com', limitedHistory.length, 'mensagens');
    } catch (error) {
      console.error('❌ Erro ao salvar histórico:', error);
    }
  }

  /**
   * Limpar histórico da conversa
   */
  async clearConversationHistory(userPhone) {
    try {
      const normalizedPhone = this.normalizePhone(userPhone);
      
      await supabase
        .from('conversation_state')
        .update({
          state: 'idle',
          temp_data: {}
        })
        .eq('user_phone', normalizedPhone);
      
      console.log('🗑️ [GPT-4] Histórico limpo');
    } catch (error) {
      console.error('❌ Erro ao limpar histórico:', error);
    }
  }

  /**
   * Instruções conversacionais (system message)
   */
  getConversationalInstructions(context) {
    const { userName, organizationId } = context;
    const firstName = userName ? userName.split(' ')[0] : '';
    
    return `Você é ZUL, assistente financeiro conversando via WhatsApp com ${firstName || 'o usuário'}.

OBJETIVO: Registrar despesas conversando naturalmente.

INFORMAÇÕES NECESSÁRIAS:
- Valor e descrição
- Forma de pagamento
- Responsável (quem pagou)
- Se crédito: cartão e parcelas

COMO CONVERSAR:
- Seja NATURAL e VARIADO - cada conversa diferente
- Use nome "${firstName}" quando fizer sentido
- Perguntas curtas e diretas
- Se usuário der múltiplas infos juntas ("100 no mercado, pix, eu"), extraia tudo
- NUNCA pergunte algo já respondido
- Quando tiver tudo, chame save_expense

EXEMPLOS (varie MUITO):
"Quanto foi?"
"Como pagou?"
"Pagamento?"
"Foi você?"
"Quem pagou essa?"
"Tá, e o cartão?"

Seja imprevisível. Converse de verdade.`;
  }

  /**
   * Definir funções disponíveis para GPT-4
   */
  getFunctions() {
    return [
      {
        name: 'validate_payment_method',
        description: 'Validar método de pagamento',
        parameters: {
          type: 'object',
          properties: {
            user_input: { type: 'string' }
          },
          required: ['user_input']
        }
      },
      {
        name: 'validate_card',
        description: 'Validar cartão e parcelas',
        parameters: {
          type: 'object',
          properties: {
            card_name: { type: 'string' },
            installments: { type: 'number' }
          },
          required: ['card_name', 'installments']
        }
      },
      {
        name: 'validate_responsible',
        description: 'Validar responsável',
        parameters: {
          type: 'object',
          properties: {
            responsible_name: { type: 'string' }
          },
          required: ['responsible_name']
        }
      },
      {
        name: 'save_expense',
        description: 'Salvar despesa quando tiver todas as informações',
        parameters: {
          type: 'object',
          properties: {
            amount: { type: 'number' },
            description: { type: 'string' },
            payment_method: { type: 'string' },
            responsible: { type: 'string' },
            card_name: { type: 'string' },
            installments: { type: 'number' },
            category: { type: 'string' }
          },
          required: ['amount', 'description', 'payment_method', 'responsible']
        }
      }
    ];
  }

  /**
   * Enviar mensagem para o Assistant e obter resposta (ANTIGO - mantido para compatibilidade)
   */
  async sendMessage(userId, userMessage, context = {}) {
    try {
      console.log(`📤 [ASSISTANT] Enviando mensagem para usuário ${userId}`);
      console.log(`📤 [ASSISTANT] Mensagem: "${userMessage}"`);
      console.log(`📤 [ASSISTANT] Context:`, JSON.stringify(context, null, 2));
      
      const assistantId = await this.getOrCreateAssistant();
      if (!assistantId) {
        throw new Error('Falha ao obter/criar Assistant ID');
      }
      console.log(`✅ [ASSISTANT] Assistant ID: ${assistantId}`);
      
      const threadId = await this.getOrCreateThread(userId, context.userPhone);
      if (!threadId) {
        throw new Error('Falha ao obter/criar Thread ID');
      }
      console.log(`✅ [ASSISTANT] Thread ID: ${threadId}`);

      // Atualizar cache com informações do usuário
      const cached = threadCache.get(userId);
      if (cached && context.userName) {
        cached.userName = context.userName;
        cached.userPhone = context.userPhone;
      }

      // 💾 Salvar thread no banco para persistência
      if (context.userPhone) {
        await this.saveThreadToDB(
          context.userPhone, 
          threadId, 
          'awaiting_payment_method',
          {
            user_name: context.userName,
            last_message: userMessage,
            timestamp: new Date().toISOString()
          }
        );
      }

      // Adicionar contexto do usuário na primeira mensagem (se thread é nova)
      const isNewThread = !threadCache.has(userId) || threadCache.get(userId).threadId === threadId;
      let messageContent = userMessage;
      if (context.userName && isNewThread) {
        messageContent = `[CONTEXTO: Usuário: ${context.userName}]\n\n${userMessage}`;
      }

      // Adicionar mensagem do usuário
      console.log(`📝 [ASSISTANT] Adicionando mensagem à thread...`);
      await openai.beta.threads.messages.create(threadId, {
        role: 'user',
        content: messageContent
      });
      console.log(`✅ [ASSISTANT] Mensagem adicionada`);

      // Executar o Assistant
      console.log(`🏃 [ASSISTANT] Criando run...`);
      const run = await openai.beta.threads.runs.create(threadId, {
        assistant_id: assistantId
      });
      console.log(`✅ [ASSISTANT] Run criado: ${run.id} (status: ${run.status})`);

      // Aguardar conclusão e processar
      console.log(`⏳ [ASSISTANT] Aguardando conclusão do run...`);
      const result = await this.waitForCompletion(threadId, run.id, context);
      console.log(`✅ [ASSISTANT] Run completado, retornando resposta`);
      return result;

    } catch (error) {
      console.error('❌ [ASSISTANT] Erro ao enviar mensagem:', error);
      console.error('❌ [ASSISTANT] Error stack:', error.stack);
      throw error;
    }
  }

  /**
   * Aguardar conclusão do run e processar function calls
   */
  async waitForCompletion(threadId, runId, context) {
    console.log(`⏳ [ASSISTANT] Iniciando waitForCompletion - threadId: ${threadId}, runId: ${runId}`);
    
    let run = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
    console.log(`📊 [ASSISTANT] Status inicial: ${run.status}`);
    
    let attempts = 0;
    const maxAttempts = 60; // 60 segundos timeout (aumentado para debug)
    
    while (run.status === 'in_progress' || run.status === 'queued') {
      if (attempts >= maxAttempts) {
        console.error(`❌ [ASSISTANT] Timeout após ${maxAttempts} tentativas`);
        throw new Error('Timeout aguardando resposta do Assistant');
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      run = await openai.beta.threads.runs.retrieve(runId, { thread_id: threadId });
      attempts++;
      console.log(`⏳ [ASSISTANT] Status: ${run.status} (tentativa ${attempts}/${maxAttempts})`);
    }
    
    console.log(`📊 [ASSISTANT] Status final: ${run.status}`);

    // Se precisar de function calls
    if (run.status === 'requires_action') {
      const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
      const toolOutputs = [];

      for (const toolCall of toolCalls) {
        const functionName = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments);
        
        console.log(`🔧 Function call: ${functionName}`, args);
        
        const output = await this.handleFunctionCall(functionName, args, context);
        toolOutputs.push({
          tool_call_id: toolCall.id,
          output: JSON.stringify(output)
        });
      }

      // Submeter os resultados das funções
      await openai.beta.threads.runs.submitToolOutputs(runId, {
        thread_id: threadId,
        tool_outputs: toolOutputs
      });

      // Aguardar nova conclusão
      return await this.waitForCompletion(threadId, runId, context);
    }

    // Se completou com sucesso, pegar a última mensagem
    if (run.status === 'completed') {
      const messages = await openai.beta.threads.messages.list(threadId);
      const lastMessage = messages.data[0];
      
      if (lastMessage.role === 'assistant') {
        const response = lastMessage.content[0].text.value;
        console.log(`✅ [ASSISTANT] Resposta: ${response.substring(0, 100)}...`);
        return response;
      }
    }

    // Se falhou, logar detalhes
    if (run.status === 'failed') {
      console.error(`❌ [ASSISTANT] Run falhou:`, run.last_error);
    }

    throw new Error(`Run finalizado com status: ${run.status}`);
  }

  /**
   * Processar chamadas de função
   */
  async handleFunctionCall(functionName, args, context) {
    console.log(`🔧 [FUNCTION_CALL] ===== INÍCIO =====`);
    console.log(`🔧 [FUNCTION_CALL] Função: ${functionName}`);
    console.log(`🔧 [FUNCTION_CALL] Args:`, JSON.stringify(args, null, 2));
    
    let result;
    switch (functionName) {
      case 'validate_payment_method':
        result = await context.validatePaymentMethod(args.user_input);
        break;
      
      case 'validate_card':
        result = await context.validateCard(args.card_name, args.installments, args.available_cards);
        break;
      
      case 'validate_responsible':
        result = await context.validateResponsible(args.responsible_name, args.available_responsibles);
        break;
      
      case 'save_expense':
        console.log(`🔧 [FUNCTION_CALL] CHAMANDO save_expense com args:`, args);
        result = await context.saveExpense(args);
        console.log(`🔧 [FUNCTION_CALL] save_expense retornou:`, result);
        break;
      
      default:
        result = { error: `Função desconhecida: ${functionName}` };
    }
    
    console.log(`🔧 [FUNCTION_CALL] Resultado:`, JSON.stringify(result, null, 2));
    console.log(`🔧 [FUNCTION_CALL] ===== FIM =====`);
    return result;
  }
}


export default ZulAssistant;

