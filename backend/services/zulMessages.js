/**
 * ZUL - Assistente Financeiro do MeuAzulão
 * Módulo de mensagens personalizadas
 * 
 * Personalidade: Sábio Jovem - calmo, claro, curioso e inspirador
 * Tom: Próximo, pessoal e respeitoso
 */

class ZulMessages {
  constructor() {
    // Emojis contextuais por categoria
    this.categoryEmojis = {
      'Alimentação': '🍽️',
      'Supermercado': '🛒',
      'Mercado': '🛒',
      'Transporte': '🚗',
      'Combustível': '⛽',
      'Saúde': '💊',
      'Farmácia': '💊',
      'Beleza': '💄',
      'Lazer': '🎉',
      'Contas': '📄',
      'Casa': '🏠',
      'Educação': '📚',
      'Vestuário': '👕',
      'Outros': '💰'
    };
  }

  /**
   * Pegar emoji contextual baseado na descrição
   */
  getContextEmoji(description) {
    if (!description) return '💰';
    
    const desc = description.toLowerCase();
    
    if (desc.includes('mercado') || desc.includes('supermercado')) return '🛒';
    if (desc.includes('posto') || desc.includes('gasolina') || desc.includes('combustível')) return '⛽';
    if (desc.includes('farmácia') || desc.includes('remédio')) return '💊';
    if (desc.includes('restaurante') || desc.includes('lanche') || desc.includes('comida')) return '🍽️';
    if (desc.includes('uber') || desc.includes('taxi') || desc.includes('transporte')) return '🚗';
    if (desc.includes('academia') || desc.includes('esporte')) return '💪';
    if (desc.includes('cinema') || desc.includes('show') || desc.includes('festa')) return '🎉';
    if (desc.includes('roupa') || desc.includes('sapato')) return '👕';
    if (desc.includes('conta') || desc.includes('luz') || desc.includes('água')) return '📄';
    if (desc.includes('escola') || desc.includes('curso') || desc.includes('livro')) return '📚';
    
    return '💰';
  }

  /**
   * Escolher uma variação aleatória de um array
   */
  pickRandom(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * Saudação inicial quando detecta nova despesa
   */
  getGreeting(userName, amount, description) {
    const emoji = this.getContextEmoji(description);
    const name = userName ? userName.split(' ')[0] : 'aí';
    
    const greetings = [
      `Opa ${name}! Vamos registrar essa despesa? ${emoji}`,
      `E aí ${name}! Deixa eu anotar isso pra você! ${emoji}`,
      `Beleza ${name}! Vou registrar aqui rapidinho! ${emoji}`
    ];
    
    return this.pickRandom(greetings);
  }

  /**
   * Perguntar método de pagamento
   */
  askPaymentMethod(amount, description, userName) {
    const emoji = this.getContextEmoji(description);
    const name = userName ? userName.split(' ')[0] : '';
    const valor = parseFloat(amount).toFixed(2);
    
    // Variações mais naturais baseadas no contexto
    const variations = description && description !== 'gasto não especificado'
      ? [
          `Beleza! Como você pagou?`,
          `Show! Qual foi a forma de pagamento?`,
          `Tranquilo! Pagou como?`
        ]
      : [
          `Certo${name ? ` ${name}` : ''}! R$ ${valor} 💰\n\nO que foi?`,
          `Beleza! R$ ${valor} 💰\n\nMe conta o que foi?`,
          `Anotado! R$ ${valor} 💰\n\nO que você comprou?`
        ];
    
    return this.pickRandom(variations);
  }

  /**
   * Erro - Método de pagamento inválido
   */
  invalidPaymentMethod(userName) {
    const name = userName ? userName.split(' ')[0] : '';
    
    const variations = [
      `Eita${name ? ` ${name}` : ''}, não entendi! 😅\n\nAs formas que tenho aqui são: Débito, Crédito, PIX ou Dinheiro`,
      `Hmm${name ? ` ${name}` : ''}, não consegui identificar! 🤔\n\nTenho essas opções: Débito, Crédito, PIX ou Dinheiro`,
      `Opa${name ? ` ${name}` : ''}, não reconheci essa forma de pagamento! 😅\n\nPode escolher entre: Débito, Crédito, PIX ou Dinheiro`
    ];
    
    return this.pickRandom(variations);
  }

  /**
   * Perguntar sobre cartão e parcelas
   */
  askCardAndInstallments(amount, description, cardsList) {
    const variations = [
      `Beleza! Foi no crédito então\n\nQual cartão e em quantas parcelas? 💳`,
      `Certo! Cartão de crédito\n\nQual cartão? E foi à vista ou parcelado? 💳`,
      `Entendi! No crédito\n\nMe fala o cartão e quantas vezes? 💳`
    ];
    
    return this.pickRandom(variations);
  }

  /**
   * Erro - Cartão inválido (com sugestões)
   */
  invalidCard(userName, availableCards) {
    const name = userName ? userName.split(' ')[0] : '';
    const cardsText = availableCards && availableCards.length > 0
      ? availableCards.join(' e ')
      : 'cadastrados';
    
    const variations = [
      `${name}, os cartões que tenho no sistema são ${cardsText}! 💳\n\nEm qual foi e em quantas vezes?`,
      `Hmm ${name}, não achei esse cartão! 🤔\n\nTenho aqui: ${cardsText}\n\nQual foi e quantas parcelas?`,
      `Opa ${name}, esse cartão não tá cadastrado! 😅\n\nOs disponíveis são: ${cardsText}\n\nMe diz qual e quantas vezes?`
    ];
    
    return this.pickRandom(variations);
  }

  /**
   * Perguntar responsável
   */
  askResponsible(costCenters, isAfterCard = false) {
    if (isAfterCard) {
      const variations = [
        `Quem pagou?`,
        `Quem foi o responsável?`,
        `Me diz quem pagou?`
      ];
      return this.pickRandom(variations);
    }
    
    const variations = [
      `Quem pagou?`,
      `Quem foi o responsável?`,
      `Me diz quem pagou?`
    ];
    
    return this.pickRandom(variations);
  }

  /**
   * Erro - Responsável inválido (com sugestões)
   */
  invalidResponsible(userName, costCenters) {
    const name = userName ? userName.split(' ')[0] : '';
    const costCenterNames = costCenters.map(cc => cc.name);
    const hasCompartilhado = costCenterNames.some(n => n.toLowerCase() === 'compartilhado');
    
    // Adicionar "Compartilhado" se não existir e formatar
    const names = hasCompartilhado ? costCenterNames : [...costCenterNames, 'Compartilhado'];
    
    let namesList = '';
    if (names.length === 2) {
      namesList = names.join(' ou então ');
    } else if (names.length > 2) {
      const lastNames = names.slice(-2);
      const firstNames = names.slice(0, -2);
      namesList = firstNames.join(', ') + ', ' + lastNames.join(' ou então ');
    } else {
      namesList = names[0];
    }
    
    const variations = [
      `Humm ${name}, aqui para mim eu tenho ${namesList}!`,
      `Opa ${name}, não achei esse nome! 🤔\n\nTenho: ${namesList}`,
      `Eita ${name}, não reconheci! 😅\n\nOs responsáveis são: ${namesList}`
    ];
    
    return this.pickRandom(variations);
  }

  /**
   * Perguntar descrição
   */
  askDescription() {
    const variations = [
      `Me conta o que foi? (ex.: mercado, farmácia, posto...)`,
      `O que você comprou? (ex.: mercado, restaurante, uber...)`,
      `Qual foi o gasto? (ex.: mercado, posto, farmácia...)`
    ];
    
    return this.pickRandom(variations);
  }

  /**
   * Perguntar categoria
   */
  askCategory(categoryNames) {
    const categories = categoryNames.join(', ');
    
    const variations = [
      `Qual categoria se encaixa melhor?\n\n(${categories})`,
      `Me ajuda a categorizar?\n\n(${categories})`,
      `Em qual categoria isso entra?\n\n(${categories})`
    ];
    
    return this.pickRandom(variations);
  }

  /**
   * Mensagem final conversacional baseada no contexto
   */
  getContextualClosing(description, category) {
    if (!description) return '';
    
    const desc = description.toLowerCase();
    
    // Alimentação / Restaurante
    if (desc.includes('restaurante') || desc.includes('pizza') || desc.includes('lanche') || 
        desc.includes('hamburger') || desc.includes('comida') || category === 'Alimentação') {
      return this.pickRandom([
        '\n\nBom apetite! 🍽️',
        '\n\nAproveite! 😋',
        '\n\nDelícia! 🤤'
      ]);
    }
    
    // Mercado / Supermercado
    if (desc.includes('mercado') || desc.includes('supermercado')) {
      return this.pickRandom([
        '\n\nBoas compras! 🛒',
        '\n\nMercado feito! ✅',
        '\n\nDespensa cheia! 🛒'
      ]);
    }
    
    // Combustível / Gasolina
    if (desc.includes('gasolina') || desc.includes('combustível') || desc.includes('posto') || 
        desc.includes('etanol') || category === 'Transporte') {
      return this.pickRandom([
        '\n\nBoa viagem! 🚗',
        '\n\nTanque cheio! ⛽',
        '\n\nPega a estrada! 🛣️'
      ]);
    }
    
    // Farmácia / Saúde
    if (desc.includes('farmácia') || desc.includes('remédio') || desc.includes('médico') || 
        category === 'Saúde') {
      return this.pickRandom([
        '\n\nCuide-se bem! 💊',
        '\n\nMelhoras! 🏥',
        '\n\nSaúde em dia! ✨'
      ]);
    }
    
    // Lazer / Entretenimento
    if (desc.includes('cinema') || desc.includes('show') || desc.includes('festa') || 
        desc.includes('bar') || category === 'Lazer') {
      return this.pickRandom([
        '\n\nAproveite! 🎉',
        '\n\nDivirta-se! 🥳',
        '\n\nCurta bastante! 🎊'
      ]);
    }
    
    // Academia / Esporte
    if (desc.includes('academia') || desc.includes('esporte') || desc.includes('treino')) {
      return this.pickRandom([
        '\n\nBom treino! 💪',
        '\n\nVamo que vamo! 🏋️',
        '\n\nFoco no shape! 💪'
      ]);
    }
    
    // Genérico
    return '';
  }

  /**
   * Confirmação de despesa registrada
   */
  getConfirmation(expense, userName, costCenters = []) {
    const {
      amount,
      description,
      category,
      owner,
      payment_method,
      date,
      cartao,
      parcelas,
      isShared
    } = expense;

    const name = userName ? userName.split(' ')[0] : '';
    const emoji = this.getContextEmoji(description);
    const valor = parseFloat(amount);
    
    // Reação baseada no valor/contexto
    let reaction = '';
    if (valor > 500) {
      reaction = `Opa, essa foi grande hein! Mas tá tudo registrado 📝\n\n`;
    } else if (isShared) {
      reaction = `Beleza! Vou dividir entre vocês 👥\n\n`;
    } else if (parcelas && parcelas > 1) {
      reaction = `Já separei as ${parcelas} parcelas aqui pra você 📊\n\n`;
    }
    
    // Construir saudação inicial
    const greetingVariations = [
      `Tudo certo${name ? ` ${name}` : ''}! 🎯`,
      `Registrado${name ? ` ${name}` : ''}! ✅`,
      `Anotado${name ? ` ${name}` : ''}! 🎯`
    ];
    
    let message = `${this.pickRandom(greetingVariations)}\n\n${reaction}`;
    
    // Detalhes da despesa
    message += `${emoji} ${description || 'Gasto'} - R$ ${valor.toFixed(2)}\n`;
    
    // Forma de pagamento
    if (cartao && parcelas) {
      const valorParcela = valor / parcelas;
      message += `💳 ${cartao} - ${parcelas}x de R$ ${valorParcela.toFixed(2)}\n`;
    } else {
      const paymentNames = {
        'credit_card': '💳 Cartão de Crédito',
        'debit_card': '💳 Débito',
        'pix': '💸 PIX',
        'cash': '💵 Dinheiro',
        'bank_transfer': '🏦 Transferência',
        'boleto': '📄 Boleto',
        'other': '💰 Outro'
      };
      message += `${paymentNames[payment_method] || '💰 ' + payment_method}\n`;
    }
    
    // Responsável (com splits se for compartilhado)
    if (isShared && costCenters && costCenters.length > 0) {
      const individualCenters = costCenters.filter(cc => cc.type === 'individual');
      const splits = individualCenters
        .map(cc => `${cc.name} ${parseFloat(cc.split_percentage || 50).toFixed(0)}%`)
        .join(' / ');
      message += `👥 Compartilhado (${splits})\n`;
    } else {
      message += `👤 ${owner}\n`;
    }
    
    // Categoria
    if (category) {
      message += `📂 ${category}\n`;
    }
    
    // Data
    const dateObj = new Date(date);
    const today = new Date();
    const isToday = dateObj.toDateString() === today.toDateString();
    const dateStr = isToday ? 'Hoje' : dateObj.toLocaleDateString('pt-BR');
    message += `📅 ${dateStr}`;
    
    // Dica para ajustar divisão se for compartilhado
    if (isShared) {
      message += `\n\n_Quer ajustar a divisão? É só entrar no app!_ 📱`;
    }
    
    // Adicionar fechamento contextual conversacional
    const contextualClosing = this.getContextualClosing(description, category);
    if (contextualClosing) {
      message += contextualClosing;
    }
    
    return message;
  }

  /**
   * Erro - Usuário não encontrado
   */
  userNotFound() {
    return `Opa! Não consegui te identificar aqui. 🤔\n\nVocê já fez parte de uma organização no MeuAzulão? Se sim, verifica se teu número está cadastrado direitinho!`;
  }

  /**
   * Erro - Centro de custo não encontrado
   */
  costCenterNotFound(costCenterName) {
    return `Eita! Não achei o responsável "${costCenterName}" aqui. 😅\n\nVerifica se o nome tá certo ou fala com quem gerencia a organização!`;
  }

  /**
   * Erro - Cartão não encontrado
   */
  cardNotFound(cardName, availableCards) {
    const cardsText = availableCards && availableCards.length > 0
      ? `\n\nCartões disponíveis: ${availableCards.join(', ')}`
      : '';
    
    return `Hmm, não encontrei o cartão "${cardName}". 🤔\n\nVerifica o nome e tenta de novo?${cardsText}`;
  }

  /**
   * Erro - Não conseguiu entender a mensagem
   */
  didNotUnderstand() {
    return `Opa! Não consegui entender. 😅\n\nTenta assim: "Gastei 50 no mercado" ou "Paguei 30 na farmácia"`;
  }

  /**
   * Erro - Não é sobre despesas
   */
  notAboutExpense() {
    return `Opa! Eu sou o ZUL, assistente financeiro do MeuAzulão! 😊\n\n` +
      `Estou aqui pra te ajudar a registrar despesas rapidinho.\n\n` +
      `📝 Tenta assim:\n` +
      `• "Gastei 50 no mercado"\n` +
      `• "Paguei 30 na farmácia"\n` +
      `• "100 no posto de gasolina"\n\n` +
      `Bora começar?`;
  }

  /**
   * Erro - Problema ao processar cartão/parcelas
   */
  cardInfoError() {
    return `Eita! Não consegui pegar as informações do cartão. 😅\n\n` +
      `Tenta de novo assim:\n` +
      `• "Latam 3x" (parcelado)\n` +
      `• "Nubank à vista" (1x)`;
  }

  /**
   * Erro genérico
   */
  genericError() {
    return `Eita! Algo deu errado aqui. 😅\n\nPode tentar de novo? Se o problema persistir, chama o suporte que a gente resolve!`;
  }

  /**
   * Erro ao salvar despesa
   */
  saveError() {
    return `Opa! Tive um problema pra salvar essa despesa. 😔\n\nTenta de novo? Se continuar, melhor falar com o suporte!`;
  }

  /**
   * Mensagem de boas-vindas (primeira interação)
   */
  welcome(userName) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    
    return `Opa ${name}! Eu sou o ZUL, seu assistente financeiro do MeuAzulão! 😊\n\n` +
      `Vou te ajudar a registrar suas despesas de um jeito rápido e fácil.\n\n` +
      `📝 É só me mandar algo como:\n` +
      `• "Gastei 50 no mercado"\n` +
      `• "Paguei 100 no posto"\n` +
      `• "30 na farmácia"\n\n` +
      `Bora começar?`;
  }

  // ============================================================================
  // NOTIFICAÇÕES E RELATÓRIOS
  // ============================================================================

  /**
   * Lembrete diário de engajamento
   */
  dailyReminder(userName, lastExpenseDate, streak) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    const today = new Date().toLocaleDateString('pt-BR');
    
    let streakMessage = '';
    if (streak > 0) {
      streakMessage = `🔥 Você está em uma sequência de ${streak} dias seguidos! Continue assim!`;
    } else if (lastExpenseDate) {
      const lastDate = new Date(lastExpenseDate).toLocaleDateString('pt-BR');
      streakMessage = `📅 Última despesa registrada: ${lastDate}`;
    } else {
      streakMessage = `📝 Que tal começar a registrar suas despesas hoje?`;
    }
    
    return `Oi ${name}! Já registrou seus gastos de hoje? 📊\n\n${streakMessage}\n\nAcesse: ${process.env.NEXT_PUBLIC_APP_URL || 'https://meuazulao.com.br'}`;
  }

  /**
   * Alerta de orçamento
   */
  budgetAlert(userName, category, percentage, spent, limit) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    const spentFormatted = Number(spent).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const limitFormatted = Number(limit).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    
    let alertLevel = '';
    let projectionMessage = '';
    
    if (percentage >= 100) {
      alertLevel = '🚨 URGENTE';
      projectionMessage = 'Você já ultrapassou o orçamento!';
    } else if (percentage >= 90) {
      alertLevel = '⚠️ ATENÇÃO';
      const remaining = Number(limit) - Number(spent);
      const daysLeft = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
      const dailyAverage = remaining / Math.max(daysLeft, 1);
      projectionMessage = `No ritmo atual, você vai ultrapassar em ${Math.ceil(remaining / Math.max(dailyAverage, 1))} dias.`;
    } else if (percentage >= 80) {
      alertLevel = '⚠️ CUIDADO';
      projectionMessage = 'Você está próximo do limite do orçamento.';
    }
    
    return `${alertLevel} *Alerta de Orçamento*\n\n` +
      `${category}: ${percentage.toFixed(1)}% usado\n` +
      `Gasto: R$ ${spentFormatted} de R$ ${limitFormatted}\n\n` +
      `${projectionMessage}`;
  }

  /**
   * Relatório semanal
   */
  weeklyReport(userName, totalSpent, topCategory, comparison) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    const totalFormatted = Number(totalSpent).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const changePercent = comparison ? comparison.percentChange : 0;
    const changeText = changePercent > 0 ? `+${changePercent.toFixed(1)}%` : `${changePercent.toFixed(1)}%`;
    const changeEmoji = changePercent > 0 ? '📈' : changePercent < 0 ? '📉' : '➡️';
    
    let topCategoriesText = '';
    if (topCategory && topCategory.length > 0) {
      topCategoriesText = topCategory.map((cat, index) => 
        `${index + 1}. ${cat.emoji} ${cat.name}: R$ ${Number(cat.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${cat.percentage}%)`
      ).join('\n');
    }
    
    const insight = this.generateWeeklyInsight(comparison, topCategory);
    
    return `📊 *Relatório Semanal*\n\n` +
      `💰 Total: R$ ${totalFormatted} (${changeEmoji} ${changeText} vs semana passada)\n\n` +
      `📈 Top Categorias:\n${topCategoriesText}\n\n` +
      `💡 Insight: ${insight}`;
  }

  /**
   * Relatório mensal
   */
  monthlyReport(userName, data) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    const incomeFormatted = Number(data.totalIncome).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const expenseFormatted = Number(data.totalExpense).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const balanceFormatted = Number(data.balance).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const balanceStatus = data.balance >= 0 ? 'Superávit' : 'Déficit';
    const balanceEmoji = data.balance >= 0 ? '✅' : '⚠️';
    
    let topCategoriesText = '';
    if (data.topCategories) {
      const categories = Object.entries(data.topCategories).slice(0, 3);
      topCategoriesText = categories.map(([name, info], index) => 
        `${index + 1}. ${this.getContextEmoji(name)} ${name}: R$ ${Number(info.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${info.percentage}%)`
      ).join('\n');
    }
    
    const recommendations = this.generateMonthlyRecommendations(data);
    
    return `📈 *Relatório Mensal - ${data.monthName}*\n\n` +
      `💰 Entradas: R$ ${incomeFormatted}\n` +
      `💸 Saídas: R$ ${expenseFormatted}\n` +
      `📊 Saldo: R$ ${balanceFormatted} (${balanceEmoji} ${balanceStatus})\n\n` +
      `${topCategoriesText}\n\n` +
      `${recommendations}`;
  }

  /**
   * Insight financeiro
   */
  insightTip(userName, insight) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    
    return `💡 *Insight Financeiro*\n\n` +
      `Oi ${name}! ${insight.text}\n\n` +
      `${insight.action || 'Continue acompanhando seus gastos!'}`;
  }

  /**
   * Lembrete de contas a pagar
   */
  billReminder(userName, bills) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    const count = bills.length;
    const countText = count === 1 ? '1 conta' : `${count} contas`;
    
    let billsList = '';
    bills.forEach((bill, index) => {
      const amount = Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      billsList += `${index + 1}. *${bill.description}* - R$ ${amount}\n`;
    });
    
    return `🔔 *Lembretes de Contas a Pagar*\n\n` +
      `Olá ${name}! Você tem ${countText} vencendo hoje:\n\n` +
      `${billsList}\n` +
      `Acesse: ${process.env.NEXT_PUBLIC_APP_URL || 'https://meuazulao.com.br'}/dashboard/bills`;
  }

  /**
   * Lembrete de metas de investimento
   */
  investmentReminder(userName, goals) {
    const name = userName ? userName.split(' ')[0] : 'aí';
    
    let message = `🎯 *Meta de Investimento*\n\n`;
    
    goals.forEach((goal, index) => {
      const progress = ((Number(goal.current_amount) / Number(goal.target_amount)) * 100).toFixed(1);
      const remaining = Number(goal.target_amount) - Number(goal.current_amount);
      const remainingFormatted = remaining.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
      
      message += `${index + 1}. *${goal.name}*\n`;
      message += `   Progresso: ${progress}% concluída\n`;
      message += `   Valor restante: R$ ${remainingFormatted}\n\n`;
    });
    
    const motivationMessage = this.generateInvestmentMotivation(goals);
    message += `${motivationMessage}`;
    
    return message;
  }

  // ============================================================================
  // MÉTODOS AUXILIARES PARA INSIGHTS
  // ============================================================================

  /**
   * Gerar insight semanal
   */
  generateWeeklyInsight(comparison, topCategory) {
    if (!comparison) return 'Continue acompanhando seus gastos!';
    
    if (comparison.percentChange > 20) {
      return 'Seus gastos aumentaram significativamente esta semana. Que tal revisar suas despesas?';
    } else if (comparison.percentChange < -20) {
      return 'Parabéns! Você economizou bastante esta semana. Continue assim!';
    } else if (topCategory && topCategory.length > 0) {
      const top = topCategory[0];
      return `Sua maior categoria de gasto foi ${top.name} (${top.percentage}%). Considere otimizar se necessário.`;
    }
    
    return 'Seus gastos estão estáveis. Continue acompanhando!';
  }

  /**
   * Gerar recomendações mensais
   */
  generateMonthlyRecommendations(data) {
    let recommendations = '💡 *Recomendações:*\n\n';
    
    if (data.balance < 0) {
      recommendations += '⚠️ Você teve déficit este mês. Considere reduzir gastos ou aumentar receitas.\n\n';
    } else if (data.balance > 0) {
      recommendations += '✅ Excelente! Você teve superávit. Que tal investir o excedente?\n\n';
    }
    
    if (data.budgetPerformance) {
      const overBudget = Object.entries(data.budgetPerformance).filter(([_, info]) => info.status === 'over');
      if (overBudget.length > 0) {
        recommendations += `📊 Categorias que ultrapassaram o orçamento: ${overBudget.map(([name, _]) => name).join(', ')}\n\n`;
      }
    }
    
    recommendations += 'Continue acompanhando seus gastos para melhorar sua saúde financeira!';
    
    return recommendations;
  }

  /**
   * Gerar motivação para investimentos
   */
  generateInvestmentMotivation(goals) {
    const totalProgress = goals.reduce((sum, goal) => {
      return sum + (Number(goal.current_amount) / Number(goal.target_amount)) * 100;
    }, 0) / goals.length;
    
    if (totalProgress >= 90) {
      return '🎉 Você está quase lá! Continue com os aportes!';
    } else if (totalProgress >= 50) {
      return '💪 Metade do caminho percorrido! Mantenha o foco!';
    } else if (totalProgress >= 25) {
      return '🚀 Bom começo! Cada aporte conta!';
    } else {
      return '🌟 Começar é o mais difícil, mas você já deu o primeiro passo!';
    }
  }
}

export default ZulMessages;

