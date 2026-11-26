import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronRight, CreditCard, Target } from 'lucide-react-native';
import { isFeatureEnabled } from '@fintrack/shared/config';
import { useTheme } from '../contexts/ThemeContext';
import { useI18n } from '../contexts/I18nContext';
import { Text } from '../components/ui/Text';
import { WhatsAppButton } from '../components/ui/WhatsAppButton';
import { SpendPerDayHero } from '../components/dashboard/SpendPerDayHero';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { typography } from '../theme';
import { useDashboardData } from '../hooks/useDashboardData';
import { TAB_ROUTES } from '../navigation/routes';
import { useBilling } from '../hooks/useBilling';
import { BillingBanner } from '../components/billing/BillingBanner';

const ROUTES = {
  transactions: TAB_ROUTES.transactions,
  more: TAB_ROUTES.more,
  addTransaction: 'AddTransaction',
};

/**
 * Home (plan 4.1/4.2): one number first ("you can spend X a day until the
 * 30th"), then the big "Log it on WhatsApp" button, month to date, next card
 * bill and the last 5 transactions. The manual form stays reachable but small.
 */
export default function DashboardScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, formatMoney, formatDate } = useI18n();
  const {
    user, orgLoading,
    refreshing, onRefresh,
    stats, recentTransactions,
    allowance, nextStatement, goalsSummary,
  } = useDashboardData(navigation);
  const { requireAccess } = useBilling();

  if (orgLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background.primary }]}>
        <Text variant="body" color="secondary">{t('dashboard.loading')}</Text>
      </View>
    );
  }

  const firstName = user?.name?.trim().split(/\s+/)[0];
  const showGoals = isFeatureEnabled('goals') && goalsSummary;
  const card = [styles.card, { backgroundColor: colors.background.secondary }];
  const money = [styles.money, typography.tabularNums, { color: colors.text.primary }];

  return (
    <View style={[styles.container, { backgroundColor: colors.background.primary }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={[styles.greeting, { color: colors.text.secondary }]} accessibilityRole="header">
          {firstName ? t('dashboard.hi', { name: firstName }) : t('dashboard.hiNoName')}
        </Text>

        {/* Trial ending / ended (paywall flag) */}
        <BillingBanner />

        {/* 1. The one number */}
        <SpendPerDayHero allowance={allowance} />

        {/* 2. Log it on WhatsApp (main path) */}
        <WhatsAppButton size="lg" style={styles.whatsapp} />
        {isFeatureEnabled('manualEntry') && (
          <TouchableOpacity
            style={styles.manual}
            onPress={() => requireAccess(() => navigation.navigate(ROUTES.addTransaction, { type: 'expense' }))}
            accessibilityRole="button"
            hitSlop={8}
          >
            <Text style={[styles.manualText, { color: colors.brand.primary }]}>{t('dashboard.manualAdd')}</Text>
          </TouchableOpacity>
        )}

        {/* 3. Month to date */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text.primary }]} accessibilityRole="header">
            {t('dashboard.monthToDate.title')}
          </Text>
          <View style={[card, styles.row]}>
            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>{t('dashboard.monthToDate.received')}</Text>
              <Text style={money}>{formatMoney(stats.totalIncome)}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: colors.border.light }]} />
            <View style={styles.half}>
              <Text style={[styles.label, { color: colors.text.secondary }]}>{t('dashboard.monthToDate.spent')}</Text>
              <Text style={money}>{formatMoney(stats.totalExpenses)}</Text>
            </View>
          </View>
        </View>

        {/* 4. Next card bill */}
        {nextStatement && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text.primary }]} accessibilityRole="header">
              {t('dashboard.nextStatement.title')}
            </Text>
            <View style={[card, styles.row, styles.cardRow]}>
              <View style={[styles.iconBadge, { backgroundColor: colors.brand.bg }]}>
                <CreditCard size={20} color={colors.brand.primary} />
              </View>
              <View style={styles.flex}>
                <Text style={money}>{formatMoney(nextStatement.amount)}</Text>
                <Text style={[styles.label, { color: colors.text.secondary }]} numberOfLines={1}>
                  {t('dashboard.nextStatement.due', {
                    card: nextStatement.card.name,
                    date: formatDate(nextStatement.dueDate, 'dayMonth'),
                  })}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* 5. Last 5 transactions */}
        <View style={styles.section}>
          <RecentTransactions
            transactions={recentTransactions}
            onSeeAll={() => navigation.navigate(ROUTES.transactions)}
          />
        </View>

        {/* Goals (behind the launch flag) */}
        {showGoals && (
          <TouchableOpacity
            style={[card, styles.row, styles.cardRow, styles.section]}
            onPress={() => navigation.navigate(ROUTES.more, { screen: 'Goals' })}
            accessibilityRole="button"
          >
            <View style={[styles.iconBadge, { backgroundColor: colors.brand.bg }]}>
              <Target size={20} color={colors.brand.primary} />
            </View>
            <View style={styles.flex}>
              <Text style={[styles.sectionTitle, styles.noMargin, { color: colors.text.primary }]}>{t('dashboard.goals.title')}</Text>
              <Text style={[styles.label, { color: colors.text.secondary }]}>
                {t('dashboard.goals.summary', { done: goalsSummary.done, total: goalsSummary.total })}
              </Text>
            </View>
            <ChevronRight size={18} color={colors.text.tertiary} />
          </TouchableOpacity>
        )}

        <View style={{ height: 96 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: 16 },
  greeting: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  whatsapp: { marginTop: 16 },
  manual: { alignSelf: 'center', paddingVertical: 12 },
  manualText: { fontSize: 15, fontWeight: '600' },
  section: { marginTop: 24 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  noMargin: { marginBottom: 0 },
  card: { borderRadius: 12, padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center' },
  cardRow: { gap: 12 },
  half: { flex: 1 },
  flex: { flex: 1, minWidth: 0 },
  divider: { width: 1, alignSelf: 'stretch', marginHorizontal: 16 },
  label: { fontSize: 13, marginTop: 2 },
  money: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  iconBadge: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
