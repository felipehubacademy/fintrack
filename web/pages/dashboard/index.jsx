import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import SummaryCards from '../../components/SummaryCards';
import ExpenseTable from '../../components/ExpenseTable';
import MonthCharts from '../../components/MonthCharts';
import MonthlyComparison from '../../components/MonthlyComparison';

export default function Dashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  
  // Função para calcular o ciclo de compras (dia 9 do mês anterior até dia 8 do mês atual)
  const getBillingCycle = (date = new Date()) => {
    const currentMonth = date.getMonth();
    const currentYear = date.getFullYear();
    const currentDay = date.getDate();
    
    // Se estamos no dia 9 ou depois, o ciclo atual é do dia 9 do mês passado até dia 8 deste mês
    if (currentDay >= 9) {
      const startDate = new Date(currentYear, currentMonth - 1, 9);
      const endDate = new Date(currentYear, currentMonth, 8);
      const dueDate = new Date(currentYear, currentMonth, 15);
      return { startDate, endDate, dueDate };
    } else {
      // Se estamos antes do dia 9, o ciclo é do dia 9 de dois meses atrás até dia 8 do mês passado
      const startDate = new Date(currentYear, currentMonth - 2, 9);
      const endDate = new Date(currentYear, currentMonth - 1, 8);
      const dueDate = new Date(currentYear, currentMonth - 1, 15);
      return { startDate, endDate, dueDate };
    }
  };

  const { startDate, endDate, dueDate } = getBillingCycle();

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

  // Fetch expenses do ciclo atual
  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('status', 'confirmed') // Apenas confirmados
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', endDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

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
  }, [user]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">FinTrack Dashboard</h1>
            <p className="text-sm text-gray-600">
              Ciclo: {startDate.toLocaleDateString('pt-BR')} a {endDate.toLocaleDateString('pt-BR')} • 
              Vencimento: {dueDate.toLocaleDateString('pt-BR')}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Summary Cards */}
        <SummaryCards expenses={expenses} />

        {/* Charts Section */}
        <div className="mt-8 grid grid-cols-1 gap-6">
          {/* Month Charts (Pie Charts) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📊 Análise do Mês
            </h2>
            <MonthCharts expenses={expenses} selectedMonth={selectedMonth} />
          </div>

          {/* Monthly Comparison (Stacked Bar Chart) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📈 Comparativo Mensal
            </h2>
            <MonthlyComparison />
          </div>
        </div>

        {/* Expense Table */}
        <div className="mt-8 bg-white rounded-lg shadow">
          <ExpenseTable 
            expenses={expenses}
            onUpdate={fetchExpenses}
          />
        </div>
      </main>
    </div>
  );
}