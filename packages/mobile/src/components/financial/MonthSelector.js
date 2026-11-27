import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text } from '../ui/Text';
import { useI18n } from '../../contexts/I18nContext';

/**
 * MonthSelector - Seletor de mês minimalista
 */
export const MonthSelector = React.memo(function MonthSelector({ selectedMonth, onMonthChange, allowFuture = false }) {
  const { t, formatDate, language } = useI18n();
  // Parse correto da data - memoizado
  const monthInfo = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    const monthLabel = formatDate(`${selectedMonth}-01`, 'monthYear');
    const capitalizedMonth = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = selectedMonth === currentMonth;
    const isFutureMonth = selectedMonth > currentMonth;

    return { monthDate, capitalizedMonth, isCurrentMonth, isFutureMonth };
  }, [selectedMonth, formatDate, language]);

  // Month keys are built from local dates (toISOString() would shift to UTC
  // and skip or repeat a month east of Greenwich).
  const shiftMonth = useCallback((delta) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 1 + delta, 1);
    onMonthChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`);
  }, [selectedMonth, onMonthChange]);

  const goToPreviousMonth = useCallback(() => shiftMonth(-1), [shiftMonth]);
  const goToNextMonth = useCallback(() => shiftMonth(1), [shiftMonth]);
  const nextDisabled = !allowFuture && monthInfo.isFutureMonth;

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.arrow}
        onPress={goToPreviousMonth}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel={t('finances.month.previous')}
      >
        <ChevronLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.monthContainer}>
        <Text variant="headline" weight="semiBold" style={{ color: colors.text.primary }}>
          {monthInfo.capitalizedMonth}
        </Text>
        {monthInfo.isCurrentMonth && (
          <View style={styles.currentIndicator}>
            <Text variant="caption1" color="inverse" weight="medium">
              {t('finances.month.current')}
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.arrow}
        onPress={goToNextMonth}
        activeOpacity={0.6}
        disabled={nextDisabled}
        accessibilityRole="button"
        accessibilityLabel={t('finances.month.next')}
        accessibilityState={{ disabled: nextDisabled }}
      >
        <ChevronRight 
          size={24} 
          color={nextDisabled ? colors.text.tertiary : colors.text.primary} 
        />
      </TouchableOpacity>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[1.5],
  },
  
  arrow: {
    padding: spacing[1],
    borderRadius: radius.md,
  },
  
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  
  currentIndicator: {
    backgroundColor: colors.brand.primary,
    paddingHorizontal: spacing[1],
    paddingVertical: spacing[0.5],
    borderRadius: radius.sm,
  },
});

