import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import MonthCharts from '../../components/MonthCharts';
import MonthlyComparison from '../../components/MonthlyComparison';
import StatsCards from '../../components/dashboard/StatsCards';
import QuickActions from '../../components/dashboard/QuickActions';
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
  Users,
  RefreshCw
} from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';

export default function DashboardHome() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, budgetCategories, loading: orgLoading, error: orgError } = useOrganization();
  const [selectedMonth, setSelectedMonth] = useState('2025-10');
  // Raw expenses for the selected month (used by MonthCharts)
  const [monthExpenses, setMonthExpenses] = useState([]);
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

  useEffect(() => {
    console.log('🔍 [Dashboard] useEffect triggered:', { orgLoading, orgError, organization: !!organization });
    if (!orgLoading && !orgError && organization) {
      console.log('🔍 [Dashboard] Checking onboarding status...');
      checkOnboardingStatus();
      fetchAllExpenses();
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
      if (!data || !data.is_completed) {
        console.log('🔍 [Dashboard] Onboarding not completed, redirecting to onboarding');
        router.push('/onboarding/welcome');
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

      console.log('🔍 [DASHBOARD DEBUG] selectedMonth:', selectedMonth);
      console.log('🔍 [DASHBOARD DEBUG] startOfMonth:', startOfMonth);
      console.log('🔍 [DASHBOARD DEBUG] endExclusive:', endExclusive.toISOString().split('T')[0]);
      console.log('🔍 [DASHBOARD DEBUG] organization.id:', organization.id);
      console.log('🔍 [DASHBOARD DEBUG] organization:', organization);

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
      console.log('🔍 [DASHBOARD DEBUG] Checking organization filter...');
      console.log('🔍 [DASHBOARD DEBUG] organization?.id exists:', !!organization?.id);
      console.log('🔍 [DASHBOARD DEBUG] organization.id !== default-org:', organization?.id !== 'default-org');
      
      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
        console.log('🔍 [DASHBOARD DEBUG] Added organization filter:', organization.id);
      } else {
        console.log('🔍 [DASHBOARD DEBUG] No organization filter applied');
      }

      const { data, error } = await query;

      if (error) {
        console.error('🔍 [DASHBOARD DEBUG] Query error:', error);
        throw error;
      }

      let expensesData = data || [];

      // REMOVIDO: Fallback perigoso que causava vazamento de dados entre organizações

      // Se não houver expenses, deixar vazio (não buscar de outras organizações!)
      if (expensesData.length === 0) {
        console.log('✅ [DASHBOARD] No expenses found for this organization in the selected month.');
      }

      console.log('🔍 [DASHBOARD DEBUG] Expenses used for charts:', expensesData);
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

      console.log('🔍 [DASHBOARD DEBUG] Card expenses:', card.length, 'items');
      console.log('🔍 [DASHBOARD DEBUG] Cash expenses:', cash.length, 'items');
      console.log('🔍 [DASHBOARD DEBUG] Card details:', card);
      console.log('🔍 [DASHBOARD DEBUG] Cash details:', cash);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchAllExpenses();
      await fetchMonthlyData();
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsRefreshing(false);
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

        // Buscar dados mensais (compatível V1/V2)
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

        // REMOVIDO: Fallbacks perigosos que causavam vazamento de dados entre organizações
        if (error) {
          console.error('🔍 [DASHBOARD DEBUG] monthlyQuery error:', error);
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

          console.log(`🔍 [MONTHLY DEBUG] ${monthStr}:`, {
            totalExpenses: confirmedExpenses.length,
            cardTotal,
            cashTotal,
            grandTotal: cardTotal + cashTotal
          });

          months.push({
            month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            cartoes: cardTotal,
            despesas: cashTotal
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
  
  console.log('🔍 [STATS DEBUG] monthExpenses:', monthExpenses.length);
  console.log('🔍 [STATS DEBUG] confirmedMonthExpenses:', confirmedMonthExpenses.length);
  console.log('🔍 [STATS DEBUG] cardTotal:', cardTotal);
  console.log('🔍 [STATS DEBUG] cashTotal:', cashTotal);
  console.log('🔍 [STATS DEBUG] grandTotal:', grandTotal);

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

  // Debug logs
  console.log('🔍 [DASHBOARD DEBUG] selectedMonth:', selectedMonth);
  console.log('🔍 [DASHBOARD DEBUG] monthlyData:', monthlyData);
  console.log('🔍 [DASHBOARD DEBUG] cardExpenses:', cardExpenses);
  console.log('🔍 [DASHBOARD DEBUG] cashExpenses:', cashExpenses);
  console.log('🔍 [DASHBOARD DEBUG] expensesForCharts:', expensesForCharts);
  console.log('🔍 [DASHBOARD DEBUG] cardTotal:', cardTotal);
  console.log('🔍 [DASHBOARD DEBUG] cashTotal:', cashTotal);
  console.log('🔍 [DASHBOARD DEBUG] grandTotal:', grandTotal);

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

        {/* Stats Cards */}
        <StatsCards 
          cardExpenses={cardTotal}
          cashExpenses={cashTotal}
          totalExpenses={grandTotal}
          costCenters={costCenters}
          budgets={[]}
          monthlyGrowth={12}
          previousMonthData={previousMonthData}
        />

        {/* Quick Actions */}
        <QuickActions />

        {/* Charts Section */}
        <div className="space-y-12">
          {/* Month Charts */}
          <MonthCharts expenses={expensesForCharts} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} costCenters={costCenters} categories={budgetCategories} />

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