import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { CheckSquare, Square } from 'lucide-react-native';
import { Text } from '../ui/Text';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { categoryLabel } from '../../utils/categoryLabel';
import { typography } from '../../theme';

/** Raw category name of a transaction row (as stored in the database). */
export function transactionCategoryName(tx) {
  return tx?.category_name || tx?.budget_category_name || tx?.income_category_name
    || (typeof tx?.category === 'string' ? tx.category : tx?.category?.name) || null;
}

/** Short payment method label ("Credit", "Pix", "Cash"). */
export function paymentLabel(method, t) {
  if (!method || method === 'unknown') return '';
  return t(`transactions.paymentMethods.${method}`, { defaultValue: method });
}

/**
 * One transaction line: category icon, description, category · payment, amount.
 * Used on Home (last 5) and in the Transactions list.
 */
export function TransactionRow({
  tx,
  isLast = false,
  onPress,
  selectionMode = false,
  selected = false,
}) {
  const { colors } = useTheme();
  const { t, formatMoney } = useI18n();
  const isExpense = tx.type !== 'income';
  const rawCategory = transactionCategoryName(tx);
  const category = categoryLabel(rawCategory, t);
  const payment = isExpense ? paymentLabel(tx.payment_method, t) : '';
  const description = tx.description || t('transactions.noDescription');
  const amount = `${isExpense ? '-' : '+'}${formatMoney(tx.amount || 0)}`;

  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border.light },
        selected && { backgroundColor: colors.brand.bg },
      ]}
      activeOpacity={0.7}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${description}, ${category}, ${amount}`}
      accessibilityState={selectionMode ? { selected } : undefined}
    >
      {selectionMode && (
        <View style={styles.check}>
          {selected
            ? <CheckSquare size={22} color={colors.brand.primary} />
            : <Square size={22} color={colors.text.tertiary} />}
        </View>
      )}
      <CategoryIcon category={rawCategory || 'Outros'} size={36} iconSize={18} />
      <View style={styles.info}>
        <Text style={[styles.desc, { color: colors.text.primary }]} numberOfLines={1}>{description}</Text>
        <Text style={[styles.meta, { color: colors.text.secondary }]} numberOfLines={1}>
          {payment ? `${category} · ${payment}` : category}
        </Text>
      </View>
      <Text
        style={[
          styles.amount,
          typography.tabularNums,
          { color: isExpense ? colors.text.primary : colors.success.main },
        ]}
      >
        {amount}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 16 },
  check: { marginRight: 4 },
  info: { flex: 1, minWidth: 0 },
  desc: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 12, marginTop: 2 },
  amount: { fontSize: 15, fontWeight: '700', textAlign: 'right' },
});
