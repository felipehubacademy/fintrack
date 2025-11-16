import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import LoadingLogo from '../../components/LoadingLogo';
import Header from '../../components/Header';
import NotificationModal from '../../components/NotificationModal';
import MemberDetailsModal from '../../components/MemberDetailsModal';
import PaymentAllocationModal from '../../components/PaymentAllocationModal';
import { 
  Calendar,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  HelpCircle,
  CreditCard,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function MonthlyClosing() {
  const router = useRouter();
  const { organization, user: orgUser, costCenters, loading: orgLoading, error: orgError, isSoloUser } = useOrganization();
  const { warning } = useNotificationContext();
  const [showAllocationModal, setShowAllocationModal] = useState(false);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonthStr = String(now.getMonth() + 1).padStart(2, '0');

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedMonth, setSelectedMonth] = useState(`${currentYear}-${currentMonthStr}`);
  const [loading, setLoading] = useState(true);
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [openTooltip, setOpenTooltip] = useState(null);
  const [historicalExpanded, setHistoricalExpanded] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberTransactions, setMemberTransactions] = useState(null);
  const [showMemberModal, setShowMemberModal] = useState(false);

  const handleYearChange = (yearValue) => {
    const parsedYear = parseInt(yearValue, 10);
    if (Number.isNaN(parsedYear)) return;
    setSelectedYear(parsedYear);
    const [, monthPart = currentMonthStr] = selectedMonth.split('-');
    setSelectedMonth(`${parsedYear}-${monthPart}`);
  };

  const handleMonthChange = (value) => {
    if (!value) return;
    setSelectedMonth(value);
    const [yearPart] = value.split('-');
    const parsedYear = parseInt(yearPart, 10);
    if (!Number.isNaN(parsedYear) && parsedYear !== selectedYear) {
      setSelectedYear(parsedYear);
    }
  };
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
    monthMetadata: {
      start: null,
      end: null
    }
  });

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchMonthlyData();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth, selectedYear]);

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

  const fetchMonthlyData = async () => {
    console.log('🔍 [Closing] Iniciando fetchMonthlyData...');
    try {
      setLoading(true);
      
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const monthIndex = parseInt(monthStr, 10) - 1;

      const formatDate = (date) => date.toISOString().split('T')[0];

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

      const clampDayToMonth = (targetYear, targetMonthIndex, desiredDay) => {
        const endOfMonth = new Date(targetYear, targetMonthIndex + 1, 0);
        const safeDay = Math.min(desiredDay, endOfMonth.getDate());
        return new Date(targetYear, targetMonthIndex, safeDay);
      };

      const computeCardInvoicesForMonth = (targetYear, targetMonthIndex) => {
        console.log(`🔍 [computeCardInvoices] Iniciando para ${targetYear}-${targetMonthIndex + 1}`);
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
          // início inclui o dia de fechamento anterior

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

        console.log(`🔍 [computeCardInvoices] Finalizando com ${invoices.length} faturas`);
        invoices.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
        return invoices;
      };

      console.log('🔍 [Closing] Calculando faturas de cartão...');
      const creditInvoices = computeCardInvoicesForMonth(year, monthIndex);
      console.log('🔍 [Closing] Faturas calculadas:', creditInvoices.length);
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
            color: cc.color || '#207DFF',
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
        
        // Se é organizacional (ownership_type = 'organization'), usar splits
        if (allocation.ownership_type === 'organization') {
          if (allocation.payment_allocation_splits && allocation.payment_allocation_splits.length > 0) {
            allocation.payment_allocation_splits.forEach((split) => {
              addToSummary(split.cost_center_id, 'allocations', Number(split.amount || 0), 'shared');
            });
          } else {
            distributeSharedAmount(amount, 'allocations');
          }
        } 
        // Se é de membro (ownership_type = 'member')
        else if (allocation.ownership_type === 'member' && allocation.cost_center_id) {
          // allocation_target indica se é para despesas individuais ou compartilhadas
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
            addToSummary(split.cost_center_id, field, Number(split.amount || 0), 'shared');
          });
        } else if (expense.cost_center_id) {
          addToSummary(expense.cost_center_id, field, amount, 'individual');
        } else {
          familySharedTotals[field] = Math.round((familySharedTotals[field] + amount) * 100) / 100;
        }
      };

      // Preparar transações detalhadas por membro para o modal
      const memberTransactionsMap = new Map();
      activeIndividualCenters.forEach((cc) => {
        memberTransactionsMap.set(cc.id, {
          allocations: [],
          cashExpenses: [],
          creditExpenses: []
        });
      });

      // Processar allocations
      monthAllocations.forEach((allocation) => {
        const amount = Number(allocation.amount || 0);
        const bank_account_name = allocation.bank_account?.name || 'Conta não informada';
        
        // Aporte de membro individual
        if (allocation.ownership_type === 'member' && allocation.cost_center_id && memberTransactionsMap.has(allocation.cost_center_id)) {
          memberTransactionsMap.get(allocation.cost_center_id).allocations.push({
            ...allocation,
            bank_account_name,
            isIndividual: allocation.allocation_target === 'individual',
            isShared: allocation.allocation_target === 'shared'
          });
        } 
        // Aporte organizacional com splits
        else if (allocation.ownership_type === 'organization' && allocation.payment_allocation_splits && allocation.payment_allocation_splits.length > 0) {
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

      // Processar cash expenses
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
              memberTransactionsMap.get(split.cost_center_id).cashExpenses.push({
                ...expense,
                payment_method: 'cash',
                amount: split.amount,
                memberShare: split.amount,
                totalAmount: expense.amount,
                isIndividual: false,
                isShared: true
              });
            }
          });
        }
      });

      // Processar credit expenses
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
              memberTransactionsMap.get(split.cost_center_id).creditExpenses.push({
                ...expense,
                payment_method: 'credit',
                card_name: cardName,
                amount: split.amount,
                memberShare: split.amount,
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

      // Correção de arredondamento: ajustar diferenças para garantir que a soma dos membros = total
      if (individualSummaries.length > 0) {
        const membersCashSum = individualSummaries.reduce((sum, m) => sum + m.totals.cash, 0);
        const membersCreditSum = individualSummaries.reduce((sum, m) => sum + m.totals.credit, 0);
        
        const cashDifference = Math.round((cashExpenseTotal - membersCashSum) * 100) / 100;
        const creditDifference = Math.round((creditInvoiceTotal - membersCreditSum) * 100) / 100;
        
        // Aplicar correção no primeiro membro (maior responsabilidade)
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

      console.log('🔍 [Closing] Calculando série histórica anual...');
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
        const invoicesInRange = computeCardInvoicesForMonth(targetYear, targetMonthIndex);

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
          label: new Date(targetYear, targetMonthIndex, 1).toLocaleDateString('pt-BR', {
            month: 'short',
            year: 'numeric'
          }),
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

      console.log('🔍 [Closing] Finalizando e setando dados...');
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
      console.error('❌ [Closing] Erro ao buscar dados do mês:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = () => {
    const [year, month] = selectedMonth.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const handleOpenAllocationModal = () => {
    setShowAllocationModal(true);
  };

  const handleCloseAllocationModal = () => {
    setShowAllocationModal(false);
  };

  const handleAllocationSuccess = () => {
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

  const totalBalance = data.balance;
  const totalAllocations = data.totalAllocations || 0;
  const totalExpense = data.totalExpense || 0;
  const totalCash = data.cashExpenseTotal || 0;
  const totalCredit = data.creditInvoiceTotal || 0;

  const costCenterMap = (costCenters || []).reduce((acc, cc) => {
    if (cc && cc.id) {
      acc[cc.id] = cc;
    }
    return acc;
  }, {});

  const sharedTotals = data.familySharedTotals || { allocations: 0, cash: 0, credit: 0 };
  const familyAllocations = Number(sharedTotals.allocations || 0);
  const familyCash = Number(sharedTotals.cash || 0);
  const familyCredit = Number(sharedTotals.credit || 0);

  const memberSummaries = !isSoloUser && Array.isArray(data.individualSummaries)
    ? data.individualSummaries
    : [];


  const showResponsibilityGrid = memberSummaries.length > 0;
  const cashPercentage = totalExpense > 0 ? ((totalCash / totalExpense) * 100).toFixed(1) : '0.0';
  const creditPercentage = totalExpense > 0 ? ((totalCredit / totalExpense) * 100).toFixed(1) : '0.0';
  const formatDateLabel = (isoDate) => {
    if (!isoDate) return '-';
    const parsed = new Date(`${isoDate}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return '-';
    return parsed.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };
  const historicalSeriesData = Array.isArray(data.historicalSeries) ? data.historicalSeries : [];
  const hasHistoricalData = historicalSeriesData.length > 0;
  const selectedMonthKey = data.monthMetadata?.key;
  const historicalRows = [...historicalSeriesData].reverse();
  const baseYearOptions = Array.from({ length: 6 }, (_, idx) => currentYear - idx);
  const yearOptions = baseYearOptions.includes(selectedYear)
    ? baseYearOptions
    : [selectedYear, ...baseYearOptions];

  return (
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Fechamento Mensal"
        showNotificationModal={showNotificationModal}
        setShowNotificationModal={setShowNotificationModal}
      >
      <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Fechamento Mensal</h2>
                <p className="text-sm text-gray-600">Análise completa de entradas e saídas por responsável</p>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Month Selector */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-3 space-y-2 sm:space-y-0">
                  <div className="flex items-center space-x-2 bg-gray-50 rounded-lg border border-gray-200 px-3 py-1.5">
                    <Calendar className="h-4 w-4 text-gray-600" />
                    <input
                      type="month"
                      value={selectedMonth}
                      onChange={(e) => handleMonthChange(e.target.value)}
                      className="h-8 border-0 bg-transparent text-sm focus:ring-0 focus:outline-none"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleOpenAllocationModal}
                  className="bg-flight-blue hover:bg-flight-blue/90 text-white"
                >
                  Registrar Aporte
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Cards - Resumo Geral com Tooltips */}
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 w-full">
          {/* Card Total de Aportes */}
          <div className="relative group">
            <Card 
              className="border border-blue-200 bg-blue-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'aportes' ? null : 'aportes')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Total de Aportes
                </CardTitle>
                <div className="p-2 rounded-lg bg-flight-blue/10">
                  <TrendingUp className="h-4 w-4 text-flight-blue" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {totalAllocations.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {totalAllocations > 0 
                    ? 'Total de aportes do mês'
                    : 'Nenhum aporte neste mês'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'aportes' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                {isSoloUser ? 'Aportes Individuais' : 'Divisão por Responsável'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {isSoloUser
                  ? 'Seus aportes confirmados neste mês'
                  : 'Distribuição dos aportes confirmados por responsável'}
              </p>
              {isSoloUser ? (
                <p className="text-sm text-gray-500">Conta individual - apenas seus aportes.</p>
              ) : (
                <>
                  {memberSummaries.filter(summary => summary.totals.allocations > 0).length > 0 ? (
              <div className="space-y-2">
                      {memberSummaries
                        .filter(summary => summary.totals.allocations > 0)
                        .map(summary => {
                          const individualTotal = Number(summary.allocations.individual || 0);
                          const sharedTotal = Number(summary.allocations.shared || 0);
                    const total = individualTotal + sharedTotal;
                          const percentage = totalAllocations > 0 ? ((total / totalAllocations) * 100).toFixed(1) : '0.0';
                    
                          return (
                            <div key={summary.id} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center space-x-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: summary.color || '#207DFF' }}
                          />
                                  <span className="text-gray-700 font-medium">{summary.name}</span>
                        </div>
                        <div className="text-right">
                                  <span className="text-gray-900 font-semibold">
                                    R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                          <span className="text-gray-500 ml-2">{percentage}%</span>
                        </div>
                      </div>
                      {(individualTotal > 0 || sharedTotal > 0) && (
                        <div className="text-xs text-gray-500 ml-5">
                          {individualTotal > 0 && `Individual: R$ ${individualTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                          {individualTotal > 0 && sharedTotal > 0 && ' • '}
                                  {sharedTotal > 0 && `Compartilhado: R$ ${sharedTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </div>
                      )}
                    </div>
                          );
                        })}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">Nenhum aporte registrado no mês selecionado.</p>
                )}
                  {!isSoloUser && familyAllocations > 0 && (
                    <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                      {organization?.name || 'Família'}: R$ {familyAllocations.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (cota compartilhada não atribuída)
                    </div>
                )}
                </>
              )}
            </div>
          </div>

          {/* Card Total de Saídas */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'saidas' ? null : 'saidas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Total de Saídas
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <TrendingDown className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {totalExpense > 0 
                    ? 'Total de saídas do mês (à vista + faturas)'
                    : 'Nenhuma saída neste mês'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'saidas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">
                Saídas por Forma de Pagamento
              </p>
              <p className="text-xs text-gray-500 mb-3">
                Divisão consolidada das despesas
              </p>
              {totalExpense > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-600"></div>
                      <span className="text-gray-700 font-medium">À vista</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-900 font-semibold">
                        R$ {totalCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-gray-500 ml-2">{cashPercentage}%</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                      <span className="text-gray-700 font-medium">Faturas no mês</span>
                    </div>
                    <div className="text-right">
                      <span className="text-gray-900 font-semibold">
                        R$ {totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-gray-500 ml-2">{creditPercentage}%</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma saída registrada no mês selecionado.</p>
              )}
            </div>
          </div>

          {/* Card Faturas de Cartão */}
          <div className="relative group">
            <Card 
              className="border border-gray-200 bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer"
              onClick={() => setOpenTooltip(openTooltip === 'faturas' ? null : 'faturas')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-600">
                  Faturas de Cartão
                </CardTitle>
                <div className="p-2 rounded-lg bg-gray-100">
                  <CreditCard className="h-4 w-4 text-gray-600" />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  R$ {totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {data.creditInvoices && data.creditInvoices.length > 0 
                    ? `${data.creditInvoices.length} ${data.creditInvoices.length === 1 ? 'fatura' : 'faturas'} com vencimento neste mês`
                    : 'Nenhuma fatura com vencimento no mês'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'faturas' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-2">Faturas por Cartão</p>
              <p className="text-xs text-gray-500 mb-3">Faturas que vencem no mês selecionado</p>
              {data.creditInvoices && data.creditInvoices.length > 0 ? (
                <div className="space-y-2">
                  {data.creditInvoices.map((invoice) => {
                    const invoiceTotal = Number(invoice.total || 0);
                    const totalInvoicesValue = data.creditInvoices.reduce(
                      (sum, inv) => sum + Number(inv.total || 0),
                      0
                    );
                    const percentage = totalInvoicesValue > 0 ? ((invoiceTotal / totalInvoicesValue) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <div key={invoice.cardId} className="flex items-center justify-between text-sm">
                        <span className="text-gray-700 font-medium">{invoice.cardName}</span>
                        <div className="text-right">
                          <span className="text-gray-900 font-semibold">
                            R$ {invoiceTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-gray-500 ml-2">{percentage}%</span>
                        </div>
                      </div>
                    );
                  })}
                  <div className="pt-2 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm font-semibold">
                      <span className="text-gray-900">Total</span>
                      <span className="text-gray-900">
                        R$ {totalCredit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Nenhuma fatura vence neste mês.</p>
              )}
            </div>
          </div>

          {/* Card Saldo Final */}
          <div className="relative group">
            <Card 
              className={`border shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer ${
                totalBalance >= 0 
                  ? 'border-green-200 bg-green-50' 
                  : 'border-red-200 bg-red-50'
              }`}
              onClick={() => setOpenTooltip(openTooltip === 'saldo' ? null : 'saldo')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
                <CardTitle className="text-sm font-medium text-gray-900">
                  Saldo Final
                </CardTitle>
                <div className={`p-2 rounded-lg ${
                  totalBalance >= 0 ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  <DollarSign className={`h-4 w-4 ${
                    totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
                  }`} />
                </div>
              </CardHeader>
              <CardContent className="p-3 pt-0 relative">
                <HelpCircle className="absolute bottom-2 right-2 h-3 w-3 text-gray-400 opacity-50 group-hover:opacity-70 transition-opacity" />
                <div className={`text-2xl font-bold mb-1 ${
                  totalBalance >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {totalBalance >= 0 ? '+' : '-'} R$ {Math.abs(totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {totalBalance >= 0 ? 'Saldo positivo' : 'Saldo negativo'}
                </p>
              </CardContent>
            </Card>
            
            {/* Tooltip */}
            <div className={`absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 left-0 top-full mt-2 min-w-[320px] max-w-[450px] md:invisible md:group-hover:visible ${openTooltip === 'saldo' ? 'visible' : 'invisible'}`}>
              <p className="text-sm font-semibold text-gray-900 mb-3">Composição do Saldo</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-700">Total de Aportes</span>
                  <span className="text-gray-900 font-semibold text-green-600">
                    R$ {totalAllocations.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm py-2 border-b border-gray-100">
                  <span className="text-gray-700">Total de Saídas</span>
                  <span className="text-gray-900 font-semibold">
                    R$ {totalExpense.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm py-2">
                  <span className="text-gray-900 font-semibold">Saldo Final</span>
                  <span className={`font-bold ${
                    totalBalance >= 0 ? 'text-blue-600' : 'text-red-600'
                  }`}>
                    {totalBalance >= 0 ? '+' : '-'} R$ {Math.abs(totalBalance).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Responsibility Cards */}
        {showResponsibilityGrid && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Responsabilidade por membro
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Aportes e saídas atribuídas a cada responsável no mês.
                </p>
              </div>
            </div>
            <div className={`grid gap-4 ${
              memberSummaries.length === 1 ? 'grid-cols-1' :
              memberSummaries.length === 2 ? 'grid-cols-1 md:grid-cols-2' :
              memberSummaries.length <= 4 ? 'grid-cols-1 md:grid-cols-2' :
              'grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
            }`}>
              {memberSummaries.map((summary) => {
                const allocationsIndividual = Number(summary.allocations?.individual || 0);
                const allocationsShared = Number(summary.allocations?.shared || 0);
                const totalMemberAllocations = allocationsIndividual + allocationsShared;
                const individualOut = Number(summary.cash.individual || 0) + Number(summary.credit.individual || 0);
                const sharedOut = Number(summary.cash.shared || 0) + Number(summary.credit.shared || 0);
                const balanceMember = Number(summary.totals.balance || 0);
                const balancePositive = balanceMember >= 0;
                
                // Saldo por tipo (individual e compartilhado)
                const balanceIndividual = allocationsIndividual - individualOut;
                const balanceShared = allocationsShared - sharedOut;

                return (
                  <Card
                    key={`responsibility-${summary.id}`}
                    className="border border-gray-200 bg-white shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer hover:border-flight-blue"
                    onClick={() => handleMemberClick(summary)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: summary.color || '#207DFF' }}
                          />
                          <CardTitle className="text-sm font-semibold text-gray-900">
                            {summary.name}
                          </CardTitle>
                        </div>
                        <span className="text-xs text-gray-400">Clique para detalhes</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0 space-y-2">
                      {/* Individual */}
                      <div className="bg-blue-50 rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span className="font-medium">Individual</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Aportes</span>
                          <span className="text-sm font-semibold text-flight-blue">
                            {allocationsIndividual > 0 ? '+' : ''} R$ {allocationsIndividual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Saídas</span>
                          <span className="text-sm font-semibold text-red-600">
                            - R$ {individualOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-blue-200">
                          <span className="text-xs font-medium text-gray-700">Saldo</span>
                          <span className={`text-sm font-bold ${balanceIndividual >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {balanceIndividual >= 0 ? '+' : '-'} R$ {Math.abs(balanceIndividual).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Compartilhado */}
                      <div className="bg-gray-50 rounded-lg p-2 space-y-1">
                        <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span className="font-medium">Compartilhado</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Aportes</span>
                          <span className="text-sm font-semibold text-flight-blue">
                            {allocationsShared > 0 ? '+' : ''} R$ {allocationsShared.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Saídas</span>
                          <span className="text-sm font-semibold text-red-600">
                            - R$ {sharedOut.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-gray-200">
                          <span className="text-xs font-medium text-gray-700">Saldo</span>
                          <span className={`text-sm font-bold ${balanceShared >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {balanceShared >= 0 ? '+' : '-'} R$ {Math.abs(balanceShared).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                      
                      {/* Total */}
                      <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                        <span className="text-xs uppercase tracking-wide font-semibold text-gray-700">Saldo Total</span>
                        <span className={`text-lg font-bold ${balancePositive ? 'text-green-600' : 'text-red-600'}`}>
                          {balancePositive ? '+' : '-'} R$ {Math.abs(balanceMember).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}


        {/* Historical Summary */}
        {hasHistoricalData && (
          <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0">
                <CardTitle className="flex items-center space-x-2 text-lg font-semibold text-gray-900">
                  <Calendar className="h-5 w-5 text-gray-600" />
                  <span className="hidden sm:inline">Histórico do ano de</span>
                  <select
                    value={selectedYear}
                    onChange={(e) => handleYearChange(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-flight-blue focus:border-flight-blue bg-white"
                  >
                    {yearOptions.map((yearOption) => (
                      <option key={`history-year-${yearOption}`} value={yearOption}>
                        {yearOption}
                      </option>
                    ))}
                  </select>
                </CardTitle>
                <div className="flex items-center space-x-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setHistoricalExpanded((prev) => !prev)}
                    className="flex items-center space-x-2 text-sm font-medium text-gray-700 hover:text-gray-900"
                  >
                    {historicalExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span className="hidden sm:inline">Ocultar</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span className="hidden sm:inline">Exibir</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardHeader>
            {historicalExpanded && (
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Mês</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Aportes</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">À vista</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Faturas</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {historicalRows.map((row) => {
                      const isSelected = row.key === selectedMonthKey;
                      const balancePositive = Number(row.balance || 0) >= 0;
                      return (
                        <tr key={`history-${row.key}`} className={isSelected ? 'bg-blue-50/60' : ''}>
                          <td className="px-4 py-3 text-gray-700 font-medium">
                            {row.label}
                            {isSelected && (
                              <span className="ml-2 text-[11px] uppercase tracking-wide text-blue-600 font-semibold">
                                mês atual
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            R$ {Number(row.allocations || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            R$ {Number(row.cash || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-700">
                            R$ {Number(row.credit || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className={`px-4 py-3 text-right font-semibold ${balancePositive ? 'text-green-600' : 'text-red-600'}`}>
                            {balancePositive ? '+' : '-'} R$ {Math.abs(Number(row.balance || 0)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
            )}
          </Card>
        )}


        {/* Empty State */}
        {data.allocations.length === 0 && data.expenses.length === 0 && (
          <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Nenhum dado para este mês
              </h3>
              <p className="text-gray-600">
                Não há entradas ou despesas registradas para {getMonthName()}
              </p>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Notification Modal */}
      <NotificationModal 
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
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
        onClose={handleCloseAllocationModal}
        onSuccess={handleAllocationSuccess}
        organization={organization}
        costCenters={costCenters}
        currentUser={orgUser}
      />
        
      </Header>
    </>
  );
}
