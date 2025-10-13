import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function DashboardV2() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [organization, setOrganization] = useState(null);
  const [costCenters, setCostCenters] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Check authentication
  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/');
    } else {
      setUser(user);
      await fetchUserData(user.id);
    }
  };

  const fetchUserData = async (userId) => {
    try {
      setLoading(true);
      
      // Buscar usuário com organização
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          organization:organizations(*)
        `)
        .eq('id', userId)
        .single();

      if (userError) throw userError;
      
      setOrganization(userData.organization);
      
      // Buscar centros de custo
      const { data: centers, error: centersError } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('organization_id', userData.organization_id)
        .eq('is_active', true)
        .order('name');

      if (centersError) throw centersError;
      setCostCenters(centers || []);

      // Buscar despesas do mês
      await fetchExpenses(userData.organization_id);

    } catch (error) {
      console.error('❌ Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpenses = async (organizationId) => {
    try {
      const startDate = `${selectedMonth}-01`;
      const endDate = new Date(selectedMonth + '-01');
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      const endDateStr = endDate.toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          cost_center:cost_centers(name, color),
          user:users(name)
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .lte('date', endDateStr)
        .order('date', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);

    } catch (error) {
      console.error('❌ Erro ao buscar despesas:', error);
    }
  };

  // Calcular totais por centro de custo
  const calculateTotals = () => {
    const totals = {};
    
    costCenters.forEach(center => {
      const centerExpenses = expenses.filter(e => e.cost_center_id === center.id);
      const total = centerExpenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      totals[center.id] = {
        name: center.name,
        total: total,
        count: centerExpenses.length,
        color: center.color
      };
    });

    return totals;
  };

  // Calcular total geral
  const calculateGrandTotal = () => {
    return expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
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

  if (!organization) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Organização não encontrada</h1>
          <p className="text-gray-600 mb-6">Você precisa ser convidado para uma organização.</p>
          <Link href="/" className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700">
            Voltar ao início
          </Link>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();
  const grandTotal = calculateGrandTotal();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{organization.name}</h1>
              <p className="text-gray-600">Dashboard Multi-usuário</p>
            </div>
            <div className="flex items-center space-x-4">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
              >
                <option value="2025-10">Outubro 2025</option>
                <option value="2025-09">Setembro 2025</option>
                <option value="2025-08">Agosto 2025</option>
              </select>
              <button
                onClick={() => fetchExpenses(organization.id)}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
              >
                Atualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {costCenters.map((center) => {
            const total = totals[center.id] || { total: 0, count: 0 };
            return (
              <div key={center.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{center.name}</h3>
                    <p className="text-3xl font-bold mt-2" style={{ color: center.color }}>
                      R$ {total.total.toFixed(2)}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {total.count} transações
                    </p>
                  </div>
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: center.color + '20' }}
                  >
                    <span className="text-2xl">💰</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {/* Total Geral */}
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Total Geral</h3>
                <p className="text-3xl font-bold mt-2">
                  R$ {grandTotal.toFixed(2)}
                </p>
                <p className="text-sm opacity-90 mt-1">
                  {expenses.length} transações
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-white bg-opacity-20 flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lista de Despesas */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Despesas Recentes</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {expenses.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-gray-400 text-6xl mb-4">💸</div>
                <p className="text-gray-600">Nenhuma despesa encontrada</p>
                <p className="text-sm text-gray-500 mt-1">
                  Envie uma mensagem no WhatsApp para começar!
                </p>
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="p-6 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: expense.cost_center?.color }}
                        ></div>
                        <h3 className="text-lg font-medium text-gray-900">
                          {expense.description}
                        </h3>
                      </div>
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                        <span>{expense.cost_center?.name}</span>
                        <span>•</span>
                        <span>{new Date(expense.date).toLocaleDateString('pt-BR')}</span>
                        <span>•</span>
                        <span className="capitalize">{expense.payment_method.replace('_', ' ')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        R$ {parseFloat(expense.amount).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Informações da Organização */}
        <div className="mt-8 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações da Organização</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Código de Convite</p>
              <p className="font-mono text-lg font-bold text-purple-600">
                {organization.invite_code}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Criada em</p>
              <p className="text-lg">
                {new Date(organization.created_at).toLocaleDateString('pt-BR')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
