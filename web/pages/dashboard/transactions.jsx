import { useEffect, useState } from 'react';
import { buildOwnerColorMap, normalizeKey, textColorForBg } from '../../lib/colors';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import { useOrganization } from '../../hooks/useOrganization';
import { usePrivacyFilter } from '../../hooks/usePrivacyFilter';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import TransactionModal from '../../components/TransactionModal';
import EditExpenseModal from '../../components/EditExpenseModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import NotificationModal from '../../components/NotificationModal';
import LoadingLogo from '../../components/LoadingLogo';
import { TrendingUp, Bell, Settings, Search, LogOut, Calendar, Users, Target, Edit, Trash2, CreditCard, Plus, DollarSign } from 'lucide-react';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import { normalizeName, isSameName } from '../../utils/nameNormalizer';

export default function TransactionsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { organization, costCenters, budgetCategories, loading: orgLoading, error: orgError, user: orgUser } = useOrganization();
  const { filterByPrivacy } = usePrivacyFilter(organization, orgUser, costCenters);
  const { success, showError } = useNotificationContext();
  const [openTooltip, setOpenTooltip] = useState(null);
  
  
  // Fallback para quando V2 não está configurado
  const isV2Ready = organization && organization.id !== 'default-org';
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: '2025-10', // Temporariamente fixo para outubro 2025
    owner: 'all',
    payment_method: 'all',
    card_id: null,
    category_id: null,
    transactionType: 'all',
    incomeCategory: 'all',
    incomeType: 'all'
  });
  const [editingId, setEditingId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [cards, setCards] = useState([]);
  const [cardsLoading, setCardsLoading] = useState(true);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [transactionToDelete, setTransactionToDelete] = useState(null);

  // Fechar tooltip ao clicar fora em mobile
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openTooltip && !event.target.closest('.relative.group')) {
        setOpenTooltip(null);
      }
    };
    
    if (openTooltip) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [openTooltip]);
  
  // Estado de ordenação
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc'
  });

  useEffect(() => {
    checkUser();
    
    // Verificar se há parâmetros de filtro na URL
    if (router.isReady) {
      const { card } = router.query;
      if (card) {
        setFilter(prev => ({
          ...prev,
          payment_method: 'credit_card',
          card_id: card
        }));
      }
    }
  }, [router.isReady, router.query]);

  useEffect(() => {
    if (user && !orgLoading && organization && isV2Ready) {
      console.log('🔍 [FINANCE] Fetching expenses with:', { 
        user: user?.id, 
        filter, 
        orgLoading, 
        orgError, 
        organization,
        isV2Ready,
        costCentersLength: costCenters?.length || 0
      });
      fetchExpenses();
      fetchIncomes();
      fetchCategories();
    }
  }, [user, filter, isV2Ready, orgLoading, organization, costCenters]);

  // Combinar expenses e incomes após ambos estarem carregados
  useEffect(() => {
    if (expenses.length >= 0 && incomes.length >= 0) {
      const combined = [
        ...expenses.map(e => ({ ...e, type: 'expense' })),
        ...incomes.map(i => ({ ...i, type: 'income' }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setTransactions(combined);
    }
  }, [expenses, incomes]);

  // Buscar cartões quando a organização estiver disponível
  useEffect(() => {
    if (organization?.id && organization.id !== 'default-org') {
      fetchCards();
    }
  }, [organization?.id]);

  // Buscar categorias quando a organização estiver disponível
  useEffect(() => {
    if (organization?.id && organization.id !== 'default-org') {
      fetchCategories();
    }
  }, [organization?.id]);

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
      setIsDataLoaded(false);
      
      let query = supabase
        .from('expenses')
        .select(`
          *,
          expense_splits (
            id,
            cost_center_id,
            percentage,
            amount
          )
        `)
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
          .select(`
            *,
            expense_splits (
              id,
              cost_center_id,
              percentage,
              amount
            )
          `)
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

      // Filtro por categoria
      if (filter.category_id) {
        query = query.eq('category_id', filter.category_id);
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

      // Aplicar filtro de privacidade
      const filteredExpenses = filterByPrivacy(data || []);
      setExpenses(filteredExpenses);
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
      setPageLoading(false);
    }
  };

  const fetchIncomes = async () => {
    if (!organization || !isV2Ready) {
      console.log('⏳ [FINANCE] Aguardando organização para buscar incomes...');
      return;
    }
    
    try {
      const startOfMonth = `${filter.month}-01`;
      const [year, month] = filter.month.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;

      let query = supabase
        .from('incomes')
        .select(`
          *,
          cost_center:cost_centers(name, color),
          income_splits(
            id,
            cost_center_id,
            cost_center:cost_centers(name, color),
            percentage,
            amount
          )
        `)
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonthStr)
        .order('date', { ascending: false });

      const { data, error } = await query;
      
      if (error) throw error;

      // Aplicar filtro de privacidade
      const filteredIncomes = filterByPrivacy(data || []);
      setIncomes(filteredIncomes);
    } catch (error) {
      console.error('Error fetching incomes:', error);
    }
  };

  const fetchCards = async () => {
    setCardsLoading(true);
    try {
      let query = supabase
        .from('cards')
        .select('*')
        .eq('is_active', true)
        .order('name', { ascending: true });

      // Escopo por organização
      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ [FINANCE] Erro ao buscar cartões:', error);
        return;
      }

      setCards(data || []);
    } catch (error) {
      console.error('❌ [FINANCE] Erro ao buscar cartões:', error);
    } finally {
      setCardsLoading(false);
    }
  };

  const fetchCategories = async () => {
    if (!organization?.id || organization.id === 'default-org') {
      return;
    }
    
    try {
      // Buscar categorias da organização + globais
      const [orgResult, globalResult] = await Promise.all([
        supabase
          .from('budget_categories')
          .select('*')
          .eq('organization_id', organization.id)
          .order('name', { ascending: true }),
        supabase
          .from('budget_categories')
          .select('*')
          .is('organization_id', null)
          .order('name', { ascending: true })
      ]);

      if (orgResult.error) {
        console.error('❌ [FINANCE] Erro ao buscar categorias da org:', orgResult.error);
        return;
      }

      if (globalResult.error) {
        console.error('❌ [FINANCE] Erro ao buscar categorias globais:', globalResult.error);
        return;
      }

      // Combinar categorias da org + globais
      const orgCategories = orgResult.data || [];
      const globalCategories = globalResult.data || [];
      
      // Criar Set com nomes da org para evitar duplicatas
      const orgCategoryNames = new Set(orgCategories.map(c => c.name));
      
      // Adicionar apenas globais que NÃO existem na org
      const uniqueGlobals = globalCategories.filter(cat => !orgCategoryNames.has(cat.name));
      
      setCategories([...orgCategories, ...uniqueGlobals]);
    } catch (error) {
      console.error('❌ [FINANCE] Erro ao buscar categorias:', error);
    }
  };

  const handleEdit = (transaction) => {
    // Determinar o tipo da transação
    const transactionType = transaction.type === 'income' ? 'income' : 'expense';
    
    // Para despesas, usar o EditExpenseModal existente
    if (transactionType === 'expense') {
      setEditingId(transaction.id);
    } else {
      // Para entradas, abrir o TransactionModal em modo edição
      setEditingTransaction({ ...transaction, transactionType: 'income' });
      setShowTransactionModal(true);
    }
  };


  const handleDelete = (transaction) => {
    setTransactionToDelete(transaction);
    setShowConfirmModal(true);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;

    const isIncome = transactionToDelete.type === 'income';
    setDeleting(true);
    setShowConfirmModal(false);

    try {
      if (isIncome) {
        // Exclusão de entrada
        const { error } = await supabase
          .from('incomes')
          .delete()
          .eq('id', transactionToDelete.id);
        
        if (error) throw error;

        await fetchIncomes();
        success('Entrada excluída com sucesso!');
      } else {
        // Exclusão de despesa
        const expense = expenses.find(e => e.id === transactionToDelete.id);
        const hasInstallments = expense?.parent_expense_id || expense?.installment_info;
        
        if (hasInstallments) {
          // Excluir todas as parcelas relacionadas
          const { error } = await supabase
            .from('expenses')
            .delete()
            .or(`id.eq.${transactionToDelete.id},parent_expense_id.eq.${transactionToDelete.id}`);
          
          if (error) throw error;
        } else {
          // Excluir despesa única
          const { error } = await supabase
            .from('expenses')
            .delete()
            .eq('id', transactionToDelete.id);
          
          if (error) throw error;
        }

        await fetchExpenses();
        success(hasInstallments ? 'Todas as parcelas foram excluídas com sucesso!' : 'Despesa excluída com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao excluir:', error);
      showError('Erro ao excluir transação: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setDeleting(false);
      setTransactionToDelete(null);
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

  // Função para filtrar transações
  const filterTransactions = (transactionsList) => {
    let filtered = [...transactionsList];

    // Filtro de tipo de transação
    if (filter.transactionType === 'expense') {
      filtered = filtered.filter(t => t.type === 'expense');
    } else if (filter.transactionType === 'income') {
      filtered = filtered.filter(t => t.type === 'income');
    }

    // Filtro de mês (já aplicado nos fetches, mas podemos reforçar)
    if (filter.month) {
      const startOfMonth = `${filter.month}-01`;
      const [year, month] = filter.month.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
      
      filtered = filtered.filter(t => 
        t.date >= startOfMonth && t.date <= endOfMonthStr
      );
    }

    // Filtro de responsável
    if (filter.owner !== 'all') {
      filtered = filtered.filter(t => {
        const owner = t.type === 'income' 
          ? (t.is_shared ? 'Compartilhado' : t.cost_center?.name)
          : t.owner;
        return isSameName(owner, filter.owner);
      });
    }

    // Filtros específicos de despesa
    if (filter.payment_method && filter.payment_method !== 'all') {
      filtered = filtered.filter(t => 
        t.type === 'income' || t.payment_method === filter.payment_method
      );
    }

    if (filter.card_id) {
      filtered = filtered.filter(t => 
        t.type === 'income' || t.card_id === filter.card_id
      );
    }

    if (filter.category_id) {
      filtered = filtered.filter(t => 
        t.type === 'income' || t.category_id === filter.category_id
      );
    }

    // Filtros específicos de entrada
    if (filter.incomeCategory && filter.incomeCategory !== 'all') {
      filtered = filtered.filter(t =>
        t.type === 'expense' || t.category === filter.incomeCategory
      );
    }

    if (filter.incomeType && filter.incomeType !== 'all') {
      filtered = filtered.filter(t => {
        if (t.type === 'expense') return true;
        if (filter.incomeType === 'individual') return !t.is_shared;
        if (filter.incomeType === 'shared') return t.is_shared;
        return true;
      });
    }

    return filtered;
  };

  // Função para ordenar array de transações
  const sortTransactions = (transactionsList) => {
    return [...transactionsList].sort((a, b) => {
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

  // Função para ordenar array de despesas (mantida para compatibilidade)
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
  // SEMPRE incluir todos os cost centers individuais + owners das despesas
  const uniqueOwners = [];
  const seenOwners = new Set();
  
  // 1. Adicionar todos os cost centers individuais primeiro
  (costCenters || []).forEach(cc => {
    if (cc.type === 'individual') {
      const normalized = normalizeName(cc.name);
      if (!seenOwners.has(normalized)) {
        seenOwners.add(normalized);
        uniqueOwners.push(cc.name);
      }
    }
  });
  
  // 2. Adicionar owners das despesas (incluindo "Compartilhado")
  expenses.forEach(e => {
    if (e.owner) {
      const normalized = normalizeName(e.owner);
      if (!seenOwners.has(normalized)) {
        seenOwners.add(normalized);
        uniqueOwners.push(e.owner);
      }
    }
  });
  
  const totals = {};
  
  // Calcular totais considerando splits para despesas compartilhadas
  uniqueOwners.forEach(owner => {
    const isCompartilhado = normalizeName(owner) === 'compartilhado';
    
    if (isCompartilhado) {
      // Para "Compartilhado", somar o valor TOTAL das despesas compartilhadas
      totals[owner] = expenses
        .filter(e => e.status === 'confirmed' && isSameName(e.owner, owner))
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    } else {
      // Para responsáveis individuais, considerar splits
      let total = 0;
      
      expenses.forEach(e => {
        if (e.status !== 'confirmed') return;
        
        if (e.split && e.owner === 'Compartilhado') {
          // Despesa compartilhada: buscar o split deste responsável
          if (e.expense_splits && e.expense_splits.length > 0) {
            // Usar splits personalizados
            const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
            if (ownerCostCenter) {
              const split = e.expense_splits.find(s => s.cost_center_id === ownerCostCenter.id);
              if (split) {
                total += parseFloat(split.amount || 0);
              }
            }
          } else {
            // Usar fallback (split_percentage do cost_center)
            const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
            if (ownerCostCenter) {
              const percentage = parseFloat(ownerCostCenter.split_percentage || 0);
              const amount = parseFloat(e.amount || 0);
              total += (amount * percentage) / 100;
            }
          }
        } else if (isSameName(e.owner, owner)) {
          // Despesa individual deste responsável
          total += parseFloat(e.amount || 0);
        }
      });
      
      totals[owner] = total;
    }
  });
  
  totals.pending = expenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);

  const total = Object.values(totals).reduce((sum, value) => sum + value, 0);

  // Loading inicial enquanto organização carrega
  if (orgLoading || pageLoading || !isDataLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <LoadingLogo className="h-24 w-24" />
      </div>
    );
  }

  // Erro de organização
  if (orgError) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
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
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Transações"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        {/* Header Actions (consistência com /cards) */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Gestão de Transações</h2>
              <div className="flex items-center space-x-3">
                <Button 
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => setShowTransactionModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Transação
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Summary Cards reorganizados */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4">
          {/* Card Total de Entradas - AZUL */}
          <div className="relative group">
            <Card 
              className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'entradas' ? null : 'entradas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Total de Entradas
                </CardTitle>
                <div className="p-2 rounded-lg bg-flight-blue/10">
                  <TrendingUp className="h-4 w-4 text-flight-blue" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {Number(
                    incomes
                      .filter(i => i.status === 'confirmed')
                      .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total de todas as entradas
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'entradas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Divisão por Responsável</p>
              <div className="space-y-2">
                {costCenters
                  .filter(cc => cc && cc.is_active !== false && !cc.is_shared)
                  .map((cc) => {
                    const individualTotal = incomes
                      .filter(i => !i.is_shared && i.cost_center_id === cc.id && i.status === 'confirmed')
                      .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
                    
                    const sharedTotal = incomes
                      .filter(i => i.is_shared && i.status === 'confirmed')
                      .flatMap(i => i.income_splits || [])
                      .filter(s => s.cost_center_id === cc.id)
                      .reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                    
                    const total = individualTotal + sharedTotal;
                    const totalIncomes = incomes
                      .filter(i => i.status === 'confirmed')
                      .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
                    const percentage = totalIncomes > 0 ? ((total / totalIncomes) * 100).toFixed(1) : 0;
                    
                    return { cc, total, percentage };
                  })
                  .filter(item => item.total > 0)
                  .map(({ cc, total, percentage }) => (
                    <div key={cc.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cc.color || '#207DFF' }}
                        />
                        <span className="text-gray-700">{cc.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-900 font-semibold">R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-gray-500 ml-2">{percentage}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Card Total de Despesas - CINZA */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'despesas' ? null : 'despesas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Despesas
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <Target className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  - R$ {Number(
                    expenses
                      .filter(e => e.status === 'confirmed')
                      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total de todas as despesas
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'despesas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Divisão por Responsável</p>
              <div className="space-y-2">
                {uniqueOwners.map((owner) => {
                  const ownerTotal = totals[owner] || 0;
                  const totalDespesas = expenses
                    .filter(e => e.status === 'confirmed')
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                  const percentage = totalDespesas > 0 ? ((ownerTotal / totalDespesas) * 100).toFixed(1) : 0;
                  
                  return (
                    <div key={owner} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: owner === 'Compartilhado' ? '#8B5CF6' : (buildOwnerColorMap(costCenters)[normalizeKey(owner)] || '#6366F1')
                          }}
                        />
                        <span className="text-gray-700">{owner}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-900 font-semibold">- R$ {Number(ownerTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-gray-500 ml-2">{percentage}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Card À Vista - CINZA */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'avista' ? null : 'avista')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  À Vista
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  - R$ {Number(expenses
                    .filter(expense => ['cash', 'debit_card', 'pix'].includes(expense.payment_method))
                    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Dinheiro, PIX e débito
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'avista' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Divisão por Responsável</p>
              <div className="space-y-2">
                {uniqueOwners
                  .map((owner) => {
                    const cashExpenses = expenses.filter(e => 
                      e.status === 'confirmed' && 
                      ['cash', 'debit_card', 'pix'].includes(e.payment_method)
                    );
                    
                    const ownerTotal = cashExpenses.reduce((sum, e) => {
                      const isCompartilhado = normalizeName(e.owner) === 'compartilhado';
                      
                      if (isCompartilhado && e.split) {
                        // Despesa compartilhada: buscar o split deste responsável
                        if (e.expense_splits && e.expense_splits.length > 0) {
                          const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
                          if (ownerCostCenter) {
                            const split = e.expense_splits.find(s => s.cost_center_id === ownerCostCenter.id);
                            if (split) return sum + parseFloat(split.amount || 0);
                          }
                        } else {
                          const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
                          if (ownerCostCenter) {
                            const percentage = parseFloat(ownerCostCenter.split_percentage || 0);
                            return sum + (parseFloat(e.amount || 0) * percentage / 100);
                          }
                        }
                      } else if (isSameName(e.owner, owner)) {
                        return sum + parseFloat(e.amount || 0);
                      }
                      return sum;
                    }, 0);
                    
                    const totalCash = cashExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    const percentage = totalCash > 0 ? ((ownerTotal / totalCash) * 100).toFixed(1) : 0;
                    
                    return { owner, ownerTotal, percentage };
                  })
                  .filter(item => item.ownerTotal > 0)
                  .map(({ owner, ownerTotal, percentage }) => (
                    <div key={owner} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: owner === 'Compartilhado' ? '#8B5CF6' : (buildOwnerColorMap(costCenters)[normalizeKey(owner)] || '#6366F1')
                          }}
                        />
                        <span className="text-gray-700">{owner}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-900 font-semibold">- R$ {Number(ownerTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-gray-500 ml-2">{percentage}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Card Crédito - CINZA */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'credito' ? null : 'credito')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Crédito
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  - R$ {Number(expenses
                    .filter(expense => expense.payment_method === 'credit_card')
                    .reduce((sum, expense) => sum + (Number(expense.amount) || 0), 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Gastos em cartão de crédito
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'credito' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Divisão por Responsável</p>
              <div className="space-y-2">
                {uniqueOwners
                  .map((owner) => {
                    const creditExpenses = expenses.filter(e => 
                      e.status === 'confirmed' && 
                      e.payment_method === 'credit_card'
                    );
                    
                    const ownerTotal = creditExpenses.reduce((sum, e) => {
                      const isCompartilhado = normalizeName(e.owner) === 'compartilhado';
                      
                      if (isCompartilhado && e.split) {
                        // Despesa compartilhada: buscar o split deste responsável
                        if (e.expense_splits && e.expense_splits.length > 0) {
                          const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
                          if (ownerCostCenter) {
                            const split = e.expense_splits.find(s => s.cost_center_id === ownerCostCenter.id);
                            if (split) return sum + parseFloat(split.amount || 0);
                          }
                        } else {
                          const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
                          if (ownerCostCenter) {
                            const percentage = parseFloat(ownerCostCenter.split_percentage || 0);
                            return sum + (parseFloat(e.amount || 0) * percentage / 100);
                          }
                        }
                      } else if (isSameName(e.owner, owner)) {
                        return sum + parseFloat(e.amount || 0);
                      }
                      return sum;
                    }, 0);
                    
                    const totalCredit = creditExpenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    const percentage = totalCredit > 0 ? ((ownerTotal / totalCredit) * 100).toFixed(1) : 0;
                    
                    return { owner, ownerTotal, percentage };
                  })
                  .filter(item => item.ownerTotal > 0)
                  .map(({ owner, ownerTotal, percentage }) => (
                    <div key={owner} className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: owner === 'Compartilhado' ? '#8B5CF6' : (buildOwnerColorMap(costCenters)[normalizeKey(owner)] || '#6366F1')
                          }}
                        />
                        <span className="text-gray-700">{owner}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-900 font-semibold">- R$ {Number(ownerTotal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        <span className="text-gray-500 ml-2">{percentage}%</span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <div className="p-2 bg-flight-blue/5 rounded-lg">
                  <Calendar className="h-4 w-4 text-flight-blue" />
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
            <div className="flex flex-wrap gap-6 w-full">
            {/* Filtro de Tipo de Transação */}
            <div className="space-y-3 flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700">Tipo de Transação</label>
              <select
                value={filter.transactionType}
                onChange={(e) => setFilter({ ...filter, transactionType: e.target.value })}
                className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                style={{ height: '48px', boxSizing: 'border-box' }}
              >
                <option value="all">Todas as Transações</option>
                <option value="expense">Apenas Despesas</option>
                <option value="income">Apenas Entradas</option>
              </select>
            </div>

            <div className="space-y-3 flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700">Mês</label>
              <input
                type="month"
                value={filter.month}
                onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                className="w-full h-12 px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                style={{ height: '48px', boxSizing: 'border-box' }}
              />
            </div>

            <div className="space-y-3 flex-1 min-w-[200px]">
              <label className="block text-sm font-medium text-gray-700">Responsável</label>
              <select
                value={filter.owner}
                onChange={(e) => setFilter({ ...filter, owner: e.target.value })}
                className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                style={{ height: '48px', boxSizing: 'border-box' }}
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

            {/* Filtros condicionais para Despesas */}
            {(filter.transactionType === 'all' || filter.transactionType === 'expense') && (
              <>
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">
                      Categoria de Despesa
                      {filter.category_id && (
                        <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          Filtrado
                        </span>
                      )}
                    </label>
                    {filter.category_id && (
                      <button
                        onClick={() => setFilter({ ...filter, category_id: null })}
                        className="text-xs text-gray-500 hover:text-gray-700 underline"
                      >
                        Limpar filtro
                      </button>
                    )}
                  </div>
                  <select
                    value={filter.category_id || 'all'}
                    onChange={(e) => setFilter({ ...filter, category_id: e.target.value === 'all' ? null : e.target.value })}
                    className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    style={{ height: '48px', boxSizing: 'border-box' }}
                  >
                    <option value="all">Todas as categorias</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3 flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700">Forma de Pagamento</label>
              <select
                value={filter.payment_method}
                onChange={(e) => {
                  const newPaymentMethod = e.target.value;
                  setFilter({ 
                    ...filter, 
                    payment_method: newPaymentMethod,
                    // Limpar filtro de cartão se não for crédito
                    card_id: newPaymentMethod !== 'credit_card' ? null : filter.card_id
                  });
                }}
                className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                style={{ height: '48px', boxSizing: 'border-box' }}
              >
                <option value="all">Todas</option>
                <option value="cash">Dinheiro</option>
                  <option value="debit_card">Débito</option>
                <option value="pix">PIX</option>
                <option value="credit_card">Cartão de Crédito</option>
                <option value="other">Outros</option>
              </select>
            </div>

            <div className="space-y-3 flex-1 min-w-[200px]">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700">
                  Por Cartão
                  {filter.card_id && (
                    <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Filtrado
                    </span>
                  )}
                </label>
                {filter.card_id && (
                  <button
                    onClick={() => setFilter({ ...filter, card_id: null })}
                    className="text-xs text-gray-500 hover:text-gray-700 underline"
                  >
                    Limpar filtro
                  </button>
                )}
              </div>
              <select
                value={filter.card_id || 'all'}
                onChange={(e) => setFilter({ ...filter, card_id: e.target.value === 'all' ? null : e.target.value })}
                disabled={filter.payment_method !== 'credit_card'}
                className={`w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  filter.payment_method !== 'credit_card' 
                    ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                    : 'bg-white text-gray-900'
                }`}
                style={{ height: '48px', boxSizing: 'border-box' }}
              >
                <option value="all">Todos os cartões</option>
                {cards.map(card => (
                  <option key={card.id} value={card.id}>{card.name}</option>
                ))}
              </select>
            </div>
              </>
            )}

            {/* Filtros condicionais para Entradas */}
            {(filter.transactionType === 'all' || filter.transactionType === 'income') && (
              <>
                {/* Categoria de Entrada */}
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700">Categoria de Entrada</label>
                  <select
                    value={filter.incomeCategory}
                    onChange={(e) => setFilter({ ...filter, incomeCategory: e.target.value })}
                    className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    style={{ height: '48px', boxSizing: 'border-box' }}
                  >
                    <option value="all">Todas as categorias</option>
                    <option value="Salário">Salário</option>
                    <option value="Freelance">Freelance</option>
                    <option value="Investimentos">Investimentos</option>
                    <option value="Vendas">Vendas</option>
                    <option value="Aluguel">Aluguel</option>
                    <option value="Bonificação">Bonificação</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>

                {/* Tipo de Entrada */}
                <div className="space-y-3 flex-1 min-w-[200px]">
                  <label className="block text-sm font-medium text-gray-700">Tipo de Entrada</label>
                  <select
                    value={filter.incomeType}
                    onChange={(e) => setFilter({ ...filter, incomeType: e.target.value })}
                    className="w-full px-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    style={{ height: '48px', boxSizing: 'border-box' }}
                  >
                    <option value="all">Todas</option>
                    <option value="individual">Individual</option>
                    <option value="shared">Compartilhada</option>
                  </select>
                </div>
              </>
            )}
            </div>
          </CardContent>
          )}
        </Card>

        {/* Expense Table */}
        <Card className="border-0 bg-white overflow-visible" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-flight-blue/5 rounded-lg">
                <TrendingUp className="h-4 w-4 text-flight-blue" />
              </div>
              <span>Transações Gerais</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-visible">
            <div className="overflow-x-auto overflow-y-visible">
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
                      <span>Responsabilidade</span>
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
                {sortTransactions(filterTransactions(transactions)).map((transaction) => {
                  const isIncome = transaction.type === 'income';
                  return (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {transaction.date ? new Date(transaction.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className={`px-6 py-4 text-sm ${isIncome ? 'text-flight-blue font-semibold' : 'text-gray-900'}`}>
                      <div className="max-w-xs truncate" title={transaction.description}>
                        {transaction.description}
                        {transaction.installment_info && (
                          <span className="text-gray-500 ml-1">
                            ({transaction.installment_info.current_installment}/{transaction.installment_info.total_installments})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {isIncome ? transaction.category : transaction.category || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {!isIncome && (
                        <>
                          {transaction.payment_method === 'cash' && 'Dinheiro'}
                          {transaction.payment_method === 'debit_card' && (
                            transaction.card_id ? (() => {
                              const card = cards.find(c => c.id === transaction.card_id);
                              return card ? `Débito - ${card.name}` : 'Débito';
                            })() : 'Débito'
                          )}
                          {transaction.payment_method === 'pix' && 'PIX'}
                          {transaction.payment_method === 'credit_card' && (
                            transaction.card_id ? (() => {
                              const card = cards.find(c => c.id === transaction.card_id);
                              return card ? `Crédito - ${card.name}` : 'Crédito';
                            })() : 'Crédito'
                          )}
                          {transaction.payment_method === 'bank_transfer' && 'Transferência'}
                          {transaction.payment_method === 'boleto' && 'Boleto'}
                          {transaction.payment_method === 'other' && 'Outros'}
                        </>
                      )}
                      {isIncome && (
                        <>
                          {transaction.payment_method === 'cash' && 'Dinheiro'}
                          {transaction.payment_method === 'pix' && 'PIX'}
                          {transaction.payment_method === 'deposit' && 'Depósito'}
                          {transaction.payment_method === 'bank_transfer' && 'Transferência'}
                          {transaction.payment_method === 'boleto' && 'Boleto'}
                          {transaction.payment_method === 'other' && 'Outros'}
                          {!transaction.payment_method && '-'}
                        </>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {(() => {
                        const owner = isIncome ? (transaction.is_shared ? 'Compartilhado' : transaction.cost_center?.name) : transaction.owner;
                        const isShared = owner === 'Compartilhado';
                        
                        // Calcular splits para tooltip
                        let splitInfo = null;
                        if (isShared && !isIncome && transaction.expense_splits && transaction.expense_splits.length > 0) {
                          splitInfo = transaction.expense_splits.map(split => {
                            const cc = costCenters.find(c => c.id === split.cost_center_id);
                            return {
                              name: cc?.name || 'Desconhecido',
                              percentage: parseFloat(split.percentage).toFixed(0),
                              color: cc?.color || '#6B7280'
                            };
                          });
                        } else if (isShared && isIncome && transaction.income_splits && transaction.income_splits.length > 0) {
                          splitInfo = transaction.income_splits.map(split => {
                            const cc = costCenters.find(c => c.id === split.cost_center_id);
                            return {
                              name: cc?.name || 'Desconhecido',
                              percentage: parseFloat(split.percentage).toFixed(0),
                              color: cc?.color || '#6B7280'
                            };
                          });
                        } else if (isShared) {
                          // Usar fallback
                          splitInfo = costCenters
                            .filter(cc => cc.type === 'individual')
                            .map(cc => ({
                              name: cc.name,
                              percentage: parseFloat(cc.split_percentage || 0).toFixed(0),
                              color: cc.color
                            }));
                        }
                        
                        return (
                          <div className="relative inline-block group">
                            <span 
                              className="text-sm font-medium cursor-help text-gray-600"
                              onMouseEnter={(e) => {
                                if (isShared && splitInfo) {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  const tooltip = e.currentTarget.nextElementSibling;
                                  if (tooltip) {
                                    tooltip.style.left = `${rect.left + rect.width / 2}px`;
                                    tooltip.style.top = `${rect.bottom + 8}px`;
                                  }
                                }
                              }}
                            >
                              {owner || '-'}
                            </span>
                            
                            {/* Tooltip - FIXED para escapar do container */}
                            {isShared && splitInfo && (
                              <div className="fixed -translate-x-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-[9999]">
                                <div className="bg-white border border-gray-200 text-gray-900 text-xs rounded-lg shadow-xl p-3 min-w-[160px]">
                                  <div className="font-semibold mb-2 text-gray-700 text-xs">Divisão:</div>
                                  <div className="space-y-2">
                                    {splitInfo.map((split, idx) => (
                                      <div key={idx} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                          <div 
                                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: split.color }}
                                          />
                                          <span className="text-gray-700">{split.name}</span>
                                        </div>
                                        <span className="font-semibold text-gray-900 ml-3">{split.percentage}%</span>
                                      </div>
                                    ))}
                                  </div>
                                  {/* Seta do tooltip apontando para CIMA */}
                                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-px">
                                    <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-b-[6px] border-transparent border-b-white"></div>
                                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-[1px] w-0 h-0 border-l-[7px] border-r-[7px] border-b-[7px] border-transparent border-b-gray-200"></div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${isIncome ? 'text-flight-blue font-semibold' : 'text-gray-900'}`}>
                      {!isIncome && '- '}
                      R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50 transition-colors"
                          title={`Editar ${isIncome ? 'entrada' : 'despesa'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction)}
                          className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50 transition-colors"
                          title={`Excluir ${isIncome ? 'entrada' : 'despesa'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600">Nenhuma transação encontrada</p>
            </div>
          )}
          </CardContent>
        </Card>
      </main>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
        onSuccess={() => { setShowTransactionModal(false); setEditingTransaction(null); fetchExpenses(); fetchIncomes(); fetchCards(); }}
        editingTransaction={editingTransaction}
        categories={categories.filter(cat => cat.type === 'expense' || cat.type === 'both')}
      />

      {/* Modal de edição */}
      <EditExpenseModal
        isOpen={!!editingId}
        expenseId={editingId}
        costCenters={costCenters}
        categories={categories.filter(cat => cat.type === 'expense' || cat.type === 'both')}
        organization={organization}
        onClose={() => setEditingId(null)}
        onSuccess={() => {
          setEditingId(null);
          fetchExpenses();
          fetchCards();
        }}
      />

      {/* Notification Modal */}
      {/* Footer */}
      <Footer />

      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setTransactionToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Confirmar exclusão"
        message={
          transactionToDelete?.type === 'income' 
            ? "Tem certeza que deseja excluir esta entrada? Esta ação não pode ser desfeita."
            : "Tem certeza que deseja excluir esta despesa? Esta ação não pode ser desfeita."
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />
    </div>
  );
}

