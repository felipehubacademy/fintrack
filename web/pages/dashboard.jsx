import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';
import SummaryCards from '../components/SummaryCards';
import ExpenseTable from '../components/ExpenseTable';
import Chart from '../components/Chart';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().toISOString().slice(0, 7), // YYYY-MM
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
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session?.user) {
      setUser(session.user);
      fetchExpenses();
    } else {
      router.push('/');
    }
  };

  // Fetch expenses
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

      // Filter by month
      if (filter.month) {
        const startOfMonth = `${filter.month}-01`;
        const endOfMonth = new Date(filter.month + '-01');
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        
        query = query
          .gte('date', startOfMonth)
          .lte('date', endOfMonth.toISOString().split('T')[0]);
      }

      // Filter by owner
      if (filter.owner !== 'all') {
        query = query.eq('owner', filter.owner);
      }

      // Filter by category
      if (filter.category !== 'all') {
        query = query.eq('category', filter.category);
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-2 mr-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-gray-800">FinTrack</h1>
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
            {/* Month Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
              <input
                type="month"
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
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
        <ExpenseTable expenses={expenses} loading={loading} />
      </div>
    </div>
  );
}
