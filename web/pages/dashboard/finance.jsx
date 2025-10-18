import { useEffect, useState } from 'react';
import { buildOwnerColorMap, normalizeKey, textColorForBg } from '../../lib/colors';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import { useOrganization } from '../../hooks/useOrganization';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import NotificationModal from '../../components/NotificationModal';
import { TrendingUp, Bell, Settings, Search, LogOut, Calendar, Users, Target, Edit, Trash2, CreditCard } from 'lucide-react';
import { normalizeName, isSameName } from '../../utils/nameNormalizer';

export default function FinanceDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { organization, costCenters, loading: orgLoading, error: orgError, user: orgUser } = useOrganization();
  
  // Fallback para quando V2 não está configurado
  const isV2Ready = organization && organization.id !== 'default-org';
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: '2025-10', // Temporariamente fixo para outubro 2025
    owner: 'all',
    payment_method: 'all',
    card_id: null
  });
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({
    owner: '',
    description: '',
    category: '',
    payment_method: '',
    amount: '',
    date: ''
  });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  
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
      fetchCards();
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
      setPageLoading(true);
      
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
      }

      // Filtro por cartão (só se payment_method = credit_card)
      if (filter.payment_method === 'credit_card' && filter.card_id) {
        query = query.eq('card_id', filter.card_id);
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
      setPageLoading(false);
    }
  };

  const fetchCards = async () => {
    if (orgLoading) return;
    
    setCardsLoading(true);
    try {
      console.log('🔍 [FINANCE] Starting fetchCards...');
      
      let query = supabase
        .from('cards')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // Escopo por organização (V2) - só se V2 estiver configurado
      if (isV2Ready) {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [FINANCE] Erro ao buscar cartões:', error);
        return;
      }

      console.log('✅ [FINANCE] Cartões carregados:', data?.length || 0);
      setCards(data || []);
    } catch (error) {
      console.error('❌ [FINANCE] Erro ao buscar cartões:', error);
    } finally {
      setCardsLoading(false);
    }
  };

  const handleEdit = (expense) => {
    setEditingId(expense.id);
    setEditData({
      owner: expense.owner || '',
      description: expense.description || '',
      category: expense.category || '',
      payment_method: expense.payment_method || '',
      amount: expense.amount || '',
      date: expense.date || ''
    });
  };

  const handleSave = async () => {
    if (!editData.owner || !editData.description || !editData.amount) {
      alert('Preencha todos os campos obrigatórios');
      return;
    }

    setSaving(true);
    try {
      // Buscar a despesa para verificar se tem parcelas
      const expense = expenses.find(e => e.id === editingId);
      const hasInstallments = expense?.parent_expense_id || expense?.installment_info;
      
      const updateData = {
        owner: editData.owner,
        description: editData.description,
        category: editData.category,
        payment_method: editData.payment_method,
        amount: parseFloat(editData.amount),
        date: editData.date,
        status: 'confirmed',
        split: editData.owner === 'Compartilhado',
        confirmed_at: new Date().toISOString()
      };

      if (hasInstallments) {
        // Atualizar todas as parcelas relacionadas (exceto installment_info)
        const { error } = await supabase
          .from('expenses')
          .update(updateData)
          .or(`id.eq.${editingId},parent_expense_id.eq.${editingId}`);
        
        if (error) throw error;
        
        alert('Todas as parcelas foram atualizadas com sucesso!');
      } else {
        // Atualizar despesa única
        const { error } = await supabase
          .from('expenses')
          .update(updateData)
          .eq('id', editingId);
        
        if (error) throw error;
        
        alert('Despesa atualizada com sucesso!');
      }

      setEditingId(null);
      setEditData({
        owner: '',
        description: '',
        category: '',
        payment_method: '',
        amount: '',
        date: ''
      });
      fetchExpenses();

    } catch (error) {
      console.error('Erro ao atualizar:', error);
      alert('Erro ao atualizar despesa');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (expenseId) => {
    // Buscar a despesa para verificar se tem parcelas
    const expense = expenses.find(e => e.id === expenseId);
    const hasInstallments = expense?.parent_expense_id || expense?.installment_info;
    
    let confirmMessage = 'Tem certeza que deseja excluir esta despesa?';
    if (hasInstallments) {
      // Buscar todas as parcelas relacionadas
      const { data: relatedExpenses } = await supabase
        .from('expenses')
        .select('id, installment_info')
        .or(`id.eq.${expenseId},parent_expense_id.eq.${expenseId}`);
      
      const totalInstallments = relatedExpenses?.length || 1;
      confirmMessage = `Esta despesa possui ${totalInstallments} parcelas. Todas serão excluídas. Tem certeza?`;
    }

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeleting(true);
    try {
      if (hasInstallments) {
        // Excluir todas as parcelas relacionadas
        const { error } = await supabase
          .from('expenses')
          .delete()
          .or(`id.eq.${expenseId},parent_expense_id.eq.${expenseId}`);
        
        if (error) throw error;
      } else {
        // Excluir despesa única
        const { error } = await supabase
          .from('expenses')
          .delete()
          .eq('id', expenseId);
        
        if (error) throw error;
      }

      fetchExpenses();
      alert(hasInstallments ? 'Todas as parcelas foram excluídas com sucesso!' : 'Despesa excluída com sucesso!');

    } catch (error) {
      console.error('Erro ao excluir:', error);
      alert('Erro ao excluir despesa');
    } finally {
      setDeleting(false);
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

  // Loading inicial enquanto organização carrega
  if (orgLoading || pageLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando despesas...</p>
        </div>
      </div>
    );
  }

  // Erro de organização
  if (orgError) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {orgError}</div>
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
          <button
            onClick={() => router.push('/')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700"
          >
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header igual ao /dashboard */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <div>
                <Link href="/dashboard">
                  <h1 className="text-2xl font-bold text-gray-900 hover:text-blue-600 cursor-pointer transition-colors">
                    {organization?.name || 'FinTrack'}
                  </h1>
                </Link>
                <p className="text-sm text-gray-600">{orgUser?.name || 'Usuário'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={() => setShowNotificationModal(true)}>
                <Bell className="h-4 w-4" />
              </Button>
              <Link href="/dashboard/config"><Button variant="ghost" size="icon"><Settings className="h-4 w-4" /></Button></Link>
              <Button variant="outline" onClick={handleLogout} className="text-red-600 border-red-200 hover:bg-red-50"><LogOut className="h-4 w-4 mr-2" /> Sair</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Summary Cards dinâmicos */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {uniqueOwners.map((owner) => {
            const oc = buildOwnerColorMap(costCenters);
            const bg = owner && normalizeKey(owner) === normalizeKey('Compartilhado') ? '#8B5CF6' : (oc[normalizeKey(owner)] || '#6366F1');
            const fg = textColorForBg(bg);
            const isShared = normalizeKey(owner) === normalizeKey('Compartilhado');
            
            return (
              <Card key={owner} className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    {owner}
                  </CardTitle>
                  <div className="p-2 rounded-lg" style={{ backgroundColor: `${bg}20` }}>
                    <Users className="h-4 w-4" style={{ color: bg }} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    R$ {Number(totals[owner] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {isShared ? 'Despesas compartilhadas' : 'Gastos individuais'}
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* Card Crédito */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Crédito
              </CardTitle>
              <div className="p-2 rounded-lg bg-blue-50">
                <CreditCard className="h-4 w-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {Number(expenses
                  .filter(expense => expense.payment_method === 'credit_card')
                  .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
                ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Gastos em cartão de crédito
              </p>
            </CardContent>
          </Card>

          {/* Card Soma do Mês */}
          <Card className="border-0 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Soma do Mês
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-50">
                <Target className="h-4 w-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {Number(Object.values(totals).reduce((sum, val) => sum + (Number(val) || 0), 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Total de todas as despesas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Responsável</label>
              <select
                value={filter.owner}
                onChange={(e) => setFilter({ ...filter, owner: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todas</option>
                <option value="cash">Dinheiro</option>
                  <option value="debit_card">Débito</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="other">Outros</option>
              </select>
            </div>

            {/* Filtro Por Cartão - só aparece quando Forma = Cartão de Crédito */}
            {filter.payment_method === 'credit_card' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Por Cartão</label>
                <select
                  value={filter.card_id || 'all'}
                  onChange={(e) => setFilter({ ...filter, card_id: e.target.value === 'all' ? null : e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="all">Todos os cartões</option>
                  {cards.map(card => (
                    <option key={card.id} value={card.id}>{card.name}</option>
                  ))}
                </select>
              </div>
            )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Table */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-gradient-to-r from-green-500 to-blue-600 rounded-lg">
                <TrendingUp className="h-4 w-4 text-white" />
              </div>
              <span>Despesas Gerais</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cartão</th>
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
                        {expense.installment_info && (
                          <span className="text-gray-500 ml-1">
                            ({expense.installment_info.current_installment}/{expense.installment_info.total_installments})
                          </span>
                        )}
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.card_id ? (() => {
                        const card = cards.find(c => c.id === expense.card_id);
                        return card ? card.name : '-';
                      })() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const oc = buildOwnerColorMap(costCenters);
                        const color = expense.owner ? (oc[normalizeKey(expense.owner)] || '#6366F1') : '#6B7280';
                        return (
                          <span className="text-sm font-medium" style={{ color: color }}>
                            {expense.owner || '-'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      R$ {parseFloat(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(expense)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title="Editar despesa"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title="Excluir despesa"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
          </CardContent>
        </Card>
      </main>

      {/* Modal de edição */}
      {editingId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">Editar Despesa</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Responsável *</label>
                <select
                  value={editData.owner}
                  onChange={(e) => setEditData({...editData, owner: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione...</option>
                  {uniqueOwners.map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data *</label>
                <input
                  type="date"
                  value={editData.date}
                  onChange={(e) => setEditData({...editData, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrição *</label>
                <input
                  type="text"
                  value={editData.description}
                  onChange={(e) => setEditData({...editData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Descrição da despesa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Categoria</label>
                <input
                  type="text"
                  value={editData.category}
                  onChange={(e) => setEditData({...editData, category: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Ex: Alimentação, Transporte"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Valor *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editData.amount}
                  onChange={(e) => setEditData({...editData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="0.00"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Forma de Pagamento</label>
                <select
                  value={editData.payment_method}
                  onChange={(e) => setEditData({...editData, payment_method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">Selecione...</option>
                  <option value="cash">Dinheiro</option>
                  <option value="debit_card">Cartão de Débito</option>
                  <option value="pix">PIX</option>
                  <option value="credit_card">Cartão de Crédito</option>
                  <option value="bank_transfer">Transferência</option>
                  <option value="boleto">Boleto</option>
                  <option value="other">Outros</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditData({
                    owner: '',
                    description: '',
                    category: '',
                    payment_method: '',
                    amount: '',
                    date: ''
                  });
                }}
                disabled={saving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />
    </div>
  );
}

