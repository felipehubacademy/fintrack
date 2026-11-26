import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';
import { spacing } from '../../theme';
import { Text, Caption, Footnote } from '../ui/Text';

const BAR_MAX_HEIGHT = 72;

/**
 * "Next 6 months committed": installments already scheduled, one bar per
 * statement month. `data` comes from committedByMonth().
 * scope: 'card' (one card) or 'all' (every card).
 */
export function CommittedMonthsCard({ data, scope = 'card', style }) {
  const { colors } = useTheme();
  const { t, formatMoney, formatMoneyCompact, formatDate } = useI18n();
  const months = data?.months || [];
  const total = data?.total || 0;
  const max = data?.max || 0;

  const monthLabel = (monthKey) => formatDate(`${monthKey}-01`, 'monthShort');
  const headline = t('finances.committed.headline', { amount: formatMoney(total) });

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.secondary }, style]}
      accessible
      accessibilityLabel={`${t('finances.committed.title')}. ${headline}`}
    >
      <Caption color="secondary" weight="semiBold" style={styles.eyebrow}>
        {t('finances.committed.title')}
      </Caption>
      <Text variant="headline" style={styles.headline}>
        <Text variant="headline" weight="bold">{formatMoney(total)}</Text>
        {' '}
        {t('finances.committed.headlineSuffix')}
      </Text>
      <Footnote color="secondary" style={styles.subtitle}>
        {total > 0
          ? t(scope === 'all' ? 'finances.committed.subtitleAll' : 'finances.committed.subtitleCard')
          : t('finances.committed.none')}
      </Footnote>

      {total > 0 && (
        <View style={styles.bars}>
          {months.map((m) => {
            const height = max > 0 ? Math.max(4, Math.round((m.total / max) * BAR_MAX_HEIGHT)) : 4;
            return (
              <View
                key={m.monthKey}
                style={styles.barColumn}
                accessible
                accessibilityLabel={t('finances.committed.barA11y', {
                  month: formatDate(`${m.monthKey}-01`, 'monthYear'),
                  amount: formatMoney(m.total),
                })}
              >
                <Caption color="secondary" style={styles.barValue} numberOfLines={1}>
                  {m.total > 0 ? formatMoneyCompact(m.total) : ''}
                </Caption>
                <View style={[styles.barTrack, { height: BAR_MAX_HEIGHT }]}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height,
                        backgroundColor: m.total > 0 ? colors.brand.primary : colors.border.main,
                      },
                    ]}
                  />
                </View>
                <Caption color="secondary" style={styles.barLabel}>
                  {monthLabel(m.monthKey)}
                </Caption>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing[2],
  },
  eyebrow: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing[0.5],
  },
  headline: {
    marginBottom: spacing[0.5],
  },
  subtitle: {
    marginBottom: spacing[1.5],
  },
  bars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing[1],
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
  },
  barValue: {
    fontSize: 10,
    marginBottom: spacing[0.5],
  },
  barTrack: {
    width: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
  },
  barLabel: {
    marginTop: spacing[0.5],
    textTransform: 'capitalize',
  },
});

export default CommittedMonthsCard;
