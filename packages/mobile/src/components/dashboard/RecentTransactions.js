import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowUpRight, ArrowDownLeft, ChevronRight } from 'lucide-react-native';
import { spacing, radius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Text, Headline, Callout, Caption } from '../ui/Text';
import { Card } from '../ui/Card';
import { CategoryIcon } from '../ui/CategoryIcon';
import { formatCurrency } from '@fintrack/shared/utils';

export function RecentTransactions({
  transactions = [],
  onViewAll,
  formatDate,
}) {
  const { colors } = useTheme();

  if (transactions.length === 0) {
    return (
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Headline weight="semiBold">Atividade Recente</Headline>
        </View>
        <Card>
          <View style={styles.emptyState}>
            <Text variant="body" color="secondary" style={{ textAlign: 'center' }}>
              Nenhuma transação este mês.{'\n'}
              Comece adicionando suas receitas e despesas.
            </Text>
          </View>
        </Card>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Headline weight="semiBold">Atividade Recente</Headline>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll} style={styles.viewAllButton}>
            <Callout style={{ color: colors.brand.primary }}>Ver todas</Callout>
            <ChevronRight size={16} color={colors.brand.primary} />
          </TouchableOpacity>
        )}
      </View>

      <Card padding="none">
        {transactions.map((transaction, index) => {
          const isIncome = transaction.type === 'income';
          return (
            <View
              key={transaction.id}
              style={[
                styles.item,
                index < transactions.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: colors.border.light,
                },
              ]}
            >
              <View style={[
                styles.icon,
                { backgroundColor: isIncome ? colors.info.bg : colors.error.bg },
              ]}>
                {isIncome
                  ? <ArrowDownLeft size={18} color={colors.brand.primary} />
                  : <ArrowUpRight size={18} color={colors.error.main} />
                }
              </View>

              <View style={styles.content}>
                <Text variant="callout" weight="medium">
                  {transaction.description || 'Sem descrição'}
                </Text>
                <Caption color="secondary">
                  {formatDate?.(transaction.date) || transaction.date}
                </Caption>
              </View>

              <Text
                variant="callout"
                weight="semiBold"
                style={{ color: isIncome ? colors.brand.primary : colors.financial.expense }}
              >
                {isIncome ? '+' : '-'}
                {formatCurrency(Math.abs(transaction.amount || 0))}
              </Text>
            </View>
          );
        })}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: spacing[3],
    paddingHorizontal: spacing[2],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1.5],
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing[1.5],
  },
  content: {
    flex: 1,
  },
  emptyState: {
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
  },
});
