import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Target, Plus, Copy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../contexts/ThemeContext';
import { Text } from '../components/ui/Text';
import LoadingLogo from '../components/ui/LoadingLogo';
import { MonthSelector } from '../components/financial/MonthSelector';
import { BudgetModal } from '../components/financial/BudgetModal';
import { BudgetWizard } from '../components/financial/BudgetWizard';
import { MacroEditModal } from '../components/financial/MacroEditModal';
import { useOrganization } from '../hooks/useOrganization';
import { useConfirmation } from '../components/ui/ConfirmationProvider';
import { useAlert } from '../components/ui/AlertProvider';
import { useToast } from '../components/ui/Toast';
import { supabase } from '../services/supabase';
import { formatCurrency } from '@fintrack/shared/utils';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MACRO_ORDER = ['needs', 'wants', 'investments'];
const MACRO_LABELS = { needs: 'Necessidades', wants: 'Desejos', investments: 'Investimentos' };
const MACRO_COLORS = { needs: '#1A6AFF', wants: '#A855F7', investments: '#10B981' };

const inferMacroFromName = (name = '') => {
  const n = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (n.match(/invest|poup|reserva|fundo|tesouro|acao|cripto/)) return 'investments';
  if (n.match(/lazer|educa|viag|assin|rest|roupa|hobby|diver/)) return 'wants';
  return 'needs';
};

export default function BudgetsScreen({ route }) {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
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
  const [editingMacro, setEditingMacro] = useState(null);

  useEffect(() => {
    if (!orgLoading && organization) fetchBudgets();
  }, [orgLoading, organization?.id, selectedMonth]);

  useEffect(() => {
    if (route?.params?.openWizard && !orgLoading && organization) {
      setTimeout(() => setShowBudgetWizard(true), 500);
    }
  }, [route?.params?.openWizard, orgLoading, organization]);

  useEffect(() => {
    if (!isDataLoaded || budgets.length > 0) return;
    const checkAndOpenWizard = async () => {
      const dismissedKey = `dismissed_wizard_${selectedMonth}`;
      const isDismissed = await AsyncStorage.getItem(dismissedKey);
      if (!isDismissed) setTimeout(() => setShowBudgetWizard(true), 500);
    };
    checkAndOpenWizard();
  }, [isDataLoaded, budgets.length, selectedMonth]);

  useEffect(() => {
    if (!isDataLoaded) return;
    if (route?.params?.openWizard) return;
    const checkMonthTurnover = async () => {
      const currentMonth = selectedMonth;
      const lastCheckedMonth = await AsyncStorage.getItem('last_budget_check_month');
      if (lastCheckedMonth !== currentMonth) {
        await AsyncStorage.setItem('last_budget_check_month', currentMonth);
        const now = new Date();
        const isCurrentMonth = currentMonth === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (lastCheckedMonth && budgets.length === 0 && isCurrentMonth) {
          const dismissedKey = `dismissed_turnover_${currentMonth}`;
          const isDismissedVal = await AsyncStorage.getItem(dismissedKey);
          if (!isDismissedVal) {
            alert({
              title: 'Novo Mês Detectado!',
              message: 'Deseja copiar o planejamento do mês anterior ou criar um novo?',
              type: 'info',
              buttons: [
                { text: 'Copiar anterior', onPress: async () => { await handleCopyPreviousMonth(); await AsyncStorage.setItem(dismissedKey, 'true'); } },
                { text: 'Criar novo', onPress: () => { setShowBudgetWizard(true); AsyncStorage.setItem(dismissedKey, 'true'); } },
                { text: 'Depois', onPress: () => { AsyncStorage.setItem(dismissedKey, 'true'); } },
              ],
            });
          }
        }
      }
    };
    checkMonthTurnover();
  }, [isDataLoaded, selectedMonth, budgets.length, route?.params?.openWizard]);

  const fetchBudgets = async () => {
    try {
      if (!organization?.id) return;
      setLoading(true);
      const [year, month] = selectedMonth.split('-');
      const monthYear = `${year}-${month.padStart(2, '0')}-01`;
      const { data: budgetsData, error } = await supabase
        .from('budgets').select('*')
        .eq('organization_id', organization.id)
        .eq('month_year', monthYear);
      if (error) throw error;

      let categoriesToUse = budgetCategories;
      if (!categoriesToUse || categoriesToUse.length === 0) {
        const { data: categoriesData, error: categoriesError } = await supabase
          .from('budget_categories').select('*')
          .or(`organization_id.eq.${organization.id},organization_id.is.null`)
          .order('name');
        if (!categoriesError) categoriesToUse = categoriesData || [];
      }

      const categoryMap = new Map();
      (categoriesToUse || []).forEach(cat => { if (cat?.id) categoryMap.set(cat.id, cat); });

      const budgetsWithSpent = (budgetsData || []).map(budget => {
        const spent = Math.round(parseFloat(budget.current_spent || 0) * 100) / 100;
        const limit = Math.round(parseFloat(budget.limit_amount || 0) * 100) / 100;
        const category = categoryMap.get(budget.category_id);
        return {
          id: budget.id, category: category?.name || 'Sem categoria',
          category_id: budget.category_id, amount: limit, spent,
          month: selectedMonth, status: getBudgetStatus(spent, limit),
          color: category?.color || colors.brand.primary,
          macro_group: category?.macro_group || inferMacroFromName(category?.name || ''),
        };
      });
      setBudgets(budgetsWithSpent);
      setIsDataLoaded(true);
    } catch (error) {
      showToast('Erro ao carregar orçamentos', 'error');
      setIsDataLoaded(true);
    } finally { setLoading(false); setRefreshing(false); }
  };

  const getBudgetStatus = (spent, amount) => {
    if (amount === 0) return 'success';
    const pct = (spent / amount) * 100;
    if (pct >= 100) return 'danger';
    if (pct >= 80) return 'warning';
    return 'success';
  };

  const [localCategories, setLocalCategories] = useState([]);
  useEffect(() => {
    const loadCategories = async () => {
      if (budgetCategories?.length > 0) { setLocalCategories(budgetCategories); return; }
      if (!organization?.id) return;
      const { data, error } = await supabase.from('budget_categories').select('*')
        .or(`organization_id.eq.${organization.id},organization_id.is.null`).order('name');
      if (!error && data) setLocalCategories(data);
    };
    if (!orgLoading && organization) loadCategories();
  }, [organization?.id, budgetCategories, orgLoading]);

  const categoryMap = useMemo(() => {
    const cats = localCategories.length > 0 ? localCategories : (budgetCategories || []);
    const map = new Map();
    cats.forEach(c => { if (c?.id) map.set(c.id, c); });
    return map;
  }, [localCategories, budgetCategories]);

  const macroSummary = useMemo(() => {
    const groups = MACRO_ORDER.reduce((acc, key) => {
      acc[key] = { key, label: MACRO_LABELS[key], color: MACRO_COLORS[key], totalBudget: 0, totalSpent: 0, categories: [] };
      return acc;
    }, {});
    budgets.forEach(budget => {
      const macroGroup = budget.macro_group || inferMacroFromName(budget.category);
      const color = budget.color || MACRO_COLORS[macroGroup] || colors.brand.primary;
      const amount = Math.round(Number(budget.amount || 0) * 100) / 100;
      const spent = Math.round(Number(budget.spent || 0) * 100) / 100;
      const targetGroup = groups[macroGroup] || groups.needs;
      targetGroup.totalBudget += amount;
      targetGroup.totalSpent += spent;
      targetGroup.categories.push({
        id: budget.id, name: budget.category, category_id: budget.category_id,
        amount, spent, remaining: amount - spent,
        percentageUsed: amount > 0 ? (spent / amount) * 100 : 0,
        status: getBudgetStatus(spent, amount), color,
      });
    });
    return MACRO_ORDER.map(key => {
      const g = groups[key];
      const totalBudget = Math.round(g.totalBudget * 100) / 100;
      const totalSpent = Math.round(g.totalSpent * 100) / 100;
      g.categories.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
      return { ...g, totalBudget, totalSpent, remaining: Math.round((totalBudget - totalSpent) * 100) / 100, progress: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0, status: getBudgetStatus(totalSpent, totalBudget) };
    });
  }, [budgets, categoryMap]);

  const totalBudgetValue = useMemo(() => Math.round(macroSummary.reduce((s, m) => s + m.totalBudget, 0) * 100) / 100, [macroSummary]);
  const totalSpentValue = useMemo(() => Math.round(macroSummary.reduce((s, m) => s + m.totalSpent, 0) * 100) / 100, [macroSummary]);
  const totalRemainingValue = Math.round((totalBudgetValue - totalSpentValue) * 100) / 100;

  const handleCopyPreviousMonth = async () => {
    try {
      const [currentYear, currentMonth] = selectedMonth.split('-').map(Number);
      let prevYear = currentYear, prevMonth = currentMonth - 1;
      if (prevMonth === 0) { prevMonth = 12; prevYear--; }
      const currentMonthYear = `${currentYear}-${currentMonth.toString().padStart(2, '0')}-01`;
      const previousMonthYear = `${prevYear}-${prevMonth.toString().padStart(2, '0')}-01`;
      const { data: previousBudgets, error: fetchError } = await supabase
        .from('budgets').select('*').eq('organization_id', organization.id).eq('month_year', previousMonthYear);
      if (fetchError) throw fetchError;
      if (!previousBudgets || previousBudgets.length === 0) {
        alert({ title: 'Atenção', message: 'Não há orçamentos no mês anterior para copiar.', type: 'warning' });
        return;
      }
      const fmt = (y, m) => `${m.toString().padStart(2, '0')}/${y}`;
      const confirmed = await confirm({ title: 'Copiar orçamentos', message: `Copiar orçamentos de ${fmt(prevYear, prevMonth)} para ${fmt(currentYear, currentMonth)}?`, type: 'info' });
      if (!confirmed) return;
      const { data: currentBudgets } = await supabase.from('budgets').select('id').eq('organization_id', organization.id).eq('month_year', currentMonthYear);
      if (currentBudgets?.length > 0) {
        const ow = await confirm({ title: 'Sobrescrever orçamentos', message: 'Já existem orçamentos para este mês. Deseja sobrescrever?', type: 'warning' });
        if (!ow) return;
        await supabase.from('budgets').delete().eq('organization_id', organization.id).eq('month_year', currentMonthYear);
      }
      const cats = localCategories.length > 0 ? localCategories : (budgetCategories || []);
      const catIds = new Set(cats.map(c => c.id));
      const validBudgets = previousBudgets.filter(b => b.category_id && catIds.has(b.category_id));
      if (validBudgets.length === 0) {
        alert({ title: 'Atenção', message: 'Nenhum orçamento válido encontrado.', type: 'warning' });
        return;
      }
      const toInsert = validBudgets.map(b => ({ organization_id: organization.id, category_id: b.category_id, limit_amount: b.limit_amount, month_year: currentMonthYear, is_shared: b.is_shared || false }));
      const { error: insertError } = await supabase.from('budgets').insert(toInsert);
      if (insertError) throw insertError;
      await fetchBudgets();
      showToast(`${validBudgets.length} orçamentos copiados!`, 'success');
    } catch (error) {
      showToast('Erro ao copiar orçamentos', 'error');
    }
  };

  const handleSaveBudget = async (budgetData) => {
    try {
      const [year, month] = selectedMonth.split('-');
      const monthYear = `${year}-${month.padStart(2, '0')}-01`;
      if (budgetData.id) {
        const { error } = await supabase.from('budgets').update({ limit_amount: budgetData.limit_amount }).eq('id', budgetData.id);
        if (error) throw error;
        showToast('Orçamento atualizado!', 'success');
      } else {
        const { error } = await supabase.from('budgets').insert({ organization_id: organization.id, category_id: budgetData.category_id, limit_amount: budgetData.limit_amount, month_year: monthYear });
        if (error) throw error;
        showToast('Orçamento criado!', 'success');
      }
      await fetchBudgets();
      setShowBudgetModal(false);
      setEditingBudget(null);
    } catch (error) {
      showToast('Erro ao salvar orçamento', 'error');
      throw error;
    }
  };

  const handleDeleteBudget = async (budget) => {
    const ok = await confirm({ title: 'Excluir orçamento', message: `Excluir orçamento de "${budget.category}"?`, type: 'danger' });
    if (!ok) return;
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', budget.id);
      if (error) throw error;
      await fetchBudgets();
      showToast('Orçamento excluído!', 'success');
    } catch (error) {
      showToast('Erro ao excluir orçamento', 'error');
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchBudgets(); };

  const getStatusColor = (status) => {
    if (status === 'danger') return '#FF3B30';
    if (status === 'warning') return '#FF9500';
    return '#34C759';
  };

  const bg = isDark ? '#0A0A0A' : '#F2F2F7';
  const cardBg = isDark ? '#1C1C1E' : '#FFFFFF';
  const borderColor = isDark ? '#38383A' : '#E5E5EA';
  const textPrimary = isDark ? '#FFFFFF' : '#000000';
  const textSecondary = isDark ? '#8E8E93' : '#6B7280';

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message="Carregando orçamentos..." />;
  }

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: textPrimary }]}>Orçamento</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCopyPreviousMonth} style={styles.headerBtn} activeOpacity={0.6}>
              <Copy size={20} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBudgetWizard(true)} style={styles.headerBtn} activeOpacity={0.6}>
              <Plus size={22} color="#1A6AFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Month */}
        <View style={styles.monthRow}>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </View>

        {/* Summary Card */}
        <View style={[styles.summaryCard, { backgroundColor: cardBg }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Orçado</Text>
              <Text style={[styles.summaryValue, { color: textPrimary }]}>{formatCurrency(totalBudgetValue)}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Gasto</Text>
              <Text style={[styles.summaryValue, { color: totalSpentValue > totalBudgetValue ? '#FF3B30' : textPrimary }]}>
                {formatCurrency(totalSpentValue)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>Restante</Text>
              <Text style={[styles.summaryValue, { color: totalRemainingValue >= 0 ? '#34C759' : '#FF3B30' }]}>
                {formatCurrency(totalRemainingValue)}
              </Text>
            </View>
          </View>
          {/* Total Progress */}
          {totalBudgetValue > 0 && (
            <View style={styles.totalProgress}>
              <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                <View style={[styles.progressFill, {
                  width: `${Math.min((totalSpentValue / totalBudgetValue) * 100, 100)}%`,
                  backgroundColor: totalRemainingValue >= 0 ? '#1A6AFF' : '#FF3B30',
                }]} />
              </View>
            </View>
          )}
        </View>

        {/* Macro Groups */}
        {macroSummary.some(m => m.categories.length > 0) ? (
          macroSummary.map(macro => {
            if (macro.categories.length === 0) return null;
            const isExpanded = expandedMacro === macro.key;
            const statusColor = getStatusColor(macro.status);
            const pct = macro.totalBudget > 0 ? (macro.totalSpent / macro.totalBudget) * 100 : 0;

            return (
              <View key={macro.key} style={styles.macroSection}>
                <TouchableOpacity
                  style={[styles.macroCard, { backgroundColor: cardBg }]}
                  onPress={() => setExpandedMacro(isExpanded ? null : macro.key)}
                  activeOpacity={0.7}
                >
                  <View style={styles.macroHeader}>
                    <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.macroName, { color: textPrimary }]}>{macro.label}</Text>
                      <Text style={[styles.macroSub, { color: textSecondary }]}>
                        {formatCurrency(macro.totalSpent)} de {formatCurrency(macro.totalBudget)}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={[styles.macroRemaining, { color: statusColor }]}>
                        {formatCurrency(macro.remaining)}
                      </Text>
                      <Text style={[styles.macroPct, { color: textSecondary }]}>{pct.toFixed(0)}%</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={18} color={textSecondary} /> : <ChevronDown size={18} color={textSecondary} />}
                  </View>
                  {/* Progress */}
                  <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', marginTop: 10 }]}>
                    <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: statusColor }]} />
                  </View>
                </TouchableOpacity>

                {/* Expanded Categories */}
                {isExpanded && macro.categories.map(cat => {
                  const catPct = cat.amount > 0 ? cat.percentageUsed : 0;
                  const catColor = getStatusColor(cat.status);
                  return (
                    <View key={cat.id} style={[styles.catCard, { backgroundColor: cardBg, borderLeftColor: cat.color }]}>
                      <View style={styles.catHeader}>
                        <Text style={[styles.catName, { color: textPrimary }]}>{cat.name}</Text>
                        {cat.status !== 'success' && <AlertTriangle size={14} color={catColor} />}
                      </View>
                      <View style={styles.catAmounts}>
                        <Text style={[styles.catSpent, { color: catColor }]}>{formatCurrency(cat.spent)}</Text>
                        <Text style={[styles.catLimit, { color: textSecondary }]}>/ {formatCurrency(cat.amount)}</Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                        <View style={[styles.progressFill, { width: `${Math.min(catPct, 100)}%`, backgroundColor: catColor }]} />
                      </View>
                      <Text style={[styles.catFooter, { color: textSecondary }]}>
                        {cat.remaining >= 0 ? `Disponível: ${formatCurrency(cat.remaining)}` : `Excedido: ${formatCurrency(Math.abs(cat.remaining))}`}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        ) : (
          <View style={styles.emptyState}>
            <Target size={48} color={isDark ? '#48484A' : '#C7C7CC'} />
            <Text style={[styles.emptyTitle, { color: textPrimary }]}>Nenhum orçamento</Text>
            <Text style={[styles.emptyDesc, { color: textSecondary }]}>
              Configure orçamentos por categoria para controlar seus gastos.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => setShowBudgetWizard(true)} activeOpacity={0.7}>
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyBtnText}>Criar Orçamento</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <BudgetModal
        visible={showBudgetModal}
        onClose={() => { setShowBudgetModal(false); setEditingBudget(null); }}
        onSave={handleSaveBudget}
        budget={editingBudget}
        categories={budgetCategories || []}
        selectedMonth={selectedMonth}
      />
      <BudgetWizard
        visible={showBudgetWizard}
        onClose={async () => {
          await AsyncStorage.setItem(`dismissed_wizard_${selectedMonth}`, 'true');
          setShowBudgetWizard(false);
        }}
        organization={organization}
        budgetCategories={budgetCategories || []}
        selectedMonth={selectedMonth}
        onComplete={fetchBudgets}
        isSoloUser={isSoloUser}
      />
      <MacroEditModal
        visible={!!editingMacro}
        onClose={() => setEditingMacro(null)}
        macro={editingMacro}
        categories={budgetCategories || []}
        selectedMonth={selectedMonth}
        organization={organization}
        onSave={fetchBudgets}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 20 },

  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 34, fontWeight: '800', letterSpacing: -0.5 },
  headerActions: { flexDirection: 'row', gap: 12 },
  headerBtn: { padding: 6 },

  monthRow: { marginBottom: 20 },

  summaryCard: { borderRadius: 16, padding: 16, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 11, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryDivider: { width: 1, height: 32 },
  totalProgress: { marginTop: 14 },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  macroSection: { marginBottom: 16 },
  macroCard: { borderRadius: 14, padding: 16 },
  macroHeader: { flexDirection: 'row', alignItems: 'center' },
  macroDot: { width: 12, height: 12, borderRadius: 6, marginRight: 10 },
  macroName: { fontSize: 15, fontWeight: '600' },
  macroSub: { fontSize: 12, marginTop: 2 },
  macroRemaining: { fontSize: 15, fontWeight: '700' },
  macroPct: { fontSize: 11, marginTop: 2 },

  catCard: { borderRadius: 12, padding: 14, marginTop: 8, marginLeft: 12, borderLeftWidth: 3 },
  catHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  catName: { fontSize: 14, fontWeight: '600' },
  catAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  catSpent: { fontSize: 16, fontWeight: '700' },
  catLimit: { fontSize: 13 },
  catFooter: { fontSize: 11, marginTop: 8 },

  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginTop: 16 },
  emptyDesc: { fontSize: 14, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1A6AFF', paddingHorizontal: 20, paddingVertical: 12,
    borderRadius: 12, marginTop: 24,
  },
  emptyBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});
