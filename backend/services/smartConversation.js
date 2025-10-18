import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import dotenv from 'dotenv';
import OpenAIService from './openaiService.js';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const WHATSAPP_API_URL = 'https://graph.facebook.com/v18.0';

/**
 * Conversa inteligente para FinTrack V2
 * Analisa mensagens e extrai informações automaticamente
 */
class SmartConversation {
  constructor() {
    this.openai = new OpenAIService();
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
      
      const prompt = `Você é um assistente financeiro especializado APENAS em processar despesas do FinTrack.

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
      const normalized = String(phone || '').replace(/^\+/, '');
      // Buscar usuário primeiro
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('*')
        .in('phone', [normalized, `+${normalized}`])
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
      console.error('❌ Credenciais WhatsApp não configuradas');
      return;
    }

    // Normalize phone format to E.164 with leading +
    const normalizedTo = String(to || '').startsWith('+') ? String(to) : `+${String(to)}`;

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
    } catch (error) {
      console.error(`❌ Erro ao enviar mensagem:`, error.message);
      if (error.response) {
        console.error('📄 Detalhes do erro:', error.response.data);
      }
    }
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

    const normalizedTo = String(to || '').startsWith('+') ? String(to) : `+${String(to)}`;

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
   * Processar mensagem principal
   */
  async handleMessage(text, userPhone) {
    try {
      console.log(`📱 Processando mensagem de ${userPhone}: "${text}"`);

      // 1. Buscar usuário
      console.log('🔍 [DEBUG] Buscando usuário para telefone:', userPhone);
      const user = await this.getUserByPhone(userPhone);
      console.log('🔍 [DEBUG] Usuário encontrado:', user ? 'SIM' : 'NÃO');
      if (!user) {
        console.log('❌ [DEBUG] Usuário não encontrado, enviando mensagem de erro');
        await this.sendWhatsAppMessage(userPhone, 
          "❌ Usuário não encontrado. Entre em contato com o administrador da organização."
        );
        return;
      }

      // 2. Verificar se há uma conversa em andamento
      const ongoingConversation = await this.getOngoingConversation(userPhone);
      if (ongoingConversation) {
        // Se a mensagem parece iniciar uma nova despesa, cancelar a pendente e seguir como nova
        if (this.isLikelyNewExpenseMessage(text)) {
          await this.cancelConversation(ongoingConversation.id);
        } else {
          await this.continueConversation(user, ongoingConversation, text);
          return;
        }
      }

      // 3. Analisar nova mensagem
      const analysis = await this.analyzeExpenseMessage(text, userPhone);
      console.log('🔍 [ANALYSIS] Resultado da análise:', analysis);
      if (!analysis) {
        await this.sendWhatsAppMessage(userPhone, 
          "❌ Não consegui entender sua mensagem. Tente: 'Gastei 50 no mercado'"
        );
        return;
      }

      // 4. Verificar se é uma mensagem sobre despesas
      if (analysis.erro === "Mensagem não é sobre despesas") {
        await this.sendWhatsAppMessage(userPhone, 
          "💰 Olá! Eu sou o assistente do FinTrack.\n\n" +
          "📝 Para registrar uma despesa, envie uma mensagem como:\n" +
          "• 'Gastei 50 no mercado'\n" +
          "• 'Paguei 30 na farmácia'\n" +
          "• 'R$ 25 no posto de gasolina'\n\n" +
          "🎯 Foco apenas em gastos e despesas!"
        );
        return;
      }

      // 5. Verificar se é cartão de crédito e precisa de cartão/parcelas
      const normalizedMethod = this.normalizePaymentMethod(analysis.metodo_pagamento);
      if (normalizedMethod === 'credit_card' && !analysis.cartao) {
        console.log('🔍 [CARD] Detectado cartão de crédito, perguntando sobre cartão e parcelas');
        await this.askForCardAndInstallments(user, analysis);
        return;
      }

      // 6. Verificar se precisa de confirmação
      console.log('🔍 [DEBUG] Verificando se precisa confirmar:', analysis.precisa_confirmar);
      if (analysis.precisa_confirmar) {
        console.log('🔍 [DEBUG] Chamando handleIncompleteInfo...');
        await this.handleIncompleteInfo(user, analysis);
        console.log('✅ [DEBUG] handleIncompleteInfo concluído');
      } else {
        console.log('🔍 [DEBUG] Chamando handleCompleteInfo...');
        await this.handleCompleteInfo(user, analysis);
        console.log('✅ [DEBUG] handleCompleteInfo concluído');
      }

    } catch (error) {
      console.error('❌ Erro no processamento:', error);
      await this.sendWhatsAppMessage(userPhone, 
        "❌ Ocorreu um erro. Tente novamente em alguns minutos."
      );
    }
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
      
      if (missingFields.length === 0) {
        // Sem campos faltando, finalizar
        await this.finalizeExpense(ongoingConversation, user);
        return;
      }

      // Processar resposta do usuário
      const nextField = missingFields[0];
      console.log('🔍 [CONV] Processando campo:', nextField, 'Resposta:', userResponse);
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

        // Se ainda há campos faltando, perguntar o próximo
        if (newMissingFields.length > 0) {
          await this.askNextQuestion(user, newMissingFields[0]);
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
        "❌ Ocorreu um erro. Vou cancelar esta conversa."
      );
      await this.cancelConversation(ongoingConversation.id);
    }
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
      const fullAnalysis = {
        valor: ongoingConversation.amount,
        descricao: ongoingConversation.description,
        categoria: ongoingConversation.category,
        data: ongoingConversation.date,
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
  async askNextQuestion(user, field) {
    const costCenters = await this.getCostCenters(user.organization_id);
    const costCenterNames = costCenters.map(cc => cc.name);
    
    let message = '';
    
    switch (field) {
      case 'metodo_pagamento':
        message = '💳 Método de pagamento: Débito, Crédito, PIX ou Dinheiro?';
        break;
      case 'responsavel':
        {
          const hasCompartilhado = costCenterNames.some(n => n.toLowerCase() === 'compartilhado');
          const list = costCenterNames.join(', ');
          message = hasCompartilhado
            ? `👤 Responsável: ${list}?`
            : `👤 Responsável: ${list} ou Compartilhado?`;
        }
        break;
      case 'descricao':
        message = '📝 Qual a descrição? (ex.: padaria, farmácia, mercado, etc.)';
        break;
      case 'categoria':
        const categories = await this.getBudgetCategories(user.organization_id);
        const categoryNames = categories.map(cat => cat.name).join(', ');
        message = `📂 Categoria: ${categoryNames}?`;
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
      const costCenter = costCenters.find(cc =>
        this.normalizeName(cc.name) === this.normalizeName(responsibleName)
      );

      if (!costCenter) {
        await this.sendWhatsAppMessage(user.phone, 
          `❌ Centro de custo "${responsibleName || 'indefinido'}" não encontrado.`
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
        cost_center_id: costCenter.id,
        owner: this.getCanonicalName(responsibleName), // Mapear responsável para owner normalizado
        category_id: budgetCategory?.id || null, // Mapear categoria para category_id
        status: 'confirmed',
        confirmed_at: this.getBrazilDateTime().toISOString(),
        confirmed_by: user.id,
        whatsapp_message_id: `msg_${Date.now()}`,
        source: 'whatsapp'
      };

      await supabase
        .from('expenses')
        .update(expenseData)
        .eq('id', expense.id);

      // Enviar confirmação
      const amount = expense.amount ?? expense.conversation_state?.valor;
      const description = expense.description ?? expense.conversation_state?.descricao;
      const category = expense.category ?? expense.conversation_state?.categoria;
      const paymentMethod = expense.payment_method ?? expense.conversation_state?.metodo_pagamento;
      const dateVal = expense.date ?? this.parseDate(expense.conversation_state?.data);

      const confirmationMessage = `✅ Despesa registrada!\n\n` +
        `💰 R$ ${Number(amount).toFixed(2)} - ${description || 'gasto não especificado'}\n` +
        `📂 ${category || '-'}\n` +
        `👤 ${responsibleName || '-'}\n` +
        `💳 ${this.getPaymentMethodName(paymentMethod)}\n` +
        `📅 ${new Date(dateVal).toLocaleDateString('pt-BR')}`;

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

    // Determinar campos faltando
    const missingFields = [];
    if (!analysis.metodo_pagamento) missingFields.push('metodo_pagamento');
    if (!analysis.responsavel) missingFields.push('responsavel');
    // Perguntar descrição se ausente ou genérica
    if (!analysis.descricao || /nao especificado|não especificado/i.test(String(analysis.descricao))) {
      missingFields.push('descricao');
    }
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
          "❌ Erro ao salvar despesa. Tente novamente."
        );
        return;
      }

      console.log('✅ Expense pendente inserida:', pendingExpense);

      // Perguntar primeiro campo faltando
      await this.askNextQuestion(user, missingFields[0]);
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
    const costCenter = costCenters.find(cc => 
      this.normalizeName(cc.name) === this.normalizeName(analysis.responsavel)
    );

    if (!costCenter) {
      await this.sendWhatsAppMessage(user.phone, 
        `❌ Centro de custo "${analysis.responsavel}" não encontrado. Contate o administrador.`
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
      // Salvar despesa normal (não parcelada)
      const expenseData = {
        organization_id: user.organization_id,
        user_id: user.id,
        cost_center_id: costCenter.id,
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

      await this.saveExpense(expenseData);
    }

    // Enviar confirmação
    const ownerWithEmoji = this.getOwnerWithEmoji(analysis.responsavel);
    const paymentInfo = normalizedMethod === 'credit_card' && analysis.cartao 
      ? `💳 ${analysis.cartao} - ${analysis.parcelas}x`
      : `💳 ${this.getPaymentMethodName(normalizedMethod)}`;
    
    const confirmationMessage = `✅ Despesa registrada!\n\n` +
      `💰 R$ ${analysis.valor.toFixed(2)} - ${this.capitalizeDescription(analysis.descricao)}\n` +
      `📂 ${analysis.categoria}\n` +
      `${ownerWithEmoji}\n` +
      `${paymentInfo}\n` +
      `📅 ${this.parseDate(analysis.data).toLocaleDateString('pt-BR')}`;

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
    cardName = cardName.replace(/[^\w\s]/g, '').trim();

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
          "❌ Erro ao buscar cartões. Tente novamente."
        );
        return;
      }

      console.log('🔍 [CARD] Cartões encontrados:', cards);
      const cardNames = cards.map(c => c.name).join(', ');
      
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
          "❌ Erro interno. Tente novamente."
        );
        return;
      }

      // SEMPRE perguntar sobre cartão primeiro para despesas de crédito
      // Campos faltando (como responsável) serão perguntados após o cartão
      const message = `💳 Qual cartão e em quantas parcelas? (${cardNames})`;
      await this.sendWhatsAppMessage(user.phone, message);

    } catch (error) {
      console.error('❌ Erro ao perguntar sobre cartão:', error);
      await this.sendWhatsAppMessage(user.phone, 
        "❌ Erro interno. Tente novamente."
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
          "❌ Não consegui identificar o cartão. Tente novamente:\n\n" +
          "Exemplos: 'Latam 3x', 'Latam à vista'"
        );
        return;
      }

      // Buscar cartão no banco
      console.log('🔍 [CARD] Buscando cartão:', cardName, 'na organização:', user.organization_id);
      const card = await this.getCardByName(cardName, user.organization_id);
      console.log('🔍 [CARD] Cartão encontrado:', card);
      
      if (!card) {
        await this.sendWhatsAppMessage(user.phone, 
          `❌ Cartão "${cardName}" não encontrado. Verifique o nome e tente novamente.`
        );
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
        await this.askNextQuestion(user, 'responsavel');
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
        "❌ Erro interno. Tente novamente."
      );
    }
  }

  /**
   * Criar parcelas usando função do banco
   */
  async createInstallments(user, analysis, costCenter, categoryId) {
    try {
      console.log('🔍 [INSTALLMENTS] Criando parcelas:', {
        amount: analysis.valor,
        installments: analysis.parcelas,
        cardId: analysis.card_id,
        costCenterId: costCenter.id,
        categoryId: categoryId,
        organizationId: user.organization_id,
        userId: user.id
      });

      // Chamar função do banco para criar parcelas
      const { data, error } = await supabase.rpc('create_installments', {
        p_amount: analysis.valor,
        p_installments: analysis.parcelas,
        p_description: analysis.descricao,
        p_date: this.parseDate(analysis.data).toISOString().split('T')[0],
        p_card_id: analysis.card_id,
        p_category_id: categoryId,
        p_cost_center_id: costCenter.id,
        p_owner: this.getCanonicalName(analysis.responsavel),
        p_organization_id: user.organization_id,
        p_user_id: user.id,
        p_whatsapp_message_id: `msg_${Date.now()}`
      });

      if (error) {
        console.error('❌ Erro ao criar parcelas:', error);
        throw error;
      }

      console.log('✅ [INSTALLMENTS] Parcelas criadas com sucesso:', data);

      // Confirmar imediatamente todas as parcelas futuras (sem cron)
      try {
        const parentId = data; // função retorna UUID do parent
        if (parentId) {
          await supabase
            .from('expenses')
            .update({ status: 'confirmed' })
            .eq('parent_expense_id', parentId)
            .eq('status', 'pending');
          // Garantir que todas as parcelas (pai e filhas) tenham source='whatsapp'
          await supabase
            .from('expenses')
            .update({ source: 'whatsapp' })
            .eq('parent_expense_id', parentId);
          await supabase
            .from('expenses')
            .update({ source: 'whatsapp' })
            .eq('id', parentId);
        }
      } catch (confirmErr) {
        console.error('❌ Erro ao confirmar parcelas futuras:', confirmErr);
      }

    } catch (error) {
      console.error('❌ Erro ao criar parcelas:', error);
      throw error;
    }
  }
}

export default SmartConversation;
