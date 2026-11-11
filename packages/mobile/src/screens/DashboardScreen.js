import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowDownLeft,
  ArrowUpRight,
  CreditCard,
  PieChart,
  ChevronRight,
  Receipt,
  Target,
} from 'lucide-react-native';
import { colors, spacing } from '../theme';
import { useTheme } from '../contexts/ThemeContext';
import { Text, Headline, Caption } from '../components/ui/Text';
import { MonthSelector } from '../components/financial/MonthSelector';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { formatCurrency } from '@fintrack/shared/utils';
import { formatBrazilDate, formatBrazilDayMonthShort } from '../utils/date';
import { useDashboardData } from '../hooks/useDashboardData';

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { colors: themeColors, isDark } = useTheme();
  const {
    user, orgLoading,
    selectedMonth, setSelectedMonth,
    refreshing, onRefresh,
    stats, recentTransactions,
    alarmingCategories,
  } = useDashboardData(navigation);

  if (orgLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: themeColors.background.primary }]}>
        <Text variant="body" color="secondary">Carregando...</Text>
      </View>
    );
  }

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <View style={[styles.container, { backgroundColor: themeColors.background.primary }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting()},</Text>
            <Headline style={styles.userName}>{user?.name?.split(' ')[0] || 'Usuário'}</Headline>
          </View>
          <MonthSelector selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} compact />
        </View>

        {/* Balance Card */}
        <View style={styles.section}>
          <LinearGradient
            colors={['#1A6AFF', '#0047CC']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.balanceCard}
          >
            <Text style={styles.balanceLabel}>Saldo de {getMonthName(selectedMonth)}</Text>
            <Text style={styles.balanceAmount}>{formatCurrency(stats.balance)}</Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>Entradas</Text>
                <Text style={[styles.balanceItemValue, { color: '#A5F3C0' }]}>
                  {formatCurrency(stats.totalIncome)}
                </Text>
              </View>
              <View style={styles.balanceItem}>
                <Text style={styles.balanceItemLabel}>Saídas</Text>
                <Text style={[styles.balanceItemValue, { color: '#FFB3B0' }]}>
                  {formatCurrency(stats.totalExpenses)}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <QuickAction
            icon={<ArrowDownLeft size={18} color="#EF4444" />}
            label="Despesa"
            bg={isDark ? '#EF444418' : '#FEF2F2'}
            onPress={() => navigation.navigate('AddTransaction', { type: 'expense' })}
          />
          <QuickAction
            icon={<ArrowUpRight size={18} color="#22C55E" />}
            label="Receita"
            bg={isDark ? '#22C55E18' : '#F0FDF4'}
            onPress={() => navigation.navigate('AddTransaction', { type: 'income' })}
          />
          <QuickAction
            icon={<CreditCard size={18} color="#6366F1" />}
            label="Cartões"
            bg={isDark ? '#6366F118' : '#EEF2FF'}
            onPress={() => navigation.navigate('Mais', { screen: 'Cards' })}
          />
          <QuickAction
            icon={<PieChart size={18} color="#F59E0B" />}
            label="Orçamento"
            bg={isDark ? '#F59E0B18' : '#FFFBEB'}
            onPress={() => navigation.navigate('Orçamento')}
          />
        </View>

        {/* Budget Mini */}
        {alarmingCategories.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Headline style={styles.sectionTitle}>Orçamentos</Headline>
              <TouchableOpacity onPress={() => navigation.navigate('Orçamento')}>
                <Text style={[styles.seeAll, { color: themeColors.brand.primary }]}>Ver todos</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.card, { backgroundColor: themeColors.background.secondary || themeColors.background.primary }]}>
              {alarmingCategories.slice(0, 4).map((budget, i) => (
                <BudgetMiniItem
                  key={budget.id || i}
                  name={budget.category_name}
                  percentage={budget.percentage}
                  color={budget.color}
                  isLast={i === Math.min(alarmingCategories.length, 4) - 1}
                />
              ))}
            </View>
          </View>
        )}

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Headline style={styles.sectionTitle}>Últimas transações</Headline>
            <TouchableOpacity onPress={() => navigation.navigate('Transações')}>
              <Text style={[styles.seeAll, { color: themeColors.brand.primary }]}>Ver todas</Text>
            </TouchableOpacity>
          </View>
          {recentTransactions.length === 0 ? (
            <View style={[styles.card, styles.emptyCard, { backgroundColor: themeColors.background.secondary || themeColors.background.primary }]}>
              <Receipt size={32} color={themeColors.text.tertiary} />
              <Text style={{ color: themeColors.text.secondary, fontSize: 13, marginTop: 8 }}>
                Nenhuma transação este mês
              </Text>
            </View>
          ) : (
            <View style={[styles.card, { backgroundColor: themeColors.background.secondary || themeColors.background.primary }]}>
              {recentTransactions.slice(0, 5).map((tx, i) => (
                <TransactionItem
                  key={tx.id || i}
                  tx={tx}
                  isLast={i === Math.min(recentTransactions.length, 5) - 1}
                  themeColors={themeColors}
                />
              ))}
            </View>
          )}
        </View>

        <View style={{ height: spacing[8] }} />
      </ScrollView>
    </View>
  );
}

function QuickAction({ icon, label, bg, onPress }) {
  return (
    <TouchableOpacity style={styles.quickActionItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>{icon}</View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function BudgetMiniItem({ name, percentage, color, isLast }) {
  const barColor = percentage >= 90 ? '#FF3B30' : percentage >= 70 ? '#FF9500' : color;
  return (
    <View style={[styles.budgetItem, !isLast && styles.budgetItemBorder]}>
      <View style={[styles.budgetDot, { backgroundColor: color }]} />
      <View style={styles.budgetInfo}>
        <Text style={styles.budgetName}>{name}</Text>
        <View style={styles.budgetBar}>
          <View style={[styles.budgetFill, { width: `${Math.min(percentage, 100)}%`, backgroundColor: barColor }]} />
        </View>
      </View>
      <Text style={[styles.budgetPct, percentage >= 90 && { color: '#FF3B30' }]}>{percentage}%</Text>
    </View>
  );
}

function TransactionItem({ tx, isLast, themeColors }) {
  const isExpense = tx.type === 'expense';
  const categoryName = tx.budget_category_name || tx.category || tx.income_category_name || 'Outros';

  return (
    <View style={[styles.txItem, !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: themeColors.border?.light || '#E5E5EA' }]}>
      <CategoryIcon category={categoryName} size={36} iconSize={18} />
      <View style={styles.txInfo}>
        <Text style={styles.txDesc} numberOfLines={1}>{tx.description || 'Sem descrição'}</Text>
        <Text style={[styles.txMeta, { color: themeColors.text.tertiary }]}>
          {categoryName}
          {tx.payment_method ? ` · ${getPaymentLabel(tx.payment_method)}` : ''}
        </Text>
      </View>
      <Text style={[styles.txAmount, { color: isExpense ? themeColors.text.primary : '#22C55E' }]}>
        {isExpense ? '-' : '+'}{formatCurrency(tx.amount || 0)}
      </Text>
    </View>
  );
}

function getMonthName(monthStr) {
  const months = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const [, m] = monthStr.split('-');
  return months[parseInt(m, 10) - 1] || '';
}

function getPaymentLabel(method) {
  const labels = {
    credit_card: 'Crédito', debit_card: 'Débito', pix: 'PIX',
    bank_transfer: 'Transferência', boleto: 'Boleto', cash: 'Dinheiro',
  };
  return labels[method] || method;
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: 60 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: 20, paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: '#8E8E93' },
  userName: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  section: { marginBottom: 24, paddingHorizontal: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700', letterSpacing: -0.3 },
  seeAll: { fontSize: 13, fontWeight: '600' },

  // Balance card
  balanceCard: { borderRadius: 20, padding: 24, overflow: 'hidden' },
  balanceLabel: { fontSize: 13, color: 'rgba(255,255,255,0.6)', fontWeight: '500' },
  balanceAmount: { fontSize: 34, fontWeight: '800', color: 'white', letterSpacing: -1, marginVertical: 4 },
  balanceRow: { flexDirection: 'row', gap: 24, marginTop: 12 },
  balanceItem: { flex: 1 },
  balanceItemLabel: { fontSize: 11, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 0.5 },
  balanceItemValue: { fontSize: 16, fontWeight: '700', marginTop: 2 },

  // Quick actions
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 16, marginBottom: 24 },
  quickActionItem: { alignItems: 'center', gap: 6 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  quickActionLabel: { fontSize: 11, fontWeight: '500', color: '#8E8E93' },

  // Card container
  card: { borderRadius: 16, padding: 4, overflow: 'hidden' },
  emptyCard: { padding: 32, alignItems: 'center', justifyContent: 'center' },

  // Budget mini
  budgetItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 12 },
  budgetItemBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border?.light || '#E5E5EA' },
  budgetDot: { width: 8, height: 8, borderRadius: 4 },
  budgetInfo: { flex: 1 },
  budgetName: { fontSize: 13, fontWeight: '600' },
  budgetBar: { height: 4, backgroundColor: '#E5E5EA', borderRadius: 2, marginTop: 5, overflow: 'hidden' },
  budgetFill: { height: '100%', borderRadius: 2 },
  budgetPct: { fontSize: 12, fontWeight: '700', color: '#8E8E93', minWidth: 36, textAlign: 'right' },

  // Transaction item
  txItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 12 },
  txInfo: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 14, fontWeight: '600' },
  txMeta: { fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 14, fontWeight: '700', textAlign: 'right' },
});
