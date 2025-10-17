import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import MonthCharts from '../../components/MonthCharts';
import MonthlyComparison from '../../components/MonthlyComparison';
import StatsCards from '../../components/dashboard/StatsCards';
import QuickActions from '../../components/dashboard/QuickActions';
import RecentActivity from '../../components/dashboard/RecentActivity';
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
  Users
} from 'lucide-react';

export default function DashboardHome() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, budgetCategories, loading: orgLoading, error: orgError } = useOrganization();
  const [selectedMonth, setSelectedMonth] = useState('2025-10'); // Temporariamente fixo para outubro 2025
  const [cardExpenses, setCardExpenses] = useState([]);
  const [cashExpenses, setCashExpenses] = useState([]);
  const [monthlyData, setMonthlyData] = useState([]);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchAllExpenses();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);

  const fetchAllExpenses = async () => {
    if (!organization) return;
    
    try {
      // Buscar todas as despesas confirmadas do mês da organização
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = new Date(selectedMonth + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      console.log('🔍 [DASHBOARD DEBUG] selectedMonth:', selectedMonth);
      console.log('🔍 [DASHBOARD DEBUG] startOfMonth:', startOfMonth);
      console.log('🔍 [DASHBOARD DEBUG] endOfMonth:', endOfMonth.toISOString().split('T')[0]);
      console.log('🔍 [DASHBOARD DEBUG] organization.id:', organization.id);
      console.log('🔍 [DASHBOARD DEBUG] organization:', organization);

      // Buscar despesas (compatível V1/V2)
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth.toISOString().split('T')[0])
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

      console.log('🔍 [DASHBOARD DEBUG] Raw data from DB:', data);

      // Separar cartão e a vista
      const card = (data || []).filter(e => e.payment_method === 'credit_card');
      const cash = (data || []).filter(e => 
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
    } catch (error) {
      console.error('Error fetching expenses:', error);
    }
  };

  const fetchMonthlyData = async () => {
    try {
      const months = [];
      const currentDate = new Date();
      
      // Gerar últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthStr = date.toISOString().slice(0, 7);
        
        const startOfMonth = `${monthStr}-01`;
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

        // Buscar dados mensais (compatível V1/V2)
        let monthlyQuery = supabase
          .from('expenses')
          .select('*')
          .eq('status', 'confirmed')
          .gte('date', startOfMonth)
          .lte('date', endOfMonthStr);

        // Adicionar filtro V2 se organização tem ID real
        if (organization?.id && organization.id !== 'default-org') {
          monthlyQuery = monthlyQuery.eq('organization_id', organization.id);
        }

        const { data, error } = await monthlyQuery;

        if (!error && data) {
          const cardTotal = data
            .filter(e => e.payment_method === 'credit_card')
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);
            
          const cashTotal = data
            .filter(e => 
              e.payment_method === 'cash' || 
              e.payment_method === 'debit_card' || 
              e.payment_method === 'pix' || 
              e.payment_method === 'bank_transfer' || 
              e.payment_method === 'boleto' || 
              e.payment_method === 'other'
            )
            .reduce((sum, e) => sum + parseFloat(e.amount), 0);

          months.push({
            month: date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
            cartoes: cardTotal,
            despesas: cashTotal
          });
        }
      }
      
      setMonthlyData(months);
    } catch (error) {
      console.error('Error fetching monthly data:', error);
    }
  };

  useEffect(() => {
    if (orgUser) {
      fetchAllExpenses();
    }
  }, [selectedMonth, orgUser]);

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

  // Calcular totais usando a MESMA lógica do fetchMonthlyData que funciona!
  const currentMonthData = monthlyData.find(month => month.month === 'out. de 25');
  const cardTotal = currentMonthData ? currentMonthData.cartoes : 0;
  const cashTotal = currentMonthData ? currentMonthData.despesas : 0;
  const allExpenses = [...cardExpenses, ...cashExpenses];
  const grandTotal = cardTotal + cashTotal;

  // Debug logs
  console.log('🔍 [DASHBOARD DEBUG] monthlyData:', monthlyData);
  console.log('🔍 [DASHBOARD DEBUG] currentMonthData:', currentMonthData);
  console.log('🔍 [DASHBOARD DEBUG] cardTotal:', cardTotal);
  console.log('🔍 [DASHBOARD DEBUG] cashTotal:', cashTotal);
  console.log('🔍 [DASHBOARD DEBUG] grandTotal:', grandTotal);

  if (orgLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando organização...</p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{organization?.name || 'FinTrack'}</h1>
                <p className="text-sm text-gray-600 flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    orgUser?.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {orgUser?.role === 'admin' ? '👑 Administrador' : '👤 Membro'}
                  </span>
                  <span>•</span>
                  <span>{orgUser?.name || 'Usuário'}</span>
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon">
                <Search className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Stats Cards */}
        <StatsCards 
          cardExpenses={cardTotal}
          cashExpenses={cashTotal}
          totalExpenses={grandTotal}
          costCenters={costCenters}
          budgets={[]}
          monthlyGrowth={12}
        />

        {/* Quick Actions */}
        <QuickActions userRole={orgUser?.role} />

        {/* Charts and Activity Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            {/* Month Charts */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                    <Calendar className="h-4 w-4 text-white" />
                  </div>
                  <span>Análise do Mês</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MonthCharts expenses={allExpenses} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} costCenters={costCenters} />
              </CardContent>
            </Card>

            {/* Monthly Comparison */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
                    <TrendingUp className="h-4 w-4 text-white" />
                  </div>
                  <span>Comparativo Mensal</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <MonthlyComparison monthlyData={monthlyData} />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Recent Activity */}
          <div className="space-y-6">
            <RecentActivity expenses={allExpenses} />
            
            {/* Quick Stats */}
            <Card className="border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-lg">
                    <Users className="h-4 w-4 text-white" />
                  </div>
                  <span>Resumo Rápido</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Despesas este mês</span>
                  <span className="font-semibold text-gray-900">{allExpenses.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Centros de custo</span>
                  <span className="font-semibold text-gray-900">{costCenters.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Categorias</span>
                  <span className="font-semibold text-gray-900">{budgetCategories.length}</span>
                </div>
                <div className="pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    Ver Relatório Completo
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}