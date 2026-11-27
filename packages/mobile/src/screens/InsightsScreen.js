import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from 'lucide-react-native';
import { colors, spacing, radius } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Text, Title1, Title2, Headline, Callout, Caption, Subheadline, Footnote } from '../components/ui/Text';
import { Card } from '../components/ui/Card';
import { ProgressRing } from '../components/ui/ProgressRing';
import LoadingLogo from '../components/ui/LoadingLogo';
import EmptyState from '../components/ui/EmptyState';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { TrendLineChart } from '../components/financial/TrendLineChart';
import { FinancialScoreGauge } from '../components/financial/FinancialScoreGauge';
import { MacroAreaChart } from '../components/financial/MacroAreaChart';
import { Tooltip } from '../components/ui/Tooltip';
import { useOrganization } from '../hooks/useOrganization';
import { supabase } from '../services/supabase';
import { useI18n } from '../contexts/I18nContext';
import { formatNumber } from '@fintrack/shared/i18n';
import { categoryLabel } from '../utils/categoryLabel';
import { formatMonthName } from '../utils/date';

export default function InsightsScreen() {
  const { colors } = useTheme();
  const { t, formatMoney } = useI18n();
  const { organization, user, loading: orgLoading } = useOrganization();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [insights, setInsights] = useState({
    averageMonthlyExpenses: 0,
    averageMonthlyIncome: 0,
    trend: 'stable', // 'up', 'down', 'stable'
    topCategory: null,
    mostExpensiveDay: null,
    lastMonthComparison: 0,
  });
  const [trendData, setTrendData] = useState(null);
  const [financialScore, setFinancialScore] = useState(75);
  const [macroSpendingData, setMacroSpendingData] = useState(null);

  useEffect(() => {
    if (!orgLoading && organization) {
      fetchInsights();
      fetchTrendData();
      fetchMacroSpendingData();
      calculateFinancialScore();
    }
  }, [orgLoading, organization]);

  const fetchInsights = async () => {
    try {
      setLoading(true);

      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth() + 1;

      // Last 3 months of expenses
      const threeMonthsAgo = new Date(now.setMonth(now.getMonth() - 3));
      const startDate = `${threeMonthsAgo.getFullYear()}-${String(threeMonthsAgo.getMonth() + 1).padStart(2, '0')}-01`;

      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate);

      if (expensesError) throw expensesError;

      const { data: incomes, error: incomesError } = await supabase
        .from('incomes')
        .select('*')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate);

      if (incomesError) throw incomesError;

      // Monthly averages
      const totalExpenses = expenses?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
      const totalIncomes = incomes?.reduce((sum, i) => sum + (i.amount || 0), 0) || 0;
      const averageMonthlyExpenses = totalExpenses / 3;
      const averageMonthlyIncome = totalIncomes / 3;

      // Category with the most spending (raw DB name; translated at render)
      const expensesByCategory = {};
      expenses?.forEach(e => {
        const cat = e.budget_category_name || e.category || '';
        expensesByCategory[cat] = (expensesByCategory[cat] || 0) + (e.amount || 0);
      });

      const topCategory = Object.entries(expensesByCategory)
        .sort(([, a], [, b]) => b - a)[0];

      // Compare with last month (handles January -> December of last year)
      const prev = new Date(currentYear, currentMonth - 2, 1);
      const prevKey = `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`;
      const lastMonthStart = `${prevKey}-01`;
      const lastMonthEnd = `${prevKey}-31`;
      const currentMonthStart = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;

      const lastMonthExpenses = expenses
        ?.filter(e => e.date >= lastMonthStart && e.date <= lastMonthEnd)
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const currentMonthExpenses = expenses
        ?.filter(e => e.date >= currentMonthStart)
        .reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

      const lastMonthComparison = lastMonthExpenses > 0
        ? ((currentMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100
        : 0;

      const trend = lastMonthComparison > 5 ? 'up' : lastMonthComparison < -5 ? 'down' : 'stable';

      setInsights({
        averageMonthlyExpenses,
        averageMonthlyIncome,
        trend,
        topCategory: topCategory ? { name: topCategory[0], value: topCategory[1] } : null,
        mostExpensiveDay: null,
        lastMonthComparison,
      });
    } catch (error) {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchTrendData = async () => {
    try {
      if (!organization) return;

      const now = new Date();
      const trendLabels = [];
      const needsData = [];
      const wantsData = [];
      const investmentsData = [];

      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const monthStr = `${year}-${String(month).padStart(2, '0')}`;
        const startDate = `${monthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

        // Short month name in the user's language
        trendLabels.push(formatMonthName(startDate, { short: true }));

        // Expenses per macro group
        const { data: expenses } = await supabase
          .from('expenses')
          .select('amount, macro_category')
          .eq('organization_id', organization.id)
          .eq('status', 'confirmed')
          .gte('date', startDate)
          .lte('date', endDate);

        const needs = (expenses || []).filter(e => e.macro_category === 'needs').reduce((sum, e) => sum + (e.amount || 0), 0) / 1000;
        const wants = (expenses || []).filter(e => e.macro_category === 'wants').reduce((sum, e) => sum + (e.amount || 0), 0) / 1000;
        const investments = (expenses || []).filter(e => e.macro_category === 'investments').reduce((sum, e) => sum + (e.amount || 0), 0) / 1000;

        needsData.push(needs);
        wantsData.push(wants);
        investmentsData.push(investments);
      }

      setTrendData({
        labels: trendLabels,
        datasets: [
          { data: needsData, label: t('budgets.macro.needs') },
          { data: wantsData, label: t('budgets.macro.wants') },
          { data: investmentsData, label: t('budgets.macro.investments') },
        ],
      });
    } catch (error) {}
  };

  const fetchMacroSpendingData = async () => {
    try {
      if (!organization) return;

      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const monthStr = `${year}-${String(month).padStart(2, '0')}`;
      const startDate = `${monthStr}-01`;
      const lastDay = new Date(year, month, 0).getDate();

      const labels = [];
      const spendingData = [];

      // Daily spending this month: one query, summed per day
      const { data: monthExpenses } = await supabase
        .from('expenses')
        .select('amount, date')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .lte('date', `${monthStr}-${String(lastDay).padStart(2, '0')}`);
      const byDate = {};
      (monthExpenses || []).forEach(e => {
        const key = String(e.date || '').slice(0, 10);
        byDate[key] = (byDate[key] || 0) + (e.amount || 0);
      });

      for (let day = 1; day <= lastDay; day++) {
        const dateStr = `${monthStr}-${String(day).padStart(2, '0')}`;
        const total = byDate[dateStr] || 0;

        if (day % 5 === 0 || day === 1 || day === lastDay) {
          labels.push(String(day));
        }

        spendingData.push(total);
      }

      setMacroSpendingData({
        labels,
        datasets: [{ data: spendingData }],
      });
    } catch (error) {}
  };

  const calculateFinancialScore = async () => {
    try {
      if (!organization) return;

      // Simple score based on spending vs income this month
      const now = new Date();
      const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
      const startDate = `${monthStr}-01`;
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const endDate = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

      // This month's expenses and income
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .lte('date', endDate);

      const { data: incomes } = await supabase
        .from('incomes')
        .select('amount')
        .eq('organization_id', organization.id)
        .eq('status', 'confirmed')
        .gte('date', startDate)
        .lte('date', endDate);

      const totalExpenses = (expenses || []).reduce((sum, e) => sum + (e.amount || 0), 0);
      const totalIncome = (incomes || []).reduce((sum, i) => sum + (i.amount || 0), 0);

      // Score from the spending / income ratio
      let score = 100;
      if (totalIncome > 0) {
        const spendingRatio = totalExpenses / totalIncome;
        if (spendingRatio > 1) {
          score = Math.max(20, 100 - (spendingRatio - 1) * 100);
        } else if (spendingRatio > 0.9) {
          score = 60;
        } else if (spendingRatio > 0.7) {
          score = 80;
        } else {
          score = 90;
        }
      }

      setFinancialScore(Math.round(score));
    } catch (error) {}
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchInsights();
    fetchTrendData();
    fetchMacroSpendingData();
    calculateFinancialScore();
  };

  if (orgLoading || loading) {
    return <LoadingLogo fullScreen message={t('insights.loading')} />;
  }

  const scoreLabel = financialScore >= 80 ? 'excellent' : financialScore >= 60 ? 'good' : financialScore >= 40 ? 'attention' : 'critical';
  const trendColor = insights.trend === 'up' ? colors.error.main : insights.trend === 'down' ? colors.success.main : colors.text.secondary;
  const comparison = `${insights.lastMonthComparison > 0 ? '+' : ''}${formatNumber(insights.lastMonthComparison, { numberOptions: { minimumFractionDigits: 1, maximumFractionDigits: 1 } })}%`;

  // Nothing logged yet: show only the empty state with the Zul example.
  if (!insights.topCategory) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
        <ScreenHeader user={user} title={t('insights.title')} showLogo={true} />
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <EmptyState
            icon={<PieChart size={48} color={colors.text.tertiary} />}
            title={t('insights.empty.title')}
            description={t('insights.empty.body', { example: t('insights.empty.example') })}
            zulText={t('insights.empty.example')}
          />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScreenHeader
        user={user}
        title={t('insights.title')}
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
        {/* Hero Score Card */}
        <LinearGradient
          colors={colors.isDark
            ? [colors.brand.primaryDark || '#0047CC', colors.background.tertiary || '#171717']
            : colors.brand.gradient || ['#1A6AFF', '#0047CC']
          }
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Caption style={{ color: 'rgba(255,255,255,0.8)' }}>{t('insights.health')}</Caption>
              <Title1 style={{ color: '#FFFFFF', marginTop: spacing[0.5] }}>
                {t(`insights.score.${scoreLabel}`)}
              </Title1>
              <Footnote style={{ color: 'rgba(255,255,255,0.8)', marginTop: spacing[0.5] }}>
                {t(`insights.trendShort.${insights.trend}`)}
              </Footnote>
            </View>
            <ProgressRing
              progress={financialScore / 100}
              size={72}
              strokeWidth={7}
              color="#F5A623"
              trackColor="rgba(255,255,255,0.2)"
              showPercentage
            />
          </View>
        </LinearGradient>

        {/* Trend Card */}
        <Card style={styles.trendCard}>
          <View style={styles.trendHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[1] }}>
              <Subheadline weight="semiBold" accessibilityRole="header">{t('insights.trendTitle')}</Subheadline>
              <Tooltip
                title={t('insights.trendTitle')}
                content={t('insights.trendTooltip')}
              />
            </View>
            <View style={[
              styles.trendBadge,
              {
                backgroundColor: insights.trend === 'up' ? colors.error.bg : insights.trend === 'down' ? colors.success.bg : colors.background.tertiary
              }
            ]}>
              {insights.trend === 'up' ? (
                <TrendingUp size={16} color={colors.error.main} />
              ) : insights.trend === 'down' ? (
                <TrendingDown size={16} color={colors.success.main} />
              ) : (
                <DollarSign size={16} color={colors.text.secondary} />
              )}
              <Footnote tabular style={{ marginLeft: spacing[0.5], color: trendColor }}>
                {comparison}
              </Footnote>
            </View>
          </View>
          <Caption color="secondary" style={{ marginTop: spacing[1] }}>
            {t(`insights.trendBody.${insights.trend}`)}
          </Caption>
        </Card>

        {/* Averages */}
        <View style={styles.section}>
          <Subheadline weight="semiBold" style={styles.sectionTitle} accessibilityRole="header">
            {t('insights.averages')}
          </Subheadline>
          <Card style={styles.averageCard}>
            <View style={styles.averageRow}>
              <View style={{ flex: 1 }}>
                <Footnote color="secondary">{t('insights.avgExpenses')}</Footnote>
                <Headline weight="bold" tabular style={{ marginTop: spacing[0.5] }}>
                  {formatMoney(insights.averageMonthlyExpenses)}
                </Headline>
              </View>
              <View style={[styles.iconBadge, { backgroundColor: colors.error.bg }]}>
                <TrendingUp size={20} color={colors.error.main} />
              </View>
            </View>
          </Card>

          <Card style={styles.averageCard}>
            <View style={styles.averageRow}>
              <View style={{ flex: 1 }}>
                <Footnote color="secondary">{t('insights.avgIncome')}</Footnote>
                <Headline weight="bold" tabular style={{ marginTop: spacing[0.5] }}>
                  {formatMoney(insights.averageMonthlyIncome)}
                </Headline>
              </View>
              <View style={[styles.iconBadge, { backgroundColor: colors.success.bg }]}>
                <TrendingDown size={20} color={colors.success.main} />
              </View>
            </View>
          </Card>
        </View>

        {/* Top Category */}
        {insights.topCategory && (
          <View style={styles.section}>
            <Subheadline weight="semiBold" style={styles.sectionTitle} accessibilityRole="header">
              {t('insights.topCategory')}
            </Subheadline>
            <Card>
              <Callout weight="semiBold">{categoryLabel(insights.topCategory.name, t)}</Callout>
              <Headline weight="bold" tabular style={{ marginTop: spacing[1] }}>
                {formatMoney(insights.topCategory.value)}
              </Headline>
              <Caption color="secondary" style={{ marginTop: spacing[0.5] }}>
                {t('insights.last3Months')}
              </Caption>
            </Card>
          </View>
        )}

        {/* Financial Score */}
        <View style={styles.section}>
          <FinancialScoreGauge score={financialScore} />
        </View>

        {/* Trend Line Chart */}
        {trendData && trendData.datasets.length > 0 && (
          <View style={styles.section}>
            <Subheadline weight="semiBold" style={styles.sectionTitle} accessibilityRole="header">
              {t('insights.byGroup')}
            </Subheadline>
            <TrendLineChart data={trendData} />
          </View>
        )}

        {/* Macro Spending Waves */}
        {macroSpendingData && (
          <View style={styles.section}>
            <Subheadline weight="semiBold" style={styles.sectionTitle} accessibilityRole="header">
              {t('insights.monthPattern')}
            </Subheadline>
            <MacroAreaChart data={macroSpendingData} />
          </View>
        )}

        {/* Spacing for FAB */}
        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  scrollView: {
    flex: 1,
  },

  scrollContent: {
    padding: spacing[2],
  },

  heroCard: {
    borderRadius: 12,
    padding: spacing[3],
    marginBottom: spacing[3],
    overflow: 'hidden',
  },

  heroRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  trendCard: {
    marginBottom: spacing[3],
  },

  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[1.5],
    paddingVertical: spacing[0.5],
    borderRadius: radius.full,
  },

  section: {
    marginBottom: spacing[3],
  },

  sectionTitle: {
    marginBottom: spacing[2],
  },

  averageCard: {
    marginBottom: spacing[2],
  },

  averageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

