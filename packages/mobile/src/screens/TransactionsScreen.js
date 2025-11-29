import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  Modal,
  SectionList,
  ActivityIndicator,
} from 'react-native';
import { 
  Search, 
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  ChevronRight,
  Filter,
  Bell,
  CheckSquare,
  Square,
  Trash2,
  X,
  HelpCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react-native';

const { width } = Dimensions.get('window');
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { useMonthlyFinancials } from '../hooks/useMonthlyFinancials';
import { colors, spacing, radius, shadows } from '../theme';
import { Text, Title2, Callout, Caption, Subheadline } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import EmptyState from '../components/ui/EmptyState';
import LoadingLogo from '../components/ui/LoadingLogo';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { StatCard } from '../components/financial/StatCard';
import { MonthSelector } from '../components/financial/MonthSelector';
import { StatsDetailSheet } from '../components/financial/StatsDetailSheet';
import { DetailedStatsSheet } from '../components/financial/DetailedStatsSheet';
import { TransactionModal } from '../components/financial/TransactionModal';
import { FilterSheet } from '../components/financial/FilterSheet';
import { Tooltip } from '../components/ui/Tooltip';
import { formatCurrency } from '@fintrack/shared/utils';
import { useToast } from '../components/ui/Toast';
import { useAlert } from '../components/ui/AlertProvider';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { HapticFeedback } from '../utils/haptics';

const STAT_CARD_WIDTH = (width - spacing[2] * 3) / 2.2;

export default function TransactionsScreen() {
  const { organization, user, loading: orgLoading, costCenters } = useOrganization();
  const { showToast } = useToast();
  const { alert } = useAlert();
  const { confirm } = useConfirmation();
  const organizationName = organization?.name || 'Organização';
  const isSoloMember = organization?.type === 'solo';
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50; // Itens por página
  const [searchQuery, setSearchQuery] = useState(''); // Valor efetivo de busca (aplica ao confirmar)
  const [filterType, setFilterType] = useState('all'); // all, expense, income
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  
  // Advanced filters
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    costCenter: null,
    category: null,
    paymentMethod: null,
    card: null,
    type: 'all',
  });
  
  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'date',
    direction: 'desc', // 'asc' | 'desc'
  });
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  
  // Multi-select
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  
  // Estados para stats
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });

  const {
    expenses,
    incomes,
    costCenters: fetchedCostCenters,
    cards: fetchedCards,
    categories: fetchedCategories,
    totalExpenses: monthlyTotalExpenses,
    totalIncome: monthlyTotalIncome,
    loading: financialsLoading,
    error: financialsError,
    refresh: refreshFinancials,
  } = useMonthlyFinancials(organization, selectedMonth);
  
  // Estados para modal de detalhes (ao clicar no StatCard)
  const [detailedSheetVisible, setDetailedSheetVisible] = useState(false);
  const [detailedSheetData, setDetailedSheetData] = useState({
    title: '',
    type: 'expense',
    paymentBreakdown: null,
    responsibleData: [],
    totalAmount: 0,
  });

  const availableCostCenters =
    (costCenters && costCenters.length > 0 ? costCenters : fetchedCostCenters) || [];

  const categoryMap = useMemo(() => {
    if (categories && categories.length === 0 && fetchedCategories?.length > 0) {
      const map = {};
      fetchedCategories.forEach(cat => {
        if (cat?.id) map[cat.id] = cat;
      });
      return map;
    }
    const map = {};
    (categories || fetchedCategories || []).forEach(cat => {
      if (cat?.id) map[cat.id] = cat;
    });
    return map;
  }, [categories, fetchedCategories]);

  const cardMap = useMemo(() => {
    const map = {};
    (cards || []).forEach(card => {
      if (card?.id) {
        map[card.id] = card;
      }
    });
    return map;
  }, [cards]);
  
  // Stats detail sheet
  const [detailSheetVisible, setDetailSheetVisible] = useState(false);
  const [detailSheetData, setDetailSheetData] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState(null);

  useEffect(() => {
    filterTransactions();
  }, [filterTransactions]);

  useEffect(() => {
    setCategories(fetchedCategories || []);
  }, [fetchedCategories]);

  useEffect(() => {
    setCards(fetchedCards || []);
  }, [fetchedCards]);

  useEffect(() => {
    setTotalExpenses(monthlyTotalExpenses);
    setTotalIncome(monthlyTotalIncome);
  }, [monthlyTotalExpenses, monthlyTotalIncome]);

  useEffect(() => {
    if (!expenses && !incomes) {
      setTransactions([]);
      setFilteredTransactions([]);
      return;
    }
    const expenseItems = (expenses || []).map(exp => ({
      ...exp,
      type: 'expense',
      category_name: exp.category_name || categoryMap[exp.category_id]?.name || null,
      card_name: exp.card_name || cardMap[exp.card_id]?.name || null,
    }));
    const incomeItems = (incomes || []).map(inc => ({
      ...inc,
      type: 'income',
      category_name: inc.category_name || categoryMap[inc.category_id]?.name || null,
    }));
    const merged = [...expenseItems, ...incomeItems].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    setTransactions(merged);
    setHasMore(merged.length >= PAGE_SIZE);
    setPage(0); // Reset page quando dados mudam
    
    // Aplicar filtros após atualizar transactions
    // Usar o merged diretamente para evitar problemas de timing
    if (merged.length > 0) {
      // Criar uma função temporária para aplicar os filtros
      const applyFilters = (transactionsList) => {
        let filtered = [...transactionsList];
        const typeFilter = advancedFilters.type !== 'all' ? advancedFilters.type : filterType;
        if (typeFilter !== 'all') {
          filtered = filtered.filter(t => t.type === typeFilter);
        }
        if (advancedFilters.costCenter === 'organization') {
          filtered = filtered.filter(t => t.is_shared);
        } else if (advancedFilters.costCenter) {
          filtered = filtered.filter(t => t.cost_center_id === advancedFilters.costCenter);
        }
        if (advancedFilters.category) {
          filtered = filtered.filter(t => t.category_id === advancedFilters.category);
        }
        if (advancedFilters.paymentMethod) {
          filtered = filtered.filter(t => t.payment_method === advancedFilters.paymentMethod);
        }
        if (advancedFilters.card) {
          filtered = filtered.filter(t => t.card_id === advancedFilters.card);
        }
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          filtered = filtered.filter(t => 
            t.description?.toLowerCase().includes(query) ||
            t.category?.toLowerCase().includes(query)
          );
        }
        // Ordenar
        const sorted = [...filtered].sort((a, b) => {
          let aValue = a[sortConfig.key];
          let bValue = b[sortConfig.key];
          switch (sortConfig.key) {
            case 'date':
              aValue = new Date(aValue + 'T00:00:00');
              bValue = new Date(bValue + 'T00:00:00');
              break;
            case 'amount':
              aValue = parseFloat(aValue || 0);
              bValue = parseFloat(bValue || 0);
              break;
            default:
              aValue = (aValue || '').toString().toLowerCase();
              bValue = (bValue || '').toString().toLowerCase();
          }
          let comparison = 0;
          if (aValue < bValue) {
            comparison = sortConfig.direction === 'asc' ? -1 : 1;
          } else if (aValue > bValue) {
            comparison = sortConfig.direction === 'asc' ? 1 : -1;
          }
          if (comparison === 0 && sortConfig.key === 'date') {
            const createdA = new Date(a.created_at || a.confirmed_at || 0);
            const createdB = new Date(b.created_at || b.confirmed_at || 0);
            comparison = sortConfig.direction === 'asc' 
              ? createdA.getTime() - createdB.getTime()
              : createdB.getTime() - createdA.getTime();
          }
          return comparison;
        });
        setFilteredTransactions(sorted);
      };
      applyFilters(merged);
    } else {
      setFilteredTransactions([]);
    }
  }, [expenses, incomes, categoryMap, cardMap, advancedFilters, filterType, searchQuery, sortConfig]);

  const hasAdvancedFilters = useMemo(() => (
    advancedFilters.type !== 'all' ||
    !!advancedFilters.costCenter ||
    !!advancedFilters.category ||
    !!advancedFilters.paymentMethod ||
    !!advancedFilters.card
  ), [advancedFilters]);

  const hasSearchQuery = useMemo(() => searchQuery.trim().length > 0, [searchQuery]);
  const usingFilteredTotals = hasSearchQuery || hasAdvancedFilters || filterType !== 'all';

  const filteredTotals = useMemo(() => {
    const totals = filteredTransactions.reduce((acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += transaction.amount || 0;
      } else {
        acc.expense += transaction.amount || 0;
      }
      return acc;
    }, { income: 0, expense: 0 });
    return totals;
  }, [filteredTransactions]);

  const statsIncome = usingFilteredTotals ? filteredTotals.income : monthlyTotalIncome;
  const statsExpense = usingFilteredTotals ? filteredTotals.expense : monthlyTotalExpenses;
  const statsBalance = statsIncome - statsExpense;

  const loadTransactions = async () => {
    try {
      await refreshFinancials();
    } finally {
      setRefreshing(false);
    }
  };

  // Aplicar busca quando o usuário confirmar (pressionar Enter)
  const handleSearchSubmit = (value = '') => {
    setSearchQuery(value.trim());
  };

  // Limpar busca
  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const filterTransactions = useCallback(() => {
    if (!transactions || transactions.length === 0) {
      setFilteredTransactions([]);
      return;
    }

    let filtered = [...transactions];

    // Determinar tipo final (chips rápidos têm prioridade se definidos)
    const typeFilter = advancedFilters.type !== 'all' ? advancedFilters.type : filterType;

    // Filtrar por tipo
    if (typeFilter !== 'all') {
      filtered = filtered.filter(t => t.type === typeFilter);
    }

    // Filtrar por responsável
    if (advancedFilters.costCenter === 'organization') {
      filtered = filtered.filter(t => t.is_shared);
    } else if (advancedFilters.costCenter) {
      filtered = filtered.filter(t => t.cost_center_id === advancedFilters.costCenter);
    }

    // Filtrar por categoria
    if (advancedFilters.category) {
      filtered = filtered.filter(t => t.category_id === advancedFilters.category);
    }

    // Filtrar por forma de pagamento
    if (advancedFilters.paymentMethod) {
      filtered = filtered.filter(t => t.payment_method === advancedFilters.paymentMethod);
    }

    // Filtrar por cartão
    if (advancedFilters.card) {
      filtered = filtered.filter(t => t.card_id === advancedFilters.card);
    }

    // Filtrar por busca
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => 
        t.description?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query)
      );
    }

    // Aplicar ordenação diretamente aqui
    const sorted = [...filtered].sort((a, b) => {
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
        case 'category_name':
        case 'payment_method':
        case 'description':
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
          break;
        default:
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
      }

      let comparison = 0;
      if (aValue < bValue) {
        comparison = sortConfig.direction === 'asc' ? -1 : 1;
      } else if (aValue > bValue) {
        comparison = sortConfig.direction === 'asc' ? 1 : -1;
      }
      
      // Se os valores são iguais (especialmente para date), usar created_at como desempate
      if (comparison === 0 && sortConfig.key === 'date') {
        const createdA = new Date(a.created_at || a.confirmed_at || 0);
        const createdB = new Date(b.created_at || b.confirmed_at || 0);
        comparison = sortConfig.direction === 'asc' 
          ? createdA.getTime() - createdB.getTime()
          : createdB.getTime() - createdA.getTime();
      }
      
      return comparison;
    });

    setFilteredTransactions(sorted);
  }, [transactions, searchQuery, filterType, advancedFilters, sortConfig]);

  // Função para ordenar transações
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
        case 'category_name':
        case 'payment_method':
        case 'description':
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
          break;
        default:
          aValue = (aValue || '').toString().toLowerCase();
          bValue = (bValue || '').toString().toLowerCase();
      }

      let comparison = 0;
      if (aValue < bValue) {
        comparison = sortConfig.direction === 'asc' ? -1 : 1;
      } else if (aValue > bValue) {
        comparison = sortConfig.direction === 'asc' ? 1 : -1;
      }
      
      // Se os valores são iguais (especialmente para date), usar created_at como desempate
      if (comparison === 0 && sortConfig.key === 'date') {
        const createdA = new Date(a.created_at || a.confirmed_at || 0);
        const createdB = new Date(b.created_at || b.confirmed_at || 0);
        comparison = sortConfig.direction === 'asc' 
          ? createdA.getTime() - createdB.getTime()
          : createdB.getTime() - createdA.getTime();
      }
      
      return comparison;
    });
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc',
    }));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTransactions();
  };

  const formatDate = (dateString) => {
    // Criar data local sem timezone (usar apenas YYYY-MM-DD)
    const [year, month, day] = dateString.split('T')[0].split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const dateOnly = new Date(date);
    dateOnly.setHours(0, 0, 0, 0);

    if (dateOnly.getTime() === today.getTime()) {
      return 'Hoje';
    } else if (dateOnly.getTime() === yesterday.getTime()) {
      return 'Ontem';
    } else {
      return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: 'short' 
      });
    }
  };

  const groupByDate = (transactions) => {
    const groups = {};
    
    transactions.forEach(t => {
      // Usar apenas a data (YYYY-MM-DD) sem hora para agrupar
      const dateKey = t.date.split('T')[0];
      
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: t.date,
          transactions: [],
          totalExpenses: 0,
          totalIncomes: 0,
        };
      }
      
      groups[dateKey].transactions.push(t);
      
      if (t.type === 'expense') {
        groups[dateKey].totalExpenses += t.amount || 0;
      } else {
        groups[dateKey].totalIncomes += t.amount || 0;
      }
    });

    return Object.values(groups).sort((a, b) => 
      new Date(b.date) - new Date(a.date)
    );
  };

  const groupedTransactions = groupByDate(filteredTransactions);

  // Preparar dados para SectionList com paginação
  const sectionsData = useMemo(() => {
    // Limitar transações por página para performance
    const paginatedTransactions = filteredTransactions.slice(0, (page + 1) * PAGE_SIZE);
    const grouped = groupByDate(paginatedTransactions);
    
    return grouped.map((group, index) => ({
      title: formatDate(group.date),
      date: group.date,
      totalIncomes: group.totalIncomes,
      totalExpenses: group.totalExpenses,
      data: group.transactions,
      groupIndex: index,
    }));
  }, [filteredTransactions, page]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    
    const totalItems = filteredTransactions.length;
    const currentLoaded = (page + 1) * PAGE_SIZE;
    
    if (currentLoaded < totalItems) {
      setLoadingMore(true);
      // Simular pequeno delay para melhor UX
      setTimeout(() => {
        setPage(prev => prev + 1);
        setLoadingMore(false);
        setHasMore((page + 2) * PAGE_SIZE < totalItems);
      }, 300);
    } else {
      setHasMore(false);
    }
  }, [loadingMore, hasMore, page, filteredTransactions.length]);

  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedItems([]);
  };

  const toggleItemSelection = (transaction) => {
    const key = `${transaction.type}-${transaction.id}`;
    if (selectedItems.includes(key)) {
      setSelectedItems(selectedItems.filter(id => id !== key));
    } else {
      setSelectedItems([...selectedItems, key]);
    }
  };

  const isItemSelected = (transaction) => {
    const key = `${transaction.type}-${transaction.id}`;
    return selectedItems.includes(key);
  };

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;

    HapticFeedback.warning();
    const confirmed = await confirm({
      title: 'Confirmar exclusão',
      message: `Tem certeza que deseja excluir ${selectedItems.length} transação(ões) selecionada(s)? Esta ação não pode ser desfeita.`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      // Group by type
      const toDeleteExpenses = [];
      const toDeleteIncomes = [];

      selectedItems.forEach((key) => {
        const [type, id] = key.split('-');
        if (type === 'expense') {
          toDeleteExpenses.push(id);
        } else {
          toDeleteIncomes.push(id);
        }
      });

      // Delete expenses
      if (toDeleteExpenses.length > 0) {
        const { error: expensesError } = await supabase.from('expenses').delete().in('id', toDeleteExpenses);

        if (expensesError) throw expensesError;
      }

      // Delete incomes
      if (toDeleteIncomes.length > 0) {
        const { error: incomesError } = await supabase.from('incomes').delete().in('id', toDeleteIncomes);

        if (incomesError) throw incomesError;
      }

      // Reset selection
      setSelectedItems([]);
      setSelectionMode(false);

      showToast(`${selectedItems.length} transação(ões) excluída(s) com sucesso!`, 'success');

      // Reload
      await loadTransactions();
    } catch (error) {
      showToast('Erro ao excluir transações', 'error');
    }
  };

  const handleSaveTransaction = async (formValues) => {
    if (!organization?.id || !user?.id) {
      showToast('Organização não encontrada', 'error');
      return;
    }

    if (formValues.type === 'income') {
      alert({
        title: 'Fluxo indisponível',
        message: 'Entradas agora devem ser registradas pela tela de Contas Bancárias.',
        type: 'info',
      });
      return;
    }

    try {
      const amountValue = Number(formValues.amount) || 0;
      if (!amountValue || amountValue <= 0) {
        throw new Error('Valor inválido.');
      }

      const willBeShared = Boolean(formValues.is_shared);
      const ownerName =
        formValues.owner_name ||
        (willBeShared ? organizationName : null) ||
        '';

      if (!ownerName) {
        throw new Error('Responsável inválido.');
      }

      const basePayload = {
        organization_id: organization.id,
        user_id: user.id,
        description: formValues.description.trim(),
        amount: amountValue,
        date: formValues.date,
        category_id: formValues.category_id || null,
        payment_method: formValues.payment_method,
        card_id:
          formValues.payment_method === 'credit_card' ? formValues.card_id : null,
        owner: ownerName.trim(),
        is_shared: willBeShared,
        cost_center_id: willBeShared ? null : formValues.cost_center_id || null,
        status: 'confirmed',
        confirmed_at: new Date().toISOString(),
        confirmed_by: user.id,
      };

      if (formValues.payment_method === 'credit_card') {
        await saveCreditExpense(basePayload, formValues, amountValue);
      } else {
        await saveSimpleExpense(basePayload, formValues, amountValue);
      }

      await loadTransactions();
    } catch (error) {
      showToast('Não foi possível salvar esta transação', 'error');
    }
  };

  const handleDeleteTransaction = async (transaction) => {
    if (!transaction) return;
    
    HapticFeedback.warning();
    const confirmed = await confirm({
      title: 'Confirmar exclusão',
      message: 'Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita.',
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const table = transaction.type === 'income' ? 'incomes' : 'expenses';
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', transaction.id);
      if (error) throw error;
      
      HapticFeedback.success();
      setDetailModalVisible(false);
      setDetailTransaction(null);
      await loadTransactions();
      showToast('Transação excluída com sucesso!', 'success');
    } catch (error) {
      HapticFeedback.error();
      showToast('Não foi possível excluir a transação', 'error');
    }
  };

  const openEditModal = (transaction) => {
    if (!transaction) return;
    setSelectedTransaction({
      id: transaction.id,
      type: transaction.type,
      description: transaction.description || '',
      amount: transaction.amount || 0,
      date: transaction.date,
      cost_center_id: transaction.cost_center_id || null,
      category_id: transaction.category_id || null,
      payment_method: transaction.payment_method || null,
      card_id: transaction.card_id || null,
      bank_account_id: transaction.bank_account_id || null,
      is_shared: transaction.is_shared || false,
      shared_percentage: transaction.shared_percentage || null,
      expense_splits: transaction.expense_splits || null,
      income_splits: transaction.income_splits || null,
      installment_info: transaction.installment_info || null,
      parent_expense_id: transaction.parent_expense_id || null,
    });
    setModalType(transaction.type);
    setModalVisible(true);
  };

  const handleTransactionPress = (transaction) => {
    if (selectionMode) {
      toggleItemSelection(transaction);
    } else {
      setDetailTransaction(transaction);
      setDetailModalVisible(true);
    }
  };

  const fetchExpenseGroupIds = async (expenseOrId) => {
    if (!expenseOrId) return [];
    const groupId =
      typeof expenseOrId === 'number'
        ? expenseOrId
        : expenseOrId.parent_expense_id || expenseOrId.id;

    const { data, error } = await supabase
      .from('expenses')
      .select('id')
      .or(`id.eq.${groupId},parent_expense_id.eq.${groupId}`);

    if (error) throw error;
    return (data || []).map((item) => item.id);
  };

  const syncSplitsForExpense = async (expenseId, splits = [], totalAmount = 0) => {
    if (!expenseId) return;
    await supabase.from('expense_splits').delete().eq('expense_id', expenseId);

    const payload = splits
      .filter((split) => split.cost_center_id && Number(split.percentage) > 0)
      .map((split) => ({
        expense_id: expenseId,
        cost_center_id: split.cost_center_id,
        percentage: Number(split.percentage),
        amount: Number(
          ((totalAmount * Number(split.percentage)) / 100).toFixed(2)
        ),
      }));

    if (payload.length > 0) {
      await supabase.from('expense_splits').insert(payload);
    }
  };

  const syncSplitsForInstallments = async (
    expenseIds = [],
    splits = [],
    totalAmount = 0,
    installmentCount = 1
  ) => {
    if (!expenseIds.length) return;
    await supabase.from('expense_splits').delete().in('expense_id', expenseIds);

    const payload = expenseIds.flatMap((expenseId) =>
      splits
        .filter((split) => split.cost_center_id && Number(split.percentage) > 0)
        .map((split) => ({
          expense_id,
          cost_center_id: split.cost_center_id,
          percentage: Number(split.percentage),
          amount: Number(
            (
              (totalAmount * Number(split.percentage)) /
              100 /
              Math.max(1, installmentCount)
            ).toFixed(2)
          ),
        }))
    );

    if (payload.length > 0) {
      await supabase.from('expense_splits').insert(payload);
    }
  };

  const saveSimpleExpense = async (payload, formValues, amountValue) => {
    if (selectedTransaction) {
      const wasCreditBefore =
        selectedTransaction.payment_method === 'credit_card' ||
        Boolean(selectedTransaction.parent_expense_id);

      if (wasCreditBefore) {
        const previousIds = await fetchExpenseGroupIds(selectedTransaction);
        if (previousIds.length > 0) {
          await supabase.from('expense_splits').delete().in('expense_id', previousIds);
          await supabase.from('expenses').delete().in('id', previousIds);
        } else {
          await supabase.from('expenses').delete().eq('id', selectedTransaction.id);
        }

        const { data, error } = await supabase
          .from('expenses')
          .insert([{ ...payload, card_id: null }])
          .select()
          .single();

        if (error) throw error;

        if (formValues.is_shared) {
          await syncSplitsForExpense(data.id, formValues.splits, amountValue);
        }
        return;
      }

      const { error } = await supabase
        .from('expenses')
        .update({
        owner: payload.owner,
        cost_center_id: payload.cost_center_id,
        is_shared: payload.is_shared,
        description: payload.description,
        category_id: payload.category_id,
        payment_method: payload.payment_method,
        amount: amountValue,
        date: payload.date,
        card_id: null,
          card_id: null,
        })
        .eq('id', selectedTransaction.id);

      if (error) throw error;

      if (formValues.is_shared) {
        await syncSplitsForExpense(selectedTransaction.id, formValues.splits, amountValue);
      } else {
        await supabase.from('expense_splits').delete().eq('expense_id', selectedTransaction.id);
      }
      return;
    }

    const { data, error } = await supabase
      .from('expenses')
      .insert([{ ...payload, card_id: null }])
      .select()
      .single();

    if (error) throw error;

    if (formValues.is_shared) {
      await syncSplitsForExpense(data.id, formValues.splits, amountValue);
    }
  };

  const saveCreditExpense = async (payload, formValues, amountValue) => {
    const installmentsCount = Math.max(1, Number(formValues.installments) || 1);

    const { data: parentExpenseId, error } = await supabase.rpc('create_installments', {
      p_amount: amountValue,
      p_installments: installmentsCount,
      p_description: payload.description,
      p_date: payload.date,
      p_card_id: payload.card_id,
      p_category_id: payload.category_id,
      p_cost_center_id: payload.cost_center_id,
      p_owner: payload.owner,
      p_organization_id: organization.id,
      p_user_id: user.id,
      p_whatsapp_message_id: null,
      p_split_template: null,
    });

    if (error) throw error;

    if (formValues.is_shared && formValues.splits?.length) {
      const installmentIds = await fetchExpenseGroupIds(parentExpenseId);
      await syncSplitsForInstallments(
        installmentIds,
        formValues.splits,
        amountValue,
        installmentsCount
      );
    }

    if (selectedTransaction) {
      const previousIds = await fetchExpenseGroupIds(selectedTransaction);
      if (previousIds.length > 0) {
        await supabase.from('expense_splits').delete().in('expense_id', previousIds);
        await supabase.from('expenses').delete().in('id', previousIds);
      } else {
        await supabase.from('expenses').delete().eq('id', selectedTransaction.id);
      }
    }
  };

  // Calcular dados para tooltip de entradas
  const getIncomeTooltipData = () => {
    const confirmedIncomes = transactions.filter(t => t.type === 'income');
    
    // Divisão por Responsável
    const incomesByOwner = [];
    if (costCenters && costCenters.length > 0) {
      costCenters
        .filter(cc => cc.is_active !== false && !cc.is_shared)
        .forEach(cc => {
          const total = confirmedIncomes
            .filter(t => t.cost_center_id === cc.id)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          
          if (total > 0) {
            incomesByOwner.push({
              name: cc.name,
              value: total,
              color: cc.color || colors.brand.primary,
              percentage: totalIncome > 0 ? ((total / totalIncome) * 100).toFixed(1) : 0,
            });
          }
        });
    }
    
    // Top Categorias
    const categoryMap = {};
    confirmedIncomes.forEach(t => {
      if (t.category_id) {
        const catId = t.category_id;
        const category = categories.find(c => c.id === catId);
        const catName = category?.name || 'Sem categoria';
        
        if (!categoryMap[catId]) {
          categoryMap[catId] = {
            id: catId,
            name: catName,
            total: 0,
          };
        }
        categoryMap[catId].total += t.amount || 0;
      } else {
        if (!categoryMap['sem_categoria']) {
          categoryMap['sem_categoria'] = {
            id: 'sem_categoria',
            name: 'Sem categoria',
            total: 0,
          };
        }
        categoryMap['sem_categoria'].total += t.amount || 0;
      }
    });
    
    const topCategories = Object.values(categoryMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(cat => ({
        name: cat.name,
        value: cat.total,
        percentage: totalIncome > 0 ? ((cat.total / totalIncome) * 100).toFixed(1) : 0,
      }));
    
    return {
      byOwner: incomesByOwner,
      topCategories,
    };
  };

  // Calcular dados para tooltip de despesas
  const getExpenseTooltipData = () => {
    const confirmedExpenses = transactions.filter(t => t.type === 'expense');
    
    // Divisão por Forma de Pagamento
    const cashExpenses = confirmedExpenses
      .filter(t => t.payment_method !== 'credit_card')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const creditExpenses = confirmedExpenses
      .filter(t => t.payment_method === 'credit_card')
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    
    const totalExp = cashExpenses + creditExpenses;
    const cashPercent = totalExp > 0 ? ((cashExpenses / totalExp) * 100).toFixed(1) : 0;
    const creditPercent = totalExp > 0 ? ((creditExpenses / totalExp) * 100).toFixed(1) : 0;
    
    // Divisão por Responsável (com individual vs compartilhado)
    const expensesByOwner = [];
    
    // Se não houver costCenters, agrupar por cost_center_id diretamente das transações
    if (!costCenters || costCenters.length === 0) {
      const ownerMap = {};
      confirmedExpenses.forEach(t => {
        const ccId = t.cost_center_id;
        if (ccId) {
          if (!ownerMap[ccId]) {
            ownerMap[ccId] = {
              id: ccId,
              name: `Responsável ${ccId}`,
              value: 0,
              individual: 0,
              shared: 0,
              color: colors.error.main,
            };
          }
          if (t.is_shared) {
            ownerMap[ccId].shared += t.amount || 0;
          } else {
            ownerMap[ccId].individual += t.amount || 0;
          }
          ownerMap[ccId].value += t.amount || 0;
        }
      });
      
      Object.values(ownerMap).forEach(owner => {
        if (owner.value > 0) {
          owner.percentage = totalExp > 0 ? ((owner.value / totalExp) * 100).toFixed(1) : 0;
          expensesByOwner.push(owner);
        }
      });
    } else if (costCenters && costCenters.length > 0) {
      costCenters
        .filter(cc => cc.is_active !== false && !cc.is_shared)
        .forEach(cc => {
          // Despesas individuais deste responsável
          const individualTotal = confirmedExpenses
            .filter(t => !t.is_shared && t.cost_center_id === cc.id)
            .reduce((sum, t) => sum + (t.amount || 0), 0);
          
          // Parte deste responsável nas despesas compartilhadas
          let sharedTotal = 0;
          confirmedExpenses
            .filter(t => t.is_shared || (t.expense_splits && t.expense_splits.length > 0))
            .forEach(t => {
              if (t.expense_splits && t.expense_splits.length > 0) {
                // Usar splits personalizados
                const split = t.expense_splits.find(s => s.cost_center_id === cc.id);
                if (split) {
                  const expenseAmount = t.amount || 0;
                  const splitAmount = split.amount || 0;
                  const totalSplitsAmount = t.expense_splits.reduce((sum, s) => sum + (s.amount || 0), 0);
                  
                  // Se os splits somam mais que o valor da despesa, calcular proporcionalmente
                  if (totalSplitsAmount > expenseAmount && expenseAmount > 0) {
                    const splitPercentage = splitAmount / totalSplitsAmount;
                    sharedTotal += expenseAmount * splitPercentage;
                  } else {
                    sharedTotal += splitAmount;
                  }
                }
              } else if (t.is_shared) {
                // Usar fallback (default_split_percentage do cost_center)
                const percentage = parseFloat(cc.default_split_percentage || 0);
                const amount = t.amount || 0;
                sharedTotal += (amount * percentage) / 100;
              }
            });
          
          const total = individualTotal + sharedTotal;
          
          if (total > 0) {
            expensesByOwner.push({
              name: cc.name,
              value: total,
              individual: individualTotal,
              shared: sharedTotal,
              color: cc.color || colors.error.main,
              percentage: totalExp > 0 ? ((total / totalExp) * 100).toFixed(1) : 0,
            });
          }
        });
    }
    
    
    // Top Categorias
    const categoryMap = {};
    confirmedExpenses.forEach(t => {
      if (t.category_id) {
        const catId = t.category_id;
        // Buscar nome da categoria no array de categorias carregadas
        const category = categories.find(c => c.id === catId);
        const catName = category?.name || 'Sem categoria';
        
        if (!categoryMap[catId]) {
          categoryMap[catId] = {
            id: catId,
            name: catName,
            total: 0,
          };
        }
        categoryMap[catId].total += t.amount || 0;
      } else {
        // Transações sem categoria
        if (!categoryMap['sem_categoria']) {
          categoryMap['sem_categoria'] = {
            id: 'sem_categoria',
            name: 'Sem categoria',
            total: 0,
          };
        }
        categoryMap['sem_categoria'].total += t.amount || 0;
      }
    });
    
    const topCategories = Object.values(categoryMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(cat => ({
        name: cat.name,
        value: cat.total,
        percentage: totalExp > 0 ? ((cat.total / totalExp) * 100).toFixed(1) : 0,
      }));
    
    
    return {
      paymentBreakdown: {
        cash: { value: cashExpenses, percentage: cashPercent },
        credit: { value: creditExpenses, percentage: creditPercent },
      },
      byOwner: expensesByOwner,
      topCategories,
    };
  };

  const handleStatCardPress = (type) => {
    const dataset = usingFilteredTotals ? filteredTransactions : transactions;
    let data = [];

    if (availableCostCenters && availableCostCenters.length > 0) {
      if (type === 'income') {
        // Agrupar receitas por responsável (cost_center)
        data = availableCostCenters
          .filter(cc => cc.is_active !== false)
          .map(cc => {
            const total = dataset
              .filter(t => t.type === 'income' && t.cost_center_id === cc.id)
              .reduce((sum, t) => sum + (t.amount || 0), 0);

            return {
              label: cc.name,
              value: total,
              color: cc.color || colors.brand.primary,
              percentage: statsIncome > 0 ? ((total / statsIncome) * 100).toFixed(1) : 0,
            };
          })
          .filter(item => item.value > 0);
      } else if (type === 'expense') {
        // Agrupar despesas por responsável COM breakdown individual/compartilhado (IGUAL AO WEB)
        data = availableCostCenters
          .filter(cc => cc.is_active !== false)
          .map(cc => {
            // Despesas individuais
            const individualExpenses = dataset
              .filter(t => t.type === 'expense' && !t.is_shared && t.cost_center_id === cc.id)
              .reduce((sum, t) => sum + (t.amount || 0), 0);
            
            // Parte nas despesas compartilhadas
            let sharedExpenses = 0;
            const sharedTransactions = dataset.filter(t => 
              t.type === 'expense' && (t.is_shared || t.expense_splits?.length > 0)
            );
            
            sharedTransactions.forEach(t => {
              if (t.expense_splits && t.expense_splits.length > 0) {
                // Usar splits personalizados
                const split = t.expense_splits.find(s => s.cost_center_id === cc.id);
                if (split) {
                  const expenseAmount = parseFloat(t.amount || 0);
                  const splitAmount = parseFloat(split.amount || 0);
                  const totalSplitsAmount = t.expense_splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                  
                  if (totalSplitsAmount > expenseAmount && expenseAmount > 0) {
                    const splitPercentage = splitAmount / totalSplitsAmount;
                    sharedExpenses += expenseAmount * splitPercentage;
                  } else {
                    sharedExpenses += splitAmount;
                  }
                }
              } else if (t.is_shared) {
                // Fallback: usar default_split_percentage
                const percentage = parseFloat(cc.default_split_percentage || 0);
                const amount = parseFloat(t.amount || 0);
                sharedExpenses += (amount * percentage) / 100;
              }
            });
            
            const total = individualExpenses + sharedExpenses;

            return {
              label: cc.name,
              value: total,
              individual: individualExpenses,
              shared: sharedExpenses,
              color: cc.color || colors.error.main,
              percentage: statsExpense > 0 ? ((total / statsExpense) * 100).toFixed(1) : 0,
            };
          })
          .filter(item => item.value > 0);
      }
    }

    // Calcular à vista vs crédito (só para despesas)
    let paymentBreakdown = null;
    if (type === 'expense') {
      const cashAmount = dataset
        .filter(t => t.type === 'expense' && t.payment_method !== 'credit_card')
        .reduce((sum, t) => sum + (t.amount || 0), 0);
      
      const creditAmount = dataset
        .filter(t => t.type === 'expense' && t.payment_method === 'credit_card')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      paymentBreakdown = { cash: cashAmount, credit: creditAmount };
    }

    // Adicionar individual vs shared nos dados (já calculados no map acima)
    const detailedData = data;

    const sheetData = {
      title: type === 'income' ? 'Total de Entradas' : 'Total de Despesas',
      type,
      paymentBreakdown,
      responsibleData: detailedData,
      totalAmount: type === 'income' ? statsIncome : statsExpense,
    };
    
    setDetailedSheetData(sheetData);
    setDetailedSheetVisible(true);
  };

  if (orgLoading || financialsLoading) {
    return (
      <View style={styles.container}>
        <ScreenHeader user={user} title="Transações" showLogo={true} showNotifications={true} />
        <LoadingLogo fullScreen message="Carregando transações..." />
      </View>
    );
  }

  if (financialsError) {
    return (
      <View style={styles.container}>
        <ScreenHeader user={user} title="Transações" showLogo={true} showNotifications={true} />
        <EmptyState
          emoji="⚠️"
          title="Não foi possível carregar os dados"
          description="Tente novamente em instantes."
          actionLabel="Recarregar"
          onAction={loadTransactions}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Consistente - Igual ao Dashboard */}
      <ScreenHeader
        user={user}
        title="Transações"
        showLogo={true}
        showNotifications={true}
      />

      {/* Transactions List - Otimizado com SectionList */}
      {sectionsData.length === 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* Seletor de mês */}
          <View style={styles.section}>
            <MonthSelector
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
            />
          </View>

          {/* Cards de estatísticas */}
          <View style={styles.section}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScroll}
              snapToInterval={STAT_CARD_WIDTH + spacing[2]}
              decelerationRate="fast"
            >
              <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
                <StatCard
                  label="Total de Entradas"
                  value={formatCurrency(statsIncome)}
                  icon={<ArrowDownLeft size={20} color={colors.brand.primary} />}
                  variant="income"
                  style={{ width: STAT_CARD_WIDTH }}
                  onPress={() => handleStatCardPress('income')}
                />
                <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                  <HelpCircle size={14} color={colors.text.tertiary} />
                </View>
              </View>
              <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
                <StatCard
                  label="Total de Despesas"
                  value={formatCurrency(statsExpense)}
                  icon={<ArrowUpRight size={20} color={colors.error.main} />}
                  variant="expense"
                  style={{ width: STAT_CARD_WIDTH }}
                  onPress={() => handleStatCardPress('expense')}
                />
                <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                  <HelpCircle size={14} color={colors.text.tertiary} />
                </View>
              </View>
              <StatCard
                label="Saldo"
                value={formatCurrency(statsBalance)}
                icon={statsBalance >= 0 
                  ? <ArrowDownLeft size={20} color={colors.success.main} /> 
                  : <ArrowUpRight size={20} color={colors.error.main} />
                }
                variant={statsBalance >= 0 ? 'success' : 'danger'}
                style={{ width: STAT_CARD_WIDTH }}
                valueColor={statsBalance < 0 ? colors.error.main : colors.text.primary}
              />
            </ScrollView>
          </View>

          <TransactionsSearchFilters
            selectionMode={selectionMode}
            toggleSelectionMode={toggleSelectionMode}
            filterType={filterType}
            setFilterType={setFilterType}
            onOpenFilters={() => setFilterSheetVisible(true)}
            onSubmitSearch={handleSearchSubmit}
            onClearSearch={handleClearSearch}
            initialValue={searchQuery}
          />

          <EmptyState
            emoji="🔍"
            title="Nenhuma transação encontrada"
            description={searchQuery ? "Tente outro termo de busca" : "Adicione sua primeira transação"}
          />
        </ScrollView>
      ) : (
        <>
          <SectionList
            sections={sectionsData}
            keyExtractor={(item, index) => `${item.type}-${item.id}-${index}`}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item: transaction, index, section }) => {
              const isLast = index === section.data.length - 1;
              
              return (
                <TouchableOpacity
                  style={[
                    styles.transactionItem,
                    !isLast && styles.transactionItemBorder,
                    selectionMode && isItemSelected(transaction) && styles.transactionItemSelected
                  ]}
                  activeOpacity={0.7}
                  onPress={() => handleTransactionPress(transaction)}
                >
                  {/* Checkbox (se modo de seleção) */}
                  {selectionMode && (
                    <View style={styles.checkboxContainer}>
                      {isItemSelected(transaction) ? (
                        <CheckSquare size={24} color={colors.brand.primary} />
                      ) : (
                        <Square size={24} color={colors.text.tertiary} />
                      )}
                    </View>
                  )}
                  
                  {/* Icon */}
                  <View style={[
                    styles.transactionIcon,
                    { backgroundColor: transaction.type === 'income' 
                      ? colors.info.bg 
                      : colors.error.bg 
                    }
                  ]}>
                    {transaction.type === 'income' ? (
                      <ArrowDownLeft size={20} color={colors.brand.primary} />
                    ) : (
                      <ArrowUpRight size={20} color={colors.error.main} />
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.transactionInfo}>
                    <Callout weight="medium" numberOfLines={1}>
                      {transaction.description || 'Sem descrição'}
                    </Callout>
                    <Caption color="secondary" numberOfLines={1}>
                      {transaction.category_name || transaction.category || 'Sem categoria'}
                    </Caption>
                  </View>

                  {/* Amount */}
                  <View style={styles.transactionRight}>
                    <Callout 
                      weight="semiBold"
                      style={{ 
                        color: transaction.type === 'income' 
                          ? colors.brand.primary 
                          : colors.text.primary 
                      }}
                    >
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </Callout>
                    <ChevronRight size={16} color={colors.text.tertiary} />
                  </View>
                </TouchableOpacity>
              );
            }}
            renderSectionHeader={({ section }) => (
              <View style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Caption color="secondary" weight="semiBold">
                    {section.title}
                  </Caption>
                  <View style={styles.dateSummary}>
                    {section.totalIncomes > 0 && (
                      <Caption style={{ color: colors.brand.primary }}>
                        +{formatCurrency(section.totalIncomes)}
                      </Caption>
                    )}
                    {section.totalExpenses > 0 && (
                      <Caption style={{ color: colors.error.main }}>
                        -{formatCurrency(section.totalExpenses)}
                      </Caption>
                    )}
                  </View>
                </View>
              </View>
            )}
            renderSectionFooter={({ section }) => (
              <View style={{ marginBottom: spacing[2] }} />
            )}
            ListHeaderComponent={() => (
              <>
                {/* Seletor de mês */}
                <View style={styles.section}>
                  <MonthSelector
                    selectedMonth={selectedMonth}
                    onMonthChange={setSelectedMonth}
                  />
                </View>

                {/* Cards de estatísticas */}
                <View style={styles.section}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsScroll}
                    snapToInterval={STAT_CARD_WIDTH + spacing[2]}
                    decelerationRate="fast"
                  >
                    <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
                      <StatCard
                        label="Total de Entradas"
                        value={formatCurrency(statsIncome)}
                        icon={<ArrowDownLeft size={20} color={colors.brand.primary} />}
                        variant="income"
                        style={{ width: STAT_CARD_WIDTH }}
                        onPress={() => handleStatCardPress('income')}
                      />
                      <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                        <HelpCircle size={14} color={colors.text.tertiary} />
                      </View>
                    </View>
                    <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
                      <StatCard
                        label="Total de Despesas"
                        value={formatCurrency(statsExpense)}
                        icon={<ArrowUpRight size={20} color={colors.error.main} />}
                        variant="expense"
                        style={{ width: STAT_CARD_WIDTH }}
                        onPress={() => handleStatCardPress('expense')}
                      />
                      <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                        <HelpCircle size={14} color={colors.text.tertiary} />
                      </View>
                    </View>
                    <StatCard
                      label="Saldo"
                      value={formatCurrency(statsBalance)}
                      icon={statsBalance >= 0 
                        ? <ArrowDownLeft size={20} color={colors.success.main} /> 
                        : <ArrowUpRight size={20} color={colors.error.main} />
                      }
                      variant={statsBalance >= 0 ? 'success' : 'danger'}
                      style={{ width: STAT_CARD_WIDTH }}
                      valueColor={statsBalance < 0 ? colors.error.main : colors.text.primary}
                    />
                  </ScrollView>
                </View>

                <TransactionsSearchFilters
                  selectionMode={selectionMode}
                  toggleSelectionMode={toggleSelectionMode}
                  filterType={filterType}
                  setFilterType={setFilterType}
                  onOpenFilters={() => setFilterSheetVisible(true)}
                  onSubmitSearch={handleSearchSubmit}
                  onClearSearch={handleClearSearch}
                  initialValue={searchQuery}
                />
              </>
            )}
            stickySectionHeadersEnabled={false}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={10}
            removeClippedSubviews={true}
            getItemLayout={(data, index) => ({
              length: 72,
              offset: 72 * index,
              index,
            })}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              <>
                {loadingMore && (
                  <View style={styles.loadingMore}>
                    <ActivityIndicator size="small" color={colors.brand.primary} />
                    <Caption color="secondary" style={{ marginTop: spacing[1] }}>
                      Carregando mais...
                    </Caption>
                  </View>
                )}
                <View style={{ height: spacing[10] }} />
              </>
            }
            contentContainerStyle={styles.sectionListContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          />
        </>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedTransaction(null);
          setModalType('expense');
        }}
        onSave={handleSaveTransaction}
        transaction={selectedTransaction}
        type={modalType}
        categories={categories}
        costCenters={availableCostCenters}
        cards={cards}
        organization={organization}
        isSoloUser={isSoloMember}
      />

      {/* Bulk Actions Bar */}
      {selectionMode && selectedItems.length > 0 && (
        <View style={styles.bulkActionsBar}>
          <View style={styles.bulkActionsContent}>
            <Callout weight="semiBold">
              {selectedItems.length} selecionada(s)
            </Callout>
            <View style={styles.bulkActionsButtons}>
              <TouchableOpacity 
                style={styles.bulkActionButton}
                onPress={handleBulkDelete}
              >
                <Trash2 size={18} color={colors.error.main} />
                <Caption style={{ color: colors.error.main, marginLeft: spacing[0.5] }}>
                  Excluir
                </Caption>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Detailed Stats Sheet */}
      <DetailedStatsSheet
        visible={detailedSheetVisible}
        onClose={() => setDetailedSheetVisible(false)}
        title={detailedSheetData.title}
        type={detailedSheetData.type}
        paymentBreakdown={detailedSheetData.paymentBreakdown}
        responsibleData={detailedSheetData.responsibleData}
        totalAmount={detailedSheetData.totalAmount}
      />

      <TransactionDetailModal
        visible={detailModalVisible}
        transaction={detailTransaction}
        onClose={() => setDetailModalVisible(false)}
        onEdit={() => {
          openEditModal(detailTransaction);
          setDetailModalVisible(false);
        }}
        onDelete={() => handleDeleteTransaction(detailTransaction)}
        costCenters={availableCostCenters}
        cards={cards}
        categories={categories}
        organizationName={organization?.name}
        formatDateLabel={formatDate}
      />

      {/* Filter Sheet */}
      <FilterSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        filters={advancedFilters}
        onApplyFilters={(filters) => setAdvancedFilters(filters)}
        costCenters={availableCostCenters}
        categories={categories}
        paymentMethods={['credit_card', 'debit_card', 'cash', 'pix', 'bank_transfer', 'boleto']}
        cards={cards}
        organizationName={organizationName}
      />
    </View>
  );
}

const TransactionsSearchFilters = React.memo(function TransactionsSearchFilters({
  selectionMode,
  toggleSelectionMode,
  filterType,
  setFilterType,
  onOpenFilters,
  onSubmitSearch,
  onClearSearch,
  initialValue = '',
}) {
  const [searchText, setSearchText] = useState(initialValue);

  useEffect(() => {
    setSearchText(initialValue);
  }, [initialValue]);

  const handleSubmitEditing = useCallback(() => {
    onSubmitSearch(searchText);
  }, [onSubmitSearch, searchText]);

  const handleClear = useCallback(() => {
    setSearchText('');
    onClearSearch();
  }, [onClearSearch]);

  return (
    <View style={styles.searchSection}>
      <View style={styles.searchRow}>
        <View style={styles.searchInputWrapper}>
          <Input
            value={searchText}
            onChangeText={setSearchText}
            onSubmitEditing={handleSubmitEditing}
            blurOnSubmit={false}
            returnKeyType="search"
            placeholder="Buscar transações..."
            icon={<Search size={20} color={colors.text.secondary} />}
            rightIcon={searchText.length > 0 ? <X size={18} color={colors.text.secondary} /> : null}
            onRightIconPress={handleClear}
          />
        </View>
        
        <View style={styles.actionButtonsRow}>
          <TouchableOpacity 
            onPress={toggleSelectionMode}
            style={styles.actionButton}
          >
            {selectionMode ? (
              <X size={22} color={selectionMode ? colors.brand.primary : colors.text.primary} />
            ) : (
              <CheckSquare size={22} color={colors.text.primary} />
            )}
          </TouchableOpacity>
          
          <TouchableOpacity 
            onPress={onOpenFilters}
            style={styles.actionButton}
          >
            <Filter size={22} color={colors.text.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.filterChips}>
        <TouchableOpacity
          style={[styles.chip, filterType === 'all' && styles.chipActive]}
          onPress={() => setFilterType('all')}
        >
          <Text 
            variant="footnote" 
            weight="medium"
            style={{ color: filterType === 'all' ? colors.neutral[0] : colors.text.secondary }}
          >
            Todas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, filterType === 'income' && styles.chipActive]}
          onPress={() => setFilterType(filterType === 'income' ? 'all' : 'income')}
        >
          <ArrowDownLeft size={14} color={filterType === 'income' ? colors.neutral[0] : colors.brand.primary} />
          <Text 
            variant="footnote" 
            weight="medium"
            style={{ color: filterType === 'income' ? colors.neutral[0] : colors.text.secondary }}
          >
            Entradas
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.chip, filterType === 'expense' && styles.chipActive]}
          onPress={() => setFilterType(filterType === 'expense' ? 'all' : 'expense')}
        >
          <ArrowUpRight size={14} color={filterType === 'expense' ? colors.neutral[0] : colors.error.main} />
          <Text 
            variant="footnote" 
            weight="medium"
            style={{ color: filterType === 'expense' ? colors.neutral[0] : colors.text.secondary }}
          >
            Despesas
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const paymentMethodLabels = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  cash: 'Dinheiro',
  pix: 'PIX',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
};

const formatPaymentMethodLabel = (method) => {
  if (!method) return '—';
  return paymentMethodLabels[method] || method;
};

const TransactionDetailModal = ({
  visible,
  transaction,
  onClose,
  onEdit,
  onDelete,
  costCenters = [],
  cards = [],
  categories = [],
  organizationName = 'Família',
  formatDateLabel,
}) => {
  if (!transaction) return null;

  const isExpense = transaction.type === 'expense';
  const amount = Number(transaction.amount || 0);
  const splits = isExpense
    ? transaction.expense_splits || []
    : transaction.income_splits || [];

  const categoryName =
    transaction.category_name ||
    transaction.category ||
    categories.find((cat) => cat.id === transaction.category_id)?.name ||
    'Sem categoria';

  const cardName = transaction.card_id
    ? transaction.card_name ||
      cards.find((card) => card.id === transaction.card_id)?.name ||
      '—'
    : '—';

  const responsible = transaction.cost_center_id
    ? costCenters.find((cc) => cc.id === transaction.cost_center_id)
    : null;

  const formattedDate = formatDateLabel
    ? formatDateLabel(transaction.date)
    : transaction.date;

  const renderDetailRow = (label, value) => (
    <View style={styles.detailRow}>
      <Caption color="secondary">{label}</Caption>
      <Callout weight="medium" style={styles.detailValue}>
        {value || '—'}
      </Callout>
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.detailOverlay}>
        <TouchableOpacity style={styles.detailBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.detailHeader}>
            <View>
              <Caption color="secondary">
                {transaction.type === 'income' ? 'Entrada' : 'Despesa'}
              </Caption>
              <Title2 weight="bold">{formatCurrency(amount)}</Title2>
            </View>
            <TouchableOpacity onPress={onClose}>
              <X size={22} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.detailContent}>
            {renderDetailRow('Descrição', transaction.description || 'Sem descrição')}
            {renderDetailRow('Data', formattedDate || '—')}
            {renderDetailRow('Categoria', categoryName)}
            {isExpense &&
              renderDetailRow(
                'Forma de Pagamento',
                formatPaymentMethodLabel(transaction.payment_method)
              )}
            {isExpense &&
              transaction.payment_method === 'credit_card' &&
              renderDetailRow('Cartão', cardName)}
            {transaction.installment_info &&
              renderDetailRow(
                'Parcelas',
                `${transaction.installment_info.current_installment}/${transaction.installment_info.total_installments}`
              )}

            {responsible && renderDetailRow('Responsável', responsible.name)}

            {isExpense && splits.length > 0 && (
              <View style={styles.detailSection}>
                <Caption color="secondary" style={styles.sectionTitle}>
                  Divisão por Responsável
                </Caption>
                {splits.map((split) => {
                  const splitOwner = costCenters.find((cc) => cc.id === split.cost_center_id);
                  const splitAmount = Number(split.amount || 0);
                  const percentage =
                    amount > 0 ? ((splitAmount / amount) * 100).toFixed(1) : null;
                  return (
                    <View key={`${split.cost_center_id}-${split.amount}`} style={styles.splitRow}>
                      <Callout weight="medium">
                        {splitOwner?.name || organizationName}
                      </Callout>
                      <View style={styles.spacer} />
                      <Callout weight="semiBold">{formatCurrency(splitAmount)}</Callout>
                      {percentage && (
                        <Caption color="secondary" style={{ marginLeft: spacing[1] }}>
                          {percentage}%
                        </Caption>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

          </ScrollView>

          <View style={styles.detailFooter}>
            <TouchableOpacity style={styles.detailDangerButton} onPress={onDelete}>
              <Callout weight="semiBold" style={{ color: colors.neutral[0] }}>
                Excluir
              </Callout>
            </TouchableOpacity>
            <TouchableOpacity style={styles.detailPrimaryButton} onPress={onEdit}>
              <Callout weight="semiBold" style={{ color: colors.neutral[0] }}>
                Editar
              </Callout>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background.primary,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },

  section: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },

  statsScroll: {
    gap: spacing[1.5],
  },

  searchSection: {
    gap: spacing[2],
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },

  searchInputWrapper: {
    flex: 1,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    gap: spacing[1.5],
    alignItems: 'center',
  },

  actionButton: {
    padding: spacing[1],
  },

  filterChips: {
    flexDirection: 'row',
    gap: spacing[1.5],
    justifyContent: 'center',
  },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },

  chipActive: {
    backgroundColor: colors.brand.primary,
    borderColor: colors.brand.primary,
  },

  dateGroup: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
  },

  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1.5],
    paddingHorizontal: spacing[1],
  },

  dateSummary: {
    flexDirection: 'row',
    gap: spacing[2],
  },

  transactionsCard: {
    padding: 0,
    overflow: 'hidden',
  },

  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
    gap: spacing[2],
  },

  transactionItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },

  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },

  transactionInfo: {
    flex: 1,
    gap: spacing[0.5],
  },
  spacer: {
    flex: 1,
  },

  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },

  transactionItemSelected: {
    backgroundColor: colors.brand.bg,
  },

  checkboxContainer: {
    marginRight: spacing[1],
  },

  bulkActionsBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background.secondary,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingBottom: Platform.OS === 'ios' ? spacing[4] : spacing[2],
    ...shadows.lg,
  },

  bulkActionsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },

  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.error.main,
    borderRadius: radius.lg,
  },

  detailOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  detailSheet: {
    backgroundColor: colors.background.primary,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '90%',
    paddingBottom: spacing[4],
  },
  detailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingTop: spacing[3],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailContent: {
    paddingHorizontal: spacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1.5],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailValue: {
    textAlign: 'right',
    marginLeft: spacing[2],
  },
  detailSection: {
    marginTop: spacing[3],
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },
  detailFooter: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  detailPrimaryButton: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.brand.primary,
    alignItems: 'center',
  },
  detailDangerButton: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    backgroundColor: colors.error.main,
    alignItems: 'center',
  },

  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    backgroundColor: 'rgba(0, 0, 0, 0.5)', // OVERLAY ESCURO COM FADE
  },

  backdrop: {
    // REMOVIDO - não usar mais
  },

  tooltipContainer: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowOpacity: 0,
    elevation: 0,
  },

  tooltipCard: {
    shadowOpacity: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    // Garantir que não há sombra vinda do Card component
    backgroundColor: colors.background.secondary,
  },

  tooltipHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  sectionListContent: {
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  loadingMore: {
    paddingVertical: spacing[3],
    alignItems: 'center',
    justifyContent: 'center',
  },

  tooltipContent: {
    flexGrow: 1,
  },

  tooltipSection: {
    marginBottom: spacing[3],
  },

  tooltipSectionTitle: {
    marginBottom: spacing[2],
  },

  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },

  tooltipRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
    flex: 1,
  },

  tooltipDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },

});
