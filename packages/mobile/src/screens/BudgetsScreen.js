import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Target, Plus, Copy, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react-native';
import { getLocaleSettings } from '@fintrack/shared/i18n';
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
import EmptyState from '../components/ui/EmptyState';
import { useI18n } from '../contexts/I18nContext';
import { categoryLabel } from '../utils/categoryLabel';
import { formatMonthYear } from '../utils/date';
import { typography } from '../theme';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MACRO_ORDER = ['needs', 'wants', 'investments'];
const MACRO_COLORS = { needs: '#1A6AFF', wants: '#A855F7', investments: '#10B981' };

const inferMacroFromName = (name = '') => {
  const n = name.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
  if (n.match(/invest|poup|reserva|fundo|tesouro|acao|cripto/)) return 'investments';
  if (n.match(/lazer|educa|viag|assin|rest|roupa|hobby|diver/)) return 'wants';
  return 'needs';
};

export default function BudgetsScreen({ route }) {
  const { colors } = useTheme();
  const { t, formatMoney } = useI18n();
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
              title: t('budgets.newMonth.title'),
              message: t('budgets.newMonth.message'),
              type: 'info',
              buttons: [
                { text: t('budgets.newMonth.copy'), onPress: async () => { await handleCopyPreviousMonth(); await AsyncStorage.setItem(dismissedKey, 'true'); } },
                { text: t('budgets.newMonth.createNew'), onPress: () => { setShowBudgetWizard(true); AsyncStorage.setItem(dismissedKey, 'true'); } },
                { text: t('budgets.newMonth.later'), onPress: () => { AsyncStorage.setItem(dismissedKey, 'true'); } },
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
          id: budget.id, category: category?.name || '',
          category_id: budget.category_id, amount: limit, spent,
          month: selectedMonth, status: getBudgetStatus(spent, limit),
          color: category?.color || colors.brand.primary,
          macro_group: category?.macro_group || inferMacroFromName(category?.name || ''),
        };
      });
      setBudgets(budgetsWithSpent);
      setIsDataLoaded(true);
    } catch (error) {
      showToast(t('budgets.loadError'), 'error');
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
      acc[key] = { key, label: t(`budgets.macro.${key}`), color: MACRO_COLORS[key], totalBudget: 0, totalSpent: 0, categories: [] };
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
        id: budget.id, name: categoryLabel(budget.category, t), category_id: budget.category_id,
        amount, spent, remaining: amount - spent,
        percentageUsed: amount > 0 ? (spent / amount) * 100 : 0,
        status: getBudgetStatus(spent, amount), color,
      });
    });
    return MACRO_ORDER.map(key => {
      const g = groups[key];
      const totalBudget = Math.round(g.totalBudget * 100) / 100;
      const totalSpent = Math.round(g.totalSpent * 100) / 100;
      g.categories.sort((a, b) => a.name.localeCompare(b.name, getLocaleSettings().locale));
      return { ...g, totalBudget, totalSpent, remaining: Math.round((totalBudget - totalSpent) * 100) / 100, progress: totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0, status: getBudgetStatus(totalSpent, totalBudget) };
    });
  }, [budgets, categoryMap, t]);

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
        alert({ title: t('budgets.copy.heads'), message: t('budgets.copy.nothing'), type: 'warning' });
        return;
      }
      const fmt = (y, m) => formatMonthYear(`${y}-${String(m).padStart(2, '0')}-01`);
      const confirmed = await confirm({ title: t('budgets.copy.title'), message: t('budgets.copy.message', { from: fmt(prevYear, prevMonth), to: fmt(currentYear, currentMonth) }), confirmText: t('common.confirm'), type: 'info' });
      if (!confirmed) return;
      const { data: currentBudgets } = await supabase.from('budgets').select('id').eq('organization_id', organization.id).eq('month_year', currentMonthYear);
      if (currentBudgets?.length > 0) {
        const ow = await confirm({ title: t('budgets.copy.overwriteTitle'), message: t('budgets.copy.overwriteMessage'), confirmText: t('common.confirm'), type: 'warning' });
        if (!ow) return;
        await supabase.from('budgets').delete().eq('organization_id', organization.id).eq('month_year', currentMonthYear);
      }
      const cats = localCategories.length > 0 ? localCategories : (budgetCategories || []);
      const catIds = new Set(cats.map(c => c.id));
      const validBudgets = previousBudgets.filter(b => b.category_id && catIds.has(b.category_id));
      if (validBudgets.length === 0) {
        alert({ title: t('budgets.copy.heads'), message: t('budgets.copy.noneValid'), type: 'warning' });
        return;
      }
      const toInsert = validBudgets.map(b => ({ organization_id: organization.id, category_id: b.category_id, limit_amount: b.limit_amount, month_year: currentMonthYear, is_shared: b.is_shared || false }));
      const { error: insertError } = await supabase.from('budgets').insert(toInsert);
      if (insertError) throw insertError;
      await fetchBudgets();
      showToast(t('budgets.copy.done', { count: validBudgets.length }), 'success');
    } catch (error) {
      showToast(t('budgets.copy.error'), 'error');
    }
  };

  const handleSaveBudget = async (budgetData) => {
    try {
      const [year, month] = selectedMonth.split('-');
      const monthYear = `${year}-${month.padStart(2, '0')}-01`;
      if (budgetData.id) {
        const { error } = await supabase.from('budgets').update({ limit_amount: budgetData.limit_amount }).eq('id', budgetData.id);
        if (error) throw error;
        showToast(t('budgets.saved'), 'success');
      } else {
        const { error } = await supabase.from('budgets').insert({ organization_id: organization.id, category_id: budgetData.category_id, limit_amount: budgetData.limit_amount, month_year: monthYear });
        if (error) throw error;
        showToast(t('budgets.created'), 'success');
      }
      await fetchBudgets();
      setShowBudgetModal(false);
      setEditingBudget(null);
    } catch (error) {
      showToast(t('budgets.saveError'), 'error');
      throw error;
    }
  };

  const handleDeleteBudget = async (budget) => {
    const ok = await confirm({ title: t('budgets.delete.title'), message: t('budgets.delete.message', { category: categoryLabel(budget.category, t) }), confirmText: t('common.delete'), type: 'danger' });
    if (!ok) return;
    try {
      const { error } = await supabase.from('budgets').delete().eq('id', budget.id);
      if (error) throw error;
      await fetchBudgets();
      showToast(t('budgets.delete.done'), 'success');
    } catch (error) {
      showToast(t('budgets.delete.error'), 'error');
    }
  };

  const onRefresh = () => { setRefreshing(true); fetchBudgets(); };

  const getStatusColor = (status) => {
    if (status === 'danger') return colors.error.main;
    if (status === 'warning') return colors.warning.main;
    return colors.success.main;
  };

  const bg = colors.background.primary;
  const cardBg = colors.background.secondary;
  const borderColor = colors.border.light;
  const trackColor = colors.background.tertiary || colors.border.light;
  const textPrimary = colors.text.primary;
  const textSecondary = colors.text.secondary;
  const num = typography.tabularNums;

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message={t('budgets.loading')} />;
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
          <Text style={[styles.title, { color: textPrimary }]} accessibilityRole="header">{t('budgets.title')}</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={handleCopyPreviousMonth} style={styles.headerBtn} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={t('budgets.copyPrevious')}>
              <Copy size={20} color={textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowBudgetWizard(true)} style={styles.headerBtn} activeOpacity={0.6} accessibilityRole="button" accessibilityLabel={t('budgets.addBudget')}>
              <Plus size={22} color={colors.brand.primary} />
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
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>{t('budgets.planned')}</Text>
              <Text style={[styles.summaryValue, num, { color: textPrimary }]}>{formatMoney(totalBudgetValue)}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>{t('budgets.spent')}</Text>
              <Text style={[styles.summaryValue, num, { color: totalSpentValue > totalBudgetValue ? colors.error.main : textPrimary }]}>
                {formatMoney(totalSpentValue)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: borderColor }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryLabel, { color: textSecondary }]}>{t('budgets.left')}</Text>
              <Text style={[styles.summaryValue, num, { color: totalRemainingValue >= 0 ? colors.success.main : colors.error.main }]}>
                {formatMoney(totalRemainingValue)}
              </Text>
            </View>
          </View>
          {/* Total Progress */}
          {totalBudgetValue > 0 && (
            <View style={styles.totalProgress}>
              <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
                <View style={[styles.progressFill, {
                  width: `${Math.min((totalSpentValue / totalBudgetValue) * 100, 100)}%`,
                  backgroundColor: totalRemainingValue >= 0 ? colors.brand.primary : colors.error.main,
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
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isExpanded }}
                >
                  <View style={styles.macroHeader}>
                    <View style={[styles.macroDot, { backgroundColor: macro.color }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.macroName, { color: textPrimary }]}>{macro.label}</Text>
                      <Text style={[styles.macroSub, num, { color: textSecondary }]}>
                        {t('budgets.ofTotal', { spent: formatMoney(macro.totalSpent), total: formatMoney(macro.totalBudget) })}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                      <Text style={[styles.macroRemaining, num, { color: statusColor }]}>
                        {formatMoney(macro.remaining)}
                      </Text>
                      <Text style={[styles.macroPct, { color: textSecondary }]}>{pct.toFixed(0)}%</Text>
                    </View>
                    {isExpanded ? <ChevronUp size={18} color={textSecondary} /> : <ChevronDown size={18} color={textSecondary} />}
                  </View>
                  {/* Progress */}
                  <View style={[styles.progressTrack, { backgroundColor: trackColor, marginTop: 12 }]}>
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
                        <Text style={[styles.catSpent, num, { color: catColor }]}>{formatMoney(cat.spent)}</Text>
                        <Text style={[styles.catLimit, num, { color: textSecondary }]}>/ {formatMoney(cat.amount)}</Text>
                      </View>
                      <View style={[styles.progressTrack, { backgroundColor: trackColor }]}>
                        <View style={[styles.progressFill, { width: `${Math.min(catPct, 100)}%`, backgroundColor: catColor }]} />
                      </View>
                      <Text style={[styles.catFooter, { color: textSecondary }]}>
                        {cat.remaining >= 0
                          ? t('budgets.available', { amount: formatMoney(cat.remaining) })
                          : t('budgets.over', { amount: formatMoney(Math.abs(cat.remaining)) })}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })
        ) : (
          <EmptyState
            icon={<Target size={48} color={colors.text.tertiary} />}
            title={t('budgets.empty.title')}
            description={t('budgets.empty.body', { example: t('budgets.empty.example') })}
            zulText={t('budgets.empty.example')}
            actionLabel={t('budgets.empty.create')}
            onAction={() => setShowBudgetWizard(true)}
          />
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

  summaryCard: { borderRadius: 12, padding: 16, marginBottom: 24 },
  summaryRow: { flexDirection: 'row', alignItems: 'center' },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { fontSize: 12, fontWeight: '500', marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700' },
  summaryDivider: { width: 1, height: 32 },
  totalProgress: { marginTop: 14 },

  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },

  macroSection: { marginBottom: 16 },
  macroCard: { borderRadius: 12, padding: 16 },
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

});
