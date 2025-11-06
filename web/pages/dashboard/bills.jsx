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
import MarkBillAsPaidModal from '../../components/MarkBillAsPaidModal';
import LoadingLogo from '../../components/LoadingLogo';
import Header from '../../components/Header';
import Footer from '../../components/Footer';
import NotificationModal from '../../components/NotificationModal';
import ResponsiveTable from '../../components/ui/ResponsiveTable';
import { 
  Calendar, 
  Plus, 
  AlertCircle, 
  CheckCircle, 
  Trash2,
  Edit,
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
  const [selectedOwnerForBill, setSelectedOwnerForBill] = useState(null); // { cost_center_id, is_shared }
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)); // Mês atual
  const [selectedBills, setSelectedBills] = useState([]);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchBills();
      fetchCategories();
      fetchCards();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);

  // Limpar seleção quando filtros mudarem
  useEffect(() => {
    setSelectedBills([]);
  }, [filter, filterCategory, filterOwner, searchQuery, selectedMonth]);

  // Helper para criar data local a partir de string "YYYY-MM-DD"
  const createLocalDate = (dateString) => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day); // month é 0-indexed
  };

  // Helper para obter data de hoje no timezone local
  const getTodayLocal = () => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  };

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
        .eq('organization_id', organization.id);

      // Filtrar por mês se selectedMonth estiver definido
      if (selectedMonth) {
        const startOfMonth = `${selectedMonth}-01`;
        const [year, month] = selectedMonth.split('-');
        // Último dia do mês: usar o primeiro dia do próximo mês e subtrair 1
        const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
        const endOfMonth = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;
        
        query = query
          .gte('due_date', startOfMonth)
          .lte('due_date', endOfMonth);
      }

      query = query.order('due_date', { ascending: true });

      const { data, error } = await query;
      
      if (error) throw error;

      // Atualizar status overdue automaticamente
      const todayLocal = getTodayLocal();
      
      const billsToUpdate = [];
      const updatedBills = data.map(bill => {
        // Criar data de vencimento no timezone local
        const dueDateLocal = createLocalDate(bill.due_date);
        
        // Se a conta está pending e venceu, marcar como overdue
        if (bill.status === 'pending' && dueDateLocal < todayLocal) {
          billsToUpdate.push({ id: bill.id, status: 'overdue' });
          return { ...bill, status: 'overdue' };
        }
        
        // Se a conta está overdue mas ainda não venceu, reverter para pending
        if (bill.status === 'overdue' && dueDateLocal >= todayLocal) {
          billsToUpdate.push({ id: bill.id, status: 'pending' });
          return { ...bill, status: 'pending' };
        }
        
        return bill;
      });

      // Atualizar no banco se necessário
      if (billsToUpdate.length > 0) {
        // Atualizar em lote
        const updates = billsToUpdate.map(bill => 
          supabase
            .from('bills')
            .update({ status: bill.status })
            .eq('id', bill.id)
        );
        
        // Executar todas as atualizações em paralelo (não esperar para não bloquear a UI)
        Promise.all(updates).catch(error => {
          console.error('Erro ao atualizar status de contas no banco:', error);
        });
      }

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
      
      // Verificar se precisa reverter o status e excluir expense
      if (billData.revert_to_pending && billData.expense_id) {
        console.log('🔄 [BILLS] Revertendo status e excluindo expense:', billData.expense_id);
        
        // 1. Primeiro, remover a referência expense_id da bill para quebrar a foreign key constraint
        const { error: updateBillRefError } = await supabase
          .from('bills')
          .update({ expense_id: null })
          .eq('id', editingBill.id);
        
        if (updateBillRefError) {
          console.error('❌ [BILLS] Erro ao remover referência expense_id da bill:', updateBillRefError);
          throw new Error('Erro ao remover referência da despesa: ' + (updateBillRefError.message || 'Erro desconhecido'));
        }
        
        // 2. Excluir expense_splits relacionados
        const { error: splitsError } = await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', billData.expense_id);
        
        if (splitsError) {
          console.warn('⚠️ [BILLS] Erro ao excluir splits (pode não existir):', splitsError);
        }
        
        // 3. Excluir expense
        const { error: expenseError } = await supabase
          .from('expenses')
          .delete()
          .eq('id', billData.expense_id);
        
        if (expenseError) {
          console.error('❌ [BILLS] Erro ao excluir expense:', expenseError);
          throw expenseError;
        }
        
        console.log('✅ [BILLS] Expense excluída com sucesso');
        
        // 3. Determinar novo status baseado na due_date
        const dueDateStr = billData.due_date || editingBill.due_date;
        const dueDateLocal = createLocalDate(dueDateStr);
        const todayLocal = getTodayLocal();
        
        const newStatus = dueDateLocal < todayLocal ? 'overdue' : 'pending';
        
        // 4. Preparar dados de atualização removendo campos relacionados ao pagamento
        const { revert_to_pending, expense_id, ...dataToUpdate } = billData;
        const updateData = {
          ...dataToUpdate,
          status: newStatus,
          expense_id: null,
          paid_at: null
        };
        
        let { data, error } = await supabase
          .from('bills')
          .update(updateData)
          .eq('id', editingBill.id)
          .select();
        
        if (error) {
          console.error('❌ [BILLS] Erro do Supabase ao reverter:', error);
          throw error;
        }
        
        console.log('✅ [BILLS] Status revertido para:', newStatus);
        
        await fetchBills();
        setShowModal(false);
        setEditingBill(null);
        success('Conta revertida para pendente e despesa excluída com sucesso!');
        return;
      }
      
      // Preparar dados para atualização normal
      const { revert_to_pending, expense_id, ...normalUpdateData } = billData;
      let updateData = { ...normalUpdateData };
      
      // Sempre verificar e atualizar status baseado na due_date (se não for paid ou cancelled)
      if (updateData.status !== 'paid' && updateData.status !== 'cancelled') {
        const dueDateStr = updateData.due_date || editingBill.due_date;
        const dueDateLocal = createLocalDate(dueDateStr);
        const todayLocal = getTodayLocal();
        
        // Se a data é passada, deve ser overdue; se é futura ou hoje, deve ser pending
        if (dueDateLocal < todayLocal) {
          updateData.status = 'overdue';
        } else {
          updateData.status = 'pending';
        }
      }
      
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

    if (bill.status === 'paid') {
      warning('Esta conta já está marcada como paga.');
      return;
    }

    setBillToMarkAsPaid(bill);
    setShowConfirmModal(true);
  };

  const handleMarkAsPaidWithOwner = (ownerData) => {
    // ownerData contém: { cost_center_id, is_shared }
    if (!billToMarkAsPaid) return;

    // Salvar dados do responsável selecionado e executar confirmação
    confirmMarkAsPaid(ownerData);
  };

  const confirmMarkAsPaid = async (ownerDataFromModal = null) => {
    if (!billToMarkAsPaid) return;

    try {
      console.log('💾 [BILLS] Marcar como paga - bill original:', billToMarkAsPaid);
      console.log('💾 [BILLS] category_id:', billToMarkAsPaid.category_id);
      console.log('💾 [BILLS] ownerDataFromModal:', ownerDataFromModal);
      
      // Usar dados do modal se fornecidos, senão usar dados da bill
      const ownerData = ownerDataFromModal || selectedOwnerForBill || {
        cost_center_id: billToMarkAsPaid.cost_center_id,
        is_shared: billToMarkAsPaid.is_shared || !billToMarkAsPaid.cost_center_id
      };
      
      const isShared = ownerData.is_shared || !ownerData.cost_center_id;
      const costCenterId = ownerData.cost_center_id || null;
      
      // Buscar o nome do cost center se houver cost_center_id
      let ownerName = null;
      if (costCenterId) {
        const costCenter = costCenters?.find(cc => cc.id === costCenterId);
        ownerName = costCenter?.name || null;
      } else if (isShared) {
        ownerName = organization?.name || 'Família';
      }
      
      // Buscar o nome da categoria se houver category_id
      let categoryName = null;
      if (billToMarkAsPaid.category_id) {
        const category = categories?.find(cat => cat.id === billToMarkAsPaid.category_id);
        categoryName = category?.name || null;
      }
      
      // 1. Criar expense correspondente
      console.log('💾 [BILLS] Criando expense com category_id:', billToMarkAsPaid.category_id);
      console.log('💾 [BILLS] Criando expense com cost_center_id:', billToMarkAsPaid.cost_center_id);
      console.log('💾 [BILLS] ownerName:', ownerName);
      console.log('💾 [BILLS] categoryName:', categoryName);
      
      const expenseData = {
        description: billToMarkAsPaid.description,
        amount: billToMarkAsPaid.amount,
        date: new Date().toISOString().split('T')[0],
        // SEMPRE incluir category_id e category (mesmo se null)
        category_id: billToMarkAsPaid.category_id || null,
        category: categoryName, // Nome da categoria (campo legado)
        cost_center_id: costCenterId, // Usar cost_center_id do modal/seleção
        owner: ownerName, // Nome do cost center ou nome da organização se compartilhado
        is_shared: isShared,
        payment_method: billToMarkAsPaid.payment_method,
        card_id: billToMarkAsPaid.card_id || null,
        status: 'confirmed',
        organization_id: organization.id,
        user_id: orgUser.id,
        source: 'manual'
      };
      
      console.log('💾 [BILLS] expenseData completo:', JSON.stringify(expenseData, null, 2));
      
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (expenseError) {
        console.error('❌ [BILLS] Erro ao criar expense:', expenseError);
        throw expenseError;
      }
      
      console.log('✅ [BILLS] Expense criada com sucesso:', expense);
      console.log('✅ [BILLS] Expense category_id:', expense?.category_id);
      console.log('✅ [BILLS] Expense cost_center_id:', expense?.cost_center_id);

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

      // 3. Atualizar bill para paid (preservando category_id e cost_center_id)
      const updateData = {
        status: 'paid',
        paid_at: new Date().toISOString(),
        expense_id: expense.id,
        // SEMPRE preservar category_id e cost_center_id (usar dados do modal/seleção)
        category_id: billToMarkAsPaid.category_id || null,
        cost_center_id: costCenterId, // Usar cost_center_id do modal/seleção
        is_shared: isShared
      };
      
      console.log('💾 [BILLS] Atualizando bill como paga:', billToMarkAsPaid.id);
      console.log('💾 [BILLS] updateData completo:', JSON.stringify(updateData, null, 2));
      
      const { data: updatedBill, error: billError } = await supabase
        .from('bills')
        .update(updateData)
        .eq('id', billToMarkAsPaid.id)
        .select()
        .single();

      if (billError) {
        console.error('❌ [BILLS] Erro ao atualizar bill:', billError);
        throw billError;
      }
      
      console.log('✅ [BILLS] Bill atualizada com sucesso:', updatedBill);
      console.log('✅ [BILLS] category_id salvo:', updatedBill?.category_id);
      console.log('✅ [BILLS] cost_center_id salvo:', updatedBill?.cost_center_id);

      // 4. Se for recorrente, criar próxima conta
      if (billToMarkAsPaid.is_recurring) {
        await createRecurringBill(billToMarkAsPaid);
      }

      await fetchBills();
      success('Conta marcada como paga com sucesso! A despesa foi criada automaticamente.');
    } catch (error) {
      console.error('❌ [BILLS] Erro ao marcar conta como paga:', error);
      showError('Erro ao processar pagamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setBillToMarkAsPaid(null);
      setSelectedOwnerForBill(null);
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

  // Handlers para seleção em massa
  const handleSelectionChange = (billId, checked) => {
    if (checked) {
      setSelectedBills(prev => [...prev, billId]);
    } else {
      setSelectedBills(prev => prev.filter(id => id !== billId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedBills(filteredBills.map(b => b.id));
    } else {
      setSelectedBills([]);
    }
  };

  const handleBulkDelete = () => {
    if (selectedBills.length === 0) return;
    setShowBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedBills.length === 0) return;

    setDeleting(true);
    setShowBulkDeleteConfirm(false);

    try {
      const billsToDelete = filteredBills.filter(b => selectedBills.includes(b.id));
      
      // Separar bills que têm expense_id (pagas) das que não têm
      const billsWithExpenses = billsToDelete.filter(b => b.status === 'paid' && b.expense_id);
      const billsWithoutExpenses = billsToDelete.filter(b => !b.expense_id || b.status !== 'paid');
      
      let deletedCount = 0;
      let errors = [];
      const expenseIdsToDelete = new Set();

      // Coletar todos os expense_ids das bills pagas
      billsWithExpenses.forEach(bill => {
        if (bill.expense_id) {
          expenseIdsToDelete.add(bill.expense_id);
        }
      });

      // Se houver expenses para excluir, seguir a ordem correta de cascade
      if (expenseIdsToDelete.size > 0) {
        const expenseIdsArray = Array.from(expenseIdsToDelete);

        // 1. Primeiro, remover todas as referências expense_id das bills para quebrar FK constraints
        const billIdsToUpdate = billsWithExpenses.map(b => b.id);
        if (billIdsToUpdate.length > 0) {
          const { error: updateBillsError } = await supabase
            .from('bills')
            .update({ expense_id: null })
            .in('id', billIdsToUpdate);
          
          if (updateBillsError) {
            errors.push(`Erro ao remover referências de contas: ${updateBillsError.message}`);
          }
        }

        // 2. Excluir expense_splits relacionados
        const { error: splitsError } = await supabase
          .from('expense_splits')
          .delete()
          .in('expense_id', expenseIdsArray);
        
        if (splitsError) {
          console.warn('⚠️ [BILLS] Erro ao excluir splits (pode não existir):', splitsError);
          // Não adicionar aos errors pois pode não existir
        }

        // 3. Excluir expenses
        const { error: expenseError } = await supabase
          .from('expenses')
          .delete()
          .in('id', expenseIdsArray);
        
        if (expenseError) {
          errors.push('Erro ao excluir despesas associadas: ' + expenseError.message);
        } else {
          deletedCount += expenseIdsArray.length;
        }
      }

      // 4. Excluir todas as bills (com e sem expenses)
      const allBillIds = billsToDelete.map(b => b.id);
      const { error: billsDeleteError } = await supabase
        .from('bills')
        .delete()
        .in('id', allBillIds);
      
      if (billsDeleteError) {
        errors.push('Erro ao excluir contas: ' + billsDeleteError.message);
      } else {
        deletedCount += allBillIds.length;
      }

      // Recarregar dados
      await fetchBills();

      // Limpar seleção
      setSelectedBills([]);

      // Mostrar mensagem de sucesso ou erro
      if (errors.length > 0) {
        showError('Alguns itens não puderam ser excluídos: ' + errors.join(', '));
      } else {
        const billsCount = billsToDelete.length;
        const expensesCount = expenseIdsToDelete.size;
        if (expensesCount > 0) {
          success(`${billsCount} conta(s) e ${expensesCount} despesa(s) associada(s) excluída(s) com sucesso!`);
        } else {
          success(`${billsCount} conta(s) excluída(s) com sucesso!`);
        }
      }
    } catch (error) {
      console.error('Erro ao excluir em massa:', error);
      showError('Erro ao excluir contas: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteBill = async (billId) => {
    // Buscar a bill para verificar se tem expense_id
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    
    setBillToDelete(billId);
    
    // Se a bill estiver paga e tiver expense_id, mostrar alerta adicional
    if (bill.status === 'paid' && bill.expense_id) {
      setShowConfirmModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  const confirmDeleteBill = async () => {
    if (!billToDelete) return;

    try {
      // Buscar a bill para verificar se tem expense_id
      const billToDeleteObj = bills.find(b => b.id === billToDelete);
      
      if (!billToDeleteObj) {
        showError('Conta não encontrada.');
        return;
      }

      // Se a bill estiver paga e tiver expense_id, excluir a expense também
      if (billToDeleteObj.status === 'paid' && billToDeleteObj.expense_id) {
        console.log('🗑️ [BILLS] Excluindo expense associada:', billToDeleteObj.expense_id);
        
        // 1. Primeiro, remover a referência expense_id da bill para quebrar a foreign key constraint
        const { error: updateBillError } = await supabase
          .from('bills')
          .update({ expense_id: null })
          .eq('id', billToDelete);
        
        if (updateBillError) {
          console.error('❌ [BILLS] Erro ao remover referência expense_id da bill:', updateBillError);
          throw new Error('Erro ao remover referência da despesa: ' + (updateBillError.message || 'Erro desconhecido'));
        }
        
        // 2. Excluir expense_splits relacionados
        const { error: splitsError } = await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', billToDeleteObj.expense_id);
        
        if (splitsError) {
          console.warn('⚠️ [BILLS] Erro ao excluir splits (pode não existir):', splitsError);
        }
        
        // 3. Excluir expense
        const { error: expenseError } = await supabase
          .from('expenses')
          .delete()
          .eq('id', billToDeleteObj.expense_id);
        
        if (expenseError) {
          console.error('❌ [BILLS] Erro ao excluir expense:', expenseError);
          throw new Error('Erro ao excluir despesa associada: ' + (expenseError.message || 'Erro desconhecido'));
        }
        
        console.log('✅ [BILLS] Expense excluída com sucesso');
      }

      // 4. Excluir a bill permanentemente
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', billToDelete);

      if (error) throw error;

      await fetchBills();
      
      if (billToDeleteObj.status === 'paid' && billToDeleteObj.expense_id) {
        success('Conta e despesa associada excluídas com sucesso!');
      } else {
        success('Conta excluída com sucesso!');
      }
    } catch (error) {
      console.error('❌ [BILLS] Erro ao excluir conta:', error);
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
    // Criar data de hoje no timezone local
    const todayLocal = getTodayLocal();
    
    // Criar data de vencimento no timezone local
    const dueLocal = createLocalDate(dueDate);
    
    // Calcular diferença em dias
    const diffTime = dueLocal - todayLocal;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    
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
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <label className="text-sm font-medium text-gray-700 hidden sm:block">Mês:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-flight-blue text-sm"
                  />
                </div>
                <Button 
                  onClick={openAddModal}
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conta
                </Button>
              </div>
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
                    <option value="shared">
                      {organization && organization.name ? organization.name : 'Família'}
                    </option>
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
          <Card className="border border-gray-200 bg-white shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center space-x-2">
                  <div className="p-2 bg-flight-blue/5 rounded-lg">
                    <Calendar className="h-4 w-4 text-flight-blue" />
                  </div>
                  <span>Contas a Pagar</span>
                </CardTitle>
                {selectedBills.length > 0 && (
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">
                      {selectedBills.length} selecionada(s)
                    </span>
                    <Button
                      onClick={handleBulkDelete}
                      disabled={deleting}
                      className="bg-red-600 hover:bg-red-700 text-white border-2 border-red-600 shadow-sm hover:shadow-md transition-all duration-200"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir Selecionadas
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-0">
              {(() => {
                // Helper para formatação da forma de pagamento
                      const getPaymentMethodLabel = (method) => {
                        const methods = {
                          'pix': 'PIX',
                          'credit_card': 'Cartão de Crédito',
                          'debit_card': 'Cartão de Débito',
                          'cash': 'Dinheiro',
                          'bank_transfer': 'Transferência',
                          'boleto': 'Boleto',
                          'other': 'Outro'
                        };
                        return methods[method] || method || '—';
                      };
                      
                // Definir colunas
                const columns = [
                  {
                    key: 'due_date',
                    label: 'Vencimento',
                    sortable: true,
                    render: (bill) => {
                      const daysUntil = getDaysUntilDue(bill.due_date);
                      return (
                        <div>
                            <div className="text-sm text-gray-900">
                              {new Date(bill.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}
                            </div>
                            {daysUntil >= 0 && (
                              <div className={`text-xs mt-1 font-medium ${
                                daysUntil <= 3 ? 'text-red-600' : 
                                daysUntil <= 7 ? 'text-yellow-600' : 
                                'text-gray-500'
                              }`}>
                                {daysUntil === 0 ? 'Hoje' : daysUntil === 1 ? 'Amanhã' : `${daysUntil} dias`}
                              </div>
                            )}
                            {daysUntil < 0 && (
                              <div className="text-xs mt-1 font-medium text-red-600">
                                Vencido há {Math.abs(daysUntil)} {Math.abs(daysUntil) === 1 ? 'dia' : 'dias'}
                              </div>
                            )}
                        </div>
                      );
                    }
                  },
                  {
                    key: 'description',
                    label: 'Descrição',
                    sortable: false,
                    render: (bill) => (
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium text-gray-900">{bill.description}</span>
                              {bill.is_recurring && (
                                <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-xs">
                                  Recorrente
                                </Badge>
                              )}
                            </div>
                    ),
                    mobileRender: (bill) => (
                      <div>
                        <span className="text-sm font-medium text-gray-900">{bill.description}</span>
                        {bill.is_recurring && (
                          <Badge className="bg-gray-100 text-gray-700 border border-gray-200 text-xs ml-2">
                            Recorrente
                          </Badge>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'category',
                    label: 'Categoria',
                    sortable: false,
                    render: (bill) => (
                            <span className="text-sm text-gray-600">
                              {bill.category ? bill.category.name : '—'}
                            </span>
                    )
                  },
                  {
                    key: 'payment_method',
                    label: 'Forma',
                    sortable: false,
                    render: (bill) => (
                      <div>
                            <span className="text-sm text-gray-600">
                              {bill.payment_method ? getPaymentMethodLabel(bill.payment_method) : '—'}
                            </span>
                            {bill.payment_method === 'credit_card' && bill.card && (
                              <div className="text-xs text-gray-500 mt-1">
                                {bill.card.name}
                              </div>
                            )}
                      </div>
                    ),
                    mobileRender: (bill) => (
                      <div>
                        <div className="text-sm text-gray-600">
                          {bill.payment_method ? getPaymentMethodLabel(bill.payment_method) : '—'}
                        </div>
                        {bill.payment_method === 'credit_card' && bill.card && (
                          <div className="text-xs text-gray-500 mt-1">
                            {bill.card.name}
                          </div>
                        )}
                      </div>
                    )
                  },
                  {
                    key: 'owner',
                    label: 'Responsável',
                    sortable: false,
                    render: (bill) => (
                      <span className="text-sm text-gray-600">
                            {bill.is_shared ? (
                          <span className="font-medium">{organization?.name || 'Família'}</span>
                            ) : bill.cost_center ? (
                          bill.cost_center.name
                            ) : (
                          <span className="text-gray-400">—</span>
                            )}
                      </span>
                    )
                  },
                  {
                    key: 'amount',
                    label: 'Valor',
                    sortable: true,
                    render: (bill) => (
                            <div className="text-sm font-semibold text-gray-900">
                              R$ {Number(bill.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                    )
                  },
                  {
                    key: 'status',
                    label: 'Status',
                    sortable: true,
                    render: (bill) => {
                      const statusBadge = getStatusBadge(bill.status);
                      return (
                            <Badge className={statusBadge.className}>
                              {statusBadge.label}
                            </Badge>
                      );
                    }
                  }
                ];
                
                // Renderizar ações
                const renderActions = (bill) => {
                  const daysUntil = getDaysUntilDue(bill.due_date);
                  const statusBadge = getStatusBadge(bill.status);
                  
                  return (
                    <div className="flex items-center space-x-2">
                              {(bill.status === 'pending' || bill.status === 'overdue') && (
                                <button
                                  onClick={() => handleMarkAsPaid(bill)}
                          className="text-green-600 hover:text-green-800 p-2 rounded hover:bg-green-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                  title="Marcar como Paga"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </button>
                              )}
                              
                              <button
                                onClick={() => openEditModal(bill)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBill(bill.id)}
                        className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                      );
                };
                
                const allSelected = selectedBills.length > 0 && selectedBills.length === filteredBills.length;

                return (
                  <ResponsiveTable
                    columns={columns}
                    data={filteredBills}
                    renderRowActions={renderActions}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    enableSelection={true}
                    selectedItems={selectedBills}
                    onSelectionChange={handleSelectionChange}
                    onSelectAll={handleSelectAll}
                    allSelected={allSelected}
                    renderEmptyState={() => (
                <div className="p-8 text-center">
                  <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma conta a pagar encontrada</p>
                </div>
              )}
                  />
                );
              })()}
            </CardContent>
          </Card>
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
          organization={organization}
        />
      </main>

      {/* Footer */}
      <Footer />

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
      />

      {/* Confirmation Modal (para deletar) */}
      <ConfirmationModal
        isOpen={showConfirmModal && !!billToDelete}
        onClose={() => {
          setShowConfirmModal(false);
          setBillToDelete(null);
          setBillToMarkAsPaid(null);
          setSelectedOwnerForBill(null);
        }}
        onConfirm={confirmDeleteBill}
        title="Confirmar exclusão"
        message={
          (() => {
            const billToDeleteObj = bills.find(b => b.id === billToDelete);
            if (billToDeleteObj?.status === 'paid' && billToDeleteObj?.expense_id) {
              return `Tem certeza que deseja excluir esta conta? Esta ação também excluirá a despesa associada criada quando a conta foi marcada como paga. Esta ação não pode ser desfeita.`;
            }
            return "Tem certeza que deseja excluir esta conta? Esta ação não pode ser desfeita.";
          })()
        }
        confirmText="Excluir"
        cancelText="Cancelar"
        type="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showBulkDeleteConfirm}
        onClose={() => {
          setShowBulkDeleteConfirm(false);
        }}
        onConfirm={confirmBulkDelete}
        title="Confirmar exclusão em massa"
        message={
          (() => {
            const billsToDelete = filteredBills.filter(b => selectedBills.includes(b.id));
            const billsWithExpenses = billsToDelete.filter(b => b.status === 'paid' && b.expense_id);
            const expensesCount = new Set(billsWithExpenses.map(b => b.expense_id)).size;
            
            if (expensesCount > 0) {
              return `Tem certeza que deseja excluir ${selectedBills.length} conta(s)? Esta ação também excluirá ${expensesCount} despesa(s) associada(s) criada(s) quando as contas foram marcadas como pagas. Esta ação não pode ser desfeita.`;
            }
            return `Tem certeza que deseja excluir ${selectedBills.length} conta(s)? Esta ação não pode ser desfeita.`;
          })()
        }
        confirmText={deleting ? "Excluindo..." : "Excluir Todas"}
        cancelText="Cancelar"
        type="danger"
      />

      {/* Mark as Paid Modal (com seleção de responsável) */}
      <MarkBillAsPaidModal
        isOpen={showConfirmModal && !!billToMarkAsPaid}
        onClose={() => {
          setShowConfirmModal(false);
          setBillToMarkAsPaid(null);
          setSelectedOwnerForBill(null);
        }}
        onConfirm={handleMarkAsPaidWithOwner}
        bill={billToMarkAsPaid}
        costCenters={costCenters || []}
        organization={organization}
      />
    </div>
  );
}

