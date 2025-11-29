import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import { Target, TrendingDown, AlertTriangle, Plus, Copy, ChevronDown, ChevronUp, Edit, Trash2, DollarSign } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { Text, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { MonthSelector } from '../components/financial/MonthSelector';
import { StatCard } from '../components/financial/StatCard';
import { BudgetModal } from '../components/financial/BudgetModal';
import { BudgetWizard } from '../components/financial/BudgetWizard';
import { useOrganization } from '../hooks/useOrganization';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useAlert } from '../components/ui/AlertProvider';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const MACRO_ORDER = ['needs', 'wants', 'investments'];
const MACRO_LABELS = {
  needs: 'Necessidades',
  wants: 'Desejos',
  investments: 'Investimentos'
};
const MACRO_COLORS = {
  needs: '#2563EB',
  wants: '#8B5CF6',
  investments: '#10B981'
};

const inferMacroFromName = (name = '') => {
  const normalized = name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

  if (normalized.match(/invest|poup|reserva|fundo|tesouro|acao|cripto/)) {
    return 'investments';
  }

  if (normalized.match(/lazer|educa|viag|assin|rest|roupa|hobby|diver/)) {
    return 'wants';
  }

  return 'needs';
};

export default function BudgetsScreen() {
  const { organization, user, budgetCategories, loading: orgLoading, isSoloUser } = useOrganization();
  const { confirm } = useConfirmation();
  const { alert } = useAlert();
  const { showToast } = useToast();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  });
  const [budgets, setBudgets] = useState([]);
  const [expandedMacro, setExpandedMacro] = useState(null);
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [showBudgetWizard, setShowBudgetWizard] = useState(false);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchBudgets();
    }
  }, [orgLoading, organization?.id, selectedMonth]);

  // Auto-open wizard when no budgets exist
  useEffect(() => {
    if (!isDataLoaded || budgets.length > 0) return;

    const checkAndOpenWizard = async () => {
      const currentMonth = selectedMonth;
      const dismissedKey = `dismissed_wizard_${currentMonth}`;
      const isDismissed = await AsyncStorage.getItem(dismissedKey);

      if (!isDismissed) {
        // Small delay to ensure smooth UX
        setTimeout(() => {
          setShowBudgetWizard(true);
        }, 500);
      }
    };

    checkAndOpenWizard();
  }, [isDataLoaded, budgets.length, selectedMonth]);

  // Detect month turnover
  useEffect(() => {
    if (!isDataLoaded) return;

    const checkMonthTurnover = async () => {
      const currentMonth = selectedMonth;
      const lastCheckedMonth = await AsyncStorage.getItem('last_budget_check_month');

      // Update last checked month
      if (lastCheckedMonth !== currentMonth) {
        await AsyncStorage.setItem('last_budget_check_month', currentMonth);

        // If month changed AND no budgets for new month AND it's current month
        const now = new Date();
        const isCurrentMonth = currentMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        if (lastCheckedMonth && budgets.length === 0 && isCurrentMonth) {
          const dismissedKey = `dismissed_turnover_${currentMonth}`;
          const isDismissed = await AsyncStorage.getItem(dismissedKey);

          if (!isDismissed) {
            alert({
              title: 'Novo Mês Detectado!',
              message: 'Detectamos que estamos em um novo mês. Deseja copiar o planejamento do mês anterior ou criar um novo?',
              type: 'info',
              buttons: [
                {
                  text: 'Copiar anterior',
                  onPress: async () => {
                    await handleCopyPreviousMonth();
                    await AsyncStorage.setItem(dismissedKey, 'true');
                  },
                },
                {
                  text: 'Criar novo',
                  onPress: () => {
                    setShowBudgetWizard(true);
                    AsyncStorage.setItem(dismissedKey, 'true');
                  },
                },
                {
                  text: 'Depois',
                  onPress: () => {
                    AsyncStorage.setItem(dismissedKey, 'true');
                  },
                },
              ],
            });
          }
        }
      }
    };

    checkMonthTurnover();
  }, [isDataLoaded, selectedMonth, budgets.length]);

  const fetchBudgets = async () => {
    try {
      if (!organization?.id) {
        return;
      }

      setLoading(true);

      const [year, month] = selectedMonth.split('-');
      const monthYear = `${year}-${month.padStart(2, '0')}-01`;

      // Buscar orçamentos do mês selecionado
      const { data: budgetsData, error } = await supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month_year', monthYear);

      if (error) {
        throw error;
      }

      // Buscar categorias de orçamento se não foram carregadas pelo hook
      let categoriesToUse = budgetCategories;
      if (!categoriesToUse || categoriesToUse.length === 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('budget_categories')
          .select('*')
          .or(`organization_id.eq.${organization.id},organization_id.is.null`)
          .order('name');
        
        if (!categoriesError) {
          categoriesToUse = categoriesData || [];
        }
      }

      // Criar mapa de categorias para lookup rápido
      const categoryMap = new Map();
      (categoriesToUse || []).forEach((cat) => {
        if (cat && cat.id) {
          categoryMap.set(cat.id, cat);
        }
      });

      // Usar current_spent do banco (calculado pelo trigger)
      const budgetsWithSpent = (budgetsData || []).map(budget => {
        const spent = parseFloat(budget.current_spent || 0);
        const limit = parseFloat(budget.limit_amount || 0);
        const category = categoryMap.get(budget.category_id);

        return {
          id: budget.id,
          category: category?.name || 'Sem categoria',
          category_id: budget.category_id,
          amount: limit,
          spent: spent,
          month: selectedMonth,
          status: getBudgetStatus(spent, limit),
          color: category?.color || colors.brand.primary,
          macro_group: category?.macro_group || inferMacroFromName(category?.name || '')
        };
      });

      setBudgets(budgetsWithSpent);
      setIsDataLoaded(true);
    } catch (error) {
      showToast('Erro ao carregar orçamentos', 'error');
      setIsDataLoaded(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const getBudgetStatus = (spent, amount) => {
    if (amount === 0) return 'success';
    const percentage = (spent / amount) * 100;
    if (percentage >= 100) return 'danger';
    if (percentage >= 80) return 'warning';
    return 'success';
  };

  // Buscar categorias se não foram carregadas pelo hook
  const [localCategories, setLocalCategories] = useState([]);
  
  useEffect(() => {
    const loadCategories = async () => {
      if (budgetCategories && budgetCategories.length > 0) {
        setLocalCategories(budgetCategories);
        return;
      }
      
      if (!organization?.id) return;
      
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('budget_categories')
        .select('*')
        .or(`organization_id.eq.${organization.id},organization_id.is.null`)
        .order('name');
      
      if (!categoriesError && categoriesData) {
        setLocalCategories(categoriesData);
      }
    };
    
    if (!orgLoading && organization) {
      loadCategories();
    }
  }, [organization?.id, budgetCategories, orgLoading]);

  const categoryMap = useMemo(() => {
    const categoriesToMap = localCategories.length > 0 ? localCategories : (budgetCategories || []);
    const map = new Map();
    categoriesToMap.forEach((category) => {
      if (category && category.id) {
        map.set(category.id, category);
      }
    });
    return map;
  }, [localCategories, budgetCategories]);

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
      const macroGroup = budget.macro_group || inferMacroFromName(budget.category);
      const color = budget.color || MACRO_COLORS[macroGroup] || colors.brand.primary;
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

  const handleCopyPreviousMonth = async () => {
    try {
      const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);
      let previousYear = currentYear;
      let previousMonth = currentMonth - 1;
      
      if (previousMonth === 0) {
        previousMonth = 12;
        previousYear = currentYear - 1;
      }

      const currentMonthYear = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const previousMonthYear = `${previousYear}-${previousMonth.toString().padStart(2, '0')}-01`;

      const { data: previousBudgets, error: fetchError } = await supabase
        .from('budgets')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('month_year', previousMonthYear);

      if (fetchError) throw fetchError;

      if (!previousBudgets || previousBudgets.length === 0) {
        alert({
          title: 'Atenção',
          message: `Não há orçamentos no mês anterior (${previousMonth.toString().padStart(2, '0')}/${previousYear}) para copiar.`,
          type: 'warning',
        });
        return;
      }

      const confirmed = await confirm({
        title: 'Copiar orçamentos',
        message: `Copiar orçamentos de ${previousMonth.toString().padStart(2, '0')}/${previousYear} para ${selectedMonth}?`,
        type: 'info',
      });

      if (!confirmed) return;

      // Verificar se já existem orçamentos no mês atual
      const { data: currentBudgets } = await supabase
        .from('budgets')
        .select('id')
        .eq('organization_id', organization.id)
        .eq('month_year', currentMonthYear);

      if (currentBudgets && currentBudgets.length > 0) {
        const overwriteConfirmed = await confirm({
          title: 'Sobrescrever orçamentos',
          message: 'Já existem orçamentos para este mês. Deseja sobrescrever?',
          type: 'warning',
        });

        if (!overwriteConfirmed) return;

        // Excluir orçamentos atuais
        await supabase
          .from('budgets')
          .delete()
          .eq('organization_id', organization.id)
          .eq('month_year', currentMonthYear);
      }

      // Copiar orçamentos
      const budgetsToInsert = previousBudgets.map(budget => ({
        organization_id: organization.id,
        category_id: budget.category_id,
        cost_center_id: budget.cost_center_id,
        limit_amount: budget.limit_amount,
        month_year: currentMonthYear,
      }));

      const { error: insertError } = await supabase
        .from('budgets')
        .insert(budgetsToInsert);

      if (insertError) throw insertError;

      await fetchBudgets();
      showToast(`Orçamentos copiados com sucesso!`, 'success');
    } catch (error) {
      showToast('Erro ao copiar orçamentos: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const handleSaveBudget = async (budgetData) => {
    try {
      const [year, month] = selectedMonth.split('-');
      const monthYear = `${year}-${month.padStart(2, '0')}-01`;

      if (budgetData.id) {
        // Editar
        const { error } = await supabase
          .from('budgets')
          .update({ limit_amount: budgetData.limit_amount })
          .eq('id', budgetData.id);

        if (error) throw error;
        showToast('Orçamento atualizado com sucesso!', 'success');
      } else {
        // Criar
        const { error } = await supabase
          .from('budgets')
          .insert({
            organization_id: organization.id,
            category_id: budgetData.category_id,
            limit_amount: budgetData.limit_amount,
            month_year: monthYear,
          });

        if (error) throw error;
        showToast('Orçamento criado com sucesso!', 'success');
      }

      await fetchBudgets();
      setShowBudgetModal(false);
      setEditingBudget(null);
    } catch (error) {
      showToast('Erro ao salvar orçamento: ' + (error.message || 'Erro desconhecido'), 'error');
      throw error;
    }
  };

  const handleEditBudget = (budget) => {
    setEditingBudget(budget);
    setShowBudgetModal(true);
  };

  const handleAddBudget = () => {
    setEditingBudget(null);
    setShowBudgetModal(true);
  };

  const handleDeleteBudget = async (budget) => {
    const confirmed = await confirm({
      title: 'Excluir orçamento',
      message: `Tem certeza que deseja excluir o orçamento de "${budget.category}"?`,
      type: 'danger',
    });

    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', budget.id);

      if (error) throw error;

      await fetchBudgets();
      showToast('Orçamento excluído com sucesso!', 'success');
    } catch (error) {
      showToast('Erro ao excluir orçamento: ' + (error.message || 'Erro desconhecido'), 'error');
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBudgets();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'danger':
        return colors.error.main;
      case 'warning':
        return colors.warning.main;
      default:
        return colors.success.main;
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

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message="Carregando orçamentos..." />;
  }

  return (
    <View style={styles.container}>
      <ScreenHeader
        user={user}
        title="Orçamentos"
        showLogo={true}
        rightIcon={
          <View style={{ flexDirection: 'row', gap: spacing[1] }}>
            <TouchableOpacity onPress={handleCopyPreviousMonth} style={{ padding: spacing[1] }}>
              <Copy size={24} color={colors.text.secondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleAddBudget} style={{ padding: spacing[1] }}>
              <Plus size={24} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>
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
              label="Total Orçado"
              value={formatCurrency(totalBudgetValue)}
              icon={<Target size={20} color={colors.brand.primary} />}
              variant="default"
              style={{ width: 160, marginRight: spacing[2] }}
            />
            <StatCard
              label="Total Gasto"
              value={formatCurrency(totalSpentValue)}
              icon={<TrendingDown size={20} color={colors.text.secondary} />}
              variant="expense"
              style={{ width: 160, marginRight: spacing[2] }}
            />
            <StatCard
              label="Restante"
              value={formatCurrency(totalRemainingValue)}
              icon={<DollarSign size={20} color={totalRemainingValue >= 0 ? colors.brand.primary : colors.error.main} />}
              variant={totalRemainingValue >= 0 ? 'default' : 'expense'}
              style={{ width: 160 }}
            />
          </ScrollView>
        </View>

        {/* Macro Groups */}
        {macroSummary.length > 0 ? (
          macroSummary.map((macro) => {
            const isExpanded = expandedMacro === macro.key;
            const statusColor = getStatusColor(macro.status);
            const percentage = macro.totalBudget > 0 ? (macro.totalSpent / macro.totalBudget) * 100 : 0;

            return (
              <View key={macro.key} style={styles.macroSection}>
                <TouchableOpacity
                  style={styles.macroHeader}
                  onPress={() => setExpandedMacro(isExpanded ? null : macro.key)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                    <View style={{ flex: 1 }}>
                      <Subheadline weight="semiBold">{macro.label}</Subheadline>
                      <Caption color="secondary">
                        {formatCurrency(macro.totalBudget)} • {formatCurrency(macro.totalSpent)} gasto
                      </Caption>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: spacing[2] }}>
                      <Callout weight="bold" style={{ color: statusColor }}>
                        {formatCurrency(macro.remaining)}
                      </Callout>
                      <Caption color="secondary">{percentage.toFixed(0)}%</Caption>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={20} color={colors.text.secondary} />
                    ) : (
                      <ChevronDown size={20} color={colors.text.secondary} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Progress Bar */}
                <View style={styles.macroProgressContainer}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${Math.min(percentage, 100)}%`,
                          backgroundColor: statusColor,
                        },
                      ]}
                    />
                  </View>
                </View>

                {/* Categories */}
                {isExpanded && macro.categories.length > 0 && (
                  <View style={styles.categoriesContainer}>
                    {macro.categories.map((category) => {
                      const catStatusColor = getStatusColor(category.status);
                      const catPercentage = category.amount > 0 ? category.percentageUsed : 0;

                      return (
                        <Card key={category.id} style={styles.categoryCard}>
                          <View style={styles.categoryHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                              <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                              <Callout weight="semiBold" numberOfLines={1} style={{ flex: 1 }}>
                                {category.name}
                              </Callout>
                            </View>
                            {category.status !== 'success' && (
                              <AlertTriangle size={16} color={catStatusColor} />
                            )}
                          </View>

                          <View style={styles.categoryAmounts}>
                            <View>
                              <Footnote color="secondary">Gasto</Footnote>
                              <Callout weight="bold" style={{ color: catStatusColor }}>
                                {formatCurrency(category.spent)}
                              </Callout>
                            </View>
                            <View style={{ alignItems: 'flex-end' }}>
                              <Footnote color="secondary">Orçamento</Footnote>
                              <Callout weight="semiBold">
                                {formatCurrency(category.amount)}
                              </Callout>
                            </View>
                          </View>

                          <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                              <View
                                style={[
                                  styles.progressFill,
                                  {
                                    width: `${Math.min(catPercentage, 100)}%`,
                                    backgroundColor: catStatusColor,
                                  },
                                ]}
                              />
                            </View>
                            <Footnote style={{ color: catStatusColor, marginLeft: spacing[1] }}>
                              {catPercentage.toFixed(0)}%
                            </Footnote>
                          </View>

                          <View style={styles.categoryFooter}>
                            <Footnote color="secondary">
                              {category.remaining >= 0 
                                ? `Disponível: ${formatCurrency(category.remaining)}`
                                : `Excedido: ${formatCurrency(Math.abs(category.remaining))}`
                              }
                            </Footnote>
                            <View style={{ flexDirection: 'row', gap: spacing[2] }}>
                              <TouchableOpacity
                                onPress={() => handleEditBudget(category)}
                              >
                                <Edit size={16} color={colors.text.secondary} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteBudget(category)}
                              >
                                <Trash2 size={16} color={colors.error.main} />
                              </TouchableOpacity>
                            </View>
                          </View>
                        </Card>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })
        ) : (
          <EmptyState
            emoji="🎯"
            title="Nenhum orçamento definido"
            description="Configure orçamentos para suas categorias para acompanhar seus gastos."
          />
        )}

        {/* Spacing */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>

      {/* Budget Modal */}
      <BudgetModal
        visible={showBudgetModal}
        onClose={() => {
          setShowBudgetModal(false);
          setEditingBudget(null);
        }}
        onSave={handleSaveBudget}
        budget={editingBudget}
        categories={budgetCategories || []}
        selectedMonth={selectedMonth}
      />

      {/* Budget Wizard */}
      <BudgetWizard
        visible={showBudgetWizard}
        onClose={async () => {
          const currentMonth = selectedMonth;
          const dismissedKey = `dismissed_wizard_${currentMonth}`;
          await AsyncStorage.setItem(dismissedKey, 'true');
          setShowBudgetWizard(false);
        }}
        organization={organization}
        budgetCategories={budgetCategories || []}
        selectedMonth={selectedMonth}
        onComplete={async () => {
          await fetchBudgets();
        }}
        isSoloUser={isSoloUser}
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
    paddingHorizontal: spacing[0.5],
  },
  statsScroll: {
    paddingHorizontal: spacing[1.5],
  },
  macroSection: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[3],
  },
  macroHeader: {
    marginBottom: spacing[1],
  },
  macroDot: {
    width: 16,
    height: 16,
    borderRadius: radius.full,
    marginRight: spacing[2],
  },
  macroProgressContainer: {
    marginBottom: spacing[2],
  },
  categoriesContainer: {
    marginTop: spacing[2],
    gap: spacing[2],
  },
  categoryCard: {
    marginBottom: spacing[2],
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  categoryDot: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    marginRight: spacing[1.5],
  },
  categoryAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.neutral[200],
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  categoryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[1],
  },
});

