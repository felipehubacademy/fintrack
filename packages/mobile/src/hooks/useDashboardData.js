import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../services/supabase';
import { useOrganization } from './useOrganization';
import { useTheme } from '../contexts/ThemeContext';
import { orderTransactionsForDisplay } from '../utils/sortTransactions';
import { formatBrazilDate, formatBrazilDayMonthShort } from '../utils/date';
import { useAlert } from '../components/ui/AlertProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PAYMENT_METHOD_LABELS = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
  cash: 'Dinheiro',
  other: 'Outros',
};

const PAYMENT_METHOD_COLORS = {
  'Cartão de Crédito': '#EF4444',
  'Cartão de Débito': '#3B82F6',
  'PIX': '#10B981',
  'Transferência': '#06B6D4',
  'Boleto': '#F59E0B',
  'Dinheiro': '#8B5CF6',
  'Outros': '#6B7280',
};

const getCurrentMonth = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

const getMonthRange = (monthStr) => {
  const [year, month] = monthStr.split('-');
  const lastDay = new Date(year, month, 0).getDate();
  return {
    start: `${monthStr}-01`,
    end: `${monthStr}-${String(lastDay).padStart(2, '0')}`,
  };
};

export function useDashboardData(navigation) {
  const { organization, user, loading: orgLoading } = useOrganization();
  const { alert } = useAlert();
  const { colors } = useTheme();

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth());
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    transactions: 0,
    cardsTotal: 0,
    bankAccountsTotal: 0,
    scheduledPayments: 0,
  });
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [paymentMethodData, setPaymentMethodData] = useState([]);
  const [ownerData, setOwnerData] = useState([]);
  const [incomeOwnerData, setIncomeOwnerData] = useState([]);
  const [incomeCategoryData, setIncomeCategoryData] = useState([]);
  const [monthlyComparison, setMonthlyComparison] = useState([]);
  const [categoryExpensesMap, setCategoryExpensesMap] = useState({});
  const [cardLookup, setCardLookup] = useState({});
  const [costCenterLookup, setCostCenterLookup] = useState({});
  const [alarmingCategories, setAlarmingCategories] = useState([]);
  const [allAlarmingCategories, setAllAlarmingCategories] = useState([]);
  const [alarmingCategoriesExpanded, setAlarmingCategoriesExpanded] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [scheduledPaymentsData, setScheduledPaymentsData] = useState([]);

  // Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetData, setSheetData] = useState({ title: '', data: [] });
  const [detailedSheetVisible, setDetailedSheetVisible] = useState(false);
  const [bankAccountsSheetVisible, setBankAccountsSheetVisible] = useState(false);
  const [scheduledPaymentsSheetVisible, setScheduledPaymentsSheetVisible] = useState(false);
  const [balanceSheetVisible, setBalanceSheetVisible] = useState(false);
  const [detailedSheetData, setDetailedSheetData] = useState({
    title: '',
    type: 'expense',
    paymentBreakdown: null,
    responsibleData: [],
    totalAmount: 0,
  });

  const checkBudgetExists = useCallback(async () => {
    try {
      if (!organization?.id) return;
      const currentMonth = getCurrentMonth();
      if (selectedMonth !== currentMonth) return;

      const { data: budgets, error } = await supabase
        .from('budgets')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('month_year', `${selectedMonth}-01`)
        .limit(1);

      if (error || (budgets && budgets.length > 0)) return;

      const dismissedKey = `budget_reminder_${currentMonth}`;
      const isDismissed = await AsyncStorage.getItem(dismissedKey);
      if (isDismissed) return;

      setTimeout(() => {
        alert({
          title: 'Crie seu orçamento mensal',
          message: 'Você ainda não criou um orçamento para este mês. Crie um para acompanhar melhor seus gastos!',
          type: 'info',
          buttons: [
            {
              text: 'Criar Agora',
              onPress: () => navigation.navigate('Mais', { screen: 'Budgets', params: { openWizard: true } }),
            },
            { text: 'Mais tarde', onPress: () => {} },
          ],
        });
      }, 1000);
    } catch (error) {
      // silently ignored
    }
  }, [organization, selectedMonth, alert, navigation]);

  const loadDashboardData = useCallback(async () => {
    try {
      if (!organization) return;

      const { start: startOfMonth, end: endOfMonth } = getMonthRange(selectedMonth);

      // Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

      // Fetch incomes
      const { data: incomesData } = await supabase
        .from('incomes')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

      const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalIncome = incomesData?.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) || 0;

      // Fetch active cards
      const { data: cards } = await supabase
        .from('cards')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      const cardLookupMap = {};
      cards?.forEach(card => { if (card?.id) cardLookupMap[card.id] = card; });
      setCardLookup(cardLookupMap);

      // Fetch active bank accounts
      const { data: accounts } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      setBankAccounts(accounts || []);

      const cardExpensesThisMonth = expensesData
        ?.filter(e => e.payment_method === 'credit_card')
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const accountsBalance = accounts?.reduce((sum, a) => sum + (a.current_balance || a.balance || 0), 0) || 0;

      // Fetch scheduled bills
      const { data: billsData } = await supabase
        .from('bills')
        .select('*, category:budget_categories(name, color), cost_center:cost_centers(name, color), card:cards(name, bank)')
        .eq('organization_id', organization.id)
        .in('status', ['pending', 'overdue'])
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
        .order('due_date', { ascending: true });

      const totalScheduledPayments = billsData?.reduce((sum, bill) => sum + (bill.amount || 0), 0) || 0;

      setScheduledPaymentsData((billsData || []).map(bill => ({
        label: bill.description || 'Sem descrição',
        value: bill.amount || 0,
        subtitle: [
          bill.due_date ? formatBrazilDate(bill.due_date) : '',
          bill.status === 'overdue' ? 'Vencida' : '',
          bill.category?.name || '',
        ].filter(Boolean).join(' · '),
        color: bill.category?.color || colors.warning.main,
        status: bill.status,
      })));

      setStats({
        totalIncome,
        totalExpenses,
        balance: totalIncome - totalExpenses - totalScheduledPayments,
        transactions: (expensesData?.length || 0) + (incomesData?.length || 0),
        cardsTotal: cardExpensesThisMonth,
        bankAccountsTotal: accountsBalance,
        scheduledPayments: totalScheduledPayments,
      });

      // Recent transactions (top 5)
      const orderedTransactions = orderTransactionsForDisplay([
        ...(expensesData || []).map(e => ({ ...e, type: 'expense' })),
        ...(incomesData || []).map(i => ({ ...i, type: 'income' })),
      ]);
      setRecentTransactions(orderedTransactions.slice(0, 5));

      // Fetch categories with colors
      const { data: categories } = await supabase
        .from('budget_categories')
        .select('id, name, color')
        .or(`organization_id.eq.${organization.id},organization_id.is.null`);

      const categoryMap = {};
      const categoryColorMap = {};
      categories?.forEach(c => {
        categoryMap[c.id] = c.name;
        categoryColorMap[c.name] = c.color || '#6366F1';
      });

      // Group expenses by category
      const expensesByCategory = {};
      const categoryExpenseMap = {};
      expensesData?.forEach((e) => {
        const amount = e.amount || 0;
        const categoryName = categoryMap[e.budget_category_id] || e.budget_category_name || e.category || 'Outros';
        expensesByCategory[categoryName] = (expensesByCategory[categoryName] || 0) + amount;
        if (!categoryExpenseMap[categoryName]) categoryExpenseMap[categoryName] = [];
        categoryExpenseMap[categoryName].push({
          id: e.id,
          description: e.description || 'Sem descrição',
          amount,
          date: e.date,
          payment_method: e.payment_method,
          card_id: e.card_id,
          cost_center_id: e.cost_center_id,
        });
      });

      const categoryArray = Object.entries(expensesByCategory)
        .map(([label, value]) => ({ label, value, color: categoryColorMap[label] || '#6366F1' }))
        .sort((a, b) => b.value - a.value);

      setCategoryData(categoryArray);
      setCategoryExpensesMap(categoryExpenseMap);

      // Budget alerts (alarming categories >= 80%)
      const { data: budgetsData } = await supabase
        .from('budgets')
        .select('*, category:budget_categories(id, name, color, macro_group)')
        .eq('organization_id', organization.id)
        .eq('month_year', `${selectedMonth}-01`);

      if (budgetsData && budgetsData.length > 0) {
        const alarming = budgetsData
          .map(budget => {
            const spent = parseFloat(budget.current_spent || 0);
            const limit = parseFloat(budget.limit_amount || 0);
            const percentage = limit > 0 ? (spent / limit) * 100 : 0;
            return {
              id: budget.id,
              category_id: budget.category_id,
              category_name: budget.category?.name || 'Sem categoria',
              color: budget.category?.color || colors.brand.primary,
              macro_group: budget.category?.macro_group || 'needs',
              spent, limit,
              percentage: Math.round(percentage),
              remaining: limit - spent,
            };
          })
          .filter(b => b.percentage >= 80 && b.limit > 0)
          .sort((a, b) => b.percentage - a.percentage);

        setAllAlarmingCategories(alarming);
        setAlarmingCategories(alarmingCategoriesExpanded ? alarming : alarming.slice(0, 3));
      } else {
        setAlarmingCategories([]);
        setAllAlarmingCategories([]);
      }

      // Group expenses by payment method
      const expensesByPayment = {};
      expensesData?.forEach((e) => {
        const methodName = PAYMENT_METHOD_LABELS[e.payment_method || 'other'] || e.payment_method;
        expensesByPayment[methodName] = (expensesByPayment[methodName] || 0) + (e.amount || 0);
      });
      setPaymentMethodData(
        Object.entries(expensesByPayment)
          .map(([label, value]) => ({ label, value, color: PAYMENT_METHOD_COLORS[label] || '#6366F1' }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      );

      // Fetch cost centers for owner breakdown
      const { data: costCenters } = await supabase
        .from('cost_centers')
        .select('id, name, color, is_active, default_split_percentage')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      const costCenterColorMap = {};
      const costCenterLookupMap = {};
      costCenters?.forEach(cc => {
        costCenterColorMap[cc.name] = cc.color || '#6366F1';
        if (cc?.id) costCenterLookupMap[cc.id] = cc;
      });
      setCostCenterLookup(costCenterLookupMap);

      // Fetch expense splits
      const expenseIds = expensesData?.map(e => e.id) || [];
      let expenseSplits = [];
      if (expenseIds.length > 0) {
        const { data } = await supabase
          .from('expense_splits')
          .select('*')
          .in('expense_id', expenseIds);
        expenseSplits = data || [];
      }

      const splitsByExpense = {};
      expenseSplits.forEach(split => {
        if (!splitsByExpense[split.expense_id]) splitsByExpense[split.expense_id] = [];
        splitsByExpense[split.expense_id].push(split);
      });
      expensesData?.forEach(e => { e.expense_splits = splitsByExpense[e.id] || []; });

      // Group expenses by owner
      const expensesByOwner = {};
      costCenters?.forEach(cc => {
        const individualExpenses = expensesData
          ?.filter(e => !e.is_shared && e.cost_center_id === cc.id)
          .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        let sharedExpenses = 0;
        const sharedInMonth = expensesData?.filter(e => e.is_shared || e.expense_splits?.length > 0) || [];
        sharedInMonth.forEach(e => {
          if (e.expense_splits && e.expense_splits.length > 0) {
            const split = e.expense_splits.find(s => s.cost_center_id === cc.id);
            if (split) {
              const expenseAmount = parseFloat(e.amount || 0);
              const splitAmount = parseFloat(split.amount || 0);
              const totalSplitsAmount = e.expense_splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
              if (totalSplitsAmount > expenseAmount && expenseAmount > 0) {
                sharedExpenses += expenseAmount * (splitAmount / totalSplitsAmount);
              } else {
                sharedExpenses += splitAmount;
              }
            }
          } else if (e.is_shared) {
            const percentage = parseFloat(cc.default_split_percentage || 0);
            sharedExpenses += (parseFloat(e.amount || 0) * percentage) / 100;
          }
        });

        const total = individualExpenses + sharedExpenses;
        if (total > 0) {
          expensesByOwner[cc.name] = { total, individual: individualExpenses, shared: sharedExpenses };
        }
      });

      setOwnerData(
        Object.entries(expensesByOwner)
          .map(([label, data]) => ({
            label, value: data.total, individual: data.individual, shared: data.shared,
            color: costCenterColorMap[label] || '#6366F1',
          }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      );

      // Group incomes by owner
      const incomesByOwner = {};
      incomesData?.forEach(i => {
        const owner = i.owner_name || i.owner || 'Sem Responsável';
        incomesByOwner[owner] = (incomesByOwner[owner] || 0) + (i.amount || 0);
      });
      setIncomeOwnerData(
        Object.entries(incomesByOwner)
          .map(([label, value]) => ({ label, value, color: costCenterColorMap[label] || '#10B981' }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      );

      // Group incomes by category
      const { data: incomeCategories } = await supabase
        .from('income_categories')
        .select('id, name, color');

      const incomeCategoryMap = {};
      const incomeCategoryColorMap = {};
      incomeCategories?.forEach(ic => {
        incomeCategoryMap[ic.id] = ic.name;
        incomeCategoryColorMap[ic.name] = ic.color || '#10B981';
      });

      const incomesByCategory = {};
      incomesData?.forEach(i => {
        const name = incomeCategoryMap[i.income_category_id] || i.income_category_name || i.category || 'Outros';
        incomesByCategory[name] = (incomesByCategory[name] || 0) + (i.amount || 0);
      });
      setIncomeCategoryData(
        Object.entries(incomesByCategory)
          .map(([label, value]) => ({ label, value, color: incomeCategoryColorMap[label] || '#10B981' }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 6)
      );
    } catch (error) {
      // silently ignored
    }
  }, [organization, selectedMonth, colors, alarmingCategoriesExpanded]);

  const loadMonthlyComparison = useCallback(async () => {
    try {
      if (!organization) return;

      const comparisonData = [];
      const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

      for (let i = 5; i >= 0; i--) {
        let month = currentMonth - i;
        let year = currentYear;
        while (month <= 0) { month += 12; year -= 1; }

        const { start: startDate, end: endDate } = getMonthRange(`${year}-${String(month).padStart(2, '0')}`);

        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount, payment_method')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate);

        const { data: incomesData } = await supabase
          .from('incomes')
          .select('amount')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate);

        const creditExpenses = (expensesData || [])
          .filter(e => e.payment_method === 'credit_card')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const cashExpenses = (expensesData || [])
          .filter(e => e.payment_method !== 'credit_card')
          .reduce((sum, e) => sum + (e.amount || 0), 0);
        const totalIncome = (incomesData || []).reduce((sum, i) => sum + (i.amount || 0), 0);

        comparisonData.push({
          month: monthNames[month - 1],
          credit: creditExpenses / 1000,
          cash: cashExpenses / 1000,
          income: totalIncome / 1000,
        });
      }

      setMonthlyComparison(comparisonData);
    } catch (error) {
      // silently ignored
    }
  }, [organization, selectedMonth]);

  useEffect(() => {
    if (organization) {
      loadDashboardData();
      loadMonthlyComparison();
      checkBudgetExists();
    }
  }, [organization, selectedMonth]);

  useEffect(() => {
    if (allAlarmingCategories.length > 0) {
      setAlarmingCategories(
        alarmingCategoriesExpanded ? allAlarmingCategories : allAlarmingCategories.slice(0, 3)
      );
    }
  }, [alarmingCategoriesExpanded, allAlarmingCategories]);

  const handleToggleAlarmingCategories = useCallback(() => {
    const newExpanded = !alarmingCategoriesExpanded;
    setAlarmingCategoriesExpanded(newExpanded);
    setAlarmingCategories(newExpanded ? allAlarmingCategories : allAlarmingCategories.slice(0, 3));
  }, [alarmingCategoriesExpanded, allAlarmingCategories]);

  const handleCategoryLegendPress = useCallback((categoryName) => {
    if (!categoryName) return;

    const expenses = (categoryExpensesMap[categoryName] || [])
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    const categoryEntry = categoryData.find(c => c.label === categoryName);

    const formattedData = expenses.map(expense => {
      const subtitleParts = [];
      if (expense.date) subtitleParts.push(formatBrazilDayMonthShort(expense.date));
      subtitleParts.push(PAYMENT_METHOD_LABELS[expense.payment_method] || PAYMENT_METHOD_LABELS.other);
      if (expense.card_id && cardLookup[expense.card_id]?.name) subtitleParts.push(cardLookup[expense.card_id].name);
      if (expense.cost_center_id && costCenterLookup[expense.cost_center_id]?.name) subtitleParts.push(costCenterLookup[expense.cost_center_id].name);

      return {
        label: expense.description || 'Sem descrição',
        subtitle: subtitleParts.join(' • '),
        value: expense.amount || 0,
        color: categoryEntry?.color,
      };
    });

    setSheetData({ title: `Despesas • ${categoryName}`, data: formattedData });
    setSheetVisible(true);
  }, [categoryExpensesMap, categoryData, cardLookup, costCenterLookup]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadDashboardData();
    await loadMonthlyComparison();
    setRefreshing(false);
  }, [loadDashboardData, loadMonthlyComparison]);

  const openIncomeSheet = useCallback(() => {
    setSheetData({
      title: 'Receitas por Responsável',
      data: incomeOwnerData.map(item => ({
        label: item.label,
        value: item.value,
        color: item.color,
        percentage: ((item.value / stats.totalIncome) * 100).toFixed(1),
      })),
    });
    setSheetVisible(true);
  }, [incomeOwnerData, stats.totalIncome]);

  const openExpenseSheet = useCallback(() => {
    const cashAmount = stats.totalExpenses - stats.cardsTotal;
    setDetailedSheetData({
      title: 'Total de Despesas',
      type: 'expense',
      paymentBreakdown: { cash: cashAmount, credit: stats.cardsTotal },
      responsibleData: ownerData.map(item => ({
        label: item.label,
        value: item.value,
        color: item.color,
        percentage: ((item.value / stats.totalExpenses) * 100).toFixed(1),
        individual: item.individual || 0,
        shared: item.shared || 0,
      })),
      totalAmount: stats.totalExpenses,
    });
    setDetailedSheetVisible(true);
  }, [stats, ownerData]);

  return {
    // Data
    user, organization, orgLoading,
    selectedMonth, setSelectedMonth,
    refreshing, onRefresh,
    stats, recentTransactions,
    categoryData, paymentMethodData, ownerData,
    incomeOwnerData, incomeCategoryData,
    monthlyComparison,
    alarmingCategories, allAlarmingCategories, alarmingCategoriesExpanded,
    bankAccounts,
    scheduledPaymentsData,
    colors,
    // Sheet state
    sheetVisible, setSheetVisible, sheetData,
    detailedSheetVisible, setDetailedSheetVisible, detailedSheetData,
    bankAccountsSheetVisible, setBankAccountsSheetVisible,
    scheduledPaymentsSheetVisible, setScheduledPaymentsSheetVisible,
    balanceSheetVisible, setBalanceSheetVisible,
    // Handlers
    handleToggleAlarmingCategories,
    handleCategoryLegendPress,
    openIncomeSheet,
    openExpenseSheet,
  };
}
