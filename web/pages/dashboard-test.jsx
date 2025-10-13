import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export default function DashboardTest() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      // Buscar despesas diretamente do Supabase
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          cost_center:cost_centers(name, color),
          user:users(name)
        `)
        .eq('status', 'confirmed')
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setExpenses(data || []);

    } catch (error) {
      console.error('❌ Erro ao buscar despesas:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando despesas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Teste</h1>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Despesas ({expenses.length})</h2>
          
          {expenses.length === 0 ? (
            <p className="text-gray-500">Nenhuma despesa encontrada</p>
          ) : (
            <div className="space-y-4">
              {expenses.map((expense) => (
                <div key={expense.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{expense.description}</h3>
                      <p className="text-sm text-gray-500">
                        {expense.cost_center?.name} • {expense.user?.name}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        R$ {expense.amount?.toFixed(2) || '0.00'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {new Date(expense.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
