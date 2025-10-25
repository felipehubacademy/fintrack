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
    target: '[data-testid="add-transaction-btn"], button[class*="add"]',
    title: 'Adicionar Transação ➕',
    description: 'Clique aqui para registrar uma nova despesa ou receita. O processo é rápido e intuitivo!',
    tip: 'Você pode categorizar automaticamente suas transações!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: '[data-testid="filters"], .filter, input[type="search"], input[placeholder*="buscar"]',
    title: 'Filtros e Busca 🔍',
    description: 'Use os filtros para encontrar transações específicas por data, categoria, valor ou descrição.',
    tip: 'Combine múltiplos filtros para buscas mais precisas!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: '[data-testid="transactions-list"], table, .transaction-list, .list',
    title: 'Lista de Transações 📋',
    description: 'Todas as suas transações aparecem aqui. Clique em qualquer uma para editá-la ou ver detalhes.',
    tip: 'Use o WhatsApp para adicionar transações rapidamente via mensagem!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: '[data-testid="bulk-actions"], .bulk-actions, button[class*="bulk"]',
    title: 'Ações em Lote ⚙️',
    description: 'Selecione múltiplas transações para realizar ações em lote, como categorizar ou exportar.',
    tip: 'Economize tempo gerenciando várias transações de uma vez!'
  }
];

export const cardsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 3,
    target: '[data-testid="add-card-btn"], button[class*="add"]',
    title: 'Gerenciar Cartões 💳',
    description: 'Adicione seus cartões de crédito e débito para ter controle total sobre seus gastos e limites.',
    tip: 'Configure alertas para não passar do limite!'
  },
  {
    stepNumber: 2,
    totalSteps: 3,
    target: '[data-testid="card-limits"], .card-limits, .limits, .usage',
    title: 'Controle de Limites 📊',
    description: 'Acompanhe o uso dos seus cartões em tempo real e receba alertas quando se aproximar do limite.',
    tip: 'Os alertas te ajudam a manter o controle financeiro!'
  },
  {
    stepNumber: 3,
    totalSteps: 3,
    target: '[data-testid="card-analytics"], .analytics, .charts, .reports',
    title: 'Análises Detalhadas 📈',
    description: 'Veja gráficos e relatórios sobre seus gastos por cartão, categoria e período.',
    tip: 'Use os dados para tomar decisões financeiras mais inteligentes!'
  }
];

// Função para obter tour baseado na rota
export function getTourForRoute(route) {
  switch (route) {
    case '/dashboard':
      return dashboardTourSteps;
    case '/dashboard/transactions':
      return transactionsTourSteps;
    case '/dashboard/cards':
      return cardsTourSteps;
    default:
      return [];
  }
}
