import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '../ui/Text';
import { AnimatedNumber } from '../ui/AnimatedNumber';
import { WhatsAppButton } from '../ui/WhatsAppButton';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { ordinalDay } from '../../utils/dailyAllowance';
import { splitTemplate } from '../../utils/template';
import { typography } from '../../theme';

/**
 * The home screen's one number.
 * allowance: result of computeDailyAllowance() (utils/dailyAllowance.js).
 */
export function SpendPerDayHero({ allowance }) {
  const { colors } = useTheme();
  const { t, formatMoney, language } = useI18n();

  if (!allowance) return null;
  const number = [styles.number, typography.tabularNums, { color: colors.text.primary }];

  // No income logged this month: show what went out, and how to unlock the number.
  if (!allowance.hasIncome) {
    const example = t('dashboard.hero.incomeExample');
    return (
      <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
        <Text style={[styles.label, { color: colors.text.secondary }]}>{t('dashboard.hero.noIncomeTitle')}</Text>
        <AnimatedNumber value={allowance.spent} style={number} />
        <Text style={[styles.hint, { color: colors.text.secondary }]}>
          {t('dashboard.hero.noIncomeHint', { example })}
        </Text>
        <WhatsAppButton text={example} style={styles.button} />
      </View>
    );
  }

  // Bills and spending already above income.
  if (allowance.available <= 0) {
    const [before, after] = splitTemplate(t('dashboard.hero.over'), 'amount');
    return (
      <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
        <Text
          style={[styles.sentence, { color: colors.text.primary }]}
          accessibilityLabel={t('dashboard.hero.over', { amount: formatMoney(allowance.overBy) })}
        >
          {before}
          <Text style={[styles.inlineNumber, typography.tabularNums, { color: colors.error.main }]}>
            {formatMoney(allowance.overBy)}
          </Text>
          {after}
        </Text>
        <Text style={[styles.hint, { color: colors.text.secondary }]}>{t('dashboard.hero.overHint')}</Text>
      </View>
    );
  }

  const day = ordinalDay(allowance.lastDay, language);
  const [before, after] = splitTemplate(t('dashboard.hero.perDay', { day }), 'amount');
  return (
    <View style={[styles.card, { backgroundColor: colors.background.secondary }]}>
      <Text
        style={[styles.sentence, { color: colors.text.primary }]}
        accessibilityLabel={t('dashboard.hero.perDayA11y', { amount: formatMoney(allowance.perDay), day })}
      >
        {before}
        <AnimatedNumber value={allowance.perDay} style={[styles.inlineNumber, { color: colors.brand.primary }]} />
        {after}
      </Text>
      <Text style={[styles.hint, { color: colors.text.secondary }]}>
        {t('dashboard.hero.daysLeft', {
          count: allowance.daysLeft,
          committed: formatMoney(allowance.committed),
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 20 },
  label: { fontSize: 15, fontWeight: '500', marginBottom: 4 },
  number: { fontSize: 40, fontWeight: '800', letterSpacing: -1 },
  sentence: { fontSize: 26, lineHeight: 34, fontWeight: '600', letterSpacing: -0.3 },
  inlineNumber: { fontSize: 26, fontWeight: '800' },
  hint: { fontSize: 15, lineHeight: 21, marginTop: 12 },
  button: { marginTop: 16, alignSelf: 'flex-start' },
});
