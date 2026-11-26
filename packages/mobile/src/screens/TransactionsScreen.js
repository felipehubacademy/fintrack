import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Platform,
  Modal,
  SectionList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import {
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  Filter,
  CheckSquare,
  Square,
  Trash2,
  X,
  SlidersHorizontal,
  AlertCircle,
  ClipboardList,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { useMonthlyFinancials } from '../hooks/useMonthlyFinancials';
import { colors, spacing, radius, shadows } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Text, Title2, Callout, Caption } from '../components/ui/Text';
import EmptyState from '../components/ui/EmptyState';
import LoadingLogo from '../components/ui/LoadingLogo';
import { TransactionModal } from '../components/financial/TransactionModal';
import { FilterSheet } from '../components/financial/FilterSheet';
import { DetailedStatsSheet } from '../components/financial/DetailedStatsSheet';
import { TransactionRow, transactionCategoryName, paymentLabel } from '../components/dashboard/TransactionRow';
import { monthKeyLabel } from '../utils/date';
import { categoryLabel } from '../utils/categoryLabel';
import { useI18n } from '../contexts/I18nContext';
import { isFeatureEnabled } from '@fintrack/shared/config';
import { typography } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { useToast } from '../components/ui/Toast';
import { useAlert } from '../components/ui/AlertProvider';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { HapticFeedback } from '../utils/haptics';
import { useBilling } from '../hooks/useBilling';

export default function TransactionsScreen() {
  const { colors: themeColors, isDark } = useTheme();
  const { t, formatMoney, formatRelativeDay } = useI18n();
  const navigation = useNavigation();
  const { requireAccess } = useBilling();
  const { organization, user, loading: orgLoading, costCenters } = useOrganization();
  const { showToast } = useToast();
  const { alert } = useAlert();
  const { confirm } = useConfirmation();
  const organizationName = organization?.name || '';
  const isSoloMember = organization?.type === 'solo';
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const [searchQuery, setSearchQuery] = useState('');
  const [searchText, setSearchText] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState('expense');
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [advancedFilters, setAdvancedFilters] = useState({
    costCenter: null, category: null, paymentMethod: null, card: null, type: 'all',
  });
  const [sortConfig, setSortConfig] = useState({ key: 'date', direction: 'desc' });
  const [categories, setCategories] = useState([]);
  const [cards, setCards] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [totalIncome, setTotalIncome] = useState(0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [detailedSheetVisible, setDetailedSheetVisible] = useState(false);
  const [detailedSheetData, setDetailedSheetData] = useState({
    title: '', type: 'expense', paymentBreakdown: null, responsibleData: [], totalAmount: 0,
  });
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [detailTransaction, setDetailTransaction] = useState(null);

  const {
    expenses, incomes,
    costCenters: fetchedCostCenters, cards: fetchedCards, categories: fetchedCategories,
    totalExpenses: monthlyTotalExpenses, totalIncome: monthlyTotalIncome,
    loading: financialsLoading, error: financialsError, refresh: refreshFinancials,
  } = useMonthlyFinancials(organization, selectedMonth);

  const availableCostCenters = (costCenters?.length > 0 ? costCenters : fetchedCostCenters) || [];

  const categoryMap = useMemo(() => {
    const src = categories.length > 0 ? categories : fetchedCategories || [];
    const map = {};
    src.forEach(cat => { if (cat?.id) map[cat.id] = cat; });
    return map;
  }, [categories, fetchedCategories]);

  const cardMap = useMemo(() => {
    const map = {};
    (cards || []).forEach(card => { if (card?.id) map[card.id] = card; });
    return map;
  }, [cards]);

  useEffect(() => { setCategories(fetchedCategories || []); }, [fetchedCategories]);
  useEffect(() => { setCards(fetchedCards || []); }, [fetchedCards]);
  useEffect(() => { setTotalExpenses(monthlyTotalExpenses); setTotalIncome(monthlyTotalIncome); }, [monthlyTotalExpenses, monthlyTotalIncome]);

  useEffect(() => {
    if (!expenses && !incomes) { setTransactions([]); setFilteredTransactions([]); return; }
    const expenseItems = (expenses || []).map(exp => ({ ...exp, type: 'expense', category_name: exp.category_name || categoryMap[exp.category_id]?.name || null, card_name: exp.card_name || cardMap[exp.card_id]?.name || null }));
    const incomeItems = (incomes || []).map(inc => ({ ...inc, type: 'income', category_name: inc.category_name || categoryMap[inc.category_id]?.name || null }));
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const merged = [...expenseItems, ...incomeItems].sort((a, b) => {
      const dA = new Date(a.date + 'T00:00:00'), dB = new Date(b.date + 'T00:00:00');
      const aF = dA > today, bF = dB > today;
      if (aF && !bF) return 1; if (!aF && bF) return -1;
      if (!aF && !bF) return dB - dA || new Date(b.created_at || 0) - new Date(a.created_at || 0);
      return dA - dB || new Date(a.created_at || 0) - new Date(b.created_at || 0);
    });
    setTransactions(merged); setHasMore(merged.length >= PAGE_SIZE); setPage(0);
  }, [expenses, incomes, categoryMap, cardMap]);

  useEffect(() => { filterTransactions(); }, [filterTransactions]);

  const filterTransactions = useCallback(() => {
    let filtered = [...transactions];
    const typeFilter = advancedFilters.type !== 'all' ? advancedFilters.type : filterType;
    if (typeFilter !== 'all') filtered = filtered.filter(t => t.type === typeFilter);
    if (advancedFilters.costCenter === 'organization') filtered = filtered.filter(t => t.is_shared);
    else if (advancedFilters.costCenter) filtered = filtered.filter(t => t.cost_center_id === advancedFilters.costCenter);
    if (advancedFilters.category) filtered = filtered.filter(t => t.category_id === advancedFilters.category);
    if (advancedFilters.paymentMethod) filtered = filtered.filter(t => t.payment_method === advancedFilters.paymentMethod);
    if (advancedFilters.card) filtered = filtered.filter(t => t.card_id === advancedFilters.card);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(tx => {
        const raw = transactionCategoryName(tx);
        return tx.description?.toLowerCase().includes(q)
          || raw?.toLowerCase().includes(q)
          || (raw && categoryLabel(raw, t).toLowerCase().includes(q));
      });
    }
    setFilteredTransactions(filtered);
  }, [transactions, searchQuery, filterType, advancedFilters, sortConfig, t]);

  const hasAdvancedFilters = useMemo(() => advancedFilters.type !== 'all' || !!advancedFilters.costCenter || !!advancedFilters.category || !!advancedFilters.paymentMethod || !!advancedFilters.card, [advancedFilters]);
  const usingFilteredTotals = searchQuery.trim().length > 0 || hasAdvancedFilters || filterType !== 'all';
  const filteredTotals = useMemo(() => filteredTransactions.reduce((acc, t) => { t.type === 'income' ? acc.income += t.amount || 0 : acc.expense += t.amount || 0; return acc; }, { income: 0, expense: 0 }), [filteredTransactions]);
  const statsIncome = usingFilteredTotals ? filteredTotals.income : monthlyTotalIncome;
  const statsExpense = usingFilteredTotals ? filteredTotals.expense : monthlyTotalExpenses;

  const loadTransactions = async () => { try { await refreshFinancials(); } finally { setRefreshing(false); } };
  const onRefresh = async () => { setRefreshing(true); await loadTransactions(); };

  // "Today" / "Yesterday" / "26 Nov" in the user's language
  const dayLabel = (dateString) => formatRelativeDay(String(dateString).split('T')[0]);

  const groupByDate = (txs) => {
    const groups = {};
    txs.forEach(t => {
      const key = t.date.split('T')[0];
      if (!groups[key]) groups[key] = { date: t.date, transactions: [], totalExpenses: 0, totalIncomes: 0 };
      groups[key].transactions.push(t);
      t.type === 'expense' ? groups[key].totalExpenses += t.amount || 0 : groups[key].totalIncomes += t.amount || 0;
    });
    const today = new Date(); today.setHours(0, 0, 0, 0);
    return Object.values(groups).sort((a, b) => {
      const dA = new Date(a.date.split('T')[0] + 'T00:00:00'), dB = new Date(b.date.split('T')[0] + 'T00:00:00');
      const aF = dA > today, bF = dB > today;
      if (aF && !bF) return 1; if (!aF && bF) return -1;
      return !aF ? dB - dA : dA - dB;
    });
  };

  const sectionsData = useMemo(() => {
    const paginated = filteredTransactions.slice(0, (page + 1) * PAGE_SIZE);
    return groupByDate(paginated).map((g, i) => ({ title: dayLabel(g.date), date: g.date, totalIncomes: g.totalIncomes, totalExpenses: g.totalExpenses, data: g.transactions, groupIndex: i }));
  }, [filteredTransactions, page, formatRelativeDay]);

  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore) return;
    const total = filteredTransactions.length, loaded = (page + 1) * PAGE_SIZE;
    if (loaded < total) { setLoadingMore(true); setTimeout(() => { setPage(p => p + 1); setLoadingMore(false); setHasMore((page + 2) * PAGE_SIZE < total); }, 300); }
    else setHasMore(false);
  }, [loadingMore, hasMore, page, filteredTransactions.length]);

  // Month pills
  const monthPills = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number);
    const pills = [];
    for (let i = 5; i >= 0; i--) {
      let month = m - i, year = y;
      while (month <= 0) { month += 12; year--; }
      const val = `${year}-${String(month).padStart(2, '0')}`;
      pills.push({ label: monthKeyLabel(val), value: val, active: val === selectedMonth });
    }
    return pills;
  }, [selectedMonth, t]);

  // Selection
  const toggleSelectionMode = () => { setSelectionMode(!selectionMode); setSelectedItems([]); };
  const toggleItemSelection = (tx) => { const key = `${tx.type}-${tx.id}`; setSelectedItems(prev => prev.includes(key) ? prev.filter(id => id !== key) : [...prev, key]); };
  const isItemSelected = (tx) => selectedItems.includes(`${tx.type}-${tx.id}`);

  const handleBulkDelete = async () => {
    if (selectedItems.length === 0) return;
    HapticFeedback.warning();
    const confirmed = await confirm({ title: t('transactions.delete.bulkTitle', { count: selectedItems.length }), message: t('transactions.delete.message'), confirmText: t('common.delete'), type: 'danger' });
    if (!confirmed) return;
    try {
      const exp = [], inc = [];
      selectedItems.forEach(key => { const [type, id] = key.split('-'); type === 'expense' ? exp.push(id) : inc.push(id); });
      if (exp.length) { const { error } = await supabase.from('expenses').delete().in('id', exp); if (error) throw error; }
      if (inc.length) { const { error } = await supabase.from('incomes').delete().in('id', inc); if (error) throw error; }
      setSelectedItems([]); setSelectionMode(false);
      showToast(t('transactions.delete.bulkDone', { count: selectedItems.length }), 'success');
      await loadTransactions();
    } catch { showToast(t('transactions.delete.error'), 'error'); }
  };

  const handleTransactionPress = (tx) => { selectionMode ? toggleItemSelection(tx) : (setDetailTransaction(tx), setDetailModalVisible(true)); };

  const handleDeleteTransaction = async (tx) => {
    if (!tx) return;
    HapticFeedback.warning();
    const confirmed = await confirm({ title: t('transactions.delete.title'), message: t('transactions.delete.message'), confirmText: t('common.delete'), type: 'danger' });
    if (!confirmed) return;
    try {
      const { error } = await supabase.from(tx.type === 'income' ? 'incomes' : 'expenses').delete().eq('id', tx.id);
      if (error) throw error;
      HapticFeedback.success(); setDetailModalVisible(false); setDetailTransaction(null);
      await loadTransactions(); showToast(t('transactions.delete.done'), 'success');
    } catch { HapticFeedback.error(); showToast(t('transactions.delete.error'), 'error'); }
  };

  const openEditModal = (tx) => {
    if (!tx) return;
    setSelectedTransaction({ id: tx.id, type: tx.type, description: tx.description || '', amount: tx.amount || 0, date: tx.date, cost_center_id: tx.cost_center_id, category_id: tx.category_id, payment_method: tx.payment_method, card_id: tx.card_id, bank_account_id: tx.bank_account_id, is_shared: tx.is_shared, shared_percentage: tx.shared_percentage, expense_splits: tx.expense_splits, income_splits: tx.income_splits, installment_info: tx.installment_info, parent_expense_id: tx.parent_expense_id });
    setModalType(tx.type); setModalVisible(true);
  };

  const handleSaveTransaction = async (formValues) => {
    if (!organization?.id || !user?.id) { showToast(t('transactions.save.noOrganization'), 'error'); return; }
    if (formValues.type === 'income') { alert({ title: t('transactions.save.incomeTitle'), message: t('transactions.save.incomeMessage'), type: 'info' }); return; }
    try {
      const amountValue = Number(formValues.amount) || 0;
      if (!amountValue || amountValue <= 0) throw new Error(t('transactions.save.invalidAmount'));
      const willBeShared = Boolean(formValues.is_shared);
      const ownerName = formValues.owner_name || (willBeShared ? organizationName : null) || '';
      if (!ownerName) throw new Error(t('transactions.save.invalidOwner'));
      const basePayload = { organization_id: organization.id, user_id: user.id, description: formValues.description.trim(), amount: amountValue, date: formValues.date, category_id: formValues.category_id || null, payment_method: formValues.payment_method, card_id: formValues.payment_method === 'credit_card' ? formValues.card_id : null, owner: ownerName.trim(), is_shared: willBeShared, cost_center_id: willBeShared ? null : formValues.cost_center_id || null, status: 'confirmed', confirmed_at: new Date().toISOString(), confirmed_by: user.id };
      if (formValues.payment_method === 'credit_card') await saveCreditExpense(basePayload, formValues, amountValue);
      else await saveSimpleExpense(basePayload, formValues, amountValue);
      await loadTransactions();
    } catch (err) { showToast(err?.message || t('transactions.save.error'), 'error'); }
  };

  const fetchExpenseGroupIds = async (expOrId) => {
    const groupId = typeof expOrId === 'number' ? expOrId : expOrId.parent_expense_id || expOrId.id;
    const { data, error } = await supabase.from('expenses').select('id').or(`id.eq.${groupId},parent_expense_id.eq.${groupId}`);
    if (error) throw error;
    return (data || []).map(i => i.id);
  };

  const syncSplitsForExpense = async (expenseId, splits = [], totalAmount = 0) => {
    if (!expenseId) return;
    await supabase.from('expense_splits').delete().eq('expense_id', expenseId);
    const payload = splits.filter(s => s.cost_center_id && Number(s.percentage) > 0).map(s => ({ expense_id: expenseId, cost_center_id: s.cost_center_id, percentage: Number(s.percentage), amount: Number(((totalAmount * Number(s.percentage)) / 100).toFixed(2)) }));
    if (payload.length > 0) await supabase.from('expense_splits').insert(payload);
  };

  const saveSimpleExpense = async (payload, formValues, amountValue) => {
    if (selectedTransaction) {
      const wasCreditBefore = selectedTransaction.payment_method === 'credit_card' || Boolean(selectedTransaction.parent_expense_id);
      if (wasCreditBefore) {
        const previousIds = await fetchExpenseGroupIds(selectedTransaction);
        if (previousIds.length > 0) { await supabase.from('expense_splits').delete().in('expense_id', previousIds); await supabase.from('expenses').delete().in('id', previousIds); }
        else await supabase.from('expenses').delete().eq('id', selectedTransaction.id);
        const { data, error } = await supabase.from('expenses').insert([{ ...payload, card_id: null }]).select().single();
        if (error) throw error;
        if (formValues.is_shared) await syncSplitsForExpense(data.id, formValues.splits, amountValue);
        return;
      }
      const { error } = await supabase.from('expenses').update({ owner: payload.owner, cost_center_id: payload.cost_center_id, is_shared: payload.is_shared, description: payload.description, category_id: payload.category_id, payment_method: payload.payment_method, amount: amountValue, date: payload.date, card_id: null }).eq('id', selectedTransaction.id);
      if (error) throw error;
      if (formValues.is_shared) await syncSplitsForExpense(selectedTransaction.id, formValues.splits, amountValue);
      else await supabase.from('expense_splits').delete().eq('expense_id', selectedTransaction.id);
      return;
    }
    const { data, error } = await supabase.from('expenses').insert([{ ...payload, card_id: null }]).select().single();
    if (error) throw error;
    if (formValues.is_shared) await syncSplitsForExpense(data.id, formValues.splits, amountValue);
  };

  const saveCreditExpense = async (payload, formValues, amountValue) => {
    const count = Math.max(1, Number(formValues.installments) || 1);
    const { data: parentExpenseId, error } = await supabase.rpc('create_installments', { p_amount: amountValue, p_installments: count, p_description: payload.description, p_date: payload.date, p_card_id: payload.card_id, p_category_id: payload.category_id, p_cost_center_id: payload.cost_center_id, p_owner: payload.owner, p_organization_id: organization.id, p_user_id: user.id, p_whatsapp_message_id: null, p_split_template: null });
    if (error) throw error;
    if (formValues.is_shared && formValues.splits?.length) {
      const ids = await fetchExpenseGroupIds(parentExpenseId);
      await supabase.from('expense_splits').delete().in('expense_id', ids);
      const splitPayload = ids.flatMap(eid => formValues.splits.filter(s => s.cost_center_id && Number(s.percentage) > 0).map(s => ({ expense_id: eid, cost_center_id: s.cost_center_id, percentage: Number(s.percentage), amount: Number(((amountValue * Number(s.percentage)) / 100 / count).toFixed(2)) })));
      if (splitPayload.length > 0) await supabase.from('expense_splits').insert(splitPayload);
    }
    if (selectedTransaction) {
      const previousIds = await fetchExpenseGroupIds(selectedTransaction);
      if (previousIds.length > 0) { await supabase.from('expense_splits').delete().in('expense_id', previousIds); await supabase.from('expenses').delete().in('id', previousIds); }
      else await supabase.from('expenses').delete().eq('id', selectedTransaction.id);
    }
  };

  const handleSearchSubmit = () => setSearchQuery(searchText.trim());
  const handleClearSearch = () => { setSearchText(''); setSearchQuery(''); };

  // --- RENDER ---

  if (orgLoading || financialsLoading) {
    return <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}><LoadingLogo fullScreen message={t('transactions.loading')} /></View>;
  }
  if (financialsError) {
    return <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}><EmptyState icon={<AlertCircle size={48} color={themeColors.error.main} />} title={t('transactions.loadError.title')} description={t('transactions.loadError.body')} actionLabel={t('transactions.loadError.reload')} onAction={loadTransactions} /></View>;
  }

  const renderTransaction = ({ item: tx, index, section }) => (
    <TransactionRow
      tx={tx}
      isLast={index === section.data.length - 1}
      onPress={() => handleTransactionPress(tx)}
      selectionMode={selectionMode}
      selected={selectionMode && isItemSelected(tx)}
    />
  );

  const renderSectionHeader = ({ section }) => (
    <View style={styles.dayHeader}>
      <Text style={[styles.dayLabel, { color: themeColors.text.secondary }]}>{section.title}</Text>
      <View style={styles.daySummary}>
        {section.totalIncomes > 0 && <Text style={[styles.dayAmount, typography.tabularNums, { color: themeColors.success.main }]}>+{formatMoney(section.totalIncomes)}</Text>}
        {section.totalExpenses > 0 && <Text style={[styles.dayAmount, typography.tabularNums, { color: themeColors.text.secondary }]}>-{formatMoney(section.totalExpenses)}</Text>}
      </View>
    </View>
  );

  const ListHeader = () => (
    <View>
      {/* Title */}
      <View style={styles.titleRow}>
        <Text style={styles.pageTitle} accessibilityRole="header">{t('transactions.title')}</Text>
        <View style={styles.titleActions}>
          <TouchableOpacity onPress={toggleSelectionMode} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={selectionMode ? t('transactions.cancelSelect') : t('transactions.selectMode')}>
            {selectionMode ? <X size={20} color={themeColors.brand.primary} /> : <CheckSquare size={20} color={themeColors.text.secondary} />}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setFilterSheetVisible(true)} style={styles.iconBtn} accessibilityRole="button" accessibilityLabel={t('transactions.filters')}>
            <SlidersHorizontal size={20} color={hasAdvancedFilters ? themeColors.brand.primary : themeColors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={[styles.searchBar, { backgroundColor: themeColors.background.secondary, borderColor: themeColors.border.light }]}>
        <Search size={16} color={themeColors.text.tertiary} />
        <TextInput
          style={[styles.searchInput, { color: themeColors.text.primary }]}
          placeholder={t('transactions.searchPlaceholder')}
          accessibilityLabel={t('transactions.searchPlaceholder')}
          placeholderTextColor={themeColors.text.tertiary}
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearchSubmit}
          returnKeyType="search"
        />
        {searchText.length > 0 && (
          <TouchableOpacity onPress={handleClearSearch} accessibilityRole="button" accessibilityLabel={t('transactions.clearSearch')}><X size={16} color={themeColors.text.tertiary} /></TouchableOpacity>
        )}
      </View>

      {/* Month pills */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.monthPills}>
        {monthPills.map(p => (
          <TouchableOpacity
            key={p.value}
            style={[styles.monthPill, { borderColor: themeColors.border.light }, p.active && { backgroundColor: themeColors.brand.primary, borderColor: themeColors.brand.primary }]}
            onPress={() => setSelectedMonth(p.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: p.active }}
          >
            <Text style={[styles.monthPillText, p.active && { color: '#FFFFFF' }, !p.active && { color: themeColors.text.secondary }]}>{p.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Summary bar */}
      <View style={[styles.summaryBar, { backgroundColor: themeColors.brand.bg }]}>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: themeColors.text.secondary }]}>{t('transactions.in')}</Text>
          <Text style={[styles.summaryValue, typography.tabularNums, { color: themeColors.success.main }]}>{formatMoney(statsIncome)}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: themeColors.border.light }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: themeColors.text.secondary }]}>{t('transactions.out')}</Text>
          <Text style={[styles.summaryValue, typography.tabularNums, { color: themeColors.text.primary }]}>{formatMoney(statsExpense)}</Text>
        </View>
        <View style={[styles.summaryDivider, { backgroundColor: themeColors.border.light }]} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryLabel, { color: themeColors.text.secondary }]}>{t('transactions.balance')}</Text>
          <Text style={[styles.summaryValue, typography.tabularNums, { color: statsIncome - statsExpense >= 0 ? themeColors.success.main : themeColors.error.main }]}>{formatMoney(statsIncome - statsExpense)}</Text>
        </View>
      </View>

      {/* Type filter chips */}
      <View style={styles.filterChips}>
        {['all', 'income', 'expense'].map(value => ({ value, label: t(`transactions.filter.${value}`) })).map(chip => (
          <TouchableOpacity
            key={chip.value}
            style={[styles.chip, { borderColor: themeColors.border.light, backgroundColor: themeColors.background.secondary }, filterType === chip.value && { backgroundColor: themeColors.brand.primary, borderColor: themeColors.brand.primary }]}
            onPress={() => setFilterType(filterType === chip.value && chip.value !== 'all' ? 'all' : chip.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: filterType === chip.value }}
          >
            <Text style={[styles.chipText, { color: themeColors.text.secondary }, filterType === chip.value && { color: '#FFFFFF' }]}>{chip.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
      {sectionsData.length === 0 ? (
        <ScrollView contentContainerStyle={styles.scrollContent} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          <ListHeader />
          {searchQuery || hasAdvancedFilters || filterType !== 'all' ? (
            <EmptyState
              icon={<ClipboardList size={48} color={themeColors.text.tertiary} />}
              title={t('transactions.empty.noResults')}
              description={t('transactions.empty.noResultsBody')}
            />
          ) : (
            <EmptyState
              icon={<ClipboardList size={48} color={themeColors.text.tertiary} />}
              title={t('transactions.empty.title')}
              description={t('transactions.empty.body', { example: t('transactions.empty.example') })}
              zulText={t('transactions.empty.example')}
              actionLabel={isFeatureEnabled('manualEntry') ? t('dashboard.manualAdd') : undefined}
              onAction={isFeatureEnabled('manualEntry') ? () => requireAccess(() => navigation.navigate('AddTransaction', { type: 'expense' })) : undefined}
            />
          )}
        </ScrollView>
      ) : (
        <SectionList
          sections={sectionsData}
          keyExtractor={(item, i) => `${item.type}-${item.id}-${i}`}
          renderItem={renderTransaction}
          renderSectionHeader={renderSectionHeader}
          ListHeaderComponent={ListHeader}
          stickySectionHeadersEnabled={false}
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={<>{loadingMore && <ActivityIndicator style={{ padding: 16 }} size="small" color={themeColors.brand.primary} />}<View style={{ height: 100 }} /></>}
        />
      )}

      {/* Bulk delete bar */}
      {selectionMode && selectedItems.length > 0 && (
        <View style={[styles.bulkBar, { backgroundColor: themeColors.background.secondary || themeColors.background.primary, borderTopColor: themeColors.border?.light || '#E5E5EA' }]}>
          <Text style={{ fontWeight: '600', fontSize: 14 }}>{t('transactions.selected', { count: selectedItems.length })}</Text>
          <TouchableOpacity style={[styles.bulkDeleteBtn, { backgroundColor: themeColors.error.main }]} onPress={handleBulkDelete} accessibilityRole="button">
            <Trash2 size={16} color="#FFFFFF" />
            <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 13, marginLeft: 6 }}>{t('common.delete')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Transaction Modal */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => { setModalVisible(false); setSelectedTransaction(null); setModalType('expense'); }}
        onSave={handleSaveTransaction}
        transaction={selectedTransaction} type={modalType}
        categories={categories} costCenters={availableCostCenters} cards={cards}
        organization={organization} isSoloUser={isSoloMember}
      />

      {/* Detail Modal */}
      <TransactionDetailModal
        visible={detailModalVisible}
        transaction={detailTransaction}
        onClose={() => setDetailModalVisible(false)}
        onEdit={() => { openEditModal(detailTransaction); setDetailModalVisible(false); }}
        onDelete={() => handleDeleteTransaction(detailTransaction)}
        costCenters={availableCostCenters} cards={cards} categories={categories}
        organizationName={organization?.name} formatDateLabel={dayLabel}
        themeColors={themeColors}
      />

      <DetailedStatsSheet
        visible={detailedSheetVisible} onClose={() => setDetailedSheetVisible(false)}
        title={detailedSheetData.title} type={detailedSheetData.type}
        paymentBreakdown={detailedSheetData.paymentBreakdown}
        responsibleData={detailedSheetData.responsibleData} totalAmount={detailedSheetData.totalAmount}
      />

      <FilterSheet
        visible={filterSheetVisible} onClose={() => setFilterSheetVisible(false)}
        filters={advancedFilters} onApplyFilters={setAdvancedFilters}
        costCenters={availableCostCenters} categories={categories}
        paymentMethods={['credit_card', 'debit_card', 'cash', 'pix', 'bank_transfer', 'boleto']}
        cards={cards} organizationName={organizationName}
      />
    </View>
  );
}

function TransactionDetailModal({ visible, transaction, onClose, onEdit, onDelete, costCenters = [], cards = [], categories = [], organizationName, formatDateLabel, themeColors }) {
  const { t, formatMoney } = useI18n();
  if (!transaction) return null;
  const isExpense = transaction.type === 'expense';
  const amount = Number(transaction.amount || 0);
  const catName = categoryLabel(transactionCategoryName(transaction) || categories.find(c => c.id === transaction.category_id)?.name, t);
  const cardName = transaction.card_id ? (transaction.card_name || cards.find(c => c.id === transaction.card_id)?.name || '—') : null;
  const responsible = transaction.cost_center_id ? costCenters.find(cc => cc.id === transaction.cost_center_id) : null;

  const Row = ({ label, value }) => (
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: themeColors.text.tertiary }]}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.detailOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={[styles.detailSheet, { backgroundColor: themeColors.background.primary }]}>
          <View style={styles.detailHandle} />
          <View style={styles.detailHeader}>
            <View>
              <Text style={[{ fontSize: 13, color: themeColors.text.secondary }]}>{isExpense ? t('transactions.type.expense') : t('transactions.type.income')}</Text>
              <Text style={[{ fontSize: 28, fontWeight: '800', letterSpacing: -1 }, typography.tabularNums]}>{isExpense ? '-' : '+'}{formatMoney(amount)}</Text>
            </View>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel={t('common.close')}><X size={22} color={themeColors.text.secondary} /></TouchableOpacity>
          </View>
          <ScrollView style={{ paddingHorizontal: 20 }}>
            <Row label={t('transactions.detail.description')} value={transaction.description || t('transactions.noDescription')} />
            <Row label={t('transactions.detail.date')} value={formatDateLabel ? formatDateLabel(transaction.date) : transaction.date} />
            <Row label={t('transactions.detail.category')} value={catName} />
            {isExpense && <Row label={t('transactions.detail.payment')} value={paymentLabel(transaction.payment_method, t)} />}
            {cardName && <Row label={t('transactions.detail.card')} value={cardName} />}
            {responsible && <Row label={t('transactions.detail.responsible')} value={responsible.name} />}
            {transaction.installment_info && <Row label={t('transactions.detail.installment')} value={t('transactions.detail.installmentValue', { current: transaction.installment_info.current_installment, total: transaction.installment_info.total_installments })} />}
          </ScrollView>
          <View style={styles.detailFooter}>
            <TouchableOpacity style={[styles.detailBtn, { backgroundColor: themeColors.error.main }]} onPress={onDelete} accessibilityRole="button">
              <Trash2 size={16} color="#FFFFFF" /><Text style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 6 }}>{t('common.delete')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.detailBtn, { backgroundColor: themeColors.brand.primary, flex: 2 }]} onPress={onEdit} accessibilityRole="button">
              <Text style={{ color: '#FFFFFF', fontWeight: '600' }}>{t('common.edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingTop: 60, paddingBottom: 20 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: -0.8 },
  titleActions: { flexDirection: 'row', gap: 12 },
  iconBtn: { padding: 4 },

  searchBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1, gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, fontSize: 14, padding: 0 },

  monthPills: { paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  monthPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999, borderWidth: 1 },
  monthPillText: { fontSize: 13, fontWeight: '600' },

  summaryBar: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 16, paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 2 },
  summaryValue: { fontSize: 14, fontWeight: '700' },
  summaryDivider: { width: 1, height: 28 },

  filterChips: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 20 },
  chip: { paddingHorizontal: 16, paddingVertical: 7, borderRadius: 100, borderWidth: 1 },
  chipText: { fontSize: 12, fontWeight: '600' },

  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 6 },
  dayLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.3 },
  daySummary: { flexDirection: 'row', gap: 10 },
  dayAmount: { fontSize: 12, fontWeight: '600' },

  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 20 },
  txInfo: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 14, fontWeight: '600' },
  txMeta: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', textAlign: 'right' },

  bulkBar: { position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 32 : 12, borderTopWidth: 1 },
  bulkDeleteBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 999 },

  detailOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  detailSheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 34 : 16 },
  detailHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#C7C7CC', alignSelf: 'center', marginTop: 10, marginBottom: 8 },
  detailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  detailLabel: { fontSize: 13 },
  detailValue: { fontSize: 14, fontWeight: '600', textAlign: 'right', marginLeft: 16, flexShrink: 1 },
  detailFooter: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 16 },
  detailBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12 },
});
