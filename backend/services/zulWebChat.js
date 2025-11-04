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

PERSONALIDADE DO ZUL:
- Sábio jovem: calmo, claro, curioso e inspirador
- Tom brasileiro: próximo, pessoal e respeitoso (muito brasileiro!)
- Assessor experto: usa dados reais para insights precisos
- PROATIVO: aponta problemas, sugere melhorias, alerta sobre riscos, menciona transações específicas relevantes
- Natural e acessível: fala como um amigo que sabe muito sobre finanças
- Entusiasta mas equilibrado: animado para ajudar, mas sério quando necessário
- Observador: identifica padrões e compras grandes nas transações específicas

FORMATO DE RESPOSTAS:
- Use parágrafos curtos e claros
- Use listas numeradas ou com bullets quando apropriado
- Use títulos (###) para organizar seções longas
- Use negrito (**texto**) para destacar números e informações importantes
- Seja direto mas amigável
- Evite jargões financeiros complexos - explique quando necessário

═══════════════════════════════════════════════════════════════════════════════
DADOS FINANCEIROS DO USUÁRIO (${month}) - USE ESTES DADOS PARA RESPONDER!
═══════════════════════════════════════════════════════════════════════════════

SALDO DO MÊS: R$ ${summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
TOTAL DE ENTRADAS: R$ ${summary.totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
TOTAL DE DESPESAS: R$ ${summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}

⚠️⚠️⚠️ VOCÊ TEM ACESSO A ESTES DADOS! SEMPRE USE-OS QUANDO O USUÁRIO PERGUNTAR SOBRE SALDO, GASTOS, RECEITAS, etc!

═══════════════════════════════════════════════════════════════════════════════

REGRAS ABSOLUTAS:
1. Quando perguntarem "qual meu saldo?" ou "meu saldo do mês", responda: "Seu saldo do mês está ${summary.balance >= 0 ? 'POSITIVO' : 'NEGATIVO'} em **R$ ${summary.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**! Você teve entradas de **R$ ${summary.totalIncomes.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}** e despesas de **R$ ${summary.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}**."
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
1. VOCÊ TEM ACESSO COMPLETO A TODAS AS TRANSAÇÕES DO MÊS - USE-OS SEMPRE!
2. NUNCA diga "não posso acessar", "não tenho acesso", "não consigo acessar informações pessoais" - você TEM os dados!
3. SEMPRE que o usuário perguntar sobre saldo, gastos, receitas, categorias, cartões, etc, USE os dados fornecidos nas instruções do sistema
4. SEJA PROATIVO: Identifique e mencione transações específicas relevantes (ex: "Vi que você comprou uma televisão de R$ X este mês", "Notei um gasto alto de R$ Y em restaurantes")
5. Use números reais nas suas análises (ex: "R$ 1.200" não "cerca de mil reais")
6. Compare com períodos anteriores quando relevante (use monthlyTrend)
7. Alerte sobre riscos (cartões próximos do limite, gastos acima do normal, compras grandes, etc)
8. Sugira ações concretas baseadas nos dados REAIS, não genéricas
9. Seja específico: "R$ 1.200 em Restaurantes" é melhor que "muito gasto em restaurantes"
10. Se os dados financeiros estiverem nas instruções do sistema, você DEVE usá-los - não há exceções!
11. Se você sugeriu algo e o usuário responde "Sim", "Sim por favor", "Pode ser", "vamos lá", etc, CONTINUE imediatamente com análise detalhada usando os dados financeiros disponíveis (allExpenses, monthlyTrend, etc)
12. Mantenha contexto da conversa anterior - se você mencionou algo, continue a partir daí
13. Quando perguntarem sobre categoria, LISTE as despesas específicas dessa categoria de allExpenses, não dê apenas o total
14. Use dados históricos (monthlyTrend) para comparar e identificar tendências
15. Identifique padrões nos dados (despesas recorrentes vs pontuais, maiores gastos, compras grandes, etc)
16. Evite sugestões genéricas tipo "faça uma lista de compras" - seja específico baseado nas despesas reais
17. Se houver orçamento (budgets), compare gastos reais com o orçado e aponte quando estiver acima
18. IDENTIFIQUE COMPRAS GRANDES: Se houver despesas acima de R$ 500, mencione-as proativamente quando relevante
19. MENCIONE TRANSAÇÕES ESPECÍFICAS: Use descrições e valores das transações reais para dar insights (ex: "Vi que você comprou [descrição] de R$ X")
20. ANALISE PADRÕES: Identifique se há gastos recorrentes altos, compras pontuais grandes, etc.

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
      instructions += `- ${allIncomes?.length || 0} entradas individuais com detalhes completos\n\n`;
      
      // Incluir TODAS as despesas nas instruções para o GPT poder usar (SEM LIMITE)
      if (allExpenses && allExpenses.length > 0) {
        instructions += `TODAS AS DESPESAS DO MÊS (${month}) - ${allExpenses.length} transações:\n`;
        allExpenses.forEach((expense, index) => {
          instructions += `${index + 1}. ${expense.description || 'Sem descrição'} - R$ ${expense.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Categoria: ${expense.category || 'Outros'} | Data: ${expense.date} | Forma: ${expense.paymentMethod || 'N/A'} | Responsável: ${expense.owner || 'N/A'}\n`;
        });
        instructions += `\n⚠️ CRÍTICO: Você tem acesso a TODAS essas ${allExpenses.length} despesas! Use-as para:\n`;
        instructions += `- Identificar compras grandes (ex: "Vi que você comprou uma televisão de R$ X este mês")\n`;
        instructions += `- Dar insights proativos sobre gastos específicos\n`;
        instructions += `- Comparar padrões de compra\n`;
        instructions += `- Alertar sobre gastos excessivos em categorias específicas\n`;
        instructions += `- Mencionar transações relevantes quando apropriado\n`;
        instructions += `- Ser proativo: "Vi que você gastou R$ X em [categoria] este mês, isso representa Y% do total"\n\n`;
      }
      
      // Incluir TODAS as entradas nas instruções (SEM LIMITE)
      if (allIncomes && allIncomes.length > 0) {
        instructions += `TODAS AS ENTRADAS DO MÊS (${month}) - ${allIncomes.length} transações:\n`;
        allIncomes.forEach((income, index) => {
          instructions += `${index + 1}. ${income.description || 'Sem descrição'} - R$ ${income.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Data: ${income.date} | Responsável: ${income.owner || 'N/A'}\n`;
        });
        instructions += `\n`;
      }
      
      instructions += `Use esses dados para análises específicas quando o usuário perguntar sobre transações específicas, categorias, ou quando disser "vamos lá", "sim", etc.\n\n`;
      
      // Adicionar lista de despesas por categoria quando relevante
      if (allExpenses && allExpenses.length > 0) {
        instructions += `QUANDO PERGUNTAREM SOBRE CATEGORIA ESPECÍFICA (ex: "quanto gastei em casa", "gastos com mercado"):\n`;
        instructions += `1. FILTRE as despesas de allExpenses pela categoria mencionada\n`;
        instructions += `2. LISTE as despesas específicas com descrição e valor\n`;
        instructions += `3. CALCULE o total e percentual do total\n`;
        instructions += `4. COMPARE com meses anteriores se monthlyTrend disponível\n`;
        instructions += `5. IDENTIFIQUE padrões (recorrentes vs pontuais)\n`;
        instructions += `6. DÊ SUGESTÕES ESPECÍFICAS baseadas nas despesas reais listadas\n`;
        instructions += `7. NÃO dê sugestões genéricas - use os dados reais!\n\n`;
      }
      
      instructions += `⚠️ CRÍTICO: Use TODOS esses dados para dar insights reais e específicos. Seja proativo e aponte problemas/oportunidades!\n`;
      instructions += `Quando o usuário perguntar sobre saldo, gastos, categorias, cartões, etc, use os dados acima para dar respostas ESPECÍFICAS com números reais!\n\n`;
      
      instructions += `REGRAS PARA ANÁLISES DE CATEGORIAS:\n`;
      instructions += `- Se perguntarem "quanto gastei em [categoria]", liste as despesas específicas dessa categoria\n`;
      instructions += `- Mostre os valores individuais e o total\n`;
      instructions += `- Compare com meses anteriores se dados disponíveis\n`;
      instructions += `- Identifique as maiores despesas dentro da categoria\n`;
      instructions += `- Dê sugestões baseadas nas despesas reais, não genéricas\n`;
      instructions += `- Se o usuário disser "vamos lá", "sim", "pode ser", continue com análise detalhada usando os dados reais\n\n`;
      
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
   * Enviar mensagem para chat web (assistente financeiro geral) - COM STREAMING
   */
  async *sendWebChatMessageStream(userId, userMessage, context = {}) {
    try {
      console.log('💬 [WEB CHAT] Iniciando conversa com streaming...');
      console.log('📊 [WEB CHAT] Context recebido:', JSON.stringify(context, null, 2));
      
      // Instruções específicas para chat web
      const systemMessage = this.getWebChatInstructions(context);
      console.log('📝 [WEB CHAT] System message length:', systemMessage.length);
      
      // Preparar mensagens para GPT-4
      const messages = [
        {
          role: 'system',
          content: systemMessage
        }
      ];
      
      // Adicionar histórico de conversa se disponível
      if (context.conversationHistory && Array.isArray(context.conversationHistory)) {
        console.log(`📜 [WEB CHAT] Adicionando ${context.conversationHistory.length} mensagens do histórico`);
        messages.push(...context.conversationHistory);
      }
      
      // Adicionar mensagem atual do usuário
      messages.push({
        role: 'user',
        content: userMessage
      });
      
      // Verificar se temos dados financeiros antes de chamar GPT
      const hasFinancialData = context?.summary && context?.month;
      if (hasFinancialData) {
        console.log('✅ [WEB CHAT] Chamando GPT com dados financeiros disponíveis');
      } else {
        console.log('⚠️ [WEB CHAT] Chamando GPT SEM dados financeiros');
      }
      
      // Chamar GPT-4 com streaming
      const stream = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messages,
        temperature: 0.3,
        top_p: 0.9,
        frequency_penalty: 0.3,
        presence_penalty: 0.2,
        max_tokens: 800,
        stream: true // Habilitar streaming
      });
      
      // Yield cada chunk da resposta
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          yield content;
        }
      }
      
    } catch (error) {
      console.error('❌ [WEB CHAT] Erro:', error);
      throw error;
    }
  }

  /**
   * Enviar mensagem para chat web (assistente financeiro geral) - SEM STREAMING (fallback)
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
        }
      ];
      
      // Adicionar histórico de conversa se disponível
      if (context.conversationHistory && Array.isArray(context.conversationHistory)) {
        console.log(`📜 [WEB CHAT] Adicionando ${context.conversationHistory.length} mensagens do histórico`);
        messages.push(...context.conversationHistory);
      }
      
      // Adicionar mensagem atual do usuário
      messages.push({
        role: 'user',
        content: userMessage
      });
      
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