import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Title1, Caption, Footnote } from '../ui/Text';
import { Card } from '../ui/Card';
import Svg, { Circle, Path } from 'react-native-svg';

export const FinancialScoreGauge = React.memo(function FinancialScoreGauge({ score = 0, maxScore = 100 }) {
  // score: 0-100
  const percentage = useMemo(() => (score / maxScore) * 100, [score, maxScore]);
  
  // Determinar cor baseada no score - memoizado
  const scoreColor = useMemo(() => {
    if (score >= 80) return colors.success.main;
    if (score >= 60) return colors.brand.primary;
    if (score >= 40) return colors.warning.main;
    return colors.error.main;
  }, [score]);

  const scoreLabel = useMemo(() => {
    if (score >= 80) return 'Excelente';
    if (score >= 60) return 'Bom';
    if (score >= 40) return 'Regular';
    return 'Precisa Melhorar';
  }, [score]);
  const size = 200;
  const strokeWidth = 20;
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Card style={styles.container}>
      <Caption color="secondary" style={styles.title}>Saúde Financeira</Caption>
      
      <View style={styles.gaugeContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Background circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={colors.neutral[200]}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress circle */}
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
          />
        </Svg>
        
        <View style={styles.scoreOverlay}>
          <Title1 weight="bold" style={{ color: scoreColor }}>
            {Math.round(score)}
          </Title1>
          <Footnote color="secondary">de {maxScore}</Footnote>
        </View>
      </View>

      <Caption style={{ color: scoreColor, marginTop: spacing[2] }}>
        {scoreLabel}
      </Caption>

      <View style={styles.metrics}>
        <View style={styles.metricItem}>
          <Footnote color="secondary">Orçamento</Footnote>
          <View style={[styles.metricBar, { width: `${Math.min(score, 100)}%`, backgroundColor: scoreColor }]} />
        </View>
        <View style={styles.metricItem}>
          <Footnote color="secondary">Poupança</Footnote>
          <View style={[styles.metricBar, { width: `${Math.min(score * 0.8, 100)}%`, backgroundColor: scoreColor }]} />
        </View>
        <View style={styles.metricItem}>
          <Footnote color="secondary">Dívidas</Footnote>
          <View style={[styles.metricBar, { width: `${Math.min(score * 0.9, 100)}%`, backgroundColor: scoreColor }]} />
        </View>
      </View>
    </Card>
  );
});

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: spacing[3],
  },

  title: {
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: '600',
  },

  gaugeContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  scoreOverlay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },

  metrics: {
    width: '100%',
    marginTop: spacing[3],
    gap: spacing[2],
  },

  metricItem: {
    width: '100%',
  },

  metricBar: {
    height: 6,
    backgroundColor: colors.brand.primary,
    borderRadius: radius.full,
    marginTop: spacing[1],
  },
});

