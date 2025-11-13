import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../../lib/supabaseClient';
import { useOrganization } from '../../hooks/useOrganization';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import LoadingLogo from '../../components/LoadingLogo';
import ConfirmationModal from '../../components/ConfirmationModal';
import {
  Target,
  Plus,
  TrendingDown,
  DollarSign,
  Calendar,
  Edit3,
  Trash2,
  PlusCircle,
  X,
  AlertTriangle,
  Copy,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import NotificationModal from '../../components/NotificationModal';
import Header from '../../components/Header';
import BudgetWizard from '../../components/BudgetWizard';
import CategoryManagementModal from '../../components/CategoryManagementModal';

const MACRO_ORDER = ['needs', 'wants', 'investments'];
const MACRO_LABELS = {
  needs: 'Necessidades',
  wants: 'Desejos',
  investments: 'Investimentos'
};
const MACRO_COLORS = {
  needs: '#2563EB',
  wants: '#8B5CF6',
  investments: '#0EA5E9'
};

const formatCurrency = (value) =>
  `R$ ${Number(value || 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;

const formatMonthYear = (value) => {
  if (!value) return null;
  const [year, month] = value.split('-');
  if (!year || !month) return null;
  return `${year}-${month.padStart(2, '0')}-01`;
};

const normalizeName = (value = '') =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const inferMacroFromName = (name = '') => {
  const normalized = normalizeName(name);

  if (normalized.match(/invest|poup|reserva|fundo|tesouro|acao|cripto/)) {
    return 'investments';
  }

  if (normalized.match(/lazer|educa|viag|assin|rest|roupa|hobby|diver/)) {
    return 'wants';
  }

  return 'needs';
};

export default function BudgetsDashboard() {
  const router = useRouter();
  const { organization, user: orgUser, budgetCategories, loading: orgLoading, error: orgError, isSoloUser } = useOrganization();
  const { success, showError, warning } = useNotificationContext();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showNotificationModal, setShowNotificationModal] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [showBudgetWizard, setShowBudgetWizard] = useState(false);
  const [editingMacroKey, setEditingMacroKey] = useState(null);
  const [editingMacroData, setEditingMacroData] = useState(null);
  const [macroDraft, setMacroDraft] = useState([]);
  const [macroDraftTarget, setMacroDraftTarget] = useState(0);
  const [categoryToAdd, setCategoryToAdd] = useState('');
  const [savingMacro, setSavingMacro] = useState(false);
  const [showMonthTurnoverModal, setShowMonthTurnoverModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [preSelectedMacro, setPreSelectedMacro] = useState(null);
  const [expandedMacro, setExpandedMacro] = useState(null);

  // Auto-open wizard on first access without budgets
  useEffect(() => {
    if (!isDataLoaded || budgets.length > 0) return;
    
    const currentMonth = selectedMonth;
    const dismissedKey = `dismissed_wizard_${currentMonth}`;
    const isDismissed = localStorage.getItem(dismissedKey);
    
    if (!isDismissed) {
      // Small delay to ensure smooth UX
      const timer = setTimeout(() => {
        setShowBudgetWizard(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isDataLoaded, budgets.length, selectedMonth]);

  // Detect month turnover
  useEffect(() => {
    if (!isDataLoaded) return;
    
    const currentMonth = selectedMonth;
    const lastCheckedMonth = localStorage.getItem('last_budget_check_month');
    
    // Update last checked month
    if (lastCheckedMonth !== currentMonth) {
      localStorage.setItem('last_budget_check_month', currentMonth);
      
      // If month changed AND no budgets for new month AND it's current month
      const isCurrentMonth = currentMonth === new Date().toISOString().slice(0, 7);
      if (lastCheckedMonth && budgets.length === 0 && isCurrentMonth) {
        const dismissedKey = `dismissed_turnover_${currentMonth}`;
        const isDismissed = localStorage.getItem(dismissedKey);
        
        if (!isDismissed) {
          setShowMonthTurnoverModal(true);
        }
      }
    }
  }, [isDataLoaded, budgets.length, selectedMonth]);

  useEffect(() => {
    if (!orgLoading && !orgError && organization) {
      fetchData();
    } else if (!orgLoading && orgError) {
      router.push('/');
    }
  }, [orgLoading, orgError, organization, selectedMonth]);
  
  const fetchData = async () => {
    setIsDataLoaded(false);
    try {
      await fetchBudgets();
      setIsDataLoaded(true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
    }
  };

  const fetchBudgets = async () => {
    try {
      if (!organization?.id) return;

      const [year, month] = selectedMonth.split('-');
      const monthNumber = parseInt(month);

      // Buscar orçamentos do mês selecionado
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
      const { data: budgetsData, error: budgetsError } = await supabase
        .from('budgets')
        .select(`
          *,
          category:category_id (
            id,
            name,
            description
          )
        `)
        .eq('organization_id', organization.id)
        .eq('month_year', startOfMonth);

      if (budgetsError) {
        console.error('Error fetching budgets:', budgetsError);
        return;
      }

      // Usar current_spent do banco (calculado pelo trigger)
      const budgetsWithSpent = (budgetsData || []).map(budget => {
        const spent = parseFloat(budget.current_spent || 0);
        const limit = parseFloat(budget.limit_amount || 0);

        return {
          id: budget.id,
          category: budget.category?.name || 'Sem categoria',
          category_id: budget.category_id, // Keep ID for editing
          amount: limit,
          spent: spent,
          month: selectedMonth,
          status: getBudgetStatus(spent, limit)
        };
      });

      setBudgets(budgetsWithSpent);
    } catch (error) {
      console.error('Error fetching budgets:', error);
    }
  };

  const handleDismissWizard = () => {
    const dismissedKey = `dismissed_wizard_${selectedMonth}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowBudgetWizard(false);
  };

  const handleDismissTurnover = () => {
    const dismissedKey = `dismissed_turnover_${selectedMonth}`;
    localStorage.setItem(dismissedKey, 'true');
    setShowMonthTurnoverModal(false);
  };

  const handleCopyPreviousBudget = async () => {
    try {
      // Get previous month
      const [year, month] = selectedMonth.split('-');
      const currentDate = new Date(year, month - 1, 1);
      const prevDate = new Date(currentDate);
      prevDate.setMonth(prevDate.getMonth() - 1);
      const prevMonth = prevDate.toISOString().slice(0, 7);
      const prevMonthYear = `${prevMonth}-01`;

      // Fetch previous month budgets
      const { data: prevBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month_year', prevMonthYear);

      if (fetchError) throw fetchError;

      if (!prevBudgets || prevBudgets.length === 0) {
        warning(`Não encontramos orçamentos em ${prevMonth}. Crie um novo planejamento.`);
        setShowMonthTurnoverModal(false);
        setShowBudgetWizard(true);
        return;
      }

      // Create budgets for current month
      const currentMonthYear = `${selectedMonth}-01`;
      const newBudgets = prevBudgets.map(budget => ({
        organization_id: organization.id,
        category_id: budget.category_id,
        limit_amount: budget.limit_amount,
        month_year: currentMonthYear
      }));

      const { error: insertError } = await supabase
        .from('budgets')
        .insert(newBudgets);

      if (insertError) throw insertError;

      await fetchData();
      success(`Planejamento copiado de ${prevMonth}!`);
      setShowMonthTurnoverModal(false);
    } catch (error) {
      console.error('Error copying budget:', error);
      showError('Erro ao copiar planejamento: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleDeleteBudget = (budgetId) => {
    setBudgetToDelete(budgetId);
    setActionToConfirm('delete');
    setShowConfirmModal(true);
  };

  const confirmDeleteBudget = async () => {
    if (!budgetToDelete) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budgetToDelete);

      if (error) throw error;

      await fetchBudgets();
      success('Orçamento excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir orçamento:', error);
      showError('Erro ao excluir orçamento: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setBudgetToDelete(null);
      setActionToConfirm(null);
    }
  };

  const handleCopyPreviousMonth = async () => {
    try {
      // Calcular o mês anterior
      const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);
      let previousYear = currentYear;
      let previousMonth = currentMonth - 1;
      
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = currentYear - 1;
      }

      // Formatar datas para month_year (YYYY-MM-DD)
      const currentMonthYear = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const previousMonthYear = `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`;

      // Buscar orçamentos do mês anterior
      const { data: previousBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month_year', previousMonthYear);

      if (fetchError) throw fetchError;

      if (!previousBudgets || previousBudgets.length === 0) {
        warning(`Não há orçamentos no mês anterior (${previousMonth.toString().padStart(2, '0')}/${previousYear}) para copiar.`);
        return;
      }

      // Verificar se já existem orçamentos no mês atual
      const { data: currentBudgets, error: currentError } = await supabase
        .from('budgets')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('month_year', currentMonthYear);

      if (currentError) throw currentError;

      if (currentBudgets && currentBudgets.length > 0) {
        setActionToConfirm('copy');
        setShowConfirmModal(true);
        return;
      }

      // Se não há orçamentos atuais, copiar diretamente
      await copyBudgetsToCurrentMonth(previousBudgets, currentMonthYear, previousMonth, previousYear);
    } catch (error) {
      console.error('Erro ao copiar orçamentos:', error);
      showError('Erro ao copiar orçamentos do mês anterior: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const copyBudgetsToCurrentMonth = async (previousBudgets, currentMonthYear, previousMonth, previousYear) => {
    // Copiar orçamentos do mês anterior para o mês atual
    const budgetsToInsert = previousBudgets.map(budget => ({
      organization_id: organization.id,
      category_id: budget.category_id,
      cost_center_id: budget.cost_center_id,
      limit_amount: budget.limit_amount,
      month_year: currentMonthYear,
      created_at: new Date().toISOString()
    }));

    const { error: insertError } = await supabase
      .from('budgets')
      .insert(budgetsToInsert);

    if (insertError) throw insertError;

    // Atualizar a lista de orçamentos
    await fetchBudgets();
    success(`Orçamentos de ${previousMonth.toString().padStart(2, '0')}/${previousYear} copiados com sucesso para ${selectedMonth}!`);
  };

  const confirmCopyBudgets = async () => {
    try {
      // Calcular o mês anterior
      const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);
      let previousYear = currentYear;
      let previousMonth = currentMonth - 1;
      
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = currentYear - 1;
      }

      // Formatar datas para month_year (YYYY-MM-DD)
      const currentMonthYear = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const previousMonthYear = `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`;

      // Buscar orçamentos do mês anterior
      const { data: previousBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month_year', previousMonthYear);

      if (fetchError) throw fetchError;

      // Excluir orçamentos atuais
      const { error: deleteError } = await supabase
        .from('budgets')
        .delete()
        .eq('organization_id', organization.id)
        .eq('month_year', currentMonthYear);

      if (deleteError) throw deleteError;

      // Copiar orçamentos do mês anterior para o mês atual
      await copyBudgetsToCurrentMonth(previousBudgets, currentMonthYear, previousMonth, previousYear);
    } catch (error) {
      console.error('Erro ao copiar orçamentos:', error);
      showError('Erro ao copiar orçamentos do mês anterior: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setShowConfirmModal(false);
      setActionToConfirm(null);
    }
  };

  const getBudgetStatus = (spent, amount) => {
    const percentage = (spent / amount) * 100;
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'danger':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'danger':
        return 'Excedido';
      case 'warning':
        return 'Atenção';
      default:
        return 'Dentro do Orçamento';
    }
  };

  const getStatusTextColor = (status) => {
    switch (status) {
      case 'danger':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-green-600';
    }
  };

  const openMacroEditor = (macro) => {
    setEditingMacroKey(macro.key);
    setEditingMacroData(macro);
    setMacroDraft(
      (macro.categories || []).map((category) => ({
        id: category.id,
        categoryId: category.category_id,
        name: category.name,
        amount: Number(category.amount || 0),
        spent: Number(category.spent || 0),
        color: category.color || MACRO_COLORS[macro.key] || '#2563EB'
      }))
    );
    setMacroDraftTarget(Number(macro.totalBudget || 0));
    setCategoryToAdd('');
  };

  const closeMacroEditor = () => {
    setEditingMacroKey(null);
    setEditingMacroData(null);
    setMacroDraft([]);
    setMacroDraftTarget(0);
    setCategoryToAdd('');
    setSavingMacro(false);
  };

  const availableMacroCategories = useMemo(() => {
    if (!editingMacroKey) return [];
    return (budgetCategories || [])
      .filter((category) => category.macro_group === editingMacroKey)
      .filter((category) => !macroDraft.some((entry) => entry.categoryId === category.id))
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [budgetCategories, editingMacroKey, macroDraft]);

  const macroDraftTotal = useMemo(
    () => macroDraft.reduce((sum, entry) => sum + Number(entry.amount || 0), 0),
    [macroDraft]
  );
  const macroDraftDiff = macroDraftTarget - macroDraftTotal;
  const macroDraftBalanced = Math.abs(macroDraftDiff) < 0.01;
  const macroDraftHasOverspend = macroDraft.some((entry) => entry.spent > entry.amount);
  const canSaveMacro = editingMacroKey !== null && macroDraftBalanced && !macroDraftHasOverspend && !savingMacro;

  const handleMacroTargetChange = (value) => {
    const next = Number(value);
    if (Number.isFinite(next) && next >= 0) {
      setMacroDraftTarget(next);
    } else {
      setMacroDraftTarget(0);
    }
  };

  const handleMacroAmountChange = (index, value) => {
    const next = Number(value);
    setMacroDraft((prev) => {
      const draft = [...prev];
      draft[index] = {
        ...draft[index],
        amount: Number.isFinite(next) && next >= 0 ? next : 0
      };
      return draft;
    });
  };

  const handleAddMacroCategory = () => {
    if (!categoryToAdd) return;
    const category = availableMacroCategories.find((item) => item.id === categoryToAdd);
    if (!category) return;

    setMacroDraft((prev) =>
      [...prev, {
        id: null,
        categoryId: category.id,
        name: category.name,
        amount: 0,
        spent: 0,
        color: category.color || MACRO_COLORS[category.macro_group] || '#2563EB'
      }].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))
    );
    setCategoryToAdd('');
  };

  const handleRemoveMacroCategory = (index) => {
    const entry = macroDraft[index];
    if (entry && entry.spent > 0) {
      warning('Não é possível remover uma categoria que já possui gastos. Ajuste o valor para zero caso não deseje mais acompanhá-la.');
      return;
    }
    setMacroDraft((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveMacro = async () => {
    if (!editingMacroData) return;
    if (!macroDraftBalanced) {
      warning('A soma das categorias precisa fechar exatamente o valor planejado para a macro.');
      return;
    }
    if (macroDraftHasOverspend) {
      warning('Algumas categorias possuem gastos maiores do que o valor planejado. Ajuste os valores antes de salvar.');
      return;
    }

    const monthYear = formatMonthYear(selectedMonth);
    if (!monthYear) {
      showError('Mês selecionado inválido.');
      return;
    }

    const updates = [];
    const inserts = [];
    const deletes = [];

    const originalIds = (editingMacroData.categories || [])
      .map((category) => category.id)
      .filter(Boolean);

    macroDraft.forEach((entry) => {
      const amount = Number(entry.amount || 0);
      if (amount <= 0) {
        if (entry.id) {
          deletes.push(entry.id);
        }
        return;
      }

      if (entry.id) {
        updates.push({ id: entry.id, amount });
      } else {
        inserts.push({
          organization_id: organization.id,
          category_id: entry.categoryId,
          limit_amount: amount,
          month_year: monthYear
        });
      }
    });

    originalIds.forEach((id) => {
      if (!macroDraft.some((entry) => entry.id === id && entry.amount > 0)) {
        deletes.push(id);
      }
    });

    setSavingMacro(true);
    try {
      if (deletes.length) {
        await supabase.from('budgets').delete().in('id', deletes);
      }

      if (updates.length) {
        await Promise.all(
          updates.map((entry) =>
            supabase.from('budgets').update({ limit_amount: entry.amount }).eq('id', entry.id)
          )
        );
      }

      if (inserts.length) {
        await supabase.from('budgets').insert(inserts);
      }

      success('Macro atualizada com sucesso!');
      await fetchBudgets();
      closeMacroEditor();
    } catch (error) {
      console.error('Erro ao salvar macro:', error);
      showError('Erro ao salvar macro. Tente novamente.');
    } finally {
      setSavingMacro(false);
    }
  };

  const categoryMap = useMemo(() => {
    const map = new Map();
    (budgetCategories || []).forEach((category) => {
      map.set(category.id, category);
    });
    return map;
  }, [budgetCategories]);

  const macroSummary = useMemo(() => {
    const groups = MACRO_ORDER.reduce((acc, key) => {
      acc[key] = {
        key,
        label: MACRO_LABELS[key],
        color: MACRO_COLORS[key],
        totalBudget: 0,
        totalSpent: 0,
        categories: []
      };
      return acc;
    }, {});

    budgets.forEach((budget) => {
      const categoryInfo = categoryMap.get(budget.category_id);
      const macroGroup = categoryInfo?.macro_group || inferMacroFromName(budget.category);
      const color = categoryInfo?.color || MACRO_COLORS[macroGroup] || '#2563EB';
      const amount = Number(budget.amount || 0);
      const spent = Number(budget.spent || 0);

      const targetGroup = groups[macroGroup] || groups.needs;
      targetGroup.totalBudget += amount;
      targetGroup.totalSpent += spent;
      targetGroup.categories.push({
        id: budget.id,
        name: budget.category,
        category_id: budget.category_id,
        amount,
        spent,
        remaining: amount - spent,
        percentageUsed: amount > 0 ? (spent / amount) * 100 : 0,
        status: getBudgetStatus(spent, amount),
        color
      });
    });

    return MACRO_ORDER.map((key) => {
      const group = groups[key];
      const remaining = group.totalBudget - group.totalSpent;
      const progress = group.totalBudget > 0 ? (group.totalSpent / group.totalBudget) * 100 : 0;
      group.categories.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      return {
        ...group,
        remaining,
        progress,
        status: getBudgetStatus(group.totalSpent, group.totalBudget)
      };
    });
  }, [budgets, categoryMap]);

  const totalBudgetValue = useMemo(
    () => macroSummary.reduce((sum, macro) => sum + macro.totalBudget, 0),
    [macroSummary]
  );
  const totalSpentValue = useMemo(
    () => macroSummary.reduce((sum, macro) => sum + macro.totalSpent, 0),
    [macroSummary]
  );
  const totalRemainingValue = totalBudgetValue - totalSpentValue;

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
          <p className="text-gray-600 mb-4">Você precisa ser convidado para uma organização.</p>
          <Button onClick={() => router.push('/')}>
            Voltar ao início
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header 
        organization={organization}
        user={orgUser}
        pageTitle="Orçamentos"
      >
        <main className="flex-1 px-4 sm:px-6 lg:px-8 xl:px-16 2xl:px-24 py-8 space-y-8">
        
        {/* Header Actions */}
        <Card className="border-0 bg-white" style={{ boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 0 1px rgba(0, 0, 0, 0.05)' }}>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
              <h2 className="text-lg font-semibold text-gray-900">Gestão de Orçamentos</h2>
              <div className="flex items-center space-x-3">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-flight-blue focus:border-transparent"
                />
                <Button 
                  onClick={() => setShowBudgetWizard(true)}
                  variant="outline"
                  className="border-flight-blue text-flight-blue hover:bg-flight-blue/10"
                >
                  <Target className="h-4 w-4 mr-2" />
                  Planejamento Guiado
                </Button>
                <Button 
                  onClick={handleCopyPreviousMonth}
                  variant="outline"
                  className="border-gray-300 text-gray-700 hover:bg-gray-50"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar Mês Anterior
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Orçado
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/10">
                <Target className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {totalBudgetValue.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Gasto
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/10">
                <TrendingDown className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {totalSpentValue.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3">
              <CardTitle className="text-sm font-medium text-gray-600">
                Restante
              </CardTitle>
              <div className="p-2 rounded-lg bg-flight-blue/10">
                <DollarSign className="h-4 w-4 text-flight-blue" />
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                R$ {totalRemainingValue.toLocaleString('pt-BR')}
              </div>
            </CardContent>
          </Card>

        </div>

        {/* Macro Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {macroSummary.map((macro) => (
            <Card 
              key={macro.key} 
              className="border border-gray-200 shadow-sm cursor-pointer hover:border-flight-blue/40 transition-all duration-200"
              onClick={() => setExpandedMacro(expandedMacro === macro.key ? null : macro.key)}
            >
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-semibold text-gray-900">
                      {macro.label}
                    </CardTitle>
                    {expandedMacro === macro.key ? (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-gray-500" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-500">
                    {macro.totalBudget > 0 ? `${macro.progress.toFixed(1)}% usado` : 'Sem orçamento'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${Math.min(macro.progress, 100)}%`,
                      backgroundColor: macro.color
                    }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Orçado</p>
                    <p className="font-semibold text-gray-900">
                      R$ {macro.totalBudget.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Gasto</p>
                    <p className="font-semibold text-gray-900">
                      R$ {macro.totalSpent.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Restante</p>
                    <p className={`font-semibold ${macro.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                      R$ {macro.remaining.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Macro Details */}
        {expandedMacro ? (
          <div className="space-y-8">
            {macroSummary.filter(macro => macro.key === expandedMacro).map((macro) => {
              const isEditing = editingMacroKey === macro.key;
              const diffAbs = Math.abs(macroDraftDiff);

              return (
                <Card key={macro.key} className="border border-gray-200 shadow-sm">
                <CardHeader className="space-y-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-lg text-gray-900">{macro.label}</CardTitle>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 text-sm text-gray-500">
                        <span>Orçado: <strong className="text-gray-900">{formatCurrency(macro.totalBudget)}</strong></span>
                        <span>Gasto: <strong className="text-gray-900">{formatCurrency(macro.totalSpent)}</strong></span>
                        <span>
                          Restante:{' '}
                          <strong className={macro.remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                            {formatCurrency(macro.remaining)}
                          </strong>
                        </span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        openMacroEditor(macro);
                      }} 
                      className="flex items-center gap-2"
                    >
                      <Edit3 className="h-4 w-4" />
                      Editar macro
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <div className="space-y-5">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-sm font-medium text-gray-600">Valor total planejado</div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500">R$</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={macroDraftTarget}
                            onChange={(event) => handleMacroTargetChange(event.target.value)}
                            className="w-40 rounded-lg border border-gray-300 px-3 py-2 text-right focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        {macroDraft.map((entry, index) => (
                          <div
                            key={`${entry.categoryId}-${index}`}
                            className="grid gap-4 border border-gray-100 rounded-xl p-4 lg:grid-cols-[260px_minmax(0,1fr)_auto] items-start"
                          >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 min-w-[2.5rem] rounded-full border-2 flex items-center justify-center text-sm font-semibold flex-shrink-0"
                          style={{ borderColor: entry.color, color: entry.color }}
                        >
                          {entry.name[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-gray-900">{entry.name}</p>
                          <p className="text-xs text-gray-500">Já gasto: {formatCurrency(entry.spent)}</p>
                        </div>
                      </div>
                            <div className="space-y-3">
                              <label className="text-sm font-medium text-gray-600">Valor planejado</label>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={entry.amount}
                                onChange={(event) => handleMacroAmountChange(index, event.target.value)}
                                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                              />
                              {entry.spent > entry.amount && (
                                <div className="flex items-start gap-2 text-xs text-red-600">
                                  <AlertTriangle className="h-4 w-4" />
                                  <span>
                                    Valor menor que o já gasto. Ajuste para pelo menos {formatCurrency(entry.spent)}.
                                  </span>
                                </div>
                              )}
                            </div>
                            <div className="flex justify-end">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveMacroCategory(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="space-y-3">
                        {availableMacroCategories.length > 0 ? (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-flight-blue/40 rounded-xl px-4 py-3">
                            <select
                              value={categoryToAdd}
                              onChange={(event) => setCategoryToAdd(event.target.value)}
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                            >
                              <option value="">Adicionar categoria existente...</option>
                              {availableMacroCategories.map((category) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </select>
                            <Button onClick={handleAddMacroCategory} disabled={!categoryToAdd} className="flex items-center gap-2">
                              <PlusCircle className="h-4 w-4" />
                              Adicionar
                            </Button>
                          </div>
                        ) : (
                          <div className="text-sm text-gray-500">
                            Todas as categorias dessa macro já estão presentes neste planejamento.
                          </div>
                        )}
                        
                        <div className="flex items-center justify-center">
                          <span className="text-sm text-gray-500">ou</span>
                        </div>
                        
                        <Button
                          variant="outline"
                          onClick={() => {
                            // Abrir modal de categorias inline
                            setPreSelectedMacro(macro.key);
                            setShowCategoryModal(true);
                          }}
                          className="w-full border-dashed border-2 border-flight-blue/40 text-flight-blue hover:bg-flight-blue/5"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar nova categoria para esta macro
                        </Button>
                      </div>

                      <div
                        className={`rounded-xl border px-4 py-3 text-sm ${
                          macroDraftBalanced
                            ? 'border-green-200 bg-green-50 text-green-700'
                            : macroDraftDiff > 0
                            ? 'border-amber-200 bg-amber-50 text-amber-700'
                            : 'border-red-200 bg-red-50 text-red-700'
                        }`}
                      >
                        {macroDraftBalanced
                          ? 'Distribuição fechada em 100% do valor planejado.'
                          : macroDraftDiff > 0
                          ? `Faltam ${formatCurrency(diffAbs)} para distribuir.`
                          : `Excedeu ${formatCurrency(diffAbs)} do valor planejado.`}
                      </div>
                      {macroDraftHasOverspend && (
                        <div className="flex items-start gap-2 text-sm text-red-600">
                          <AlertTriangle className="h-4 w-4 mt-0.5" />
                          <span>
                            Algumas categorias possuem gastos maiores do que o valor planejado. Ajuste os valores antes de salvar.
                          </span>
                        </div>
                      )}
                    </div>
                  ) : macro.categories.length ? (
                    <div className="space-y-2">
                      {/* Header da Tabela */}
                      <div className="grid grid-cols-[48px_180px_1fr_120px_120px_120px_80px] gap-3 px-3 pb-2 text-xs font-medium text-gray-500">
                        <div></div>
                        <div>Categoria</div>
                        <div>Progresso</div>
                        <div className="text-right">Orçado</div>
                        <div className="text-right">Gasto</div>
                        <div className="text-right">Restante</div>
                        <div className="text-center">Status</div>
                      </div>

                      {/* Linhas da Tabela */}
                      {macro.categories.map((categoryItem) => {
                        const percentage = categoryItem.percentageUsed;
                        const statusLabel = getStatusLabel(categoryItem.status);

                        return (
                          <div
                            key={categoryItem.id}
                            className="grid grid-cols-[48px_180px_1fr_120px_120px_120px_80px] gap-3 items-center border border-gray-100 rounded-lg px-3 h-12"
                          >
                            {/* Avatar */}
                            <div
                              className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-semibold"
                              style={{ borderColor: categoryItem.color, color: categoryItem.color }}
                            >
                              {categoryItem.name[0]?.toUpperCase() || 'C'}
                            </div>
                            
                            {/* Nome */}
                            <div className="truncate">
                              <p className="text-sm font-semibold text-gray-900 truncate">{categoryItem.name}</p>
                            </div>

                            {/* Barra de Progresso */}
                            <div className="bg-gray-200 h-2 rounded-full overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  categoryItem.status === 'danger'
                                    ? 'bg-red-500'
                                    : categoryItem.status === 'warning'
                                    ? 'bg-yellow-500'
                                    : 'bg-flight-blue'
                                }`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>

                            {/* Orçado */}
                            <div className="text-right text-xs">
                              <span className="font-semibold text-gray-900">{formatCurrency(categoryItem.amount)}</span>
                            </div>

                            {/* Gasto */}
                            <div className="text-right text-xs">
                              <span className="font-semibold text-gray-900">{formatCurrency(categoryItem.spent)}</span>
                            </div>

                            {/* Restante */}
                            <div className="text-right text-xs">
                              <span className={`font-semibold ${categoryItem.remaining < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(categoryItem.remaining)}
                              </span>
                            </div>

                            {/* Status Badge */}
                            <div className="flex justify-center">
                              <Badge className={getStatusColor(categoryItem.status)}>
                                {percentage.toFixed(0)}%
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 text-center py-8 bg-gray-50 rounded-xl">
                      Nenhum orçamento cadastrado nesta macro para o mês selecionado.
                    </div>
                  )}
                </CardContent>
              </Card>
              );
            })}
          </div>
        ) : budgets.length > 0 && (
          <Card className="border border-flight-blue/20 bg-flight-blue/5">
            <CardContent className="p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <ChevronDown className="h-8 w-8 text-flight-blue animate-bounce" />
                <p className="text-gray-600">
                  Clique em uma das macros acima para ver e gerenciar suas subcategorias
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {budgets.length === 0 && (
          <Card className="border border-flight-blue/20 bg-flight-blue/5 shadow-lg hover:shadow-xl transition-all duration-200">
            <CardContent className="p-12 text-center">
              <div className="p-4 bg-gray-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Target className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum orçamento definido</h3>
              <p className="text-gray-600 mb-6">Configure suas metas mensais para ter controle total sobre seus gastos.</p>
              <Button 
                onClick={() => setShowBudgetWizard(true)}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Target className="h-4 w-4 mr-2" />
                Criar Planejamento Guiado
              </Button>
            </CardContent>
          </Card>
        )}
      </main>
      </Header>

      {editingMacroData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6">
          <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col">
            <header className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">Editar macro · {MACRO_LABELS[editingMacroKey]}</h3>
                <p className="text-sm text-gray-500">Ajuste o valor total e distribua entre as categorias vinculadas a esta macro.</p>
              </div>
              <Button variant="ghost" size="icon" onClick={closeMacroEditor}>
                <X className="h-5 w-5" />
              </Button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-500">Valor planejado</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(macroDraftTarget)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-500">Distribuído</p>
                  <p className="text-lg font-semibold text-gray-900">{formatCurrency(macroDraftTotal)}</p>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-sm text-gray-500">Diferença</p>
                  <p className={`text-lg font-semibold ${macroDraftDiff < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(macroDraftDiff)}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-gray-700" htmlFor="macro-total-input">
                  Ajustar valor total planejado
                </label>
                <div className="flex items-center gap-2 max-w-xs">
                  <span className="text-gray-500">R$</span>
                  <input
                    id="macro-total-input"
                    type="number"
                    min="0"
                    step="0.01"
                    value={macroDraftTarget}
                    onChange={(event) => handleMacroTargetChange(event.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                  />
                </div>
              </div>

              {macroDraft.length ? (
                <div className="space-y-4">
                  {macroDraft.map((entry, index) => (
                    <div
                      key={`${entry.categoryId}-${index}`}
                      className="grid gap-4 border border-gray-100 rounded-xl p-4 lg:grid-cols-[260px_minmax(0,1fr)_auto] items-start"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 min-w-[2.5rem] rounded-full border-2 flex items-center justify-center text-sm font-semibold flex-shrink-0"
                          style={{ borderColor: entry.color, color: entry.color }}
                        >
                          {entry.name[0]?.toUpperCase() || 'C'}
                        </div>
                        <div>
                          <p className="text-base font-semibold text-gray-900">{entry.name}</p>
                          <p className="text-xs text-gray-500">Já gasto: {formatCurrency(entry.spent)}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-600">Valor planejado</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={entry.amount}
                          onChange={(event) => handleMacroAmountChange(index, event.target.value)}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-right focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                        />
                        {entry.spent > entry.amount && (
                          <div className="flex items-start gap-2 text-xs text-red-600">
                            <AlertTriangle className="h-4 w-4" />
                            <span>
                              Valor menor que o já gasto. Ajuste para pelo menos {formatCurrency(entry.spent)}.
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-end">
                        <Button variant="ghost" size="icon" onClick={() => handleRemoveMacroCategory(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-6 text-sm text-gray-500 text-center">
                  Nenhuma categoria adicionada ainda. Utilize o seletor abaixo para incluir novas categorias nesta macro.
                </div>
              )}

              <div className="space-y-3">
                {availableMacroCategories.length > 0 ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-flight-blue/40 rounded-xl px-4 py-3">
                    <select
                      value={categoryToAdd}
                      onChange={(event) => setCategoryToAdd(event.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                    >
                      <option value="">Adicionar categoria existente...</option>
                      {availableMacroCategories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                    <Button onClick={handleAddMacroCategory} disabled={!categoryToAdd} className="flex items-center gap-2">
                      <PlusCircle className="h-4 w-4" />
                      Adicionar
                    </Button>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">
                    Todas as categorias dessa macro já estão presentes neste planejamento.
                  </div>
                )}
                
                <div className="flex items-center justify-center">
                  <span className="text-sm text-gray-500">ou</span>
                </div>
                
                <Button
                  variant="outline"
                  onClick={() => {
                    // Abrir modal de categorias inline
                    setPreSelectedMacro(editingMacroKey);
                    setShowCategoryModal(true);
                  }}
                  className="w-full border-dashed border-2 border-flight-blue/40 text-flight-blue hover:bg-flight-blue/5"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar nova categoria para esta macro
                </Button>
              </div>

              <div
                className={`rounded-xl border px-4 py-3 text-sm ${
                  macroDraftBalanced
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : macroDraftDiff > 0
                    ? 'border-amber-200 bg-amber-50 text-amber-700'
                    : 'border-red-200 bg-red-50 text-red-700'
                }`}
              >
                {macroDraftBalanced
                  ? 'Distribuição fechada em 100% do valor planejado.'
                  : macroDraftDiff > 0
                  ? `Faltam ${formatCurrency(diffAbs)} para distribuir.`
                  : `Excedeu ${formatCurrency(diffAbs)} do valor planejado.`}
              </div>
              {macroDraftHasOverspend && (
                <div className="flex items-start gap-2 text-sm text-red-600">
                  <AlertTriangle className="h-4 w-4 mt-0.5" />
                  <span>
                    Algumas categorias possuem gastos maiores do que o valor planejado. Ajuste os valores antes de salvar.
                  </span>
                </div>
              )}
            </div>
            <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 border-t border-gray-200 px-6 py-4">
              <Button variant="outline" onClick={closeMacroEditor} disabled={savingMacro}>
                Cancelar
              </Button>
              <Button onClick={handleSaveMacro} disabled={!canSaveMacro}>
                {savingMacro ? 'Salvando...' : 'Salvar macro'}
              </Button>
            </footer>
          </div>
        </div>
      )}

      {/* Month Turnover Modal */}
      {showMonthTurnoverModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-flight-blue" />
              <h2 className="text-xl font-bold text-gray-900">Novo Mês Detectado!</h2>
            </div>
            <p className="text-gray-600">
              Você ainda não tem um planejamento para este mês. O que deseja fazer?
            </p>
            <div className="space-y-3">
              <Button 
                onClick={handleCopyPreviousBudget}
                className="w-full justify-center"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar planejamento do mês anterior
              </Button>
              <Button 
                onClick={() => {
                  setShowMonthTurnoverModal(false);
                  setShowBudgetWizard(true);
                }}
                variant="outline"
                className="w-full justify-center border-flight-blue text-flight-blue hover:bg-flight-blue/10"
              >
                <Target className="h-4 w-4 mr-2" />
                Criar novo planejamento
              </Button>
              <Button 
                onClick={handleDismissTurnover}
                variant="ghost"
                className="w-full justify-center text-gray-500"
              >
                Depois
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Budget Wizard */}
      {showBudgetWizard && (
        <BudgetWizard
          isOpen={showBudgetWizard}
          onClose={handleDismissWizard}
          organization={organization}
          budgetCategories={budgetCategories}
          selectedMonth={selectedMonth}
          isSoloUser={isSoloUser}
          onComplete={async () => {
            await fetchData();
            setShowBudgetWizard(false);
          }}
        />
      )}

      {showNotificationModal && (
        <NotificationModal 
          isOpen={showNotificationModal}
          onClose={() => setShowNotificationModal(false)}
        />
      )}

      {showConfirmModal && (
        <ConfirmationModal
          isOpen={showConfirmModal}
          onClose={() => {
            setShowConfirmModal(false);
            setBudgetToDelete(null);
            setActionToConfirm(null);
          }}
          onConfirm={actionToConfirm === 'delete' ? confirmDeleteBudget : confirmCopyBudgets}
          title={actionToConfirm === 'delete' ? "Confirmar exclusão" : "Confirmar cópia de orçamentos"}
          message={
            actionToConfirm === 'delete' 
              ? "Tem certeza que deseja excluir este orçamento? Esta ação não pode ser desfeita."
              : `Já existem orçamentos para ${selectedMonth}. Deseja substituí-los pelos orçamentos do mês anterior?`
          }
          confirmText={actionToConfirm === 'delete' ? "Excluir" : "Substituir"}
          cancelText="Cancelar"
          type={actionToConfirm === 'delete' ? "danger" : "warning"}
        />
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <CategoryManagementModal
          isOpen={showCategoryModal}
          onClose={() => {
            setShowCategoryModal(false);
            setPreSelectedMacro(null);
            fetchData(); // Recarregar budgets e categorias
          }}
          organization={organization}
          preSelectedMacro={preSelectedMacro}
          preSelectedTab="expense"
        />
      )}
    </>
  );
}
