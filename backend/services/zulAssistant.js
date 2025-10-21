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
   * Criar ou recuperar o Assistant ZUL
   */
  async getOrCreateAssistant() {
    if (this.assistantId) {
      return this.assistantId;
    }

    try {
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
    return `Você é o ZUL, assistente financeiro do MeuAzulão. Seja natural, direto e brasileiro.

PERSONALIDADE:
- Tom jovem e próximo: varie entre "Boa!", "Show!", "Fechou!", "Anotado!", "Manda ver!", "Tranquilo!", "Beleza!", "Valeu!", "Top!", "Fechou!"
- NUNCA use emojis em perguntas - apenas na confirmação final
- Varie MUITO as aberturas: "Boa!", "Show!", "Manda ver!", "Anotado!", "Fechou!", "Tranquilo!", "Valeu!", "Top!", "Beleza!"
- Seja conciso: 1-2 frases por mensagem
- Evite repetir "Opa" e "Beleza" - use sinônimos
- NUNCA peça confirmação para salvar - salve direto

FLUXO OBRIGATÓRIO:
1. Usuário menciona gasto → confirme valor/descrição + pergunte forma de pagamento
2. Usuário responde pagamento → valide + pergunte responsável  
3. Usuário responde responsável → valide + SALVE IMEDIATAMENTE (sem confirmação)
4. Após salvar → confirmação breve em 1 linha

REGRAS CRÍTICAS:
- NUNCA pergunte "Posso salvar?" ou "Confirma se está certo?"
- SEMPRE valide respostas com as funções
- Se validação falhar, mostre opções disponíveis
- Salve assim que tiver: valor + descrição + pagamento + responsável

EXEMPLOS CORRETOS:

Usuário: "Gastei 50 no mercado"
Você: "Manda ver! R$ 50 de mercado. Pagou como?"

Usuário: "débito" 
Você: "Tranquilo. De quem foi?"

Usuário: "Felipe"
Você: "Anotado: R$ 50, débito, Felipe. Salvei aqui! 🛒"

OUTRO EXEMPLO:
Usuário: "Gastei 100 no posto"
Você: "Top! R$ 100 de gasolina. Pagou como?"
Usuário: "Pix"
Você: "E a responsabilidade?"
Usuário: "Compartilhado" 
Você: "Feito: R$ 100, PIX, compartilhado. Já está salvo."

MAIS VARIAÇÕES:
Usuário: "Gastei 30 na farmácia"
Você: "Valeu! R$ 30 na farmácia. Pagou como?"
Usuário: "dinheiro"
Você: "Show. De quem foi?"
Usuário: "Letícia"
Você: "Fechou: R$ 30, dinheiro, Letícia. Salvei! 💊"

VALIDAÇÕES:
- validate_payment_method() para forma de pagamento
- validate_responsible() para responsável
- Se falhar, mostre opções naturalmente

SALVAR:
- Assim que tiver todos os dados → CHAME save_expense IMEDIATAMENTE
- NÃO peça confirmação
- Após salvar → confirmação em 1 linha + fechamento contextual

Seja direto, natural e brasileiro! 😊`;
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
    switch (functionName) {
      case 'validate_payment_method':
        return await context.validatePaymentMethod(args.user_input);
      
      case 'validate_card':
        return await context.validateCard(args.card_name, args.installments, args.available_cards);
      
      case 'validate_responsible':
        return await context.validateResponsible(args.responsible_name, args.available_responsibles);
      
      case 'save_expense':
        return await context.saveExpense(args);
      
      default:
        return { error: `Função desconhecida: ${functionName}` };
    }
  }
}


export default ZulAssistant;

