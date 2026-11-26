import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing } from '../../theme';
import { Caption, Footnote } from '../ui/Text';
import { StatsDetailSheet } from './StatsDetailSheet';
import { useI18n } from '../../contexts/I18nContext';

export const MonthlyComparisonChart = React.memo(function MonthlyComparisonChart({ data }) {
  const [sheetVisible, setSheetVisible] = useState(false);
  const [selectedData, setSelectedData] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const { t } = useI18n();
  
  // Callers pass month names already formatted for the active language;
  // the chart only needs a short form of them.
  const abbreviateMonth = useCallback((fullMonth = '') => String(fullMonth).substring(0, 3), []);

  // Processar dados - memoizado
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map(item => ({
      month: item.month, // Nome completo (para o modal)
      monthShort: abbreviateMonth(item.month), // Abreviação (para o gráfico)
      income: item.income || 0,
      expense: (item.credit || 0) + (item.cash || 0),
      credit: item.credit || 0,
      cash: item.cash || 0,
    }));
  }, [data, abbreviateMonth]);

  // Encontrar valor máximo - memoizado
  const maxValue = useMemo(() => {
    if (!processedData || processedData.length === 0) return 0.1;
    const allValues = processedData.flatMap(d => [d.income, d.expense]);
    const realMax = Math.max(...allValues, 0.1);
    return realMax * 1.2;
  }, [processedData]);
  
  const handleMonthPress = useCallback((item) => {
    setSelectedMonth(item.month); // Guardar o mês clicado
    setSelectedData([
      {
        label: t('finances.filters.typeIncome'),
        value: item.income * 1000,
        color: colors.brand.primary,
      },
      {
        label: t('closing.spendingShort'),
        value: item.expense * 1000,
        color: colors.neutral[400],
        breakdown: [
          { label: t('finances.charts.credit'), value: item.credit * 1000 },
          { label: t('closing.stats.paidNow'), value: item.cash * 1000 },
        ],
      },
    ]);
    setSheetVisible(true);
  }, [t]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Caption color="secondary">{t('finances.charts.noComparison')}</Caption>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Chart */}
      <View style={styles.chartContainer}>
        {processedData.map((item, index) => {
          const incomePercent = maxValue > 0 ? (item.income / maxValue) : 0;
          const expensePercent = maxValue > 0 ? (item.expense / maxValue) : 0;
          
          return (
            <TouchableOpacity
              key={index}
              style={styles.monthColumn}
              onPress={() => handleMonthPress(item)}
              activeOpacity={0.7}
            >
              {/* Barras */}
              <View style={styles.barsArea}>
                {/* Entrada */}
                <View 
                  style={[
                    styles.bar,
                    {
                      height: `${incomePercent * 100}%`,
                      backgroundColor: colors.brand.primary,
                    }
                  ]}
                />
                
                {/* Saída */}
                <View 
                  style={[
                    styles.bar,
                    {
                      height: `${expensePercent * 100}%`,
                      backgroundColor: colors.neutral[400],
                    }
                  ]}
                />
              </View>
              
              {/* Label - Abreviado para caber */}
              <Footnote color="secondary" style={styles.label}>
                {item.monthShort}
              </Footnote>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Legenda */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.brand.primary }]} />
          <Footnote color="secondary">{t('finances.filters.typeIncome')}</Footnote>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: colors.neutral[400] }]} />
          <Footnote color="secondary">{t('closing.spendingShort')}</Footnote>
        </View>
      </View>
      
      <Caption color="secondary" style={styles.hint}>
        {t('finances.charts.tapMonth')}
      </Caption>

      {/* Modal */}
      <StatsDetailSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        data={selectedData || []}
        title={selectedMonth ? t('finances.charts.monthDetails', { month: selectedMonth }) : t('finances.charts.monthDetailsGeneric')}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: spacing[3], // Mais espaço do título
    paddingBottom: spacing[3], // Mesmo espaço do topo
  },

  emptyContainer: {
    padding: spacing[4],
    alignItems: 'center',
  },

  chartContainer: {
    flexDirection: 'row',
    height: 120,
    paddingHorizontal: spacing[2], // Reduzido de spacing[4] para spacing[2]
    marginBottom: 0, // Removido
  },

  monthColumn: {
    flex: 1,
    height: '100%',
  },

  barsArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 6,
    paddingBottom: spacing[1], // Reduzido
  },

  bar: {
    width: 16,
    minHeight: 2,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  label: {
    fontSize: 11,
    textAlign: 'center',
  },

  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3], // Mesmo espaço do topo
    paddingHorizontal: spacing[2], // Reduzido para corresponder ao chartContainer
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },

  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1.5],
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  hint: {
    textAlign: 'center',
    paddingTop: spacing[1],
    paddingBottom: spacing[2], // Espaço adequado
    fontSize: 11,
    fontStyle: 'italic',
  },
});
