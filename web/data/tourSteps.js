// Definições dos tours da aplicação

export const dashboardTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 5,
    target: 'body', // Primeiro passo sem highlight específico
    title: 'Bem-vindo ao MeuAzulão! 👋',
    description: 'Prazer, eu sou o Zul e vou te guiar pelos principais recursos da aplicação.\n\nEste é o seu painel principal onde você tem uma visão completa das suas finanças.',
    tip: 'Dica: Você pode sempre clicar no meu ícone (canto inferior direito) para obter ajuda personalizada!'
  },
  {
    stepNumber: 2,
    totalSteps: 5,
    target: 'stats-cards', // Seletor especial para todos os cards
    title: 'StatsCards 📊',
    description: 'Aqui estão os números essenciais: Total de Entradas, Total de Despesas e Saldo do Mês. Eu te ajudo a acompanhar sua situação financeira em tempo real.',
    tip: 'Estes valores são atualizados automaticamente conforme você adiciona transações!'
  },
  {
    stepNumber: 3,
    totalSteps: 5,
    target: 'quick-actions', // Seletor especial para ações rápidas
    title: 'Ações Rápidas ⚡',
    description: 'Aqui você tem acesso rápido às principais funcionalidades: Adicionar Transação, Ver Transações, Gerenciar Cartões e Orçamentos. Eu te ajudo a navegar por tudo!',
    tip: 'Use estas ações rápidas para acessar as funcionalidades mais usadas!'
  },
  {
    stepNumber: 4,
    totalSteps: 5,
    target: 'monthly-analysis-header', // Header da análise mensal
    title: 'Análise do Mês 📈',
    description: 'Aqui você vê gráficos detalhados das suas finanças do mês atual. Eu te ajudo a entender seus padrões de gastos e identificar oportunidades de economia.',
    tip: 'Use os gráficos para identificar padrões e oportunidades de economia!'
  },
  {
    stepNumber: 5,
    totalSteps: 5,
    target: 'comparative-analysis-header', // Header do comparativo mensal
    title: 'Comparativo Mensal 📊',
    description: 'Aqui você compara seus gastos entre diferentes meses para ver sua evolução financeira ao longo do tempo.',
    tip: 'Compare meses para identificar tendências e melhorias!'
  }
];

export const transactionsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Transações 💰',
    description: 'Aqui você registra TODAS as suas despesas e receitas: dinheiro, PIX, débito, crédito à vista ou parcelado.',
    tip: 'Registre tudo para ter controle total do seu dinheiro!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Nova Transação ➕',
    description: 'Clique em "Nova Transação" no canto superior direito. Escolha tipo (despesa/receita), valor, categoria, forma de pagamento e responsável.',
    tip: 'Transações no crédito podem ser parceladas automaticamente!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Resumo em Cards 📊',
    description: 'Os cards no topo mostram: Total de Entradas, Total de Despesas, Gastos em Crédito e Comparativo com mês anterior.',
    tip: 'Clique nos cards para ver detalhes por responsável (mãe, pai, etc)!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Tabela Completa 📋',
    description: 'A tabela mostra TODAS as transações: data, descrição, categoria, valor, forma de pagamento e responsável. Clique em qualquer linha para editar ou excluir!',
    tip: 'Use os filtros acima da tabela para buscar transações específicas!'
  }
];

export const cardsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Cartões 💳',
    description: 'Gerencie seus cartões de crédito e débito: acompanhe gastos, limites, datas de fechamento e vencimento de faturas.',
    tip: 'Cadastre TODOS os seus cartões para ter controle total!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Novo Cartão ➕',
    description: 'Clique em "Novo Cartão" para adicionar. Informe: nome do cartão, bandeira (Visa, Master, etc), limite, dia de fechamento e dia de vencimento.',
    tip: 'O sistema usa as datas para calcular qual fatura a compra vai cair!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Resumo Geral 📊',
    description: 'Os cards no topo mostram: Total Gasto no mês, Limite Total Disponível, Próximas Faturas e Comparativo com mês anterior.',
    tip: 'Monitore o limite disponível para não estourar!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Lista de Cartões 💰',
    description: 'Todos os seus cartões aparecem em cards individuais mostrando: nome, bandeira, limite usado, limite total e ações rápidas (editar, ver fatura).',
    tip: 'Clique em "Ver Fatura" para detalhar as compras de cada cartão!'
  }
];

export const bankAccountsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Contas Bancárias 🏦',
    description: 'Cadastre e acompanhe TODAS as suas contas bancárias: corrente, poupança, investimentos. Veja saldo atual e histórico de movimentações.',
    tip: 'Mantenha saldos atualizados para ter controle real do seu dinheiro!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Nova Conta ➕',
    description: 'Clique em "Nova Conta" para adicionar. Informe: banco, tipo de conta (corrente, poupança, etc), número da conta e saldo inicial.',
    tip: 'O saldo inicial é importante para calcular corretamente as movimentações!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Resumo Financeiro 💰',
    description: 'Os cards mostram: Saldo Total de todas as contas, Total Positivo (contas com dinheiro) e Total Negativo (contas no cheque especial).',
    tip: 'Monitore o saldo total para saber quanto realmente tem disponível!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Lista de Contas 📋',
    description: 'Cada conta aparece em um card mostrando: banco, tipo, número, saldo atual e botões para adicionar movimentação (depósito/saque) ou editar.',
    tip: 'Registre depósitos, saques e transferências para manter tudo sincronizado!'
  }
];

export const billsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Contas a Pagar 📝',
    description: 'Cadastre e acompanhe contas fixas: água, luz, internet, aluguel, escola, plano de saúde. Nunca mais esqueça uma conta!',
    tip: 'Marque contas como recorrentes para gerar automaticamente todo mês!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Nova Conta ➕',
    description: 'Clique em "Nova Conta" para cadastrar. Informe: descrição, valor, vencimento, categoria e se é recorrente (mensal).',
    tip: 'Contas recorrentes são criadas automaticamente todo mês!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Status das Contas ⏰',
    description: 'Os cards mostram: Total de Contas Pendentes, Contas Vencidas (urgente!), Valor Total a Pagar e Próximos Vencimentos.',
    tip: 'Priorize sempre as contas vencidas para evitar juros!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Lista de Contas 📅',
    description: 'Todas as contas aparecem organizadas por status: Pendentes (não vencidas), Vencidas (atrasadas) e Pagas. Clique em qualquer uma para editar, pagar ou excluir.',
    tip: 'Ao marcar como paga, a transação é registrada automaticamente!'
  }
];

export const budgetsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 3,
    target: 'body',
    title: 'Orçamentos 🎯',
    description: 'Defina metas de gastos por categoria e acompanhe em tempo real quanto já gastou vs. quanto planejou. Evite estourar o orçamento!',
    tip: 'Orçamentos te ajudam a ter disciplina financeira!'
  },
  {
    stepNumber: 2,
    totalSteps: 3,
    target: 'body',
    title: 'Criar Orçamento ➕',
    description: 'Clique em "Criar Orçamento" para definir. Escolha a categoria (alimentação, transporte, lazer, etc) e o valor máximo mensal.',
    tip: 'Analise seus gastos dos últimos meses para definir valores realistas!'
  },
  {
    stepNumber: 3,
    totalSteps: 3,
    target: 'body',
    title: 'Acompanhamento Visual 📊',
    description: 'Cada orçamento aparece em um card com barra de progresso: verde (dentro do limite), amarelo (próximo do limite), vermelho (estourou!).',
    tip: 'O sistema alerta automaticamente quando você se aproxima do limite!'
  }
];

export const investmentsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 3,
    target: 'body',
    title: 'Investimentos 📈',
    description: 'Registre e acompanhe TODOS os seus investimentos: ações, fundos, tesouro direto, renda fixa, CDBs, criptomoedas. Veja valor investido, valor atual e rentabilidade!',
    tip: 'Centralizar tudo aqui te dá visão completa do seu patrimônio!'
  },
  {
    stepNumber: 2,
    totalSteps: 3,
    target: 'body',
    title: 'Novo Investimento ➕',
    description: 'Clique em "Novo Investimento" para adicionar. Informe: tipo (ações, tesouro, etc), nome/código, valor investido, data e corretora/banco.',
    tip: 'Registre CADA aporte separadamente para calcular rentabilidade correta!'
  },
  {
    stepNumber: 3,
    totalSteps: 3,
    target: 'body',
    title: 'Resumo e Evolução 💎',
    description: 'Veja cards com: Total Investido, Valor Atual (se atualizado), Rentabilidade Total e Evolução Mensal. A lista mostra cada investimento com detalhes.',
    tip: 'Atualize valores periodicamente para acompanhar a rentabilidade real!'
  }
];

export const closingTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 3,
    target: 'body',
    title: 'Fechamento do Mês 📊',
    description: 'Análise COMPLETA do mês: veja quanto entrou, quanto saiu, onde gastou mais e compare com meses anteriores. Entenda para onde seu dinheiro está indo!',
    tip: 'Revise todo mês para ajustar seus hábitos financeiros!'
  },
  {
    stepNumber: 2,
    totalSteps: 3,
    target: 'body',
    title: 'Resumo Geral 💰',
    description: 'Cards mostram: Total de Receitas, Total de Despesas, Saldo Final (sobrou ou faltou?) e Taxa de Economia. Veja se seu mês foi positivo ou negativo!',
    tip: 'Meta ideal: economizar pelo menos 10-20% das receitas!'
  },
  {
    stepNumber: 3,
    totalSteps: 3,
    target: 'body',
    title: 'Gráficos e Análises 📈',
    description: 'Gráficos mostram: Gastos por Categoria (onde gastou mais?), Evolução Mensal (últimos 6 meses), Despesas por Responsável e Top 5 Maiores Gastos.',
    tip: 'Use os insights para cortar gastos desnecessários no próximo mês!'
  }
];

// Função para obter tour baseado na rota
export function getTourForRoute(route) {
  // Normalizar a rota - remover parâmetros dinâmicos se houver
  let normalizedRoute = route;
  
  // Se for uma URL dinâmica (/org/{id}/user/{id}/dashboard), extrair apenas a parte relevante
  const dynamicRouteMatch = route.match(/\/org\/[^/]+\/user\/[^/]+\/(.+)/);
  if (dynamicRouteMatch) {
    normalizedRoute = '/' + dynamicRouteMatch[1];
  }
  
  switch (normalizedRoute) {
    case '/dashboard':
      return dashboardTourSteps;
    case '/dashboard/transactions':
      return transactionsTourSteps;
    case '/dashboard/cards':
      return cardsTourSteps;
    case '/dashboard/bank-accounts':
      return bankAccountsTourSteps;
    case '/dashboard/bills':
      return billsTourSteps;
    case '/dashboard/budgets':
      return budgetsTourSteps;
    case '/dashboard/investments':
      return investmentsTourSteps;
    case '/dashboard/closing':
      return closingTourSteps;
    default:
      return [];
  }
}

// Função helper para extrair o tipo de tour da rota (usado no useTour)
export function getTourTypeFromRoute(route) {
  let normalizedRoute = route;
  
  const dynamicRouteMatch = route.match(/\/org\/[^/]+\/user\/[^/]+\/(.+)/);
  if (dynamicRouteMatch) {
    normalizedRoute = '/' + dynamicRouteMatch[1];
  }
  
  // Extrair apenas a última parte para o tipo do tour
  // /dashboard -> 'dashboard'
  // /dashboard/transactions -> 'transactions'
  const parts = normalizedRoute.split('/').filter(Boolean);
  return parts[parts.length - 1] || 'dashboard';
}
