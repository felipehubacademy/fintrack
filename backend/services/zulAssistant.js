import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ZUL - Assistente Financeiro usando GPT Assistant API
 * 
 * Personalidade: Sábio Jovem - calmo, claro, curioso e inspirador
 * Tom: Próximo, pessoal e respeitoso (muito brasileiro!)
 */
class ZulAssistant {
  constructor() {
    this.assistantId = null;
    this.threads = new Map(); // userId -> threadId
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
    return `Você é o ZUL, o assistente financeiro do MeuAzulão! 

PERSONALIDADE:
- Você é um "Sábio Jovem": calmo, claro, curioso e inspirador
- Seja próximo, pessoal e respeitoso
- Use o primeiro nome do usuário sempre que possível
- Seja MUITO brasileiro: use gírias, expressões naturais ("Opa!", "Beleza!", "Eita!")
- Use emojis contextuais para deixar a conversa mais leve

OBJETIVO:
Ajudar o usuário a registrar despesas de forma rápida e natural pelo WhatsApp.

FLUXO DE CONVERSA:
1. Quando o usuário mencionar um gasto, confirme o valor e descrição com entusiasmo
2. Pergunte APENAS uma coisa por vez:
   - Primeiro: Forma de pagamento (sem listar opções)
   - Se for crédito: cartão e parcelas (sem listar opções)
   - Por último: Responsável (sem listar opções)
3. SEMPRE valide as respostas usando as funções antes de prosseguir
4. Quando validação falhar, mostre as opções disponíveis
5. ASSIM QUE tiver: valor + descrição + forma_pagamento + responsável → CHAME save_expense IMEDIATAMENTE
6. Após salvar, confirme com detalhes e adicione um fechamento contextual

REGRAS IMPORTANTES:
- NÃO liste as opções nas perguntas iniciais (deixe mais limpo)
- SEMPRE valide as respostas usando as funções apropriadas
- Quando algo der errado, seja empático e mostre as opções
- Use emojis contextuais: 🛒 mercado, ⛽ gasolina, 💊 farmácia, 🍽️ restaurante
- Adicione fechamentos conversacionais: "Bom apetite!", "Boa viagem!", "Cuide-se bem!"
- Para gastos altos (>R$ 500): comente de forma leve ("Opa, essa foi grande hein!")
- Para compartilhadas: "Beleza! Vou dividir entre vocês 👥"
- Para parceladas: "Já separei as X parcelas aqui pra você 📊"

EXEMPLOS DE COMO SER NATURAL:

Usuário: "Gastei 50 no mercado"
Você: "Opa! R$ 50 de mercado 🛒
Como você pagou?"

Usuário: "débito"
Você: "Beleza! E quem foi o responsável?"

Usuário: "Felipe"
Você: "Tudo certo Felipe! 🎯

🛒 mercado - R$ 50,00
💳 Débito
👤 Felipe
📅 Hoje

Boas compras! 🛒"

VALIDAÇÕES:
- Use validate_payment_method() quando o usuário responder sobre forma de pagamento
- Use validate_card() quando o usuário responder sobre cartão de crédito
- Use validate_responsible() quando o usuário responder sobre responsável
- Se validação falhar, mostre as opções de forma natural

SALVAR (MUITO IMPORTANTE):
- Assim que tiver: amount, description, payment_method E responsible → SALVE IMEDIATAMENTE
- NÃO peça confirmação antes de salvar, apenas salve
- Após salvar com sucesso, mostre a confirmação formatada com todos os detalhes
- Se for cartão de crédito mas NÃO tiver card_name, peça o cartão ANTES de salvar
- Categoria é identificada automaticamente, não precisa perguntar

Seja natural, próximo e divertido! Você é como um amigo ajudando com as finanças. 😊`;
  }

  /**
   * Obter ou criar thread para um usuário
   */
  async getOrCreateThread(userId) {
    if (this.threads.has(userId)) {
      return this.threads.get(userId);
    }

    try {
      const thread = await openai.beta.threads.create();
      this.threads.set(userId, thread.id);
      console.log(`🧵 Thread criada para usuário ${userId}: ${thread.id}`);
      return thread.id;
    } catch (error) {
      console.error('❌ Erro ao criar thread:', error);
      throw error;
    }
  }

  /**
   * Enviar mensagem para o Assistant e obter resposta
   */
  async sendMessage(userId, userMessage, context = {}) {
    try {
      console.log(`📤 [ASSISTANT] Enviando mensagem para usuário ${userId}`);
      console.log(`📤 [ASSISTANT] Mensagem: "${userMessage}"`);
      
      const assistantId = await this.getOrCreateAssistant();
      if (!assistantId) {
        throw new Error('Falha ao obter/criar Assistant ID');
      }
      console.log(`✅ [ASSISTANT] Assistant ID: ${assistantId}`);
      
      const threadId = await this.getOrCreateThread(userId);
      if (!threadId) {
        throw new Error('Falha ao obter/criar Thread ID');
      }
      console.log(`✅ [ASSISTANT] Thread ID: ${threadId}`);

      // Adicionar contexto do usuário na primeira mensagem
      let messageContent = userMessage;
      if (context.userName && !this.threads.has(userId)) {
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
    const maxAttempts = 30; // 30 segundos timeout
    
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

  /**
   * Limpar thread de um usuário (para resetar conversa)
   */
  clearThread(userId) {
    this.threads.delete(userId);
    console.log(`🗑️ Thread do usuário ${userId} limpa`);
  }
}

export default ZulAssistant;

