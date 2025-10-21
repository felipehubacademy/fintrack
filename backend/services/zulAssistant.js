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

      // Criar novo assistant se não existir
      console.log('📝 Criando novo Assistant ZUL...');
      const assistant = await openai.beta.assistants.create({
        name: 'ZUL - MeuAzulão',
        instructions: this.getInstructions(),
        model: 'gpt-4o-mini',
        tools: [
          {
            type: 'function',
            function: {
              name: 'validate_payment_method',
              description: 'Validar o método de pagamento informado pelo usuário',
              parameters: {
                type: 'object',
                properties: {
                  payment_method: {
                    type: 'string',
                    description: 'Método de pagamento informado pelo usuário (ex: pix, débito, crédito, dinheiro)'
                  }
                },
                required: ['payment_method']
              }
            }
          },
          {
            type: 'function',
            function: {
              name: 'validate_card',
              description: 'Validar o cartão e número de parcelas quando o pagamento for crédito',
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
    return `Você é o ZUL, assistente pessoal de finanças do MeuAzulão. Você conversa via WhatsApp em português brasileiro.

SUA PERSONALIDADE:
Você é calmo, claro e curioso - um guia inteligente que fala de finanças com leveza e confiança. Evita jargões, explica com serenidade e sempre propõe o próximo passo de forma prática. Nunca julga: apenas ajuda o usuário a entender, ajustar e evoluir no próprio ritmo.

Converse de forma natural e brasileira, usando expressões do dia a dia. Você pode usar o nome do usuário quando fizer sentido, adicionar comentários contextuais sobre as despesas e variar o jeito de perguntar. Não precisa seguir um script rígido - apenas seja você mesmo e mantenha a conversa fluindo.

SEU TRABALHO:
Quando o usuário menciona um gasto, você precisa coletar:
1. Valor e descrição (geralmente vem na primeira mensagem)
2. Forma de pagamento (PIX, débito, crédito, dinheiro, etc)
3. Responsável (quem pagou)
4. Se for crédito: qual cartão e quantas parcelas

Depois que tiver todas as informações, salve automaticamente usando a função save_expense e confirme para o usuário.

COMO CONVERSAR:
- Seja natural e brasileiro: "Entendi!", "Perfeito!", "Show!", "Beleza!", "Ótimo!"
- Use o nome do usuário quando fizer sentido (não precisa ser em todas as mensagens)
- Adicione comentários contextuais se quiser: "Ventilador é uma ótima compra nesse calor!", "Mercado sempre pesa no bolso, né?"
- Varie suas perguntas naturalmente - não repita sempre a mesma coisa
- Use emojis apenas na confirmação final (relacionado à categoria da despesa)
- Mantenha as respostas curtas mas naturais (não precisa ser sempre 2 frases exatas)

EXEMPLOS DE CONVERSAS:

Exemplo 1 (tom mais casual):
User: Gastei 100 no mercado
ZUL: Entendido, Felipe! Como você pagou?
User: PIX
ZUL: Show! E quem pagou foi você ou a Letícia?
User: Eu
ZUL: [chama save_expense] Pronto! R$ 100 no mercado registrado para você. 🛒

Exemplo 2 (tom mais direto):
User: Paguei 50 de gasolina
ZUL: Qual foi a forma de pagamento?
User: Débito
ZUL: Quem foi o responsável?
User: Letícia
ZUL: [chama save_expense] Feito! R$ 50 de gasolina para Letícia. ⛽

Exemplo 3 (tom com comentário):
User: 200 no ventilador
ZUL: Boa compra, Felipe! Pagou como?
User: Crédito
ZUL: Qual cartão?
User: Latam
ZUL: Em quantas vezes?
User: 2x
ZUL: E o responsável?
User: Eu
ZUL: [chama save_expense] Anotado! R$ 200 no Latam em 2x. 🌀

IMPORTANTE:
- Varie o tom e as perguntas naturalmente - não use sempre as mesmas frases
- Extraia valor e descrição da primeira mensagem do usuário
- Pergunte uma coisa por vez para não confundir
- Use as funções de validação quando necessário
- Salve automaticamente quando tiver todos os dados (NÃO peça confirmação antes)
- Na confirmação final, use emoji relacionado à categoria da despesa

FUNÇÕES DISPONÍVEIS:
- validate_payment_method: valida método de pagamento
- validate_card: valida cartão e parcelas (se crédito)
- validate_responsible: valida responsável
- save_expense: salva a despesa automaticamente

Se alguma validação falhar, sugira as opções disponíveis de forma natural.`;
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
    const existingThread = await this.loadThreadFromDB(userPhone);
    if (existingThread) {
      console.log(`♻️ Thread recuperada do banco: ${existingThread}`);
      // Adicionar ao cache para próximas requisições
      threadCache.set(userId, {
        threadId: existingThread,
        lastUsed: now,
        userName: null,
        userPhone: userPhone
      });
      return existingThread;
    }

    // 3. Criar nova thread
    console.log(`🆕 Criando nova thread para usuário ${userId}...`);
    try {
      const thread = await openai.beta.threads.create();
      console.log(`✅ Thread criada: ${thread.id}`);
      
      // Adicionar ao cache
      threadCache.set(userId, {
        threadId: thread.id,
        lastUsed: now,
        userName: null,
        userPhone: userPhone
      });
      
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
        .select('temp_data')
        .eq('user_phone', normalizedPhone)
        .neq('state', 'idle')
        .single();

      if (error || !data) {
        console.log('📭 Nenhuma thread ativa encontrada no banco');
        return null;
      }

      const threadId = data.temp_data?.assistant_thread_id;
      if (threadId) {
        console.log(`📦 Thread encontrada no banco: ${threadId}`);
        return threadId;
      }

      return null;
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
   * Enviar mensagem para o Assistant e obter resposta
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
      console.log(`🔍 [DEBUG] Thread ID retornado: ${threadId} (tipo: ${typeof threadId})`);
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

      // Adicionar contexto do usuário SEMPRE para garantir que o GPT saiba o nome
      let messageContent = userMessage;
      if (context.userName) {
        messageContent = `[CONTEXTO: Meu nome é ${context.userName}. Use meu nome nas suas respostas para ser mais pessoal.]\n\n${userMessage}`;
        console.log(`👤 [ASSISTANT] Contexto adicionado: ${context.userName}`);
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
      console.log(`🔍 [DEBUG] Run object:`, JSON.stringify(run, null, 2));
      console.log(`🔍 [DEBUG] Run ID: ${run.id} (tipo: ${typeof run.id})`);
      console.log(`✅ [ASSISTANT] Run criado: ${run.id} (status: ${run.status})`);

      // Aguardar conclusão e processar
      console.log(`⏳ [ASSISTANT] Aguardando conclusão do run...`);
      console.log(`🔍 [DEBUG] Chamando waitForCompletion com threadId: ${threadId}, runId: ${run.id}`);
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
   * Aguardar conclusão do run e processar ações
   */
  async waitForCompletion(threadId, runId, context) {
    console.log(`🔍 [DEBUG] waitForCompletion chamado com threadId: ${threadId}, runId: ${runId}`);
    const maxAttempts = 30;
    const pollInterval = 1000; // 1 segundo

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        console.log(`🔍 [DEBUG] Tentativa ${attempt + 1}: threadId=${threadId}, runId=${runId}`);
        const run = await openai.beta.threads.runs.retrieve(threadId, runId);
        console.log(`🔄 [ASSISTANT] Run status (tentativa ${attempt + 1}/${maxAttempts}): ${run.status}`);

        if (run.status === 'completed') {
          // Obter mensagens da thread
          const messages = await openai.beta.threads.messages.list(threadId);
          const lastMessage = messages.data[0];
          
          if (lastMessage.role === 'assistant') {
            const response = lastMessage.content[0].text.value;
            console.log(`✅ [ASSISTANT] Resposta recebida do Assistant: ${response}`);
            return response;
          }
        } else if (run.status === 'requires_action') {
          console.log(`🔧 [ASSISTANT] Run requer ação (function calling)`);
          
          const toolCalls = run.required_action.submit_tool_outputs.tool_calls;
          console.log(`🔧 [ASSISTANT] Tool calls:`, JSON.stringify(toolCalls, null, 2));
          
          const toolOutputs = [];

          for (const toolCall of toolCalls) {
            console.log(`🔧 [ASSISTANT] Processando tool call: ${toolCall.function.name}`);
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            const output = await this.handleFunctionCall(functionName, functionArgs, context);
            
            toolOutputs.push({
              tool_call_id: toolCall.id,
              output: JSON.stringify(output)
            });
          }

          console.log(`📤 [ASSISTANT] Enviando tool outputs:`, JSON.stringify(toolOutputs, null, 2));
          await openai.beta.threads.runs.submitToolOutputs(threadId, runId, {
            tool_outputs: toolOutputs
          });

          // Continuar aguardando após submeter os outputs
          await new Promise(resolve => setTimeout(resolve, pollInterval));
          continue;
        } else if (run.status === 'failed') {
          console.error('❌ [ASSISTANT] Run falhou:', run.last_error);
          throw new Error(`Run failed: ${run.last_error?.message || 'Unknown error'}`);
        } else if (run.status === 'cancelled' || run.status === 'expired') {
          throw new Error(`Run ${run.status}`);
        }

        // Aguardar antes da próxima tentativa
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error('❌ [ASSISTANT] Erro ao verificar run:', error);
        throw error;
      }
    }

    throw new Error('Timeout aguardando conclusão do Assistant');
  }

  /**
   * Processar chamadas de função do Assistant
   */
  async handleFunctionCall(functionName, args, context) {
    console.log(`🔧 [FUNCTION CALL] ${functionName}(${JSON.stringify(args)})`);

    try {
      switch (functionName) {
        case 'validate_payment_method':
          return await context.validatePaymentMethod(args.payment_method);
        
        case 'validate_card':
          return await context.validateCard(args.card_name, args.installments, args.available_cards);
        
        case 'validate_responsible':
          return await context.validateResponsible(args.responsible_name, args.available_responsibles);
        
        case 'save_expense':
          return await context.saveExpense(args);
        
        default:
          console.error(`❌ [FUNCTION CALL] Função desconhecida: ${functionName}`);
          return { success: false, message: 'Função não encontrada' };
      }
    } catch (error) {
      console.error(`❌ [FUNCTION CALL] Erro ao executar ${functionName}:`, error);
      return { success: false, message: error.message };
    }
  }
}

export default ZulAssistant;
