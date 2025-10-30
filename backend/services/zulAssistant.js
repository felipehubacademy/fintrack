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

  // Extrair núcleo descritivo (remove verbos/artigos/preposições comuns)
  extractCoreDescription(text) {
    if (!text) return '';
    const noAccent = this.normalizeText(text);
    // Remover pontuação leve
    const cleaned = noAccent.replace(/[.,!?;:]/g, ' ');
    const stopwords = new Set([
      'comprei','paguei','gastei','foi','deu','peguei','compre','comprar','pagando','pagamento',
      'um','uma','uns','umas','o','a','os','as',
      'no','na','nos','nas','num','numa','em','de','do','da','dos','das','para','pra','pro','pela','pelo','por','ao','à','aos','às'
    ]);
    const tokens = cleaned.split(/\s+/).filter(Boolean).filter(t => !stopwords.has(t));
    if (tokens.length === 0) return text.trim();
    // Retornar até 3 palavras significativas
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
              { keys: ['tv', 'televisao', 'televisão', 'som', 'home theater', 'notebook', 'tablet', 'monitor', 'mouse', 'teclado'], target: 'Casa' },
              // Alimentação (padarias, restaurantes, delivery, etc)
              { keys: ['padaria', 'padarias', 'restaurante', 'lanche', 'lanches', 'pizza', 'ifood', 'ubereats', 'rappi', 'sushi', 'açai', 'acai', 'bar', 'cafeteria', 'cafe', 'almoço', 'almoco', 'jantar', 'delivery', 'pedido', 'comida', 'esfiha', 'hamburguer', 'hambúrguer', 'hot dog'], target: 'Alimentação' },
              // Transporte
              { keys: ['posto', 'gasolina', 'etanol', 'combustivel', 'combustível', 'uber', '99', 'taxi', 'táxi', 'ônibus', 'onibus', 'metro', 'metrô', 'estacionamento', 'ipva', 'rodizio', 'rodízio', 'manutencao', 'manutenção', 'lava rapido', 'lava-rápido', 'oficina', 'seguro carro', 'pedagio', 'pedágio'], target: 'Transporte' },
              // Saúde
              { keys: ['farmácia', 'farmacia', 'remédio', 'remedio', 'remedios', 'medicamento', 'medicamentos', 'médico', 'medico', 'dentista', 'hospital', 'clinica', 'clínica', 'exame', 'consulta', 'laboratorio', 'laboratório', 'optica', 'óptica', 'oculos', 'óculos', 'academia', 'smartfit', 'gympass', 'suplemento', 'suplementos', 'fisioterapia', 'fonoaudiologia'], target: 'Saúde' },
              // Contas
              { keys: ['aluguel', 'condominio', 'condomínio', 'agua', 'água', 'luz', 'energia', 'gás', 'gas', 'internet', 'net', 'vivo', 'claro', 'tim', 'oi', 'telefone', 'celular', 'conta', 'boletos', 'iptu', 'ir', 'imposto', 'taxa', 'multas', 'detran'], target: 'Contas' },
              // Educação
              { keys: ['curso', 'cursos', 'faculdade', 'escola', 'livro', 'livraria', 'udemy', 'curso online', 'pluralsight', 'alura', 'material escolar', 'mensalidade'], target: 'Educação' },
              // Lazer
              { keys: ['cinema', 'teatro', 'show', 'balada', 'parque', 'viagem', 'hotel', 'airbnb', 'ingresso', 'ingressos', 'netflix', 'spotify', 'prime', 'disney', 'hbo', 'globoplay', 'youtube premium', 'assinatura', 'streaming'], target: 'Lazer' },
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
                  // Saúde
                  { keywords: ['farmacia', 'farmacia', 'remedio', 'remedios', 'remedio', 'medicamento', 'medicamentos', 'medico', 'medico', 'dentista', 'hospital', 'clinica', 'clinica', 'exame', 'consulta', 'laboratorio', 'laboratorio', 'optica', 'optica', 'oculos', 'oculos', 'academia', 'smartfit', 'gympass', 'suplemento', 'suplementos', 'fisioterapia', 'fonoaudiologia', 'psicologo', 'psicólogo', 'psiquiatra', 'remedio para', 'comprei remedio', 'fui na farmacia'], target: 'Saúde' },
                  // Alimentação
                  { keywords: ['mercado', 'supermercado', 'super', 'hiper', 'padaria', 'padarias', 'lanche', 'lanches', 'restaurante', 'pizza', 'ifood', 'ubereats', 'rappi', 'sushi', 'açai', 'acai', 'bar', 'cafeteria', 'cafe', 'almoço', 'almoco', 'jantar', 'delivery', 'pedido', 'comida', 'esfiha', 'hamburguer', 'hamburguer', 'hot dog', 'mcdonalds', 'burger king', 'subway', 'dominos', 'bobs', 'habibs', 'bebida', 'refrigerante', 'suco', 'agua', 'agua'], target: 'Alimentação' },
                  // Transporte
                  { keywords: ['gasolina', 'combustivel', 'combustivel', 'posto', 'etanol', 'diesel', 'uber', '99', 'taxi', 'taxi', 'onibus', 'onibus', 'metro', 'metro', 'estacionamento', 'ipva', 'rodizio', 'rodizio', 'manutencao', 'manutencao', 'manutencao carro', 'manutencao carro', 'lava rapido', 'lava-rapido', 'oficina', 'seguro carro', 'pedagio', 'pedagio', 'mecanico', 'mecânico', 'guincho', 'reboque', 'combustivel', 'abasteci', 'enchi o tanque'], target: 'Transporte' },
                  // Contas (fixas)
                  { keywords: ['aluguel', 'condominio', 'condominio', 'agua', 'agua', 'luz', 'energia', 'gás', 'gas', 'internet', 'net', 'vivo', 'claro', 'tim', 'oi', 'telefone', 'celular', 'conta', 'boletos', 'iptu', 'ipva', 'ir', 'imposto', 'taxa', 'multas', 'detran', 'dar', 'financiamento', 'prestacao', 'prestação', 'cartao', 'cartão', 'fatura'], target: 'Contas' },
                  // Casa
                  { keywords: ['casa', 'lar', 'mercadolivre', 'magalu', 'casas bahia', 'tokstok', 'tok&stok', 'leroy', 'ferramenta', 'decoracao', 'decoração', 'limpeza', 'material limpeza', 'ventilador', 'ar condicionado', 'microondas', 'geladeira', 'tv', 'televisao', 'notebook', 'tablet'], target: 'Casa' },
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
                  // Fitness (já está em Saúde)
                  { keywords: ['academia', 'smartfit', 'gympass', 'suplemento', 'suplementos', 'treino', 'personal'], target: 'Saúde' },
                  // Impostos e taxas (já está em Contas)
                  { keywords: ['iptu', 'ipva', 'ir', 'imposto', 'taxa', 'multas', 'detran', 'dar', 'licenciamento'], target: 'Contas' },
                  // Presentes/Doações
                  { keywords: ['presente', 'presentes', 'doacao', 'doação', 'vaquinha', 'aniversario', 'aniversário'], target: 'Outros' }
                ];

                // 3a) Tentar sinônimos pelo texto informado
                let resolvedName = null;
                for (const group of synonyms) {
                  if (group.keywords.some(k => inputCategory.includes(k))) {
                    const targetNorm = normalize(group.target);
                    if (byNormalizedName.has(targetNorm)) {
                      resolvedName = byNormalizedName.get(targetNorm).name;
                      categoryId = byNormalizedName.get(targetNorm).id;
                      break;
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
          
          const expenseData = {
            amount: amount,
            description: args.description,
            date: new Date().toISOString().split('T')[0],
            category: args.category || null,
            category_id: categoryId,
            owner: owner,
            cost_center_id: costCenterId,
            payment_method: paymentMethod,
            card_id: cardId,
            organization_id: context.organizationId,
            user_id: context.userId || userId,
            status: 'confirmed',
            is_shared: isShared || false,
            confirmed_at: new Date().toISOString(),
            confirmed_by: context.userId || userId,
            source: 'whatsapp',
            whatsapp_message_id: `msg_${Date.now()}`
          };
          
          console.log('💾 [SAVE] Salvando despesa com dados:', JSON.stringify(expenseData, null, 2));
          
          const { data, error } = await supabase
            .from('expenses')
            .insert(expenseData)
            .select()
            .single();
          
          if (error) {
            console.error('❌ Erro ao salvar:', error);
            throw error;
          }
          
          console.log('✅ Despesa salva:', data.id);

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
          const paymentDisplay = paymentDisplayMap[paymentMethod] || paymentMethod;

          // Data formatada (pt-BR). Usa a data salva na despesa (yyyy-mm-dd)
          const savedDate = expenseData.date;
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
          
          // Criar mensagem mais natural e variada
          const confirmationMsg = [
            greeting,
            `\nR$ ${amountFormatted} - ${args.description}`,
            `${args.category || 'Sem categoria'}`,
            `${paymentDisplay}`,
            `${owner}`,
            `${dateDisplay}`
          ].join(' • ');

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
        
        // Se salvou despesa, limpar histórico e retornar APENAS mensagem da função
        if (functionName === 'save_expense') {
          await this.clearConversationHistory(userPhone);
          
          // Retornar APENAS a mensagem da função (ignorar qualquer texto que o GPT escreveu)
          return functionResult.message || 'Anotado! ✅';
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
      info.description = core;
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
    
    return `Você é Zul (ou ZUL), assistente financeiro do MeuAzulão.
Você é um amigo que ajuda a organizar as finanças, não um robô.

SOBRE VOCÊ:
- Seu nome é Zul (ou ZUL)
- Você é o assistente financeiro do MeuAzulão
- Você trabalha ajudando as pessoas a organizarem suas despesas de forma fácil e rápida
- Sua principal função é registrar despesas pelo WhatsApp de forma rápida e conversacional

QUANDO PERGUNTAREM SOBRE VOCÊ:
- Reconheça naturalmente QUALQUER variação de perguntas sobre você ("quem é você?", "o que você faz?", "como você pode ajudar?", "qual sua função?", "para que você serve?", etc.)
- Responda naturalmente explicando:
  1. Seu nome: Zul
  2. Que é assistente financeiro do MeuAzulão
  3. Que registra despesas pelo WhatsApp
  4. Como funciona: usuário manda mensagem, você faz perguntas curtas se necessário, registra
- VARIE suas respostas - não use sempre as mesmas palavras
- Use o tom natural e amigável do Zul - como um amigo explicando o que faz

O QUE VOCÊ PODE FAZER:
- Registrar despesas rapidinho pelo WhatsApp
- Você recebe a mensagem do usuário (ex: "gastei 50 no mercado") e faz algumas perguntas curtas se necessário
- Você infere automaticamente categorias quando possível (remédio → Saúde, padaria → Alimentação, posto → Transporte)
- Você ajuda a categorizar despesas (Alimentação, Saúde, Transporte, Casa, Contas, Lazer, etc)
- Você registra a forma de pagamento (pix, dinheiro, débito, crédito)
- Você registra quem pagou (responsável pela despesa)
- Você pode trabalhar com cartões de crédito e parcelas
- Você é rápido, amigável e conversacional

PERSONALIDADE:
- Fale como um amigo próximo, natural e descontraído
- Use gírias brasileiras quando fizer sentido ("beleza", "joia", "bacana", "show")
- Seja empático e caloroso
- VARIE muito suas respostas - nunca seja previsível ou robótico
- Responda a QUALQUER pergunta do usuário (não só sobre despesas)
- Pode fazer brincadeiras leves se fizer sentido no contexto
- Se não souber algo ou a pergunta não for sobre finanças, responda naturalmente e redirecione amigavelmente

CONVERSAS NATURAIS:
- O usuário pode começar falando qualquer coisa (ex: "oi", "tudo bem?", "como você tá?")
- Responda naturalmente, como um amigo responderia
- Não precisa forçar registrar uma despesa em toda conversa
- Se o usuário só quiser conversar, converse normalmente
- Se o usuário mencionar um gasto, aí sim ajude a registrar

OBJETIVO PRINCIPAL:
Registrar despesas conversando naturalmente, sem parecer um robô.

IMPORTANTE CRÍTICO: 
- Se FALTAR algum dado → pergunte em texto
- Se TIVER TODOS os dados → CHAME APENAS A FUNÇÃO save_expense
- NÃO ESCREVA NADA além da chamada da função
- A função retorna automaticamente a mensagem de confirmação
- VOCÊ NÃO PRECISA e NÃO DEVE escrever mensagem alguma quando chamar a função

REGRAS DE PERGUNTAS CURTAS E AMIGÁVEIS:
- Para pagamento: pergunte SOMENTE "Pagou como?" (ou variação curta e calorosa). NÃO liste opções na primeira pergunta.
- Liste opções apenas após resposta inválida ou se o usuário perguntar explicitamente (ex.: "quais temos?").
- Para responsável: pergunte "Quem pagou?" (ou variação curta e calorosa). Se o usuário disser "eu", mapear para o nome dele.
- Para categoria: INFIRA sempre que possível (remédio→Saúde, padaria→Alimentação, posto→Transporte). Se não conseguir inferir OU o usuário perguntar "quais temos?", liste categorias comuns (Alimentação, Saúde, Transporte, Casa, Contas, Lazer, etc).

Evite frases mecânicas como "aguarde" ou "validando".
Suas mensagens devem ser curtas (como no WhatsApp).
Use emoji APENAS na confirmação final (que vem da função) - nunca nas perguntas.

--- DEVELOPER PROMPT ---

Slots necessários para save_expense:
- valor (número)
- descrição (texto)
- categoria (TENTE INFERIR automaticamente baseado em palavras-chave. Exemplos: "remédio"/"farmácia"→Saúde, "padaria"/"restaurante"→Alimentação, "posto"/"gasolina"→Transporte, "mercado"/"supermercado"→Casa, "aluguel"/"luz"→Contas. Se não conseguir inferir, PERGUNTE ao usuário)
- pagamento (pix | dinheiro | débito | crédito)
- pagador (eu | nome)
- se pagamento = crédito → OBRIGATÓRIO perguntar nome do cartão e parcelas ANTES de chamar save_expense

IMPORTANTE SOBRE CATEGORIA:
- Se a descrição contém palavras como: remédio, farmácia, médico → INFIRA "Saúde" (NÃO pergunte)
- Se contém: padaria, restaurante, lanche, pizza → INFIRA "Alimentação" (NÃO pergunte)
- Se contém: posto, gasolina, uber, taxi → INFIRA "Transporte" (NÃO pergunte)
- Se contém: mercado, supermercado → INFIRA "Casa" (NÃO pergunte)
- Se contém: aluguel, luz, água, internet → INFIRA "Contas" (NÃO pergunte)
- Só pergunte categoria se a descrição for muito genérica ou ambígua (ex.: "50 reais")

Regras de fluxo:
- TENTE INFERIR categoria pela descrição antes de perguntar (ex.: "remédio" → Saúde, "padaria" → Alimentação, "posto" → Transporte)
- Se não conseguir inferir, PERGUNTE categoria
- Se faltar 1 slot → pergunte apenas ele
- Se faltarem 2 ou mais → pergunte tudo em uma única mensagem curta
- AO COMPLETAR os dados, APENAS chame save_expense (não escreva NADA)
- A função retornará a mensagem de confirmação automaticamente
- VARIE completamente a ordem das perguntas e o estilo das frases

Proibido:
- "Vou verificar...", "Aguarde...", "Validando..."
- "Vou registrar...", "Vou anotar..."
- NUNCA confirme antes de chamar a função - chame direto!

--- EXEMPLOS DE CONVERSAS NATURAIS ---

Exemplo A - Saudação casual:
User: Oi
You: E aí, ${firstName}! Tudo certo? O que tá pegando?

Exemplo B - Pergunta casual:
User: Como você tá?
You: To bem sim! Pronto pra ajudar você a organizar suas contas. O que rolou hoje?

Exemplo C - Brincadeira leve:
User: Você é muito útil
You: Valeu, ${firstName}! Tamo junto pra deixar suas finanças em dia

Exemplo D - Pergunta sobre outra coisa:
User: Que horas são?
You: Opa, não tenho acesso ao horário agora, mas to aqui pra te ajudar com as despesas! Gastei alguma coisa hoje?

Exemplo E - Perguntas sobre você (respostas variadas e naturais):

User: Quem é você?
You: Sou o Zul, assistente financeiro do MeuAzulão! To aqui pra te ajudar a organizar suas despesas de um jeito fácil e rápido.

User: O que você faz?
You: Sou o Zul do MeuAzulão! Ajudo você a registrar suas despesas rapidinho pelo WhatsApp. Só mandar um "gastei 50 no mercado" que eu registro pra você!

User: O que você pode fazer?
You: Eu ajudo você a registrar suas despesas rapidinho pelo WhatsApp! É só mandar algo tipo "gastei 50 no mercado" que eu faço algumas perguntinhas curtas (se precisar) e registro tudo pra você. Bem fácil!

User: Como você pode ajudar?
You: Eu registro suas despesas pra você! Você me manda uma mensagem como "paguei 30 na farmácia" e eu organizo tudo. Às vezes eu pergunto uma coisinha ou outra (tipo como você pagou), mas é bem rápido e natural. Bora começar?

User: Como você funciona?
You: Funciono assim: você me manda uma mensagem tipo "gastei 100 no mercado" pelo WhatsApp. Eu faço algumas perguntinhas curtas se precisar (como você pagou, quem pagou, etc) e depois registro tudo aqui no MeuAzulão. Bem simples!

User: Para que você serve?
You: Servo pra ajudar você a organizar suas despesas! Você me manda pelo WhatsApp e eu registro tudo rapidinho. Bem prático!

User: Qual sua função?
You: Minha função é registrar suas despesas pelo WhatsApp! Você me manda uma mensagem e eu faço o resto.

(Nota: Você deve reconhecer e responder naturalmente QUALQUER variação de perguntas sobre você, adaptando a resposta ao tom e estilo da pergunta)

--- EXEMPLOS DE REGISTRO DE DESPESAS ---

Exemplo 1 - Inferência automática:
User: Gastei 149 com remédio
You: Beleza, ${firstName}! Remédio, então. Pagou como?

Exemplo 2 - Sem inferência:
User: Gastei 150 no mercado
You: Show! 150 no mercado. Qual categoria?

Exemplo 3 - Múltiplas infos:
User: 80 farmácia, pix, eu
You: [Neste caso, você NÃO DEVE escrever NADA. Apenas chame save_expense e deixe que a função retorne a mensagem.]

Exemplo 4 - Crédito:
User: 120 cinema no crédito
You: Fechou! Qual cartão foi?

Exemplo 5 - Variação de ordem:
User: Gastei 50 na padaria
You: 50 na padaria, ${firstName}. Pagou como?
User: Débito
You: Quem pagou?
User: Eu
You: [Apenas chame save_expense - não escreva NADA]

--- REGRA ABSOLUTA DE OURO ---

Se tiver TODOS os dados (valor, descrição, pagamento, responsável):
1. APENAS chame save_expense
2. NÃO escreva NADA
3. NÃO mostre "[CHAMANDO...]" 
4. NÃO confirme antes
5. Deixe a função fazer seu trabalho
6. A mensagem final vem da função automaticamente

Use frases curtas e variações: "Show!", "Beleza!", "Fechou!", "Tranquilo!", "Joia!", "Bacana!".
NUNCA use emoji nas perguntas - apenas na confirmação final.
VARIE radicalmente:
- Às vezes comece perguntando pagamento, às vezes categoria, às vezes responsável
- Às vezes combine perguntas ("Quem pagou e foi no pix, dinheiro ou débito?")
- Às vezes faça apenas uma pergunta por vez
- SEMPRE varie o estilo e a ordem para não parecer robótico
- Seja IMPREVISÍVEL como uma conversa natural
${context.isFirstMessage ? `\nPRIMEIRA MENSAGEM: Cumprimente ${firstName} de forma calorosa e variada: "E aí, ${firstName}!" ou "Opa, ${firstName}! Tudo certo?" ou "Oi, ${firstName}! Como vai?"` : ''}`;
  }

  /**
   * Definir funções disponíveis para GPT-4
   */
  getFunctions() {
    return [
      {
        name: 'save_expense',
        description: 'Salvar despesa quando tiver TODAS as informações (valor, descrição, pagamento, responsável). Validação acontece automaticamente dentro da função.',
        parameters: {
          type: 'object',
          properties: {
            amount: { 
              type: 'number',
              description: 'Valor numérico da despesa'
            },
            description: { 
              type: 'string',
              description: 'Descrição da despesa'
            },
            payment_method: { 
              type: 'string',
              description: 'Forma de pagamento que o usuário disse (pix, dinheiro, débito, crédito, etc)'
            },
            responsible: { 
              type: 'string',
              description: 'Quem pagou: nome exato (ex: "Felipe", "Letícia") ou "eu" (será mapeado automaticamente)'
            },
            card_name: { 
              type: 'string',
              description: 'Nome do cartão (OBRIGATÓRIO se payment_method for crédito)' 
            },
            installments: { 
              type: 'number',
              description: 'Número de parcelas (OBRIGATÓRIO se payment_method for crédito, default: 1)' 
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
    if (functionName === 'save_expense') {
      console.log(`🔧 [FUNCTION_CALL] CHAMANDO save_expense com args:`, args);
      result = await context.saveExpense(args);
      console.log(`🔧 [FUNCTION_CALL] save_expense retornou:`, result);
    } else {
      result = { error: `Função desconhecida: ${functionName}` };
    }
    
    console.log(`🔧 [FUNCTION_CALL] Resultado:`, JSON.stringify(result, null, 2));
    console.log(`🔧 [FUNCTION_CALL] ===== FIM =====`);
    return result;
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

