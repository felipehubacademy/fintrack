import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import OpenAIService from './openaiService.js';
import ZulMessages from './zulMessages.js';
import ZulAssistant from './zulAssistant.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Conversa inteligente para MeuAzulão
 * Analisa mensagens e extrai informações automaticamente
 */
class SmartConversation {
  constructor() {
    this.openai = new OpenAIService();
    this.zulMessages = new ZulMessages();
    this.zulAssistant = new ZulAssistant();
    
    // Debug: ver exatamente o valor da variável
    console.log('🔍 [CONSTRUCTOR] USE_ZUL_ASSISTANT raw:', JSON.stringify(process.env.USE_ZUL_ASSISTANT));
    console.log('🔍 [CONSTRUCTOR] typeof:', typeof process.env.USE_ZUL_ASSISTANT);
    console.log('🔍 [CONSTRUCTOR] length:', process.env.USE_ZUL_ASSISTANT?.length);
    console.log('🔍 [CONSTRUCTOR] comparison result:', process.env.USE_ZUL_ASSISTANT === 'true');
    
    this.useAssistant = process.env.USE_ZUL_ASSISTANT === 'true'; // Feature flag
    console.log('🔍 [CONSTRUCTOR] useAssistant final:', this.useAssistant);
  }

  /**
   * Normaliza nomes para comparação consistente
   */
  normalizeName(name) {
    if (!name || typeof name !== 'string') return '';
    
    return name
      .toLowerCase()
      .normalize('NFD') // Decompor caracteres acentuados
      .replace(/[\u0300-\u036f]/g, '') // Remover acentos
      .trim();
  }

  /**
   * Mapeia nomes normalizados para nomes canônicos
   * Para nomes futuros, mantém a capitalização original mas normaliza
   */
  getCanonicalName(name) {
    const normalized = this.normalizeName(name);
    const nameMapping = {
      'compartilhado': 'Compartilhado',
      'compartilhada': 'Compartilhado',
      'compartilhar': 'Compartilhado'
    };
    
    // Se encontrou no mapeamento, usar o nome canônico
    if (nameMapping[normalized]) {
      return nameMapping[normalized];
    }
    
    // Para nomes futuros, capitalizar primeira letra de cada palavra
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Normaliza método de pagamento para valores canônicos V2
   */
  normalizePaymentMethod(input) {
    if (!input) return 'other';
    
    const t = String(input)
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    
    console.log('🔍 [NORMALIZE] Input:', input, '→ Normalized:', t);
    
    // Cartão de Crédito - todas as variações
    if (/cred/.test(t) || /cart.*cred/.test(t) || /credito/.test(t) || 
        /credito/.test(t) || /cartao.*credito/.test(t) || /cartao.*cred/.test(t) ||
        /visa/.test(t) || /mastercard/.test(t) || /amex/.test(t) ||
        /cred/.test(t) || /credit/.test(t)) {
      console.log('🔍 [NORMALIZE] → credit_card');
      return 'credit_card';
    }
    
    // Cartão de Débito - todas as variações
    if (/deb/.test(t) || /cart.*deb/.test(t) || /debito/.test(t) ||
        /cartao.*debito/.test(t) || /cartao.*deb/.test(t) ||
        /debit/.test(t)) {
      console.log('🔍 [NORMALIZE] → debit_card');
      return 'debit_card';
    }
    
    // PIX - todas as variações
    if (/pix/.test(t)) {
      console.log('🔍 [NORMALIZE] → pix');
      return 'pix';
    }
    
    // Dinheiro - todas as variações
    if (/(dinheiro|cash|especie|especie|notas|moedas)/.test(t)) {
      console.log('🔍 [NORMALIZE] → cash');
      return 'cash';
    }
    
    // Transferência bancária
    if (/(transferencia|ted|doc|pix|pix instantaneo)/.test(t)) {
      console.log('🔍 [NORMALIZE] → bank_transfer');
      return 'bank_transfer';
    }
    
    // Boleto
    if (/(boleto|fatura|conta)/.test(t)) {
      console.log('🔍 [NORMALIZE] → boleto');
      return 'boleto';
    }
    
    console.log('🔍 [NORMALIZE] → other (fallback)');
    return 'other';
  }

  /**
   * Heurística simples para detectar início de nova despesa
   */
  isLikelyNewExpenseMessage(text) {
    if (!text) return false;
    const t = String(text).toLowerCase();
    
    // Padrões que indicam nova despesa (mais específicos)
    const expensePatterns = [
      /(gastei|paguei|comprei|r\$)/,  // Palavras-gatilho
      /^\w+\s+\d+[\.,]?\d*\s+(crédito|débito|pix|dinheiro|à vista)/,  // "Mercado 300 crédito"
      /\d+[\.,]?\d*\s+(no|na|em)\s+\w+/,  // "300 no mercado", "50 na farmácia"
      /^\w+\s+\d+[\.,]?\d*$/,  // "Mercado 300" (sem método de pagamento)
    ];
    
    // Padrões que indicam resposta sobre cartão (NÃO são despesas)
    const cardResponsePatterns = [
      /^\w+\s+\d+x$/,  // "latam 3x", "nubank 2x"
      /^\w+\s+(à vista)$/,  // "latam à vista"
      /^\w+\s+(uma|duas|três|quatro|cinco|seis|sete|oito|nove|dez|onze|doze)\s+(vezes|x)$/,  // "latam duas vezes"
    ];
    
    const hasExpensePattern = expensePatterns.some(pattern => pattern.test(t));
    const hasCardResponsePattern = cardResponsePatterns.some(pattern => pattern.test(t));
    const hasNumber = /\d+[\.,]?\d*/.test(t);
    
    // Se parece resposta sobre cartão, NÃO é nova despesa
    if (hasCardResponsePattern) return false;
    
    return hasExpensePattern && hasNumber;
  }

  /**
   * Analisar mensagem e extrair informações da despesa
   */
  async analyzeExpenseMessage(text, userPhone) {
    try {
      console.log(`🧠 Analisando mensagem: "${text}"`);
      
      // Buscar usuário para obter categorias da organização
      const user = await this.getUserByPhone(userPhone);
      const categories = user ? await this.getBudgetCategories(user.organization_id) : [];
      const categoryNames = categories.map(cat => cat.name).join(', ');
      
      const prompt = `Você é um assistente financeiro especializado APENAS em processar despesas do MeuAzulão.

REGRAS RÍGIDAS:
1. Processe APENAS mensagens sobre gastos/despesas
2. Ignore completamente qualquer outro assunto
3. Seja extremamente preciso com valores monetários
4. Use APENAS as categorias da organização do usuário
5. Retorne APENAS JSON válido
6. NUNCA use "Outros" como primeira opção - tente identificar a categoria correta

CATEGORIAS DISPONÍVEIS PARA ESTA ORGANIZAÇÃO:
${categoryNames}

MÉTODOS DE PAGAMENTO:
- credit_card: cartão de crédito, crédito, credito, cred, cartão cred
- debit_card: cartão de débito, débito, debito, deb, cartão deb, débito automático
- pix: pix, PIX
- cash: dinheiro, cash, espécie, em espécie
- other: outros métodos não listados

RESPONSÁVEIS: Nomes dos centros de custo da organização (ou null se não especificado)

EXEMPLOS:
"Gastei 50" → {"valor": 50, "descricao": "gasto não especificado", "categoria": "${categories[0]?.name || 'Outros'}", "metodo_pagamento": null, "responsavel": null, "data": "hoje", "confianca": 0.3, "precisa_confirmar": true}

"Gastei 50 no mercado" → {"valor": 50, "descricao": "mercado", "categoria": "Alimentação", "metodo_pagamento": null, "responsavel": null, "data": "hoje", "confianca": 0.9, "precisa_confirmar": true}

"Paguei 30 na farmácia" → {"valor": 30, "descricao": "farmácia", "categoria": "Saúde", "metodo_pagamento": null, "responsavel": null, "data": "hoje", "confianca": 0.95, "precisa_confirmar": true}

"Gastei 25 no débito na padaria" → {"valor": 25, "descricao": "padaria", "categoria": "Alimentação", "metodo_pagamento": "debit_card", "responsavel": null, "data": "hoje", "confianca": 0.9, "precisa_confirmar": true}

"Paguei 40 no cartão de débito" → {"valor": 40, "descricao": "gasto não especificado", "categoria": "Outros", "metodo_pagamento": "debit_card", "responsavel": null, "data": "hoje", "confianca": 0.8, "precisa_confirmar": true}

Se a mensagem NÃO for sobre despesas, retorne: {"erro": "Mensagem não é sobre despesas"}

Retorne APENAS JSON:`;

      const completion = await this.openai.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: prompt },
          { role: 'user', content: text }
        ],
        temperature: 0.1,
        max_tokens: 300,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      
      console.log(`✅ Análise concluída:`, result);
      return result;

    } catch (error) {
      console.error('❌ Erro na análise:', error);
      return null;
    }
  }

  /**
   * Buscar usuário por telefone
   */
  async getUserByPhone(phone) {
    try {
      const normalized = String(phone || '').replace(/\D/g, '');
      // Buscar usuário primeiro
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .in('phone', [normalized])
        .eq('is_active', true)
        .single();

      if (userError) throw userError;
      
      // Buscar organização separadamente
      const { data: organization } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', user.organization_id)
        .single();

      // Buscar centros de custo separadamente
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
   * Buscar centros de custo da organização
   */
  async getCostCenters(organizationId) {
    try {
      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar centros de custo:', error);
      return [];
    }
  }

  /**
   * Buscar categorias de orçamento
   */
  async getBudgetCategories(organizationId) {
    try {
      const { data, error } = await supabase
        .from('budget_categories')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('❌ Erro ao buscar categorias:', error);
      return [];
    }
  }

  /**
   * Enviar mensagem WhatsApp
   */
  async sendWhatsAppMessage(to, text) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!phoneId || !token) {
      console.error('❌ [WHATSAPP] Credenciais não configuradas (PHONE_ID ou WHATSAPP_TOKEN)');
      return false;
    }

    // Normalize phone format (WhatsApp não usa +)
    const normalizedTo = String(to || '').replace(/\D/g, '');

    const message = {
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: {
        body: text,
      },
    };

    try {
      const response = await axios.post(`${WHATSAPP_API_URL}/${phoneId}/messages`, message, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      console.log(`✅ Mensagem enviada para ${normalizedTo}:`, response.data);
      return true;
    } catch (error) {
      // Detectar token expirado (401)
      if (error.response?.status === 401) {
        const authHeader = error.response.headers?.['www-authenticate'] || '';
        if (authHeader.includes('expired')) {
          console.error('🔐 [WHATSAPP] TOKEN EXPIRADO! Atualize o WHATSAPP_TOKEN nas variáveis de ambiente.');
          console.error('📋 [WHATSAPP] Detalhes:', authHeader);
        } else {
          console.error('🔐 [WHATSAPP] Token inválido ou não autorizado.');
        }
      } else {
        console.error(`❌ [WHATSAPP] Erro ao enviar mensagem:`, error.message);
        if (error.response?.data) {
          console.error('📄 [WHATSAPP] Detalhes do erro:', JSON.stringify(error.response.data));
        }
      }
      return false;
    }
  }

  /**
   * Aplicar personalidade do ZUL nas respostas (versão heurística e natural)
   */
  applyZulPersonality(assistantResponse, userName) {
    const response = (assistantResponse || '').trim();
    if (!response) {
      return '';
    }

    const firstName = userName ? userName.split(' ')[0] : '';
    const nameSuffix = firstName ? `, ${firstName}` : '';
    const pick = (options) => options[Math.floor(Math.random() * options.length)];
    const lower = response.toLowerCase();

    const composeQuestion = (questions) => {
      const openings = [
        `Entendi${nameSuffix}.`,
        `Perfeito${nameSuffix}.`,
        `Ótimo${nameSuffix}.`,
        `Beleza${nameSuffix}.`,
        `Certo${nameSuffix}.`,
        `Tudo bem${nameSuffix}.`,
      ];
      const bridges = [
        '',
        ' Me conta: ',
        ' Me diz, ',
        ' Só pra eu registrar: ',
        ' Agora me fala: ',
      ];

      const opening = pick(openings);
      const bridge = pick(bridges);
      const question = pick(questions);

      if (bridge.trim() === '') {
        return `${opening} ${question}`;
      }

      if (bridge.trim().endsWith(',')) {
        return `${opening}${bridge}${question}`;
      }

      return `${opening}${bridge}${question}`;
    };

    const decorateConfirmation = (message) => {
      if (!message) return '';

      const amountMatch = message.match(/R\$\s?([\d.,]+)/i);
      const descriptionMatch = message.match(/(?:no|na|em) ([^.,]+)/i);
      const responsibleMatch = message.match(/para ([^.,]+)/i);

      const baseVariants = [
        'Pronto! {body}',
        'Feito! {body}',
        'Anotado! {body}',
        'Registro concluído! {body}',
      ];

      if (amountMatch && descriptionMatch) {
        const amount = amountMatch[1];
        const description = descriptionMatch[1].trim();
        const responsible = responsibleMatch ? responsibleMatch[1].trim() : null;

        const base = pick(baseVariants).replace('{body}', responsible
          ? `R$ ${amount} em ${description} para ${responsible}.`
          : `R$ ${amount} em ${description}.`);
        const comment = this.getContextualComment(description);
        const extra = comment ? `\n${comment}` : '';
        
        // Adicionar follow-up amigável
        const friendlyClosings = [
          'Qualquer coisa é só me chamar.',
          'Estou por aqui se surgir outra despesa.',
          'Seguimos juntos no controle dos gastos.',
        ];
        const closing = Math.random() > 0.5 ? `\n${pick(friendlyClosings)}` : '';
        
        return `${base}${extra}${closing}`;
      }

      // fallback: apenas garantir que há um toque humano
      const friendlyClosings = [
        'Qualquer coisa é só me chamar.',
        'Estou por aqui se surgir outra despesa.',
        'Seguimos juntos no controle dos gastos.',
      ];

      return `${message}\n${pick(friendlyClosings)}`;
    };

    const paymentKeywords = [/forma de pagamento/, /como (foi|você) pag/, /pagamento/];
    const responsibleKeywords = [/respons[aá]vel/, /quem pagou/, /quem foi/];
    const cardKeywords = [/cart[aã]o/];
    const installmentKeywords = [/parcel/, /vezes/];

    if (paymentKeywords.some((regex) => regex.test(lower))) {
      return composeQuestion([
        'Como você pagou essa despesa?',
        'Qual foi a forma de pagamento?',
        'Qual forma de pagamento devo registrar?',
        'Usou qual forma de pagamento?',
      ]);
    }

    if (responsibleKeywords.some((regex) => regex.test(lower))) {
      return composeQuestion([
        'Quem ficou responsável por essa compra?',
        'Quem pagou essa?',
        'Registramos no nome de quem?',
        'Foi você ou outra pessoa?',
      ]);
    }

    if (cardKeywords.some((regex) => regex.test(lower)) && lower.includes('?')) {
      return composeQuestion([
        'Qual cartão você usou?',
        'Em qual cartão devemos lançar?',
        'Qual cartão entrou nessa?',
        'Sabe me dizer qual cartão foi usado?',
      ]);
    }

    if (installmentKeywords.some((regex) => regex.test(lower)) && lower.includes('?')) {
      return composeQuestion([
        'Em quantas parcelas ficou?',
        'Parcelou em quantas vezes?',
        'Quantas parcelas devo lançar?',
        'Foi em quantas vezes no cartão?',
      ]);
    }

    if (response.startsWith('[save_expense]')) {
      const [command, ...rest] = response.split(']');
      const body = rest.join(']').trim();
      const decorated = decorateConfirmation(body);
      return `${command}] ${decorated}`.trim();
    }

    if (response.includes('Pronto!') || response.includes('Feito!') || response.includes('Salvei!') || response.includes('Anotado!')) {
      return decorateConfirmation(response);
    }

    // Como fallback, adicionar pequenas variações a perguntas curtas
    if (response.endsWith('?') && response.split(' ').length <= 6) {
      return composeQuestion([response.replace(/[?]/g, '').trim() + '?']);
    }

    return response;
  }

  /**
   * Obter comentário contextual baseado na descrição
   */
  getContextualComment(description) {
    const desc = description.toLowerCase();
    
    const contextualComments = {
      'farmácia': 'Agora vocês têm um controle mais claro dos gastos com saúde.',
      'mercado': 'Assim fica mais fácil acompanhar os gastos com alimentação.',
      'gasolina': 'Boa forma de monitorar os custos de transporte.',
      'restaurante': 'Perfeito para controlar os gastos com alimentação fora de casa.',
      'uber': 'Ótimo para acompanhar os gastos com transporte.',
      'cinema': 'Boa forma de controlar os gastos com lazer.',
      'farmacia': 'Agora vocês têm um controle mais claro dos gastos com saúde.'
    };
    
    for (const [keyword, comment] of Object.entries(contextualComments)) {
      if (desc.includes(keyword)) {
        return comment;
      }
    }
    
    return null;
  }

  /**
   * Enviar mensagem conversacional (sem botões)
   */
  async sendConversationalMessage(to, text) {
    const phoneId = process.env.PHONE_ID;
    const token = process.env.WHATSAPP_TOKEN;

    if (!phoneId || !token) {
      console.error('❌ Credenciais WhatsApp não configuradas');
      return;
    }

    const normalizedTo = String(to || '').replace(/\D/g, '');

    const message = {
      messaging_product: 'whatsapp',
      to: normalizedTo,
      type: 'text',
      text: {
        body: text,
      },
    };

    try {
      const response = await axios.post(`${WHATSAPP_API_URL}/${phoneId}/messages`, message, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        timeout: 10000,
      });
      console.log(`✅ Mensagem conversacional enviada para ${to}:`, response.data);
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem:`, error.message);
      if (error.response) {
        console.error('📄 Detalhes do erro:', error.response.data);
      }
    }
  }

  /**
   * Salvar despesa no banco
   */
  async saveExpense(expenseData) {
    try {
      const { data, error } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao salvar despesa:', error);
      throw error;
    }
  }

  /**
   * Processar mensagem usando ZUL Assistant (novo fluxo)
   */
  async handleMessageWithAssistant(text, userPhone) {
    try {
      console.log(`🤖 [ASSISTANT] Processando mensagem de ${userPhone}: "${text}"`);

      // 1. Buscar usuário
      const user = await this.getUserByPhone(userPhone);
      if (!user) {
        await this.sendWhatsAppMessage(userPhone, 
          this.zulMessages.userNotFound()
        );
        return;
      }

      // 2. Buscar contexto necessário
      const costCenters = await this.getCostCenters(user.organization_id);
      const categories = await this.getBudgetCategories(user.organization_id);
      const { data: cards } = await supabase
        .from('cards')
        .select('name, id')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true);

      // 3. Preparar contexto para o Assistant
      const context = {
        userName: user.name,
        userPhone: userPhone,
        organizationId: user.organization_id,
        userId: user.id,
        
        // Funções que o Assistant pode chamar
        validatePaymentMethod: async (userInput) => {
          const normalized = this.normalizePaymentMethod(userInput);
          const valid = ['credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other'].includes(normalized);
          
          return {
            valid,
            normalized_method: normalized,
            available_methods: ['Débito', 'Crédito', 'PIX', 'Dinheiro']
          };
        },

        validateCard: async (cardName, installments, availableCards) => {
          const card = cards?.find(c => 
            this.normalizeName(c.name) === this.normalizeName(cardName)
          );
          
          return {
            valid: !!card,
            card_id: card?.id || null,
            card_name: card?.name || null,
            available_cards: cards?.map(c => c.name) || []
          };
        },

        validateResponsible: async (responsibleName, availableResponsibles) => {
          const normalized = this.normalizeName(responsibleName);
          
          // Compartilhado é sempre válido
          if (normalized === 'compartilhado') {
            return {
              valid: true,
              responsible: 'Compartilhado',
              is_shared: true
            };
          }
          
          // Mapear "eu" e variações para o cost center do usuário atual
          const euVariations = ['eu', 'me', 'mim', 'eu mesmo', 'eu mesma', 'fui eu', 'foi eu'];
          const isEu = euVariations.some(variation => normalized === variation || normalized.includes(variation));
          
          if (isEu) {
            console.log(`🔍 [MAPEAMENTO] Detectado variação de "Eu": "${responsibleName}" → "${normalized}"`);
            
            // Buscar cost center associado ao user_id do usuário atual (sem filtrar por type)
            const userCostCenter = costCenters.find(cc => 
              cc.user_id === context.userId
            );
            
            if (userCostCenter) {
              console.log(`✅ [MAPEAMENTO] "Eu" mapeado para: ${userCostCenter.name} (ID: ${userCostCenter.id})`);
              return {
                valid: true,
                responsible: userCostCenter.name,
                cost_center_id: userCostCenter.id,
                is_shared: false
              };
            }
            
            // Fallback: usar o cost center com o nome do usuário
            const userNameCenter = costCenters.find(cc => 
              this.normalizeName(cc.name) === this.normalizeName(context.userName)
            );
            if (userNameCenter) {
              console.log(`✅ [MAPEAMENTO FALLBACK] Usando cost center com nome do usuário: ${userNameCenter.name} (ID: ${userNameCenter.id})`);
              return {
                valid: true,
                responsible: userNameCenter.name,
                cost_center_id: userNameCenter.id,
                is_shared: false
              };
            }
            
            console.log(`❌ [MAPEAMENTO] Nenhum cost center encontrado para o usuário ${context.userName} (ID: ${context.userId})`);
          }
          
          // Buscar nos cost centers
          const found = costCenters.find(cc => 
            this.normalizeName(cc.name) === normalized
          );
          
          const availableNames = [
            ...costCenters.map(cc => cc.name),
            'Compartilhado'
          ];
          
          return {
            valid: !!found,
            responsible: found?.name || null,
            cost_center_id: found?.id || null,
            is_shared: false,
            available_responsibles: availableNames
          };
        },

        saveExpense: async (expenseData) => {
          try {
            console.log('💾 [SAVE_EXPENSE] ===== INÍCIO =====');
            console.log('💾 [SAVE_EXPENSE] Dados recebidos:', JSON.stringify(expenseData, null, 2));
            
            // 🔍 VALIDAR E NORMALIZAR payment_method
            const paymentResult = await context.validatePaymentMethod(expenseData.payment_method);
            if (!paymentResult.valid) {
              return {
                success: false,
                error: `Forma de pagamento inválida. Tente: ${paymentResult.available_methods.join(', ')}`
              };
            }
            const normalizedPayment = paymentResult.normalized_method;
            console.log('✅ [SAVE_EXPENSE] Pagamento validado:', normalizedPayment);
            
            // 🔍 VALIDAR responsible e mapear para cost_center_id
            const responsibleResult = await context.validateResponsible(expenseData.responsible);
            if (!responsibleResult.valid) {
              return {
                success: false,
                error: `Responsável inválido. Opções: ${responsibleResult.available_responsibles.join(', ')}`
              };
            }
            const costCenterId = responsibleResult.cost_center_id;
            const responsibleName = responsibleResult.responsible;
            const isShared = responsibleResult.is_shared || false;
            console.log('✅ [SAVE_EXPENSE] Responsável validado:', responsibleName, '(ID:', costCenterId, ')');
            
            // 🔍 VALIDAR cartão se for crédito
            let cardId = null;
            if (normalizedPayment === 'credit_card') {
              if (!expenseData.card_name) {
                return {
                  success: false,
                  error: 'Para crédito, preciso do nome do cartão. Qual cartão você usou?'
                };
              }
              
              const cardResult = await context.validateCard(expenseData.card_name, expenseData.installments || 1);
              if (!cardResult.valid) {
                return {
                  success: false,
                  error: `Cartão "${expenseData.card_name}" não encontrado. Opções: ${cardResult.available_cards.join(', ')}`
                };
              }
              cardId = cardResult.card_id;
              console.log('✅ [SAVE_EXPENSE] Cartão validado:', expenseData.card_name, '(ID:', cardId, ')');
            }
            
            // Inferir categoria baseada na descrição
            const inferCategory = (description) => {
              const desc = description.toLowerCase();
              
              // Mapeamento de palavras-chave para categorias
              const mapping = {
                'Transporte': ['gasolina', 'posto', 'combustível', 'uber', 'taxi', 'ônibus', 'metrô', 'estacionamento'],
                'Alimentação': ['mercado', 'supermercado', 'restaurante', 'lanche', 'padaria', 'açougue', 'feira'],
                'Saúde': ['farmácia', 'remédio', 'médico', 'consulta', 'hospital', 'clínica'],
                'Lazer': ['cinema', 'show', 'teatro', 'parque', 'viagem'],
                'Moradia': ['aluguel', 'condomínio', 'água', 'luz', 'gás', 'internet']
              };
              
              for (const [categoryName, keywords] of Object.entries(mapping)) {
                if (keywords.some(keyword => desc.includes(keyword))) {
                  return categories.find(c => c.name === categoryName);
                }
              }
              
              return null;
            };
            
            // Tentar encontrar categoria exata ou inferir
            let category = categories.find(c => 
              c.name.toLowerCase() === (expenseData.category || '').toLowerCase()
            );
            
            if (!category) {
              category = inferCategory(expenseData.description);
            }

            // Fallback seguro: usar categoria padrão da organização ("Outros"/"Geral")
            if (!category) {
              const defaultCategory = categories.find(c => {
                const n = (c.name || '').toLowerCase();
                return n === 'outros' || n === 'geral' || n === 'diversos' || n === 'outras despesas';
              });
              if (defaultCategory) {
                category = defaultCategory;
              }
            }
            
            // Verificar se é compartilhado (já determinado pela validação)
            
            // Se for cartão de crédito e tiver parcelas, criar installments
            if (normalizedPayment === 'credit_card' && expenseData.installments > 1) {
              if (cardId) {
                const card = cards?.find(c => c.id === cardId);
                
                // Garantir que costCenter seja passado corretamente (null quando compartilhado)
                const costCenter = isShared 
                  ? { id: null, name: 'Compartilhado' }
                  : { id: costCenterId, name: responsibleName };
                
                await this.createInstallments(
                  user,
                  {
                    valor: expenseData.amount,
                    descricao: expenseData.description,
                    categoria: expenseData.category,
                    responsavel: responsibleName,
                    data: 'hoje',
                    cartao: card.name,
                    parcelas: expenseData.installments,
                    card_id: cardId
                  },
                  costCenter,
                  category?.id || null
                );
                
                // ✅ Limpar thread após sucesso
                await this.zulAssistant.clearThread(user.id, userPhone);
                
                return { 
                  success: true, 
                  installments: true,
                  message: `Salvei! ${expenseData.amount} no ${card.name} em ${expenseData.installments}x 💳`
                };
              }
            }
            
            // Despesa simples (não parcelada)
            console.log('💾 [SAVE_EXPENSE] Criando expense record...');
            console.log('💾 [SAVE_EXPENSE] Category:', category);
            console.log('💾 [SAVE_EXPENSE] Cost Center ID:', costCenterId);
            console.log('💾 [SAVE_EXPENSE] Is Shared:', isShared);
            
            const expenseRecord = {
              organization_id: user.organization_id,
              user_id: user.id,
              cost_center_id: costCenterId,
              split: isShared,
              amount: expenseData.amount,
              description: this.capitalizeDescription(expenseData.description),
              payment_method: normalizedPayment,
              category_id: category?.id || null,
              category: category?.name || null,
              owner: this.getCanonicalName(responsibleName),
              date: this.parseDate('hoje'),
              status: 'confirmed',
              confirmed_at: this.getBrazilDateTime().toISOString(),
              confirmed_by: user.id,
              source: 'whatsapp',
              whatsapp_message_id: `msg_${Date.now()}`
            };
            
            console.log('💾 [SAVE_EXPENSE] Inserindo no banco:', JSON.stringify(expenseRecord, null, 2));
            
            const { data, error } = await supabase
              .from('expenses')
              .insert(expenseRecord)
              .select()
              .single();
            
            if (error) {
              console.error('❌ [SAVE_EXPENSE] Erro no insert:', error);
              throw error;
            }
            
            console.log('✅ [SAVE_EXPENSE] Despesa salva com sucesso! ID:', data.id);
            
            // ✅ Limpar thread após sucesso
            await this.zulAssistant.clearThread(user.id, userPhone);
            
            // Mensagem personalizada
            const contextEmoji = {
              'mercado': '🛒',
              'supermercado': '🛒',
              'restaurante': '🍽️',
              'gasolina': '⛽',
              'posto': '⛽',
              'uber': '🚗',
              'farmácia': '💊',
              'remédio': '💊'
            };
            
            const desc = expenseData.description.toLowerCase();
            const emoji = Object.keys(contextEmoji).find(key => desc.includes(key));
            
            return { 
              success: true, 
              expense_id: data.id,
              message: `Anotado! R$ ${expenseData.amount} - ${expenseData.description} ${emoji ? contextEmoji[emoji] : '✅'}`
            };
            
          } catch (error) {
            console.error('❌ [SAVE_EXPENSE] ERRO CRÍTICO:', error);
            console.error('❌ [SAVE_EXPENSE] Stack:', error.stack);
            return { success: false, error: error.message };
          }
        }
      };

      // 4. Enviar mensagem para GPT-4 conversacional
      console.log('🔄 [GPT-4] Enviando para chat completion...');
      console.log('🔄 [GPT-4] User ID:', user.id);
      console.log('🔄 [GPT-4] Text:', text);
      
      const response = await this.zulAssistant.sendConversationalMessage(user.id, text, context, userPhone);
      console.log('✅ [GPT-4] Resposta:', response);
      
      // 5. Enviar resposta para o usuário
      await this.sendWhatsAppMessage(userPhone, response);

    } catch (error) {
      console.error('❌ [ASSISTANT] Erro no processamento:', error);
      console.error('❌ [ASSISTANT] Stack:', error.stack);
      await this.sendWhatsAppMessage(userPhone, 
        this.zulMessages.genericError()
      );
    }
  }

  /**
   * Processar mensagem principal
   */
  async handleMessage(text, userPhone) {
    // Forçar sempre o fluxo do ZulAssistant para evitar conflitos
    console.log(`🤖 [DEBUG] Forçando uso do ZUL Assistant para: "${text}"`);
    return await this.handleMessageWithAssistant(text, userPhone);
  }

  /**
   * Buscar conversa em andamento
   */
  async getOngoingConversation(userPhone) {
    try {
      // Primeiro buscar o usuário para obter o user_id
      const user = await this.getUserByPhone(userPhone);
      if (!user) return null;

      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    } catch (error) {
      console.error('❌ Erro ao buscar conversa em andamento:', error);
      return null;
    }
  }

  /**
   * Continuar conversa em andamento
   */
  async continueConversation(user, ongoingConversation, userResponse) {
    try {
      console.log(`🔄 Continuando conversa para ${user.phone}`);
      
      const conversationState = ongoingConversation.conversation_state || {};
      const missingFields = conversationState.missing_fields || [];
      
      // Verificar se está esperando informações de cartão
      if (ongoingConversation.conversation_state?.waiting_for === 'card_info') {
        await this.handleCardInfoResponse(user, ongoingConversation, userResponse);
        return;
      }
      
      // Verificar se está esperando responsável (após fornecer cartão)
      if (ongoingConversation.conversation_state?.waiting_for === 'responsavel') {
        await this.handleResponsavelResponse(user, ongoingConversation, userResponse);
        return;
      }
      
      if (missingFields.length === 0) {
        // Sem campos faltando, finalizar
        await this.finalizeExpense(ongoingConversation, user);
        return;
      }

      // Processar resposta do usuário
      const nextField = missingFields[0];
      console.log('🔍 [CONV] Processando campo:', nextField, 'Resposta:', userResponse);
      
      // VALIDAÇÃO: Verificar se a resposta é válida para o campo
      let isValid = true;
      let validatedValue = null;
      
      if (nextField === 'metodo_pagamento') {
        validatedValue = await this.validatePaymentMethod(userResponse);
        if (!validatedValue) {
          isValid = false;
          await this.sendWhatsAppMessage(user.phone, 
            this.zulMessages.invalidPaymentMethod(user.name)
          );
        }
      } else if (nextField === 'responsavel') {
        validatedValue = await this.validateResponsible(userResponse, user.organization_id);
        if (!validatedValue) {
          isValid = false;
          const costCenters = await this.getCostCenters(user.organization_id);
          await this.sendWhatsAppMessage(user.phone, 
            this.zulMessages.invalidResponsible(user.name, costCenters)
          );
        }
      }
      
      // Se não for válido, reperguntar o mesmo campo (não avançar)
      if (!isValid) {
        return;
      }
      
      const updatedAnalysis = await this.processUserResponse(nextField, userResponse, ongoingConversation);
      console.log('🔍 [CONV] Análise atualizada:', updatedAnalysis);
      
      if (updatedAnalysis) {
        // Atualizar estado da conversa
        const newMissingFields = missingFields.slice(1);
        const updatedState = {
          ...conversationState,
          missing_fields: newMissingFields,
          [nextField]: updatedAnalysis[nextField]
        };

        await supabase
          .from('expenses')
          .update({ 
            conversation_state: updatedState,
            amount: updatedAnalysis.valor,
            description: updatedAnalysis.descricao,
            category: updatedAnalysis.categoria,
            payment_method: updatedAnalysis.metodo_pagamento,
            date: this.parseDate(updatedAnalysis.data)
          })
          .eq('id', ongoingConversation.id);

        // Se acabamos de receber o método de pagamento e for crédito, PRIORIZE perguntar cartão/parcelas agora
        if (nextField === 'metodo_pagamento') {
          const normalized = this.normalizePaymentMethod(updatedAnalysis.metodo_pagamento);
          if (normalized === 'credit_card') {
            const { data: cards } = await supabase
              .from('cards')
              .select('name')
              .eq('organization_id', user.organization_id)
              .eq('is_active', true);
            const cardNames = (cards || []).map(c => c.name).join(', ');
            const message = `💳 Qual cartão e em quantas parcelas? (${cardNames})`;
            await this.sendWhatsAppMessage(user.phone, message);

            await supabase
              .from('expenses')
              .update({ 
                conversation_state: { ...updatedState, waiting_for: 'card_info' }
              })
              .eq('id', ongoingConversation.id);
            return;
          }
        }

        // Se ainda há campos faltando, perguntar o próximo
        if (newMissingFields.length > 0) {
          await this.askNextQuestion(user, newMissingFields[0], {
            amount: updatedAnalysis.valor,
            description: updatedAnalysis.descricao,
            isAfterCard: false
          });
        } else {
          // Todos os campos preenchidos, verificar se precisa perguntar sobre cartão
          if (updatedState.metodo_pagamento === 'credit_card' && !updatedState.cartao) {
            // Perguntar sobre cartão e parcelas
            const { data: cards } = await supabase
              .from('cards')
              .select('name')
              .eq('organization_id', user.organization_id)
              .eq('is_active', true);
            
            const cardNames = cards.map(c => c.name).join(', ');
            const message = `💳 Qual cartão e em quantas parcelas? (${cardNames})`;
            await this.sendWhatsAppMessage(user.phone, message);
            
            // Atualizar estado para esperar resposta sobre cartão
            await supabase
              .from('expenses')
              .update({ 
                conversation_state: { ...updatedState, waiting_for: 'card_info' }
              })
              .eq('id', ongoingConversation.id);
          } else {
            // Finalizar despesa
            await this.finalizeExpense({
              ...ongoingConversation,
              conversation_state: updatedState
            }, user);
          }
        }
      }

    } catch (error) {
      console.error('❌ Erro ao continuar conversa:', error);
      await this.sendWhatsAppMessage(user.phone, 
        this.zulMessages.genericError()
      );
      await this.cancelConversation(ongoingConversation.id);
    }
  }

  /**
   * Validar método de pagamento
   */
  async validatePaymentMethod(userResponse) {
    const input = (userResponse || '').toString().trim().toLowerCase();
    const synonyms = [
      { keys: ['pix'], value: 'pix' },
      { keys: ['dinheiro', 'à vista', 'avista', 'cash', 'espécie', 'especie'], value: 'cash' },
      { keys: ['debito', 'débito', 'cartao de debito', 'cartão de débito'], value: 'debit_card' },
      { keys: ['credito', 'crédito', 'cartao', 'cartão', 'cartao de credito', 'cartão de crédito'], value: 'credit_card' },
      { keys: ['transferencia', 'transferência', 'ted', 'pix ted', 'doc', 'bank'], value: 'bank_transfer' },
      { keys: ['boleto'], value: 'boleto' }
    ];
    for (const map of synonyms) {
      if (map.keys.some(k => input.includes(k))) return map.value;
    }
    // fallback normalizer
    const normalized = this.normalizePaymentMethod(userResponse);
    const validMethods = ['credit_card', 'debit_card', 'pix', 'cash', 'bank_transfer', 'boleto', 'other'];
    return validMethods.includes(normalized) ? normalized : null;
  }

  /**
   * Validar responsável
   */
  async validateResponsible(userResponse, organizationId) {
    const costCenters = await this.getCostCenters(organizationId);
    const normalized = this.normalizeName(userResponse);
    
    // Compartilhado é sempre válido
    if (normalized === 'compartilhado') {
      return 'Compartilhado';
    }
    
    // Buscar nos cost centers
    const found = costCenters.find(cc => this.normalizeName(cc.name) === normalized);
    return found ? found.name : null;
  }

  /**
   * Processar resposta do usuário para um campo específico
   */
  async processUserResponse(field, userResponse, ongoingConversation) {
    try {
      // Buscar categorias da organização para validação
      const { data: expenseData } = await supabase
        .from('expenses')
        .select('organization_id')
        .eq('id', ongoingConversation.id)
        .single();

      let categories = [];
      if (expenseData) {
        categories = await this.getBudgetCategories(expenseData.organization_id);
      }
      
      const categoryNames = categories.map(cat => cat.name).join(', ');

      const prompt = `Analise a resposta do usuário para completar o campo "${field}":

RESPOSTA: "${userResponse}"

CONTEXTO: ${JSON.stringify(ongoingConversation)}

CAMPOS POSSÍVEIS:
- metodo_pagamento: credit_card, debit_card, pix, cash, other
- responsavel: Nomes dos centros de custo da organização
- categoria: ${categoryNames}
- descricao: texto curto e direto (padaria, farmácia, mercado, restaurante, etc.)

Retorne APENAS JSON com o campo atualizado:
{"${field}": "valor_identificado"}`;

      const completion = await this.openai.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 100,
        response_format: { type: 'json_object' }
      });

      const result = JSON.parse(completion.choices[0].message.content);
      console.log('🔍 [PROCESS] Resultado da IA:', result);
      
      // Combinar com análise anterior
      const conversationState = ongoingConversation.conversation_state || {};
      const fullAnalysis = {
        valor: ongoingConversation.amount,
        descricao: ongoingConversation.description,
        categoria: conversationState.categoria || ongoingConversation.category,
        data: ongoingConversation.date,
        responsavel: conversationState.responsavel,
        metodo_pagamento: conversationState.metodo_pagamento,
        ...result
      };
      console.log('🔍 [PROCESS] Análise completa:', fullAnalysis);

      return fullAnalysis;

    } catch (error) {
      console.error('❌ Erro ao processar resposta:', error);
      return null;
    }
  }

  /**
   * Perguntar próxima questão
   */
  async askNextQuestion(user, field, context = {}) {
    const costCenters = await this.getCostCenters(user.organization_id);
    let message = '';
    
    switch (field) {
      case 'metodo_pagamento':
        message = this.zulMessages.askPaymentMethod(
          context.amount, 
          context.description,
          user.name
        );
        break;
      case 'responsavel':
        message = this.zulMessages.askResponsible(costCenters, context.isAfterCard);
        break;
      case 'descricao':
        message = this.zulMessages.askDescription();
        break;
      case 'categoria':
        const categories = await this.getBudgetCategories(user.organization_id);
        const categoryNames = categories.map(cat => cat.name);
        message = this.zulMessages.askCategory(categoryNames);
        break;
      default:
        message = `❓ Por favor, forneça: ${field}`;
    }

    await this.sendConversationalMessage(user.phone, message);
  }

  /**
   * Finalizar despesa
   */
  async finalizeExpense(expense, user) {
    try {
      const costCenters = await this.getCostCenters(user.organization_id);
      const responsibleName = (expense.conversation_state?.responsavel || expense.responsavel || '').toString();
      
      // Verificar se é despesa compartilhada ANTES de buscar cost center
      const isShared = this.normalizeName(responsibleName) === 'compartilhado';
      
      // Para despesas compartilhadas, não precisa de costCenter
      const costCenter = isShared 
        ? { id: null, name: 'Compartilhado' }
        : costCenters.find(cc => this.normalizeName(cc.name) === this.normalizeName(responsibleName));

      if (!costCenter) {
        await this.sendWhatsAppMessage(user.phone, 
          this.zulMessages.costCenterNotFound(responsibleName || 'indefinido')
        );
        return;
      }

      // Buscar categoria para obter o category_id
      const categories = await this.getBudgetCategories(user.organization_id);
      const categoryName = expense.conversation_state?.categoria || expense.category;
      const budgetCategory = categories.find(cat => 
        cat.name.toLowerCase() === categoryName.toLowerCase()
      );

      // Atualizar despesa como confirmada
      const expenseData = {
        organization_id: user.organization_id,
        user_id: user.id,
        cost_center_id: isShared ? null : costCenter.id,
        split: isShared,
        owner: this.getCanonicalName(responsibleName), // Mapear responsável para owner normalizado
        category_id: budgetCategory?.id || null, // Mapear categoria para category_id
        status: 'confirmed',
        confirmed_at: this.getBrazilDateTime().toISOString(),
        confirmed_by: user.id,
        whatsapp_message_id: `msg_${Date.now()}`,
        source: 'whatsapp'
      };

      console.log(isShared 
        ? '✅ [SPLIT] Despesa compartilhada finalizada com fallback de divisão (sem expense_splits)'
        : '✅ Despesa individual finalizada');

      await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', expense.id);

      // Enviar confirmação personalizada do ZUL
      const amount = expense.amount ?? expense.conversation_state?.valor;
      const description = expense.description ?? expense.conversation_state?.descricao;
      const category = expense.category ?? expense.conversation_state?.categoria;
      const paymentMethod = expense.payment_method ?? expense.conversation_state?.metodo_pagamento;
      const dateVal = expense.date ?? this.parseDate(expense.conversation_state?.data);
      const cartao = expense.conversation_state?.cartao;
      const parcelas = expense.conversation_state?.parcelas;

      const confirmationMessage = this.zulMessages.getConfirmation({
        amount,
        description,
        category,
        owner: responsibleName,
        payment_method: paymentMethod,
        date: dateVal,
        cartao,
        parcelas,
        isShared
      }, user.name, costCenters);

      await this.sendWhatsAppMessage(user.phone, confirmationMessage);

      // Limpar a conversa pendente caso ainda exista como status 'pending'
      try {
        await supabase
          .from('expenses')
          .delete()
          .eq('id', expense.id)
          .eq('status', 'pending');
      } catch (_) {}

    } catch (error) {
      console.error('❌ Erro ao finalizar despesa:', error);
    }
  }

  /**
   * Cancelar conversa
   */
  async cancelConversation(expenseId) {
    try {
      await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);
    } catch (error) {
      console.error('❌ Erro ao cancelar conversa:', error);
    }
  }

  /**
   * Lidar com informação incompleta
   */
  async handleIncompleteInfo(user, analysis) {
    const costCenters = await this.getCostCenters(user.organization_id);
    const costCenterNames = costCenters.map(cc => cc.name);

    // Determinar campos faltando (ORDEM IMPORTANTE!)
    const missingFields = [];
    // Perguntar descrição PRIMEIRO se ausente ou genérica
    if (!analysis.descricao || /nao especificado|não especificado/i.test(String(analysis.descricao))) {
      missingFields.push('descricao');
    }
    if (!analysis.metodo_pagamento) missingFields.push('metodo_pagamento');
    if (!analysis.responsavel) missingFields.push('responsavel');
    // Perguntar sobre categoria se confiança baixa OU se for "Outros" ou similar
    if (analysis.confianca < 0.7 || !analysis.categoria || analysis.categoria === 'Outros') {
      missingFields.push('categoria');
    }

    console.log('🔍 [DEBUG] Campos faltando:', missingFields);
    console.log('🔍 [DEBUG] Análise completa:', analysis);

    if (missingFields.length > 0) {
      console.log('🔍 [DEBUG] Entrando no bloco de campos faltando...');
      // Criar despesa pendente
      const expenseData = {
        organization_id: user.organization_id,
        user_id: user.id,
        amount: analysis.valor,
        description: analysis.descricao,
        category: analysis.categoria,
        date: this.parseDate(analysis.data),
        status: 'pending',
        conversation_state: {
          missing_fields: missingFields,
          metodo_pagamento: analysis.metodo_pagamento,
          responsavel: analysis.responsavel
        },
        source: 'whatsapp',
        whatsapp_message_id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` // ID único
      };

      console.log('🔍 [DEBUG] Inserindo expense pendente:', expenseData);
      
      const { data: pendingExpense, error: insertError } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (insertError) {
        console.error('❌ Erro ao inserir expense pendente:', insertError);
        await this.sendWhatsAppMessage(user.phone, 
          this.zulMessages.saveError()
        );
        return;
      }

      console.log('✅ Expense pendente inserida:', pendingExpense);

      // Perguntar primeiro campo faltando com contexto
      await this.askNextQuestion(user, missingFields[0], {
        amount: analysis.valor,
        description: analysis.descricao,
        isAfterCard: false
      });
    } else {
      console.log('🔍 [DEBUG] Nenhum campo faltando, mas precisa confirmar. Chamando handleCompleteInfo...');
      // Se não há campos faltando mas ainda precisa confirmar, tratar como informação completa
      await this.handleCompleteInfo(user, analysis);
    }
  }

  /**
   * Lidar com informação completa
   */
  async handleCompleteInfo(user, analysis) {
    const costCenters = await this.getCostCenters(user.organization_id);
    const isShared = this.normalizeName(analysis.responsavel) === 'compartilhado';
    
    // Para despesas compartilhadas, não precisa de costCenter
    const costCenter = isShared 
      ? { id: null, name: 'Compartilhado' } 
      : costCenters.find(cc => this.normalizeName(cc.name) === this.normalizeName(analysis.responsavel));

    if (!costCenter) {
      await this.sendWhatsAppMessage(user.phone, 
        this.zulMessages.costCenterNotFound(analysis.responsavel)
      );
      return;
    }

    // Encontrar categoria id por nome (se existir)
    const categories = await this.getBudgetCategories(user.organization_id);
    const categoryRow = categories.find(c => c.name.toLowerCase() === (analysis.categoria || '').toLowerCase());
    const categoryId = categoryRow?.id || null;

    // Normalizar método de pagamento
    console.log('🔍 [PAYMENT] Antes da normalização:', analysis.metodo_pagamento);
    const normalizedMethod = this.normalizePaymentMethod(analysis.metodo_pagamento);
    console.log('🔍 [PAYMENT] Após normalização:', normalizedMethod);

    // Verificar se é cartão de crédito e tem informações de cartão
    if (normalizedMethod === 'credit_card' && analysis.card_id && analysis.parcelas) {
      // Criar parcelas usando função do banco (capitalizando a descrição)
      const normalizedDescription = this.capitalizeDescription(analysis.descricao);
      await this.createInstallments(user, { ...analysis, descricao: normalizedDescription }, costCenter, categoryId);
    } else {
      // Verificar se é despesa compartilhada
      const isShared = this.normalizeName(analysis.responsavel) === 'compartilhado';

      // Salvar despesa normal (não parcelada)
      const expenseData = {
        organization_id: user.organization_id,
        user_id: user.id,
        cost_center_id: isShared ? null : costCenter.id,
        split: isShared,
        amount: analysis.valor,
        description: this.capitalizeDescription(analysis.descricao),
        payment_method: normalizedMethod,
        category_id: categoryId,
        category: analysis.categoria,
        owner: this.getCanonicalName(analysis.responsavel),
        date: this.parseDate(analysis.data),
        status: 'confirmed',
        confirmed_at: this.getBrazilDateTime().toISOString(),
        confirmed_by: user.id,
        source: 'whatsapp',
        whatsapp_message_id: `msg_${Date.now()}`,
        card_id: analysis.card_id || null,
        conversation_state: {
          valor: analysis.valor,
          descricao: analysis.descricao,
          categoria: analysis.categoria,
          metodo_pagamento: analysis.metodo_pagamento,
          responsavel: analysis.responsavel,
          data: analysis.data,
          confianca: analysis.confianca,
          cartao: analysis.cartao || null,
          parcelas: analysis.parcelas || null,
          missing_fields: []
        }
      };

      const savedExpense = await this.saveExpense(expenseData);

      // Se é compartilhada, NÃO criar expense_splits (usar fallback)
      // O frontend já saberá calcular com base nos split_percentage dos cost_centers
      console.log(isShared 
        ? '✅ [SPLIT] Despesa compartilhada criada com fallback de divisão (sem expense_splits)'
        : '✅ Despesa individual criada');
    }

    // Enviar confirmação personalizada do ZUL
    const confirmationMessage = this.zulMessages.getConfirmation({
      amount: analysis.valor,
      description: this.capitalizeDescription(analysis.descricao),
      category: analysis.categoria,
      owner: this.getCanonicalName(analysis.responsavel),
      payment_method: normalizedMethod,
      date: this.parseDate(analysis.data),
      cartao: analysis.cartao,
      parcelas: analysis.parcelas,
      isShared
    }, user.name, costCenters);

    await this.sendWhatsAppMessage(user.phone, confirmationMessage);
  }

  /**
   * Adicionar emoji ao nome do responsável
   */
  getOwnerWithEmoji(owner) {
    const normalizedOwner = this.normalizeName(owner);
    if (normalizedOwner === 'compartilhado') return '👥 Compartilhado';
    return `👤 ${owner}`; // Emoji genérico para qualquer centro de custo individual
  }

  /**
   * Normalizar descrição para iniciar com maiúscula
   */
  capitalizeDescription(text) {
    if (!text || typeof text !== 'string') return '';
    const t = text.trim();
    if (t.length === 0) return '';
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  /**
   * Obter data/hora atual no fuso horário do Brasil
   */
  getBrazilDateTime() {
    const now = new Date();
    return new Date(now.toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
  }

  /**
   * Converter data com fuso horário do Brasil (UTC-3)
   */
  parseDate(dateStr) {
    // Obter data atual no fuso horário do Brasil
    const brazilTime = this.getBrazilDateTime();
    
    if (dateStr === 'hoje') return brazilTime;
    if (dateStr === 'ontem') {
      const yesterday = new Date(brazilTime);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    
    // Tentar parsear data específica
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? brazilTime : parsed;
  }

  /**
   * Nome do método de pagamento
   */
  getPaymentMethodName(method) {
    const names = {
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'pix': 'PIX',
      'cash': 'Dinheiro',
      'bank_transfer': 'Transferência',
      'boleto': 'Boleto',
      'other': 'Outro'
    };
    return names[method] || method;
  }

  /**
   * Extrair nome do cartão e número de parcelas do texto
   * Ex: "Nubank 3x" -> { cardName: "Nubank", installments: 3 }
   * Ex: "Itaú à vista" -> { cardName: "Itaú", installments: 1 }
   */
  extractCardAndInstallments(text) {
    if (!text || typeof text !== 'string') {
      return { cardName: null, installments: 1 };
    }

    const normalizedText = text.toLowerCase().trim();
    
    // Padrões para detectar parcelas
    const installmentPatterns = [
      /(\d+)\s*x\s*$/,  // "3x", "12x"
      /(\d+)\s*parcelas?/,  // "3 parcelas", "12 parcelas"
      /(\d+)\s*vezes/,  // "3 vezes", "duas vezes"
      /(\d+)\s*$/,  // "3", "12" (apenas número)
      /duas?\s*vezes?/i,  // "duas vezes", "duas"
      /três?\s*vezes?/i,  // "três vezes", "três"
      /quatro?\s*vezes?/i,  // "quatro vezes", "quatro"
      /cinco?\s*vezes?/i,  // "cinco vezes", "cinco"
      /seis?\s*vezes?/i,  // "seis vezes", "seis"
      /sete?\s*vezes?/i,  // "sete vezes", "sete"
      /oito?\s*vezes?/i,  // "oito vezes", "oito"
      /nove?\s*vezes?/i,  // "nove vezes", "nove"
      /dez?\s*vezes?/i,  // "dez vezes", "dez"
      /onze?\s*vezes?/i,  // "onze vezes", "onze"
      /doze?\s*vezes?/i,  // "doze vezes", "doze"
    ];

    // Padrões para detectar à vista
    const cashPatterns = [
      /à\s*vista/i,
      /a\s*vista/i,
      /avista/i,
      /1\s*x\s*$/,
      /1\s*parcela/,
    ];

    let installments = 1;
    let cardName = text;

    // Mapeamento de palavras para números
    const wordToNumber = {
      'duas': 2, 'dois': 2, 'duas vezes': 2, 'dois vezes': 2,
      'três': 3, 'tres': 3, 'três vezes': 3, 'tres vezes': 3,
      'quatro': 4, 'quatro vezes': 4,
      'cinco': 5, 'cinco vezes': 5,
      'seis': 6, 'seis vezes': 6,
      'sete': 7, 'sete vezes': 7,
      'oito': 8, 'oito vezes': 8,
      'nove': 9, 'nove vezes': 9,
      'dez': 10, 'dez vezes': 10,
      'onze': 11, 'onze vezes': 11,
      'doze': 12, 'doze vezes': 12
    };

    // Verificar se é à vista
    for (const pattern of cashPatterns) {
      if (pattern.test(normalizedText)) {
        installments = 1;
        cardName = normalizedText.replace(pattern, '').trim();
        break;
      }
    }

    // Se não é à vista, verificar parcelas
    if (installments === 1) {
      for (const pattern of installmentPatterns) {
        const match = normalizedText.match(pattern);
        if (match) {
          if (match[1]) {
            // Número direto
            installments = parseInt(match[1]);
          } else {
            // Palavra convertida para número
            const matchedText = match[0].trim();
            installments = wordToNumber[matchedText] || 1;
          }
          cardName = normalizedText.replace(pattern, '').trim();
          break;
        }
      }
    }

    // Limpar nome do cartão
    cardName = cardName.replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
    // Remover conectores residuais ao final (ex.: "em", "no", "na", "de", "do", "da")
    cardName = cardName.replace(/\b(em|no|na|de|do|da)\b\s*$/i, '').trim();

    // Se não conseguiu extrair parcelas e o cardName contém números, provavelmente é uma despesa mal formatada
    if (installments === 1 && /\d/.test(cardName)) {
      return { cardName: null, installments: 1 };
    }

    return {
      cardName: cardName || null,
      installments: installments || 1
    };
  }

  /**
   * Buscar cartão pelo nome na organização
   */
  async getCardByName(cardName, organizationId) {
    if (!cardName || !organizationId) return null;

    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('is_active', true)
        .ilike('name', `%${cardName}%`);

      if (error) {
        console.error('❌ Erro ao buscar cartão:', error);
        return null;
      }

      // Retornar o primeiro cartão que contém o nome
      return data && data.length > 0 ? data[0] : null;
    } catch (error) {
      console.error('❌ Erro ao buscar cartão:', error);
      return null;
    }
  }

  /**
   * Perguntar sobre cartão e parcelas para despesas de crédito
   */
  async askForCardAndInstallments(user, analysis) {
    try {
      console.log('🔍 [CARD] Buscando cartões para organização:', user.organization_id);
      
      // Buscar cartões disponíveis na organização
      const { data: cards, error } = await supabase
        .from('cards')
        .select('name')
        .eq('organization_id', user.organization_id)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Erro ao buscar cartões:', error);
        await this.sendWhatsAppMessage(user.phone, 
          this.zulMessages.genericError()
        );
        return;
      }

      console.log('🔍 [CARD] Cartões encontrados:', cards);
      const cardNames = cards.map(c => c.name);
      
      // Determinar campos faltando (exceto cartão que será perguntado depois)
      const missingFields = [];
      if (!analysis.responsavel) missingFields.push('responsavel');
      if (!analysis.descricao || /nao especificado|não especificado/i.test(String(analysis.descricao))) {
        missingFields.push('descricao');
      }
      if (analysis.confianca < 0.7 || !analysis.categoria || analysis.categoria === 'Outros') {
        missingFields.push('categoria');
      }

      // Salvar conversa pendente como despesa com status 'pending'
      const { data: pendingExpense, error: convError } = await supabase
        .from('expenses')
        .insert({
          organization_id: user.organization_id,
          user_id: user.id,
          amount: analysis.valor,
          description: analysis.descricao,
          payment_method: 'credit_card',
          category: analysis.categoria,
          owner: analysis.responsavel,
          date: this.parseDate(analysis.data),
          status: 'pending',
          source: 'whatsapp',
          conversation_state: {
            valor: analysis.valor,
            descricao: analysis.descricao,
            categoria: analysis.categoria,
            metodo_pagamento: 'credit_card',
            responsavel: analysis.responsavel,
            data: analysis.data,
            confianca: analysis.confianca,
            missing_fields: missingFields,
            waiting_for: 'card_info'
          }
        })
        .select()
        .single();

      if (convError) {
        console.error('❌ Erro ao salvar conversa pendente:', convError);
        await this.sendWhatsAppMessage(user.phone, 
          this.zulMessages.genericError()
        );
        return;
      }

      // SEMPRE perguntar sobre cartão primeiro para despesas de crédito
      // Campos faltando (como responsável) serão perguntados após o cartão
      const message = this.zulMessages.askCardAndInstallments(
        analysis.valor,
        analysis.descricao,
        cardNames
      );
      await this.sendWhatsAppMessage(user.phone, message);

    } catch (error) {
      console.error('❌ Erro ao perguntar sobre cartão:', error);
      await this.sendWhatsAppMessage(user.phone, 
        this.zulMessages.genericError()
      );
    }
  }

  /**
   * Processar resposta sobre responsável (após fornecer cartão)
   */
  async handleResponsavelResponse(user, conversation, userResponse) {
    try {
      console.log('🔍 [RESPONSAVEL] Processando resposta sobre responsável:', userResponse);
      
      // VALIDAR responsável antes de processar
      const validatedResponsible = await this.validateResponsible(userResponse, user.organization_id);
      if (!validatedResponsible) {
        const costCenters = await this.getCostCenters(user.organization_id);
        await this.sendWhatsAppMessage(user.phone, 
          this.zulMessages.invalidResponsible(user.name, costCenters)
        );
        // Não avançar - manter esperando responsável válido
        return;
      }
      
      const updatedState = {
        ...conversation.conversation_state,
        responsavel: validatedResponsible,
        waiting_for: null
      };

      // Atualizar expense com o responsável
      await supabase
        .from('expenses')
        .update({
          conversation_state: updatedState,
          owner: this.getCanonicalName(validatedResponsible)
        })
        .eq('id', conversation.id);

      // Processar despesa completa
      const analysis = {
        valor: conversation.amount ?? updatedState.valor ?? conversation.conversation_state.valor,
        descricao: conversation.description ?? updatedState.descricao ?? conversation.conversation_state.descricao,
        categoria: conversation.category ?? updatedState.categoria ?? conversation.conversation_state.categoria,
        metodo_pagamento: 'credit_card',
        responsavel: validatedResponsible,
        data: conversation.date ?? updatedState.data ?? conversation.conversation_state.data,
        confianca: updatedState.confianca ?? conversation.conversation_state.confianca,
        cartao: updatedState.cartao,
        parcelas: updatedState.parcelas,
        card_id: updatedState.card_id ?? conversation.card_id
      };

      await this.handleCompleteInfo(user, analysis);

      // Limpar pendente após finalizar o fluxo
      try {
        await supabase
          .from('expenses')
          .delete()
          .eq('id', conversation.id)
          .eq('status', 'pending');
      } catch (_) {}

    } catch (error) {
      console.error('❌ Erro ao processar responsável:', error);
      await this.sendWhatsAppMessage(user.phone, 
        this.zulMessages.genericError()
      );
    }
  }

  /**
   * Processar resposta sobre cartão e parcelas
   */
  async handleCardInfoResponse(user, conversation, userResponse) {
    try {
      console.log('🔍 [CARD] Processando resposta sobre cartão:', userResponse);
      
      // Verificar se é uma nova despesa em vez de resposta sobre cartão
      if (this.isLikelyNewExpenseMessage(userResponse)) {
        console.log('🔍 [CARD] Detectada nova despesa, cancelando conversa pendente');
        await this.cancelConversation(conversation.id);
        // Processar como nova despesa
        await this.handleMessage(userResponse, user.phone);
        return;
      }
      
      // Extrair cartão e parcelas da resposta
      const { cardName, installments } = this.extractCardAndInstallments(userResponse);
      console.log('🔍 [CARD] Extraído:', { cardName, installments });
      
      if (!cardName) {
        await this.sendWhatsAppMessage(user.phone, 
          this.zulMessages.cardInfoError()
        );
        return;
      }

      // Buscar cartão no banco
      console.log('🔍 [CARD] Buscando cartão:', cardName, 'na organização:', user.organization_id);
      const card = await this.getCardByName(cardName, user.organization_id);
      console.log('🔍 [CARD] Cartão encontrado:', card);
      
      if (!card) {
        // Buscar cartões disponíveis para sugerir
        const { data: availableCards } = await supabase
          .from('cards')
          .select('name')
          .eq('organization_id', user.organization_id)
          .eq('is_active', true);
        
        const cardNames = availableCards ? availableCards.map(c => c.name) : [];
        
        await this.sendWhatsAppMessage(user.phone, 
          this.zulMessages.invalidCard(user.name, cardNames)
        );
        // Não retornar - manter a conversa no mesmo estado para reperguntar
        return;
      }

      // Atualizar despesa pendente com informações do cartão
      const updatedState = {
        ...conversation.conversation_state,
        cartao: card.name,
        parcelas: installments,
        card_id: card.id,
        waiting_for: null
      };

      // Atualizar somente o estado e o card_id; manter como pending até finalizar todos os campos
      await supabase
        .from('expenses')
        .update({
          conversation_state: updatedState,
          card_id: card.id
        })
        .eq('id', conversation.id);

      // Se ainda falta responsável (ou outros campos), perguntar agora; caso contrário, finalizar
      const remainingFields = (updatedState.missing_fields || []).filter(f => f !== 'cartao' && f !== 'parcelas');
      if (!updatedState.responsavel || remainingFields.includes('responsavel')) {
        // Atualizar estado para esperar responsável
        await supabase
          .from('expenses')
          .update({ 
            conversation_state: { ...updatedState, waiting_for: 'responsavel' }
          })
          .eq('id', conversation.id);
        
        await this.askNextQuestion(user, 'responsavel', { isAfterCard: true });
        return;
      }

      // Processar despesa com cartão e parcelas (garantindo valores do registro pendente)
      const analysis = {
        valor: conversation.amount ?? updatedState.valor ?? conversation.conversation_state.valor,
        descricao: conversation.description ?? updatedState.descricao ?? conversation.conversation_state.descricao,
        categoria: conversation.category ?? updatedState.categoria ?? conversation.conversation_state.categoria,
        metodo_pagamento: conversation.payment_method ?? updatedState.metodo_pagamento ?? conversation.conversation_state.metodo_pagamento,
        responsavel: conversation.owner ?? updatedState.responsavel ?? conversation.conversation_state.responsavel,
        data: conversation.date ?? updatedState.data ?? conversation.conversation_state.data,
        confianca: updatedState.confianca ?? conversation.conversation_state.confianca,
        cartao: card.name,
        parcelas: installments,
        card_id: card.id
      };

      await this.handleCompleteInfo(user, analysis);

      // Limpar pendente após finalizar o fluxo
      try {
        await supabase
          .from('expenses')
          .delete()
          .eq('id', conversation.id)
          .eq('status', 'pending');
      } catch (_) {}

    } catch (error) {
      console.error('❌ Erro ao processar resposta de cartão:', error);
      await this.sendWhatsAppMessage(user.phone, 
        this.zulMessages.genericError()
      );
    }
  }

  /**
   * Criar parcelas usando função do banco
   */
  async createInstallments(user, analysis, costCenter, categoryId) {
    try {
      // Verificar se é compartilhado
      const isShared = this.normalizeName(analysis.responsavel) === 'compartilhado';
      const ownerForRPC = this.getCanonicalName(analysis.responsavel);
      
      console.log('🔍 [INSTALLMENTS] Criando parcelas:', {
        amount: analysis.valor,
        installments: analysis.parcelas,
        cardId: analysis.card_id,
        costCenterId: isShared ? null : (costCenter?.id || null),
        isShared: isShared,
        categoryId: categoryId,
        organizationId: user.organization_id,
        userId: user.id,
        responsavel: analysis.responsavel,
        ownerForRPC: ownerForRPC
      });

      // Gerar um whatsapp_message_id único para correlacionar a série
      const whatsappMessageId = `msg_${Date.now()}`;

      // Chamar função do banco para criar parcelas
      const rpcParams = {
        p_amount: Number(analysis.valor),
        p_installments: Number(analysis.parcelas),
        p_description: analysis.descricao,
        p_date: this.parseDate(analysis.data).toISOString().split('T')[0],
        p_card_id: analysis.card_id,
        p_category_id: categoryId,
        p_cost_center_id: isShared ? null : (costCenter?.id || null),
        p_owner: ownerForRPC, // "Compartilhado" para despesa compartilhada
        p_organization_id: user.organization_id,
        p_user_id: user.id,
        p_whatsapp_message_id: whatsappMessageId
      };
      
      console.log('💾 [INSTALLMENTS] Chamando RPC create_installments com:', rpcParams);
      
      const { data, error } = await supabase.rpc('create_installments', rpcParams);

      if (error) {
        console.error('❌ [INSTALLMENTS] Erro ao criar parcelas:', error);
        console.error('❌ [INSTALLMENTS] Detalhes do erro:', JSON.stringify(error, null, 2));
        throw error;
      }

      console.log('✅ [INSTALLMENTS] Parcelas criadas com sucesso. Parent ID:', data);

      // A função SQL já cria todas as parcelas como 'confirmed', então não precisamos atualizar
      // Mas vamos atualizar apenas os metadados adicionais (category, whatsapp_message_id)
      try {
        const parentId = data; // função retorna BIGINT (ID) do parent
        if (parentId) {
          console.log('🔄 [INSTALLMENTS] Atualizando metadados das parcelas. Parent ID:', parentId);
          
          const nowIso = this.getBrazilDateTime().toISOString();
          const metadataUpdate = {
            source: 'whatsapp',
            whatsapp_message_id: whatsappMessageId,
          };
          
          // Se a categoria foi fornecida, atualizar também
          if (analysis.categoria) {
            metadataUpdate.category = analysis.categoria;
          }
          
          // Atualizar parcelas filhas (parent_expense_id = parentId)
          const { error: childrenError } = await supabase
            .from('expenses')
            .update(metadataUpdate)
            .eq('parent_expense_id', parentId)
            .neq('id', parentId); // Não atualizar o próprio parent
          
          if (childrenError) {
            console.warn('⚠️ [INSTALLMENTS] Erro ao atualizar parcelas filhas:', childrenError);
          }
          
          // Atualizar parcela pai
          const { error: parentError } = await supabase
            .from('expenses')
            .update(metadataUpdate)
            .eq('id', parentId);
          
          if (parentError) {
            console.warn('⚠️ [INSTALLMENTS] Erro ao atualizar parcela pai:', parentError);
          } else {
            console.log('✅ [INSTALLMENTS] Metadados atualizados com sucesso');
          }
        } else {
          console.warn('⚠️ [INSTALLMENTS] Parent ID não retornado pela função RPC');
        }
      } catch (confirmErr) {
        console.error('❌ [INSTALLMENTS] Erro ao atualizar metadados das parcelas:', confirmErr);
        // Não falhar por causa disso, as parcelas já foram criadas
      }

    } catch (error) {
      console.error('❌ Erro ao criar parcelas:', error);
      throw error;
    }
  }
}

export default SmartConversation;
