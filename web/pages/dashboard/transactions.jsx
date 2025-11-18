import { useEffect, useState } from 'react';
import { buildOwnerColorMap, normalizeKey, textColorForBg } from '../../lib/colors';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import Link from 'next/link';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Button } from '../../components/ui/Button';
import TransactionModal from '../../components/TransactionModal';
import EditExpenseModal from '../../components/EditExpenseModal';
import ConfirmationModal from '../../components/ConfirmationModal';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import NotificationModal from '../../components/NotificationModal';
import LoadingLogo from '../../components/LoadingLogo';
import { TrendingUp, TrendingDown, Bell, Settings, Search, LogOut, Calendar, Users, Target, Edit, Trash2, CreditCard, Plus, DollarSign, User, HelpCircle } from 'lucide-react';
import Header from '../../components/Header';
import { normalizeName, isSameName } from '../../utils/nameNormalizer';
import ResponsiveTable from '../../components/ui/ResponsiveTable';
import Tooltip from '../../components/ui/Tooltip';
import Footer from '../../components/Footer';

export default function TransactionsDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const { organization, costCenters, budgetCategories, loading: orgLoading, error: orgError, user: orgUser, isSoloUser } = useOrganization();
  const { success, error: showError } = useNotificationContext();
  const [openTooltip, setOpenTooltip] = useState(null);
  
  
  // Fallback para quando V2 não está configurado
  const isV2Ready = organization && organization.id !== 'default-org';
  const [expenses, setExpenses] = useState([]);
  const [incomes, setIncomes] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({
    month: new Date().toISOString().slice(0, 7), // Mês atual
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
  const [selectedTransactions, setSelectedTransactions] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  
  // Paginação
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // Resetar para página 1 quando filtros mudarem
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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

  // Limpar seleção quando filtros mudarem
  useEffect(() => {
    setSelectedTransactions([]);
  }, [filter]);

  // Combinar expenses e incomes após ambos estarem carregados
  useEffect(() => {
    if (expenses.length >= 0 && incomes.length >= 0) {
      const combined = [
        ...expenses.map(e => ({ ...e, type: 'expense' })),
        ...incomes.map(i => ({ ...i, type: 'income' }))
      ].sort((a, b) => {
        // Primeiro ordenar por data (mais recente primeiro)
        const dateA = new Date(a.date + 'T00:00:00');
        const dateB = new Date(b.date + 'T00:00:00');
        
        if (dateB.getTime() !== dateA.getTime()) {
          return dateB.getTime() - dateA.getTime();
        }
        
        // Se a data for igual, ordenar por created_at (mais recente primeiro)
        // Isso garante ordem cronológica real mesmo quando transações têm a mesma data
        const createdA = new Date(a.created_at || a.confirmed_at || 0);
        const createdB = new Date(b.created_at || b.confirmed_at || 0);
        
        return createdB.getTime() - createdA.getTime();
      });
      
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
          category:budget_categories(name, color),
          cost_center:cost_centers(name, color),
          expense_splits (
            id,
            cost_center_id,
            percentage,
            amount
          )
        `)
        .eq('status', 'confirmed')
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }); // Desempate cronológico

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
        let allExpensesQuery = supabase
          .from('expenses')
          .select(`
            *,
            category:budget_categories(name, color),
            cost_center:cost_centers(name, color),
            expense_splits (
              id,
              cost_center_id,
              percentage,
              amount
            )
          `)
          .eq('status', 'confirmed')
          .eq('organization_id', organization.id);
        
        // Aplicar filtro de mês também na busca de owner
        if (filter.month) {
          const startOfMonth = `${filter.month}-01`;
          const [year, month] = filter.month.split('-');
          const lastDay = new Date(year, month, 0).getDate();
          const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
          allExpensesQuery = allExpensesQuery.gte('date', startOfMonth).lte('date', endOfMonthStr);
        }
        
        const { data: allExpenses } = await allExpensesQuery
          .order('date', { ascending: false })
          .order('created_at', { ascending: false }); // Desempate cronológico
        
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

      // Debug: verificar se há despesas fora do mês selecionado
      if (filter.month && data) {
        const startOfMonth = `${filter.month}-01`;
        const [year, month] = filter.month.split('-');
        const lastDay = new Date(year, month, 0).getDate();
        const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
        const expensesInMonth = data.filter(e => e.date >= startOfMonth && e.date <= endOfMonthStr);
        const expensesOutOfMonth = data.filter(e => e.date < startOfMonth || e.date > endOfMonthStr);
        
        if (expensesOutOfMonth.length > 0) {
          console.warn('⚠️ [FINANCE] Despesas fora do mês selecionado encontradas:', {
            month: filter.month,
            inMonth: expensesInMonth.length,
            outOfMonth: expensesOutOfMonth.length,
            outOfMonthDates: expensesOutOfMonth.map(e => ({ id: e.id, date: e.date, amount: e.amount }))
          });
        }
      }
      
      console.log('🔍 [FINANCE] Query result:', {
        dataLength: data?.length || 0,
        filter,
        organizationId: organization?.id,
        isV2Ready
      });

      // Dados sem filtro de privacidade (tudo visível)
      setExpenses(data || []);
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
        .order('date', { ascending: false })
        .order('created_at', { ascending: false }); // Desempate cronológico

      const { data, error } = await query;
      
      if (error) throw error;

      // Dados sem filtro de privacidade (tudo visível)
      setIncomes(data || []);
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

  // Handlers para seleção em massa
  const handleSelectionChange = (transactionId, checked) => {
    if (checked) {
      setSelectedTransactions(prev => [...prev, transactionId]);
    } else {
      setSelectedTransactions(prev => prev.filter(id => id !== transactionId));
    }
  };

  const handleSelectAll = (checked) => {
    const sortedFiltered = sortTransactions(filterTransactions(transactions));
    if (checked) {
      setSelectedTransactions(sortedFiltered.map(t => t.id || t));
    } else {
      setSelectedTransactions([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedTransactions.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedTransactions.length === 0) return;

    setDeleting(true);
    setShowBulkDeleteConfirm(false);

    try {
      const sortedFiltered = sortTransactions(filterTransactions(transactions));
      const transactionsToDelete = sortedFiltered.filter(t => 
        selectedTransactions.includes(t.id || t)
      );

      // Separar incomes e expenses
      const incomesToDelete = transactionsToDelete.filter(t => t.type === 'income');
      const expensesToDelete = transactionsToDelete.filter(t => t.type === 'expense');

      let deletedCount = 0;
      let errors = [];
      const deletedExpenseIds = new Set();

      // Excluir incomes
      if (incomesToDelete.length > 0) {
        const incomeIds = incomesToDelete.map(t => t.id);
        const { error } = await supabase
          .from('incomes')
          .delete()
          .in('id', incomeIds);
        
        if (error) {
          errors.push('Erro ao excluir entradas: ' + error.message);
        } else {
          deletedCount += incomeIds.length;
        }
      }

      // Excluir expenses (considerar parcelas e bills)
      if (expensesToDelete.length > 0) {
        // Buscar expenses completos do estado para verificar parcelas
        const expensesToDeleteWithDetails = expensesToDelete.map(t => {
          const fullExpense = expenses.find(e => e.id === t.id);
          return fullExpense || t;
        });

        // Coletar todos os IDs de expenses que serão excluídos (incluindo parcelas)
        const allExpenseIdsToDelete = new Set(expensesToDelete.map(t => t.id));

        // Identificar expenses com parcelas (parent_expense_id ou installment_info)
        const expensesWithInstallments = expensesToDeleteWithDetails.filter(e => {
          // Se é uma parcela (tem parent_expense_id), precisa excluir todas as parcelas
          if (e.parent_expense_id) {
            return true;
          }
          // Se é a transação principal e tem parcelas
          if (e.installment_info && e.installment_info.total_installments > 1) {
            return true;
          }
          return false;
        });

        // Excluir todas as parcelas relacionadas
        for (const expense of expensesWithInstallments) {
          const parentId = expense.parent_expense_id || expense.id;
          
          // Buscar todas as parcelas relacionadas
          const { data: allInstallments, error: fetchError } = await supabase
            .from('expenses')
            .select('id')
            .or(`id.eq.${parentId},parent_expense_id.eq.${parentId}`);
          
          if (fetchError) {
            errors.push(`Erro ao buscar parcelas de ${expense.description}: ${fetchError.message}`);
            continue;
          }

          if (allInstallments && allInstallments.length > 0) {
            const installmentIds = allInstallments.map(i => i.id);
            // Adicionar todas as parcelas à lista de IDs a excluir
            installmentIds.forEach(id => allExpenseIdsToDelete.add(id));
          }
        }

        // ANTES de excluir expenses, remover referências em bills
        const expenseIdsArray = Array.from(allExpenseIdsToDelete);
        
        if (expenseIdsArray.length > 0) {
          // Buscar todas as bills que referenciam essas expenses
          const { data: billsToUpdate, error: billsFetchError } = await supabase
            .from('bills')
            .select('id, expense_id')
            .in('expense_id', expenseIdsArray);
          
          if (billsFetchError) {
            errors.push(`Erro ao buscar contas relacionadas: ${billsFetchError.message}`);
          } else if (billsToUpdate && billsToUpdate.length > 0) {
            // Remover referências expense_id das bills
            const billIdsToUpdate = billsToUpdate.map(b => b.id);
            const { error: updateBillsError } = await supabase
              .from('bills')
              .update({ expense_id: null })
              .in('id', billIdsToUpdate);
            
            if (updateBillsError) {
              errors.push(`Erro ao remover referências de contas: ${updateBillsError.message}`);
            }
          }

          // Excluir expense_splits relacionados
          const { error: splitsError } = await supabase
            .from('expense_splits')
            .delete()
            .in('expense_id', expenseIdsArray);
          
          if (splitsError) {
            console.warn('⚠️ Erro ao excluir splits (pode não existir):', splitsError);
          }

          // Agora excluir as expenses
          const { error: deleteError } = await supabase
            .from('expenses')
            .delete()
            .in('id', expenseIdsArray);
          
          if (deleteError) {
            errors.push('Erro ao excluir despesas: ' + deleteError.message);
          } else {
            deletedCount += expenseIdsArray.length;
          }
        }
      }

      // Recarregar dados
      await Promise.all([fetchExpenses(), fetchIncomes()]);

      // Limpar seleção
      setSelectedTransactions([]);

      // Mostrar mensagem de sucesso ou erro
      if (errors.length > 0) {
        showError('Alguns itens não puderam ser excluídos: ' + errors.join(', '));
      } else {
        success(`${deletedCount} transação(ões) excluída(s) com sucesso!`);
      }
    } catch (error) {
      console.error('Erro ao excluir em massa:', error);
      showError('Erro ao excluir transações: ' + (error.message || 'Erro desconhecido'));
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
          ? (t.is_shared ? (organization?.name || 'Família') : t.cost_center?.name)
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

  // Calcular totais dinamicamente por responsável
  // SEMPRE incluir todos os responsáveis individuais + owners das despesas
  const uniqueOwners = [];
  const seenOwners = new Set();
  
  // 1. Adicionar todos os responsáveis individuais primeiro
  (costCenters || []).forEach(cc => {
    if (cc.type === 'individual') {
      const normalized = normalizeName(cc.name);
      if (!seenOwners.has(normalized)) {
        seenOwners.add(normalized);
        uniqueOwners.push(cc.name);
      }
    }
  });
  
  // 2. Adicionar owners das despesas (incluindo compartilhadas da família)
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
    const isCompartilhado = normalizeName(owner) === 'compartilhado' || normalizeName(owner) === normalizeName(organization?.name || 'família');
    
    if (isCompartilhado) {
      // Para despesas compartilhadas da família, somar o valor TOTAL das despesas compartilhadas
      totals[owner] = expenses
        .filter(e => e.status === 'confirmed' && isSameName(e.owner, owner))
        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    } else {
      // Para responsáveis individuais, considerar splits
      let total = 0;
      
      expenses.forEach(e => {
        if (e.status !== 'confirmed') return;
        
        if (e.is_shared || (e.owner === 'Compartilhado' || e.owner === (organization?.name || 'Família'))) {
          // Despesa compartilhada: buscar o split deste responsável
          if (e.expense_splits && e.expense_splits.length > 0) {
            // Usar splits personalizados
            const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
            if (ownerCostCenter) {
              const split = e.expense_splits.find(s => s.cost_center_id === ownerCostCenter.id);
              if (split) {
                const expenseAmount = parseFloat(e.amount || 0);
                const splitAmount = parseFloat(split.amount || 0);
                const totalSplitsAmount = e.expense_splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                
                // Se os splits somam mais que o valor da despesa (dados incorretos),
                // calcular proporcionalmente baseado no valor da despesa
                if (totalSplitsAmount > expenseAmount && expenseAmount > 0) {
                  // Calcular proporção do split em relação ao total dos splits
                  const splitPercentage = splitAmount / totalSplitsAmount;
                  // Aplicar essa proporção ao valor real da despesa
                  total += expenseAmount * splitPercentage;
                } else {
                  // Caso normal: usar o valor do split diretamente
                  total += splitAmount;
                }
              }
            }
          } else {
            // Usar fallback (default_split_percentage do cost_center)
            const ownerCostCenter = costCenters.find(cc => isSameName(cc.name, owner));
            if (ownerCostCenter) {
              const percentage = parseFloat(ownerCostCenter.default_split_percentage || 0);
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
          <p className="text-gray-600 mb-4">Você precisa criar uma conta ou ser convidado para uma organização.</p>
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
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Transações"
      >
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        {/* Header Actions (consistência com /cards) */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Gestão de Transações</h2>
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 hidden sm:block">Mês:</label>
                  <input
                    type="month"
                    value={filter.month}
                    onChange={(e) => setFilter({ ...filter, month: e.target.value })}
                    className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue text-sm"
                  />
                </div>
                <Button 
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={() => setShowTransactionModal(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Despesa
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
              <CardContent className="p-3 pt-0 relative">
                {/* Ícone de ajuda discreto */}
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {Number(
                    incomes
                      .filter(i => i.status === 'confirmed')
                      .reduce((sum, i) => sum + parseFloat(i.amount || 0), 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                        <span className="text-gray-900 font-semibold">R$ {Number(total).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
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
                  <TrendingDown className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                {/* Ícone de ajuda discreto */}
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  - R$ {Number(
                    expenses
                      .filter(e => {
                        if (e.status !== 'confirmed') return false;
                        // Aplicar filtro de mês se existir
                        if (filter.month) {
                          const startOfMonth = `${filter.month}-01`;
                          const [year, month] = filter.month.split('-');
                          const lastDay = new Date(year, month, 0).getDate();
                          const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
                          return e.date >= startOfMonth && e.date <= endOfMonthStr;
                        }
                        return true;
                      })
                      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                  ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Total de todas as despesas
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'despesas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Divisão por Forma de Pagamento</p>
              <div className="space-y-3">
                {(() => {
                  const confirmedExpenses = expenses.filter(e => e.status === 'confirmed');
                  
                  // Calcular total à vista
                  const totalAVista = confirmedExpenses
                    .filter(e => 
                      e.payment_method === 'cash' || 
                      e.payment_method === 'debit_card' || 
                      e.payment_method === 'pix' || 
                      e.payment_method === 'bank_transfer' || 
                      e.payment_method === 'boleto' || 
                      e.payment_method === 'other'
                    )
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                  
                  // Calcular total crédito
                  const totalCredito = confirmedExpenses
                    .filter(e => e.payment_method === 'credit_card')
                    .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                  
                  const totalDespesas = totalAVista + totalCredito;
                  const porcentagemAVista = totalDespesas > 0 ? ((totalAVista / totalDespesas) * 100).toFixed(1) : 0;
                  const porcentagemCredito = totalDespesas > 0 ? ((totalCredito / totalDespesas) * 100).toFixed(1) : 0;
                  
                  return (
                    <>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                          <span className="text-gray-700 font-medium">À Vista</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">- R$ {Number(totalAVista).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{porcentagemAVista}%</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                          <span className="text-gray-700 font-medium">Crédito</span>
                        </div>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">- R$ {Number(totalCredito).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                          <span className="text-gray-500 ml-2">{porcentagemCredito}%</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Card Total de Despesas Individuais - CINZA (apenas para contas solo) */}
          {isSoloUser && (
            <div className="relative group">
              <Card 
                className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
                onClick={() => setOpenTooltip(openTooltip === 'individuais' ? null : 'individuais')}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                  <CardTitle className="text-sm font-medium text-gray-600">
                    Total de Despesas
                  </CardTitle>
                  <div className="p-2 rounded-lg bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                </CardHeader>
                <CardContent className="p-3 pt-0 relative">
                  <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    - R$ {Number(
                      expenses
                        .filter(e => {
                          if (e.status !== 'confirmed') return false;
                          // Aplicar filtro de mês se existir
                          if (filter.month) {
                            const startOfMonth = `${filter.month}-01`;
                            const [year, month] = filter.month.split('-');
                            const lastDay = new Date(year, month, 0).getDate();
                            const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
                            return e.date >= startOfMonth && e.date <= endOfMonthStr;
                          }
                          return true;
                        })
                        .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
                    ).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Total de todas as despesas
                  </p>
                </CardContent>
              </Card>
            
              {/* Tooltip */}
              <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'individuais' ? 'visible' : 'invisible'}`}>
                <p className="text-sm font-semibold text-gray-900 mb-3">Divisão por Forma de Pagamento</p>
                <div className="space-y-3">
                  {(() => {
                    const confirmedExpenses = expenses.filter(e => e.status === 'confirmed');
                    
                    const totalAVista = confirmedExpenses
                      .filter(e => 
                        e.payment_method === 'cash' || 
                        e.payment_method === 'debit_card' || 
                        e.payment_method === 'pix' || 
                        e.payment_method === 'bank_transfer' || 
                        e.payment_method === 'boleto' || 
                        e.payment_method === 'other'
                      )
                      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    
                    const totalCredito = confirmedExpenses
                      .filter(e => e.payment_method === 'credit_card')
                      .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
                    
                    const totalDespesas = totalAVista + totalCredito;
                    const porcentagemAVista = totalDespesas > 0 ? ((totalAVista / totalDespesas) * 100).toFixed(1) : 0;
                    const porcentagemCredito = totalDespesas > 0 ? ((totalCredito / totalDespesas) * 100).toFixed(1) : 0;
                    
                    return (
                      <>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                            <span className="text-gray-700 font-medium">À Vista</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-900 font-semibold">- R$ {Number(totalAVista).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-gray-500 ml-2">{porcentagemAVista}%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-2">
                            <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                            <span className="text-gray-700 font-medium">Crédito</span>
                          </div>
                          <div className="text-right">
                            <span className="text-gray-900 font-semibold">- R$ {Number(totalCredito).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            <span className="text-gray-500 ml-2">{porcentagemCredito}%</span>
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* StatsCards por Responsável - Apenas para contas familiares - DENTRO DO MESMO GRID */}
          {!isSoloUser && costCenters && (() => {
            // Debug: calcular total geral uma vez antes do map
            const allExpensesInMonth = expenses.filter(e => e.status === 'confirmed' && (filter.month ? (() => {
              const startOfMonth = `${filter.month}-01`;
              const [year, month] = filter.month.split('-');
              const lastDay = new Date(year, month, 0).getDate();
              const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
              return e.date >= startOfMonth && e.date <= endOfMonthStr;
            })() : true));
            const totalGeral = allExpensesInMonth.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            const individuais = allExpensesInMonth.filter(e => !e.is_shared && !e.expense_splits?.length).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            const compartilhadas = allExpensesInMonth.filter(e => e.is_shared || e.expense_splits?.length).reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            console.log('🔍 [TRANSACTIONS] Total Geral do Mês:', {
              totalGeral,
              individuais,
              compartilhadas,
              countIndividuais: allExpensesInMonth.filter(e => !e.is_shared && !e.expense_splits?.length).length,
              countCompartilhadas: allExpensesInMonth.filter(e => e.is_shared || e.expense_splits?.length).length,
              filterMonth: filter.month
            });
            return null;
          })()}
          {!isSoloUser && costCenters && costCenters.filter(cc => cc && cc.is_active !== false && !cc.is_shared).map((cc) => {
            // Função auxiliar para verificar se a despesa está no mês selecionado
            const isInSelectedMonth = (e) => {
              if (!filter.month) return true;
              const startOfMonth = `${filter.month}-01`;
              const [year, month] = filter.month.split('-');
              const lastDay = new Date(year, month, 0).getDate();
              const endOfMonthStr = `${year}-${month}-${lastDay.toString().padStart(2, '0')}`;
              return e.date >= startOfMonth && e.date <= endOfMonthStr;
            };
            
            // Despesas individuais deste responsável (apenas do mês selecionado)
            const individualExpenses = expenses
              .filter(e => e.status === 'confirmed' && !e.is_shared && e.cost_center_id === cc.id && isInSelectedMonth(e))
              .reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            
            // Parte deste responsável nas despesas compartilhadas (apenas do mês selecionado)
            let sharedExpenses = 0;
            const sharedExpensesInMonth = expenses.filter(e => 
              e.status === 'confirmed' && 
              (e.is_shared || e.expense_splits?.length > 0) && 
              isInSelectedMonth(e)
            );
            
            sharedExpensesInMonth.forEach(e => {
              if (e.expense_splits && e.expense_splits.length > 0) {
                // Usar splits personalizados
                const split = e.expense_splits.find(s => s.cost_center_id === cc.id);
                if (split) {
                  const expenseAmount = parseFloat(e.amount || 0);
                  const splitAmount = parseFloat(split.amount || 0);
                  const totalSplitsAmount = e.expense_splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
                  
                  // Se os splits somam mais que o valor da despesa (dados incorretos),
                  // calcular proporcionalmente baseado no valor da despesa
                  if (totalSplitsAmount > expenseAmount && expenseAmount > 0) {
                    // Calcular proporção do split em relação ao total dos splits
                    const splitPercentage = splitAmount / totalSplitsAmount;
                    // Aplicar essa proporção ao valor real da despesa
                    sharedExpenses += expenseAmount * splitPercentage;
                  } else {
                    // Caso normal: usar o valor do split diretamente
                    sharedExpenses += splitAmount;
                  }
                }
              } else if (e.is_shared) {
                // Usar fallback (split_percentage do cost_center)
                const percentage = parseFloat(cc.default_split_percentage || 0);
                const amount = parseFloat(e.amount || 0);
                sharedExpenses += (amount * percentage) / 100;
              }
            });
            
            const totalExpenses = individualExpenses + sharedExpenses;
            
            // Calcular total geral para porcentagem (apenas do mês selecionado)
            // IMPORTANTE: Para despesas compartilhadas, somar apenas uma vez o valor total
            // Não somar os splits individuais, pois isso causaria duplicação
            const totalAllExpenses = expenses
              .filter(e => {
                if (e.status !== 'confirmed') return false;
                return isInSelectedMonth(e);
              })
              .reduce((sum, e) => {
                // Se é despesa compartilhada, somar apenas uma vez o valor total
                // Se é despesa individual, somar o valor normalmente
                return sum + parseFloat(e.amount || 0);
              }, 0);
            
            // Debug: log dos cálculos por responsável (todos os cost centers)
            const allExpensesInMonth = expenses.filter(e => e.status === 'confirmed' && isInSelectedMonth(e));
            const totalAllExpensesCalculated = allExpensesInMonth.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
            
            // Debug: verificar se há splits de despesas fora do mês
            const sharedExpensesDebug = sharedExpensesInMonth.map(e => {
              const split = e.expense_splits?.find(s => s.cost_center_id === cc.id);
              const expenseAmount = parseFloat(e.amount || 0);
              const splitAmount = split ? parseFloat(split.amount || 0) : 0;
              const totalSplitsAmount = e.expense_splits?.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0) || 0;
              const isIncorrect = totalSplitsAmount > expenseAmount && expenseAmount > 0;
              const calculatedAmount = isIncorrect ? (expenseAmount * (splitAmount / totalSplitsAmount)) : splitAmount;
              
              return {
                id: e.id,
                date: e.date,
                amount: expenseAmount,
                description: e.description,
                splitAmount: splitAmount,
                calculatedAmount: calculatedAmount, // Valor que será usado no cálculo
                isIncorrect: isIncorrect, // Flag se os splits estão incorretos
                allSplits: e.expense_splits?.map(s => ({ cost_center_id: s.cost_center_id, amount: s.amount })),
                totalSplitsAmount: totalSplitsAmount
              };
            });
            
            console.log(`📊 [TRANSACTIONS] Cálculo para ${cc.name}:`, {
              costCenterId: cc.id,
              costCenterName: cc.name,
              individualExpenses,
              sharedExpenses,
              totalExpenses,
              totalAllExpenses,
              totalAllExpensesCalculated, // Recalculado para verificar
              percentage: totalAllExpenses > 0 ? ((totalExpenses / totalAllExpenses) * 100).toFixed(1) : 0,
              filterMonth: filter.month,
              expensesCount: allExpensesInMonth.length,
              individualCount: expenses.filter(e => e.status === 'confirmed' && !e.is_shared && e.cost_center_id === cc.id && isInSelectedMonth(e)).length,
              sharedCount: sharedExpensesInMonth.length,
              sharedExpensesDebug // Detalhes de cada despesa compartilhada
            });
            
            const percentage = totalAllExpenses > 0 ? ((totalExpenses / totalAllExpenses) * 100).toFixed(1) : 0;
            
            return (
              <div key={cc.id} className="relative group">
                <Card 
                  className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
                  onClick={() => setOpenTooltip(openTooltip === `cc-${cc.id}` ? null : `cc-${cc.id}`)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                    <CardTitle className="text-sm font-medium text-gray-600 truncate flex-1">
                      {cc.name}
                    </CardTitle>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <User className="h-4 w-4 text-gray-600" />
                    </div>
                  </CardHeader>
                  <CardContent className="p-3 pt-0 relative">
                    <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      - R$ {Number(totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {percentage}% do total
                    </p>
                  </CardContent>
                </Card>
                
                {/* Tooltip */}
                <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 w-full md:invisible md:group-hover:visible ${openTooltip === `cc-${cc.id}` ? 'visible' : 'invisible'}`}>
                  <p className="text-sm font-semibold text-gray-900 mb-3">Composição das Despesas</p>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: cc.color || '#6B7280' }}
                        />
                        <span className="text-gray-700 font-medium">Individuais</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-900 font-semibold">
                          - R$ {Number(individualExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {totalExpenses > 0 && (
                          <span className="text-gray-500 ml-2">
                            {((individualExpenses / totalExpenses) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                        <span className="text-gray-700 font-medium">{organization?.name || 'Família'}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-gray-900 font-semibold">
                          - R$ {Number(sharedExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        {totalExpenses > 0 && (
                          <span className="text-gray-500 ml-2">
                            {((sharedExpenses / totalExpenses) * 100).toFixed(1)}%
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-gray-200">
                      <div className="flex items-center justify-between text-sm font-semibold">
                        <span className="text-gray-900">Total</span>
                        <span className="text-gray-900">
                          - R$ {Number(totalExpenses).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

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
                    {!costCenters?.some(cc => cc.name === (organization?.name || 'Família')) && (
                      <option value={organization?.name || 'Família'}>{organization?.name || 'Família'}</option>
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
            <div className="flex items-center justify-between">
            <CardTitle className="flex items-center space-x-2">
              <div className="p-2 bg-flight-blue/5 rounded-lg">
                <TrendingUp className="h-4 w-4 text-flight-blue" />
              </div>
              <span>Transações Gerais</span>
            </CardTitle>
              {selectedTransactions.length > 0 && (
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">
                    {selectedTransactions.length} selecionada(s)
                  </span>
                  <Button
                    onClick={handleBulkDelete}
                    className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 shadow-sm hover:shadow-md transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir Selecionadas
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="overflow-visible">
            {/* Helper para renderizar owner com tooltip */}
                      {(() => {
              const renderOwner = (transaction, isMobile = false) => {
                const isIncome = transaction.type === 'income';
                        const owner = isIncome 
                          ? (transaction.is_shared ? (organization?.name || 'Família') : transaction.cost_center?.name)
                          : (transaction.cost_center?.name || transaction.owner || (transaction.is_shared ? (organization?.name || 'Família') : '-'));
                        
                        const isShared = transaction.is_shared || owner === (organization?.name || 'Família');
                        
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
                          splitInfo = costCenters
                            .filter(cc => cc.is_active !== false && cc.user_id)
                            .map(cc => ({
                              name: cc.name,
                              percentage: parseFloat(cc.default_split_percentage || 0).toFixed(0),
                              color: cc.color
                            }));
                        }
                        
                if (isShared && splitInfo && splitInfo.length > 0) {
                  const tooltipContent = (
                    <div>
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
                                  </div>
                  );
                  
                  return (
                    <Tooltip content={tooltipContent} position="top" wide>
                      <span className="text-sm font-medium cursor-help text-gray-600">
                        {owner || '-'}
                      </span>
                    </Tooltip>
                  );
                }
                
                return <span className="text-sm font-medium text-gray-600">{owner || '-'}</span>;
              };
              
              // Definir colunas
              const columns = [
                {
                  key: 'date',
                  label: 'Data',
                  sortable: true,
                  render: (transaction) => (
                    <span className="text-sm text-gray-900">
                      {transaction.date ? new Date(transaction.date + 'T00:00:00').toLocaleDateString('pt-BR') : '-'}
                    </span>
                  )
                },
                {
                  key: 'description',
                  label: 'Descrição',
                  sortable: false,
                  render: (transaction) => {
                    const isIncome = transaction.type === 'income';
                    return (
                      <div className={`text-sm ${isIncome ? 'text-flight-blue font-semibold' : 'text-gray-900'}`}>
                        <div className="max-w-xs truncate" title={transaction.description}>
                          {transaction.description}
                          {transaction.installment_info && transaction.installment_info.total_installments > 1 && (
                            <span className="text-gray-500 ml-1">
                              ({transaction.installment_info.current_installment}/{transaction.installment_info.total_installments})
                            </span>
                          )}
                                </div>
                              </div>
                    );
                  },
                  mobileTextColor: (transaction) => transaction.type === 'income' ? 'text-flight-blue font-semibold' : 'text-gray-900',
                  mobileRender: (transaction) => {
                    return (
                      <div>
                        {transaction.description}
                        {transaction.installment_info && transaction.installment_info.total_installments > 1 && (
                          <span className="text-gray-500 ml-1">
                            ({transaction.installment_info.current_installment}/{transaction.installment_info.total_installments})
                          </span>
                            )}
                          </div>
                        );
                  }
                },
                {
                  key: 'category',
                  label: 'Categoria',
                  sortable: true,
                  render: (transaction) => {
                    const isIncome = transaction.type === 'income';
                    return (
                      <span className="text-sm text-gray-600">
                        {isIncome ? transaction.category : (transaction.category?.name || '-')}
                      </span>
                    );
                  }
                },
                {
                  key: 'payment_method',
                  label: 'Forma',
                  sortable: true,
                  render: (transaction) => {
                    const isIncome = transaction.type === 'income';
                    if (!isIncome) {
                      if (transaction.payment_method === 'cash') return 'Dinheiro';
                      if (transaction.payment_method === 'debit_card') {
                        if (transaction.card_id) {
                          const card = cards.find(c => c.id === transaction.card_id);
                          return card ? `Débito - ${card.name}` : 'Débito';
                        }
                        return 'Débito';
                      }
                      if (transaction.payment_method === 'pix') return 'PIX';
                      if (transaction.payment_method === 'credit_card') {
                        if (transaction.card_id) {
                          const card = cards.find(c => c.id === transaction.card_id);
                          return card ? `Crédito - ${card.name}` : 'Crédito';
                        }
                        return 'Crédito';
                      }
                      if (transaction.payment_method === 'bank_transfer') return 'Transferência';
                      if (transaction.payment_method === 'boleto') return 'Boleto';
                      if (transaction.payment_method === 'other') return 'Outros';
                    } else {
                      if (transaction.payment_method === 'cash') return 'Dinheiro';
                      if (transaction.payment_method === 'pix') return 'PIX';
                      if (transaction.payment_method === 'deposit') return 'Depósito';
                      if (transaction.payment_method === 'bank_transfer') return 'Transferência';
                      if (transaction.payment_method === 'boleto') return 'Boleto';
                      if (transaction.payment_method === 'other') return 'Outros';
                      if (!transaction.payment_method) return '-';
                    }
                    return '-';
                  }
                },
                {
                  key: 'owner',
                  label: 'Responsabilidade',
                  sortable: true,
                  render: (transaction) => renderOwner(transaction, false),
                  mobileRender: (transaction) => renderOwner(transaction, true)
                },
                {
                  key: 'amount',
                  label: 'Valor',
                  sortable: true,
                  render: (transaction) => {
                    const isIncome = transaction.type === 'income';
                    return (
                      <span className={`text-sm font-medium ${isIncome ? 'text-flight-blue font-semibold' : 'text-gray-900'}`}>
                      {!isIncome && '- '}
                      R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    );
                  },
                  mobileTextColor: (transaction) => transaction.type === 'income' ? 'text-flight-blue font-semibold' : 'text-gray-900',
                  mobileRender: (transaction) => {
                    const isIncome = transaction.type === 'income';
                    return (
                      <span>
                        {!isIncome && '- '}
                        R$ {Number(transaction.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    );
                  }
                }
              ];
              
              // Renderizar ações
              const renderActions = (transaction) => {
                const isIncome = transaction.type === 'income';
                return (
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                      className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title={`Editar ${isIncome ? 'entrada' : 'despesa'}`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(transaction)}
                      className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                          title={`Excluir ${isIncome ? 'entrada' : 'despesa'}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                  );
              };
              
              const sortedTransactions = sortTransactions(filterTransactions(transactions));
              
              // Paginação
              const totalPages = Math.ceil(sortedTransactions.length / itemsPerPage);
              const startIndex = (currentPage - 1) * itemsPerPage;
              const endIndex = startIndex + itemsPerPage;
              const paginatedTransactions = sortedTransactions.slice(startIndex, endIndex);
              
              const allSelected = sortedTransactions.length > 0 && 
                sortedTransactions.every(t => selectedTransactions.includes(t.id || t));
              
              return (
                <>
                <ResponsiveTable
                  columns={columns}
                  data={paginatedTransactions}
                  renderRowActions={renderActions}
                  sortConfig={sortConfig}
                  onSort={handleSort}
                  enableSelection={true}
                  selectedItems={selectedTransactions}
                  onSelectionChange={handleSelectionChange}
                  onSelectAll={handleSelectAll}
                  allSelected={allSelected}
                  renderEmptyState={() => (
            <div className="p-8 text-center">
              <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-gray-600">Nenhuma transação encontrada</p>
            </div>
          )}
                />
                
                {/* Controles de Paginação */}
                {sortedTransactions.length > itemsPerPage && (
                  <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-700">
                      Mostrando <span className="font-semibold">{startIndex + 1}</span> a{' '}
                      <span className="font-semibold">{Math.min(endIndex, sortedTransactions.length)}</span> de{' '}
                      <span className="font-semibold">{sortedTransactions.length}</span> transações
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1"
                      >
                        Anterior
                      </Button>
                      
                      <div className="flex items-center gap-1">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                          // Mostrar apenas algumas páginas para não sobrecarregar
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <button
                                key={page}
                                onClick={() => setCurrentPage(page)}
                                className={`w-8 h-8 rounded-md text-sm font-medium transition-colors ${
                                  currentPage === page
                                    ? 'bg-flight-blue text-white'
                                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                                }`}
                              >
                                {page}
                              </button>
                            );
                          } else if (page === currentPage - 2 || page === currentPage + 2) {
                            return <span key={page} className="text-gray-400">...</span>;
                          }
                          return null;
                        })}
                      </div>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1"
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                )}
                </>
              );
            })()}
          </CardContent>
        </Card>
      </main>

      <TransactionModal
        isOpen={showTransactionModal}
        onClose={() => { setShowTransactionModal(false); setEditingTransaction(null); }}
        onSuccess={() => { setShowTransactionModal(false); setEditingTransaction(null); fetchExpenses(); fetchIncomes(); fetchCards(); }}
        editingTransaction={editingTransaction}
        categories={categories.filter(cat => cat.type === 'expense' || cat.type === 'both')}
      />

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

      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

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

      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => {
          setShowBulkDeleteConfirm(false);
        }}
        onConfirm={confirmBulkDelete}
        title="Confirmar exclusão em massa"
        message={`Tem certeza que deseja excluir ${selectedTransactions.length} transação(ões) selecionada(s)? Esta ação não pode ser desfeita.`}
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      <Footer />
      </Header>
    </>
  );
}

