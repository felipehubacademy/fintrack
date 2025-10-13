import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import MonthCharts from '../../components/MonthCharts';
import MonthlyComparison from '../../components/MonthlyComparison';
import { useOrganization } from '../../hooks/useOrganization';

export default function DashboardHome() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, budgetCategories, loading: orgLoading, error: orgError } = useOrganization();
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
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

      // Buscar despesas (compatível V1/V2)
      let query = supabase
        .from('expenses')
        .select('*')
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      // Adicionar filtro V2 se organização tem ID real (não mock)
      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Separar cartão e a vista
      const card = (data || []).filter(e => e.payment_method === 'credit_card');
      const cash = (data || []).filter(e => e.payment_method !== 'credit_card');

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
            .filter(e => e.payment_method !== 'credit_card')
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

  const cardTotals = calculateTotals(cardExpenses);
  const cashTotals = calculateTotals(cashExpenses);
  const allExpenses = [...cardExpenses, ...cashExpenses];
  const grandTotal = cardTotals.total + cashTotals.total;

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">💰 {organization?.name || 'FinTrack'} - Dashboard</h1>
              <p className="text-sm text-gray-600">
                {orgUser?.role === 'admin' ? '👑 Administrador' : '👤 Membro'} • {orgUser?.name}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards Consolidados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Card: Cartões */}
          <Link href="/dashboard/card">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">💳 Cartões</p>
                  <p className="text-3xl font-bold mt-2">R$ {cardTotals.total.toFixed(2)}</p>
                </div>
                <svg className="w-12 h-12 text-blue-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Card: A Vista */}
          <Link href="/dashboard/finance">
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white cursor-pointer hover:shadow-xl transition-all">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">💵 Dinheiro/PIX</p>
                  <p className="text-3xl font-bold mt-2">R$ {cashTotals.total.toFixed(2)}</p>
                </div>
                <svg className="w-12 h-12 text-green-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
            </div>
          </Link>

          {/* Card: Total Geral */}
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">📊 Total Geral</p>
                <p className="text-3xl font-bold mt-2">R$ {grandTotal.toFixed(2)}</p>
                <p className="text-purple-200 text-sm mt-2">
                  {allExpenses.length} despesas
                </p>
              </div>
              <svg className="w-12 h-12 text-purple-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>

          {/* Card: Centros de Custo */}
          <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">👥 Centros de Custo</p>
                <p className="text-2xl font-bold mt-2">{costCenters.length}</p>
                <p className="text-orange-200 text-sm mt-2">
                  {costCenters.map(c => c.name).join(', ')}
                </p>
              </div>
              <svg className="w-12 h-12 text-orange-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 gap-6 mb-8">
          {/* Month Charts (Pie Charts) */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                📊 Análise do Mês
              </h2>
            </div>
            <MonthCharts expenses={allExpenses} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} costCenters={costCenters} />
          </div>

          {/* Monthly Comparison (Stacked Bar Chart) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📈 Comparativo Mensal (Últimos 6 meses)
            </h2>
            <MonthlyComparison monthlyData={monthlyData} />
          </div>
        </div>
      </main>
    </div>
  );
}