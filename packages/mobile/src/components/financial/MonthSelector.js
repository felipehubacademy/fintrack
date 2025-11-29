import React, { useMemo, useCallback } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text } from '../ui/Text';

/**
 * MonthSelector - Seletor de mês minimalista
 */
export const MonthSelector = React.memo(function MonthSelector({ selectedMonth, onMonthChange }) {
  // Parse correto da data - memoizado
  const monthInfo = useMemo(() => {
    const [year, month] = selectedMonth.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    
    const monthName = monthDate.toLocaleDateString('pt-BR', { 
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Sao_Paulo'
    });

    const capitalizedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    const currentMonth = new Date().toISOString().slice(0, 7);
    const isCurrentMonth = selectedMonth === currentMonth;
    const isFutureMonth = selectedMonth > currentMonth;

    return { monthDate, capitalizedMonth, isCurrentMonth, isFutureMonth };
  }, [selectedMonth]);

  const goToPreviousMonth = useCallback(() => {
    const [year, month] = selectedMonth.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const date = new Date(monthDate);
    date.setMonth(date.getMonth() - 1);
    const newMonth = date.toISOString().slice(0, 7);
    onMonthChange(newMonth);
  }, [selectedMonth, onMonthChange]);

  const goToNextMonth = useCallback(() => {
    const [year, month] = selectedMonth.split('-');
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
    const date = new Date(monthDate);
    date.setMonth(date.getMonth() + 1);
    const newMonth = date.toISOString().slice(0, 7);
    onMonthChange(newMonth);
  }, [selectedMonth, onMonthChange]);

  return (
    <View style={styles.container}>
      <TouchableOpacity 
        style={styles.arrow}
        onPress={goToPreviousMonth}
        activeOpacity={0.6}
        accessibilityRole="button"
        accessibilityLabel="Mês anterior"
        accessibilityHint="Navegar para o mês anterior"
      >
        <ChevronLeft size={24} color={colors.text.primary} />
      </TouchableOpacity>

      <View style={styles.monthContainer}>
        <Text variant="headline" weight="semiBold">
          {monthInfo.capitalizedMonth}
        </Text>
        {monthInfo.isCurrentMonth && (
          <View style={styles.currentIndicator}>
            <Text variant="caption1" color="inverse" weight="medium">
              Atual
            </Text>
          </View>
        )}
      </View>

      <TouchableOpacity 
        style={styles.arrow}
        onPress={goToNextMonth}
        activeOpacity={0.6}
        disabled={monthInfo.isFutureMonth}
        accessibilityRole="button"
        accessibilityLabel={monthInfo.isFutureMonth ? "Mês futuro não disponível" : "Próximo mês"}
        accessibilityHint={monthInfo.isFutureMonth ? undefined : "Navegar para o próximo mês"}
        accessibilityState={{ disabled: monthInfo.isFutureMonth }}
      >
        <ChevronRight 
          size={24} 
          color={monthInfo.isFutureMonth ? colors.text.tertiary : colors.text.primary} 
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

