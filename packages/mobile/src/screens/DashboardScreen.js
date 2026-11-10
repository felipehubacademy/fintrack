import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  Wallet,
  HelpCircle,
  Calendar,
} from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { Text, Headline, Caption } from '../components/ui/Text';
import { Card, CardContent } from '../components/ui/Card';
import { ScreenHeader } from '../components/layout/ScreenHeader';
import { StatCard } from '../components/financial/StatCard';
import { MonthSelector } from '../components/financial/MonthSelector';
import { BalanceHero } from '../components/dashboard/BalanceHero';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { BudgetAlerts } from '../components/dashboard/BudgetAlerts';
import { CategoryDonutChart } from '../components/financial/CategoryDonutChart';
import { MonthlyComparisonChart } from '../components/financial/MonthlyComparisonChart';
import { StatsDetailSheet } from '../components/financial/StatsDetailSheet';
import { DetailedStatsSheet } from '../components/financial/DetailedStatsSheet';
import { BankAccountsSheet } from '../components/financial/BankAccountsSheet';
import { Tooltip } from '../components/ui/Tooltip';
import { formatCurrency } from '@fintrack/shared/utils';
import { formatBrazilDate } from '../utils/date';
import { useDashboardData } from '../hooks/useDashboardData';

const { width } = Dimensions.get('window');
const STAT_CARD_WIDTH = (width - spacing[2] * 3) / 2.2;

export default function DashboardScreen() {
  const navigation = useNavigation();
  const {
    user, orgLoading,
    selectedMonth, setSelectedMonth,
    refreshing, onRefresh,
    stats, recentTransactions,
    categoryData, paymentMethodData, ownerData,
    incomeCategoryData,
    monthlyComparison,
    alarmingCategories, allAlarmingCategories, alarmingCategoriesExpanded,
    bankAccounts,
    scheduledPaymentsData,
    colors,
    sheetVisible, setSheetVisible, sheetData,
    detailedSheetVisible, setDetailedSheetVisible, detailedSheetData,
    bankAccountsSheetVisible, setBankAccountsSheetVisible,
    scheduledPaymentsSheetVisible, setScheduledPaymentsSheetVisible,
    balanceSheetVisible, setBalanceSheetVisible,
    handleToggleAlarmingCategories,
    handleCategoryLegendPress,
    openIncomeSheet,
    openExpenseSheet,
  } = useDashboardData(navigation);

  if (orgLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="body" color="secondary">Carregando...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]} pointerEvents="box-none">
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Month selector */}
        <View style={styles.section}>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
        </View>

        {/* Hero balance card */}
        <BalanceHero
          balance={stats.balance}
          income={stats.totalIncome}
          expenses={stats.totalExpenses}
          userName={user?.name}
        />

        {/* Stat cards */}
        <View style={styles.section}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statsScroll}>
            <StatCardWithHint
              label="Total de Entradas"
              value={formatCurrency(stats.totalIncome)}
              icon={<ArrowDownLeft size={20} color={colors.brand.primary} />}
              variant="income"
              onPress={openIncomeSheet}
              colors={colors}
            />
            <StatCardWithHint
              label="Total de Despesas"
              value={formatCurrency(stats.totalExpenses)}
              icon={<ArrowUpRight size={20} color={colors.error.main} />}
              variant="expense"
              onPress={openExpenseSheet}
              colors={colors}
            />
            <StatCardWithHint
              label="Pagamentos Programados"
              value={formatCurrency(stats.scheduledPayments)}
              icon={<Calendar size={20} color={colors.warning.main} />}
              variant="warning"
              onPress={() => setScheduledPaymentsSheetVisible(true)}
              colors={colors}
            />
            <StatCardWithHint
              label="Saldo Parcial do Mês"
              value={formatCurrency(stats.balance)}
              icon={<Wallet size={20} color={stats.balance < 0 ? colors.error.main : colors.brand.primary} />}
              valueColor={stats.balance < 0 ? colors.error.main : colors.brand.primary}
              onPress={() => setBalanceSheetVisible(true)}
              colors={colors}
            />
          </ScrollView>
        </View>

        {/* Quick summary */}
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

        {/* Charts */}
        {(categoryData.length > 0 || paymentMethodData.length > 0 || ownerData.length > 0 || incomeCategoryData.length > 0) && (
          <View style={styles.section}>
            <Headline weight="semiBold" style={{ marginBottom: spacing[2] }}>Análises</Headline>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chartsScroll}
              snapToInterval={width - spacing[2] * 2 + spacing[2]}
              decelerationRate="fast"
            >
              {categoryData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart data={categoryData} title="Despesas por Categoria" onCategoryPress={handleCategoryLegendPress} />
                  </CardContent>
                </Card>
              )}
              {paymentMethodData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart data={paymentMethodData} title="Despesas por Pagamento" />
                  </CardContent>
                </Card>
              )}
              {ownerData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart data={ownerData} title="Despesas por Responsável" />
                  </CardContent>
                </Card>
              )}
              {incomeCategoryData.length > 0 && (
                <Card style={styles.chartCard}>
                  <CardContent>
                    <CategoryDonutChart data={incomeCategoryData} title="Receitas por Categoria" />
                  </CardContent>
                </Card>
              )}
            </ScrollView>
          </View>
        )}

        {/* Budget alerts */}
        <BudgetAlerts
          categories={alarmingCategories}
          allCategories={allAlarmingCategories}
          expanded={alarmingCategoriesExpanded}
          onToggleExpanded={handleToggleAlarmingCategories}
          onPress={() => navigation.navigate('Mais', { screen: 'Budgets' })}
        />

        {/* Monthly comparison */}
        {monthlyComparison.length > 0 && (
          <View style={[styles.section, { marginTop: spacing[3], marginBottom: spacing[2] }]}>
            <View style={styles.sectionHeader}>
              <Headline weight="semiBold">Comparação Mensal</Headline>
              <Tooltip
                title="Comparação Mensal"
                content="Compare suas entradas (azul) e saídas totais (cinza) dos últimos 6 meses."
              />
            </View>
            <Card style={[styles.chartCard, { paddingBottom: 0, paddingTop: spacing[2], paddingHorizontal: spacing[2] }]} padding="none">
              <CardContent style={{ paddingBottom: 0 }}>
                <MonthlyComparisonChart data={monthlyComparison} />
              </CardContent>
            </Card>
          </View>
        )}

        {/* Recent transactions */}
        <RecentTransactions
          transactions={recentTransactions}
          onViewAll={() => navigation.navigate('Transações')}
          formatDate={formatBrazilDate}
        />

        <View style={{ height: spacing[8] }} />
      </ScrollView>

      {/* Bottom sheets */}
      <StatsDetailSheet visible={sheetVisible} onClose={() => setSheetVisible(false)} title={sheetData.title} data={sheetData.data} />
      <StatsDetailSheet visible={scheduledPaymentsSheetVisible} onClose={() => setScheduledPaymentsSheetVisible(false)} title="Pagamentos Programados" data={scheduledPaymentsData} />
      <StatsDetailSheet
        visible={balanceSheetVisible}
        onClose={() => setBalanceSheetVisible(false)}
        title="Saldo Parcial do Mês"
        data={[
          { label: 'Total de Entradas', value: stats.totalIncome, color: colors.brand.primary, subtitle: 'Receitas confirmadas do mês' },
          { label: 'Total de Despesas', value: stats.totalExpenses, color: colors.error.main, subtitle: 'Despesas confirmadas do mês' },
          { label: 'Pagamentos Programados', value: stats.scheduledPayments, color: colors.warning.main, subtitle: 'Contas a pagar do mês' },
          { label: 'Saldo Parcial do Mês', value: stats.balance, color: stats.balance < 0 ? colors.error.main : colors.brand.primary, subtitle: 'Entradas - Despesas - Pagamentos Programados' },
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
      <BankAccountsSheet visible={bankAccountsSheetVisible} onClose={() => setBankAccountsSheetVisible(false)} accounts={bankAccounts} />
    </View>
  );
}

function StatCardWithHint({ label, value, icon, variant, onPress, colors, valueColor }) {
  return (
    <View style={{ position: 'relative', width: STAT_CARD_WIDTH }}>
      <StatCard
        label={label}
        value={value}
        icon={icon}
        variant={variant}
        style={{ width: STAT_CARD_WIDTH }}
        valueColor={valueColor}
        onPress={onPress}
      />
      <View style={{ position: 'absolute', top: spacing[0.5], right: spacing[0.5], pointerEvents: 'none' }}>
        <HelpCircle size={14} color={colors.text.tertiary} />
      </View>
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
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: spacing[2] },
  section: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  statsScroll: { gap: spacing[1.5] },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: { flex: 1, alignItems: 'center' },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.light,
  },
  chartsScroll: {
    gap: spacing[2],
    paddingRight: spacing[2],
  },
  chartCard: {
    width: width - spacing[2] * 2,
  },
});
