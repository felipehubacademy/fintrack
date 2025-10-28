import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import MonthCharts from '../../components/MonthCharts';
import IncomeCharts from '../../components/IncomeCharts';
import MonthlyComparison from '../../components/MonthlyComparison';
import QuickActions from '../../components/dashboard/QuickActions';
import NotificationModal from '../../components/NotificationModal';
import LoadingLogo from '../../components/LoadingLogo';
import { useOrganization } from '../../hooks/useOrganization';
import { usePrivacyFilter } from '../../hooks/usePrivacyFilter';
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
import Footer from '../../components/Footer';

export default function DashboardHome() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, budgetCategories, incomeCategories, loading: orgLoading, error: orgError } = useOrganization();
  const { filterByPrivacy } = usePrivacyFilter(organization, orgUser, costCenters);
  const [selectedMonth, setSelectedMonth] = useState('2025-10');
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

  useEffect(() => {
    console.log('🔍 [Dashboard] useEffect triggered:', { orgLoading, orgError, organization: !!organization });
    if (!orgLoading && !orgError && organization) {
      console.log('🔍 [Dashboard] Checking onboarding status...');
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
      console.log('🔍 [Dashboard] Missing organization or user:', { organization: !!organization, orgUser: !!orgUser });
      return;
    }

    console.log('🔍 [Dashboard] Checking onboarding for user:', orgUser.id, 'org:', organization.id);

    try {
      const { data, error } = await supabase
        .from('onboarding_progress')
        .select('*')
        .eq('user_id', orgUser.id)
        .eq('organization_id', organization.id)
        .single();

      console.log('🔍 [Dashboard] Onboarding query result:', { data, error });

      if (error && error.code !== 'PGRST116') {
        console.error('❌ Erro ao verificar onboarding:', error);
        return;
      }

      // If no onboarding record exists or it's not completed, redirect to onboarding
      // MAS não redirecionar se foi pulado (skipped)
      if ((!data || !data.is_completed) && !data?.skipped) {
        console.log('🔍 [Dashboard] Onboarding not completed, redirecting to onboarding');
        router.push('/onboarding/welcome');
        return;
      }
      
      // Se foi pulado, deixar usar o dashboard normalmente
      if (data?.skipped) {
        console.log('✅ [Dashboard] Onboarding skipped, allowing access to dashboard');
        return;
      }

      console.log('✅ [Dashboard] Onboarding completed, staying on dashboard');
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
      const endExclusive = new Date(selectedMonth + '-01');
      endExclusive.setMonth(endExclusive.getMonth() + 1);
      // endExclusive é o 1º dia do próximo mês; usaremos '<' para evitar problemas de fuso


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
        // status: confirmed, paid, ou null (legado)
        .or('status.eq.confirmed,status.eq.paid,status.is.null')
        .gte('date', startOfMonth)
        .lt('date', endExclusive.toISOString().split('T')[0])
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
        console.log('✅ [DASHBOARD] No expenses found for this organization in the selected month.');
      }

      // Aplicar filtro de privacidade
      const filteredExpenses = filterByPrivacy(expensesData);
      
      setMonthExpenses(filteredExpenses);

      // Separar cartão e a vista
      const card = (filteredExpenses || []).filter(e => e.payment_method === 'credit_card');
      const cash = (filteredExpenses || []).filter(e => 
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
      const endExclusive = new Date(selectedMonth + '-01');
      endExclusive.setMonth(endExclusive.getMonth() + 1);

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
        .lt('date', endExclusive.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching incomes:', error);
        throw error;
      }

      // Aplicar filtro de privacidade
      const filteredIncomes = filterByPrivacy(data || []);
      setMonthIncomes(filteredIncomes);
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

        // Somar todas as despesas confirmadas desse cartão
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount')
          .eq('payment_method', 'credit_card')
          .eq('card_id', card.id)
          .eq('status', 'confirmed');

        const used = (expenses || []).reduce((sum, e) => sum + Number(e.amount || 0), 0);
        return [card.id, { used, limit: Number(card.credit_limit || 0) }];
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
  const confirmedMonthExpenses = monthExpenses.filter(e => 
    e.status === 'confirmed' || e.status === 'paid' || !e.status
  );
  
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
    
  const grandTotal = cardTotal + cashTotal;

  // Recalcular dados do mês anterior baseado no mês selecionado
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
    } else {
      setPreviousMonthData({
        cardExpenses: 0,
        cashExpenses: 0,
        totalExpenses: 0
      });
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
  const totalIncomes = monthIncomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
  const balance = totalIncomes - grandTotal;
  
  const calculateGrowth = (current, previous) => {
    if (!current || current === 0) return 0;
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  const expensesGrowth = calculateGrowth(grandTotal, previousMonthData?.totalExpenses || 0);
  const incomesGrowth = calculateGrowth(totalIncomes, 0);
  const balanceGrowth = previousMonthData?.totalExpenses
    ? calculateGrowth(balance, (0 - previousMonthData.totalExpenses))
    : 0;


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
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
        onUnreadCountChange={setUnreadNotifications}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Painel Principal</h2>
              <div className="flex items-center space-x-3">
                <Button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Atualizando...' : 'Atualizar Dados'}
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards - Grid 2x3 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Card 1: Total de Entradas */}
          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Entradas
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/5">
                <ArrowDownCircle className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {Number(totalIncomes).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

          {/* Card 2: Total de Despesas */}
          <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total de Despesas
              </CardTitle>
              <div className="p-2 rounded-lg bg-gray-50">
                <ArrowUpCircle className="h-4 w-4 text-gray-600" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                - R$ {Number(grandTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                balance >= 0 ? 'bg-green-50' : 'bg-red-50'
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
                {balance >= 0 ? '' : '-'} R$ {Number(Math.abs(balance)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
            <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer" onClick={() => setOpenTooltip(openTooltip === 'credit-used' ? null : 'credit-used')}>
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
                  R$ {Number(totalCreditUsed).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    return (
                      <div key={card.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className="w-3 h-3 rounded-full bg-gray-600 flex-shrink-0"></div>
                          <span className="text-gray-700 font-medium truncate">{card.name || 'Sem nome'}</span>
                        </div>
                        <div className="text-right ml-2">
                          <span className="text-gray-900 font-semibold">R$ {Number(usage.used).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
            <Card className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer" onClick={() => setOpenTooltip(openTooltip === 'credit-available' ? null : 'credit-available')}>
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
                  R$ {Number(totalCreditAvailable).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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
                    return (
                      <div key={card.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2 min-w-0 flex-1">
                          <div className="w-3 h-3 rounded-full bg-gray-400 flex-shrink-0"></div>
                          <span className="text-gray-700 font-medium truncate">{card.name || 'Sem nome'}</span>
                        </div>
                        <div className="text-right ml-2">
                          <span className="text-gray-900 font-semibold">R$ {Number(available).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
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
            }`} onClick={() => setOpenTooltip(openTooltip === 'bank-balance' ? null : 'bank-balance')}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className={`text-sm font-medium ${
                  totalBankBalance < 0 ? 'text-red-700' : 'text-gray-600'
                }`}>
                  Total Consolidado das Contas
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
                  R$ {Number(Math.abs(totalBankBalance)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  {totalBankBalance < 0 && <span className="text-lg ml-1">-</span>}
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
                            R$ {Number(Math.abs(balance)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
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

        {/* Quick Actions */}
        <QuickActions />

        {/* Charts Section */}
        <div className="space-y-12">
          {/* Expenses Charts */}
          <MonthCharts 
            expenses={expensesForCharts} 
            selectedMonth={selectedMonth} 
            onMonthChange={setSelectedMonth} 
            costCenters={costCenters} 
            categories={budgetCategories}
            organization={organization}
            user={orgUser}
          />

          {/* Income Charts */}
          <IncomeCharts incomes={monthIncomes} expenses={expensesForCharts} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} costCenters={costCenters} incomeCategories={incomeCategories} />

          {/* Monthly Comparison */}
          <MonthlyComparison monthlyData={monthlyData} />
        </div>
      </main>

      {/* Footer */}
      <Footer />

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        onUnreadCountChange={setUnreadNotifications}
      />
    </div>
  );
}