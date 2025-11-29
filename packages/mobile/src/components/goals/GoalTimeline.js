import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { colors, spacing, radius } from '../../theme';
import { Text, Title2, Caption } from '../ui/Text';
import { Card } from '../ui/Card';
import { formatCurrency } from '@fintrack/shared/utils';

const { width } = Dimensions.get('window');

export default function GoalTimeline({ goal, contributions = [] }) {
  // Preparar dados para o gráfico
  const prepareChartData = () => {
    if (!goal || contributions.length === 0) return null;

    // Ordenar contribuições por data
    const sortedContributions = [...contributions].sort((a, b) => 
      new Date(a.contribution_date) - new Date(b.contribution_date)
    );

    // Criar pontos do gráfico
    const data = [];
    let accumulated = parseFloat(goal.current_amount || 0) - 
      sortedContributions.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);

    // Ponto inicial (quando a meta foi criada)
    const startDate = new Date(goal.created_at);
    data.push({
      date: startDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      valor: accumulated,
      meta: parseFloat(goal.target_amount)
    });

    // Adicionar cada contribuição
    sortedContributions.forEach(contribution => {
      accumulated += parseFloat(contribution.amount || 0);
      const contribDate = new Date(contribution.contribution_date);
      data.push({
        date: contribDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        valor: accumulated,
        meta: parseFloat(goal.target_amount),
        contribution: parseFloat(contribution.amount)
      });
    });

    // Adicionar projeção futura se houver contribuição mensal
    if (goal.monthly_contribution > 0 && accumulated < parseFloat(goal.target_amount)) {
      const remaining = parseFloat(goal.target_amount) - accumulated;
      const monthsToGoal = Math.ceil(remaining / goal.monthly_contribution);
      
      // Adicionar até 6 meses de projeção
      const projectionMonths = Math.min(monthsToGoal, 6);
      const lastDate = sortedContributions.length > 0 
        ? new Date(sortedContributions[sortedContributions.length - 1].contribution_date)
        : startDate;
      
      for (let i = 1; i <= projectionMonths; i++) {
        const projectionDate = new Date(lastDate);
        projectionDate.setMonth(projectionDate.getMonth() + i);
        
        accumulated += goal.monthly_contribution;
        data.push({
          date: projectionDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
          projecao: Math.min(accumulated, parseFloat(goal.target_amount)),
          meta: parseFloat(goal.target_amount),
          isProjection: true
        });
      }
    }

    return data;
  };

  const chartData = prepareChartData();

  if (!chartData || chartData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Adicione contribuições para visualizar a evolução</Text>
      </View>
    );
  }

  // Preparar dados para o LineChart
  const labels = chartData.map(d => d.date);
  const valores = chartData.map(d => d.valor || d.projecao || 0);
  const projecoes = chartData.map(d => d.projecao || null);
  const metaValue = parseFloat(goal.target_amount);

  const chartConfig = {
    backgroundColor: colors.background.secondary,
    backgroundGradientFrom: colors.background.secondary,
    backgroundGradientTo: colors.background.secondary,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`, // Azul para valor atual
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

  // Criar dataset com valor atual e projeção
  const chartDataFormatted = {
    labels: labels.slice(0, Math.min(labels.length, 12)), // Limitar a 12 pontos para legibilidade
    datasets: [
      {
        data: valores.slice(0, Math.min(valores.length, 12)),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
        strokeWidth: 3,
      },
      ...(projecoes.some(p => p !== null) ? [{
        data: projecoes.slice(0, Math.min(projecoes.length, 12)),
        color: (opacity = 1) => `rgba(59, 130, 246, ${opacity * 0.5})`,
        strokeWidth: 2,
        withDots: false,
      }] : []),
    ],
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Title2 style={styles.title}>Evolução da Meta</Title2>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.brand.primary }]} />
            <Caption style={styles.legendText}>Valor Atual</Caption>
          </View>
          {projecoes.some(p => p !== null) && (
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, styles.legendDotDashed, { borderColor: colors.brand.primary }]} />
              <Caption style={styles.legendText}>Projeção</Caption>
            </View>
          )}
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.success.main }]} />
            <Caption style={styles.legendText}>Meta</Caption>
          </View>
        </View>
      </View>

      {/* Gráfico */}
      <Card style={styles.chartCard}>
        <LineChart
          data={chartDataFormatted}
          width={width - spacing[3] * 4}
          height={250}
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
          formatYLabel={(value) => {
            const num = parseFloat(value);
            return num >= 1000 ? `${(num / 1000).toFixed(0)}k` : num.toFixed(0);
          }}
        />
        
        {/* Linha da meta (simulada com View) */}
        <View style={[styles.metaLine, { top: calculateMetaLinePosition(metaValue, valores) }]} />
      </Card>

      {/* Milestones */}
      {contributions.length > 0 && (
        <View style={styles.milestoneContainer}>
          <Text style={styles.milestoneText}>
            <Text style={styles.milestoneBold}>{contributions.length}</Text>{' '}
            {contributions.length === 1 ? 'contribuição realizada' : 'contribuições realizadas'}
            {goal.monthly_contribution > 0 && (
              <Text>
                {' · '}Próxima contribuição esperada:{' '}
                <Text style={styles.milestoneBold}>
                  {formatCurrency(goal.monthly_contribution)}
                </Text>
              </Text>
            )}
          </Text>
        </View>
      )}
    </View>
  );
}

// Calcular posição da linha da meta no gráfico
function calculateMetaLinePosition(metaValue, valores) {
  const maxValue = Math.max(...valores, metaValue);
  const minValue = Math.min(...valores, 0);
  const range = maxValue - minValue;
  const chartHeight = 250;
  const padding = 20;
  const usableHeight = chartHeight - padding * 2;
  
  if (range === 0) return chartHeight / 2;
  
  const position = ((metaValue - minValue) / range) * usableHeight;
  return chartHeight - position - padding;
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[3],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  title: {
    fontSize: 18,
  },
  legend: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'wrap',
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
  legendDotDashed: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  legendText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  chartCard: {
    padding: spacing[2],
    backgroundColor: colors.background.secondary,
  },
  chart: {
    marginVertical: spacing[2],
    borderRadius: radius.lg,
  },
  metaLine: {
    position: 'absolute',
    left: spacing[2],
    right: spacing[2],
    height: 2,
    backgroundColor: colors.success.main,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: colors.success.main,
    opacity: 0.6,
  },
  milestoneContainer: {
    backgroundColor: colors.brand.bg,
    borderLeftWidth: 4,
    borderLeftColor: colors.brand.primary,
    borderRadius: radius.md,
    padding: spacing[3],
  },
  milestoneText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  milestoneBold: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  emptyContainer: {
    paddingVertical: spacing[8],
    alignItems: 'center',
  },
  emptyText: {
    color: colors.text.tertiary,
    fontSize: 14,
  },
});

