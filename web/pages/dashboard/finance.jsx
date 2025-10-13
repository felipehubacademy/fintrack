import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';

export default function FinanceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().toISOString().slice(0, 7),
    owner: 'all',
    payment_method: 'all'
  });
  const [editingId, setEditingId] = useState(null);
  const [editOwner, setEditOwner] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user, filter]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      router.push('/');
    } else {
      setUser(user);
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('expenses_general')
        .select('*')
        .order('date', { ascending: false });

      if (filter.month) {
        const startOfMonth = `${filter.month}-01`;
        const endOfMonth = new Date(filter.month + '-01');
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0);
        const endOfMonthStr = endOfMonth.toISOString().split('T')[0];

        query = query.gte('date', startOfMonth).lte('date', endOfMonthStr);
      }

      if (filter.owner !== 'all') {
        query = query.eq('owner', filter.owner);
      }

      if (filter.payment_method !== 'all') {
        query = query.eq('payment_method', filter.payment_method);
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

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditOwner(expense.owner || '');
  };

  const handleSave = async () => {
    if (!editOwner) {
      alert('Selecione um responsável');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('expenses_general')
        .update({
          owner: editOwner,
          status: 'confirmed',
          split: editOwner === 'Compartilhado',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', editingId);

      if (error) throw error;

      setEditingId(null);
      setEditOwner('');
      fetchExpenses();

    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar despesa');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  // Calcular totais
  const totals = {
    felipe: expenses.filter(e => e.status === 'confirmed' && e.owner === 'Felipe').reduce((sum, e) => sum + parseFloat(e.amount), 0),
    leticia: expenses.filter(e => e.status === 'confirmed' && e.owner === 'Leticia').reduce((sum, e) => sum + parseFloat(e.amount), 0),
    compartilhado: expenses.filter(e => e.status === 'confirmed' && e.owner === 'Compartilhado').reduce((sum, e) => sum + parseFloat(e.amount), 0),
    pending: expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount), 0),
  };

  const total = totals.felipe + totals.leticia + totals.compartilhado + totals.pending;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <button className="text-gray-600 hover:text-gray-900">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </button>
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Despesas Gerais</h1>
                <p className="text-sm text-gray-600">A vista • Débito • PIX • Dinheiro</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mês</label>
              <input
                type="month"
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
              <select
                value={filter.payment_method}
                onChange={(e) => setFilter({ ...filter, payment_method: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="all">Todas</option>
                <option value="cash">Dinheiro</option>
                <option value="debit">Débito</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="other">Outros</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-3">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-xs font-medium opacity-90">Felipe</p>
                  <p className="text-lg font-bold mt-1">R$ {totals.felipe.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-30 rounded-full p-2 w-8 h-8 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-pink-500 to-pink-600 p-3">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-xs font-medium opacity-90">Letícia</p>
                  <p className="text-lg font-bold mt-1">R$ {totals.leticia.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-30 rounded-full p-2 w-8 h-8 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-3">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-xs font-medium opacity-90">Compartilhado</p>
                  <p className="text-lg font-bold mt-1">R$ {totals.compartilhado.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-30 rounded-full p-2 w-8 h-8 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 p-3">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-xs font-medium opacity-90">Pendente</p>
                  <p className="text-lg font-bold mt-1">R$ {totals.pending.toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-30 rounded-full p-2 w-8 h-8 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800">Despesas Gerais</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Forma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Responsável</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(expense.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      <div className="max-w-xs truncate" title={expense.description}>
                        {expense.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.payment_method === 'cash' && '💵 Dinheiro'}
                      {expense.payment_method === 'debit' && '💳 Débito'}
                      {expense.payment_method === 'pix' && '📱 PIX'}
                      {expense.payment_method === 'credit_card' && '💳 Crédito'}
                      {expense.payment_method === 'other' && '📄 Outros'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        expense.owner === 'Felipe' ? 'bg-blue-100 text-blue-800' :
                        expense.owner === 'Leticia' ? 'bg-pink-100 text-pink-800' :
                        expense.owner === 'Compartilhado' ? 'bg-purple-100 text-purple-800' :
                        'text-gray-400'
                      }`}>
                        {expense.owner || '-'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      R$ {parseFloat(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        expense.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {expense.status === 'confirmed' ? 'Confirmado' : 
                         expense.status === 'pending' ? 'Pendente' : expense.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleEdit(expense)}
                        className="text-purple-600 hover:text-purple-900 font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {expenses.length === 0 && (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600">Nenhuma despesa encontrada</p>
              <p className="text-sm text-gray-500 mt-1">Envie uma mensagem no WhatsApp para registrar!</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal de edição */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Responsável</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
              <select
                value={editOwner}
                onChange={(e) => setEditOwner(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Selecione...</option>
                <option value="Felipe">Felipe</option>
                <option value="Leticia">Letícia</option>
                <option value="Compartilhado">Compartilhado</option>
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEditingId(null)}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

