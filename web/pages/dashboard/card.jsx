import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../../lib/supabaseClient';
import SummaryCards from '../../components/SummaryCards';
import ExpenseTable from '../../components/ExpenseTable';
import Chart from '../../components/Chart';
import LoadingLogo from '../../components/LoadingLogo';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  // Função para calcular o ciclo de compras usando o billing_day padrão do sistema
  // Note: Esta função assume billing_day padrão. Para ciclo específico de um cartão,
  // use a função RPC get_billing_cycle com o card_id específico
  const getBillingCycle = async (date = new Date(), cardId = null) => {
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();
    const currentDay = date.getDate();
    
    // Se há um cardId específico, buscar o billing_day do cartão
    let billingDay = 9; // padrão fallback
    
    if (cardId) {
      try {
        const { data: cycle } = await supabase.rpc('get_billing_cycle', {
          card_uuid: cardId,
          reference_date: date.toISOString().split('T')[0]
        });
        if (cycle && cycle.length) {
          return {
            startDate: cycle[0].start_date,
            endDate: cycle[0].end_date,
            month: date.toISOString().split('T')[0].substring(0, 7)
          };
        }
      } catch (error) {
        console.error('Erro ao buscar ciclo do cartão:', error);
      }
    }
    
    // Fallback: usar billing_day padrão (dia 9)
    // Se estamos no dia billing_day ou depois, o ciclo atual é do billing_day do mês passado até dia (billing_day-1) deste mês
    if (currentDay >= billingDay) {
      const startDate = new Date(currentYear, currentMonth - 1, billingDay);
      const endDate = new Date(currentYear, currentMonth, billingDay - 1);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        month: `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`
      };
    } else {
      // Se estamos antes do billing_day, o ciclo atual é do billing_day de dois meses atrás até dia (billing_day-1) do mês passado
      const startDate = new Date(currentYear, currentMonth - 2, billingDay);
      const endDate = new Date(currentYear, currentMonth - 1, billingDay - 1);
      return {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        month: `${currentYear}-${String(currentMonth).padStart(2, '0')}`
      };
    }
  };

  const [filter, setFilter] = useState({
    month: new Date().toISOString().substring(0, 7), // Inicializar com mês atual
    owner: 'all',
    category: 'all'
  });

  // Check authentication
  useEffect(() => {
    checkUser();
    
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
      } else {
        router.push('/');
      }
    });

    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, [router]);

  const checkUser = async () => {
    console.log('🔍 checkUser iniciado');
    const { data: { session } } = await supabase.auth.getSession();
    console.log('🔍 Session:', session?.user?.email || 'Nenhum usuário');
    
    if (session?.user) {
      setUser(session.user);
      console.log('🔍 Usuário definido, chamando fetchExpenses');
      fetchExpenses();
    } else {
      console.log('🔍 Nenhum usuário, redirecionando');
      router.push('/');
    }
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      console.log('🔍 fetchExpenses iniciado');
      setLoading(true);
      
      let query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });
      
      // CRITICAL: Filter by organization
      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }
      
      console.log('🔍 Query base criada com filtro de organização');

      // Filter by billing cycle
      if (filter.month) {
        const cycleDates = getBillingCycle(new Date(filter.month + '-15')); // Use dia 15 como referência
        
        console.log('🔍 Filtro do ciclo de compras:', { 
          filterMonth: filter.month, 
          startDate: cycleDates.startDate, 
          endDate: cycleDates.endDate 
        });
        
        query = query
          .gte('date', cycleDates.startDate)
          .lte('date', cycleDates.endDate);
        
        console.log('🔍 Query com filtro de ciclo aplicado');
      }

      // Filter by owner
      if (filter.owner !== 'all') {
        console.log('🔍 Filtro de owner:', filter.owner);
        query = query.eq('owner', filter.owner);
      }

      // Filter by category
      if (filter.category !== 'all') {
        console.log('🔍 Filtro de categoria:', filter.category);
        query = query.eq('category', filter.category);
      }

      console.log('🔍 Executando query...');
      const { data, error } = await query;
      console.log('🔍 Query resultado:', { data, error });

      if (error) throw error;
      console.log('🔍 Setando expenses:', data?.length || 0, 'transações');
      setExpenses(data || []);
    } catch (error) {
      console.error('❌ Error fetching expenses:', error);
    } finally {
      setLoading(false);
      console.log('🔍 Loading finalizado');
    }
  };

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [filter, user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading && !user) {
    return (
      <div className="min-h-screen bg-fog-mist flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <button className="text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </Link>
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Cartões de Crédito</h1>
                <p className="text-sm text-gray-600">Cartões vinculados pelo usuário</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <p className="text-sm text-gray-600 hidden sm:block">{user?.email}</p>
              <button
                onClick={handleLogout}
                className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition"
              >
                Sair
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Billing Cycle Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Ciclo de Compras</label>
              <input
                type="month"
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ciclo: dia 9 até dia 8 • Vencimento: dia 15
              </p>
            </div>

            {/* Owner Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
              <select
                value={filter.owner}
                onChange={(e) => setFilter({ ...filter, owner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todos</option>
                <option value="Felipe">Felipe</option>
                <option value="Leticia">Letícia</option>
                <option value="Compartilhado">Compartilhado</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
              <select
                value={filter.category}
                onChange={(e) => setFilter({ ...filter, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="Beleza">Beleza</option>
                <option value="Combustível">Combustível</option>
                <option value="Taxas">Taxas</option>
                <option value="Assinaturas">Assinaturas</option>
                <option value="Supermercado">Supermercado</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <SummaryCards expenses={expenses} />

        {/* Chart */}
        <div className="mb-6">
          <Chart expenses={expenses} />
        </div>

        {/* Expense Table */}
        <ExpenseTable expenses={expenses} loading={loading} onUpdate={fetchExpenses} />
      </div>
    </div>
  );
}
