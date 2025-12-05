import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Calendar, TrendingUp, TrendingDown, DollarSign, CreditCard, Plus, ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { MonthSelector } from '../components/financial/MonthSelector';
import { StatCard } from '../components/financial/StatCard';
import { Tooltip } from '../components/ui/Tooltip';
import { StatsDetailSheet } from '../components/financial/StatsDetailSheet';
import MemberDetailsModal from '../components/financial/MemberDetailsModal';
import PaymentAllocationModal from '../components/financial/PaymentAllocationModal';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import { formatBrazilMonthShort } from '../utils/date';

const { width } = Dimensions.get('window');
const STAT_CARD_WIDTH = (width - spacing[2] * 3) / 2.2;
const MEMBER_CARD_WIDTH = width * 0.85; // 85% da largura da tela para cada card

export default function ClosingScreen() {
  const { organization, user, costCenters, loading: orgLoading, isSoloUser } = useOrganization();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonthStr}`);
  const [historicalExpanded, setHistoricalExpanded] = useState(false);
  const [showAllocationModal, setShowAllocationModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTransactions, setMemberTransactions] = useState(null);

  const [data, setData] = useState({
    allocations: [],
    expenses: [],
    totalAllocations: 0,
    totalExpense: 0,
    cashExpenseTotal: 0,
    creditInvoiceTotal: 0,
    balance: 0,
    creditInvoices: [],
    individualSummaries: [],
    familySharedTotals: {
      allocations: 0,
      cash: 0,
      credit: 0
    },
    historicalSeries: [],
    memberTransactions: new Map(),
    monthMetadata: {
      start: null,
      end: null,
      key: null
    }
  });

  // Modal de detalhes
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetData, setSheetData] = useState({ title: '', data: [] });

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchMonthlyData();
    }
  }, [orgLoading, organization, selectedMonth, selectedYear]);

  const handleMonthChange = (value) => {
    if (!value) return;
    setSelectedMonth(value);
    const [yearPart] = value.split('-');
    const parsedYear = parseInt(yearPart, 10);
    if (!Number.isNaN(parsedYear) && parsedYear !== selectedYear) {
      setSelectedYear(parsedYear);
    }
  };

  const handleYearChange = (yearValue) => {
    const parsedYear = parseInt(yearValue, 10);
    if (Number.isNaN(parsedYear)) return;
    setSelectedYear(parsedYear);
    const [, monthPart = currentMonthStr] = selectedMonth.split('-');
    setSelectedMonth(`${parsedYear}-${monthPart}`);
  };

  const formatDate = (date) => date.toISOString().split('T')[0];

  const clampDayToMonth = (targetYear, targetMonthIndex, desiredDay) => {
    const endOfMonth = new Date(targetYear, targetMonthIndex + 1, 0);
    const safeDay = Math.min(desiredDay, endOfMonth.getDate());
    return new Date(targetYear, targetMonthIndex, safeDay);
  };

  const computeCardInvoicesForMonth = (targetYear, targetMonthIndex, expensesByCard, activeCreditCards) => {
    const invoices = [];

    activeCreditCards.forEach((card) => {
      const billingDay = card.billing_day || card.closing_day;
      if (!billingDay) return;

      const dueDate = clampDayToMonth(targetYear, targetMonthIndex, billingDay);

      if (dueDate.getMonth() !== targetMonthIndex || dueDate.getFullYear() !== targetYear) {
        return;
      }

      const closingDay = card.closing_day;
      let cycleEnd;

      if (closingDay) {
        let cycleYear = targetYear;
        let cycleMonthIndex = targetMonthIndex;

        if (card.billing_day && closingDay > card.billing_day) {
          cycleMonthIndex -= 1;
          if (cycleMonthIndex < 0) {
            cycleMonthIndex = 11;
            cycleYear -= 1;
          }
        }
        cycleEnd = clampDayToMonth(cycleYear, cycleMonthIndex, closingDay);
      } else {
        cycleEnd = new Date(dueDate);
        cycleEnd.setDate(cycleEnd.getDate() - 1);
      }

      const cycleStart = new Date(cycleEnd);
      cycleStart.setMonth(cycleStart.getMonth() - 1);

      const cycleStartStr = formatDate(cycleStart);
      const cycleEndStr = formatDate(cycleEnd);
      const dueDateStr = formatDate(dueDate);

      const relatedExpenses = (expensesByCard[card.id] || []).filter(
        (expense) => expense.date >= cycleStartStr && expense.date <= cycleEndStr
      );

      if (!relatedExpenses.length) {
        return;
      }

      const total = relatedExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
      );

      invoices.push({
        cardId: card.id,
        cardName: card.name,
        dueDate: dueDateStr,
        total,
        cycleStart: cycleStartStr,
        cycleEnd: cycleEndStr,
        expenses: relatedExpenses.map((expense) => ({
          ...expense,
          applied_month: `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`,
          invoice_due_date: dueDateStr
        }))
      });
    });

    invoices.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
    return invoices;
  };

  const fetchMonthlyData = async () => {
    try {
      setLoading(true);

      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;

      const monthStart = new Date(year, monthIndex, 1);
      const monthEnd = new Date(year, monthIndex + 1, 0);
      const monthStartStr = formatDate(monthStart);
      const monthEndStr = formatDate(monthEnd);

      const yearStart = new Date(selectedYear, 0, 1);
      const fetchStartStr = formatDate(yearStart);
      const fetchEnd = new Date(selectedYear, 11, 31);
      const fetchEndStr = formatDate(fetchEnd);

      const [
        { data: allocationsData, error: allocationsError },
        { data: expensesData, error: expensesError },
        { data: cardsData, error: cardsError }
      ] = await Promise.all([
        supabase
          .from('payment_allocations')
          .select(`
            *,
            cost_center:cost_centers(id, name, color, default_split_percentage),
            bank_account:bank_accounts(name),
            payment_allocation_splits(
              id,
              cost_center_id,
              cost_center:cost_centers(id, name, color, default_split_percentage),
              percentage,
              amount
            )
          `)
          .eq('organization_id', organization.id)
          .gte('date', fetchStartStr)
          .lte('date', fetchEndStr),
        supabase
          .from('expenses')
          .select(`
            *,
            cost_center:cost_centers(id, name, color, default_split_percentage),
            expense_splits(
              id,
              cost_center_id,
              cost_center:cost_centers(id, name, color, default_split_percentage),
              percentage,
              amount
            )
          `)
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', fetchStartStr)
          .lte('date', fetchEndStr),
        supabase
          .from('cards')
          .select('id, name, closing_day, billing_day, is_active, type')
          .eq('organization_id', organization.id)
          .eq('is_active', true)
      ]);

      if (allocationsError) throw allocationsError;
      if (expensesError) throw expensesError;
      if (cardsError) throw cardsError;

      const confirmedAllocations = allocationsData || [];
      const confirmedExpenses = expensesData || [];
      const activeCreditCards = (cardsData || []).filter(
        (card) => card && card.is_active !== false && card.type === 'credit'
      );

      const monthAllocations = confirmedAllocations.filter(
        (allocation) => allocation.date >= monthStartStr && allocation.date <= monthEndStr
      );
      const totalAllocations = monthAllocations.reduce((sum, alloc) => sum + Number(alloc.amount || 0), 0);

      const monthCashExpenses = confirmedExpenses.filter(
        (expense) =>
          expense.payment_method !== 'credit_card' &&
          expense.date >= monthStartStr &&
          expense.date <= monthEndStr
      );

      const expensesByCard = confirmedExpenses.reduce((acc, expense) => {
        if (expense.payment_method === 'credit_card' && expense.card_id) {
          if (!acc[expense.card_id]) {
            acc[expense.card_id] = [];
          }
          acc[expense.card_id].push(expense);
        }
        return acc;
      }, {});

      const creditInvoices = computeCardInvoicesForMonth(year, monthIndex, expensesByCard, activeCreditCards);
      const monthCreditCharges = creditInvoices.flatMap((invoice) => invoice.expenses || []);

      const cashExpenseTotal = Math.round(monthCashExpenses.reduce(
        (sum, expense) => sum + Number(expense.amount || 0),
        0
      ) * 100) / 100;
      const creditInvoiceTotal = Math.round(creditInvoices.reduce(
        (sum, invoice) => sum + Number(invoice.total || 0),
        0
      ) * 100) / 100;

      const totalExpense = cashExpenseTotal + creditInvoiceTotal;
      const balance = totalAllocations - totalExpense;

      const activeIndividualCenters = (costCenters || []).filter(
        (cc) => cc && cc.is_active !== false && !cc.is_shared
      );

      const summaryMap = new Map(
        activeIndividualCenters.map((cc) => [
          cc.id,
          {
            id: cc.id,
            name: cc.name,
            color: cc.color || colors.brand.primary,
            allocations: { individual: 0, shared: 0 },
            cash: { individual: 0, shared: 0 },
            credit: { individual: 0, shared: 0 }
          }
        ])
      );

      const familySharedTotals = {
        allocations: 0,
        cash: 0,
        credit: 0
      };

      const deriveSplitShareAmount = (expense, split) => {
        if (!split) return 0;
        const expenseAmount = Number(expense.amount || 0);
        let shareAmount = Number(split.amount || 0);
        const percentage = Number(split.percentage || 0);
        const totalInstallments = Number(expense.installment_info?.total_installments || 1);

        if (
          totalInstallments > 1 &&
          shareAmount > expenseAmount + 0.01
        ) {
          shareAmount = shareAmount / totalInstallments;
        }

        if ((!shareAmount || shareAmount === 0) && percentage > 0 && expenseAmount > 0) {
          shareAmount = (expenseAmount * percentage) / 100;
        }

        if (shareAmount > expenseAmount + 0.01 && percentage > 0 && expenseAmount > 0) {
          shareAmount = (expenseAmount * percentage) / 100;
        }

        return Math.round(shareAmount * 100) / 100;
      };

      const addToSummary = (ccId, field, amount, allocationType) => {
        if (!amount) return;
        const roundedAmount = Math.round(amount * 100) / 100;
        if (!summaryMap.has(ccId)) {
          familySharedTotals[field] = Math.round((familySharedTotals[field] + roundedAmount) * 100) / 100;
          return;
        }
        const summary = summaryMap.get(ccId);
        summary[field][allocationType] = Math.round((summary[field][allocationType] + roundedAmount) * 100) / 100;
      };

      const distributeSharedAmount = (amount, field) => {
        let distributed = 0;
        activeIndividualCenters.forEach((cc) => {
          const percentage = parseFloat(cc.default_split_percentage || 0);
          if (percentage > 0) {
            const share = Math.round((amount * percentage / 100) * 100) / 100;
            distributed = Math.round((distributed + share) * 100) / 100;
            addToSummary(cc.id, field, share, 'shared');
          }
        });
        const remainder = Math.round((amount - distributed) * 100) / 100;
        if (remainder > 0) {
          familySharedTotals[field] = Math.round((familySharedTotals[field] + remainder) * 100) / 100;
        }
      };

      monthAllocations.forEach((allocation) => {
        const amount = Number(allocation.amount || 0);
        
        if (allocation.ownership_type === 'organization') {
          if (allocation.payment_allocation_splits && allocation.payment_allocation_splits.length > 0) {
            allocation.payment_allocation_splits.forEach((split) => {
              addToSummary(split.cost_center_id, 'allocations', Number(split.amount || 0), 'shared');
            });
          } else {
            distributeSharedAmount(amount, 'allocations');
          }
        } else if (allocation.ownership_type === 'member' && allocation.cost_center_id) {
          const allocType = allocation.allocation_target === 'individual' ? 'individual' : 'shared';
          addToSummary(allocation.cost_center_id, 'allocations', amount, allocType);
        } else {
          familySharedTotals.allocations = Math.round((familySharedTotals.allocations + amount) * 100) / 100;
        }
      });

      const processExpenseAllocation = (expense, field) => {
        const amount = Number(expense.amount || 0);
        const splits = expense.expense_splits || [];
        if (splits.length > 0) {
          splits.forEach((split) => {
            const shareAmount = deriveSplitShareAmount(expense, split);
            if (shareAmount) {
              addToSummary(split.cost_center_id, field, shareAmount, 'shared');
            }
          });
        } else if (expense.cost_center_id) {
          addToSummary(expense.cost_center_id, field, amount, 'individual');
        } else {
          familySharedTotals[field] = Math.round((familySharedTotals[field] + amount) * 100) / 100;
        }
      };

      // Debug: contar despesas com e sem cost_center_id/splits
      let expensesWithSplits = 0;
      let expensesWithCostCenter = 0;
      let expensesWithoutBoth = 0;
      [...monthCashExpenses, ...monthCreditCharges].forEach(exp => {
        if (exp.expense_splits && exp.expense_splits.length > 0) {
          expensesWithSplits++;
        } else if (exp.cost_center_id) {
          expensesWithCostCenter++;
        } else {
          expensesWithoutBoth++;
        }
      });

      const memberTransactionsMap = new Map();
      activeIndividualCenters.forEach((cc) => {
        memberTransactionsMap.set(cc.id, {
          allocations: [],
          cashExpenses: [],
          creditExpenses: []
        });
      });

      monthAllocations.forEach((allocation) => {
        const amount = Number(allocation.amount || 0);
        const bank_account_name = allocation.bank_account?.name || 'Conta não informada';
        
        if (allocation.ownership_type === 'member' && allocation.cost_center_id && memberTransactionsMap.has(allocation.cost_center_id)) {
          memberTransactionsMap.get(allocation.cost_center_id).allocations.push({
            ...allocation,
            bank_account_name,
            isIndividual: allocation.allocation_target === 'individual',
            isShared: allocation.allocation_target === 'shared'
          });
        } else if (allocation.ownership_type === 'organization' && allocation.payment_allocation_splits && allocation.payment_allocation_splits.length > 0) {
          allocation.payment_allocation_splits.forEach((split) => {
            if (memberTransactionsMap.has(split.cost_center_id)) {
              memberTransactionsMap.get(split.cost_center_id).allocations.push({
                ...allocation,
                bank_account_name,
                amount: split.amount,
                memberShare: split.amount,
                totalAmount: allocation.amount,
                isIndividual: false,
                isShared: true
              });
            }
          });
        }
      });

      monthCashExpenses.forEach((expense) => {
        const amount = Number(expense.amount || 0);
        if (expense.cost_center_id && memberTransactionsMap.has(expense.cost_center_id)) {
          memberTransactionsMap.get(expense.cost_center_id).cashExpenses.push({
            ...expense,
            payment_method: 'cash',
            isIndividual: true,
            isShared: false
          });
        } else if (expense.expense_splits && expense.expense_splits.length > 0) {
          expense.expense_splits.forEach((split) => {
            if (memberTransactionsMap.has(split.cost_center_id)) {
              const shareAmount = deriveSplitShareAmount(expense, split);
              memberTransactionsMap.get(split.cost_center_id).cashExpenses.push({
                ...expense,
                payment_method: 'cash',
                amount: shareAmount,
                memberShare: shareAmount,
                totalAmount: expense.amount,
                isIndividual: false,
                isShared: true
              });
            }
          });
        }
      });

      monthCreditCharges.forEach((expense) => {
        const amount = Number(expense.amount || 0);
        const card = activeCreditCards.find(c => c.id === expense.card_id);
        const cardName = card ? card.name : 'Cartão';
        
        if (expense.cost_center_id && memberTransactionsMap.has(expense.cost_center_id)) {
          memberTransactionsMap.get(expense.cost_center_id).creditExpenses.push({
            ...expense,
            payment_method: 'credit',
            card_name: cardName,
            isIndividual: true,
            isShared: false
          });
        } else if (expense.expense_splits && expense.expense_splits.length > 0) {
          expense.expense_splits.forEach((split) => {
            if (memberTransactionsMap.has(split.cost_center_id)) {
              const shareAmount = deriveSplitShareAmount(expense, split);
              memberTransactionsMap.get(split.cost_center_id).creditExpenses.push({
                ...expense,
                payment_method: 'credit',
                card_name: cardName,
                amount: shareAmount,
                memberShare: shareAmount,
                totalAmount: expense.amount,
                isIndividual: false,
                isShared: true
              });
            }
          });
        }
      });

      monthCashExpenses.forEach((expense) => processExpenseAllocation(expense, 'cash'));
      monthCreditCharges.forEach((expense) => processExpenseAllocation(expense, 'credit'));

      setData({
        summaryMapEntries: Array.from(summaryMap.entries()).map(([id, summary]) => ({
          id,
          name: summary.name,
          allocations: summary.allocations,
          cash: summary.cash,
          credit: summary.credit
        })),
        familySharedTotals
      });

      let individualSummaries = Array.from(summaryMap.values())
        .map((summary) => {
          const totalAllocations = Math.round((
            summary.allocations.individual + summary.allocations.shared
          ) * 100) / 100;
          const cashTotal = Math.round((summary.cash.individual + summary.cash.shared) * 100) / 100;
          const creditTotal = Math.round((summary.credit.individual + summary.credit.shared) * 100) / 100;
          const totalOut = Math.round((cashTotal + creditTotal) * 100) / 100;
          const finalBalance = Math.round((totalAllocations - totalOut) * 100) / 100;

          return {
            ...summary,
            totals: {
              allocations: totalAllocations,
              cash: cashTotal,
              credit: creditTotal,
              expenses: totalOut,
              balance: finalBalance
            }
          };
      })
        .sort((a, b) => b.totals.expenses - a.totals.expenses);

      setData({
        summaries: individualSummaries.map(s => ({
          name: s.name,
          allocations: s.totals.allocations,
          expenses: s.totals.expenses,
          balance: s.totals.balance
        }))
      });

      // Não filtrar - mostrar todos os membros mesmo sem alocações/despesas (igual ao web)

      if (individualSummaries.length > 0) {
        const membersCashSum = individualSummaries.reduce((sum, m) => sum + m.totals.cash, 0);
        const membersCreditSum = individualSummaries.reduce((sum, m) => sum + m.totals.credit, 0);
        
        const cashDifference = Math.round((cashExpenseTotal - membersCashSum) * 100) / 100;
        const creditDifference = Math.round((creditInvoiceTotal - membersCreditSum) * 100) / 100;
        
        if (Math.abs(cashDifference) > 0.01) {
          individualSummaries[0].totals.cash = Math.round((individualSummaries[0].totals.cash + cashDifference) * 100) / 100;
          individualSummaries[0].totals.expenses = Math.round((individualSummaries[0].totals.cash + individualSummaries[0].totals.credit) * 100) / 100;
          individualSummaries[0].totals.balance = Math.round((individualSummaries[0].totals.allocations - individualSummaries[0].totals.expenses) * 100) / 100;
        }
        
        if (Math.abs(creditDifference) > 0.01) {
          individualSummaries[0].totals.credit = Math.round((individualSummaries[0].totals.credit + creditDifference) * 100) / 100;
          individualSummaries[0].totals.expenses = Math.round((individualSummaries[0].totals.cash + individualSummaries[0].totals.credit) * 100) / 100;
          individualSummaries[0].totals.balance = Math.round((individualSummaries[0].totals.allocations - individualSummaries[0].totals.expenses) * 100) / 100;
        }
      }

      const monthKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      const monthsInYear = 12;
      const fullYearSeries = Array.from({ length: monthsInYear }, (_, idx) => {
        const targetYear = year;
        const targetMonthIndex = idx;
        const targetStartStr = formatDate(new Date(targetYear, targetMonthIndex, 1));
        const targetEnd = new Date(targetYear, targetMonthIndex + 1, 0);
        const targetEndStr = formatDate(targetEnd);

        const allocationsInRange = confirmedAllocations.filter(
          (allocation) => allocation.date >= targetStartStr && allocation.date <= targetEndStr
        );
        const cashExpensesInRange = confirmedExpenses.filter(
          (expense) =>
            expense.payment_method !== 'credit_card' &&
            expense.date >= targetStartStr &&
            expense.date <= targetEndStr
        );
        const invoicesInRange = computeCardInvoicesForMonth(targetYear, targetMonthIndex, expensesByCard, activeCreditCards);

        const allocationsTotal = allocationsInRange.reduce(
          (sum, allocation) => sum + Number(allocation.amount || 0),
          0
        );
        const cashTotalRange = cashExpensesInRange.reduce(
          (sum, expense) => sum + Number(expense.amount || 0),
          0
        );
        const creditTotalRange = invoicesInRange.reduce(
          (sum, invoice) => sum + Number(invoice.total || 0),
          0
        );
        const expensesTotalRange = cashTotalRange + creditTotalRange;

        return {
          key: `${targetYear}-${String(targetMonthIndex + 1).padStart(2, '0')}`,
          label: formatBrazilMonthShort(new Date(targetYear, targetMonthIndex, 1)),
          allocations: allocationsTotal,
          cash: cashTotalRange,
          credit: creditTotalRange,
          totalExpense: expensesTotalRange,
          balance: allocationsTotal - expensesTotalRange,
          creditInvoices: invoicesInRange
        };
      }).filter((entry) => {
        const [entryYearStr, entryMonthStr] = entry.key.split('-');
        const entryYear = parseInt(entryYearStr, 10);
        const entryMonth = parseInt(entryMonthStr, 10);
        const today = new Date();
        if (entryYear > today.getFullYear()) return false;
        if (entryYear === today.getFullYear() && entryMonth > today.getMonth() + 1) {
          return false;
        }
        return true;
      });

      const monthlyExpenses = [
        ...monthCashExpenses,
        ...monthCreditCharges
      ];

      setData({
        allocations: monthAllocations,
        expenses: monthlyExpenses,
        totalAllocations,
        totalExpense,
        cashExpenseTotal,
        creditInvoiceTotal,
        balance,
        creditInvoices,
        individualSummaries,
        familySharedTotals,
        memberTransactions: memberTransactionsMap,
        historicalSeries: fullYearSeries,
        monthMetadata: {
          start: monthStartStr,
          end: monthEndStr,
          key: monthKey
        }
      });
    } catch (error) {
      // Erro ao carregar dados - silenciosamente ignorado
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMonthlyData();
  };

  const handleMemberClick = (summary) => {
    const transactions = data.memberTransactions?.get(summary.id);
    if (transactions) {
      setSelectedMember(summary);
      setMemberTransactions(transactions);
      setShowMemberModal(true);
    }
  };

  const handleCloseMemberModal = () => {
    setShowMemberModal(false);
    setSelectedMember(null);
    setMemberTransactions(null);
  };

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message="Carregando fechamento..." />;
  }

  const totalBalance = data.balance;
  const totalAllocations = data.totalAllocations || 0;
  const totalExpense = data.totalExpense || 0;
  const totalCash = data.cashExpenseTotal || 0;
  const totalCredit = data.creditInvoiceTotal || 0;
  const memberSummaries = !isSoloUser && Array.isArray(data.individualSummaries)
    ? data.individualSummaries
    : [];
  const showResponsibilityGrid = memberSummaries.length > 0;const cashPercentage = totalExpense > 0 ? ((totalCash / totalExpense) * 100).toFixed(1) : '0.0';
  const creditPercentage = totalExpense > 0 ? ((totalCredit / totalExpense) * 100).toFixed(1) : '0.0';
  const historicalSeriesData = Array.isArray(data.historicalSeries) ? data.historicalSeries : [];
  const hasHistoricalData = historicalSeriesData.length > 0;
  const selectedMonthKey = data.monthMetadata?.key;
  const historicalRows = [...historicalSeriesData].reverse();
  const baseYearOptions = Array.from({ length: 6 }, (_, idx) => currentYear - idx);
  const yearOptions = baseYearOptions.includes(selectedYear)
    ? baseYearOptions
    : [selectedYear, ...baseYearOptions];

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Fechamento"
        showLogo={true}
        rightIcon={<Plus size={24} color={colors.text.secondary} />}
        onRightIconPress={() => setShowAllocationModal(true)}
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
            onMonthChange={handleMonthChange}
          />
        </View>

        {/* Stats Cards */}
        <View style={styles.statsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.statsScroll}
            snapToInterval={STAT_CARD_WIDTH + spacing[2]}
            decelerationRate="fast"
          >
            <StatCard
              label="Total de Aportes"
              value={formatCurrency(totalAllocations)}
              icon={<TrendingUp size={20} color={colors.brand.primary} />}
              variant="success"
              style={{ width: STAT_CARD_WIDTH }}
              onPress={() => {
                setSheetData({
                  title: 'Aportes por Responsável',
                  data: memberSummaries.map(m => ({
                    label: m.name,
                    value: m.totals.allocations,
                    color: m.color,
                    percentage: totalAllocations > 0 
                      ? ((m.totals.allocations / totalAllocations) * 100).toFixed(1)
                      : 0,
                  })),
                });
                setSheetVisible(true);
              }}
            />
            <StatCard
              label="Total de Saídas"
              value={formatCurrency(totalExpense)}
              icon={<TrendingDown size={20} color={colors.error.main} />}
              variant="expense"
              style={{ width: STAT_CARD_WIDTH }}
              onPress={() => {
                setSheetData({
                  title: 'Saídas por Forma de Pagamento',
                  data: [
                    { label: 'À vista', value: totalCash, color: colors.text.primary, percentage: cashPercentage },
                    { label: 'Faturas no mês', value: totalCredit, color: colors.text.secondary, percentage: creditPercentage },
                  ],
                });
                setSheetVisible(true);
              }}
            />
            <StatCard
              label="Faturas de Cartão"
              value={formatCurrency(totalCredit)}
              icon={<CreditCard size={20} color={colors.text.secondary} />}
              variant="neutral"
              style={{ width: STAT_CARD_WIDTH }}
              onPress={() => {
                if (data.creditInvoices && data.creditInvoices.length > 0) {
                  setSheetData({
                    title: 'Faturas por Cartão',
                    data: data.creditInvoices.map(invoice => ({
                      label: invoice.cardName,
                      value: invoice.total,
                      color: colors.brand.primary,
                      percentage: totalCredit > 0 
                        ? ((invoice.total / totalCredit) * 100).toFixed(1)
                        : 0,
                    })),
                  });
                  setSheetVisible(true);
                }
              }}
            />
            <StatCard
              label="Saldo Final"
              value={formatCurrency(totalBalance)}
              icon={totalBalance >= 0 
                ? <DollarSign size={20} color={colors.success.main} /> 
                : <DollarSign size={20} color={colors.error.main} />
              }
              variant={totalBalance >= 0 ? 'success' : 'danger'}
              style={{ width: STAT_CARD_WIDTH }}
              onPress={() => {
                setSheetData({
                  title: 'Composição do Saldo',
                  data: [
                    { label: 'Total de Aportes', value: totalAllocations, color: colors.success.main },
                    { label: 'Total de Saídas', value: -totalExpense, color: colors.error.main },
                    { label: 'Saldo Final', value: totalBalance, color: totalBalance >= 0 ? colors.success.main : colors.error.main },
                  ],
                });
                setSheetVisible(true);
              }}
            />
          </ScrollView>
        </View>

        {/* Individual Responsibility Cards */}
        {showResponsibilityGrid && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1], marginBottom: spacing[0.5] }}>
                  <Subheadline weight="semiBold">Responsabilidade por membro</Subheadline>
                  <Tooltip
                    title="Responsabilidade por membro"
                    content="Aportes e saídas atribuídas a cada responsável no mês. Toque para ver detalhes das transações."
                  />
                </View>
                <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                  Aportes e saídas atribuídas a cada responsável no mês.
                </Caption>
              </View>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.memberCardsScroll}
              snapToInterval={MEMBER_CARD_WIDTH + spacing[2]}
              decelerationRate="fast"
            >
              {memberSummaries.map((summary) => {
              const allocationsIndividual = Number(summary.allocations?.individual || 0);
              const allocationsShared = Number(summary.allocations?.shared || 0);
              const totalMemberAllocations = allocationsIndividual + allocationsShared;
              const individualOut = Number(summary.cash.individual || 0) + Number(summary.credit.individual || 0);
              const sharedOut = Number(summary.cash.shared || 0) + Number(summary.credit.shared || 0);
              const balanceMember = Number(summary.totals.balance || 0);
              const balancePositive = balanceMember >= 0;
              const balanceIndividual = allocationsIndividual - individualOut;
              const balanceShared = allocationsShared - sharedOut;

              return (
                <TouchableOpacity
                  key={`responsibility-${summary.id}`}
                  activeOpacity={0.7}
                  onPress={() => handleMemberClick(summary)}
                  style={{ width: MEMBER_CARD_WIDTH, marginRight: spacing[2] }}
                >
                  <Card style={styles.memberCard}>
                    <View style={styles.memberHeader}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <View style={[styles.memberDot, { backgroundColor: summary.color }]} />
                        <Callout weight="semiBold">{summary.name}</Callout>
                      </View>
                      <Caption color="tertiary" style={{ fontSize: 10 }}>Toque para detalhes</Caption>
                    </View>

                    {/* Individual */}
                    <View style={styles.memberSection}>
                      <View style={styles.memberSectionHeader}>
                        <Caption weight="medium" style={{ color: colors.brand.primary }}>Individual</Caption>
                      </View>
                      <View style={styles.memberRow}>
                        <Caption color="secondary">Aportes</Caption>
                        <Callout weight="semiBold" style={{ color: colors.brand.primary }}>
                          {allocationsIndividual > 0 ? '+' : ''}{formatCurrency(allocationsIndividual)}
                        </Callout>
                      </View>
                      <View style={styles.memberRow}>
                        <Caption color="secondary">Saídas</Caption>
                        <Callout weight="semiBold" style={{ color: colors.error.main }}>
                          -{formatCurrency(individualOut)}
                        </Callout>
                      </View>
                      <View style={[styles.memberRow, styles.memberRowBorder]}>
                        <Caption weight="medium">Saldo</Caption>
                        <Callout weight="bold" style={{ color: balanceIndividual >= 0 ? colors.success.main : colors.error.main }}>
                          {balanceIndividual >= 0 ? '+' : '-'}{formatCurrency(Math.abs(balanceIndividual))}
                        </Callout>
                      </View>
                    </View>

                    {/* Compartilhado */}
                    <View style={styles.memberSection}>
                      <View style={styles.memberSectionHeader}>
                        <Caption weight="medium" style={{ color: colors.text.secondary }}>Compartilhado</Caption>
                      </View>
                      <View style={styles.memberRow}>
                        <Caption color="secondary">Aportes</Caption>
                        <Callout weight="semiBold" style={{ color: colors.brand.primary }}>
                          {allocationsShared > 0 ? '+' : ''}{formatCurrency(allocationsShared)}
                        </Callout>
                      </View>
                      <View style={styles.memberRow}>
                        <Caption color="secondary">Saídas</Caption>
                        <Callout weight="semiBold" style={{ color: colors.error.main }}>
                          -{formatCurrency(sharedOut)}
                        </Callout>
                      </View>
                      <View style={[styles.memberRow, styles.memberRowBorder]}>
                        <Caption weight="medium">Saldo</Caption>
                        <Callout weight="bold" style={{ color: balanceShared >= 0 ? colors.success.main : colors.error.main }}>
                          {balanceShared >= 0 ? '+' : '-'}{formatCurrency(Math.abs(balanceShared))}
                        </Callout>
                      </View>
                    </View>

                    {/* Total */}
                    <View style={[styles.memberRow, styles.memberTotalRow]}>
                      <Caption weight="semiBold" style={{ textTransform: 'uppercase', fontSize: 10 }}>Saldo Total</Caption>
                      <Headline weight="bold" style={{ color: balancePositive ? colors.success.main : colors.error.main }}>
                        {balancePositive ? '+' : '-'}{formatCurrency(Math.abs(balanceMember))}
                      </Headline>
                    </View>
                  </Card>
                </TouchableOpacity>
              );
            })}
            </ScrollView>
          </View>
        )}

        {/* Historical Summary */}
        {hasHistoricalData && (
          <View style={styles.section}>
            <Card>
              <TouchableOpacity
                style={styles.historicalHeader}
                onPress={() => setHistoricalExpanded(!historicalExpanded)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
                  <Calendar size={20} color={colors.text.secondary} />
                  <Subheadline weight="semiBold">Histórico do ano de</Subheadline>
                  <View style={styles.yearSelector}>
                    {/* Year selector - simplified for mobile */}
                    <Caption weight="medium">{selectedYear}</Caption>
                  </View>
                </View>
                {historicalExpanded ? (
                  <ChevronUp size={20} color={colors.text.secondary} />
                ) : (
                  <ChevronDown size={20} color={colors.text.secondary} />
                )}
              </TouchableOpacity>

              {historicalExpanded && (
                <View style={styles.historicalContent}>
                  {historicalRows.map((row) => {
                    const isSelected = row.key === selectedMonthKey;
                    const balancePositive = Number(row.balance || 0) >= 0;
                    return (
                      <View
                        key={`history-${row.key}`}
                        style={styles.historicalRow}
                      >
                        <View style={styles.historicalRowLeft}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
                            <Callout weight={isSelected ? "semiBold" : "medium"} style={{ color: isSelected ? colors.brand.primary : colors.text.primary }}>
                              {row.label}
                            </Callout>
                            {isSelected && (
                              <View style={styles.currentMonthBadge}>
                                <Caption style={{ color: colors.brand.primary, fontSize: 9, fontWeight: '600' }}>
                                  ATUAL
                                </Caption>
                              </View>
                            )}
                          </View>
                        </View>
                        <View style={styles.historicalRowRight}>
                          <View style={styles.historicalCell}>
                            <Caption color="secondary" style={{ fontSize: 10 }}>Aportes</Caption>
                            <Caption weight="medium">{formatCurrency(row.allocations)}</Caption>
                          </View>
                          <View style={styles.historicalCell}>
                            <Caption color="secondary" style={{ fontSize: 10 }}>À vista</Caption>
                            <Caption weight="medium">{formatCurrency(row.cash)}</Caption>
                          </View>
                          <View style={styles.historicalCell}>
                            <Caption color="secondary" style={{ fontSize: 10 }}>Faturas</Caption>
                            <Caption weight="medium">{formatCurrency(row.credit)}</Caption>
                          </View>
                          <View style={styles.historicalCell}>
                            <Caption color="secondary" style={{ fontSize: 10 }}>Saldo</Caption>
                            <Callout weight="bold" style={{ color: balancePositive ? colors.success.main : colors.error.main }}>
                              {balancePositive ? '+' : '-'}{formatCurrency(Math.abs(row.balance))}
                            </Callout>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </Card>
          </View>
        )}

        {data.allocations.length === 0 && data.expenses.length === 0 && (
          <EmptyState
            emoji="📊"
            title="Nenhum dado para este mês"
            description={`Não há entradas ou despesas registradas para ${selectedMonth}`}
          />
        )}

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Stats Detail Sheet */}
      <StatsDetailSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        title={sheetData.title}
        data={sheetData.data}
      />

      {/* Member Details Modal */}
      <MemberDetailsModal
        isOpen={showMemberModal}
        onClose={handleCloseMemberModal}
        member={selectedMember}
        transactions={memberTransactions}
      />

      {/* Payment Allocation Modal */}
      <PaymentAllocationModal
        isOpen={showAllocationModal}
        onClose={() => setShowAllocationModal(false)}
        onSuccess={() => {
          fetchMonthlyData();
        }}
        organization={organization}
        costCenters={costCenters}
        currentUser={user}
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
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  monthSection: {
    paddingHorizontal: spacing[2],
    marginBottom: spacing[3],
  },
  statsSection: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },
  statsSectionHeader: {
    marginBottom: spacing[2],
  },
  statsScroll: {
    gap: spacing[1.5],
  },
  section: {
    paddingHorizontal: spacing[2],
    marginBottom: spacing[3],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  memberCardsScroll: {
    paddingVertical: spacing[1],
    paddingRight: spacing[2],
  },
  memberCard: {
    marginBottom: spacing[2],
  },
  memberHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
    marginBottom: spacing[2],
  },
  memberDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    marginRight: spacing[1.5],
  },
  memberSection: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.md,
    padding: spacing[2],
    marginBottom: spacing[2],
  },
  memberSectionHeader: {
    marginBottom: spacing[1],
  },
  memberRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[0.5],
  },
  memberRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    paddingTop: spacing[1],
    marginTop: spacing[0.5],
  },
  memberTotalRow: {
    borderTopWidth: 2,
    borderTopColor: colors.border.light,
    paddingTop: spacing[2],
    marginTop: spacing[1],
  },
  historicalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[2],
  },
  yearSelector: {
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    backgroundColor: colors.background.secondary,
    borderRadius: radius.sm,
  },
  historicalContent: {
    padding: spacing[2],
    paddingTop: 0,
  },
  historicalRow: {
    paddingVertical: spacing[2],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  historicalRowLeft: {
    marginBottom: spacing[1],
  },
  currentMonthBadge: {
    backgroundColor: colors.brand.bg,
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[0.5],
    borderRadius: radius.sm,
  },
  historicalRowRight: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  historicalCell: {
    flex: 1,
    minWidth: '45%',
  },
});
