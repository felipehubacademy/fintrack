// Definições dos tours da aplicação
import { LayoutDashboard, BarChart3, Zap, TrendingUp, Calendar } from 'lucide-react';

// Esta função retorna os steps do dashboard tour com personalização
export function getDashboardTourSteps(userName) {
  const firstName = userName?.split(' ')[0] || '';
  const greeting = firstName ? `Olá, ${firstName}! 👋` : 'Bem-vindo ao MeuAzulão! 👋';
  
  return [
    {
      icon: LayoutDashboard,
      title: greeting,
      description: `Este é o seu painel principal! Aqui você terá uma visão completa das suas finanças assim que começar a registrar suas transações.`,
      tip: 'Complete este tour para conhecer todas as funcionalidades do seu painel!',
      target: 'body' // Visão geral
    },
    {
      icon: BarChart3,
      title: 'Cards de Resumo',
      description: 'Aqui aparecerão os números essenciais: Total de Entradas, Total de Despesas e Saldo do Mês. Por enquanto estão zerados, mas assim que você registrar transações, eles serão atualizados automaticamente.',
      tip: 'Comece registrando suas despesas e receitas na seção "Transações"!',
      target: 'stats-cards' // Cards de estatísticas
    },
    {
      icon: Zap,
      title: 'Como Começar',
      description: 'Para começar a usar o MeuAzulão, vá até "Transações" no menu lateral e registre suas despesas e receitas. Você também pode cadastrar seus cartões de crédito e contas bancárias para ter controle total.',
      tip: 'Comece registrando as transações do mês atual para ver os dados aparecerem aqui!',
      target: 'quick-actions' // Ações rápidas ou menu lateral
    },
    {
      icon: TrendingUp,
      title: 'Análises Visuais',
      description: 'Conforme você registra transações, gráficos e análises visuais aparecerão aqui automaticamente. Eles ajudam a entender seus padrões de gastos e identificar oportunidades de economia.',
      tip: 'Quanto mais transações você registrar, mais insights úteis aparecerão!',
      target: 'monthly-analysis-header' // Seção de gráficos
    },
    {
      icon: Calendar,
      title: 'Próximos Passos',
      description: 'Agora que você conhece o dashboard, comece registrando suas transações! Vá até a seção "Transações" no menu lateral e adicione suas despesas e receitas. À medida que você usar a aplicação, mais funcionalidades e análises ficarão disponíveis.',
      tip: 'Dica: Registre suas despesas diariamente para ter controle total das suas finanças!',
      target: 'body' // Visão geral final
    }
  ];
}

export const transactionsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Transações 💰',
    description: 'Aqui você registra TODAS as suas despesas: dinheiro, PIX, débito, crédito à vista ou parcelado.',
    tip: 'Registre tudo para ter controle total do seu dinheiro!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Nova Despesa ➕',
    description: 'Clique em "Nova Despesa" no canto superior direito. Escolha valor, categoria, forma de pagamento e responsável.',
    tip: 'Despesas no crédito podem ser parceladas automaticamente!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Resumo em Cards 📊',
    description: 'Os cards no topo mostram: Total de Despesas, Gastos em Crédito e Gastos em Dinheiro do mês.',
    tip: 'Clique nos cards para ver detalhes por responsável!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Tabela Completa 📋',
    description: 'A tabela mostra TODAS as despesas: data, descrição, categoria, valor, forma de pagamento e responsável. Clique em qualquer linha para editar ou excluir!',
    tip: 'Use os filtros acima da tabela para buscar despesas específicas!'
  }
];

export const cardsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Cartões 💳',
    description: 'Gerencie seus cartões de crédito: acompanhe gastos, limites, datas de fechamento e vencimento de faturas.',
    tip: 'Cadastre TODOS os seus cartões para ter controle total!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Novo Cartão ➕',
    description: 'Clique em "Novo Cartão" para adicionar. Informe: nome do cartão, limite, dia de fechamento e dia de vencimento.',
    tip: 'O sistema usa as datas para calcular qual fatura a compra vai cair!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Resumo Geral 📊',
    description: 'Os cards no topo mostram: Total Gasto no mês, Limite Total Disponível e Próximas Faturas.',
    tip: 'Monitore o limite disponível para não estourar!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Lista de Cartões 💰',
    description: 'Todos os seus cartões aparecem em cards individuais mostrando: nome, limite usado, limite total e ações rápidas (editar, ver fatura).',
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
    totalSteps: 4,
    target: 'body',
    title: 'Orçamentos 🎯',
    description: 'Defina metas de gastos organizadas em 3 macrocategorias (Necessidades, Desejos, Investimentos) com suas categorias específicas. Acompanhe em tempo real quanto gastou vs. quanto planejou!',
    tip: 'Orçamentos te ajudam a ter disciplina financeira e priorizar o que realmente importa!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Criar Orçamento Guiado 📝',
    description: 'Clique em "Criar Orçamento" para iniciar o processo guiado. Você definirá valores para cada macrocategoria e depois distribuirá entre as categorias específicas (ex: Necessidades → Alimentação, Moradia, Transporte).',
    tip: 'O processo guiado facilita a criação de um orçamento completo e equilibrado!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Estrutura em Macros 🏗️',
    description: 'Seus orçamentos são organizados em 3 grupos: Necessidades (alimentação, transporte, saúde, moradia), Desejos (lazer, educação, viagens), Investimentos (poupança e aplicações). Cada macro agrupa categorias relacionadas.',
    tip: 'Essa organização te ajuda a entender para onde seu dinheiro está indo!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Acompanhamento Visual 📊',
    description: 'Cada categoria aparece com barra de progresso: verde (dentro do limite), amarelo (próximo do limite), vermelho (estourou!). Veja também o progresso de cada macro e do orçamento total.',
    tip: 'O sistema alerta automaticamente quando você se aproxima do limite de qualquer categoria!'
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
    totalSteps: 4,
    target: 'body',
    title: 'Fechamento do Mês 📊',
    description: 'Análise COMPLETA do mês: veja aportes necessários, total de saídas, faturas de cartão e saldo final. Planeje quanto cada responsável precisa contribuir para quitar o mês!',
    tip: 'Use esta página para calcular quanto cada um deve aportar no início do mês!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Cards de Resumo 💰',
    description: 'Os 4 cards principais mostram: Total de Aportes Necessários (quanto precisa entrar), Total de Saídas (despesas + contas), Faturas de Cartão (a pagar) e Saldo Final (sobrou ou faltou?).',
    tip: 'O card de Aportes mostra quanto cada responsável precisa contribuir!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Detalhamento por Responsável 👥',
    description: 'Veja cards individuais de cada responsável mostrando: despesas pessoais, despesas compartilhadas (splits), total gasto e quanto deve aportar para cobrir suas despesas.',
    tip: 'Isso facilita a divisão justa das despesas entre os responsáveis!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Consolidado e Histórico 📈',
    description: 'Abaixo dos cards, veja o consolidado detalhado do mês com todas as despesas, faturas e contas. Compare com meses anteriores através do gráfico de evolução anual.',
    tip: 'Use o histórico para identificar padrões e planejar os próximos meses!'
  }
];

export const insightsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Insights Financeiros 📊',
    description: 'Análise inteligente das suas finanças! Veja tendências, padrões de gastos, score de saúde financeira e receba insights automáticos para melhorar seu planejamento.',
    tip: 'O sistema analisa automaticamente seus dados e gera recomendações personalizadas!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Visão Geral do Mês 💰',
    description: 'Cards mostram: Gasto Total, % do Orçamento Usado, Dias Restantes e Projeção de Gastos. Veja se está no caminho certo ou precisa ajustar!',
    tip: 'A projeção usa seu ritmo atual para estimar quanto vai gastar até o fim do mês!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Tendências e Padrões 📈',
    description: 'Gráficos mostram evolução dos últimos 6 meses por macro categoria (Necessidades, Desejos, Investimentos). Identifique padrões sazonais e oportunidades de economia!',
    tip: 'Compare meses para ver se está melhorando ou piorando em cada categoria!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Score de Saúde Financeira 💎',
    description: 'Pontuação de 0-100 que avalia 5 fatores: cumprimento de orçamento, consistência de investimentos, reserva de emergência, diversidade de renda e redução de dívidas.',
    tip: 'Trabalhe para melhorar seu score mês a mês. Meta: acima de 80 pontos!'
  }
];

export const goalsTourSteps = [
  {
    stepNumber: 1,
    totalSteps: 4,
    target: 'body',
    title: 'Metas Financeiras 🎯',
    description: 'Defina e acompanhe suas metas: reserva de emergência, quitação de dívidas, compras planejadas, investimentos. Veja progresso, projeções e receba dicas para atingir mais rápido!',
    tip: 'Ter metas claras aumenta em 80% a chance de sucesso financeiro!'
  },
  {
    stepNumber: 2,
    totalSteps: 4,
    target: 'body',
    title: 'Criar Meta ➕',
    description: 'Clique em "Nova Meta" para criar. Escolha o tipo (emergência, dívida, compra, etc), defina valor alvo, prazo desejado e quanto pode contribuir por mês.',
    tip: 'O sistema calcula automaticamente quando você vai atingir a meta!'
  },
  {
    stepNumber: 3,
    totalSteps: 4,
    target: 'body',
    title: 'Acompanhamento Visual 📊',
    description: 'Cada meta aparece em um card com: progress bar circular, valor atual vs. alvo, projeção de atingimento e botão para adicionar contribuições.',
    tip: 'Progress bars mudam de cor: verde (no caminho), amarelo (atrasado), azul (atingido)!'
  },
  {
    stepNumber: 4,
    totalSteps: 4,
    target: 'body',
    title: 'Gamificação e Badges 🏆',
    description: 'Ganhe badges ao atingir marcos: primeira meta, 50% de progresso, meta em tempo recorde! Veja seu streak de meses consecutivos economizando.',
    tip: 'Badges motivam você a manter a disciplina financeira!'
  }
];

// Função para obter tour baseado na rota
export function getTourForRoute(route, userName = null) {
  // Normalizar a rota - remover parâmetros dinâmicos se houver
  let normalizedRoute = route;
  
  // Se for uma URL dinâmica (/org/{id}/user/{id}/dashboard), extrair apenas a parte relevante
  const dynamicRouteMatch = route.match(/\/org\/[^/]+\/user\/[^/]+\/(.+)/);
  if (dynamicRouteMatch) {
    normalizedRoute = '/' + dynamicRouteMatch[1];
  }
  
  switch (normalizedRoute) {
    case '/dashboard':
      return getDashboardTourSteps(userName);
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
    case '/dashboard/insights':
      return insightsTourSteps;
    case '/dashboard/goals':
      return goalsTourSteps;
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
