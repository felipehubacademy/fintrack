import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * ZUL WEB CHAT - Assistente Financeiro para Chat Web
 * 
 * Personalidade: Sábio Jovem - calmo, claro, curioso e inspirador
 * Tom: Próximo, pessoal e respeitoso (muito brasileiro!)
 * Formatação: Adequada para interface web (sem Markdown)
 */
class ZulWebChat {
  constructor() {
    // Nada aqui por enquanto
  }

  /**
   * Instruções para chat web (assistente financeiro experto com acesso a TODOS os dados)
   */
  getWebChatInstructions(context) {
    const { userName, summary, topCategories, expensesByOwner, cards, bankAccounts, monthlyTrend, organization, budgets, allExpenses, allIncomes, month } = context || {};
    const firstName = userName ? userName.split(' ')[0] : 'você';
    
    // Debug: verificar se dados estão chegando
    console.log('📊 [ZUL WEB CHAT] Context recebido:', {
      hasSummary: !!summary,
      hasMonth: !!month,
      hasTopCategories: !!topCategories,
      hasExpenses: !!allExpenses,
      expensesCount: allExpenses?.length || 0,
      summaryBalance: summary?.balance,
      summaryTotalIncomes: summary?.totalIncomes,
      summaryTotalExpenses: summary?.totalExpenses
    });
    
    // Verificar se realmente temos dados
    if (summary && summary.balance !== undefined) {
      console.log('✅ [ZUL WEB CHAT] Dados financeiros válidos encontrados!');
      console.log(`   - Saldo: R$ ${summary.balance}`);
      console.log(`   - Entradas: R$ ${summary.totalIncomes}`);
      console.log(`   - Despesas: R$ ${summary.totalExpenses}`);
    } else {
      console.log('⚠️ [ZUL WEB CHAT] Dados financeiros NÃO encontrados no contexto!');
      console.log('   Context keys:', Object.keys(context || {}));
    }
    
    // Construir instruções - DADOS PRIMEIRO se disponíveis
    let instructions = '';
    
    // Se temos dados financeiros, colocar DIRETO no início
    if (summary && month) {
      instructions += `Você é Zul, assessor financeiro experto do MeuAzulão.

═══════════════════════════════════════════════════════════════════════════════
DADOS FINANCEIROS DO USUÁRIO (${month}) - USE ESTES DADOS PARA RESPONDER!
═══════════════════════════════════════════════════════════════════════════════

SALDO DO MÊS: R$ ${summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
TOTAL DE ENTRADAS: R$ ${summary.totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
TOTAL DE DESPESAS: R$ ${summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

⚠️⚠️⚠️ VOCÊ TEM ACESSO A ESTES DADOS! SEMPRE USE-OS QUANDO O USUÁRIO PERGUNTAR SOBRE SALDO, GASTOS, RECEITAS, etc!

═══════════════════════════════════════════════════════════════════════════════

REGRAS ABSOLUTAS:
1. Quando perguntarem "qual meu saldo?" ou "meu saldo do mês", responda: "Seu saldo do mês está ${summary.balance >= 0 ? 'POSITIVO' : 'NEGATIVO'} em R$ ${summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. Você teve entradas de R$ ${summary.totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} e despesas de R$ ${summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}."
2. NUNCA diga "não consigo acessar" ou "não tenho acesso" - você TEM os dados acima!
3. SEMPRE use os números exatos acima nas suas respostas
4. Seja proativo: aponte problemas e oportunidades baseado nos dados reais
5. Use tom brasileiro, natural mas profissional

`;
    } else {
      instructions += `Você é Zul, assessor financeiro experto do MeuAzulão.

PERSONALIDADE:
- Assessor financeiro profissional e experto
- Use dados reais para insights precisos e personalizados
- Seja proativo: aponte problemas, sugira melhorias, alerte sobre riscos
- Tom brasileiro, natural mas profissional
- Seja específico com números e dados reais

`;
    }
    
    instructions += `CONTEXTO IMPORTANTE:
- Você está em um CHAT WEB (não WhatsApp)
- Você tem acesso COMPLETO aos dados financeiros do usuário através das instruções do sistema
- Você NÃO registra despesas - apenas analisa e dá insights
- Você NÃO precisa do WhatsApp para acessar dados - eles estão nas instruções acima ou abaixo

SUA FUNÇÃO:
Você é um assessor financeiro EXPERTO com acesso COMPLETO aos dados financeiros do usuário.
Você pode:
- Analisar gastos e receitas em detalhes
- Identificar tendências e padrões
- Alertar sobre problemas (cartões perto do limite, gastos excessivos, etc)
- Sugerir estratégias baseadas em dados reais
- Comparar períodos e identificar melhorias/degradações
- Dar insights específicos sobre categorias, responsáveis, cartões, etc
- Analisar orçamentos e sugerir ajustes

REGRAS CRÍTICAS (OBRIGATÓRIAS):
1. VOCÊ TEM ACESSO COMPLETO A DADOS FINANCEIROS REAIS DO USUÁRIO - USE-OS SEMPRE!
2. NUNCA diga "não posso acessar", "não tenho acesso", "não consigo acessar informações pessoais" - você TEM os dados!
3. SEMPRE que o usuário perguntar sobre saldo, gastos, receitas, categorias, cartões, etc, USE os dados fornecidos nas instruções do sistema
4. Seja proativo: não espere perguntas, aponte problemas e oportunidades
5. Use números reais nas suas análises (ex: "R$ 1.200" não "cerca de mil reais")
6. Compare com períodos anteriores quando relevante
7. Alerte sobre riscos (cartões próximos do limite, gastos acima do normal, etc)
8. Sugira ações concretas baseadas nos dados
9. Seja específico: "R$ 1.200 em Restaurantes" é melhor que "muito gasto em restaurantes"
10. Se os dados financeiros estiverem nas instruções do sistema, você DEVE usá-los - não há exceções!

EXEMPLO DE RESPOSTA CORRETA:
Se o usuário perguntar "qual meu saldo do mês?" e os dados mostrarem:
- Total de Entradas: R$ 5.000
- Total de Despesas: R$ 4.200
- Saldo: R$ 800

RESPONDA: "Seu saldo do mês está positivo em **R$ 800,00**! 🎉 Você teve entradas de R$ 5.000 e despesas de R$ 4.200. Isso significa que sobrou 16% do que você recebeu. Que tal usar parte desse valor para uma reserva de emergência?"

NÃO RESPONDA: "Não posso acessar seu saldo diretamente" - isso está ERRADO!

FORMATAÇÃO:
- Use formatação Markdown (**negrito**, *itálico*)
- Use números e símbolos para listas
- Destaque números importantes em negrito

${firstName ? `\nUsuário: ${firstName}` : ''}`;

    // Adicionar dados financeiros se disponíveis
    if (summary && month) {
      instructions += `\n\n═══════════════════════════════════════════════════════════════════════════════\n`;
      instructions += `📊 DADOS FINANCEIROS COMPLETOS DO USUÁRIO (${month})\n`;
      instructions += `═══════════════════════════════════════════════════════════════════════════════\n\n`;
      instructions += `⚠️⚠️⚠️ CRÍTICO: Você TEM ACESSO COMPLETO a esses dados reais. Use-os SEMPRE para responder perguntas financeiras!\n`;
      instructions += `⚠️⚠️⚠️ NUNCA diga que não tem acesso - você TEM todos os dados abaixo!\n\n`;
      
      // Resumo Geral
      instructions += `RESUMO GERAL:\n`;
      instructions += `- Total de Entradas: R$ ${summary.totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      instructions += `- Total de Despesas: R$ ${summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
      instructions += `- Saldo do Mês: R$ ${summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${summary.balance >= 0 ? '(positivo ✅)' : '(negativo ⚠️)'}\n`;
      instructions += `- Despesas no Crédito: R$ ${summary.creditExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${summary.creditPercentage}%)\n`;
      instructions += `- Despesas à Vista: R$ ${summary.cashExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${summary.cashPercentage}%)\n\n`;
      
      // Top Categorias
      if (topCategories && topCategories.length > 0) {
        instructions += `TOP CATEGORIAS DE GASTOS:\n`;
        topCategories.forEach((cat, i) => {
          const percentage = summary.totalExpenses > 0 ? ((cat.amount / summary.totalExpenses) * 100).toFixed(1) : 0;
          instructions += `${i + 1}. ${cat.name}: R$ ${cat.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}% do total)\n`;
        });
        instructions += '\n';
      }
      
      // Despesas por Responsável
      if (expensesByOwner && expensesByOwner.length > 0) {
        instructions += `GASTOS POR RESPONSÁVEL:\n`;
        expensesByOwner.forEach((owner, i) => {
          const percentage = summary.totalExpenses > 0 ? ((owner.amount / summary.totalExpenses) * 100).toFixed(1) : 0;
          instructions += `${i + 1}. ${owner.name}: R$ ${owner.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${percentage}%)\n`;
        });
        instructions += '\n';
      }
      
      // Cartões
      if (cards && cards.length > 0) {
        instructions += `CARTÕES DE CRÉDITO:\n`;
        cards.forEach(card => {
          const status = card.usagePercentage >= 90 ? '⚠️ CRÍTICO' : card.usagePercentage >= 75 ? '⚠️ Atenção' : '✅ OK';
          instructions += `- ${card.name}: R$ ${card.used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / R$ ${card.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${card.usagePercentage}% usado) - ${status}\n`;
          instructions += `  Disponível: R$ ${card.available.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        });
        instructions += '\n';
      }
      
      // Contas Bancárias
      if (bankAccounts && bankAccounts.length > 0) {
        instructions += `CONTAS BANCÁRIAS:\n`;
        bankAccounts.forEach(acc => {
          const status = acc.balance < 0 ? '⚠️ Saldo negativo' : '✅';
          instructions += `- ${acc.name} (${acc.type}): R$ ${acc.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${status}\n`;
        });
        instructions += '\n';
      }
      
      // Tendência Mensal
      if (monthlyTrend && monthlyTrend.length > 1) {
        instructions += `TENDÊNCIA DOS ÚLTIMOS ${monthlyTrend.length} MESES:\n`;
        monthlyTrend.forEach((m, i) => {
          const trend = i > 0 ? (m.expenses > monthlyTrend[i-1].expenses ? '↑' : m.expenses < monthlyTrend[i-1].expenses ? '↓' : '→') : '';
          instructions += `${m.month}: Entradas R$ ${m.incomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}, Despesas R$ ${m.expenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} ${trend}\n`;
        });
        instructions += '\n';
      }
      
      // Orçamentos
      if (budgets && budgets.length > 0) {
        instructions += `ORÇAMENTOS ATIVOS:\n`;
        budgets.forEach(b => {
          instructions += `- ${b.name} (${b.category || 'Geral'}): R$ ${b.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\n`;
        });
        instructions += '\n';
      }
      
      // Todos os dados disponíveis para análise detalhada
      instructions += `DADOS COMPLETOS DISPONÍVEIS:\n`;
      instructions += `- ${allExpenses?.length || 0} despesas individuais com detalhes completos (descrição, valor, data, categoria, forma de pagamento, responsável)\n`;
      instructions += `- ${allIncomes?.length || 0} entradas individuais com detalhes completos\n`;
      instructions += `- Use esses dados para análises específicas quando o usuário perguntar sobre transações específicas\n\n`;
      
      instructions += `⚠️ CRÍTICO: Use TODOS esses dados para dar insights reais e específicos. Seja proativo e aponte problemas/oportunidades!\n`;
      instructions += `Quando o usuário perguntar sobre saldo, gastos, categorias, cartões, etc, use os dados acima para dar respostas ESPECÍFICAS com números reais!\n\n`;
      
      // Exemplos específicos baseados nos dados reais
      if (summary) {
        instructions += `═══════════════════════════════════════════════════════════════════════════════\n`;
        instructions += `EXEMPLOS OBRIGATÓRIOS DE RESPOSTAS BASEADAS NOS DADOS REAIS:\n`;
        instructions += `═══════════════════════════════════════════════════════════════════════════════\n\n`;
        
        instructions += `PERGUNTA: "qual meu saldo do mês?" ou "qual meu saldo?" ou "meu saldo"\n`;
        instructions += `RESPOSTA OBRIGATÓRIA: "Seu saldo do mês está ${summary.balance >= 0 ? 'POSITIVO' : 'NEGATIVO'} em **R$ ${summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**! `;
        instructions += `Você teve entradas de R$ ${summary.totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} e despesas de R$ ${summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}. `;
        if (summary.balance >= 0) {
          const percentage = summary.totalIncomes > 0 ? ((summary.balance / summary.totalIncomes) * 100).toFixed(1) : 0;
          instructions += `Isso significa que sobrou ${percentage}% do que você recebeu. Parabéns! 🎉 Que tal usar parte desse valor para uma reserva de emergência?"\n\n`;
        } else {
          const percentage = summary.totalIncomes > 0 ? ((Math.abs(summary.balance) / summary.totalIncomes) * 100).toFixed(1) : 0;
          instructions += `Isso significa que você gastou ${percentage}% a mais do que recebeu. ⚠️ Vamos analisar onde podemos reduzir gastos?"\n\n`;
        }
        
        instructions += `⚠️⚠️⚠️ IMPORTANTE: Use EXATAMENTE os dados acima. NUNCA diga que não tem acesso!\n\n`;
        
        if (topCategories && topCategories.length > 0) {
          instructions += `Se perguntarem sobre gastos ou categorias:\n`;
          instructions += `RESPONDA mencionando as categorias reais: "${topCategories[0].name} foi sua maior categoria com R$ ${topCategories[0].amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${((topCategories[0].amount / summary.totalExpenses) * 100).toFixed(1)}% do total)"\n\n`;
        }
        
        if (cards && cards.length > 0) {
          const cardAlto = cards.find(c => parseFloat(c.usagePercentage) >= 75);
          if (cardAlto) {
            instructions += `Se perguntarem sobre cartões:\n`;
            instructions += `RESPONDA: "⚠️ Atenção! Seu cartão ${cardAlto.name} está com ${cardAlto.usagePercentage}% de uso (R$ ${cardAlto.used.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de R$ ${cardAlto.limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}). Cuidado para não estourar!"\n\n`;
          }
        }
      }
      
      instructions += `NUNCA diga que não tem acesso aos dados - você TEM todos os dados acima!\n`;
    } else {
      // Mesmo sem dados, manter instruções para ser útil
      instructions += `\n\nNOTA: Dados financeiros específicos não estão disponíveis no momento.\n`;
      instructions += `Se o usuário perguntar sobre dados financeiros específicos, explique que você precisa de acesso aos dados para dar insights precisos.\n`;
    }
    
    return instructions;
  }

  /**
   * Enviar mensagem para chat web (assistente financeiro geral)
   */
  async sendWebChatMessage(userId, userMessage, context = {}) {
    try {
      console.log('💬 [WEB CHAT] Iniciando conversa...');
      console.log('📊 [WEB CHAT] Context recebido:', JSON.stringify(context, null, 2));
      
      // Instruções específicas para chat web
      const systemMessage = this.getWebChatInstructions(context);
      console.log('📝 [WEB CHAT] System message length:', systemMessage.length);
      console.log('📝 [WEB CHAT] System message preview (first 500 chars):', systemMessage.substring(0, 500));
      
      // Preparar mensagens para GPT-4
      const messages = [
        {
          role: 'system',
          content: systemMessage
        },
        {
          role: 'user',
          content: userMessage
        }
      ];
      
      // Verificar se temos dados financeiros antes de chamar GPT
      const hasFinancialData = context?.summary && context?.month;
      if (hasFinancialData) {
        console.log('✅ [WEB CHAT] Chamando GPT com dados financeiros disponíveis');
        console.log(`   Saldo: R$ ${context.summary.balance}`);
      } else {
        console.log('⚠️ [WEB CHAT] Chamando GPT SEM dados financeiros');
      }
      
      // Chamar GPT-4
      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3, // Reduzir temperatura para respostas mais determinísticas
        top_p: 0.9,
        frequency_penalty: 0.3, // Aumentar para evitar repetições
        presence_penalty: 0.2,
        max_tokens: 800 // Aumentar tokens para respostas mais completas
      });
      
      const response = completion.choices[0].message.content;
      console.log('💬 [WEB CHAT] Resposta gerada:', response.substring(0, 200));
      
      return response;
      
    } catch (error) {
      console.error('❌ [WEB CHAT] Erro:', error);
      throw error;
    }
  }
}

export default ZulWebChat;