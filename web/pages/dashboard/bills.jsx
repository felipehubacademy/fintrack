import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import StatsCard from '../../components/ui/StatsCard';
import BillModal from '../../components/BillModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import LoadingLogo from '../../components/LoadingLogo';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
import { 
  Calendar, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  XCircle,
  DollarSign,
  Filter,
  Clock,
  CreditCard
} from 'lucide-react';

export default function BillsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError } = useOrganization();
  const { success, error: showError, warning } = useNotificationContext();
  
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBill, setEditingBill] = useState(null);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [filter, setFilter] = useState('all'); // all, pending, paid, overdue
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterOwner, setFilterOwner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'asc' });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [billToDelete, setBillToDelete] = useState(null);
  const [billToMarkAsPaid, setBillToMarkAsPaid] = useState(null);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchBills();
      fetchCategories();
      fetchCards();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization]);

  const fetchBills = async () => {
    setIsDataLoaded(false);
    try {
      setLoading(true);
      
      let query = supabase
        .from('bills')
        .select(`
          *,
          category:budget_categories(name, color),
          cost_center:cost_centers(name, color),
          card:cards(name, bank)
        `)
        .eq('organization_id', organization.id)
        .order('due_date', { ascending: true });

      const { data, error } = await query;
      
      if (error) throw error;

      // Atualizar status overdue automaticamente
      const today = new Date().toISOString().split('T')[0];
      const updatedBills = data.map(bill => {
        if (bill.status === 'pending' && bill.due_date < today) {
          return { ...bill, status: 'overdue' };
        }
        return bill;
      });

      setBills(updatedBills);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      // Buscar categorias da organização + globais (do tipo expense ou both)
      const [orgCategories, globalCategories] = await Promise.all([
        supabase
          .from('budget_categories')
          .select('*')
          .eq('organization_id', organization.id)
          .or('type.eq.expense,type.eq.both')
          .order('name'),
        supabase
          .from('budget_categories')
          .select('*')
          .is('organization_id', null)
          .or('type.eq.expense,type.eq.both')
          .order('name')
      ]);

      if (orgCategories.error) throw orgCategories.error;
      if (globalCategories.error) throw globalCategories.error;

      // Combinar categorias da org + globais (sem duplicatas)
      const orgCategoriesList = orgCategories.data || [];
      const globalCategoriesList = globalCategories.data || [];
      
      // Criar map de nomes de categorias da org para evitar duplicatas
      const orgCategoryNames = new Set(orgCategoriesList.map(c => c.name));
      
      // Adicionar categorias da org primeiro
      let allCategories = [...orgCategoriesList];
      
      // Adicionar apenas globais que NÃO existem na org
      const uniqueGlobals = globalCategoriesList.filter(globalCat => 
        !orgCategoryNames.has(globalCat.name)
      );
      
      allCategories = [...allCategories, ...uniqueGlobals];
      
      setCategories(allCategories);
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  };

  const fetchCards = async () => {
    try {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCards(data || []);
    } catch (error) {
      console.error('Erro ao buscar cartões:', error);
    }
  };

  const handleCreateBill = async (billData) => {
    try {
      console.log('💾 [BILLS] Criando conta com dados:', billData);
      console.log('💾 [BILLS] organization_id:', organization.id);
      console.log('💾 [BILLS] user_id:', orgUser.id);
      
      // Preparar dados para inserção
      const insertData = {
        ...billData,
        organization_id: organization.id,
        user_id: orgUser.id,
        status: 'pending'
      };
      
      // Se is_shared causar erro (coluna não existe), remover e tentar novamente
      let { data, error } = await supabase
        .from('bills')
        .insert(insertData)
        .select();
      
      // Se erro for sobre is_shared não existir, remover e tentar novamente
      if (error && error.code === 'PGRST204' && error.message?.includes('is_shared')) {
        console.warn('⚠️ [BILLS] Coluna is_shared não encontrada, removendo do insert...');
        const { is_shared, ...dataWithoutIsShared } = insertData;
        const retryResult = await supabase
          .from('bills')
          .insert(dataWithoutIsShared)
          .select();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error('❌ [BILLS] Erro do Supabase:', error);
        throw error;
      }
      
      console.log('✅ [BILLS] Conta criada com sucesso:', data);

      await fetchBills();
      setShowModal(false);
      success('Conta criada com sucesso!');
    } catch (error) {
      console.error('❌ [BILLS] Erro ao criar conta:', error);
      const errorMessage = error?.message || error?.details || 'Erro desconhecido';
      showError(`Erro ao criar conta: ${errorMessage}`);
      throw error;
    }
  };

  const handleUpdateBill = async (billData) => {
    try {
      console.log('💾 [BILLS] Atualizando conta:', editingBill.id, 'com dados:', billData);
      
      // Preparar dados para atualização
      let updateData = { ...billData };
      
      // Tentar atualizar primeiro
      let { data, error } = await supabase
        .from('bills')
        .update(updateData)
        .eq('id', editingBill.id)
        .select();
      
      // Se erro for sobre is_shared não existir, remover e tentar novamente
      if (error && error.code === 'PGRST204' && error.message?.includes('is_shared')) {
        console.warn('⚠️ [BILLS] Coluna is_shared não encontrada, removendo do update...');
        const { is_shared, ...dataWithoutIsShared } = updateData;
        const retryResult = await supabase
          .from('bills')
          .update(dataWithoutIsShared)
          .eq('id', editingBill.id)
          .select();
        data = retryResult.data;
        error = retryResult.error;
      }

      if (error) {
        console.error('❌ [BILLS] Erro do Supabase:', error);
        throw error;
      }
      
      console.log('✅ [BILLS] Conta atualizada com sucesso:', data);

      await fetchBills();
      setShowModal(false);
      setEditingBill(null);
      success('Conta atualizada com sucesso!');
    } catch (error) {
      console.error('❌ [BILLS] Erro ao atualizar conta:', error);
      const errorMessage = error?.message || error?.details || 'Erro desconhecido';
      showError(`Erro ao atualizar conta: ${errorMessage}`);
      throw error;
    }
  };

  const handleMarkAsPaid = (bill) => {
    if (!bill.payment_method) {
      warning('Por favor, edite a conta e defina um método de pagamento antes de marcar como paga.');
      return;
    }

    setBillToMarkAsPaid(bill);
    setShowConfirmModal(true);
  };

  const confirmMarkAsPaid = async () => {
    if (!billToMarkAsPaid) return;

    try {
      // TODO: Perguntar se é individual ou compartilhado aqui
      // Por enquanto, usamos o cost_center_id da bill como individual
      // Se cost_center_id for NULL, considera-se compartilhado
      
      const isShared = !billToMarkAsPaid.cost_center_id;
      
      // 1. Criar expense correspondente
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert({
          description: billToMarkAsPaid.description,
          amount: billToMarkAsPaid.amount,
          date: new Date().toISOString().split('T')[0],
          category_id: billToMarkAsPaid.category_id,
          cost_center_id: billToMarkAsPaid.cost_center_id, // NULL se compartilhado
          owner: billToMarkAsPaid.cost_center_id ? undefined : (organization?.name || 'Organização'),
          is_shared: isShared,
          payment_method: billToMarkAsPaid.payment_method,
          card_id: billToMarkAsPaid.card_id,
          status: 'confirmed',
          organization_id: organization.id,
          user_id: orgUser.id,
          source: 'manual'
        })
        .select()
        .single();

      if (expenseError) throw expenseError;

      // 2. Se for compartilhado, criar splits
      if (isShared) {
        // Criar splits para todos os cost centers ativos
        const activeCenters = (costCenters || []).filter(cc => cc.is_active !== false && cc.user_id);
        const splitsToInsert = activeCenters.map(cc => ({
          expense_id: expense.id,
          cost_center_id: cc.id,
          percentage: parseFloat(cc.default_split_percentage || 50),
          amount: (billToMarkAsPaid.amount * parseFloat(cc.default_split_percentage || 50)) / 100
        }));

        if (splitsToInsert.length > 0) {
          const { error: splitError } = await supabase
            .from('expense_splits')
            .insert(splitsToInsert);

          if (splitError) throw splitError;
        }
      }

      // 3. Atualizar bill
      const { error: billError } = await supabase
        .from('bills')
        .update({
          status: 'paid',
          paid_at: new Date().toISOString(),
          expense_id: expense.id
        })
        .eq('id', billToMarkAsPaid.id);

      if (billError) throw billError;

      // 4. Se for recorrente, criar próxima conta
      if (billToMarkAsPaid.is_recurring) {
        await createRecurringBill(billToMarkAsPaid);
      }

      await fetchBills();
      success('Conta marcada como paga com sucesso!');
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      showError('Erro ao processar pagamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setBillToMarkAsPaid(null);
    }
  };

  const createRecurringBill = async (bill) => {
    try {
      let nextDueDate = new Date(bill.due_date + 'T00:00:00');
      
      switch (bill.recurrence_frequency) {
        case 'monthly':
          nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          break;
        case 'weekly':
          nextDueDate.setDate(nextDueDate.getDate() + 7);
          break;
        case 'yearly':
          nextDueDate.setFullYear(nextDueDate.getFullYear() + 1);
          break;
      }

      const { error } = await supabase
        .from('bills')
        .insert({
          description: bill.description,
          amount: bill.amount,
          due_date: nextDueDate.toISOString().split('T')[0],
          category_id: bill.category_id,
          cost_center_id: bill.cost_center_id,
          is_recurring: true,
          recurrence_frequency: bill.recurrence_frequency,
          payment_method: bill.payment_method,
          card_id: bill.card_id,
          organization_id: organization.id,
          user_id: orgUser.id,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao criar conta recorrente:', error);
    }
  };

  const handleDeleteBill = (billId) => {
    setBillToDelete(billId);
    setShowConfirmModal(true);
  };

  const confirmDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      const { error } = await supabase
        .from('bills')
        .update({ status: 'cancelled' })
        .eq('id', billToDelete);

      if (error) throw error;

      await fetchBills();
      success('Conta excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      showError('Erro ao excluir conta: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setBillToDelete(null);
    }
  };

  const openAddModal = () => {
    setEditingBill(null);
    setShowModal(true);
  };

  const openEditModal = (bill) => {
    setEditingBill(bill);
    setShowModal(true);
  };

  const getFilteredBills = () => {
    let filtered = bills.filter(b => b.status !== 'cancelled');
    
    // Filtro por status
    if (filter !== 'all') {
      filtered = filtered.filter(b => b.status === filter);
    }
    
    // Filtro por categoria
    if (filterCategory) {
      filtered = filtered.filter(b => b.category_id === filterCategory);
    }
    
    // Filtro por responsável
    if (filterOwner) {
      if (filterOwner === 'shared') {
        filtered = filtered.filter(b => b.is_shared || !b.cost_center_id);
      } else {
        filtered = filtered.filter(b => b.cost_center_id === filterOwner);
      }
    }
    
    // Busca por descrição
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(b => 
        b.description.toLowerCase().includes(query)
      );
    }
    
    // Ordenação
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortConfig.key) {
        case 'due_date':
          aValue = new Date(a.due_date);
          bValue = new Date(b.due_date);
          break;
        case 'amount':
          aValue = parseFloat(a.amount || 0);
          bValue = parseFloat(b.amount || 0);
          break;
        case 'description':
          aValue = a.description?.toLowerCase() || '';
          bValue = b.description?.toLowerCase() || '';
          break;
        case 'status':
          aValue = a.status || '';
          bValue = b.status || '';
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    
    return filtered;
  };
  
  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <span className="text-gray-400">↕️</span>;
    }
    return sortConfig.direction === 'asc' ? <span className="text-gray-700 font-medium">↑</span> : <span className="text-gray-700 font-medium">↓</span>;
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pendente', className: 'bg-gray-100 text-gray-700 border border-gray-200' },
      paid: { label: 'Paga', className: 'bg-gray-100 text-gray-700 border border-gray-200' },
      overdue: { label: 'Vencida', className: 'bg-gray-200 text-gray-800 border border-gray-300 font-medium' },
      cancelled: { label: 'Cancelada', className: 'bg-gray-100 text-gray-600 border border-gray-200' }
    };
    return badges[status] || badges.pending;
  };

  const getDaysUntilDue = (dueDate) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset para início do dia
    
    const due = new Date(dueDate + 'T00:00:00');
    due.setHours(0, 0, 0, 0); // Reset para início do dia
    
    const diffTime = due - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (orgLoading || !isDataLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  if (orgError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">❌ {orgError}</div>
          <Button onClick={() => router.push('/')}>Voltar ao início</Button>
        </div>
      </div>
    );
  }

  const filteredBills = getFilteredBills();
  const pendingCount = bills.filter(b => b.status === 'pending').length;
  const overdueCount = bills.filter(b => b.status === 'overdue').length;
  const totalPending = bills
    .filter(b => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + Number(b.amount), 0);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Contas a Pagar"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Contas a Pagar</h2>
                <p className="text-sm text-gray-600">Gerencie suas contas e vencimentos</p>
              </div>
              <Button 
                onClick={openAddModal}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Conta
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Stats */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3 w-full">
          <StatsCard
            title="Contas Pendentes"
            value={pendingCount}
            icon={Clock}
            color="text-gray-600"
            bgColor="bg-gray-50"
            borderColor="border-gray-200"
          />

          <StatsCard
            title="Contas Vencidas"
            value={overdueCount}
            icon={AlertCircle}
            color="text-gray-600"
            bgColor="bg-gray-50"
            borderColor="border-gray-200"
          />

          <StatsCard
            title="Valor Total Pendente"
            value={`R$ ${totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
            icon={DollarSign}
            color="text-gray-600"
            bgColor="bg-gray-50"
            borderColor="border-gray-200"
          />
        </div>

        {/* Filters */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Filter className="h-4 w-4 text-gray-600" />
                </div>
                <span>Filtros</span>
              </CardTitle>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center space-x-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
              >
                <span>{showFilters ? 'Recolher' : 'Expandir'}</span>
                <svg 
                  className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </CardHeader>
          {showFilters && (
            <CardContent className="px-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Status */}
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    style={{ height: '48px', boxSizing: 'border-box' }}
                  >
                    <option value="all">Todas</option>
                    <option value="pending">Pendentes</option>
                    <option value="overdue">Vencidas</option>
                    <option value="paid">Pagas</option>
                  </select>
                </div>

                {/* Categoria */}
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Categoria
                      {filterCategory && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Filtrado
                        </span>
                      )}
                    </label>
                    {filterCategory && (
                      <button
                        onClick={() => setFilterCategory(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <select
                    value={filterCategory || 'all'}
                    onChange={(e) => setFilterCategory(e.target.value === 'all' ? null : e.target.value)}
                    className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    style={{ height: '48px', boxSizing: 'border-box' }}
                  >
                    <option value="all">Todas as categorias</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                {/* Responsável */}
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Responsável
                      {filterOwner && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Filtrado
                        </span>
                      )}
                    </label>
                    {filterOwner && (
                      <button
                        onClick={() => setFilterOwner(null)}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Limpar
                      </button>
                    )}
                  </div>
                  <select
                    value={filterOwner || 'all'}
                    onChange={(e) => setFilterOwner(e.target.value === 'all' ? null : e.target.value)}
                    className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    style={{ height: '48px', boxSizing: 'border-box' }}
                  >
                    <option value="all">Todos</option>
                    <option value="shared">Compartilhado</option>
                    {(costCenters || []).map(cc => (
                      <option key={cc.id} value={cc.id}>{cc.name}</option>
                    ))}
                  </select>
                </div>

                {/* Busca por descrição */}
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700">Buscar</label>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Descrição..."
                    className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                    style={{ height: '48px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
              
              {/* Contador de resultados */}
              {filteredBills.length !== bills.filter(b => b.status !== 'cancelled').length && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    {filteredBills.length} conta{filteredBills.length !== 1 ? 's' : ''} encontrada{filteredBills.length !== 1 ? 's' : ''}
                    {filteredBills.length > 0 && (
                      <span className="ml-2 text-gray-500">
                        (Total: R$ {filteredBills.reduce((sum, b) => sum + parseFloat(b.amount || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* Bills List */}
        {filteredBills.length === 0 ? (
          <Card className="border border-gray-200">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhuma conta encontrada
              </h3>
              <p className="text-gray-600 mb-6">
                {filter === 'all' 
                  ? 'Adicione suas contas para gerenciar vencimentos'
                  : `Nenhuma conta ${filter === 'pending' ? 'pendente' : filter === 'overdue' ? 'vencida' : 'paga'}`
                }
              </p>
              {filter === 'all' && (
                <Button onClick={openAddModal} className="bg-flight-blue hover:bg-flight-blue/90 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Primeira Conta
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {/* Header da lista com ordenação */}
            <Card className="border border-gray-200 bg-gray-50">
              <CardContent className="p-4">
                <div className="grid grid-cols-12 gap-4 items-center text-sm font-semibold text-gray-700">
                  <div 
                    className="col-span-4 cursor-pointer hover:text-gray-900 flex items-center space-x-1 transition-colors"
                    onClick={() => handleSort('description')}
                  >
                    <span>Descrição</span>
                    {getSortIcon('description')}
                  </div>
                  <div 
                    className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center space-x-1 transition-colors"
                    onClick={() => handleSort('due_date')}
                  >
                    <span>Vencimento</span>
                    {getSortIcon('due_date')}
                  </div>
                  <div 
                    className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center space-x-1 transition-colors"
                    onClick={() => handleSort('amount')}
                  >
                    <span>Valor</span>
                    {getSortIcon('amount')}
                  </div>
                  <div 
                    className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center space-x-1 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <span>Status</span>
                    {getSortIcon('status')}
                  </div>
                  <div className="col-span-2 text-right">Ações</div>
                </div>
              </CardContent>
            </Card>
            
            {filteredBills.map((bill) => {
              const daysUntil = getDaysUntilDue(bill.due_date);
              const statusBadge = getStatusBadge(bill.status);
              
              return (
                <Card key={bill.id} className="border border-gray-200 bg-white hover:shadow-lg hover:border-gray-300 transition-all">
                  <CardContent className="p-4">
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Descrição com badges */}
                      <div className="col-span-4">
                        <div className="flex items-center space-x-2 mb-1">
                          <h3 className="font-semibold text-gray-900">{bill.description}</h3>
                        </div>
                        <div className="flex items-center space-x-2 flex-wrap">
                          <Badge className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                          {bill.is_recurring && (
                            <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-xs">
                              Recorrente
                            </Badge>
                          )}
                          {bill.is_shared && (
                            <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-xs">
                              Compartilhado
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Vencimento */}
                      <div className="col-span-2">
                        <div className="text-sm text-gray-900">
                          {new Date(bill.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </div>
                        {bill.status === 'pending' && daysUntil >= 0 && (
                          <div className={`text-xs mt-1 font-medium ${daysUntil <= 3 ? 'text-gray-800' : daysUntil <= 7 ? 'text-gray-700' : 'text-gray-500'}`}>
                            {daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
                          </div>
                        )}
                      </div>
                      
                      {/* Valor */}
                      <div className="col-span-2">
                        <div className="text-sm font-medium text-gray-900">
                          R$ {Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      
                      {/* Status e Info */}
                      <div className="col-span-2">
                        {bill.category && (
                          <div className="flex items-center space-x-1 text-sm text-gray-600 mb-1">
                            <div 
                              className="w-3 h-3 rounded-full bg-gray-400" 
                            />
                            <span>{bill.category.name}</span>
                          </div>
                        )}
                        {bill.is_shared ? (
                          <span className="text-xs text-gray-600 font-medium">
                            Compartilhado
                          </span>
                        ) : bill.cost_center && (
                          <span className="text-xs text-gray-500">
                            {bill.cost_center.name}
                          </span>
                        )}
                      </div>
                      
                      {/* Ações */}
                      <div className="col-span-2 flex items-center justify-end space-x-2">
                        {bill.status === 'pending' && (
                          <Button
                            onClick={() => handleMarkAsPaid(bill)}
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Marcar como Paga
                          </Button>
                        )}
                        
                        {bill.status !== 'paid' && (
                          <>
                            <Button
                              onClick={() => openEditModal(bill)}
                              size="sm"
                              variant="outline"
                            >
                              Editar
                            </Button>
                            <Button
                              onClick={() => handleDeleteBill(bill.id)}
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Bill Modal */}
        <BillModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setEditingBill(null);
          }}
          onSave={editingBill ? handleUpdateBill : handleCreateBill}
          editingBill={editingBill}
          costCenters={costCenters || []}
          categories={categories}
          cards={cards}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setBillToDelete(null);
          setBillToMarkAsPaid(null);
        }}
        onConfirm={billToDelete ? confirmDeleteBill : confirmMarkAsPaid}
        title={billToDelete ? "Confirmar exclusão" : "Confirmar pagamento"}
        message={
          billToDelete 
            ? "Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita."
            : "Marcar esta conta como paga? Isso criará uma despesa automaticamente."
        }
        confirmText={billToDelete ? "Excluir" : "Marcar como Paga"}
        cancelText="Cancelar"
        type={billToDelete ? "danger" : "warning"}
      />
    </div>
  );
}

