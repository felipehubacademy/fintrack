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
          `Opa! R$ ${valor} de ${description} ${emoji}\n\nComo você pagou?`,
          `Beleza! Anotei R$ ${valor} em ${description} aqui ${emoji}\n\nQual foi a forma de pagamento?`,
          `Entendi! R$ ${valor} em ${description} ${emoji}\n\nMe diz como pagou?`
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
        `Perfeito! E quem foi o responsável por essa?`,
        `Certo! Agora me diz quem foi o responsável?`,
        `Beleza! Só me fala quem pagou?`
      ];
      return this.pickRandom(variations);
    }
    
    const variations = [
      `E quem foi o responsável por essa?`,
      `Quem é o responsável?`,
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
}

export default ZulMessages;

