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
   * Normaliza método de pagamento para valores canônicos V2
   */
  normalizePaymentMethod(input) {
    if (!input) return 'other';
    
    const t = String(input)
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');
    
    // Cartão de Crédito - todas as variações
    if (/cred/.test(t) || /cart.*cred/.test(t) || /credito/.test(t)) {
      return 'credit_card';
    }
    
    // Cartão de Débito - todas as variações
    if (/deb/.test(t) || /cart.*deb/.test(t) || /debito/.test(t)) {
      return 'debit_card';
    }
    
    // PIX - todas as variações
    if (/pix/.test(t)) {
      return 'pix';
    }
    
    // Dinheiro - todas as variações
    if (/(dinheiro|cash|especie)/.test(t)) {
      return 'cash';
    }
    
    return 'other';
  }

  /**
   * Heurística simples para detectar início de nova despesa
   */
  isLikelyNewExpenseMessage(text) {
    if (!text) return false;
    const t = String(text).toLowerCase();
    // palavras-gatilho comuns e presença de número/valor
    const hasTrigger = /(gastei|paguei|comprei|r\$)/.test(t);
    const hasNumber = /\d+[\.,]?\d*/.test(t);
    return hasTrigger && hasNumber;
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

RESPONSÁVEIS: Felipe, Letícia, Compartilhado (ou null se não especificado)

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
      const user = await this.getUserByPhone(userPhone);
      if (!user) {
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

      // 5. Verificar se precisa de confirmação
      if (analysis.precisa_confirmar) {
        await this.handleIncompleteInfo(user, analysis);
      } else {
        await this.handleCompleteInfo(user, analysis);
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
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('whatsapp_message_id', userPhone)
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
      
      if (missingFields.length === 0) {
        // Sem campos faltando, finalizar
        await this.finalizeExpense(ongoingConversation, user);
        return;
      }

      // Processar resposta do usuário
      const nextField = missingFields[0];
      const updatedAnalysis = await this.processUserResponse(nextField, userResponse, ongoingConversation);
      
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
          // Todos os campos preenchidos, finalizar
          await this.finalizeExpense({
            ...ongoingConversation,
            conversation_state: updatedState
          }, user);
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
- responsavel: Felipe, Letícia, Compartilhado
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
      
      // Combinar com análise anterior
      const fullAnalysis = {
        valor: ongoingConversation.amount,
        descricao: ongoingConversation.description,
        categoria: ongoingConversation.category,
        data: ongoingConversation.date,
        ...result
      };

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
        cc.name.toLowerCase() === responsibleName.toLowerCase()
      );

      if (!costCenter) {
        await this.sendWhatsAppMessage(user.phone, 
          `❌ Centro de custo "${responsibleName || 'indefinido'}" não encontrado.`
        );
        return;
      }

      // Atualizar despesa como confirmada
      const expenseData = {
        organization_id: user.organization_id,
        user_id: user.id,
        cost_center_id: costCenter.id,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
        whatsapp_message_id: `msg_${Date.now()}`
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

    if (missingFields.length > 0) {
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
        whatsapp_message_id: user.phone // Usar telefone como ID temporário
      };

      const { data: pendingExpense } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      // Perguntar primeiro campo faltando
      await this.askNextQuestion(user, missingFields[0]);
    }
  }

  /**
   * Lidar com informação completa
   */
  async handleCompleteInfo(user, analysis) {
    const costCenters = await this.getCostCenters(user.organization_id);
    const costCenter = costCenters.find(cc => 
      cc.name.toLowerCase() === analysis.responsavel?.toLowerCase()
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

    // Salvar despesa
    const expenseData = {
      organization_id: user.organization_id,
      user_id: user.id,
      cost_center_id: costCenter.id,
      amount: analysis.valor,
      description: analysis.descricao,
      payment_method: normalizedMethod,
      category_id: categoryId,
      category: analysis.categoria,
      owner: analysis.responsavel, // Mapear responsavel para owner
      date: this.parseDate(analysis.data),
      status: 'confirmed',
      confirmed_at: new Date().toISOString(),
      confirmed_by: user.id,
      source: 'whatsapp', // Fonte WhatsApp
      whatsapp_message_id: `msg_${Date.now()}`
    };

    await this.saveExpense(expenseData);

    // Enviar confirmação
    const confirmationMessage = `✅ Despesa registrada!\n\n` +
      `💰 R$ ${analysis.valor.toFixed(2)} - ${analysis.descricao}\n` +
      `📂 ${analysis.categoria} - ${analysis.responsavel}\n` +
      `💳 ${this.getPaymentMethodName(normalizedMethod)}\n` +
      `📅 ${this.parseDate(analysis.data).toLocaleDateString('pt-BR')}`;

    await this.sendWhatsAppMessage(user.phone, confirmationMessage);
  }

  /**
   * Converter data
   */
  parseDate(dateStr) {
    const today = new Date();
    
    if (dateStr === 'hoje') return today;
    if (dateStr === 'ontem') {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday;
    }
    
    // Tentar parsear data específica
    const parsed = new Date(dateStr);
    return isNaN(parsed.getTime()) ? today : parsed;
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
      'other': 'Outro'
    };
    return names[method] || method;
  }
}

export default SmartConversation;
