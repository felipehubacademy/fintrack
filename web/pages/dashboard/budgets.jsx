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
  Edit,
  Edit3,
  Trash2,
  PlusCircle,
  X,
  AlertTriangle,
  LogOut,
  Settings,
  Bell,
  Copy
} from 'lucide-react';
import Link from 'next/link';
import BudgetModal from '../../components/BudgetModal';
import NotificationModal from '../../components/NotificationModal';
import Header from '../../components/Header';
import BudgetWizard from '../../components/BudgetWizard';

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
  const { organization, user: orgUser, costCenters, budgetCategories, loading: orgLoading, error: orgError, isSoloUser } = useOrganization();
  const { success, showError, warning } = useNotificationContext();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
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
      await Promise.all([fetchBudgets(), fetchExpenses()]);
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

  const fetchExpenses = async () => {
    try {
      const startOfMonth = `${selectedMonth}-01`;
      const endOfMonth = new Date(selectedMonth + '-01');
      endOfMonth.setMonth(endOfMonth.getMonth() + 1);
      endOfMonth.setDate(0);

      let query = supabase
        .from('expenses')
        .select('*')
        .eq('status', 'confirmed')
        .gte('date', startOfMonth)
        .lte('date', endOfMonth.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (organization?.id && organization.id !== 'default-org') {
        query = query.eq('organization_id', organization.id);
      }

      const { data, error } = await query;
      if (!error) {
        setExpenses(data || []);
      }
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handleAddBudget = async (budgetData) => {
    try {
      const [year, month] = selectedMonth.split('-');
      const monthYear = `${year}-${month.padStart(2, '0')}-01`;

      const { error } = await supabase
        .from('budgets')
        .insert({
          organization_id: organization.id,
          category_id: budgetData.category_id,
          limit_amount: parseFloat(budgetData.limit_amount),
          month_year: monthYear
        });

      if (error) {
        // Verificar se é erro de duplicação
        if (error.code === '23505' && error.message.includes('budgets_unique_category_month')) {
          const categoryName = budgetData.category_name || 'esta categoria';
          warning(`Já existe um orçamento para ${categoryName} em ${selectedMonth}. Crie uma nova categoria se precisar de um orçamento diferente para o mesmo tipo de gasto.`);
          return;
        }
        throw error;
      }

      await fetchBudgets();
      success('Orçamento criado com sucesso!');
    } catch (error) {
      console.error('Erro ao criar orçamento:', error);
      showError('Erro ao criar orçamento: ' + (error.message || 'Erro desconhecido'));
    }
  };

  const handleEditBudget = async (budgetData) => {
    try {
      const { error } = await supabase
        .from('budgets')
        .update({
          category_id: budgetData.category_id,
          limit_amount: parseFloat(budgetData.limit_amount)
        })
        .eq('id', budgetData.id);

      if (error) {
        // Verificar se é erro de duplicação (se mudou a categoria)
        if (error.code === '23505' && error.message.includes('budgets_unique_category_month')) {
          const categoryName = budgetData.category_name || 'esta categoria';
          warning(`Já existe um orçamento para ${categoryName} em ${selectedMonth}. Crie uma nova categoria se precisar de um orçamento diferente para o mesmo tipo de gasto.`);
          return;
        }
        throw error;
      }

      await fetchBudgets();
      success('Orçamento atualizado com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar orçamento:', error);
      showError('Erro ao atualizar orçamento: ' + (error.message || 'Erro desconhecido'));
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
                <Button 
                  onClick={() => setShowBudgetModal(true)}
                  className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Orçamento
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
            <Card key={macro.key} className="border border-gray-200 shadow-sm">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-gray-900">
                    {macro.label}
                  </CardTitle>
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
        <div className="space-y-8">
          {macroSummary.map((macro) => {
            const isEditing = editingMacroKey === macro.key;
            const diffAbs = Math.abs(macroDraftDiff);
            const canSaveMacro = isEditing && macroDraftBalanced && !macroDraftHasOverspend && !savingMacro;

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
                    <Button variant="outline" onClick={() => openMacroEditor(macro)} className="flex items-center gap-2">
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
                              <span
                                className="w-10 h-10 rounded-full border-2 flex.items-center justify-center text-sm font-semibold"
                                style={{ borderColor: entry.color, color: entry.color }}
                              >
                                {entry.name[0]?.toUpperCase() || 'C'}
                              </span>
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

                      {availableMacroCategories.length > 0 ? (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-flight-blue/40 rounded-xl px-4 py-3">
                          <select
                            value={categoryToAdd}
                            onChange={(event) => setCategoryToAdd(event.target.value)}
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                          >
                            <option value="">Adicionar categoria...</option>
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
                    <div className="space-y-5">
                      {macro.categories.map((categoryItem) => {
                        const percentage = categoryItem.percentageUsed;
                        const statusLabel = getStatusLabel(categoryItem.status);
                        const originalBudget = budgets.find((item) => item.id === categoryItem.id) || null;

                        return (
                          <div
                            key={categoryItem.id}
                            className="flex flex-col gap-4 border border-gray-100 rounded-xl p-4 lg:flex-row lg:items-center lg:gap-6"
                          >
                            <div className="flex items-center gap-4 lg:w-[220px] lg:flex-shrink-0">
                              <span
                                className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold"
                                style={{ borderColor: categoryItem.color, color: categoryItem.color }}
                              >
                                {categoryItem.name[0]?.toUpperCase() || 'C'}
                              </span>
                              <div>
                                <p className="text-base font-semibold text-gray-900">{categoryItem.name}</p>
                                <p className="text-xs text-gray-500">
                                  {formatCurrency(categoryItem.amount)} orçados · {percentage.toFixed(1)}% usados
                                </p>
                              </div>
                            </div>
                            <div className="flex-1 w-full space-y-3 lg:pr-6">
                              <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                                <div
                                  className={`h-2 rounded-full ${
                                    categoryItem.status === 'danger'
                                      ? 'bg-red-500'
                                      : categoryItem.status === 'warning'
                                      ? 'bg-yellow-500'
                                      : 'bg-flight-blue'
                                  }`}
                                  style={{ width: `${Math.min(percentage, 100)}%` }}
                                />
                              </div>
                              <div className="flex items-center justify-between text-sm text-gray-600">
                                <span>
                                  Gasto: <strong className="text-gray-900">{formatCurrency(categoryItem.spent)}</strong>
                                </span>
                                <span className={`font-semibold ${getStatusTextColor(categoryItem.status)}`}>
                                  {statusLabel}
                                </span>
                                <span>
                                  Restante:{' '}
                                  <strong className={categoryItem.remaining < 0 ? 'text-red-600' : 'text-green-600'}>
                                    {formatCurrency(categoryItem.remaining)}
                                  </strong>
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 justify-end lg:w-[150px] lg:flex-shrink-0">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  const budgetToEdit = originalBudget || {
                                    id: categoryItem.id,
                                    category: categoryItem.name,
                                    category_id: categoryItem.category_id,
                                    amount: categoryItem.amount,
                                    spent: categoryItem.spent
                                  };
                                  setEditingBudget(budgetToEdit);
                                  setShowBudgetModal(true);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteBudget(categoryItem.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
                onClick={() => setShowBudgetModal(true)}
                className="bg-flight-blue hover:bg-flight-blue/90 border-2 border-flight-blue text-white shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Primeiro Orçamento
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
                        <span
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-semibold"
                          style={{ borderColor: entry.color, color: entry.color }}
                        >
                          {entry.name[0]?.toUpperCase() || 'C'}
                        </span>
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

              {availableMacroCategories.length > 0 ? (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-dashed border-flight-blue/40 rounded-xl px-4 py-3">
                  <select
                    value={categoryToAdd}
                    onChange={(event) => setCategoryToAdd(event.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:border-flight-blue focus:ring-2 focus:ring-flight-blue/30"
                  >
                    <option value="">Adicionar categoria...</option>
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

      {/* Budget Wizard */}
      {showBudgetWizard && (
        <BudgetWizard
          isOpen={showBudgetWizard}
          onClose={() => setShowBudgetWizard(false)}
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

      {/* Budget Modal */}
      {showBudgetModal && (
        <BudgetModal
          isOpen={showBudgetModal}
          onClose={() => {
            setShowBudgetModal(false);
            setEditingBudget(null);
          }}
          onSave={editingBudget ? handleEditBudget : handleAddBudget}
          editingBudget={editingBudget}
          categories={budgetCategories}
          selectedMonth={selectedMonth}
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
    </>
  );
}
