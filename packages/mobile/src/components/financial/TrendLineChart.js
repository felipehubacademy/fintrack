import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, radius } from '../../theme';
import { Caption, Footnote } from '../ui/Text';
import { Card } from '../ui/Card';

const { width } = Dimensions.get('window');

export function TrendLineChart({ data, height = 200 }) {
  // data: { labels: ['Jan', 'Fev', ...], datasets: [{ data: [100, 200, ...], label: 'Necessidades' }] }
  
  if (!data || !data.datasets || data.datasets.length === 0) {
    return (
      <Card style={styles.container}>
        <Caption color="secondary">Sem dados de tendência</Caption>
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
      r: '4',
      strokeWidth: '2',
      stroke: colors.brand.primary,
    },
    propsForBackgroundLines: {
      strokeDasharray: '5,5',
      stroke: colors.border.light,
      strokeWidth: 1,
    },
  };

  // Configurar cores para cada dataset
  const chartData = {
    labels: data.labels,
    datasets: data.datasets.map((dataset, index) => ({
      ...dataset,
      color: (opacity = 1) => {
        const colors_arr = [
          `rgba(239, 68, 68, ${opacity})`, // Necessidades (vermelho)
          `rgba(59, 130, 246, ${opacity})`, // Desejos (azul)
          `rgba(34, 197, 94, ${opacity})`,  // Investimentos (verde)
        ];
        return colors_arr[index % colors_arr.length];
      },
      strokeWidth: 2,
    })),
    legend: data.datasets.map(d => d.label || ''),
  };

  return (
    <Card style={styles.container}>
      <LineChart
        data={chartData}
        width={width - spacing[2] * 4}
        height={height}
        chartConfig={chartConfig}
        bezier
        style={styles.chart}
        withInnerLines={true}
        withOuterLines={true}
        withVerticalLines={false}
        withHorizontalLines={true}
        fromZero={true}
        yAxisLabel="R$ "
        yAxisSuffix="k"
      />
      {data.datasets.length > 1 && (
        <View style={styles.legend}>
          {data.datasets.map((dataset, index) => {
            const legendColors = [colors.error.main, colors.info.main, colors.success.main];
            return (
              <View key={index} style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: legendColors[index % legendColors.length] }]} />
                <Footnote color="secondary">{dataset.label}</Footnote>
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

