import OpenAI from 'openai';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import ZulWebChat from './zulWebChat.js';

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
    this.webChat = new ZulWebChat();
  }

  // Normalização global: minúsculas e sem acentos
  normalizeText(str) {
    return (str || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}+/gu, '');
  }

  // Capitalizar primeira letra da descrição (sempre salvar com primeira letra maiúscula)
  capitalizeDescription(text) {
    if (!text || typeof text !== 'string') return '';
    const t = text.trim();
    if (t.length === 0) return '';
    return t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
  }

  // Extrair núcleo descritivo (remove apenas verbos/artigos/preposições comuns)
  // Permite números na descrição (ex: "2 televisões", "5kg de carne", "TV 50 polegadas")
  // Remove apenas quando claramente é valor monetário no início (ex: "150 mercado" -> "mercado")
  extractCoreDescription(text) {
    if (!text) return '';
    let cleaned = text.trim();
    
    // Remover números no início APENAS se for padrão "NÚMERO + palavra única" e número >= 20
    // Isso detecta valores monetários (ex: "150 mercado", "200 farmácia")
    // Mas mantém quantidades (ex: "2 televisões", "5kg de carne", "TV 50 polegadas")
    const match = cleaned.match(/^(\d+)\s+(.+)$/);
    if (match) {
      const number = parseInt(match[1]);
      const rest = match[2].trim();
      
      // Remover APENAS se:
      // 1. Número >= 20 (valores monetários típicos)
      // 2. Resto é uma única palavra (não "2 televisões" ou "5kg de carne")
      // 3. Não tem palavras relacionadas a quantidade (kg, unidade, etc)
      const quantityWords = /(kg|g|ml|l|unidade|unidades|pacote|pacotes|peça|peças|par|pares|polegada|polegadas|tv|televis)/i;
      const isSingleWord = !rest.includes(' ');
      
      if (number >= 20 && isSingleWord && !quantityWords.test(cleaned)) {
        cleaned = rest;
      }
    }
    
    const noAccent = this.normalizeText(cleaned);
    // Remover pontuação leve
    const normalized = noAccent.replace(/[.,!?;:]/g, ' ');
    const stopwords = new Set([
      'comprei','paguei','gastei','foi','deu','peguei','compre','comprar','pagando','pagamento',
      'um','uma','uns','umas','o','a','os','as',
      'no','na','nos','nas','num','numa','em','de','do','da','dos','das','para','pra','pro','pela','pelo','por','ao','à','aos','às'
    ]);
    const tokens = normalized.split(/\s+/).filter(Boolean).filter(t => !stopwords.has(t));
    if (tokens.length === 0) return cleaned.trim();
    // Retornar até 3 palavras significativas (mantendo números se fizerem parte)
    return tokens.slice(0, 3).join(' ');
  }

  /**
   * Escolher variação aleatória de forma mais determinística e variada
   * Usa timestamp + string para criar um "seed" variado a cada chamada
   */
  pickVariation(variations, seed = null) {
    if (!variations || variations.length === 0) return '';
    if (variations.length === 1) return variations[0];
    
    // Usar timestamp + seed para criar um índice mais variado
    const timestamp = Date.now();
    const seedValue = seed ? String(seed).split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0;
    const random = ((timestamp % 1000) + seedValue) % variations.length;
    
    return variations[random];
  }

  /**
   * Obter primeiro nome do usuário do contexto
   */
  getFirstName(context) {
    if (!context || !context.userName) return '';
    return context.userName.split(' ')[0] || '';
  }

  /**
   * Gerar mensagem contextual baseada na descrição/categoria
   */
  generateContextualMessage(description, category, paymentMethod) {
    if (!description) return null;
    
    const descLower = description.toLowerCase();
    const categoryLower = (category || '').toLowerCase();
    
    // Mensagens por palavra-chave na descrição
    const messages = [];
    
    // Suplementos
    if (descLower.includes('whey') || descLower.includes('creatina') || descLower.includes('proteína') || descLower.includes('proteina') || descLower.includes('multivitaminico') || descLower.includes('multivitamínico') || descLower.includes('bcaa') || descLower.includes('glutamina') || descLower.includes('pre treino') || descLower.includes('pré treino') || categoryLower.includes('suplementos')) {
      const supplementMessages = [
        'Agora é só aproveitar o Whey e cuidar da sua saúde 🏋️‍♀️',
        'Boa escolha! Sua saúde agradece 💪',
        'Invista em você! Continue cuidando da sua saúde 💪',
        'Ótimo! Cuide bem da sua saúde 🏋️‍♀️',
        'Aproveite os resultados! 💪',
        'Suplementos de qualidade fazem toda a diferença! 💪'
      ];
      messages.push(this.pickVariation(supplementMessages, 'suplementos'));
    }
    
    // Saúde (sem suplementos)
    if (categoryLower.includes('saúde') && !categoryLower.includes('suplementos')) {
      const healthMessages = [
        'Cuide bem da sua saúde! 💊',
        'Sua saúde em primeiro lugar! 💊',
        'Tudo vai melhorar! 💊',
        'Melhoras! 💊'
      ];
      messages.push(this.pickVariation(healthMessages, 'saude'));
    }
    
    // Academia / Exercício
    if (descLower.includes('academia') || descLower.includes('treino') || descLower.includes('personal')) {
      const gymMessages = [
        'Bora treinar! 💪',
        'Hora de suar! Você consegue! 💪',
        'Treino pago, hora de treinar! 💪',
        'Invista no seu corpo! 💪'
      ];
      messages.push(this.pickVariation(gymMessages, 'academia'));
    }
    
    // Alimentação
    if (descLower.includes('mercado') || descLower.includes('supermercado') || descLower.includes('feira') || categoryLower.includes('alimentação')) {
      const foodMessages = [
        'Hora de cozinhar algo gostoso! 🍳',
        'Boa compra! Comida em casa é tudo! 🍽️',
        'Compras feitas! Agora é só aproveitar! 🛒',
        'Comida fresquinha! Bom apetite! 🍽️'
      ];
      messages.push(this.pickVariation(foodMessages, 'mercado'));
    }
    
    // Restaurante / Delivery
    if (descLower.includes('restaurante') || descLower.includes('ifood') || descLower.includes('delivery') || descLower.includes('lanche')) {
      const restaurantMessages = [
        'Bom apetite! 🍽️',
        'Aproveite a refeição! 🍽️',
        'Hora de comer bem! 🍽️',
        'Comida boa chegando! 🍽️'
      ];
      messages.push(this.pickVariation(restaurantMessages, 'restaurante'));
    }
    
    // Transporte / Gasolina
    if (descLower.includes('gasolina') || descLower.includes('posto') || descLower.includes('combustível') || descLower.includes('uber') || descLower.includes('taxi') || categoryLower.includes('transporte')) {
      const transportMessages = [
        'Boa viagem! 🚗',
        'Tanque cheio! 🚗',
        'Bom trajeto! 🚗',
        'Dirija com cuidado! 🚗'
      ];
      messages.push(this.pickVariation(transportMessages, 'transporte'));
    }
    
    // Lazer / Cinema / Show
    if (descLower.includes('cinema') || descLower.includes('show') || descLower.includes('teatro') || descLower.includes('netflix') || descLower.includes('spotify') || categoryLower.includes('lazer')) {
      const leisureMessages = [
        'Aproveite o momento! 🎬',
        'Bom entretenimento! 🎬',
        'Hora de relaxar! 🎬',
        'Curta bastante! 🎬'
      ];
      messages.push(this.pickVariation(leisureMessages, 'lazer'));
    }
    
    // Educação / Curso
    if (descLower.includes('curso') || descLower.includes('faculdade') || descLower.includes('escola') || descLower.includes('livro') || categoryLower.includes('educação')) {
      const educationMessages = [
        'Invista no seu futuro! 📚',
        'Conhecimento é poder! 📚',
        'Boa escolha! Aprender nunca é demais! 📚',
        'Invista em você! 📚'
      ];
      messages.push(this.pickVariation(educationMessages, 'educacao'));
    }
    
    // Farmácia / Remédios
    if (descLower.includes('farmácia') || descLower.includes('farmacia') || descLower.includes('remédio') || descLower.includes('remedio') || descLower.includes('médico') || descLower.includes('medico')) {
      const pharmacyMessages = [
        'Melhoras! 💊',
        'Cuide bem da sua saúde! 💊',
        'Tudo vai melhorar! 💊',
        'Sua saúde em primeiro lugar! 💊'
      ];
      messages.push(this.pickVariation(pharmacyMessages, 'farmacia'));
    }
    
    // Retornar primeira mensagem encontrada (ou null se nenhuma)
    return messages.length > 0 ? messages[0] : null;
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
                    description: 'Descrição da despesa SEM o valor monetário. Exemplos: "mercado" (não "150 mercado"), "farmácia", "2 televisões", "5kg de carne". Permita números de quantidade, mas NUNCA inclua valor monetário.'
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
    return `Você é o ZUL, o assistente financeiro do MeuAzulão. Seu objetivo primário é registrar despesas de forma rápida e conversacional via WhatsApp, utilizando as ferramentas de função disponíveis.

PERSONALIDADE: Sábio Jovem. Seu tom é **calmo, claro, genuinamente prestativo e inspirador**. Fale como um amigo inteligente que ajuda a família a ter mais controle financeiro. Use um português brasileiro **NATURAL e VARIADO**.

REGRAS CRÍTICAS PARA CONVERSAÇÃO FLUÍDA:

1.  **VARIAÇÃO RADICAL**: Mude o estilo de cada resposta (direto, casual, formal, contextual). NUNCA repita a mesma frase ou estrutura de pergunta.
2.  **CONCISÃO MÁXIMA**: Responda com **1 linha** sempre que possível. Use no máximo 2 linhas em casos de confirmação ou contexto. O WhatsApp exige rapidez.
3.  **INFERÊNCIA ATIVA**: Se o usuário fornecer informações parciais, use o contexto para inferir e perguntar apenas pela **lacuna CRÍTICA** restante. Ex: Se ele diz "100 no mercado, débito", pergunte apenas "E o responsável?".
4.  **HUMANIZAÇÃO LEVE**: Use emojis leves (🤔, ❓, 💰) com moderação e apenas para humanizar a pergunta ou confirmação. Não use emojis em excesso.
5.  **MANUTENÇÃO DE CONTEXTO**: NUNCA repita perguntas já respondidas ou informações já fornecidas.
6.  **FLUXO DE VALIDAÇÃO**: A ordem de prioridade para coleta é: Valor & Descrição, Pagamento, Responsável.
7.  **SALVAMENTO AUTOMÁTICO**: Chame a função save_expense **IMEDIATAMENTE** quando tiver: valor, descrição, pagamento, e responsável.
8.  **TRATAMENTO DE DESVIO**: Se a mensagem não for uma despesa (ex: saudação, pergunta sobre saldo), responda brevemente, mantenha a personalidade e **redirecione gentilmente** para o foco principal: "Oi, [Nome]! Tudo ótimo por aqui. Lembre-se que meu foco é anotar suas despesas rapidinho. Qual foi o gasto de hoje? 😉"

FUNÇÕES:
- validate_payment_method
- validate_card
- validate_responsible

- save_expense (chame quando tiver tudo validado)

Seja IMPREVISÍVEL e NATURAL. Faça o usuário sentir que está falando com um assistente humano e eficiente.`;
  }

  /**
   * Obter ou criar thread para um usuário
   * MELHORADO: Sempre busca do banco primeiro, cache apenas para performance
   */
  async getOrCreateThread(userId, userPhone) {
    const now = Date.now();
    
    // 1. SEMPRE buscar do banco primeiro (robustez em cold starts)
    console.log(`🔍 Buscando thread no banco para ${userId}...`);
    const savedThread = await this.loadThreadFromDB(userPhone);
    
    if (savedThread && savedThread.threadId) {
      // Validar que thread ainda existe no OpenAI
      const isValid = await this.validateThread(savedThread.threadId);
      
      if (isValid) {
        console.log(`✅ Thread válida recuperada do banco: ${savedThread.threadId}`);
        // Preencher cache para performance
        threadCache.set(userId, {
          threadId: savedThread.threadId,
          lastUsed: now,
          userName: savedThread.userName,
          userPhone: userPhone
        });
        return savedThread.threadId;
      } else {
        console.log(`⚠️ Thread inválida encontrada, criando nova...`);
      }
    }

    // 2. Criar nova thread
    try {
      console.log(`🆕 Criando nova thread para ${userId}...`);
      const thread = await openai.beta.threads.create();
      
      // Salvar no cache
      threadCache.set(userId, {
        threadId: thread.id,
        lastUsed: now,
        userPhone: userPhone
      });
      
      console.log(`✅ Nova thread criada: ${userId} -> ${thread.id}`);
      return thread.id;
    } catch (error) {
      console.error('❌ Erro ao criar thread:', error);
      throw error;
    }
  }

  /**
   * Validar se thread ainda existe no OpenAI
   */
  async validateThread(threadId) {
    try {
      const thread = await openai.beta.threads.retrieve(threadId);
      return !!thread;
    } catch (error) {
      console.error('❌ Thread inválida:', error.message);
      return false;
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
   * Normalizar telefone (sempre sem +)
   */
  normalizePhone(phone) {
    if (!phone) return null;
    const cleanPhone = String(phone).replace(/\D/g, ''); // Remove não-dígitos
    return cleanPhone; // Sempre sem + (WhatsApp não usa)
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
    // Garantir que context tem saveExpense
    if (!context.saveExpense) {
      console.log('⚠️ Context sem saveExpense, adicionando implementação completa');
      context.saveExpense = async (args) => {
        console.log('💾 [SAVE] Salvando despesa com args:', args);
        
        try {
          // Normalizar payment_method (case/acento) + sinônimos
          const nm = this.normalizeText(args.payment_method);
          let paymentMethod = 'other';
          if (nm.includes('pix')) paymentMethod = 'pix';
          else if (nm.includes('dinheir') || nm.includes('cash') || nm.includes('especie')) paymentMethod = 'cash';
          else if (nm.includes('deb')) paymentMethod = 'debit_card';
          else if (nm.includes('cred')) paymentMethod = 'credit_card';
          else if (nm.includes('boleto')) paymentMethod = 'boleto';
          else if (nm.includes('transfer')) paymentMethod = 'bank_transfer';
          
          // Extrair valor
          const amount = parseFloat(args.amount);
          
          // Determinar owner (se "eu", usar nome do contexto). Não fazer fallback silencioso.
          let owner = args.responsible;
          let ownerNorm = this.normalizeText(owner);
          if (ownerNorm === 'eu' || ownerNorm.includes('eu')) {
            owner = context.userName || context.firstName || owner;
            // Recalcular normalizado após mapear "eu" para o nome do usuário
            ownerNorm = this.normalizeText(owner);
          }
          
          // Buscar cost_center_id se owner não for "Compartilhado"  
          let costCenterId = null;
          const isShared = ownerNorm.includes('compartilhado');

          if (!isShared && owner) {
            // Matching normalizado (case/acento) com suporte a primeiro nome e desambiguação
            const { data: centers } = await supabase
              .from('cost_centers')
              .select('id, name')
              .eq('organization_id', context.organizationId);

            if (centers && centers.length) {
              const byNorm = new Map();
              for (const c of centers) byNorm.set(this.normalizeText(c.name), c);

              // 1) Match exato normalizado
              const exact = byNorm.get(ownerNorm);
              if (exact) {
                costCenterId = exact.id;
                owner = exact.name; // padroniza capitalização
              } else {
                // 2) Match parcial (substring)
                let matches = centers.filter(c => {
                  const n = this.normalizeText(c.name);
                  return n.includes(ownerNorm) || ownerNorm.includes(n);
                });

                // 3) Se usuário passou apenas o primeiro nome, tentar por primeiro token
                if (!matches.length) {
                  const firstToken = ownerNorm.split(/\s+/)[0];
                  matches = centers.filter(c => {
                    const tokens = this.normalizeText(c.name).split(/\s+/);
                    return tokens[0] === firstToken; // primeiro nome igual
                  });
                }

                if (matches.length === 1) {
                  costCenterId = matches[0].id;
                  owner = matches[0].name;
                } else if (matches.length > 1) {
                  const options = matches.map(m => m.name).join(', ');
                  const firstName = this.getFirstName(context);
                  const namePart = firstName ? ` ${firstName}` : '';
                  
                  const disambiguationMessages = [
                    `Encontrei mais de um responsável com esse primeiro nome${namePart}. Qual deles? ${options}`,
                    `Tem mais de um ${owner} aqui${namePart}. Qual? ${options}`,
                    `Achei vários com esse nome${namePart}. Qual foi? ${options}`,
                    `Qual desses${namePart}? ${options}`,
                    `Tem mais de um com esse nome${namePart}. Qual você quer? ${options}`,
                    `Preciso que você escolha${namePart}: ${options}`,
                    `Qual desses foi${namePart}? ${options}`,
                    `Tem vários com esse nome${namePart}. Qual? ${options}`
                  ];
                  return {
                    success: false,
                    message: this.pickVariation(disambiguationMessages, owner)
                  };
                }
              }
            }
          }

          // Se não foi possível determinar responsável/centro, pedir explicitamente
          if (!isShared && (!owner || !costCenterId)) {
            const firstName = this.getFirstName(context);
            const namePart = firstName ? ` ${firstName}` : '';
            
            const questions = [
              `Quem pagou${namePart}?`,
              `Foi você ou alguém específico${namePart}?`,
              `Me diz quem pagou${namePart}?`,
              `Quem foi o responsável${namePart}?`,
              `Quem pagou essa${namePart}?`,
              `Foi você${namePart}?`,
              `Me conta quem pagou${namePart}?`,
              `Quem foi${namePart}?`,
              `Preciso saber quem pagou${namePart}`,
              `Quem arcou com essa${namePart}?`
            ];
            return {
              success: false,
              message: this.pickVariation(questions, owner || 'responsavel')
            };
          }
          
          // Normalizar/limpar descrição para salvar e inferir
          if (args.description) {
            const core = this.extractCoreDescription(args.description);
            if (core) {
              args.description = core;
            }
          }

          // Se categoria não vier, tentar inferir pela descrição (sinônimos/keywords)
          if (!args.category && args.description) {
            const norm = (s) => (s || '').toString().toLowerCase();
            const d = norm(args.description);
            const catHints = [
              // Casa (supermercados, mercado livre, eletrodomésticos, etc)
              { keys: ['mercado', 'supermercado', 'super', 'hiper', 'atacado', 'atacarejo', 'mercadolivre', 'magalu', 'amazon', 'casas bahia', 'tokstok', 'leroy', 'decoracao', 'decoração', 'limpeza', 'material limpeza'], target: 'Casa' },
              // Eletrodomésticos/Eletroportáteis → Casa
              { keys: ['ventilador', 'ar condicionado', 'microondas', 'micro-ondas', 'geladeira', 'freezer', 'liquidificador', 'batedeira', 'cafeteira', 'aspirador', 'ferro', 'maquina lavar', 'fogao', 'fogão', 'forno'], target: 'Casa' },
              // Eletrônicos de uso doméstico → Casa
              { keys: ['tv', 'televisao', 'televisão', 'som', 'home theater', 'notebook', 'tablet', 'monitor', 'mouse', 'teclado', 'computador', 'computadores', 'pc', 'desktop', 'laptop'], target: 'Casa' },
              // Alimentação (padarias, restaurantes, delivery, etc)
              { keys: ['padaria', 'padarias', 'restaurante', 'lanche', 'lanches', 'pizza', 'ifood', 'ubereats', 'rappi', 'sushi', 'açai', 'acai', 'cafeteria', 'cafe', 'almoço', 'almoco', 'jantar', 'delivery', 'pedido', 'comida', 'esfiha', 'hamburguer', 'hambúrguer', 'hot dog', 'cerveja', 'cervejas', 'bebida', 'bebidas', 'refrigerante', 'suco', 'agua', 'água', 'coquinha', 'pepsi', 'guarana', 'vitamina', 'smoothie', 'milk shake', 'milkshake', 'sorvete', 'doces', 'doce', 'bombom', 'chocolate', 'salgado', 'salgados', 'coxinha', 'pastel', 'empada', 'torta', 'bolo', 'pao', 'pão', 'baguete', 'croissant', 'massa', 'macarrao', 'macarrão', 'arroz', 'feijao', 'feijão', 'carne', 'frango', 'peixe', 'verdura', 'legume', 'fruta', 'frutas', 'acougue', 'açougue', 'peixaria', 'quitanda', 'hortifruti', 'frios', 'laticinios', 'laticínios', 'leite', 'queijo', 'iogurte', 'manteiga', 'margarina', 'pao de acucar', 'pao de açúcar', 'atacadao', 'atacadão', 'extra', 'carrefour', 'walmart', 'pipoca', 'pipocas'], target: 'Alimentação' },
              // Transporte
              { keys: ['posto', 'gasolina', 'etanol', 'combustivel', 'combustível', 'uber', '99', 'taxi', 'táxi', 'ônibus', 'onibus', 'metro', 'metrô', 'estacionamento', 'ipva', 'rodizio', 'rodízio', 'manutencao', 'manutenção', 'lava rapido', 'lava-rápido', 'oficina', 'seguro carro', 'pedagio', 'pedágio'], target: 'Transporte' },
              // Saúde
              { keys: ['farmácia', 'farmacia', 'remédio', 'remedio', 'remedios', 'medicamento', 'medicamentos', 'médico', 'medico', 'dentista', 'hospital', 'clinica', 'clínica', 'exame', 'consulta', 'laboratorio', 'laboratório', 'optica', 'óptica', 'oculos', 'óculos', 'academia', 'smartfit', 'gympass', 'suplemento', 'suplementos', 'fisioterapia', 'fonoaudiologia'], target: 'Saúde' },
              // Contas
              { keys: ['aluguel', 'condominio', 'condomínio', 'agua', 'água', 'luz', 'energia', 'gás', 'gas', 'internet', 'net', 'vivo', 'claro', 'tim', 'oi', 'telefone', 'celular', 'conta', 'boletos', 'iptu', 'ir', 'imposto', 'taxa', 'multas', 'detran'], target: 'Contas' },
              // Educação
              { keys: ['curso', 'cursos', 'faculdade', 'escola', 'livro', 'livraria', 'udemy', 'curso online', 'pluralsight', 'alura', 'material escolar', 'mensalidade'], target: 'Educação' },
              // Lazer (bar, balada, entretenimento, etc)
              { keys: ['cinema', 'teatro', 'show', 'balada', 'bar', 'parque', 'viagem', 'hotel', 'airbnb', 'ingresso', 'ingressos', 'netflix', 'spotify', 'prime', 'disney', 'hbo', 'globoplay', 'youtube premium', 'assinatura', 'streaming'], target: 'Lazer' },
              // Beleza
              { keys: ['cabelo', 'barbearia', 'barbeiro', 'manicure', 'pedicure', 'estetica', 'estética', 'cosmetico', 'cosmético', 'cosmeticos', 'cosméticos', 'maquiagem', 'salão', 'salao'], target: 'Beleza' },
              // Vestuário
              { keys: ['roupa', 'roupas', 'sapato', 'sapatos', 'tenis', 'tênis', 'camisa', 'camiseta', 'calca', 'calça', 'vestido', 'renner', 'riachuelo', 'cea', 'c&a', 'zara', 'h&m', 'nike', 'adidas', 'puma'], target: 'Vestuário' },
              // Pets
              { keys: ['petshop', 'pet shop', 'ração', 'racao', 'veterinario', 'veterinário', 'banho tosa', 'banho e tosa', 'pet'], target: 'Pets' }
            ];
            for (const hint of catHints) {
              if (hint.keys.some(k => d.includes(k))) {
                args.category = hint.target;
                break;
              }
            }
          }

          // Buscar category_id se tiver categoria (org + globais) com normalização e sinônimos
          let categoryId = null;
          if (args.category) {
            const normalize = (s) => (s || '')
              .toString()
              .trim()
              .toLowerCase()
              .normalize('NFD')
              .replace(/\p{Diacritic}+/gu, '');

            const inputCategory = normalize(args.category);

            // 1) Tentativa direta case-insensitive na org
            const { data: catCI } = await supabase
              .from('budget_categories')
              .select('id, name')
              .ilike('name', args.category)
              .eq('organization_id', context.organizationId)
              .maybeSingle();

            if (catCI) {
              categoryId = catCI.id;
              // Usar nome canônico (capitalização correta)
              args.category = catCI.name;
            } else {
              // 2) Tentativa nas globais (case-insensitive)
              const { data: globalCatCI } = await supabase
                .from('budget_categories')
                .select('id, name')
                .ilike('name', args.category)
                .is('organization_id', null)
                .maybeSingle();

              if (globalCatCI) {
                categoryId = globalCatCI.id;
                // Usar nome canônico (capitalização correta)
                args.category = globalCatCI.name;
              } else {
                // 3) Carregar todas as categorias válidas (org + globais) e fazer matching inteligente
                const [{ data: orgCatsAll }, { data: globalCatsAll }] = await Promise.all([
                  supabase
                    .from('budget_categories')
                    .select('id, name')
                    .eq('organization_id', context.organizationId)
                    .or('type.eq.expense,type.eq.both'),
                  supabase
                    .from('budget_categories')
                    .select('id, name')
                    .is('organization_id', null)
                    .or('type.eq.expense,type.eq.both')
                ]);

                const allCats = [...(orgCatsAll || []), ...(globalCatsAll || [])];
                const byNormalizedName = new Map();
                for (const c of allCats) {
                  byNormalizedName.set(normalize(c.name), c);
                }

                // Sinônimos → categoria canônica (dicionário expandido para cobertura máxima)
                const synonyms = [
                  // Suplementos (primeiro tentar "Suplementos", se não existir, fallback para "Saúde")
                  { 
                    keywords: ['whey', 'whey protein', 'creatina', 'proteína', 'proteina', 'proteina em po', 'proteína em pó', 'multivitaminico', 'multivitamínico', 'vitamina', 'vitaminas', 'suplemento', 'suplementos', 'suplemento alimentar', 'bcaa', 'glutamina', 'pre treino', 'pré treino', 'termogenico', 'termogênico', 'albumina', 'colageno', 'colágeno', 'omega 3', 'omega3'], 
                    target: 'Suplementos',
                    fallback: 'Saúde'
                  },
                  // Saúde
                  { keywords: ['farmacia', 'farmacia', 'remedio', 'remedios', 'remedio', 'medicamento', 'medicamentos', 'medico', 'medico', 'dentista', 'hospital', 'clinica', 'clinica', 'exame', 'consulta', 'laboratorio', 'laboratorio', 'optica', 'optica', 'oculos', 'oculos', 'academia', 'smartfit', 'gympass', 'fisioterapia', 'fonoaudiologia', 'psicologo', 'psicólogo', 'psiquiatra', 'remedio para', 'comprei remedio', 'fui na farmacia'], target: 'Saúde' },
                  // Alimentação (expandido MUITO para cobrir todas possibilidades)
                  { keywords: ['mercado', 'supermercado', 'super', 'hiper', 'padaria', 'padarias', 'lanche', 'lanches', 'restaurante', 'pizza', 'ifood', 'ubereats', 'rappi', 'iFood', 'sushi', 'açai', 'acai', 'cafeteria', 'cafe', 'almoço', 'almoco', 'jantar', 'delivery', 'pedido', 'comida', 'esfiha', 'hamburguer', 'hamburguer', 'hot dog', 'mcdonalds', 'mcdonald', 'burger king', 'subway', 'dominos', 'dominos pizza', 'bobs', 'habibs', 'bebida', 'bebidas', 'refrigerante', 'suco', 'cerveja', 'cervejas', 'agua', 'água', 'coquinha', 'pepsi', 'guarana', 'antartica', 'antarctica', 'vitamina', 'smoothie', 'milk shake', 'milkshake', 'sorvete', 'sorvetes', 'doces', 'doce', 'bombom', 'chocolate', 'chocolates', 'salgado', 'salgados', 'coxinha', 'coxinhas', 'pastel', 'pasteis', 'empada', 'empadas', 'torta', 'tortas', 'bolo', 'bolos', 'pao', 'pão', 'paes', 'pães', 'baguete', 'baguetes', 'croissant', 'massa', 'massas', 'macarrao', 'macarrão', 'arroz', 'feijao', 'feijão', 'carne', 'carnes', 'frango', 'peixe', 'peixes', 'verdura', 'verduras', 'legume', 'legumes', 'fruta', 'frutas', 'acougue', 'açougue', 'peixaria', 'quitanda', 'hortifruti', 'frios', 'laticinios', 'laticínios', 'leite', 'queijo', 'queijos', 'iogurte', 'iogurtes', 'manteiga', 'margarina', 'pao de acucar', 'pao de açúcar', 'atacadao', 'atacadão', 'extra', 'carrefour', 'walmart', 'big', 'copacabana', 'assai', 'atacarejo', 'makro', 'savegnago', 'comper', 'prezunic', 'zona sul', 'st marche', 'emporio sao paulo', 'emporio são paulo', 'pao de acucar', 'pao de açúcar', 'drogasil', 'raia', 'pague menos', 'drograria', 'farmácia', 'drogaria', 'balcao', 'balcão', 'lanchonete', 'chopperia', 'pizzaria', 'churrascaria', 'rodizio', 'rodízio', 'self service', 'buffet', 'fast food', 'cafeteria', 'café', 'cafe', 'confeteira', 'confeitaria', 'doceria', 'sorveteria', 'sorvete', 'taco bell', 'kfc', 'popeyes', 'outback', 'texas', 'applebees', 'chilli', 'olive garden', 'red lobster', 'buffalo wild wings', 'pipoca', 'pipocas'], target: 'Alimentação' },
                  // Transporte
                  { keywords: ['gasolina', 'combustivel', 'combustivel', 'posto', 'etanol', 'diesel', 'uber', '99', 'taxi', 'taxi', 'onibus', 'onibus', 'metro', 'metro', 'estacionamento', 'ipva', 'rodizio', 'rodizio', 'manutencao', 'manutencao', 'manutencao carro', 'manutencao carro', 'lava rapido', 'lava-rapido', 'oficina', 'seguro carro', 'pedagio', 'pedagio', 'mecanico', 'mecânico', 'guincho', 'reboque', 'combustivel', 'abasteci', 'enchi o tanque'], target: 'Transporte' },
                  // Contas (fixas)
                  { keywords: ['aluguel', 'condominio', 'condominio', 'agua', 'agua', 'luz', 'energia', 'gás', 'gas', 'internet', 'net', 'vivo', 'claro', 'tim', 'oi', 'telefone', 'celular', 'conta', 'boletos', 'iptu', 'ipva', 'ir', 'imposto', 'taxa', 'multas', 'detran', 'dar', 'financiamento', 'prestacao', 'prestação', 'cartao', 'cartão', 'fatura'], target: 'Contas' },
                  // Casa
                  { keywords: ['casa', 'lar', 'mercadolivre', 'magalu', 'casas bahia', 'tokstok', 'tok&stok', 'leroy', 'ferramenta', 'decoracao', 'decoração', 'limpeza', 'material limpeza', 'ventilador', 'ar condicionado', 'microondas', 'geladeira', 'tv', 'televisao', 'notebook', 'tablet', 'computador', 'computadores', 'pc', 'desktop', 'laptop'], target: 'Casa' },
                  // Educação
                  { keywords: ['curso', 'cursos', 'faculdade', 'escola', 'livro', 'livraria', 'udemy', 'curso online', 'pluralsight', 'alura', 'material escolar', 'mensalidade', 'universidade', 'escola', 'faculdade', 'apostila', 'caneta', 'caderno'], target: 'Educação' },
                  // Lazer
                  { keywords: ['cinema', 'teatro', 'show', 'balada', 'parque', 'viagem', 'hotel', 'airbnb', 'ingresso', 'ingressos', 'netflix', 'spotify', 'prime', 'disney', 'hbo', 'globoplay', 'youtube premium', 'assinatura', 'streaming', 'festa', 'aniversario', 'aniversário', 'bar', 'balada', 'clube'], target: 'Lazer' },
                  // Beleza
                  { keywords: ['cabelo', 'barbearia', 'barbeiro', 'manicure', 'pedicure', 'estetica', 'estetica', 'cosmetico', 'cosmetico', 'cosmeticos', 'cosmeticos', 'maquiagem', 'salão', 'salao', 'corte', 'pintar cabelo', 'make'], target: 'Beleza' },
                  // Vestuário
                  { keywords: ['roupa', 'roupas', 'sapato', 'sapatos', 'tenis', 'tenis', 'camisa', 'camiseta', 'calca', 'calça', 'vestido', 'renner', 'riachuelo', 'cea', 'c&a', 'zara', 'h&m', 'nike', 'adidas', 'puma', 'shopping', 'loja'], target: 'Vestuário' },
                  // Pets
                  { keywords: ['petshop', 'pet shop', 'ração', 'racao', 'veterinario', 'veterinario', 'banho tosa', 'banho e tosa', 'pet', 'gato', 'cachorro', 'animal'], target: 'Pets' },
                  // Assinaturas/Streaming (já está em Lazer, mas reforça)
                  { keywords: ['netflix', 'spotify', 'prime', 'disney', 'hbo', 'globoplay', 'youtube premium', 'assinatura', 'streaming', 'disney+'], target: 'Lazer' },
                  // Fitness (treino, academia - não suplementos, que já estão em Suplementos acima)
                  { keywords: ['academia', 'smartfit', 'gympass', 'treino', 'personal', 'personal trainer'], target: 'Saúde' },
                  // Impostos e taxas (já está em Contas)
                  { keywords: ['iptu', 'ipva', 'ir', 'imposto', 'taxa', 'multas', 'detran', 'dar', 'licenciamento'], target: 'Contas' },
                  // Presentes/Doações
                  { keywords: ['presente', 'presentes', 'doacao', 'doação', 'vaquinha', 'aniversario', 'aniversário'], target: 'Outros' }
                ];

                // 3a) Tentar sinônimos pelo texto informado (com fallback para categorias que têm fallback)
                let resolvedName = null;
                for (const group of synonyms) {
                  if (group.keywords.some(k => inputCategory.includes(k))) {
                    const targetNorm = normalize(group.target);
                    if (byNormalizedName.has(targetNorm)) {
                      resolvedName = byNormalizedName.get(targetNorm).name;
                      categoryId = byNormalizedName.get(targetNorm).id;
                      break;
                    } else if (group.fallback) {
                      // Tentar fallback se a categoria principal não existir
                      const fallbackNorm = normalize(group.fallback);
                      if (byNormalizedName.has(fallbackNorm)) {
                        resolvedName = byNormalizedName.get(fallbackNorm).name;
                        categoryId = byNormalizedName.get(fallbackNorm).id;
                        break;
                      }
                    }
                  }
                }

                // 3b) Caso específico: "farmacia" sem "Saúde" disponível → cair para "Casa" se existir
                if (!categoryId && inputCategory.includes('farmacia')) {
                  const casa = byNormalizedName.get(normalize('Casa'));
                  if (casa) {
                    categoryId = casa.id;
                    resolvedName = casa.name;
                  }
                }

                // 3c) Matching por similaridade simples (substring) entre nomes normalizados
                if (!categoryId) {
                  const match = allCats.find(c => normalize(c.name).includes(inputCategory) || inputCategory.includes(normalize(c.name)));
                  if (match) {
                    categoryId = match.id;
                    resolvedName = match.name;
                  }
                }

                // 3d) Se ainda não achou, não perguntar novamente — use "Outros" se existir
                if (!categoryId) {
                  const outros = byNormalizedName.get(normalize('Outros'))
                    || byNormalizedName.get(normalize('Outras'));
                  if (outros) {
                    categoryId = outros.id;
                    resolvedName = outros.name;
                  }
                }

                // Atualizar args.category para refletir a resolução, se houver
                if (categoryId && resolvedName) {
                  args.category = resolvedName;
                }

                // Se mesmo assim não encontrou, manter null (sem quebrar o fluxo)
              }
            }
          }
          
          // VALIDAÇÃO OBRIGATÓRIA: categoria é obrigatória - não pode salvar sem categoria
          if (!args.category || !categoryId) {
            // Tentar usar "Outros" como fallback apenas se existir
            if (!categoryId) {
              const normalize = (s) => (s || '')
                .toString()
                .trim()
                .toLowerCase()
                .normalize('NFD')
                .replace(/\p{Diacritic}+/gu, '');
              
              const [{ data: orgCats }, { data: globalCats }] = await Promise.all([
                supabase
                  .from('budget_categories')
                  .select('id, name')
                  .eq('organization_id', context.organizationId)
                  .or('type.eq.expense,type.eq.both'),
                supabase
                  .from('budget_categories')
                  .select('id, name')
                  .is('organization_id', null)
                  .or('type.eq.expense,type.eq.both')
              ]);
              
              const allCats = [...(orgCats || []), ...(globalCats || [])];
              const byNorm = new Map();
              for (const c of allCats) {
                byNorm.set(normalize(c.name), c);
              }
              
              const outros = byNorm.get(normalize('Outros')) || byNorm.get(normalize('Outras'));
              
              if (outros) {
                categoryId = outros.id;
                args.category = outros.name;
              } else {
                // Se não existe "Outros", PERGUNTAR categoria (obrigatória)
                const categoryNames = allCats.map(c => c.name).filter(Boolean);
                const firstName = this.getFirstName(context);
                const namePart = firstName ? ` ${firstName}` : '';
                
                const categoryQuestions = [
                  `Preciso saber a categoria${namePart}. Qual é?`,
                  `Qual categoria${namePart}?`,
                  `Me diz a categoria${namePart}?`,
                  `Categoria${namePart}?`
                ];
                
                return {
                  success: false,
                  message: `${this.pickVariation(categoryQuestions, 'categoria')}${categoryNames.length > 0 ? `\n\nDisponíveis: ${categoryNames.slice(0, 10).join(', ')}${categoryNames.length > 10 ? '...' : ''}` : ''}`
                };
              }
            }
          }
          
          // Subfluxo de cartão de crédito: exigir cartão e parcelas antes de salvar
          let cardId = null;
          if (paymentMethod === 'credit_card') {
            // Se não informou o cartão ainda, perguntar primeiro
            if (!args.card_name || String(args.card_name).trim() === '') {
              const firstName = this.getFirstName(context);
              const namePart = firstName ? ` ${firstName}` : '';
              
              const cardQuestions = [
                `Beleza${namePart}! Qual cartão?`,
                `Show${namePart}! Qual foi o cartão?`,
                `Qual cartão você usou${namePart}?`,
                `Me diz qual cartão${namePart}?`,
                `Qual cartão${namePart}?`,
                `Me fala qual cartão${namePart}?`,
                `Preciso saber qual cartão${namePart}`,
                `Foi em qual cartão${namePart}?`,
                `Qual cartão você usou${namePart}?`,
                `Me conta qual cartão${namePart}?`
              ];
              return {
                success: false,
                message: this.pickVariation(cardQuestions, 'cartao')
              };
            }

            // Se não informou parcelas, perguntar em seguida
            if (!args.installments || Number(args.installments) < 1) {
              const firstName = this.getFirstName(context);
              const namePart = firstName ? ` ${firstName}` : '';
              
              const installmentQuestions = [
                `E em quantas parcelas${namePart}?`,
                `Quantas vezes${namePart}?`,
                `Foi parcelado${namePart}? Quantas vezes?`,
                `Me diz quantas parcelas${namePart}?`,
                `Quantas parcelas foram${namePart}?`,
                `Foi à vista ou parcelado${namePart}?`,
                `Me fala quantas vezes${namePart}?`,
                `Quantas parcelas${namePart}?`,
                `Foi parcelado em quantas vezes${namePart}?`,
                `Preciso saber quantas parcelas${namePart}`,
                `Quantas vezes você parcelou${namePart}?`,
                `Foi em quantas vezes${namePart}?`
              ];
              return {
                success: false,
                message: this.pickVariation(installmentQuestions, args.card_name || 'parcelas')
              };
            }

            const { data: cards } = await supabase
              .from('cards')
              .select('id, name')
              .eq('organization_id', context.organizationId)
              .eq('is_active', true);

            const cardNorm = this.normalizeText(args.card_name);
            let foundCard = null;
            if (cards && cards.length) {
              const byNorm = new Map();
              for (const c of cards) byNorm.set(this.normalizeText(c.name), c);
              foundCard = byNorm.get(cardNorm);
              if (!foundCard) {
                foundCard = cards.find(c => {
                  const n = this.normalizeText(c.name);
                  return n.includes(cardNorm) || cardNorm.includes(n);
                });
              }
            }

            if (foundCard) {
              cardId = foundCard.id;
              args.card_name = foundCard.name;
            } else {
              // Cartão não encontrado - listar opções disponíveis
              const { data: allActiveCards } = await supabase
                .from('cards')
                .select('name')
                .eq('organization_id', context.organizationId)
                .eq('is_active', true);

              const cardsList = allActiveCards?.map(c => c.name).join(', ') || 'nenhum cartão cadastrado';
              const firstName = this.getFirstName(context);
              const namePart = firstName ? ` ${firstName}` : '';
              
              const errorMessages = [
                `Não encontrei esse cartão${namePart}. Disponíveis: ${cardsList}. Qual cartão?`,
                `Esse cartão não tá cadastrado${namePart}. Tenho aqui: ${cardsList}. Qual foi?`,
                `Hmm, não achei esse cartão${namePart}. Os disponíveis são: ${cardsList}. Qual você usou?`,
                `Esse cartão não existe aqui${namePart}. Tenho: ${cardsList}. Qual foi?`,
                `Não reconheci esse cartão${namePart}. Disponíveis: ${cardsList}. Qual?`,
                `Não achei esse cartão no sistema${namePart}. Os que tenho são: ${cardsList}. Qual você usou?`,
                `Esse cartão não tá no cadastro${namePart}. Aqui tem: ${cardsList}. Qual foi?`,
                `Cartão não encontrado${namePart}. Disponíveis: ${cardsList}. Qual?`
              ];
              return {
                success: false,
                message: this.pickVariation(errorMessages, args.card_name || 'erro_cartao')
              };
            }
          }
          
          // Extrair número de parcelas se for crédito
          const installments = paymentMethod === 'credit_card' && args.installments 
            ? Number(args.installments) 
            : 1;
          
          // Se for parcelada (>1), calcular valor da parcela
          const installmentAmount = installments > 1 
            ? Math.round((amount / installments) * 100) / 100 
            : amount;
          
          // Preparar installment_info se for parcelada
          let installmentInfo = null;
          if (paymentMethod === 'credit_card' && installments > 1) {
            installmentInfo = {
              total_installments: installments,
              current_installment: 1,
              installment_amount: installmentAmount,
              total_amount: amount
            };
          }
          
          // Validação final: garantir que nunca salve sem categoria
          if (!args.category || !categoryId) {
            console.error('❌ [SAVE] Tentativa de salvar sem categoria!', { category: args.category, categoryId });
            return {
              success: false,
              message: 'Ops! Preciso saber a categoria. Qual é?'
            };
          }
          
          // Se for cartão de crédito parcelado, usar função RPC create_installments
          if (paymentMethod === 'credit_card' && installments > 1 && cardId) {
            console.log('💳 [SAVE] Criando parcelas usando RPC create_installments');
            
            // Garantir que owner seja "Compartilhado" quando compartilhado
            const ownerForRPC = isShared ? 'Compartilhado' : owner;
            
            const rpcParams = {
              p_amount: Number(amount),
              p_installments: Number(installments),
              p_description: this.capitalizeDescription(args.description),
              p_date: new Date().toISOString().split('T')[0],
              p_card_id: cardId,
              p_category_id: categoryId,
              p_cost_center_id: costCenterId, // null quando compartilhado
              p_owner: ownerForRPC,
              p_organization_id: context.organizationId,
              p_user_id: context.userId || userId,
              p_whatsapp_message_id: `msg_${Date.now()}`
            };
            
            console.log('💾 [SAVE] Chamando RPC create_installments com:', rpcParams);
            
            const { data: parentExpenseId, error: rpcError } = await supabase.rpc('create_installments', rpcParams);
            
            if (rpcError) {
              console.error('❌ [SAVE] Erro ao criar parcelas:', rpcError);
              throw rpcError;
            }
            
            console.log('✅ [SAVE] Parcelas criadas com sucesso. Parent ID:', parentExpenseId);
            
            // Atualizar metadados adicionais (source e whatsapp_message_id) em todas as parcelas
            const metadataUpdate = {
              source: 'whatsapp',
              whatsapp_message_id: rpcParams.p_whatsapp_message_id
            };
            
            const { error: metadataError } = await supabase
              .from('expenses')
              .update(metadataUpdate)
              .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
            
            if (metadataError) {
              console.warn('⚠️ [SAVE] Erro ao atualizar metadados das parcelas:', metadataError);
            } else {
              console.log('✅ [SAVE] Metadados atualizados (source=whatsapp)');
            }
            
            // Atualizar owner para o nome correto se for compartilhado (a função já criou com "Compartilhado")
            if (isShared && ownerForRPC !== owner) {
              const { error: updateError } = await supabase
                .from('expenses')
                .update({ 
                  owner: owner,
                  is_shared: true 
                })
                .or(`id.eq.${parentExpenseId},parent_expense_id.eq.${parentExpenseId}`);
              
              if (updateError) {
                console.warn('⚠️ [SAVE] Erro ao atualizar owner das parcelas:', updateError);
              }
            }
            
            // Atualizar available_limit do cartão (decrementar o valor total da compra)
            try {
              const { data: card } = await supabase
                .from('cards')
                .select('available_limit, credit_limit')
                .eq('id', cardId)
                .single();
              
              if (card) {
                const currentAvailable = parseFloat(card.available_limit || card.credit_limit || 0);
                const newAvailable = Math.max(0, currentAvailable - Number(amount));
                
                await supabase
                  .from('cards')
                  .update({ available_limit: newAvailable })
                  .eq('id', cardId);
                
                console.log('✅ [SAVE] Updated card available_limit:', newAvailable);
              }
            } catch (cardUpdateError) {
              console.error('⚠️ [SAVE] Erro ao atualizar limite disponível do cartão:', cardUpdateError);
            }
            
            // Usar parentExpenseId como data.id para continuar o fluxo
            var data = { id: parentExpenseId };
          } else {
            // Despesa simples (não parcelada) ou não é cartão de crédito
            const expenseData = {
              amount: amount,
              description: this.capitalizeDescription(args.description),
              date: new Date().toISOString().split('T')[0],
              category: args.category,
              category_id: categoryId,
              owner: owner,
              cost_center_id: costCenterId,
              payment_method: paymentMethod,
              card_id: cardId || null,
              organization_id: context.organizationId,
              user_id: context.userId || userId,
              status: 'confirmed',
              is_shared: isShared || false,
              confirmed_at: new Date().toISOString(),
              confirmed_by: context.userId || userId,
              source: 'whatsapp',
              whatsapp_message_id: `msg_${Date.now()}`
            };
            
            console.log('💾 [SAVE] Salvando despesa simples com dados:', JSON.stringify(expenseData, null, 2));
            
            const { data: expenseDataResult, error } = await supabase
              .from('expenses')
              .insert(expenseData)
              .select()
              .single();
            
            if (error) {
              console.error('❌ Erro ao salvar:', error);
              throw error;
            }
            
            console.log('✅ Despesa salva:', expenseDataResult.id);
            data = expenseDataResult;
          }

          const amountFormatted = Number(amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          const paymentDisplayMap = {
            'credit_card': 'Cartão de Crédito',
            'debit_card': 'Débito',
            'pix': 'Pix',
            'cash': 'Dinheiro',
            'bank_transfer': 'Transferência',
            'boleto': 'Boleto',
            'other': 'Outro'
          };
          // Adicionar informações de parcelas ao paymentDisplay se for parcelada
          let paymentDisplay = paymentDisplayMap[paymentMethod] || paymentMethod;
          if (paymentMethod === 'credit_card' && installments > 1) {
            const cardName = args.card_name || 'Cartão';
            paymentDisplay = `${paymentDisplay} • ${cardName} ${installments}x`;
          }

          // Data formatada (pt-BR). Usa a data atual (hoje)
          const savedDate = new Date().toISOString().split('T')[0];
          const dateObj = new Date(savedDate + 'T00:00:00');
          const isToday = (() => {
            const today = new Date();
            return dateObj.toDateString() === today.toDateString();
          })();
          const dateDisplay = isToday ? 'Hoje' : dateObj.toLocaleDateString('pt-BR');

          // Gerar mensagem de confirmação variada e conversacional
          const greetings = [
            'Anotado! ✅',
            'Registrado! ✅',
            'Tudo certo! ✅',
            'Pronto! ✅',
            'Beleza, anotei! ✅',
            'Show, registrei! ✅',
            'Joia, tá salvo! ✅'
          ];
          
          const firstName = context.userName ? context.userName.split(' ')[0] : '';
          const greeting = greetings[Math.floor(Math.random() * greetings.length)];
          
          // Gerar frase contextual baseada na categoria/descrição
          const contextualMessage = this.generateContextualMessage(args.description, args.category, paymentMethod);
          
          // Criar mensagem mais natural e legível (com quebras de linha)
          let confirmationMsg = `${greeting}\nR$ ${amountFormatted} - ${args.description}\n${args.category || 'Sem categoria'}\n${paymentDisplay}\n${owner}\n${dateDisplay}`;
          
          // Adicionar mensagem contextual se houver
          if (contextualMessage) {
            confirmationMsg += `\n\n${contextualMessage}`;
          }

          return {
            success: true,
            message: confirmationMsg,
            expense_id: data.id
          };
        } catch (error) {
          console.error('❌ Erro ao salvar despesa:', error);
          const firstName = this.getFirstName(context);
          const namePart = firstName ? ` ${firstName}` : '';
          
          const errorMessages = [
            `Ops${namePart}! Tive um problema ao salvar. 😅`,
            `Eita${namePart}, algo deu errado aqui. 😅`,
            `Poxa${namePart}, tive um erro ao registrar. 😅`,
            `Ops${namePart}, algo deu errado. 😅`,
            `Eita${namePart}, tive um problema aqui. 😅`,
            `Poxa${namePart}, não consegui salvar. 😅`,
            `Desculpa${namePart}, algo deu errado. 😅`,
            `Ops${namePart}, erro ao registrar. 😅`
          ];
          return {
            success: false,
            message: this.pickVariation(errorMessages, 'erro')
          };
        }
      };
    }
    try {
      console.log('💬 [GPT-4] Iniciando conversa...');
      
      // Carregar histórico da conversa do banco
      const history = await this.loadConversationHistory(userPhone);
      
      // Extrair informações já coletadas do histórico
      const collectedInfo = this.extractCollectedInfo(history);
      console.log('📊 [GPT-4] Informações coletadas:', JSON.stringify(collectedInfo));
      
      // Detectar primeira mensagem (histórico vazio ou muito antigo)
      const isFirstMessage = history.length === 0;
      
      // Adicionar contexto de informações coletadas ao system message
      let systemMessage = this.getConversationalInstructions(context);
      
      if (isFirstMessage) {
        systemMessage += `\n\n🌅 PRIMEIRA MENSAGEM: Cumprimente ${context.userName?.split(' ')[0] || 'o usuário'} de forma calorosa antes de começar!`;
      }
      
      // Se tiver informações coletadas, dizer ao GPT para verificar
      if (Object.keys(collectedInfo).length > 0) {
        systemMessage += `\n\n📝 INFORMAÇÕES JÁ COLETADAS NESTA CONVERSA:\n`;
        if (collectedInfo.amount) systemMessage += `- Valor: R$ ${collectedInfo.amount}\n`;
        if (collectedInfo.description) systemMessage += `- Descrição: ${collectedInfo.description}\n`;
        if (collectedInfo.payment_method) systemMessage += `- Pagamento: ${collectedInfo.payment_method}\n`;
        if (collectedInfo.responsible) systemMessage += `- Responsável: ${collectedInfo.responsible}\n`;
        if (collectedInfo.card) systemMessage += `- Cartão: ${collectedInfo.card}\n`;
        if (collectedInfo.installments) systemMessage += `- Parcelas: ${collectedInfo.installments}\n`;
        
        const missing = [];
        if (!collectedInfo.amount) missing.push('valor');
        if (!collectedInfo.description) missing.push('descrição');
        if (!collectedInfo.payment_method) missing.push('pagamento');
        if (!collectedInfo.responsible) missing.push('responsável');
        
        if (missing.length > 0) {
          systemMessage += `\n⚠️ FALTA: ${missing.join(', ')}`;
        } else {
          systemMessage += `\n✅ TUDO COLETADO! Chame save_expense AGORA!`;
        }
      }
      
      // Preparar mensagens para GPT-4
      const messages = [
        {
          role: 'system',
          content: systemMessage
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
        temperature: 0.6, // Natural e consistente
        top_p: 1.0,
        frequency_penalty: 0.25, // Evita repetição
        presence_penalty: 0.05,
        max_tokens: 150 // Aumentado para permitir function calls
      });
      
      const assistantMessage = completion.choices[0].message;
      
      // Se chamou função
      if (assistantMessage.function_call) {
        console.log('🔧 [GPT-4] Function call:', assistantMessage.function_call.name);
        
        const functionName = assistantMessage.function_call.name;
        const functionArgs = JSON.parse(assistantMessage.function_call.arguments);
        
        const functionResult = await this.handleFunctionCall(functionName, functionArgs, context);
        
        // Se salvou despesa ou entrada, limpar histórico e retornar APENAS mensagem da função
        if (functionName === 'save_expense' || functionName === 'save_income' || functionName === 'save_bill') {
          await this.clearConversationHistory(userPhone);
          
          // Retornar APENAS a mensagem da função (ignorar qualquer texto que o GPT escreveu)
          return functionResult.message || (functionName === 'save_income' ? 'Entrada registrada! ✅' : 'Anotado! ✅');
        }
        
        // Funções de resumo/consulta: retornar mensagem sem limpar histórico (permite continuar conversa)
        if (functionName === 'get_expenses_summary' || functionName === 'get_category_summary' || functionName === 'get_account_balance') {
          return functionResult.message || 'Não consegui buscar a informação. 😅';
        }
        
        // Outras funções: não deveriam acontecer aqui
        return functionResult.message || 'Funcionou!';
      }
      
      // Resposta normal sem function call
      const response = assistantMessage.content;
      
      // Filtrar mensagens técnicas que o GPT às vezes escreve
      const cleanedResponse = response.replace(/\[CHAMANDO.*?\]/gi, '').replace(/\[.*?AGORA.*?\]/gi, '').trim();
      
      // Salvar no histórico
      console.log('💾 [GPT-4] Salvando no histórico: user="' + userMessage + '", assistant="' + cleanedResponse + '"');
      await this.saveToHistory(userPhone, userMessage, cleanedResponse);
      
      return cleanedResponse || response;
      
    } catch (error) {
      console.error('❌ [GPT-4] Erro:', error);
      throw error;
    }
  }

  /**
   * Extrair informações já coletadas do histórico
   */
  extractCollectedInfo(history) {
    const info = {};
    
    // Considerar apenas a última mensagem do usuário, para evitar inferências antigas
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
    const conversationText = (lastUserMsg?.content || '').toLowerCase();
    
    // Extrair valor
    const amountMatch = conversationText.match(/(?:gastei|paguei|foi|valor)?\s*(?:r\$)?\s*(\d+(?:[.,]\d{1,2})?)/i);
    if (amountMatch) {
      info.amount = parseFloat(amountMatch[1].replace(',', '.'));
    }
    
    // Extrair descrição: usar núcleo descritivo da última mensagem
    const core = this.extractCoreDescription(conversationText);
    if (core) {
      info.description = this.capitalizeDescription(core);
    }
    
    // Extrair forma de pagamento
    if (conversationText.includes('pix')) info.payment_method = 'pix';
    else if (conversationText.includes('dinheiro') || conversationText.includes('cash')) info.payment_method = 'dinheiro';
    else if (conversationText.includes('débito') || conversationText.includes('debito')) info.payment_method = 'débito';
    else if (conversationText.includes('crédito') || conversationText.includes('credito')) info.payment_method = 'crédito';
    
    // Extrair responsável apenas se explicitamente citado na última mensagem
    if (conversationText.match(/\b(eu|eu mesmo|fui eu)\b/)) {
      info.responsible = 'eu';
    } else if (conversationText.includes('compartilhado')) {
      info.responsible = 'Compartilhado';
    }
    
    return info;
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
          state: 'awaiting_confirmation', // Estado genérico para conversa ativa
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
    const { userName, organizationId, availableCards } = context;
    const firstName = userName ? userName.split(' ')[0] : 'você';
    const cardsList = availableCards?.join(', ') || 'Nubank, C6';
    
    return `Você é o ZUL, o assistente financeiro do MeuAzulão. Seu objetivo primário é registrar despesas de forma rápida e conversacional via WhatsApp, utilizando as ferramentas de função disponíveis.

PERSONALIDADE: Sábio Jovem. Seu tom é **calmo, claro, genuinamente prestativo e inspirador**. Fale como um amigo inteligente que ajuda a família a ter mais controle financeiro. Use um português brasileiro **NATURAL e VARIADO**.

REGRAS CRÍTICAS PARA CONVERSAÇÃO FLUÍDA:

1.  **VARIAÇÃO RADICAL**: Mude o estilo de cada resposta (direto, casual, formal, contextual). NUNCA repita a mesma frase ou estrutura de pergunta.
2.  **CONCISÃO MÁXIMA**: Responda com **1 linha** sempre que possível. Use no máximo 2 linhas em casos de confirmação ou contexto. O WhatsApp exige rapidez.
3.  **INFERÊNCIA ATIVA E EXTRAÇÃO COMPLETA**: Se o usuário fornecer informações na primeira mensagem, EXTRAIA TODAS as informações disponíveis antes de perguntar qualquer coisa. Exemplos:
   - "1500 em 5x no credito Latam" → EXTRAIA: valor=1500, parcelas=5, pagamento=crédito, cartão=Latam → Pergunte APENAS: descrição e responsável
   - "comprei uma televisao por 1500 reais em 5x no credito Latam" → EXTRAIA: valor=1500, descrição=televisao, parcelas=5, pagamento=crédito, cartão=Latam, responsável=eu (verbo "comprei" indica individual) → Chame save_expense DIRETO
   - "pagamos 100 no mercado" → EXTRAIA: valor=100, descrição=mercado, responsável=compartilhado (verbo "pagamos" indica compartilhado) → Pergunte APENAS: método de pagamento
   - "100 no mercado, débito" → EXTRAIA: valor=100, descrição=mercado, pagamento=débito → Pergunte APENAS: responsável
   - "50 na farmácia, pix, Felipe" → EXTRAIA TUDO → Chame save_expense DIRETO (não pergunte nada)
   **REGRA CRÍTICA**: Se a mensagem mencionar "crédito", "crédito X", "no crédito", "cartão X", "X em Yx" (parcelas), EXTRAIA essas informações automaticamente. NÃO pergunte novamente informações que já estão na mensagem.
   
   **DETECÇÃO AUTOMÁTICA DE RESPONSÁVEL PELOS VERBOS**:
   - **VERBOS INDIVIDUAIS** (responsável = usuário/eu): paguei, comprei, gastei, investi, doei, emprestei, peguei, peguei emprestado, fiz, adquiri, contratei, assinei, me inscrevi, me matriculei, fui em, fui ao, fui na, fui no, fui à, fui no, comprei para mim, gastei comigo, paguei minha, paguei meu, comprei minha, comprei meu, anotei, registrei, lancei, adicionei, coloquei, botei, inseri, incluí, adicionei minha, adicionei meu
   - **VERBOS COMPARTILHADOS** (responsável = compartilhado): pagamos, compramos, gastamos, investimos, fizemos, adquirimos, contratamos, assinamos, nos inscrevemos, nos matriculamos, fomos em, fomos ao, fomos na, fomos no, fomos à, fomos no, compramos para, gastamos com, pagamos nossa, pagamos nosso, compramos nossa, compramos nosso, anotamos, registramos, lançamos, adicionamos, colocamos, botamos, inserimos, incluímos, adicionamos nossa, adicionamos nosso
   - Se o verbo for individual, INFIRA automaticamente responsável="eu" (será mapeado para o nome do usuário)
   - Se o verbo for compartilhado, INFIRA automaticamente responsável="compartilhado"
   
   **SINÔNIMOS DE DESPESA/GASTO** (para identificar save_expense):
   - paguei, pagamos, comprei, compramos, gastei, gastamos, investi, investimos, doei, doamos, emprestei, emprestamos, peguei, pegamos, fiz, fizemos, adquiri, adquirimos, contratei, contratamos, assinei, assinamos, me inscrevi, nos inscrevemos, me matriculei, nos matriculamos, fui em, fomos em, fui ao, fomos ao, fui na, fomos na, fui no, fomos no, fui à, fomos à, anotei, anotamos, registrei, registramos, lancei, lançamos, adicionei, adicionamos, coloquei, colocamos, botei, botamos, inseri, inserimos, incluí, incluímos, despesa, despesas, gasto, gastos, pagamento, pagamentos, compra, compras, conta, contas, débito, débitos, saída, saídas, saque, saques, retirada, retiradas
4.  **SEM EMOJIS NAS PERGUNTAS**: NUNCA use emojis nas perguntas. Emojis apenas na confirmação final (que vem automaticamente da função save_expense).
5.  **MANUTENÇÃO DE CONTEXTO**: NUNCA repita perguntas já respondidas ou informações já fornecidas. Se o usuário já mencionou algo na mensagem inicial, NÃO pergunte novamente.
6.  **INFERÊNCIA DE CATEGORIA**: INFIRA automaticamente quando tiver CERTEZA:
   - **Suplementos** (preferencial, se existir na organização. Se não existir, usar "Saúde"): whey, whey protein, creatina, proteína, proteína em pó, multivitamínico, vitamina, suplemento, suplemento alimentar, bcaa, glutamina, pré treino, termogênico, albumina, colágeno, omega 3
   - Alimentação: padaria, restaurante, lanche, pizza, ifood, delivery, comida, bebida, cerveja, suco, açougue, peixaria, frutas, verduras, pipoca
   - Saúde: remédio, farmácia, médico, dentista, hospital, consulta, exame, laboratório, óculos, academia, fisioterapia, psicólogo, psiquiatra
   - Transporte: posto, gasolina, combustível, uber, taxi, ônibus, metro, estacionamento, ipva, oficina, manutenção
   - Casa: mercado/supermercado (compras), eletrodomésticos, eletrônicos (tv, notebook, computador, tablet), móveis, decoração, limpeza
   - Contas: aluguel, condomínio, água, luz, energia, internet, telefone, iptu, imposto
   - Lazer: cinema, teatro, show, balada, **bar**, parque, viagem, hotel, netflix, spotify, streaming
   - Beleza: cabelo, barbearia, manicure, pedicure, salão, cosmético
   - Vestuário: roupa, sapato, tênis, camisa
   - Educação: curso, faculdade, escola, livro
   - Pets: petshop, ração, veterinário
   - Se NÃO TIVER CERTEZA, OBRIGATORIAMENTE PERGUNTE (categoria é obrigatória - nunca salve sem)
7.  **SALVAMENTO AUTOMÁTICO E CONFIRMAÇÃO DE VALORES ALTOS**: 
   - Chame a função save_expense **IMEDIATAMENTE** quando tiver: valor, descrição, pagamento, e responsável. NÃO ESCREVA NADA além da chamada da função.
   - **EXCEÇÃO CRÍTICA PARA ÁUDIO**: Se a mensagem veio de uma transcrição de áudio (você saberá pelo contexto ou histórico) E o valor for R$ 500 ou mais, SEMPRE pergunte confirmação antes de chamar save_expense:
     * Exemplo: "Confirma R$ 650 no mercado?" ou "Foi R$ 650 mesmo?" ou "Confirmo que foi R$ 650?"
     * Aguarde confirmação do usuário antes de chamar save_expense
     * Isso evita erros de transcrição de áudio onde números podem ser mal interpretados (ex: "150" pode ser transcrito como "650")
   - **CONFIRMAÇÃO PARA VALORES MUITO ALTOS**: Mesmo para mensagens de texto, se o valor for R$ 1000 ou mais, considere pedir confirmação para evitar erros de digitação
8.  **SUBFLUXO DE CRÉDITO**: Se pagamento = crédito → OBRIGATÓRIO perguntar nome do cartão e parcelas ANTES de chamar save_expense.
9.  **RESPOSTAS NATURAIS**: Responda naturalmente a agradecimentos ("obrigado", "valeu", "brigado"), confirmações ("entendi", "ok", "beleza"), e conversas casuais. NÃO redirecione agradecimentos - apenas responda calorosamente: "Por nada, ${firstName}!", "Tamo junto!", "Disponha!", etc.
10. **PERGUNTAS CASUAIS**: Use linguagem descontraída e VARIE muito:
   - Para pagamento: "Pagou como?", "Como foi o pagamento?", "De que forma pagou?", "Como você pagou?"
   - **NÃO liste opções na primeira pergunta de pagamento** (ex: "Foi pix, dinheiro ou cartão?") - pergunte apenas de forma aberta
   - Liste opções APENAS se o usuário perguntar explicitamente (ex: "quais temos?") ou após resposta inválida
   - Para responsável: "Quem pagou?", "Foi você?", "Quem foi?", "Pra quem foi essa?", "Foi você ou alguém?", "Quem arcou com essa?"
   - EVITE frases formais como "E quem foi o responsável pela despesa?" - seja mais casual e direto
   - **NUNCA use emojis nas perguntas** - emojis apenas na confirmação final (que vem da função)
11. **VARIAÇÃO DE SAUDAÇÃO INICIAL**: Se o usuário chamar pelo nome ("Zul", "Oi Zul"), VARIE completamente a resposta: "E aí, ${firstName}!", "Opa, ${firstName}! Tudo certo?", "Oi, ${firstName}! O que tá pegando?", "E aí! Como posso ajudar?", "Tudo certo, ${firstName}?", "Opa! Precisa de alguma coisa?", "Oi! Tudo bem?", "E aí! Qual foi o gasto hoje?", etc.
12. **TRATAMENTO DE DESVIO**: Se a mensagem for totalmente fora de contexto (ex: pergunta sobre clima, política, etc.) e você não souber responder, aí sim redirecione gentilmente: "Opa, ${firstName}! Não tenho acesso a isso, mas to aqui pra te ajudar com as despesas. Gastei algo hoje?"
13. **SOBRE VOCÊ**: Se perguntarem "quem é você?", "o que você faz?", "como você pode ajudar?", etc., responda naturalmente: "Sou o Zul, assistente financeiro do MeuAzulão! To aqui pra te ajudar a organizar suas despesas rapidinho pelo WhatsApp."
${process.env.USE_INCOME_FEATURE === 'true' ? `
14. **REGISTRAR ENTRADAS/RECEITAS**: Quando o usuário mencionar valores recebidos, chame a função save_income. SINÔNIMOS E VOCABULÁRIO BRASILEIRO:
   - **SINÔNIMOS DE RECEITA/ENTRADA**: recebi, recebemos, entrou, entraram, caiu, caíram, creditou, creditaram, depositou, depositaram, transferiu, transferiram, pagaram (para mim), me pagaram, me transferiram, me depositaram, me creditaram, ganhei, ganhamos, conquistamos, obtive, obtivemos, consegui, conseguimos, salário, comissão, bonus, bônus, prêmio, premiação, venda, vendemos, vendi, freelance, freela, freela, pagamento, pagamento recebido, dinheiro que entrou, dinheiro recebido
   - **VOCABULÁRIO BRASILEIRO ESPECÍFICO**: 
     * "caiu" indica receita: "caiu vale refeição", "caiu VR", "caiu Vale Alimentação", "caiu VA", "caiu salário", "caiu comissão", "caiu 500", "caiu na conta"
     * "entrou" indica receita: "entrou dinheiro", "entrou 1000", "entrou na conta", "entrou salário", "entrou comissão"
     * "creditou" indica receita: "creditou na conta", "creditou 500"
     * "depositou" indica receita: "depositou na conta", "depositou 200"
   - **DETECÇÃO AUTOMÁTICA**: Se a mensagem contiver "caiu", "entrou", "creditou", "depositou", "recebi", "recebemos", "salário", "comissão", "bonus", "venda", "freelance", "freela", "me pagaram", "me transferiram", "me depositaram", "me creditaram", "ganhei", "ganhamos", INFIRA automaticamente que é UMA ENTRADA/RECEITA (save_income), NÃO uma despesa.
   - Valor: sempre extrair da mensagem se mencionado (ex: "500 reais" → 500)
   - Descrição: extrair automaticamente da mensagem (ex: "recebi bonus" → "bonus", "caiu VR" → "Vale Refeição", "caiu VA" → "Vale Alimentação", "salário" → "salário", "comissão de 200" → "comissão")
   - Responsável: se o usuário disse "recebi", "eu recebi", "caiu para mim", "minha", "me pagaram", já INFERE que foi o próprio usuário (mapear para "eu"). Se disse "recebemos", "caiu para nós", "nos pagaram", INFERE compartilhado.
   - Conta bancária (OBRIGATÓRIO - sempre perguntar "Qual conta adiciono?" ou "Em qual conta foi recebido?" se não mencionado)
   - Método de recebimento (OPCIONAL - pix, dinheiro, depósito, transferência. Se não mencionado e conta bancária informada, assume depósito)
   - Categoria será inferida automaticamente da descrição quando possível

Exemplos de INFERÊNCIA AUTOMÁTICA:
- "recebi comissão de 200" → INFERE: amount=200, description="comissão", responsible="eu" → Pergunta apenas: conta bancária
- "caiu VR de 500" → INFERE: amount=500, description="Vale Refeição", responsible="eu" → Pergunta apenas: conta bancária
- "caiu Vale Alimentação de 300" → INFERE: amount=300, description="Vale Alimentação", responsible="eu" → Pergunta apenas: conta bancária
- "entrou salário de 5000 na nubank" → INFERE: amount=5000, description="salário", account_name="nubank", responsible="eu" → Chama save_income direto
- "recebemos venda de 2000" → INFERE: amount=2000, description="venda", responsible="compartilhado" → Pergunta apenas: conta bancária
- "salário de 5000 na nubank" → INFERE: amount=5000, description="salário", account_name="nubank" → Pergunta apenas: responsável (ou infere "eu" se contexto indicar)
- "recebi bonus de 500, coloca na conta nubank" → INFERE: amount=500, description="bonus", account_name="nubank", responsible="eu" → Chama save_income direto (sem perguntar nada)` : ''}

${process.env.USE_INCOME_FEATURE === 'true' ? '15' : '14'}. **REGISTRAR CONTAS A PAGAR**: Quando o usuário mencionar valores a pagar futuramente (ex: "tenho que pagar aluguel de 1500 no dia 5", "conta de luz vence dia 10", "aluguel de 2000 no dia 1", "internet mensal de 150", "condomínio"), chame a função save_bill. INFIRA automaticamente quando possível:
   - Valor: sempre extrair da mensagem se mencionado (ex: "1500 reais" → 1500)
   - Descrição: extrair automaticamente da mensagem (ex: "aluguel", "conta de luz", "internet", "condomínio")
   - Data de vencimento (OBRIGATÓRIO): calcular a data a partir de "dia X", "X de novembro", "próximo dia 5", etc. Se mencionar apenas o dia (ex: "dia 5"), assumir mês atual se ainda não passou, senão próximo mês
   - Categoria: será inferida automaticamente da descrição quando possível (aluguel/condomínio → Casa, luz/internet → Serviços)
   - Responsável: se não informado, será compartilhada. Se mencionar "eu pago", "minha", já INFERE responsável
   - Método de pagamento e recorrência são opcionais

Exemplos de INFERÊNCIA AUTOMÁTICA:
- "tenho que pagar aluguel de 1500 no dia 5" → INFERE: amount=1500, description="aluguel", due_date (calcular dia 5), category será "Contas" automaticamente → Chama save_bill
- "conta de luz vence dia 10, 300 reais" → INFERE: amount=300, description="conta de luz", due_date (calcular dia 10), category será "Contas" automaticamente → Chama save_bill
- "aluguel mensal de 2000 no dia 1" → INFERE: amount=2000, description="aluguel", due_date (calcular dia 1), is_recurring=true, recurrence_frequency="monthly", category será "Contas" automaticamente → Chama save_bill

${process.env.USE_INCOME_FEATURE === 'true' ? '16' : '15'}. **RESUMOS E CONSULTAS**: Quando o usuário perguntar sobre gastos (ex: "quanto gastei?", "resumo de despesas", "quanto já gastei de alimentação esse mês?", "resumo esse mês", "quanto foi em transporte hoje?"), chame as funções apropriadas:
   - "quanto gastei?" / "resumo de despesas" / "resumo esse mês" / "quanto já gastei esse mês?" → get_expenses_summary (period: este_mes) - se não mencionar período, assume "este_mes"
   - "quanto gastei de X?" / "quanto já gastei de alimentação esse mês?" / "resumo de alimentação" → get_category_summary (category: X, period: este_mes)
   - "quanto gastei hoje?" → get_expenses_summary (period: hoje)
   - "quanto gastei essa semana?" → get_expenses_summary (period: esta_semana)
   - "quanto gastei no mês passado?" → get_expenses_summary (period: mes_anterior)
   - Se mencionar período específico (hoje, semana, mês, mês passado), use o período correto
   - NÃO pergunte nada - INFIRA o período e categoria da mensagem do usuário e chame a função diretamente

${process.env.USE_INCOME_FEATURE === 'true' ? '17' : '16'}. **CONSULTAR SALDO**: Quando o usuário perguntar sobre saldo (ex: "qual meu saldo?", "quanto tenho na conta?", "saldo da nubank", "quanto tem na conta X?", "meu saldo"), chame get_account_balance:
   - "qual meu saldo?" / "quanto tenho?" / "meu saldo" → get_account_balance (sem account_name) - retorna todas as contas
   - "saldo da nubank" / "quanto tem na nubank?" / "saldo nubank" → get_account_balance (account_name: "Nubank")
   - INFIRA o nome da conta quando mencionado e chame a função diretamente

FUNÇÕES DISPONÍVEIS:
- validate_payment_method (opcional - função já valida internamente)
- validate_card (opcional - função já valida internamente)
- validate_responsible (opcional - função já valida internamente)
- save_expense (chame quando tiver: valor, descrição, categoria, pagamento, responsável. Se for crédito: cartão e parcelas também)
${process.env.USE_INCOME_FEATURE === 'true' ? '- save_income (chame quando usuário mencionar valores recebidos: comissão, salário, freelance, venda, etc. Precisa: valor, descrição, responsável, conta bancária. Opcional: categoria)' : ''}
- save_bill (chame quando usuário mencionar valores a pagar futuramente: "tenho que pagar aluguel de 1500 no dia 5", "conta de luz vence dia 10", etc. Precisa: valor, descrição, data de vencimento. Opcional: categoria, responsável, método de pagamento, recorrência)
- get_expenses_summary (chame quando usuário perguntar sobre gastos totais: "quanto gastei?", "resumo de despesas", etc. Parâmetros: period (hoje, esta_semana, este_mes, mes_anterior), category (opcional))
- get_category_summary (chame quando usuário perguntar sobre gastos por categoria: "quanto gastei de X?", etc. Parâmetros: category, period)
- get_account_balance (chame quando usuário perguntar sobre saldo: "qual meu saldo?", "saldo da X", etc. Parâmetros: account_name (opcional))

FLUXO DE EXEMPLO (ênfase na fluidez e variação):

| Usuário | ZUL - Variações (escolha uma, nunca repita) |
| :--- | :--- |
| Zul | "E aí, ${firstName}!", "Opa, ${firstName}! Tudo certo?", "Oi, ${firstName}! O que tá pegando?", "E aí! Como posso ajudar?" |
| 150 no mercado | "Pagou como?", "Como foi o pagamento?", "De que forma pagou?", "Como você pagou?" |
| Crédito Latam 3x | "Quem pagou?", "Foi você?", "Pra quem foi essa?", "Quem foi?" |
| Felipe | [save_expense] Função retorna mensagem automaticamente |

**EXEMPLOS DE EXTRAÇÃO AUTOMÁTICA COMPLETA:**
| Mensagem do Usuário | Extração Automática | Pergunta do ZUL |
| :--- | :--- | :--- |
| "comprei uma televisao por 1500 reais em 5x no credito Latam" | valor=1500, descrição=televisao, parcelas=5, pagamento=crédito, cartão=Latam, responsável=eu (verbo "comprei") | [save_expense] DIRETO |
| "pagamos 100 no mercado" | valor=100, descrição=mercado, responsável=compartilhado (verbo "pagamos") | "Pagou como?" |
| "gastei 50 na farmácia no pix" | valor=50, descrição=farmácia, pagamento=pix, responsável=eu (verbo "gastei") | [save_expense] DIRETO |
| "1500 em 5x no credito Latam" | valor=1500, parcelas=5, pagamento=crédito, cartão=Latam | "O que foi?" e "Quem pagou?" |
| "100 no mercado, débito" | valor=100, descrição=mercado, pagamento=débito | "Quem pagou?" |
| "50 na farmácia, pix, Felipe" | valor=50, descrição=farmácia, pagamento=pix, responsável=Felipe | [save_expense] DIRETO |
| "caiu VR de 500" | valor=500, descrição=Vale Refeição, responsável=eu | "Em qual conta foi recebido?" |
| "entrou salário de 5000 na nubank" | valor=5000, descrição=salário, conta=nubank, responsável=eu | [save_income] DIRETO |

IMPORTANTE SOBRE DESCRIÇÃO:
- NÃO inclua valor na descrição! Ex: "mercado" (não "150 mercado")
- Permita números de quantidade: "2 televisões", "5kg de carne"
- A função já extrai o core da descrição automaticamente

Seja IMPREVISÍVEL e NATURAL. Faça o usuário sentir que está falando com um assistente humano e eficiente.
${context.isFirstMessage ? `\n\n🌅 PRIMEIRA MENSAGEM: Cumprimente ${firstName} de forma calorosa: "E aí, ${firstName}!" ou "Opa, ${firstName}! Tudo certo?" ou "Oi, ${firstName}! Como vai?"` : ''}`;
  }

  /**
   * Definir funções disponíveis para GPT-4
   */
  getFunctions() {
    const functions = [
      {
        name: 'save_expense',
        description: 'Salvar despesa quando tiver TODAS as informações (valor, descrição, pagamento, responsável). Validação acontece automaticamente dentro da função. IMPORTANTE: EXTRAIA TODAS as informações disponíveis da mensagem do usuário ANTES de chamar esta função. Se a mensagem mencionar "crédito", "crédito X", "no crédito", "cartão X", "X em Yx" (parcelas), EXTRAIA essas informações automaticamente e inclua nos parâmetros.',
        parameters: {
          type: 'object',
          properties: {
            amount: { 
              type: 'number',
              description: 'Valor numérico da despesa. EXTRAIA automaticamente quando mencionado na mensagem (ex: "1500 reais", "R$ 100", "50,00").'
            },
            description: { 
              type: 'string',
              description: 'Descrição da despesa SEM o valor monetário. Exemplos corretos: "mercado" (não "150 mercado"), "farmácia", "televisao", "2 televisões", "5kg de carne", "TV 50 polegadas". Permita números relacionados a quantidade (2, 5kg, etc) mas NUNCA inclua o valor monetário na descrição. EXTRAIA automaticamente quando mencionado na mensagem.'
            },
            payment_method: { 
              type: 'string',
              description: 'Forma de pagamento que o usuário disse. EXTRAIA automaticamente quando mencionado: "crédito"/"crédito X"/"no crédito"/"cartão de crédito" → credit_card, "débito"/"no débito"/"cartão de débito" → debit_card, "pix"/"PIX" → pix, "dinheiro"/"cash"/"em espécie" → cash. Se a mensagem mencionar "crédito", "cartão X", "X em Yx", EXTRAIA automaticamente.'
            },
            responsible: { 
              type: 'string',
              description: 'Quem pagou: nome exato (ex: "Felipe", "Letícia") ou "eu" (será mapeado automaticamente)'
            },
            card_name: { 
              type: 'string',
              description: 'Nome do cartão (OBRIGATÓRIO se payment_method for crédito). EXTRAIA automaticamente quando mencionado na mensagem (ex: "crédito Latam" → Latam, "Latam 5x" → Latam, "no crédito Nubank" → Nubank).'
            },
            installments: { 
              type: 'number',
              description: 'Número de parcelas (OBRIGATÓRIO se payment_method for crédito, default: 1). EXTRAIA automaticamente quando mencionado na mensagem (ex: "5x" → 5, "em 3x" → 3, "parcelado em 10x" → 10).'
            },
            category: { 
              type: 'string',
              description: 'Categoria (opcional, será inferida automaticamente)' 
            }
          },
          required: ['amount', 'description', 'payment_method', 'responsible']
        }
      }
    ];

    // ✅ FEATURE FLAG: Registrar Entradas/Receitas (Incomes)
    if (process.env.USE_INCOME_FEATURE === 'true') {
      functions.push({
        name: 'save_income',
        description: 'Registrar entrada/receita quando o usuário mencionar valores recebidos (ex: "recebi comissão de 200 reais", "salário", "freelance", "comissão").',
        parameters: {
          type: 'object',
          properties: {
            amount: {
              type: 'number',
              description: 'Valor numérico da entrada/receita'
            },
            description: {
              type: 'string',
              description: 'Descrição da entrada (ex: "comissão", "salário", "freelance", "venda", "bonus")'
            },
            category: {
              type: 'string',
              description: 'Categoria da entrada (ex: "Salário", "Comissão", "Freelance", "Venda", "Bônus"). Se não informado, será inferido da descrição.'
            },
            account_name: {
              type: 'string',
              description: 'Nome da conta bancária onde o dinheiro foi recebido (ex: "Nubank", "C6"). OBRIGATÓRIO - se não informado, perguntar ao usuário qual conta.'
            },
            payment_method: {
              type: 'string',
              description: 'Método de recebimento (opcional, será inferido automaticamente se não informado): "pix" (PIX), "cash" (Dinheiro), "deposit" (Depósito em conta), "bank_transfer" (Transferência bancária/TED/DOC), "boleto" (Boleto), "other" (Outros). Se conta bancária for informada, default será "deposit".'
            },
            responsible: {
              type: 'string',
              description: 'Quem recebeu: nome exato (ex: "Felipe", "Letícia") ou "eu" (será mapeado automaticamente)'
            },
            date: {
              type: 'string',
              description: 'Data da entrada no formato YYYY-MM-DD (opcional, default: hoje)'
            }
          },
          required: ['amount', 'description', 'responsible', 'account_name']
        }
      });
    }

    // ✅ NOVA FUNÇÃO: Resumo de Despesas
    functions.push({
      name: 'get_expenses_summary',
      description: 'Obter resumo de despesas quando o usuário perguntar "quanto gastei?", "resumo de despesas", "quanto já gastei esse mês?", "resumo esse mês", etc.',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Período para o resumo: "hoje", "esta_semana", "este_mes", "mes_anterior"',
            enum: ['hoje', 'esta_semana', 'este_mes', 'mes_anterior']
          },
          category: {
            type: 'string',
            description: 'Categoria específica para filtrar (opcional, ex: "Alimentação", "Transporte"). Se não informado, retorna todas as categorias.'
          }
        },
        required: ['period']
      }
    });

    // ✅ NOVA FUNÇÃO: Registrar Conta a Pagar
    functions.push({
      name: 'save_bill',
      description: 'Registrar conta a pagar quando o usuário mencionar valores a pagar futuramente (ex: "tenho que pagar aluguel de 1500 no dia 5", "conta de luz vence dia 10", "aluguel de 2000 no dia 1"). Precisa: valor, descrição, data de vencimento. Opcional: categoria, responsável, método de pagamento, recorrência.',
      parameters: {
        type: 'object',
        properties: {
          amount: {
            type: 'number',
            description: 'Valor numérico da conta a pagar'
          },
          description: {
            type: 'string',
            description: 'Descrição da conta (ex: "aluguel", "conta de luz", "internet", "telefone", "condomínio")'
          },
          due_date: {
            type: 'string',
            description: 'Data de vencimento (OBRIGATÓRIO). Pode ser: formato YYYY-MM-DD, apenas o dia (ex: "5", "dia 5"), ou formato relativo (ex: "5 de novembro"). Se informar apenas o dia (ex: "dia 5"), a função calculará automaticamente se é mês atual ou próximo baseado na data de hoje.'
          },
          category: {
            type: 'string',
            description: 'Categoria da conta (opcional, será inferida automaticamente quando possível). Ex: "Casa", "Serviços", "Transporte"'
          },
          responsible: {
            type: 'string',
            description: 'Quem é responsável por pagar: nome exato (ex: "Felipe", "Letícia") ou "eu" (será mapeado automaticamente). Se não informado, será compartilhada.'
          },
          payment_method: {
            type: 'string',
            description: 'Método de pagamento previsto (opcional): "pix", "credit_card", "debit_card", "boleto", "bank_transfer", "cash", "other"'
          },
          card_name: {
            type: 'string',
            description: 'Nome do cartão (OBRIGATÓRIO se payment_method for credit_card)'
          },
          is_recurring: {
            type: 'boolean',
            description: 'Se a conta é recorrente (opcional, default: false). Ex: aluguel mensal, internet mensal'
          },
          recurrence_frequency: {
            type: 'string',
            description: 'Frequência da recorrência se is_recurring for true (opcional): "monthly" (mensal), "weekly" (semanal), "yearly" (anual). Default: "monthly"'
          }
        },
        required: ['amount', 'description', 'due_date']
      }
    });

    // ✅ NOVA FUNÇÃO: Resumo por Categoria
    functions.push({
      name: 'get_category_summary',
      description: 'Obter resumo de despesas por categoria quando o usuário perguntar "quanto gastei de X?", "quanto já gastei de alimentação esse mês?", "resumo de alimentação", etc.',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            description: 'Nome da categoria (ex: "Alimentação", "Transporte", "Saúde", "Lazer", "Casa")'
          },
          period: {
            type: 'string',
            description: 'Período para o resumo: "hoje", "esta_semana", "este_mes", "mes_anterior"',
            enum: ['hoje', 'esta_semana', 'este_mes', 'mes_anterior']
          }
        },
        required: ['category', 'period']
      }
    });

    // ✅ NOVA FUNÇÃO: Consultar Saldo de Contas
    functions.push({
      name: 'get_account_balance',
      description: 'Consultar saldo de contas bancárias quando o usuário perguntar "qual meu saldo?", "quanto tenho na conta?", "saldo da nubank", "quanto tem na conta?", etc.',
      parameters: {
        type: 'object',
        properties: {
          account_name: {
            type: 'string',
            description: 'Nome da conta bancária específica para consultar (opcional, ex: "Nubank", "C6"). Se não informado, retorna saldo de todas as contas ativas.'
          }
        },
        required: []
      }
    });

    return functions;
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
    console.log(`🔧 [FUNCTION_CALL] Executing: ${functionName}`);
    let output = {};

    try {
        if (functionName === 'validate_payment_method') {
            output = { success: true, isValid: true };
        } else if (functionName === 'validate_card') {
            output = { success: true, isValid: true };
        } else if (functionName === 'validate_responsible') {
            output = { success: true, isValid: true };

        } else if (functionName === 'save_expense') {
            output = await context.saveExpense(args);
        } else if (functionName === 'save_income') {
            // ✅ FEATURE FLAG: Registrar Entradas/Receitas
            if (process.env.USE_INCOME_FEATURE === 'true') {
                output = await this.saveIncome(args, context);
            } else {
                output = { success: false, error: 'Feature save_income is disabled' };
            }
        } else if (functionName === 'save_bill') {
            // ✅ NOVA FUNÇÃO: Registrar Conta a Pagar
            output = await this.saveBill(args, context);
        } else if (functionName === 'get_expenses_summary') {
            // ✅ NOVA FUNÇÃO: Resumo de Despesas
            output = await this.getExpensesSummary(args, context);
        } else if (functionName === 'get_category_summary') {
            // ✅ NOVA FUNÇÃO: Resumo por Categoria
            output = await this.getCategorySummary(args, context);
        } else if (functionName === 'get_account_balance') {
            // ✅ NOVA FUNÇÃO: Consultar Saldo de Contas
            output = await this.getAccountBalance(args, context);
        } else {
            output = { success: false, error: `Unknown function: ${functionName}` };
        }
    } catch (error) {
        console.error(`❌ Error in handleFunctionCall for ${functionName}:`, error);
        output = { success: false, error: error.message };
    }

    console.log(`  -> Result for ${functionName}:`, output);
    return output;
  }

  /**
   * Salvar entrada/receita (income)
   * ✅ FEATURE FLAG: USE_INCOME_FEATURE
   */
  async saveIncome(args, context) {
    try {
      console.log('💾 [INCOME] Salvando entrada com args:', args);
      
      const { amount, description, category, account_name, responsible, date } = args;
      
      // Validar campos obrigatórios
      if (!amount || !description || !responsible) {
        return {
          success: false,
          message: 'Ops! Preciso do valor, descrição e quem recebeu.'
        };
      }
      
      // Normalizar owner (mapear "eu" para nome do usuário)
      let owner = responsible;
      let ownerNorm = this.normalizeText(owner);
      if (ownerNorm === 'eu' || ownerNorm.includes('eu')) {
        owner = context.userName || context.firstName || owner;
        ownerNorm = this.normalizeText(owner);
      }
      
      // Buscar cost_center_id
      let costCenterId = null;
      const isShared = ownerNorm.includes('compartilhado');
      
      if (!isShared && owner) {
        const { data: centers } = await supabase
          .from('cost_centers')
          .select('id, name')
          .eq('organization_id', context.organizationId);
        
        if (centers && centers.length) {
          const byNorm = new Map();
          for (const c of centers) byNorm.set(this.normalizeText(c.name), c);
          
          // Match exato normalizado
          const exact = byNorm.get(ownerNorm);
          if (exact) {
            costCenterId = exact.id;
            owner = exact.name;
          } else {
            // Match parcial (substring)
            let matches = centers.filter(c => {
              const n = this.normalizeText(c.name);
              return n.includes(ownerNorm) || ownerNorm.includes(n);
            });
            
            // Se usuário passou apenas o primeiro nome
            if (!matches.length) {
              const firstToken = ownerNorm.split(/\s+/)[0];
              matches = centers.filter(c => {
                const tokens = this.normalizeText(c.name).split(/\s+/);
                return tokens[0] === firstToken;
              });
            }
            
            if (matches.length === 1) {
              costCenterId = matches[0].id;
              owner = matches[0].name;
            } else if (matches.length > 1) {
              // Desambiguação necessária
              const options = matches.map(m => m.name).join(', ');
              const firstName = this.getFirstName(context);
              const namePart = firstName ? ` ${firstName}` : '';
              
              const disambiguationMessages = [
                `Encontrei mais de um responsável com esse nome${namePart}. Qual deles? ${options}`,
                `Tem mais de um ${owner} aqui${namePart}. Qual? ${options}`,
                `Preciso que você escolha${namePart}: ${options}`
              ];
              
              return {
                success: false,
                message: this.pickVariation(disambiguationMessages, owner)
              };
            }
          }
        }
      }
      
      // Se não foi possível determinar responsável, perguntar
      if (!isShared && (!owner || !costCenterId)) {
        const firstName = this.getFirstName(context);
        const namePart = firstName ? ` ${firstName}` : '';
        
        const questions = [
          `Quem recebeu${namePart}?`,
          `Foi você ou alguém específico${namePart}?`,
          `Me diz quem recebeu${namePart}?`
        ];
        
        return {
          success: false,
          message: this.pickVariation(questions, owner || 'responsavel')
        };
      }
      
      // Inferir categoria se não informada
      let finalCategory = category;
      if (!finalCategory && description) {
        const descNorm = this.normalizeText(description);
        const categoryHints = [
          { keys: ['salario', 'salário', 'proventos'], target: 'Salário' },
          { keys: ['comissao', 'comissão', 'comissões'], target: 'Comissão' },
          { keys: ['freelance', 'freela', 'projeto'], target: 'Freelance' },
          { keys: ['venda', 'vendas'], target: 'Venda' },
          { keys: ['bonus', 'bônus', 'gratificacao', 'gratificação'], target: 'Bônus' },
          { keys: ['investimento', 'dividendo', 'juros'], target: 'Investimento' }
        ];
        
        for (const hint of categoryHints) {
          if (hint.keys.some(k => descNorm.includes(k))) {
            finalCategory = hint.target;
            break;
          }
        }
      }
      
      // Buscar bank_account_id (OBRIGATÓRIO para entradas)
      let bankAccountId = null;
      let finalAccountName = account_name;
      
      // Buscar todas as contas ativas da organização
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('id, name')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true);
      
      if (!accounts || accounts.length === 0) {
        return {
          success: false,
          message: 'Ops! Não encontrei nenhuma conta bancária cadastrada. Cadastre uma conta primeiro.'
        };
      }
      
      // Se account_name foi informado, buscar a conta específica
      if (account_name) {
        const accountNorm = this.normalizeText(account_name);
        const byNorm = new Map();
        for (const a of accounts) byNorm.set(this.normalizeText(a.name), a);
        
        const found = byNorm.get(accountNorm);
        if (found) {
          bankAccountId = found.id;
          finalAccountName = found.name;
        } else {
          // Tentar match parcial
          const match = accounts.find(a => {
            const n = this.normalizeText(a.name);
            return n.includes(accountNorm) || accountNorm.includes(n);
          });
          
          if (match) {
            bankAccountId = match.id;
            finalAccountName = match.name;
          } else {
            // Conta não encontrada - listar opções
            const accountsList = accounts.map(a => a.name).join(', ');
            const firstName = this.getFirstName(context);
            const namePart = firstName ? ` ${firstName}` : '';
            
            return {
              success: false,
              message: `Não encontrei essa conta${namePart}. Disponíveis: ${accountsList}. Qual conta?`
            };
          }
        }
      } else {
        // Se não informou conta, PERGUNTAR (obrigatório)
        const accountsList = accounts.map(a => a.name).join(', ');
        const firstName = this.getFirstName(context);
        const namePart = firstName ? ` ${firstName}` : '';
        
        const accountQuestions = [
          `Qual conta adiciono${namePart}?`,
          `Em qual conta foi recebido${namePart}?`,
          `Qual conta${namePart}?`,
          `Me diz qual conta${namePart}?`
        ];
        
        return {
          success: false,
          message: `${this.pickVariation(accountQuestions, 'conta')}\n\nDisponíveis: ${accountsList}`
        };
      }
      
      // Normalizar método de recebimento (para incomes: cash, pix, deposit, bank_transfer, boleto, other)
      let paymentMethod = 'deposit'; // Default: depósito em conta
      
      // Se o usuário mencionou o método de recebimento, normalizar
      if (args.payment_method) {
        const pmNorm = this.normalizeText(args.payment_method);
        if (pmNorm.includes('pix')) paymentMethod = 'pix';
        else if (pmNorm.includes('dinheir') || pmNorm.includes('cash') || pmNorm.includes('especie')) paymentMethod = 'cash';
        else if (pmNorm.includes('deposito') || pmNorm.includes('depósito')) paymentMethod = 'deposit';
        else if (pmNorm.includes('transfer') || pmNorm.includes('ted') || pmNorm.includes('doc')) paymentMethod = 'bank_transfer';
        else if (pmNorm.includes('boleto')) paymentMethod = 'boleto';
        else paymentMethod = 'other';
      } else {
        // Se não informou e foi via conta bancária, assumir depósito
        if (bankAccountId) {
          paymentMethod = 'deposit';
        }
      }
      
      // Preparar dados da entrada (bank_account_id e payment_method são obrigatórios)
      const incomeData = {
        amount: parseFloat(amount),
        description: description,
        date: date || new Date().toISOString().split('T')[0],
        category: finalCategory || null,
        cost_center_id: costCenterId,
        bank_account_id: bankAccountId, // ✅ OBRIGATÓRIO
        payment_method: paymentMethod, // ✅ Método de recebimento (cash, pix, deposit, bank_transfer, boleto, other)
        organization_id: context.organizationId,
        user_id: context.userId,
        status: 'confirmed',
        is_shared: isShared || false,
        source: 'whatsapp'
      };
      
      console.log('💾 [INCOME] Dados preparados:', incomeData);
      
      // Salvar entrada
      const { data, error } = await supabase
        .from('incomes')
        .insert(incomeData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao salvar entrada:', error);
        throw error;
      }
      
      console.log('✅ Entrada salva:', data.id);
      
      // Atualizar saldo da conta usando RPC (sempre, pois bank_account_id é obrigatório)
      if (bankAccountId) {
        try {
          // Usar função RPC para criar transação bancária (atualiza saldo automaticamente via trigger)
          const { data: transactionData, error: transError } = await supabase.rpc('create_bank_transaction', {
            p_bank_account_id: bankAccountId,
            p_transaction_type: 'income_deposit',
            p_amount: parseFloat(amount),
            p_description: description,
            p_date: incomeData.date,
            p_organization_id: context.organizationId,
            p_user_id: context.userId,
            p_expense_id: null,
            p_bill_id: null,
            p_income_id: data.id,
            p_related_account_id: null
          });
          
          if (transError) {
            console.error('⚠️ Erro ao criar transação bancária:', transError);
            // Se RPC falhar, tentar atualização manual como fallback
            const { data: account } = await supabase
              .from('bank_accounts')
              .select('current_balance')
              .eq('id', bankAccountId)
              .single();
            
            if (account) {
              const currentBalance = parseFloat(account.current_balance) || 0;
              const newBalance = currentBalance + parseFloat(amount);
              
              await supabase
                .from('bank_accounts')
                .update({ current_balance: newBalance })
                .eq('id', bankAccountId);
              
              console.log('✅ Saldo atualizado manualmente (fallback)');
            }
          } else {
            console.log('✅ Transação bancária criada e saldo atualizado via RPC:', transactionData);
          }
        } catch (accountError) {
          // Se erro na atualização de conta, apenas logar (não falhar o salvamento)
          console.error('⚠️ Erro ao atualizar saldo da conta:', accountError);
        }
      }
      
      // Formatar resposta
      const amountFormatted = Number(amount).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const dateObj = new Date(incomeData.date + 'T00:00:00');
      const isToday = dateObj.toDateString() === new Date().toDateString();
      const dateDisplay = isToday ? 'Hoje' : dateObj.toLocaleDateString('pt-BR');
      
      const greetings = [
        'Entrada registrada! ✅',
        'Receita anotada! ✅',
        'Pronto! ✅',
        'Beleza, anotei! ✅'
      ];
      
      const greeting = greetings[Math.floor(Math.random() * greetings.length)];
      
      let response = `${greeting}\nR$ ${amountFormatted} - ${description}`;
      
      if (finalCategory) {
        response += `\n${finalCategory}`;
      }
      
      if (finalAccountName) {
        response += `\n${finalAccountName}`;
      }
      
      response += `\n${owner}\n${dateDisplay}`;
      
      return {
        success: true,
        message: response,
        income_id: data.id
      };
      
    } catch (error) {
      console.error('❌ Erro ao salvar entrada:', error);
      const firstName = this.getFirstName(context);
      const namePart = firstName ? ` ${firstName}` : '';
      
      const errorMessages = [
        `Ops${namePart}! Tive um problema ao registrar a entrada. 😅`,
        `Eita${namePart}, algo deu errado aqui. 😅`,
        `Poxa${namePart}, tive um erro. 😅`
      ];
      
      return {
        success: false,
        message: this.pickVariation(errorMessages, 'erro')
      };
    }
  }

  /**
   * Parsear e calcular data de vencimento
   * Aceita: YYYY-MM-DD, apenas dia (ex: "5"), ou formato relativo
   */
  parseDueDate(dateStr) {
    if (!dateStr) return null;
    
    console.log('📅 [PARSE_DUE_DATE] Input:', dateStr);
    
    // Tentar parse direto como YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Extrair ano ANTES de fazer parse para comparar diretamente
      const parts = dateStr.split('-');
      const inputYear = parseInt(parts[0]);
      const inputMonth = parseInt(parts[1]);
      const inputDay = parseInt(parts[2]);
      
      const today = new Date();
      const currentYear = today.getFullYear();
      
      console.log(`📅 [PARSE_DUE_DATE] Input: ${dateStr}, inputYear=${inputYear}, currentYear=${currentYear}`);
      
      // Se o ano é menor que o atual, SEMPRE recalcular (independente de diffDays)
      if (inputYear < currentYear) {
        console.warn(`⚠️ [PARSE_DUE_DATE] Ano incorreto detectado ANTES do parse: ${inputYear} < ${currentYear}`);
        console.warn('⚠️ [PARSE_DUE_DATE] Recalculando data com ano correto...');
        
        // Usar mês e dia do input, mas recalcular ano
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1; // JavaScript usa 0-11, converter para 1-12
          
        // Se o mês/dia já passou neste ano, usar próximo ano
        // Comparar: se mês < mês atual OU (mês == mês atual E dia < dia atual)
        let targetYear = currentYear;
        if (inputMonth < currentMonth || (inputMonth === currentMonth && inputDay < currentDay)) {
          // Data já passou neste ano - usar próximo ano
          targetYear = currentYear + 1;
          console.log(`📅 [PARSE_DUE_DATE] Mês/dia já passou, usando próximo ano: ${inputDay}/${inputMonth}/${targetYear}`);
        } else {
          // Data ainda não passou neste ano
          console.log(`📅 [PARSE_DUE_DATE] Mês/dia ainda não passou, usando ano atual: ${inputDay}/${inputMonth}/${targetYear}`);
        }
        
        // Garantir que o dia existe no mês
        const daysInMonth = new Date(targetYear, inputMonth, 0).getDate();
        const finalDay = Math.min(inputDay, daysInMonth);
        
        const monthStr = String(inputMonth).padStart(2, '0');
        const dayStr = String(finalDay).padStart(2, '0');
        
        const result = `${targetYear}-${monthStr}-${dayStr}`;
        console.log(`✅ [PARSE_DUE_DATE] Recalculado (corrigido): ${result}`);
        return result;
      }
      
      // Se chegou aqui, ano está correto ou igual ao atual
      // Validar se data não está muito no passado (mais de 1 ano)
      const parsed = new Date(dateStr + 'T00:00:00');
      if (!isNaN(parsed.getTime())) {
        const todayOnly = new Date();
        todayOnly.setHours(0, 0, 0, 0);
        const parsedDateOnly = new Date(parsed);
        parsedDateOnly.setHours(0, 0, 0, 0);
        const diffDays = (todayOnly - parsedDateOnly) / (1000 * 60 * 60 * 24);
        
        if (diffDays > 365) {
          console.warn(`⚠️ [PARSE_DUE_DATE] Data muito no passado (${diffDays} dias), recalculando...`);
          // Recalcular similar ao caso anterior
          const currentDay = todayOnly.getDate();
          const currentMonth = todayOnly.getMonth() + 1;
          
          let targetYear2 = currentYear;
          if (inputMonth < currentMonth || (inputMonth === currentMonth && inputDay < currentDay)) {
            targetYear2 = currentYear + 1;
          }
          
          const daysInMonth2 = new Date(targetYear2, inputMonth, 0).getDate();
          const finalDay2 = Math.min(inputDay, daysInMonth2);
          
          const result2 = `${targetYear2}-${String(inputMonth).padStart(2, '0')}-${String(finalDay2).padStart(2, '0')}`;
          console.log(`✅ [PARSE_DUE_DATE] Recalculado (diffDays): ${result2}`);
          return result2;
        }
        
        console.log('✅ [PARSE_DUE_DATE] Data válida:', dateStr);
        return dateStr;
      }
    }
    
    // Tentar extrair apenas o dia (ex: "5", "dia 5", "5 de novembro")
    const dayMatch = dateStr.match(/(\d{1,2})/);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      if (day >= 1 && day <= 31) {
        const today = new Date();
        const currentDay = today.getDate();
        const currentMonth = today.getMonth();
        const currentYear = today.getFullYear();
        
        console.log(`📅 [PARSE_DUE_DATE] Hoje: ${currentDay}/${currentMonth + 1}/${currentYear}, Dia solicitado: ${day}`);
        
        // Se o dia já passou neste mês, usar próximo mês
        // Senão, usar mês atual
        let targetMonth = currentMonth;
        let targetYear = currentYear;
        
        if (day < currentDay) {
          // Dia já passou - usar próximo mês
          targetMonth = currentMonth + 1;
          if (targetMonth > 11) {
            targetMonth = 0;
            targetYear = currentYear + 1;
          }
          console.log(`📅 [PARSE_DUE_DATE] Dia já passou, usando próximo mês: ${day}/${targetMonth + 1}/${targetYear}`);
        } else {
          console.log(`📅 [PARSE_DUE_DATE] Dia ainda não passou, usando mês atual: ${day}/${targetMonth + 1}/${targetYear}`);
        }
        
        // Garantir que o dia existe no mês (ex: 31 de fevereiro → 28/29)
        const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
        const finalDay = Math.min(day, daysInMonth);
        
        const monthStr = String(targetMonth + 1).padStart(2, '0');
        const dayStr = String(finalDay).padStart(2, '0');
        
        const result = `${targetYear}-${monthStr}-${dayStr}`;
        console.log('✅ [PARSE_DUE_DATE] Resultado:', result);
        return result;
      }
    }
    
    // Se não conseguiu parsear, tentar Date nativo
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      const year = parsed.getFullYear();
      const month = parsed.getMonth() + 1;
      const day = parsed.getDate();
      
      // Validar se não está muito no passado OU se ano é menor que atual
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const parsedDateOnly = new Date(parsed);
      parsedDateOnly.setHours(0, 0, 0, 0);
      
      const currentYear = today.getFullYear();
      const diffDays = (today - parsedDateOnly) / (1000 * 60 * 60 * 24);
      
      console.log(`📅 [PARSE_DUE_DATE] Date nativo: year=${year}, currentYear=${currentYear}, diffDays=${diffDays}`);
      
      if (year < currentYear || diffDays > 365) {
        console.warn(`⚠️ [PARSE_DUE_DATE] Date nativo retornou data incorreta (ano=${year}), recalculando...`);
        // Recalcular usando dia e mês mas com ano correto
        const currentDay = today.getDate();
        const currentMonth = today.getMonth() + 1;
        
        let targetMonth = month;
        let finalYear = currentYear;
        
        // Se mês/dia já passou, usar próximo ano
        if (month < currentMonth || (month === currentMonth && day < currentDay)) {
          finalYear = currentYear + 1;
        }
        
        const daysInMonth = new Date(finalYear, month, 0).getDate();
        const finalDay = Math.min(day, daysInMonth);
        
        const result = `${finalYear}-${String(month).padStart(2, '0')}-${String(finalDay).padStart(2, '0')}`;
        console.log(`✅ [PARSE_DUE_DATE] Recalculado (Date nativo): ${result}`);
        return result;
      }
      
      const result = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      console.log('✅ [PARSE_DUE_DATE] Resultado (Date nativo):', result);
      return result;
    }
    
    console.warn('❌ [PARSE_DUE_DATE] Não conseguiu parsear:', dateStr);
    return null;
  }

  /**
   * Salvar conta a pagar (bill)
   */
  async saveBill(args, context) {
    try {
      console.log('💾 [BILL] Salvando conta a pagar com args:', JSON.stringify(args, null, 2));
      console.log('💾 [BILL] due_date recebido do GPT:', args.due_date);
      
      const { amount, description, due_date, category, responsible, payment_method, card_name, is_recurring, recurrence_frequency } = args;
      
      // Validar campos obrigatórios
      if (!amount || !description || !due_date) {
        return {
          success: false,
          message: 'Ops! Preciso do valor, descrição e data de vencimento.'
        };
      }
      
      // Parsear e calcular data de vencimento
      console.log('📅 [BILL] Chamando parseDueDate com:', due_date);
      const parsedDueDate = this.parseDueDate(due_date);
      console.log('📅 [BILL] Data parseada:', parsedDueDate);
      
      if (!parsedDueDate) {
        return {
          success: false,
          message: 'Não consegui entender a data de vencimento. Pode informar no formato "dia 5" ou "YYYY-MM-DD"?'
        };
      }
      
      // Validar data de vencimento
      const dueDateObj = new Date(parsedDueDate + 'T00:00:00');
      if (isNaN(dueDateObj.getTime())) {
        return {
          success: false,
          message: 'A data de vencimento está inválida.'
        };
      }
      
      console.log('✅ [BILL] Data de vencimento válida:', parsedDueDate);
      
      // Normalizar owner (mapear "eu" para nome do usuário)
      let owner = responsible;
      let costCenterId = null;
      let isShared = false;
      
      if (responsible) {
        let ownerNorm = this.normalizeText(owner);
        if (ownerNorm === 'eu' || ownerNorm.includes('eu')) {
          owner = context.userName || context.firstName || owner;
          ownerNorm = this.normalizeText(owner);
        }
        
        // Verificar se é compartilhado
        isShared = ownerNorm.includes('compartilhado');
        
        if (!isShared && owner) {
          const { data: centers } = await supabase
            .from('cost_centers')
            .select('id, name')
            .eq('organization_id', context.organizationId);
          
          if (centers && centers.length) {
            const byNorm = new Map();
            for (const c of centers) byNorm.set(this.normalizeText(c.name), c);
            
            // Match exato normalizado
            const exact = byNorm.get(ownerNorm);
            if (exact) {
              costCenterId = exact.id;
              owner = exact.name;
            } else {
              // Match parcial (substring)
              let matches = centers.filter(c => {
                const n = this.normalizeText(c.name);
                return n.includes(ownerNorm) || ownerNorm.includes(n);
              });
              
              // Se usuário passou apenas o primeiro nome
              if (!matches.length) {
                const firstToken = ownerNorm.split(/\s+/)[0];
                matches = centers.filter(c => {
                  const tokens = this.normalizeText(c.name).split(/\s+/);
                  return tokens[0] === firstToken;
                });
              }
              
              if (matches.length === 1) {
                costCenterId = matches[0].id;
                owner = matches[0].name;
              } else if (matches.length > 1) {
                // Desambiguação necessária
                const options = matches.map(m => m.name).join(', ');
                const firstName = this.getFirstName(context);
                const namePart = firstName ? ` ${firstName}` : '';
                
                return {
                  success: false,
                  message: `Encontrei mais de um responsável com esse nome${namePart}. Qual deles? ${options}`
                };
              }
            }
          }
        } else if (isShared) {
          owner = context.organizationName || 'Compartilhado';
        }
      } else {
        // Se não informou responsável, considerar compartilhado
        isShared = true;
        owner = context.organizationName || 'Compartilhado';
      }
      
      // ✅ SEMPRE usar categoria "Contas" para contas a pagar (fixo)
      // Buscar categoria "Contas" nas categorias da organização ou globais
      const normalize = (s) => (s || '')
        .toString()
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/\p{Diacritic}+/gu, '');
      
      const [{ data: orgCats }, { data: globalCats }] = await Promise.all([
        supabase
          .from('budget_categories')
          .select('id, name')
          .eq('organization_id', context.organizationId)
          .or('type.eq.expense,type.eq.both'),
        supabase
          .from('budget_categories')
          .select('id, name')
          .is('organization_id', null)
          .or('type.eq.expense,type.eq.both')
      ]);
      
      const allCats = [...(orgCats || []), ...(globalCats || [])];
      const byNorm = new Map();
      for (const c of allCats) {
        byNorm.set(normalize(c.name), c);
      }
      
      // Buscar "Contas" como categoria padrão
      let categoryId = null;
      let categoryName = null;
      
      const contasNorm = normalize('Contas');
      const foundContas = byNorm.get(contasNorm);
      
      if (foundContas) {
        categoryId = foundContas.id;
        categoryName = foundContas.name;
        console.log('✅ [BILL] Usando categoria "Contas" (padrão):', categoryName);
      } else {
        // Se não encontrar "Contas", usar "Outros" como fallback
        const outrosNorm = normalize('Outros');
        const foundOutros = byNorm.get(outrosNorm);
        
        if (foundOutros) {
          categoryId = foundOutros.id;
          categoryName = foundOutros.name;
          console.log('⚠️ [BILL] Categoria "Contas" não encontrada, usando "Outros":', categoryName);
        } else {
          console.warn('❌ [BILL] Nenhuma categoria padrão (Contas/Outros) encontrada');
          // Ainda assim tentar qualquer categoria disponível como último recurso
          if (allCats.length > 0) {
            categoryId = allCats[0].id;
            categoryName = allCats[0].name;
            console.log('⚠️ [BILL] Usando primeira categoria disponível:', categoryName);
          }
        }
      }
      
      // Garantir que sempre tenha categoria
      if (!categoryId) {
        return {
          success: false,
          message: 'Ops! Não encontrei nenhuma categoria no sistema. Cadastre uma categoria primeiro.'
        };
      }
      
      // Normalizar método de pagamento
      let finalPaymentMethod = null;
      let cardId = null;
      
      if (payment_method) {
        const pmNorm = this.normalizeText(payment_method);
        if (pmNorm.includes('credito') || pmNorm.includes('crédito') || pmNorm.includes('cartao') || pmNorm.includes('cartão')) {
          finalPaymentMethod = 'credit_card';
          
          // Se for crédito, buscar card_id
          if (card_name) {
            const { data: cards } = await supabase
              .from('cards')
              .select('id, name')
              .eq('organization_id', context.organizationId)
              .eq('is_active', true);
            
            if (cards && cards.length) {
              const cardNorm = this.normalizeText(card_name);
              const byNorm = new Map();
              for (const c of cards) byNorm.set(this.normalizeText(c.name), c);
              
              const found = byNorm.get(cardNorm);
              if (found) {
                cardId = found.id;
              } else {
                // Tentar match parcial
                const match = cards.find(c => {
                  const n = this.normalizeText(c.name);
                  return n.includes(cardNorm) || cardNorm.includes(n);
                });
                
                if (match) {
                  cardId = match.id;
                } else {
                  // Listar cartões disponíveis
                  const cardsList = cards.map(c => c.name).join(', ');
                  const firstName = this.getFirstName(context);
                  const namePart = firstName ? ` ${firstName}` : '';
                  
                  return {
                    success: false,
                    message: `Não encontrei esse cartão${namePart}. Disponíveis: ${cardsList}. Qual cartão?`
                  };
                }
              }
            } else {
              return {
                success: false,
                message: 'Não encontrei cartões cadastrados. Cadastre um cartão primeiro.'
              };
            }
          }
        } else if (pmNorm.includes('debito') || pmNorm.includes('débito')) {
          finalPaymentMethod = 'debit_card';
        } else if (pmNorm.includes('pix')) {
          finalPaymentMethod = 'pix';
        } else if (pmNorm.includes('boleto')) {
          finalPaymentMethod = 'boleto';
        } else if (pmNorm.includes('transfer') || pmNorm.includes('ted') || pmNorm.includes('doc')) {
          finalPaymentMethod = 'bank_transfer';
        } else if (pmNorm.includes('dinheir') || pmNorm.includes('cash') || pmNorm.includes('especie')) {
          finalPaymentMethod = 'cash';
        } else {
          finalPaymentMethod = 'other';
        }
      }
      
      // Preparar dados da conta a pagar
      // SEMPRE forçar status 'pending' (GPT não deve definir status)
      const billData = {
        description: this.capitalizeDescription(description),
        amount: parseFloat(amount),
        due_date: parsedDueDate,
        category_id: categoryId,
        cost_center_id: costCenterId,
        is_shared: isShared,
        payment_method: finalPaymentMethod,
        card_id: cardId,
        is_recurring: is_recurring || false,
        recurrence_frequency: (is_recurring && recurrence_frequency) ? recurrence_frequency : null,
        organization_id: context.organizationId,
        user_id: context.userId,
        status: 'pending' // ✅ SEMPRE 'pending' ao criar conta (nunca 'paid')
      };
      
      console.log('💾 [BILL] billData antes de salvar:', JSON.stringify(billData, null, 2));
      
      console.log('💾 [BILL] Dados preparados:', billData);
      
      // Salvar conta a pagar
      const { data, error } = await supabase
        .from('bills')
        .insert(billData)
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao salvar conta a pagar:', error);
        throw error;
      }
      
      console.log('✅ Conta a pagar salva:', data.id);
      
      // Formatar resposta
      const amountFormatted = Number(amount).toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const dueDateOnly = new Date(dueDateObj);
      dueDateOnly.setHours(0, 0, 0, 0);
      
      const daysUntil = Math.ceil((dueDateOnly - today) / (1000 * 60 * 60 * 24));
      let dateDisplay = dueDateObj.toLocaleDateString('pt-BR');
      
      if (daysUntil === 0) {
        dateDisplay = 'Vence hoje';
      } else if (daysUntil === 1) {
        dateDisplay = 'Vence amanhã';
      } else if (daysUntil < 0) {
        dateDisplay = `Venceu há ${Math.abs(daysUntil)} ${Math.abs(daysUntil) === 1 ? 'dia' : 'dias'}`;
      } else {
        dateDisplay = `Vence em ${daysUntil} ${daysUntil === 1 ? 'dia' : 'dias'}`;
      }
      
      const greetings = [
        'Conta registrada! ✅',
        'Conta anotada! ✅',
        'Pronto! ✅',
        'Beleza, anotei! ✅',
        'Anotado! ✅'
      ];
      
      const greeting = this.pickVariation(greetings, description);
      
      const confirmationParts = [];
      confirmationParts.push(`R$ ${amountFormatted} - ${description}`);
      
      if (categoryName) {
        confirmationParts.push(categoryName);
      }
      
      if (finalPaymentMethod) {
        const paymentLabels = {
          'credit_card': 'Cartão de Crédito',
          'debit_card': 'Cartão de Débito',
          'pix': 'PIX',
          'boleto': 'Boleto',
          'bank_transfer': 'Transferência',
          'cash': 'Dinheiro',
          'other': 'Outro'
        };
        confirmationParts.push(paymentLabels[finalPaymentMethod] || finalPaymentMethod);
      }
      
      confirmationParts.push(owner);
      confirmationParts.push(dateDisplay);
      
      if (is_recurring) {
        const freqLabels = {
          'monthly': 'Mensal',
          'weekly': 'Semanal',
          'yearly': 'Anual'
        };
        confirmationParts.push(`Recorrente: ${freqLabels[recurrence_frequency] || 'Mensal'}`);
      }
      
      const response = `${greeting}\n${confirmationParts.join('\n')}`;
      
      return {
        success: true,
        message: response,
        bill_id: data.id
      };
      
    } catch (error) {
      console.error('❌ Erro ao salvar conta a pagar:', error);
      const firstName = this.getFirstName(context);
      const namePart = firstName ? ` ${firstName}` : '';
      
      const errorMessages = [
        `Ops${namePart}! Tive um problema ao registrar a conta. 😅`,
        `Eita${namePart}, algo deu errado aqui. 😅`,
        `Poxa${namePart}, tive um erro. 😅`
      ];
      
      return {
        success: false,
        message: this.pickVariation(errorMessages, 'erro')
      };
    }
  }

  /**
   * Obter resumo de despesas
   */
  async getExpensesSummary(args, context) {
    try {
      console.log('📊 [SUMMARY] Buscando resumo de despesas:', args);
      
      const { period, category } = args;
      
      if (!period) {
        return {
          success: false,
          message: 'Preciso saber o período para buscar o resumo (hoje, esta semana, este mês, mês anterior)'
        };
      }
      
      // Calcular datas baseado no período
      const today = new Date();
      let startDate, endDate;
      
      switch (period) {
        case 'hoje':
          startDate = new Date(today);
          endDate = new Date(today);
          break;
        case 'esta_semana':
          const dayOfWeek = today.getDay();
          startDate = new Date(today);
          startDate.setDate(today.getDate() - dayOfWeek);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(today);
          endDate.setHours(23, 59, 59, 999);
          break;
        case 'este_mes':
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          // Usar primeiro dia do próximo mês para comparação com '<' (igual ao frontend)
          endDate = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          break;
        case 'mes_anterior':
          startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
          endDate = new Date(today.getFullYear(), today.getMonth(), 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        default:
          startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          endDate = new Date(today);
      }
      
      // Construir query (usar mesmo filtro do frontend: confirmed, paid ou null)
      let query = supabase
        .from('expenses')
        .select('amount, category')
        .eq('organization_id', context.organizationId)
        .or('status.eq.confirmed,status.eq.paid,status.is.null')
        .gte('date', startDate.toISOString().split('T')[0]);
      
      // Para 'este_mes', usar '<' no endDate (primeiro dia do próximo mês) para consistência com frontend
      // Para outros períodos, usar '<='
      if (period === 'este_mes') {
        query = query.lt('date', endDate.toISOString().split('T')[0]);
      } else {
        query = query.lte('date', endDate.toISOString().split('T')[0]);
      }
      
      // Filtrar por categoria se fornecida
      if (category) {
        // Buscar categoria normalizada
        const { data: categories } = await supabase
          .from('budget_categories')
          .select('id, name')
          .eq('organization_id', context.organizationId);
        
        if (categories && categories.length) {
          const categoryNorm = this.normalizeText(category);
          const matchedCat = categories.find(c => {
            const catNorm = this.normalizeText(c.name);
            return catNorm === categoryNorm || catNorm.includes(categoryNorm) || categoryNorm.includes(catNorm);
          });
          
          if (matchedCat) {
            query = query.eq('category', matchedCat.name);
          } else {
            query = query.eq('category', category);
          }
        } else {
          query = query.eq('category', category);
        }
      }
      
      const { data: expenses, error } = await query;
      
      if (error) {
        console.error('❌ Erro ao buscar despesas:', error);
        throw error;
      }
      
      if (!expenses || expenses.length === 0) {
        const periodLabel = this.formatPeriod(period);
        return {
          success: true,
          message: `💰 Nenhuma despesa encontrada ${periodLabel.toLowerCase()}.`
        };
      }
      
      // Calcular total
      const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalFormatted = total.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      
      // Formatar resposta
      let response = `💰 *Resumo de Despesas* (${this.formatPeriod(period)})\n\n`;
      
      if (category) {
        // Resumo de categoria específica
        response += `*Total em ${category}:* R$ ${totalFormatted}\n`;
        response += `(${expenses.length} despesa${expenses.length !== 1 ? 's' : ''})`;
      } else {
        // Agrupar por categoria
        const byCategory = {};
        expenses.forEach(e => {
          const cat = e.category || 'Sem categoria';
          byCategory[cat] = (byCategory[cat] || 0) + parseFloat(e.amount || 0);
        });
        
        response += `*Total: R$ ${totalFormatted}*\n\n`;
        
        // Ordenar por valor (maior primeiro)
        const sorted = Object.entries(byCategory)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10); // Top 10
        
        sorted.forEach(([cat, value]) => {
          const valueFormatted = value.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          const percent = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
          response += `• ${cat}: R$ ${valueFormatted} (${percent}%)\n`;
        });
        
        response += `\n(${expenses.length} despesa${expenses.length !== 1 ? 's' : ''} no total)`;
      }
      
      return {
        success: true,
        message: response
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar resumo:', error);
      const firstName = this.getFirstName(context);
      const namePart = firstName ? ` ${firstName}` : '';
      
      return {
        success: false,
        message: `Ops${namePart}! Tive um problema ao buscar o resumo. 😅`
      };
    }
  }

  /**
   * Obter resumo por categoria
   */
  async getCategorySummary(args, context) {
    try {
      console.log('📊 [CATEGORY_SUMMARY] Buscando resumo por categoria:', args);
      
      const { category, period } = args;
      
      if (!category || !period) {
        return {
          success: false,
          message: 'Preciso da categoria e do período para buscar o resumo'
        };
      }
      
      // Reutilizar lógica de getExpensesSummary
      const summaryResult = await this.getExpensesSummary({ period, category }, context);
      
      if (!summaryResult.success) {
        return summaryResult;
      }
      
      // Personalizar mensagem para resumo por categoria
      let response = summaryResult.message;
      
      // Se a mensagem começa com "Total em", personalizar
      if (response.includes(`*Total em ${category}:*`)) {
        response = response.replace(
          `*Total em ${category}:*`,
          `*Você gastou em ${category}:*`
        );
      }
      
      return {
        success: true,
        message: response
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar resumo por categoria:', error);
      const firstName = this.getFirstName(context);
      const namePart = firstName ? ` ${firstName}` : '';
      
      return {
        success: false,
        message: `Ops${namePart}! Tive um problema ao buscar o resumo. 😅`
      };
    }
  }

  /**
   * Consultar saldo de contas bancárias
   */
  async getAccountBalance(args, context) {
    try {
      console.log('💰 [BALANCE] Consultando saldo:', args);
      
      const { account_name } = args;
      
      // Buscar contas bancárias
      let query = supabase
        .from('bank_accounts')
        .select('id, name, bank, current_balance, account_type')
        .eq('organization_id', context.organizationId)
        .eq('is_active', true);
      
      // Se especificou conta, filtrar
      if (account_name) {
        const { data: accounts } = await supabase
          .from('bank_accounts')
          .select('id, name, bank')
          .eq('organization_id', context.organizationId)
          .eq('is_active', true);
        
        if (accounts && accounts.length) {
          const accountNorm = this.normalizeText(account_name);
          const matchedAccount = accounts.find(a => {
            const nameNorm = this.normalizeText(a.name);
            const bankNorm = this.normalizeText(a.bank || '');
            return nameNorm.includes(accountNorm) || accountNorm.includes(nameNorm) || 
                   bankNorm.includes(accountNorm) || accountNorm.includes(bankNorm);
          });
          
          if (matchedAccount) {
            query = query.eq('id', matchedAccount.id);
          } else {
            // Conta não encontrada, retornar todas
            console.log('⚠️ Conta não encontrada, retornando todas');
          }
        }
      }
      
      const { data: accounts, error } = await query.order('name');
      
      if (error) {
        console.error('❌ Erro ao buscar contas:', error);
        throw error;
      }
      
      if (!accounts || accounts.length === 0) {
        return {
          success: true,
          message: '💰 Nenhuma conta bancária cadastrada.'
        };
      }
      
      // Formatar resposta
      let response = '💰 *Saldo das Contas*\n\n';
      
      if (accounts.length === 1) {
        // Uma conta específica
        const account = accounts[0];
        const balance = parseFloat(account.current_balance || 0);
        const balanceFormatted = balance.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        const accountTypeLabel = account.account_type === 'checking' ? 'Conta Corrente' : 'Poupança';
        
        response += `*${account.name}*\n`;
        if (account.bank) {
          response += `${account.bank} - `;
        }
        response += `${accountTypeLabel}\n`;
        response += `Saldo: *R$ ${balanceFormatted}*`;
      } else {
        // Múltiplas contas
        let total = 0;
        
        accounts.forEach(account => {
          const balance = parseFloat(account.current_balance || 0);
          total += balance;
          const balanceFormatted = balance.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
          });
          const accountTypeLabel = account.account_type === 'checking' ? 'CC' : 'PP';
          const bankPart = account.bank ? ` (${account.bank})` : '';
          
          response += `• ${account.name}${bankPart} ${accountTypeLabel}: R$ ${balanceFormatted}\n`;
        });
        
        const totalFormatted = total.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        });
        
        response += `\n*Total: R$ ${totalFormatted}*`;
      }
      
      return {
        success: true,
        message: response
      };
      
    } catch (error) {
      console.error('❌ Erro ao consultar saldo:', error);
      const firstName = this.getFirstName(context);
      const namePart = firstName ? ` ${firstName}` : '';
      
      return {
        success: false,
        message: `Ops${namePart}! Tive um problema ao consultar o saldo. 😅`
      };
    }
  }

  /**
   * Formatar período para exibição
   */
  formatPeriod(period) {
    const map = {
      'hoje': 'Hoje',
      'esta_semana': 'Esta Semana',
      'este_mes': 'Este Mês',
      'mes_anterior': 'Mês Anterior'
    };
    return map[period] || period;
  }

  /**
   * Processar mensagem do usuário (método principal)
   */
  async processMessage(message, userId, userName, userPhone, context = {}) {
    try {
      console.log(`📨 [ZUL] Processando mensagem de ${userName} (${userId})`);
      console.log(`📨 [ZUL] Mensagem: "${message}"`);
      console.log(`📨 [ZUL] Context recebido:`, JSON.stringify(context, null, 2));
      
      // Se for do chat web (sem userPhone), usar versão web
      if (!userPhone) {
        console.log('💻 [ZUL] Chat web detectado - usando assistente financeiro geral');
        const response = await this.sendWebChatMessage(
          userId, 
          message, 
          { userName, ...context }
        );
        
        return {
          message: response,
          threadId: null
        };
      }
      
      // Se for WhatsApp (com userPhone), usar método conversacional original
      console.log('📱 [ZUL] WhatsApp detectado - usando registrador de despesas');
      const response = await this.sendConversationalMessage(
        userId, 
        message, 
        { userName, organizationId: context.organizationId, ...context }, 
        userPhone
      );
      
      return {
        message: response,
        threadId: null // GPT-4 não usa threads
      };
      
    } catch (error) {
      console.error('❌ [ZUL] Erro ao processar mensagem:', error);
      throw error;
    }
  }

  /**
   * Enviar mensagem para chat web (assistente financeiro geral)
   */
  async sendWebChatMessage(userId, userMessage, context = {}) {
    return await this.webChat.sendWebChatMessage(userId, userMessage, context);
  }
}


export default ZulAssistant;

