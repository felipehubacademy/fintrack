import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Calendar, Clock, CheckCircle, AlertCircle, Plus, Filter, Search, X as XIcon } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { BillModal } from '../components/modals/BillModal';
import { MarkBillAsPaidModal } from '../components/financial/MarkBillAsPaidModal';
import { MonthSelector } from '../components/financial/MonthSelector';
import { StatCard } from '../components/financial/StatCard';
import { useOrganization } from '../hooks/useOrganization';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useAlert } from '../components/ui/AlertProvider';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';

// Funções de data do Brasil
const getBrazilToday = () => {
  const now = new Date();
  const brazilOffset = -3 * 60; // UTC-3
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (brazilOffset * 60000));
};

const getBrazilTodayString = () => {
  const today = getBrazilToday();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const createBrazilDate = (dateStr) => {
  if (!dateStr) return null;
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const getCurrentMonth = () => {
  const today = getBrazilToday();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export default function BillsScreen() {
  const { organization, user, loading: orgLoading, budgetCategories, costCenters } = useOrganization();
  const { confirm } = useConfirmation();
  const { alert } = useAlert();
  const { showToast } = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState([]);
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showMarkAsPaidModal, setShowMarkAsPaidModal] = useState(false);
  const [billToMarkAsPaid, setBillToMarkAsPaid] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [filter, setFilter] = useState('all'); // all, pending, paid, overdue
  const [filterCategory, setFilterCategory] = useState(null);
  const [filterOwner, setFilterOwner] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'due_date', direction: 'asc' });
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchBills();
      fetchCategories();
      fetchCards();
    }
  }, [orgLoading, organization, selectedMonth]);

  const fetchCategories = async () => {
    try {
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

      const orgCategoriesList = orgCategories.data || [];
      const globalCategoriesList = globalCategories.data || [];
      const orgCategoryNames = new Set(orgCategoriesList.map(c => c.name));
      const uniqueGlobals = globalCategoriesList.filter(globalCat => 
        !orgCategoryNames.has(globalCat.name)
      );
      
      setCategories([...orgCategoriesList, ...uniqueGlobals]);
    } catch (error) {}
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
    } catch (error) {}
  };

  const fetchBills = async () => {
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

      // Filtrar por mês
      if (selectedMonth) {
        const startOfMonth = `${selectedMonth}-01`;
        const [year, month] = selectedMonth.split('-');
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
      const todayLocal = getBrazilToday();
      
      const billsToUpdate = [];
      const updatedBills = data.map(bill => {
        const dueDateLocal = createBrazilDate(bill.due_date);
        
        if (bill.status === 'pending' && dueDateLocal < todayLocal) {
          billsToUpdate.push({ id: bill.id, status: 'overdue' });
          return { ...bill, status: 'overdue' };
        }
        
        if (bill.status === 'overdue' && dueDateLocal >= todayLocal) {
          billsToUpdate.push({ id: bill.id, status: 'pending' });
          return { ...bill, status: 'pending' };
        }
        
        return bill;
      });

      // Atualizar no banco se necessário
      if (billsToUpdate.length > 0) {
        Promise.all(
          billsToUpdate.map(bill => 
            supabase
              .from('bills')
              .update({ status: bill.status })
              .eq('id', bill.id)
          )
        ).catch(error => {});
      }

      setBills(updatedBills);
    } catch (error) {showToast('Erro ao carregar contas', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBills();
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
        b.description?.toLowerCase().includes(query)
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

  const handleSaveBill = async (billData) => {
    try {
      if (selectedBill) {
        const { error } = await supabase
          .from('bills')
          .update(billData)
          .eq('id', selectedBill.id);

        if (error) throw error;
        showToast('Conta atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('bills')
          .insert([{
            ...billData,
            organization_id: organization.id,
            user_id: user.id,
            status: 'pending',
          }]);

        if (error) throw error;
        showToast('Conta criada com sucesso!', 'success');
      }

      await fetchBills();
      setShowBillModal(false);
      setSelectedBill(null);
    } catch (error) {showToast('Erro ao salvar conta: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const handleMarkAsPaid = (bill) => {
    if (!bill.payment_method) {
      alert({
        title: 'Atenção',
        message: 'Por favor, edite a conta e defina um método de pagamento antes de marcar como paga.',
        type: 'warning',
      });
      return;
    }

    if (bill.status === 'paid') {
      alert({
        title: 'Atenção',
        message: 'Esta conta já está marcada como paga.',
        type: 'info',
      });
      return;
    }

    setBillToMarkAsPaid(bill);
    setShowMarkAsPaidModal(true);
  };

  const confirmMarkAsPaid = async (ownerData) => {
    if (!billToMarkAsPaid) return;

    try {
      const isShared = ownerData.is_shared || !ownerData.cost_center_id;
      const costCenterId = ownerData.cost_center_id || null;
      
      let ownerName = null;
      if (costCenterId) {
        const costCenter = costCenters?.find(cc => cc.id === costCenterId);
        ownerName = costCenter?.name || null;
      } else if (isShared) {
        ownerName = organization?.name || 'Família';
      }
      
      let categoryName = null;
      if (billToMarkAsPaid.category_id) {
        const category = categories?.find(cat => cat.id === billToMarkAsPaid.category_id);
        categoryName = category?.name || null;
      }
      
      // Criar expense correspondente
      const expenseData = {
        description: billToMarkAsPaid.description,
        amount: billToMarkAsPaid.amount,
        date: getBrazilTodayString(),
        category_id: billToMarkAsPaid.category_id || null,
        category: categoryName,
        cost_center_id: costCenterId,
        owner: ownerName,
        is_shared: isShared,
        payment_method: billToMarkAsPaid.payment_method,
        card_id: billToMarkAsPaid.card_id || null,
        status: 'confirmed',
        organization_id: organization.id,
        user_id: user.id,
        source: 'manual'
      };
      
      const { data: expense, error: expenseError } = await supabase
        .from('expenses')
        .insert(expenseData)
        .select()
        .single();

      if (expenseError) throw expenseError;

      // Se for compartilhado, criar splits
      if (isShared) {
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

      // Atualizar bill para paid
      const updateData = {
        status: 'paid',
        paid_at: new Date().toISOString(),
        expense_id: expense.id,
        category_id: billToMarkAsPaid.category_id || null,
        cost_center_id: costCenterId,
        is_shared: isShared
      };
      
      const { error: billError } = await supabase
        .from('bills')
        .update(updateData)
        .eq('id', billToMarkAsPaid.id);

      if (billError) throw billError;

      // Se for recorrente, criar próxima conta
      if (billToMarkAsPaid.is_recurring) {
        await createRecurringBill(billToMarkAsPaid);
      }

      await fetchBills();
      showToast('Conta marcada como paga com sucesso! A despesa foi criada automaticamente.', 'success');
    } catch (error) {showToast('Erro ao processar pagamento: ' + (error.message || 'Erro desconhecido'), 'error');
    } finally {
      setShowMarkAsPaidModal(false);
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
          user_id: user.id,
          status: 'pending'
        });

      if (error) throw error;
    } catch (error) {}
  };

  const handleDeleteBill = async (bill) => {
    const confirmed = await confirm({
      title: 'Excluir conta',
      message: `Tem certeza que deseja excluir "${bill.description}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      // Se a bill está paga e tem expense_id, precisa excluir o expense primeiro
      if (bill.status === 'paid' && bill.expense_id) {
        // Remover referência expense_id da bill
        await supabase
          .from('bills')
          .update({ expense_id: null })
          .eq('id', bill.id);

        // Excluir expense_splits relacionados
        await supabase
          .from('expense_splits')
          .delete()
          .eq('expense_id', bill.expense_id);

        // Excluir expense
        await supabase
          .from('expenses')
          .delete()
          .eq('id', bill.expense_id);
      }

      // Excluir bill
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', bill.id);

      if (error) throw error;

      await fetchBills();
      showToast('Conta excluída com sucesso!', 'success');
    } catch (error) {showToast('Erro ao excluir conta: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const handleBillPress = (bill) => {
    setSelectedBill(bill);
    setShowBillModal(true);
  };

  const handleAddBill = () => {
    setSelectedBill(null);
    setShowBillModal(true);
  };

  const getDaysUntilDue = (dueDate) => {
    const todayLocal = getBrazilToday();
    const dueLocal = createBrazilDate(dueDate);
    const diffTime = dueLocal - todayLocal;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getBillStatus = (bill) => {
    const diffDays = getDaysUntilDue(bill.due_date);

    if (bill.status === 'paid') {
      return { label: 'Pago', color: colors.success.main, icon: CheckCircle };
    } else if (bill.status === 'overdue') {
      return { label: 'Vencida', color: colors.error.main, icon: AlertCircle };
    } else if (diffDays < 0) {
      return { label: 'Vencida', color: colors.error.main, icon: AlertCircle };
    } else if (diffDays === 0) {
      return { label: 'Vence hoje', color: colors.warning.main, icon: Clock };
    } else if (diffDays <= 7) {
      return { label: `Vence em ${diffDays}d`, color: colors.warning.main, icon: Clock };
    } else {
      return { label: `${diffDays} dias`, color: colors.text.secondary, icon: Calendar };
    }
  };

  const filteredBills = useMemo(() => getFilteredBills(), [bills, filter, filterCategory, filterOwner, searchQuery, sortConfig]);
  const pendingCount = bills.filter(b => b.status === 'pending').length;
  const overdueCount = bills.filter(b => b.status === 'overdue').length;
  const totalPending = bills
    .filter(b => b.status === 'pending' || b.status === 'overdue')
    .reduce((sum, b) => sum + Number(b.amount || 0), 0);

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message="Carregando contas..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Contas a Pagar"
        showLogo={true}
        rightIcon={
          <TouchableOpacity onPress={handleAddBill} style={{ padding: spacing[1] }}>
            <Plus size={24} color={colors.text.secondary} />
          </TouchableOpacity>
        }
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Month Selector */}
        <View style={styles.monthSection}>
          <MonthSelector
            selectedMonth={selectedMonth}
            onMonthChange={setSelectedMonth}
          />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            <StatCard
              label="Pendentes"
              value={pendingCount.toString()}
              icon={<Clock size={20} color={colors.text.secondary} />}
              variant="default"
              style={{ width: 140, marginRight: spacing[2] }}
            />
            <StatCard
              label="Vencidas"
              value={overdueCount.toString()}
              icon={<AlertCircle size={20} color={colors.error.main} />}
              variant="expense"
              style={{ width: 140, marginRight: spacing[2] }}
            />
            <StatCard
              label="Total Pendente"
              value={formatCurrency(totalPending)}
              icon={<Calendar size={20} color={colors.text.secondary} />}
              variant="default"
              style={{ width: 180 }}
            />
          </ScrollView>
        </View>

        {/* Filters */}
        <Card style={styles.filtersCard}>
          <TouchableOpacity
            style={styles.filtersHeader}
            onPress={() => setShowFilters(!showFilters)}
            activeOpacity={0.7}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
              <Filter size={20} color={colors.text.secondary} />
              <Subheadline weight="semiBold">Filtros</Subheadline>
            </View>
            <Callout color="secondary">{showFilters ? 'Recolher' : 'Expandir'}</Callout>
          </TouchableOpacity>

          {showFilters && (
            <View style={styles.filtersContent}>
              {/* Status Filter */}
              <View style={styles.filterRow}>
                <Caption weight="medium" style={{ marginBottom: spacing[1] }}>Status</Caption>
                <View style={styles.filterButtons}>
                  {['all', 'pending', 'overdue', 'paid'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterButton,
                        filter === status && styles.filterButtonActive
                      ]}
                      onPress={() => setFilter(status)}
                    >
                      <Caption
                        weight={filter === status ? 'semiBold' : 'regular'}
                        style={{ color: filter === status ? colors.brand.primary : colors.text.secondary }}
                      >
                        {status === 'all' ? 'Todas' : status === 'pending' ? 'Pendentes' : status === 'overdue' ? 'Vencidas' : 'Pagas'}
                      </Caption>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Search */}
              <View style={styles.filterRow}>
                <Caption weight="medium" style={{ marginBottom: spacing[1] }}>Buscar</Caption>
                <View style={styles.searchContainer}>
                  <Search size={18} color={colors.text.tertiary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Descrição..."
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholderTextColor={colors.text.tertiary}
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                      <XIcon size={18} color={colors.text.tertiary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
        </Card>

        {/* Bills List */}
        {filteredBills.length > 0 ? (
          filteredBills.map((bill) => {
            const status = getBillStatus(bill);
            const StatusIcon = status.icon;

            return (
              <TouchableOpacity
                key={bill.id}
                onPress={() => handleBillPress(bill)}
                activeOpacity={0.7}
              >
                <Card style={styles.billCard}>
                  <View style={styles.billHeader}>
                    <View style={{ flex: 1 }}>
                      <Callout weight="semiBold" numberOfLines={1}>
                        {bill.description || 'Sem descrição'}
                      </Callout>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginTop: spacing[0.5] }}>
                        <Footnote color="secondary">
                          {new Date(bill.due_date).toLocaleDateString('pt-BR')}
                        </Footnote>
                        {bill.category && (
                          <>
                            <Footnote color="tertiary">•</Footnote>
                            <Footnote color="secondary">{bill.category.name}</Footnote>
                          </>
                        )}
                        {bill.cost_center && (
                          <>
                            <Footnote color="tertiary">•</Footnote>
                            <Footnote color="secondary">{bill.cost_center.name}</Footnote>
                          </>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Callout weight="bold">{formatCurrency(bill.amount)}</Callout>
                      <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
                        <StatusIcon size={12} color={status.color} />
                        <Footnote style={{ color: status.color, marginLeft: spacing[0.5] }}>
                          {status.label}
                        </Footnote>
                      </View>
                    </View>
                  </View>

                  {bill.is_recurring && (
                    <View style={styles.recurringBadge}>
                      <Footnote color="secondary">🔄 Recorrente ({bill.recurrence_frequency === 'monthly' ? 'Mensal' : bill.recurrence_frequency === 'weekly' ? 'Semanal' : 'Anual'})</Footnote>
                    </View>
                  )}

                  {/* Quick Actions */}
                  {bill.status !== 'paid' && (
                    <View style={styles.quickActions}>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleMarkAsPaid(bill)}
                      >
                        <CheckCircle size={16} color={colors.success.main} />
                        <Caption style={{ color: colors.success.main, marginLeft: spacing[0.5] }}>
                          Marcar como Paga
                        </Caption>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.quickActionButton}
                        onPress={() => handleDeleteBill(bill)}
                      >
                        <XIcon size={16} color={colors.error.main} />
                        <Caption style={{ color: colors.error.main, marginLeft: spacing[0.5] }}>
                          Excluir
                        </Caption>
                      </TouchableOpacity>
                    </View>
                  )}
                </Card>
              </TouchableOpacity>
            );
          })
        ) : (
          <EmptyState
            emoji="📋"
            title="Nenhuma conta encontrada"
            description={searchQuery || filter !== 'all' || filterCategory || filterOwner
              ? "Tente ajustar os filtros para encontrar contas."
              : "Você não tem contas a pagar no momento."}
          />
        )}

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Bill Modal */}
      <BillModal
        visible={showBillModal}
        onClose={() => {
          setShowBillModal(false);
          setSelectedBill(null);
        }}
        onSave={handleSaveBill}
        bill={selectedBill}
        categories={categories.length > 0 ? categories : (budgetCategories || [])}
        costCenters={costCenters || []}
        cards={cards}
        organization={organization}
      />

      {/* Mark as Paid Modal */}
      <MarkBillAsPaidModal
        visible={showMarkAsPaidModal}
        onClose={() => {
          setShowMarkAsPaidModal(false);
          setBillToMarkAsPaid(null);
        }}
        onConfirm={confirmMarkAsPaid}
        bill={billToMarkAsPaid}
        costCenters={costCenters || []}
        organization={organization}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[2],
  },
  monthSection: {
    marginBottom: spacing[3],
  },
  statsSection: {
    marginBottom: spacing[3],
  },
  statsScroll: {
    paddingHorizontal: spacing[0.5],
  },
  filtersCard: {
    marginBottom: spacing[3],
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[2],
  },
  filtersContent: {
    padding: spacing[2],
    paddingTop: 0,
    gap: spacing[3],
  },
  filterRow: {
    marginBottom: spacing[2],
  },
  filterButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[1],
  },
  filterButton: {
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterButtonActive: {
    backgroundColor: colors.brand.bg,
    borderColor: colors.brand.primary,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1.5],
    gap: spacing[1.5],
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.primary,
  },
  billCard: {
    marginBottom: spacing[2],
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[0.5],
    borderRadius: radius.md,
    marginTop: spacing[0.5],
  },
  recurringBadge: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  quickActions: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[1],
    paddingHorizontal: spacing[2],
    borderRadius: radius.md,
    backgroundColor: colors.background.secondary,
  },
});

