import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import MonthCharts from '../../components/MonthCharts';
import IncomeCharts from '../../components/IncomeCharts';
import MonthlyComparison from '../../components/MonthlyComparison';
import NotificationModal from '../../components/NotificationModal';
import LoadingLogo from '../../components/LoadingLogo';
import { useOrganization } from '../../hooks/useOrganization';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { 
  LogOut, 
  Settings, 
  Bell, 
  Search,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  RefreshCw,
  CreditCard,
  Wallet,
  HelpCircle,
  ArrowDownCircle,
  ArrowUpCircle,
  DollarSign
} from 'lucide-react';
import Header from '../../components/Header';

export default function DashboardHome() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, budgetCategories, incomeCategories, loading: orgLoading, error: orgError, isSoloUser } = useOrganization();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  // Raw expenses for the selected month (used by MonthCharts)
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [monthIncomes, setMonthIncomes] = useState([]);
  const [cardExpenses, setCardExpenses] = useState([]);
  const [cashExpenses, setCashExpenses] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);
  const [previousMonthData, setPreviousMonthData] = useState({
    cardExpenses: 0,
    cashExpenses: 0,
    totalExpenses: 0
  });
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [cards, setCards] = useState([]);
  const [cardsUsage, setCardsUsage] = useState({});
  const [bankAccounts, setBankAccounts] = useState([]);
  const [openTooltip, setOpenTooltip] = useState(null);

  // Helper para toggle de tooltip - sempre fecha o anterior ao abrir um novo
  const handleTooltipToggle = (tooltipId) => {
    if (openTooltip === tooltipId) {
      // Se clicar no mesmo, fecha
      setOpenTooltip(null);
    } else {
      // Se clicar em outro, abre o novo (fecha automaticamente o anterior)
      setOpenTooltip(tooltipId);
    }
  };

  // Fechar tooltip ao clicar fora em mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Não fechar se clicou no card ou no tooltip
      if (openTooltip && 
          !event.target.closest('.relative.group') && 
          !event.target.closest('[class*="absolute z-50"]')) {
        setOpenTooltip(null);
      }
    };
    
    if (openTooltip) {
      // Usar um pequeno delay para evitar conflito com o onClick do card
      const timeoutId = setTimeout(() => {
        document.addEventListener('click', handleClickOutside, true);
      }, 100);
      
      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('click', handleClickOutside, true);
      };
    }
  }, [openTooltip]);


  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      checkOnboardingStatus();
      fetchAllExpenses();
      fetchAllIncomes();
      fetchCards();
      fetchBankAccounts();
    } else if (!orgLoading && orgError) {
      console.log('❌ [Dashboard] Organization error, redirecting to login');
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);

  const checkOnboardingStatus = async () => {
    if (!organization || !orgUser) {
      return;
    }


    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', orgUser.id)
        .eq('organization_id', organization.id)
        .single();


      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar onboarding:', error);
        return;
      }

      // If no onboarding record exists or it's not completed, redirect to onboarding
      // MAS não redirecionar se foi pulado (skipped)
      if ((!data || !data.is_completed) && !data?.skipped) {
        router.push('/onboarding/welcome');
        return;
      }
      
      // Se foi pulado, deixar usar o dashboard normalmente
      if (data?.skipped) {
        return;
      }

    } catch (error) {
      console.error('❌ Erro ao verificar status do onboarding:', error);
    }
  };

  // Realtime subscriptions: expenses, cost_centers, budget_categories
  useEffect(() => {
    if (!organization) return;

    const orgFilter = organization.id && organization.id !== 'default-org'
      ? `organization_id=eq.${organization.id}`
      : undefined;

    const channels = [];

    const subscribe = (table, handler) => {
      const channel = supabase
        .channel(`rt-${table}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table, filter: orgFilter },
          handler
        )
        .subscribe();
      channels.push(channel);
    };

    subscribe('expenses', () => {
      fetchAllExpenses();
    });

    subscribe('cost_centers', () => {
      // refetch monthly as owner split may change totals
      fetchAllExpenses();
    });

    subscribe('budget_categories', () => {
      fetchAllExpenses();
    });

    return () => {
      channels.forEach((ch) => {
        try { supabase.removeChannel(ch); } catch (_) {}
      });
    };
  }, [organization, selectedMonth]);

  const fetchAllExpenses = async () => {
    if (!organization) return;
    
    setIsDataLoaded(false);
    
    try {
      // Buscar todas as despesas confirmadas do mês da organização
      const startOfMonth = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

      // Buscar despesas (compatível V1/V2) com expense_splits
      let query = supabase
        .from('expenses')
        .select(`
          *,
          expense_splits (
            id,
            cost_center_id,
            percentage,
            amount
          )
        `)
        // status: apenas confirmed (alinhado com transactions e closing)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonthStr)
        .order('date', { ascending: false });

      // Adicionar filtro V2 se organização tem ID real (não mock)
      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching expenses:', error);
        throw error;
      }

      let expensesData = data || [];

      // REMOVIDO: Fallback perigoso que causava vazamento de dados entre organizações

      // Se não houver expenses, deixar vazio (não buscar de outras organizações!)
      if (expensesData.length === 0) {
      }

      // Dados sem filtro de privacidade (tudo visível)
      setMonthExpenses(expensesData);

      // Separar cartão e a vista
      const card = (expensesData || []).filter(e => e.payment_method === 'credit_card');
      const cash = (expensesData || []).filter(e => 
        e.payment_method === 'cash' || 
        e.payment_method === 'debit_card' || 
        e.payment_method === 'pix' || 
        e.payment_method === 'bank_transfer' || 
        e.payment_method === 'boleto' || 
        e.payment_method === 'other'
      );

      setCardExpenses(card);
      setCashExpenses(cash);
      
      // Buscar dados dos últimos 6 meses para comparação
      await fetchMonthlyData();
      
      // Marcar dados como carregados
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setIsDataLoaded(true);
    }
  };

  const fetchAllIncomes = async () => {
    if (!organization) return;
    
    try {
      const startOfMonth = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

      let query = supabase
        .from('incomes')
        .select(`
          *,
          cost_center:cost_centers(name, color),
          income_splits(
            id,
            cost_center_id,
            cost_center:cost_centers(name, color),
            percentage,
            amount
          )
        `)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonthStr)
        .order('date', { ascending: false });

      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching incomes:', error);
        throw error;
      }

      // Dados sem filtro de privacidade (tudo visível)
      setMonthIncomes(data || []);
    } catch (error) {
      console.error('Error fetching incomes:', error);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllExpenses();
      await fetchAllIncomes();
      await fetchMonthlyData();
      await fetchCards();
      await fetchBankAccounts();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchCards = async () => {
    if (!organization) return;
    
    try {
      let query = supabase
        .from('cards')
        .select('*')
        .eq('is_active', true)
        .eq('type', 'credit')
        .order('created_at', { ascending: false });

      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // FORÇAR recálculo do available_limit de todos os cartões de crédito
      if (data && data.length) {
        await Promise.all(
          data.map(async (card) => {
            const { data: newLimit } = await supabase
              .rpc('calculate_card_available_limit_v2', { p_card_id: card.id });
            
            if (newLimit !== null) {
              await supabase
                .from('cards')
                .update({ available_limit: newLimit })
                .eq('id', card.id);
              
              // Atualizar o card localmente
              card.available_limit = newLimit;
            }
          })
        );
      }

      setCards(data || []);
      
      // Calcular uso de cada cartão
      if (data && data.length) {
        await calculateCardsUsage(data);
      } else {
        setCardsUsage({});
      }
    } catch (error) {
      console.error('Error fetching cards:', error);
    }
  };

  const calculateCardsUsage = async (cardsList) => {
    const today = new Date();
    const refDate = today.toISOString().split('T')[0];

    const entries = await Promise.all(
      cardsList.map(async (card) => {
        // Obter ciclo de faturamento
        let startDate, endDate;
        try {
          const { data: cycle } = await supabase.rpc('get_billing_cycle', {
            card_uuid: card.id,
            reference_date: refDate
          });
          if (cycle && cycle.length) {
            startDate = cycle[0].start_date;
            endDate = cycle[0].end_date;
          }
        } catch {}
        
        if (!startDate || !endDate) {
          const y = today.getFullYear();
          const m = today.getMonth();
          const start = new Date(y, m, 1);
          const end = new Date(y, m + 1, 0);
          startDate = start.toISOString().split('T')[0];
          endDate = end.toISOString().split('T')[0];
        }

        const limit = Number(card.credit_limit || 0);
        const availableLimit = Number(card.available_limit || limit);
        
        // Calcular limite usado baseado no available_limit do banco (já considera faturas pagas)
        const used = Math.max(0, limit - availableLimit);
        
        return [card.id, { used, limit }];
      })
    );

    setCardsUsage(Object.fromEntries(entries));
  };

  const fetchBankAccounts = async () => {
    if (!organization) return;
    
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const months = [];
      const currentDate = new Date();
      
      // Gerar últimos 12 meses
      for (let i = 11; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        
        const startOfMonth = `${monthStr}-01`;
        const endExclusive = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        const endExclusiveStr = endExclusive.toISOString().split('T')[0];

        // Buscar dados mensais de despesas (compatível V1/V2)
        let monthlyQuery = supabase
          .from('expenses')
          .select('*')
          .or('status.eq.confirmed,status.eq.paid,status.is.null')
          .gte('date', startOfMonth)
          .lt('date', endExclusiveStr);

        // Adicionar filtro V2 se organização tem ID real
        if (organization?.id && organization.id !== 'default-org') {
          monthlyQuery = monthlyQuery.eq('organization_id', organization.id);
        }

        let { data, error } = await monthlyQuery;

        // Buscar dados mensais de entradas
        let incomeQuery = supabase
          .from('incomes')
          .select('*')
          .eq('status', 'confirmed')
          .gte('date', startOfMonth)
          .lt('date', endExclusiveStr);

        if (organization?.id && organization.id !== 'default-org') {
          incomeQuery = incomeQuery.eq('organization_id', organization.id);
        }

        const { data: incomeData, error: incomeError } = await incomeQuery;

        // REMOVIDO: Fallbacks perigosos que causavam vazamento de dados entre organizações
        if (error) {
          console.error('Error fetching monthly data:', error);
        }

        if (!error && data) {
          // Filtrar apenas despesas confirmadas
          const confirmedExpenses = data.filter(e => 
            e.status === 'confirmed' || e.status === 'paid' || !e.status
          );
          
          const cardTotal = confirmedExpenses
            .filter(e => e.payment_method === 'credit_card')
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            
          const cashTotal = confirmedExpenses
            .filter(e => 
              e.payment_method === 'cash' || 
              e.payment_method === 'debit_card' || 
              e.payment_method === 'pix' || 
              e.payment_method === 'bank_transfer' || 
              e.payment_method === 'boleto' || 
              e.payment_method === 'other'
            )
            .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

          // Calcular total de entradas
          const confirmedIncomes = (incomeData || []).filter(i => i.status === 'confirmed');
          const incomeTotal = confirmedIncomes.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);

          months.push({
            month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            cartoes: cardTotal,
            despesas: cashTotal,
            entradas: incomeTotal
          });
        }
      }
      
      setMonthlyData(months);
      
      // Calcular dados do mês anterior para comparação
      const previousMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
      const previousMonthStr = previousMonth.toISOString().slice(0, 7);
      
      const previousMonthData = months.find(month => 
        month.month === previousMonth.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
      );
      
      if (previousMonthData) {
        setPreviousMonthData({
          cardExpenses: previousMonthData.cartoes || 0,
          cashExpenses: previousMonthData.despesas || 0,
          totalExpenses: (previousMonthData.cartoes || 0) + (previousMonthData.despesas || 0)
        });
      } else {
        // Se não encontrar dados do mês anterior, usar zeros
        setPreviousMonthData({
          cardExpenses: 0,
          cashExpenses: 0,
          totalExpenses: 0
        });
      }
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  // Removido: useEffect duplicado que causava renderização dupla
  // O fetchAllExpenses já é chamado no useEffect principal (linha 45-50)

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Calcular totais usando centros de custo V2
  const calculateTotals = (expenses) => {
    const totals = {};
    
    // Inicializar totais para cada centro de custo
    costCenters.forEach(center => {
      totals[center.name] = 0;
    });
    
    // Somar despesas por centro de custo
    expenses.forEach(expense => {
      if (expense.owner && totals[expense.owner] !== undefined) {
        totals[expense.owner] += parseFloat(expense.amount);
      }
    });
    
    const total = Object.values(totals).reduce((sum, value) => sum + value, 0);
    
    return { ...totals, total };
  };

  // Calcular totais diretamente de monthExpenses (mesmo usado nos gráficos)
  // Filtrar apenas confirmed (alinhado com transactions e closing)
  const confirmedMonthExpenses = monthExpenses.filter(e => e.status === 'confirmed');
  
  // Debug: identificar despesas sem método de pagamento ou com método desconhecido
  const expensesWithoutMethod = confirmedMonthExpenses.filter(e => {
    const method = e.payment_method;
    return !method || (
      method !== 'credit_card' &&
      method !== 'cash' &&
      method !== 'debit_card' &&
      method !== 'pix' &&
      method !== 'bank_transfer' &&
      method !== 'boleto' &&
      method !== 'other'
    );
  });
  
  if (expensesWithoutMethod.length > 0) {
    // Despesas sem método de pagamento válido encontradas
  }
  
  const cardTotal = confirmedMonthExpenses
    .filter(e => e.payment_method === 'credit_card')
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
  const cashTotal = confirmedMonthExpenses
    .filter(e => 
      e.payment_method === 'cash' || 
      e.payment_method === 'debit_card' || 
      e.payment_method === 'pix' || 
      e.payment_method === 'bank_transfer' || 
      e.payment_method === 'boleto' || 
      e.payment_method === 'other'
    )
    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  // Incluir despesas sem método ou com método desconhecido no total
  const unknownMethodTotal = expensesWithoutMethod.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    
  const grandTotal = cardTotal + cashTotal + unknownMethodTotal;
  
  // Debug: log dos totais
  const totalAllExpensesRaw = confirmedMonthExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  
  // Debug: verificar se há parcelas sendo contadas
  const installmentExpenses = confirmedMonthExpenses.filter(e => 
    e.parent_expense_id || (e.installment_info && e.installment_info.total_installments > 1)
  );

  // Recalcular dados do mês anterior baseado no mês selecionado
  const [previousMonthIncomes, setPreviousMonthIncomes] = useState(0);
  
  useEffect(() => {
    if (monthlyData.length === 0) return;
    
    const [year, month] = selectedMonth.split('-').map(Number);
    const previousDate = new Date(year, month - 2, 1); // month - 2 porque month está 1-indexed
    const previousMonthStr = previousDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
    
    const previousData = monthlyData.find(m => m.month === previousMonthStr);
    
    if (previousData) {
      setPreviousMonthData({
        cardExpenses: previousData.cartoes || 0,
        cashExpenses: previousData.despesas || 0,
        totalExpenses: (previousData.cartoes || 0) + (previousData.despesas || 0)
      });
      setPreviousMonthIncomes(previousData.entradas || 0);
    } else {
      setPreviousMonthData({
        cardExpenses: 0,
        cashExpenses: 0,
        totalExpenses: 0
      });
      setPreviousMonthIncomes(0);
    }
  }, [selectedMonth, monthlyData]);
  
  // Usar despesas brutas do mês diretamente nos gráficos
  const expensesForCharts = monthExpenses || [];

  // Calcular totais de cartões
  const creditCards = cards.filter(c => c.type === 'credit');
  const totalCreditUsed = creditCards.reduce((sum, card) => {
    const usage = cardsUsage[card.id]?.used || 0;
    return sum + usage;
  }, 0);
  
  const totalCreditAvailable = creditCards.reduce((sum, card) => {
    const limit = cardsUsage[card.id]?.limit || card.credit_limit || 0;
    const used = cardsUsage[card.id]?.used || 0;
    return sum + Math.max(0, limit - used);
  }, 0);

  // Calcular total consolidado das contas bancárias
  const totalBankBalance = bankAccounts.reduce((sum, account) => {
    return sum + parseFloat(account.current_balance || 0);
  }, 0);

  // Calcular dados para os cards existentes
  // Filtrar apenas entradas confirmadas (mesmo que a query já filtre, garantimos aqui)
  const confirmedMonthIncomes = monthIncomes.filter(i => i.status === 'confirmed');
  const totalIncomes = confirmedMonthIncomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const balance = totalIncomes - grandTotal;
  
  const calculateGrowth = (current, previous) => {
    if (!current || current === 0) return 0;
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const expensesGrowth = calculateGrowth(grandTotal, previousMonthData?.totalExpenses || 0);
  const incomesGrowth = calculateGrowth(totalIncomes, previousMonthIncomes || 0);
  const previousBalance = (previousMonthIncomes || 0) - (previousMonthData?.totalExpenses || 0);
  const balanceGrowth = calculateGrowth(balance, previousBalance);


  if (orgLoading || !isDataLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {orgError}</div>
          <p className="text-gray-600 mb-4">Você precisa criar uma conta ou ser convidado para uma organização.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <Header 
      organization={organization}
      user={orgUser}
      pageTitle="Painel Principal"
    >
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-4 md:py-8 space-y-4 md:space-y-8">
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Painel Principal</h2>
              <div className="flex items-center space-x-2 sm:space-x-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 hidden sm:block">Mês:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue text-sm"
                  />
                </div>
                <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''} sm:mr-2`} />
                  <span className="hidden sm:inline">{isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}</span>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards - Grid Responsivo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Card 1: Total de Entradas */}
          <div className="relative group">
            <Card 
              className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleTooltipToggle('entradas');
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Entradas
                </CardTitle>
                <div className="p-2 rounded-lg bg-flight-blue/10">
                  <TrendingUp className="h-4 w-4 text-flight-blue" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {Number(totalIncomes).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  {incomesGrowth > 0 && (
                    <>
                      <TrendingUp className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">+{Math.abs(incomesGrowth || 0).toFixed(1)}%</span>
                    </>
                  )}
                  {incomesGrowth < 0 && (
                    <>
                      <TrendingDown className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">-{Math.abs(incomesGrowth || 0).toFixed(1)}%</span>
                    </>
                  )}
                  {incomesGrowth === 0 && (
                    <>
                      <span className="text-gray-500">0%</span>
                    </>
                  )}
                  <span className="text-gray-500">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'entradas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">{isSoloUser ? 'Suas Entradas' : 'Divisão por Responsável'}</p>
              <p className="text-xs text-gray-500 mb-3">{isSoloUser ? 'Suas entradas do mês' : 'Divisão completa da família por responsável'}</p>
              <div className="space-y-2">
                {costCenters
                  .filter(cc => cc && cc.is_active !== false && !cc.is_shared)
                  .map((cc) => {
                    // Entradas individuais deste responsável
                    const individualTotal = confirmedMonthIncomes
                      .filter(i => !i.is_shared && i.cost_center_id === cc.id)
                      .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
                    
                    // Parte deste responsável nas entradas compartilhadas
                    let sharedTotal = 0;
                    confirmedMonthIncomes
                      .filter(i => i.is_shared)
                      .forEach(i => {
                        if (i.income_splits && i.income_splits.length > 0) {
                          // Usar splits personalizados
                          const split = i.income_splits.find(s => s.cost_center_id === cc.id);
                          if (split) {
                            sharedTotal += parseFloat(split.amount || 0);
                          }
                        } else {
                          // Usar fallback (default_split_percentage do cost_center)
                          const percentage = parseFloat(cc.default_split_percentage || 0);
                          const amount = parseFloat(i.amount || 0);
                          sharedTotal += (amount * percentage) / 100;
                        }
                      });
                    
                    const total = individualTotal + sharedTotal;
                    const percentage = totalIncomes > 0 ? ((total / totalIncomes) * 100).toFixed(1) : 0;
                    
                    return { cc, total, percentage, individualTotal, sharedTotal };
                  })
                  .filter(item => item.total > 0)
                  .map(({ cc, total, percentage, individualTotal, sharedTotal }) => (
                    <div key={cc.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: cc.color || '#207DFF' }}
                          />
                          <span className="text-gray-700 font-medium">{cc.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{percentage}%</span>
                        </div>
                      </div>
                      {(individualTotal > 0 || sharedTotal > 0) && (
                        <div className="text-xs text-gray-500 ml-5">
                          {individualTotal > 0 && `Individual: R$ ${individualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          {individualTotal > 0 && sharedTotal > 0 && ' • '}
                          {sharedTotal > 0 && `Compartilhada: R$ ${sharedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                      )}
                    </div>
                  ))}
                {costCenters.filter(cc => cc && cc.is_active !== false && !cc.is_shared).length === 0 && (
                  <p className="text-sm text-gray-500">Nenhum dado disponível</p>
                )}
              </div>
            </div>
          </div>

          {/* Card 2: Total de Despesas */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleTooltipToggle('despesas');
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Despesas
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <TrendingDown className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  - R$ {Number(grandTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  {expensesGrowth > 0 && (
                    <>
                      <TrendingUp className="h-3 w-3 text-red-600" />
                      <span className="text-red-600">+{Math.abs(expensesGrowth || 0).toFixed(1)}%</span>
                    </>
                  )}
                  {expensesGrowth < 0 && (
                    <>
                      <TrendingDown className="h-3 w-3 text-green-600" />
                      <span className="text-green-600">-{Math.abs(expensesGrowth || 0).toFixed(1)}%</span>
                    </>
                  )}
                  {expensesGrowth === 0 && (
                    <>
                      <span className="text-gray-500">0%</span>
                    </>
                  )}
                  <span className="text-gray-500">vs mês anterior</span>
                </div>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'despesas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">Divisão por Forma de Pagamento</p>
              <p className="text-xs text-gray-500 mb-3">{isSoloUser ? 'Suas despesas do mês' : 'Divisão completa da família'}</p>
              <div className="space-y-3">
                {(() => {
                  // Calcular total à vista (total da organização)
                  const totalAVista = confirmedMonthExpenses
                    .filter(e => 
                      e.payment_method === 'cash' || 
                      e.payment_method === 'debit_card' || 
                      e.payment_method === 'pix' || 
                      e.payment_method === 'bank_transfer' || 
                      e.payment_method === 'boleto' || 
                      e.payment_method === 'other'
                    )
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                  
                  // Calcular total crédito (total da organização)
                  const totalCredito = confirmedMonthExpenses
                    .filter(e => e.payment_method === 'credit_card')
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                  
                  const totalDespesas = totalAVista + totalCredito;
                  const porcentagemAVista = totalDespesas > 0 ? ((totalAVista / totalDespesas) * 100).toFixed(1) : 0;
                  const porcentagemCredito = totalDespesas > 0 ? ((totalCredito / totalDespesas) * 100).toFixed(1) : 0;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                          <span className="text-gray-700 font-medium">À Vista</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">- R$ {Number(totalAVista).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{porcentagemAVista}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-gray-700 font-medium">Crédito</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">- R$ {Number(totalCredito).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{porcentagemCredito}%</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Card 3: Saldo do Mês */}
          <Card className={`border shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden ${
            balance >= 0 
              ? 'border-green-200 bg-green-50' 
              : 'border-red-200 bg-red-50'
          }`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className={`text-sm font-medium ${
                balance >= 0 ? 'text-gray-600' : 'text-gray-600'
              }`}>
                Saldo do Mês
              </CardTitle>
              <div className={`p-2 rounded-lg ${
                balance >= 0 ? 'bg-green-100' : 'bg-red-100'
              }`}>
                <DollarSign className={`h-4 w-4 ${
                  balance >= 0 ? 'text-green-600' : 'text-red-600'
                }`} />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className={`text-2xl font-bold mb-1 ${
                balance >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {balance >= 0 ? '' : '-'} R$ {Number(Math.abs(balance)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="flex items-center space-x-2 text-xs">
                {balanceGrowth > 0 && (
                  <>
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">+{Math.abs(balanceGrowth || 0).toFixed(1)}%</span>
                  </>
                )}
                {balanceGrowth < 0 && (
                  <>
                    <TrendingDown className="h-3 w-3 text-red-600" />
                    <span className="text-red-600">-{Math.abs(balanceGrowth || 0).toFixed(1)}%</span>
                  </>
                )}
                {balanceGrowth === 0 && (
                  <>
                    <span className="text-gray-500">0%</span>
                  </>
                )}
                <span className="text-gray-500">vs mês anterior</span>
              </div>
            </CardContent>
          </Card>

          {/* Novo Card 1: Total de Crédito Usado */}
          <div className="relative group">
            <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                handleTooltipToggle('credit-used');
              }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Crédito Usado
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {Number(totalCreditUsed).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Em todos os cartões
                </p>
              </CardContent>
            </Card>

            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[280px] max-w-[400px] md:invisible md:group-hover:visible ${openTooltip === 'credit-used' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Uso por Cartão</p>
              <div className="space-y-2">
                {creditCards.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum cartão de crédito cadastrado</p>
                ) : (
                  creditCards.map(card => {
                    const usage = cardsUsage[card.id] || { used: 0, limit: card.credit_limit || 0 };
                    const percentage = usage.limit > 0 ? ((usage.used / usage.limit) * 100).toFixed(1) : 0;
                    
                    // Determinar cor do cartão
                    const isHexColor = card.color && card.color.startsWith('#');
                    const cardColorStyle = isHexColor ? { backgroundColor: card.color } : {};
                    const cardColorClass = card.color && card.color.startsWith('bg-') ? card.color : 'bg-gray-600';
                    
                    return (
                      <div key={card.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div 
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${cardColorClass}`}
                            style={cardColorStyle}
                          ></div>
                          <span className="text-gray-700 font-medium truncate">{card.name || 'Sem nome'}</span>
                        </div>
                        <div className="text-right ml-2">
                          <span className="text-gray-900 font-semibold">R$ {Number(usage.used).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2 text-xs">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Novo Card 2: Total de Crédito Disponível */}
          <div className="relative group">
            <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer" onClick={(e) => {
                e.stopPropagation();
                handleTooltipToggle('credit-available');
              }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Crédito Disponível
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <Wallet className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {Number(totalCreditAvailable).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Limite disponível
                </p>
              </CardContent>
            </Card>

            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[280px] max-w-[400px] md:invisible md:group-hover:visible ${openTooltip === 'credit-available' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Disponível por Cartão</p>
              <div className="space-y-2">
                {creditCards.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhum cartão de crédito cadastrado</p>
                ) : (
                  creditCards.map(card => {
                    const usage = cardsUsage[card.id] || { used: 0, limit: card.credit_limit || 0 };
                    const available = Math.max(0, usage.limit - usage.used);
                    
                    // Determinar cor do cartão
                    const isHexColor = card.color && card.color.startsWith('#');
                    const cardColorStyle = isHexColor ? { backgroundColor: card.color } : {};
                    const cardColorClass = card.color && card.color.startsWith('bg-') ? card.color : 'bg-gray-400';
                    
                    return (
                      <div key={card.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div 
                            className={`w-3 h-3 rounded-full flex-shrink-0 ${cardColorClass}`}
                            style={cardColorStyle}
                          ></div>
                          <span className="text-gray-700 font-medium truncate">{card.name || 'Sem nome'}</span>
                        </div>
                        <div className="text-right ml-2">
                          <span className="text-gray-900 font-semibold">R$ {Number(available).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Novo Card 3: Total Consolidado das Contas Bancárias */}
          <div className="relative group">
            <Card className={`border shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer ${
              totalBankBalance < 0 
                ? 'border-red-200 bg-red-50' 
                : 'border-gray-200 bg-gray-50'
            }`} onClick={(e) => {
                e.stopPropagation();
                handleTooltipToggle('bank-balance');
              }}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className={`text-sm font-medium ${
                  totalBankBalance < 0 ? 'text-red-700' : 'text-gray-600'
                }`}>
                  Total Consolidado das Contas Bancárias
                </CardTitle>
                <div className={`p-2 rounded-lg ${
                  totalBankBalance < 0 ? 'bg-red-100' : 'bg-gray-100'
                }`}>
                  <Wallet className={`h-4 w-4 ${
                    totalBankBalance < 0 ? 'text-red-600' : 'text-gray-600'
                  }`} />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className={`absolute bottom-2 right-2 h-3 w-3 opacity-50 group-hover:opacity-70 transition-opacity ${
                  totalBankBalance < 0 ? 'text-red-400' : 'text-gray-400'
                }`} />
                <div className={`text-2xl font-bold mb-1 ${
                  totalBankBalance < 0 ? 'text-red-600' : 'text-gray-900'
                }`}>
                  {totalBankBalance < 0 ? '-' : ''} R$ {Number(Math.abs(totalBankBalance)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className={`text-xs mt-1 ${
                  totalBankBalance < 0 ? 'text-red-600' : 'text-gray-500'
                }`}>
                  Saldo total das contas
                </p>
              </CardContent>
            </Card>

            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[280px] max-w-[400px] md:invisible md:group-hover:visible ${openTooltip === 'bank-balance' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Saldo por Conta</p>
              <div className="space-y-2">
                {bankAccounts.length === 0 ? (
                  <p className="text-sm text-gray-500">Nenhuma conta bancária cadastrada</p>
                ) : (
                  bankAccounts.map(account => {
                    const balance = parseFloat(account.current_balance || 0);
                    return (
                      <div key={account.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                            balance < 0 ? 'bg-red-500' : 'bg-green-500'
                          }`}></div>
                          <span className="text-gray-700 font-medium truncate">{account.name || 'Sem nome'}</span>
                        </div>
                        <div className="text-right ml-2">
                          <span className={`font-semibold ${
                            balance < 0 ? 'text-red-600' : 'text-gray-900'
                          }`}>
                            R$ {Number(Math.abs(balance)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            {balance < 0 && <span className="ml-1">-</span>}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="space-y-6 md:space-y-12">
          {/* Expenses Charts */}
          <MonthCharts 
            expenses={expensesForCharts} 
            costCenters={costCenters} 
            categories={budgetCategories}
            organization={organization}
            user={orgUser}
            isSoloUser={isSoloUser}
          />

          {/* Income Charts */}
          <IncomeCharts incomes={monthIncomes} expenses={expensesForCharts} costCenters={costCenters} incomeCategories={incomeCategories} isSoloUser={isSoloUser} />

          {/* Monthly Comparison */}
          <MonthlyComparison monthlyData={monthlyData} />
        </div>
      </main>

      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifications}
      />

    </Header>
  );
}