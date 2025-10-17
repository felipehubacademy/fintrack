import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import { useOrganization } from '../../hooks/useOrganization';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { TrendingUp, Bell, Settings, Search, LogOut, Calendar } from 'lucide-react';
import { normalizeName, isSameName } from '../../utils/nameNormalizer';

export default function FinanceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { organization, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  
  // Fallback para quando V2 não está configurado
  const isV2Ready = organization && organization.id !== 'default-org';
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: '2025-10', // Temporariamente fixo para outubro 2025
    owner: 'all',
    payment_method: 'all'
  });
  const [editingId, setEditingId] = useState(null);
  const [editOwner, setEditOwner] = useState('');
  const [saving, setSaving] = useState(false);
  
  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      console.log('🔍 [FINANCE] Fetching expenses with:', { 
        user: user?.id, 
        filter, 
        orgLoading, 
        orgError, 
        organization,
        isV2Ready 
      });
      fetchExpenses();
    }
  }, [user, filter, isV2Ready]);

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
        .from('expenses')
        .select('*')
        .eq('status', 'confirmed')
        .order('date', { ascending: false });

      if (filter.month) {
        const startOfMonth = `${filter.month}-01`;
        // Corrigir cálculo do último dia do mês
        const [year, month] = filter.month.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

        query = query.gte('date', startOfMonth).lte('date', endOfMonthStr);
      }

      if (filter.owner !== 'all') {
        // Usar normalização para filtrar por responsável
        const { data: allExpenses } = await supabase
          .from('expenses')
          .select('*')
          .eq('status', 'confirmed')
          .eq('organization_id', organization.id);
        
        const filteredExpenses = allExpenses?.filter(expense => 
          isSameName(expense.owner, filter.owner)
        ) || [];
        
        // Retornar apenas os IDs filtrados
        const filteredIds = filteredExpenses.map(exp => exp.id);
        if (filteredIds.length > 0) {
          query = query.in('id', filteredIds);
        } else {
          // Se não encontrou nenhum, retornar array vazio
          query = query.eq('id', -1); // ID que não existe
        }
      }

      if (filter.payment_method !== 'all') {
        query = query.eq('payment_method', filter.payment_method);
      } else {
        // Por padrão, mostrar apenas despesas que NÃO são de cartão
        query = query.neq('payment_method', 'credit_card');
      }

      // Escopo por organização (V2) - só se V2 estiver configurado
      if (isV2Ready) {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      console.log('🔍 [FINANCE] Query result:', {
        dataLength: data?.length || 0,
        data: data,
        filter,
        organizationId: organization?.id,
        isV2Ready,
        queryString: query.toString()
      });

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
        .from('expenses')
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

  // Função para ordenar despesas
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Função para obter ícone de ordenação
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-400">↕️</span>;
    }
    return sortConfig.direction === 'asc' ? <span className="text-blue-600">↑</span> : <span className="text-blue-600">↓</span>;
  };

  // Função para ordenar array de despesas
  const sortExpenses = (expenses) => {
    return [...expenses].sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];

      // Tratamento especial para cada tipo de coluna
      switch (sortConfig.key) {
        case 'date':
          aValue = new Date(aValue + 'T00:00:00');
          bValue = new Date(bValue + 'T00:00:00');
          break;
        case 'amount':
          aValue = parseFloat(aValue || 0);
          bValue = parseFloat(bValue || 0);
          break;
        case 'category':
        case 'owner':
        case 'payment_method':
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
          break;
        default:
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  };

  // Calcular totais dinamicamente por centro de custo
  // Usar normalização para evitar duplicatas (ex: "Leticia" vs "Letícia")
  const allOwners = expenses.map(e => e.owner).filter(Boolean);
  const uniqueOwners = [];
  const seenOwners = new Set();
  
  allOwners.forEach(owner => {
    const normalized = normalizeName(owner);
    if (!seenOwners.has(normalized)) {
      seenOwners.add(normalized);
      uniqueOwners.push(owner);
    }
  });
  
  const totals = {};
  
  uniqueOwners.forEach(owner => {
    totals[owner] = expenses.filter(e => e.status === 'confirmed' && isSameName(e.owner, owner)).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  });
  
  totals.pending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  console.log('🔍 [DEBUG] Totals calculados:', totals);
  console.log('🔍 [DEBUG] Unique owners:', uniqueOwners);

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header (consistente com /cards) */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard">
                <Button variant="ghost" size="icon">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                </Button>
              </Link>
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Despesas</h1>
                <p className="text-sm text-gray-600">PIX • Débito • Dinheiro</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon"><Search className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><Bell className="h-4 w-4" /></Button>
              <Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50">
                <LogOut className="h-4 w-4 mr-2" /> Sair
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters (cards-style) */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Calendar className="h-4 w-4 text-white" />
              </div>
              <span>Filtros</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                {isV2Ready ? (
                  // V2: usar costCenters dinâmicos
                  <>
                    {(costCenters || []).map(cc => (
                      <option key={cc.id || cc.name} value={cc.name}>{cc.name}</option>
                    ))}
                    {!costCenters?.some(cc => cc.name === 'Compartilhado') && (
                      <option value="Compartilhado">Compartilhado</option>
                    )}
                  </>
                ) : (
                  // V1: usar opções dinâmicas baseadas nos dados existentes
                  <>
                    {uniqueOwners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </>
                )}
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
                  <option value="debit_card">Débito</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="other">Outros</option>
              </select>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Cards dinâmicos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
          {uniqueOwners.map((owner, index) => {
            // Cores específicas para cada responsável
            let colorClass;
            if (isSameName(owner, 'Compartilhado')) {
              colorClass = 'from-green-500 to-green-600';
            } else if (isSameName(owner, 'Letícia')) {
              colorClass = 'from-purple-500 to-purple-600';
            } else {
              // Cores padrão para outros responsáveis
              const colors = [
                'from-blue-500 to-blue-600',
                'from-pink-500 to-pink-600', 
                'from-orange-500 to-orange-600',
                'from-teal-500 to-teal-600'
              ];
              colorClass = colors[index % colors.length];
            }
            
            return (
              <div key={owner} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className={`bg-gradient-to-r ${colorClass} p-3`}>
                  <div className="flex items-center justify-between text-white">
                    <div>
                      <p className="text-xs font-medium opacity-90">{owner}</p>
                      <p className="text-lg font-bold mt-1">R$ {Number(totals[owner] || 0).toFixed(2)}</p>
                    </div>
                    <div className="bg-white bg-opacity-30 rounded-full p-2 w-8 h-8 flex items-center justify-center">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Card Soma do Mês */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-3">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-xs font-medium opacity-90">Soma do Mês</p>
                  <p className="text-lg font-bold mt-1">R$ {Number(Object.values(totals).reduce((sum, val) => sum + (Number(val) || 0), 0)).toFixed(2)}</p>
                </div>
                <div className="bg-white bg-opacity-30 rounded-full p-2 w-8 h-8 flex items-center justify-center">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('date')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Data</span>
                      {getSortIcon('date')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Categoria</span>
                      {getSortIcon('category')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('payment_method')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Forma</span>
                      {getSortIcon('payment_method')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('owner')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Responsável</span>
                      {getSortIcon('owner')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    onClick={() => handleSort('amount')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Valor</span>
                      {getSortIcon('amount')}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortExpenses(expenses).map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {expense.date ? new Date(expense.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
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
                      {expense.payment_method === 'debit_card' && '💳 Cartão de Débito'}
                      {expense.payment_method === 'pix' && '📱 PIX'}
                      {expense.payment_method === 'credit_card' && '💳 Cartão de Crédito'}
                      {expense.payment_method === 'bank_transfer' && '🏦 Transferência'}
                      {expense.payment_method === 'boleto' && '📄 Boleto'}
                      {expense.payment_method === 'other' && '📄 Outros'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        isSameName(expense.owner, 'Compartilhado') ? 'bg-green-100 text-green-800' :
                        isSameName(expense.owner, 'Letícia') ? 'bg-purple-100 text-purple-800' :
                        'bg-blue-100 text-blue-800'
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
                {uniqueOwners.map(owner => (
                  <option key={owner} value={owner}>{owner}</option>
                ))}
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

