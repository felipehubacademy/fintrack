import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { 
  Bell, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Menu,
  Plus,
  HelpCircle,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Calendar,
} from 'lucide-react-native';
import { supabase } from '../services/supabase';
import { useOrganization } from '../hooks/useOrganization';
import { colors, spacing, radius, shadows, gradients } from '../theme';
import { Text, Title1, Title2, Headline, Callout, Caption } from '../components/ui/Text';
import { Card, CardContent } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { StatCard } from '../components/financial/StatCard';
import { MonthSelector } from '../components/financial/MonthSelector';
import { CategoryDonutChart } from '../components/financial/CategoryDonutChart';
import { MonthlyComparisonChart } from '../components/financial/MonthlyComparisonChart';
import { StatsDetailSheet } from '../components/financial/StatsDetailSheet';
import { DetailedStatsSheet } from '../components/financial/DetailedStatsSheet';
import { BankAccountsSheet } from '../components/financial/BankAccountsSheet';
import { Tooltip } from '../components/ui/Tooltip';
import { formatCurrency } from '@fintrack/shared/utils';

const { width } = Dimensions.get('window');
const STAT_CARD_WIDTH = (width - spacing[2] * 3) / 2.2;

const PAYMENT_METHOD_LABELS = {
  credit_card: 'Cartão de Crédito',
  debit_card: 'Cartão de Débito',
  pix: 'PIX',
  bank_transfer: 'Transferência',
  boleto: 'Boleto',
  cash: 'Dinheiro',
  other: 'Outros',
};

const formatShortDate = (dateString) => {
  if (!dateString) return '';
  try {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
    });
  } catch {
    return dateString;
  }
};

const getPaymentMethodLabel = (method) =>
  PAYMENT_METHOD_LABELS[method] || PAYMENT_METHOD_LABELS.other;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { organization, user, loading: orgLoading } = useOrganization();
  // Forçar mes atual correto
  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // getMonth() retorna 0-11
    const currentMonth = `${year}-${month}`;
    return currentMonth;
  };

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
  const [ownerData, setOwnerData] = useState([]); // Despesas por responsável
  const [incomeOwnerData, setIncomeOwnerData] = useState([]); // Receitas por responsável
  const [incomeCategoryData, setIncomeCategoryData] = useState([]);
  const [cardsBreakdown, setCardsBreakdown] = useState([]); // Gastos por cartão
  const [monthlyComparison, setMonthlyComparison] = useState([]); // Últimos 6 meses
  const [categoryExpensesMap, setCategoryExpensesMap] = useState({});
  const [cardLookup, setCardLookup] = useState({});
  const [costCenterLookup, setCostCenterLookup] = useState({});
  const [alarmingCategories, setAlarmingCategories] = useState([]); // Categorias com gasto > 80%
  const [allAlarmingCategories, setAllAlarmingCategories] = useState([]); // Todas as categorias alarmantes (sem limite)
  const [alarmingCategoriesExpanded, setAlarmingCategoriesExpanded] = useState(false); // Estado de expandir/colapsar
  
  // Bottom Sheet state
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetData, setSheetData] = useState({ title: '', data: [] });
  const [detailedSheetVisible, setDetailedSheetVisible] = useState(false);
  const [bankAccountsSheetVisible, setBankAccountsSheetVisible] = useState(false);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [scheduledPaymentsSheetVisible, setScheduledPaymentsSheetVisible] = useState(false);
  const [scheduledPaymentsData, setScheduledPaymentsData] = useState([]);
  const [balanceSheetVisible, setBalanceSheetVisible] = useState(false);
  const [detailedSheetData, setDetailedSheetData] = useState({
    title: '',
    type: 'expense',
    paymentBreakdown: null,
    responsibleData: [],
    totalAmount: 0,
  });

  useEffect(() => {
    if (organization) {
      loadDashboardData();
      loadMonthlyComparison();
    }
  }, [organization, selectedMonth]);

  // Sincronizar categorias exibidas com estado de expansão
  useEffect(() => {
    if (allAlarmingCategories.length > 0) {
      setAlarmingCategories(
        alarmingCategoriesExpanded 
          ? allAlarmingCategories 
          : allAlarmingCategories.slice(0, 3)
      );
    }
  }, [alarmingCategoriesExpanded, allAlarmingCategories]);

  const loadDashboardData = async () => {
    try {
      if (!organization) return;

      const startOfMonth = `${selectedMonth}-01`;
      const [year, month] = selectedMonth.split('-');
      const lastDay = new Date(year, month, 0).getDate();
      const endOfMonth = `${selectedMonth}-${String(lastDay).padStart(2, '0')}`;

      // Buscar DESPESAS (tabela expenses)
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

      if (expensesError) {
        // Erro ao buscar despesas - silenciosamente ignorado
      }

      // Buscar RECEITAS confirmadas
      const { data: incomesData, error: incomesError } = await supabase
        .from('incomes')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth)
        .order('date', { ascending: false });

      if (incomesError) {
        // Erro ao buscar receitas - silenciosamente ignorado
      }

      const totalExpenses = expensesData?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalIncome = incomesData?.reduce((sum, i) => sum + (Number(i.amount) || 0), 0) || 0;


      // Buscar cartões ATIVOS
      const { data: cards, error: cardsError } = await supabase
        .from('cards')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (cardsError) {
        // Erro ao buscar cartões - silenciosamente ignorado
      }

      const cardLookupMap = {};
      cards?.forEach(card => {
        if (card?.id) {
          cardLookupMap[card.id] = card;
        }
      });
      setCardLookup(cardLookupMap);

      // Buscar contas bancárias ATIVAS
      const { data: accounts, error: accountsError } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('is_active', true);

      if (accountsError) {
        // Erro ao buscar contas - silenciosamente ignorado
      }

      setBankAccounts(accounts || []);

      // Cartões: somar total USADO no mês (despesas de cartão)
      const cardExpensesThisMonth = expensesData
        ?.filter(e => e.payment_method === 'credit_card')
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const accountsBalance = accounts?.reduce((sum, a) => sum + (a.current_balance || a.balance || 0), 0) || 0;
      
      // Buscar contas programadas (bills) com vencimento no mês
      const { data: billsData, error: billsError } = await supabase
        .from('bills')
        .select(`
          *,
          category:budget_categories(name, color),
          cost_center:cost_centers(name, color),
          card:cards(name, bank)
        `)
        .eq('organization_id', organization.id)
        .in('status', ['pending', 'overdue'])
        .gte('due_date', startOfMonth)
        .lte('due_date', endOfMonth)
        .order('due_date', { ascending: true });

      if (billsError) {
        console.error('Erro ao buscar contas programadas:', billsError);
      }

      const totalScheduledPayments = billsData?.reduce((sum, bill) => sum + (bill.amount || 0), 0) || 0;
      
      // Preparar dados para o bottom sheet de contas programadas
      const scheduledPaymentsList = (billsData || []).map(bill => ({
        label: bill.description || 'Sem descrição',
        value: bill.amount || 0,
        subtitle: [
          bill.due_date ? new Date(bill.due_date).toLocaleDateString('pt-BR') : '',
          bill.status === 'overdue' ? 'Vencida' : '',
          bill.category?.name || '',
        ].filter(Boolean).join(' · '),
        color: bill.category?.color || colors.warning.main,
        status: bill.status,
      }));

      setScheduledPaymentsData(scheduledPaymentsList);

      setStats({
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        balance: totalIncome - totalExpenses - totalScheduledPayments,
        transactions: (expensesData?.length || 0) + (incomesData?.length || 0),
        cardsTotal: cardExpensesThisMonth, // Total usado em cartões este mês
        bankAccountsTotal: accountsBalance,
        scheduledPayments: totalScheduledPayments,
      });

      // Combinar e ordenar transações (últimas 5)
      const allTransactions = [
        ...(expensesData || []).map(e => ({ ...e, type: 'expense' })),
        ...(incomesData || []).map(i => ({ ...i, type: 'income' })),
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

      setRecentTransactions(allTransactions);

      // Buscar categorias do supabase com CORES (da org + globais)
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


      // Agrupar despesas por categoria
      const expensesByCategory = {};
      const categoryExpenseMap = {};
      let totalCategorized = 0;
      let uncategorizedCount = 0;
      
      expensesData?.forEach((e) => {
        const amount = e.amount || 0;
        const categoryName = categoryMap[e.budget_category_id] || e.budget_category_name || e.category;
        
        if (!categoryName) {
          uncategorizedCount++;
        }
        
        const finalCategoryName = categoryName || 'Outros'; // Usar "Outros" ao invés de "Sem Categoria"
        expensesByCategory[finalCategoryName] = (expensesByCategory[finalCategoryName] || 0) + amount;
        totalCategorized += amount;

        if (!categoryExpenseMap[finalCategoryName]) {
          categoryExpenseMap[finalCategoryName] = [];
        }

        categoryExpenseMap[finalCategoryName].push({
          id: e.id,
          description: e.description || 'Sem descrição',
          amount,
          date: e.date,
          payment_method: e.payment_method,
          card_id: e.card_id,
          cost_center_id: e.cost_center_id,
        });
      });
      


      // Converter para array e ordenar (SEM LIMIT - pegar TODAS)
      const categoryArray = Object.entries(expensesByCategory)
        .map(([label, value]) => ({ 
          label, 
          value,
          color: categoryColorMap[label] || '#6366F1' // Cor do DB
        }))
        .sort((a, b) => b.value - a.value);
        // REMOVIDO .slice(0, 6) - agora mostra TODAS as categorias

      setCategoryData(categoryArray);
      setCategoryExpensesMap(categoryExpenseMap);

      // Buscar budgets do mês e calcular categorias alarmantes (> 80% do orçamento)
      const monthYear = `${selectedMonth}-01`;
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:budget_categories(id, name, color, macro_group)
        `)
        .eq('organization_id', organization.id)
        .eq('month_year', monthYear);

      if (!budgetsError && budgetsData && budgetsData.length > 0) {
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
              spent,
              limit,
              percentage: Math.round(percentage),
              remaining: limit - spent,
            };
          })
          .filter(b => b.percentage >= 80 && b.limit > 0) // Apenas categorias com 80% ou mais
          .sort((a, b) => b.percentage - a.percentage); // Ordenar por maior porcentagem

        setAllAlarmingCategories(alarming);
        // Mostrar apenas 3 inicialmente se não estiver expandido
        setAlarmingCategories(alarmingCategoriesExpanded ? alarming : alarming.slice(0, 3));
      } else {
        setAlarmingCategories([]);
        setAllAlarmingCategories([]);
      }

      // Verificar se a soma bate
      const sumCategories = categoryArray.reduce((sum, cat) => sum + cat.value, 0);

      // Cores para formas de pagamento (não tem tabela, então hardcoded)
      const paymentMethodColors = {
        'Cartão de Crédito': '#EF4444', // red
        'Cartão de Débito': '#3B82F6', // blue
        'PIX': '#10B981', // green
        'Transferência': '#06B6D4', // cyan
        'Boleto': '#F59E0B', // orange
        'Dinheiro': '#8B5CF6', // purple
        'Outros': '#6B7280', // gray
      };

      // Agrupar despesas por forma de pagamento
      const expensesByPayment = {};
      expensesData?.forEach((e) => {
        const method = e.payment_method || 'Outros';
        const methodName = {
          credit_card: 'Cartão de Crédito',
          debit_card: 'Cartão de Débito',
          pix: 'PIX',
          bank_transfer: 'Transferência',
          boleto: 'Boleto',
          cash: 'Dinheiro',
          other: 'Outros'
        }[method] || method;
        expensesByPayment[methodName] = (expensesByPayment[methodName] || 0) + (e.amount || 0);
      });

      const paymentArray = Object.entries(expensesByPayment)
        .map(([label, value]) => ({ 
          label, 
          value,
          color: paymentMethodColors[label] || '#6366F1' // Cor padrão
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setPaymentMethodData(paymentArray);

      // Buscar cost_centers (responsáveis individuais) com cores e split percentages
      const { data: costCenters, error: costCentersError } = await supabase
        .from('cost_centers')
        .select('id, name, color, is_active, default_split_percentage')
        .eq('organization_id', organization.id)
        .eq('is_active', true);
        // NÃO filtrar por is_shared porque essa coluna não existe!

      const costCenterMap = {};
      const costCenterColorMap = {};
      costCenters?.forEach(cc => {
        costCenterMap[cc.id] = cc;
        costCenterColorMap[cc.name] = cc.color || '#6366F1';
      });
      const costCenterLookupMap = {};
      costCenters?.forEach(cc => {
        if (cc?.id) {
          costCenterLookupMap[cc.id] = cc;
        }
      });
      setCostCenterLookup(costCenterLookupMap);

      // Buscar expense_splits para despesas compartilhadas
      const expenseIds = expensesData?.map(e => e.id) || [];
      const { data: expenseSplits, error: splitsError } = await supabase
        .from('expense_splits')
        .select('*')
        .in('expense_id', expenseIds);


      // Mapear splits por expense_id
      const splitsByExpense = {};
      expenseSplits?.forEach(split => {
        if (!splitsByExpense[split.expense_id]) {
          splitsByExpense[split.expense_id] = [];
        }
        splitsByExpense[split.expense_id].push(split);
      });

      // Adicionar splits aos expenses
      expensesData?.forEach(e => {
        e.expense_splits = splitsByExpense[e.id] || [];
      });

      // Agrupar despesas por responsável individual COM breakdown individual/compartilhado
      const expensesByOwner = {};
      
      // Para cada cost_center individual (IGUAL AO WEB)
      costCenters?.forEach(cc => {
        // Despesas individuais (não compartilhadas)
        const individualExpenses = expensesData
          ?.filter(e => !e.is_shared && e.cost_center_id === cc.id)
          .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        
        // Parte nas despesas compartilhadas
        let sharedExpenses = 0;
        const sharedExpensesInMonth = expensesData?.filter(e => 
          e.is_shared || e.expense_splits?.length > 0
        ) || [];
        
        sharedExpensesInMonth.forEach(e => {
          if (e.expense_splits && e.expense_splits.length > 0) {
            // Usar splits personalizados
            const split = e.expense_splits.find(s => s.cost_center_id === cc.id);
            if (split) {
              const expenseAmount = parseFloat(e.amount || 0);
              const splitAmount = parseFloat(split.amount || 0);
              const totalSplitsAmount = e.expense_splits.reduce((sum, s) => sum + parseFloat(s.amount || 0), 0);
              
              // Se os splits somam mais que o valor da despesa, calcular proporcionalmente
              if (totalSplitsAmount > expenseAmount && expenseAmount > 0) {
                const splitPercentage = splitAmount / totalSplitsAmount;
                sharedExpenses += expenseAmount * splitPercentage;
              } else {
                sharedExpenses += splitAmount;
              }
            }
          } else if (e.is_shared) {
            // Fallback: usar default_split_percentage do cost_center
            const percentage = parseFloat(cc.default_split_percentage || 0);
            const amount = parseFloat(e.amount || 0);
            sharedExpenses += (amount * percentage) / 100;
          }
        });
        
        const totalExpenses = individualExpenses + sharedExpenses;
        
        if (totalExpenses > 0) {
          expensesByOwner[cc.name] = {
            total: totalExpenses,
            individual: individualExpenses,
            shared: sharedExpenses,
          };
        }
      });
      

      const ownerArray = Object.entries(expensesByOwner)
        .map(([label, data]) => ({ 
          label, 
          value: data.total,
          individual: data.individual,
          shared: data.shared,
          color: costCenterColorMap[label] || '#6366F1'
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);


      setOwnerData(ownerArray);

      // Agrupar RECEITAS por responsável (owner)
      const incomesByOwner = {};
      let noIncomeOwnerCount = 0;
      
      incomesData?.forEach((i) => {
        const owner = i.owner_name || i.owner;
        
        if (!owner) {
          noIncomeOwnerCount++;
        }
        
        const finalOwner = owner || 'Sem Responsável';
        incomesByOwner[finalOwner] = (incomesByOwner[finalOwner] || 0) + (i.amount || 0);
      });

      const incomeOwnerArray = Object.entries(incomesByOwner)
        .map(([label, value]) => ({ 
          label, 
          value,
          color: costCenterColorMap[label] || '#10B981' // Cor do DB ou verde para receitas
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setIncomeOwnerData(incomeOwnerArray);

      // Buscar categorias de RECEITAS com cores (globais - não tem organization_id)
      const { data: incomeCategories } = await supabase
        .from('income_categories')
        .select('id, name, color');

      const incomeCategoryMap = {};
      const incomeCategoryColorMap = {};
      incomeCategories?.forEach(ic => {
        incomeCategoryMap[ic.id] = ic.name;
        incomeCategoryColorMap[ic.name] = ic.color || '#10B981';
      });

      // Agrupar receitas por categoria
      const incomesByCategory = {};
      let uncategorizedIncomesCount = 0;
      
      incomesData?.forEach((i) => {
        const categoryName = incomeCategoryMap[i.income_category_id] || i.income_category_name || i.category;
        
        if (!categoryName) {
          uncategorizedIncomesCount++;
        }
        
        const finalCategoryName = categoryName || 'Outros';
        incomesByCategory[finalCategoryName] = (incomesByCategory[finalCategoryName] || 0) + (i.amount || 0);
      });
      

      const incomeCategoryArray = Object.entries(incomesByCategory)
        .map(([label, value]) => ({ 
          label, 
          value,
          color: incomeCategoryColorMap[label] || '#10B981' // Cor do DB
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setIncomeCategoryData(incomeCategoryArray);
    } catch (error) {
      // Erro ao carregar dashboard - silenciosamente ignorado
    }
  };

  const loadMonthlyComparison = async () => {
    try {
      if (!organization) return;

      const comparisonData = [];
      const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);

      // Buscar últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        let month = currentMonth - i;
        let year = currentYear;

        // Ajustar ano se mês ficar negativo
        while (month <= 0) {
          month += 12;
          year -= 1;
        }

        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const startDate = `${monthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

        // Buscar despesas do mês
        const { data: expensesData } = await supabase
          .from('expenses')
          .select('amount, payment_method')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate);

        // Buscar receitas do mês
        const { data: incomesData } = await supabase
          .from('incomes')
          .select('amount')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate);

        // Separar despesas em crédito e à vista (como no web)
        const creditExpenses = (expensesData || [])
          .filter(e => e.payment_method === 'credit_card')
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const cashExpenses = (expensesData || [])
          .filter(e => e.payment_method !== 'credit_card')
          .reduce((sum, e) => sum + (e.amount || 0), 0);

        const totalIncome = (incomesData || []).reduce((sum, i) => sum + (i.amount || 0), 0);

        // Nome do mês abreviado
        const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const monthName = monthNames[month - 1];

        comparisonData.push({
          month: monthName,
          credit: creditExpenses / 1000, // Crédito em k
          cash: cashExpenses / 1000,     // À Vista em k
          income: totalIncome / 1000,    // Entradas em k
        });
      }

      setMonthlyComparison(comparisonData);
    } catch (error) {
      // Erro ao carregar comparação mensal - silenciosamente ignorado
    }
  };

  const handleToggleAlarmingCategories = () => {
    const newExpanded = !alarmingCategoriesExpanded;
    setAlarmingCategoriesExpanded(newExpanded);
    // Atualizar categorias exibidas baseado no novo estado
    setAlarmingCategories(newExpanded ? allAlarmingCategories : allAlarmingCategories.slice(0, 3));
  };

  const handleCategoryLegendPress = (categoryName) => {
    if (!categoryName) return;

    const expenses =
      (categoryExpensesMap[categoryName] || []).sort(
        (a, b) => new Date(b.date) - new Date(a.date)
      );

    const categoryEntry = categoryData.find(
      (category) => category.label === categoryName
    );

    const formattedData = expenses.map((expense) => {
      const subtitleParts = [];
      if (expense.date) {
        subtitleParts.push(formatShortDate(expense.date));
      }
      subtitleParts.push(getPaymentMethodLabel(expense.payment_method));

      if (expense.card_id && cardLookup[expense.card_id]?.name) {
        subtitleParts.push(cardLookup[expense.card_id].name);
      }

      if (
        expense.cost_center_id &&
        costCenterLookup[expense.cost_center_id]?.name
      ) {
        subtitleParts.push(costCenterLookup[expense.cost_center_id].name);
      }

      return {
        label: expense.description || 'Sem descrição',
        subtitle: subtitleParts.join(' • '),
        value: expense.amount || 0,
        color: categoryEntry?.color,
      };
    });

    setSheetData({
      title: `Despesas • ${categoryName}`,
      data: formattedData,
    });
    setSheetVisible(true);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    await loadMonthlyComparison();
    setRefreshing(false);
  };

  if (orgLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="body" color="secondary">
          Carregando...
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Header Consistente */}
      <ScreenHeader
        user={user}
        title="Painel Inicial"
        showNotifications={true}
        showLogo={true}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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

        {/* Cards de estatísticas principais */}
        <View style={styles.section}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
          >
            <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
              <StatCard
                label="Total de Entradas"
                value={formatCurrency(stats.totalIncome)}
                icon={<ArrowDownLeft size={20} color={colors.brand.primary} />}
                variant="income"
                style={{ width: STAT_CARD_WIDTH }}
                onPress={() => {
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
                }}
              />
              {/* Ícone ? APENAS VISUAL - indica que o StatCard é clicável */}
              <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                <HelpCircle size={14} color={colors.text.tertiary} />
              </View>
            </View>

            <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
              <StatCard
                label="Total de Despesas"
                value={formatCurrency(stats.totalExpenses)}
                icon={<ArrowUpRight size={20} color={colors.error.main} />}
                variant="expense"
                style={{ width: STAT_CARD_WIDTH }}
                onPress={() => {
                  // Calcular à vista vs crédito
                  const cashAmount = stats.totalExpenses - stats.cardsTotal;
                  const creditAmount = stats.cardsTotal;


                  setDetailedSheetData({
                    title: 'Total de Despesas',
                    type: 'expense',
                    paymentBreakdown: {
                      cash: cashAmount,
                      credit: creditAmount,
                    },
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
                }}
              />
              {/* Ícone ? APENAS VISUAL - indica que o StatCard é clicável */}
              <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                <HelpCircle size={14} color={colors.text.tertiary} />
              </View>
            </View>

            <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
              <StatCard
                label="Pagamentos Programados"
                value={formatCurrency(stats.scheduledPayments)}
                icon={<Calendar size={20} color={colors.warning.main} />}
                variant="warning"
                style={{ width: STAT_CARD_WIDTH }}
                onPress={() => {
                  setScheduledPaymentsSheetVisible(true);
                }}
              />
              {/* Ícone ? APENAS VISUAL - indica que o StatCard é clicável */}
              <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                <HelpCircle size={14} color={colors.text.tertiary} />
              </View>
            </View>

            <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
              <StatCard
                label="Saldo Parcial do Mês"
                value={formatCurrency(stats.balance)}
                icon={<Wallet size={20} color={stats.balance < 0 ? colors.error.main : colors.brand.primary} />}
                style={{ width: STAT_CARD_WIDTH }}
                valueColor={stats.balance < 0 ? colors.error.main : colors.brand.primary}
                onPress={() => {
                  setBalanceSheetVisible(true);
                }}
              />
              {/* Ícone ? APENAS VISUAL - indica que o StatCard é clicável */}
              <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
                <HelpCircle size={14} color={colors.text.tertiary} />
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Resumo rápido */}
        <View style={styles.section}>
          <Card>
            <CardContent>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Caption color="secondary">Transações</Caption>
                  <Headline weight="semiBold">{stats.transactions}</Headline>
                </View>
                <View style={styles.divider} />
                <TouchableOpacity 
                  style={styles.summaryItem}
                  activeOpacity={0.7}
                  onPress={() => setBankAccountsSheetVisible(true)}
                >
                  <Caption color="secondary">Contas Bancárias</Caption>
                  <Headline 
                    weight="semiBold"
                    style={{ color: stats.bankAccountsTotal < 0 ? colors.error.main : colors.text.primary }}
                  >
                    {formatCurrency(stats.bankAccountsTotal)}
                  </Headline>
                </TouchableOpacity>
              </View>
            </CardContent>
          </Card>
        </View>

        {/* Gráficos em scroll horizontal */}
        {(categoryData.length > 0 || paymentMethodData.length > 0 || ownerData.length > 0 || incomeCategoryData.length > 0) && (
          <View style={styles.section}>
            <Headline weight="semiBold" style={{ marginBottom: spacing[2] }}>
              Análises
            </Headline>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartsScroll}
              snapToInterval={width - spacing[2] * 2 + spacing[2]} // Largura do card + gap
              decelerationRate="fast"
              pagingEnabled={false}
            >
              {categoryData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart 
                      data={categoryData} 
                      title="Despesas por Categoria"
                      onCategoryPress={handleCategoryLegendPress}
                    />
                  </CardContent>
                </Card>
              )}

              {paymentMethodData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart 
                      data={paymentMethodData} 
                      title="Despesas por Pagamento"
                    />
                  </CardContent>
                </Card>
              )}

              {ownerData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart 
                      data={ownerData} 
                      title="Despesas por Responsável"
                    />
                  </CardContent>
                </Card>
              )}

              {incomeCategoryData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart 
                      data={incomeCategoryData} 
                      title="Receitas por Categoria"
                    />
                  </CardContent>
                </Card>
              )}
            </ScrollView>
          </View>
        )}

        {/* Categorias Alarmantes */}
        {alarmingCategories.length > 0 && (
          <View style={styles.section}>
            <Headline weight="semiBold" style={{ marginBottom: spacing[2] }}>
              Atenção no Orçamento
            </Headline>
            <Card>
              <CardContent>
                {alarmingCategories.map((category, index) => {
                  const isExceeded = category.percentage >= 100;
                  const statusColor = isExceeded ? colors.error.main : colors.warning.main;
                  const bgColor = isExceeded ? colors.error.bg : colors.warning.bg;
                  
                  return (
                    <TouchableOpacity
                      key={category.id || index}
                      onPress={() => {
                        // Navegar para a tab "Mais" e depois para "Budgets"
                        navigation.navigate('Mais', { screen: 'Budgets' });
                      }}
                      style={[
                        styles.alarmingCategoryItem,
                        index < alarmingCategories.length - 1 && styles.alarmingCategoryBorder
                      ]}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing[1] }}>
                          <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                          <Callout weight="semiBold" numberOfLines={1} style={{ flex: 1 }}>
                            {category.category_name}
                          </Callout>
                          <View style={[styles.percentageBadge, { backgroundColor: bgColor }]}>
                            <Caption weight="semiBold" style={{ color: statusColor }}>
                              {category.percentage}%
                            </Caption>
                          </View>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                          <View>
                            <Caption color="secondary">Gasto</Caption>
                            <Callout weight="semiBold" style={{ color: statusColor }}>
                              {formatCurrency(category.spent)}
                            </Callout>
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Caption color="secondary">Orçamento</Caption>
                            <Callout weight="semiBold">
                              {formatCurrency(category.limit)}
                            </Callout>
                          </View>
                        </View>
                        {category.remaining < 0 && (
                          <Caption color="error" style={{ marginTop: spacing[0.5] }}>
                            Excedido em {formatCurrency(Math.abs(category.remaining))}
                          </Caption>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Botão Ver todas/Ver menos */}
                {allAlarmingCategories.length > 3 && (
                  <TouchableOpacity 
                    style={styles.alarmingExpandButton}
                    onPress={handleToggleAlarmingCategories}
                    activeOpacity={0.7}
                  >
                    <Caption weight="semiBold" style={{ color: colors.brand.primary }}>
                      {alarmingCategoriesExpanded ? 'Ver menos' : `Ver todas (${allAlarmingCategories.length})`}
                    </Caption>
                    {alarmingCategoriesExpanded ? (
                      <ChevronUp size={16} color={colors.brand.primary} strokeWidth={2.5} />
                    ) : (
                      <ChevronDown size={16} color={colors.brand.primary} strokeWidth={2.5} />
                    )}
                  </TouchableOpacity>
                )}
              </CardContent>
            </Card>
          </View>
        )}

        {/* Monthly Comparison - SEPARADO ABAIXO DOS DONUTS */}
        {monthlyComparison.length > 0 && (
          <View style={[styles.section, { marginTop: spacing[3], marginBottom: spacing[2] }]}>
            <View style={styles.sectionHeader}>
              <Headline weight="semiBold">Comparação Mensal</Headline>
              <Tooltip
                title="Comparação Mensal"
                content="Compare suas entradas (azul) e saídas totais (cinza) dos últimos 6 meses. Saídas incluem crédito e à vista. Toque em um mês para ver o detalhamento."
              />
            </View>
            <Card style={[styles.chartCard, { paddingBottom: 0, paddingTop: spacing[2], paddingHorizontal: spacing[2] }]} padding="none">
              <CardContent style={{ paddingBottom: 0 }}>
                <MonthlyComparisonChart data={monthlyComparison} />
              </CardContent>
            </Card>
          </View>
        )}

        {/* Transações recentes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Headline weight="semiBold">Atividade Recente</Headline>
            <TouchableOpacity onPress={() => navigation.navigate('Transações')}>
              <Callout style={{ color: colors.brand.primary }}>
                Ver todas
              </Callout>
            </TouchableOpacity>
          </View>

          {recentTransactions.length > 0 ? (
            <Card padding="none">
              {recentTransactions.map((transaction, index) => (
                <TouchableOpacity
                  key={transaction.id}
                  style={[
                    styles.transactionItem,
                    index < recentTransactions.length - 1 && styles.transactionItemBorder,
                  ]}
                  activeOpacity={0.7}
                >
                  {/* Ícone minimalista com seta */}
                  <View
                    style={[
                      styles.transactionIcon,
                      transaction.type === 'income'
                        ? styles.transactionIconIncome
                        : styles.transactionIconExpense,
                    ]}
                  >
                    {transaction.type === 'income' ? (
                      <ArrowDownLeft size={18} color={colors.brand.primary} />
                    ) : (
                      <ArrowUpRight size={18} color={colors.error.main} />
                    )}
                  </View>
                  <View style={styles.transactionContent}>
                    <Text variant="callout" weight="medium">
                      {transaction.description || 'Sem descrição'}
                    </Text>
                    <Caption color="secondary">
                      {new Date(transaction.date).toLocaleDateString('pt-BR')}
                    </Caption>
                  </View>
                  <Text
                    variant="callout"
                    weight="semiBold"
                    style={{
                      color:
                        transaction.type === 'income'
                          ? colors.brand.primary
                          : colors.financial.expense,
                    }}
                  >
                    {transaction.type === 'income' ? '+' : '-'}
                    {formatCurrency(Math.abs(transaction.amount || 0))}
                  </Text>
                </TouchableOpacity>
              ))}
            </Card>
          ) : (
            <Card>
              <CardContent>
                <View style={styles.emptyState}>
                  <Text variant="body" color="secondary" align="center">
                    Nenhuma transação este mês.
                    {'\n'}
                    Comece adicionando suas receitas e despesas.
                  </Text>
                </View>
              </CardContent>
            </Card>
          )}
        </View>

        {/* Espaçamento final */}
        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Bottom Sheet para detalhes */}
      <StatsDetailSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={sheetData.title}
        data={sheetData.data}
      />

      <StatsDetailSheet
        visible={scheduledPaymentsSheetVisible}
        onClose={() => setScheduledPaymentsSheetVisible(false)}
        title="Pagamentos Programados"
        data={scheduledPaymentsData}
      />

      <StatsDetailSheet
        visible={balanceSheetVisible}
        onClose={() => setBalanceSheetVisible(false)}
        title="Saldo Parcial do Mês"
        data={[
          {
            label: 'Total de Entradas',
            value: stats.totalIncome,
            color: colors.brand.primary,
            subtitle: 'Receitas confirmadas do mês',
          },
          {
            label: 'Total de Despesas',
            value: stats.totalExpenses,
            color: colors.error.main,
            subtitle: 'Despesas confirmadas do mês',
          },
          {
            label: 'Pagamentos Programados',
            value: stats.scheduledPayments,
            color: colors.warning.main,
            subtitle: 'Contas a pagar do mês',
          },
          {
            label: 'Saldo Parcial do Mês',
            value: stats.balance,
            color: stats.balance < 0 ? colors.error.main : colors.brand.primary,
            subtitle: 'Entradas - Despesas - Pagamentos Programados',
          },
        ]}
      />

      <DetailedStatsSheet
        visible={detailedSheetVisible}
        onClose={() => setDetailedSheetVisible(false)}
        title={detailedSheetData.title}
        type={detailedSheetData.type}
        paymentBreakdown={detailedSheetData.paymentBreakdown}
        responsibleData={detailedSheetData.responsibleData}
        totalAmount={detailedSheetData.totalAmount}
      />

      {/* Bank Accounts Sheet */}
      <BankAccountsSheet
        visible={bankAccountsSheetVisible}
        onClose={() => setBankAccountsSheetVisible(false)}
        accounts={bankAccounts}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    position: 'relative',
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
  },

  section: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },

  // Stats
  statsScroll: {
    gap: spacing[1.5],
  },

  // Summary
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },

  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },

  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },

  // Transactions
  transactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
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
    marginRight: spacing[1.5],
  },

  transactionIconIncome: {
    backgroundColor: colors.info.bg,
  },

  transactionIconExpense: {
    backgroundColor: colors.error.bg,
  },

  transactionContent: {
    flex: 1,
  },

  emptyState: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },

  // Charts scroll
  chartsScroll: {
    gap: spacing[2],
    paddingRight: spacing[2],
  },

  chartCard: {
    width: width - spacing[2] * 2, // Largura da tela menos padding
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },

  // Alarming Categories
  alarmingCategoryItem: {
    paddingVertical: spacing[2],
  },
  alarmingCategoryBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: spacing[1],
    paddingBottom: spacing[2],
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    marginRight: spacing[1.5],
  },
  percentageBadge: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radius.sm,
    marginLeft: spacing[1],
  },
  alarmingExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    marginTop: spacing[1],
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
