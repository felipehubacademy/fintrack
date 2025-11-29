import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, radius } from '../../theme';
import { Caption } from '../ui/Text';
import { Card } from '../ui/Card';

const { width } = Dimensions.get('window');

export function MacroAreaChart({ data, height = 200 }) {
  // data: { labels: ['1', '5', '10', '15', ...], datasets: [{ data: [100, 120, ...] }] }
  
  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <Card style={styles.container}>
        <Caption color="secondary">Sem dados de ondas de gastos</Caption>
      </Card>
    );
  }

  const chartConfig = {
    backgroundColor: colors.background.primary,
    backgroundGradientFrom: colors.background.primary,
    backgroundGradientTo: colors.background.primary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(99, 102, 241, ${opacity})`,
    labelColor: (opacity = 1) => colors.text.secondary,
    style: {
      borderRadius: radius.lg,
    },
    propsForDots: {
      r: '0', // Hide dots
    },
    fillShadowGradient: colors.brand.primary,
    fillShadowGradientOpacity: 0.3,
    propsForBackgroundLines: {
      strokeDasharray: '0', // No dashed lines
      stroke: colors.border.light,
      strokeWidth: 1,
    },
  };

  // Preparar dados para LineChart (usa formato diferente)
  const chartData = {
    labels: data.labels || [],
    datasets: data.datasets.map((dataset, index) => ({
      data: dataset.data || [],
      color: (opacity = 1) => {
        const colors_arr = [
          `rgba(37, 99, 235, ${opacity})`,   // Necessidades (azul)
          `rgba(139, 92, 246, ${opacity})`,  // Desejos (roxo)
          `rgba(16, 185, 129, ${opacity})`,  // Investimentos (verde)
        ];
        return colors_arr[index % colors_arr.length];
      },
      strokeWidth: 2,
    })),
    legend: data.datasets.map(d => d.label || ''),
  };

  return (
    <Card style={styles.container}>
      <Caption color="secondary" style={styles.title}>Ondas de Gastos Diários</Caption>
      <LineChart
        data={chartData}
        width={width - spacing[2] * 4}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={false}
        withOuterLines={false}
        withVerticalLines={false}
        withHorizontalLines={false}
        fromZero={true}
        yAxisLabel="R$ "
        yAxisSuffix=""
        withShadow={true}
        withDots={false}
      />
      {data.datasets.length > 1 && (
        <View style={styles.legend}>
          {data.datasets.map((dataset, index) => {
            const legendColors = [
              colors.info.main,    // Necessidades
              colors.brand.primary, // Desejos
              colors.success.main,  // Investimentos
            ];
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: legendColors[index % legendColors.length] }]} />
                <Caption color="secondary" style={{ fontSize: 11 }}>
                  {dataset.label || `Dataset ${index + 1}`}
                </Caption>
              </View>
            );
          })}
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },

  title: {
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  chart: {
    borderRadius: radius.lg,
    marginVertical: spacing[1],
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[2],
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});

