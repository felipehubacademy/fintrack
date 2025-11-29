import React, { useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text } from '../ui/Text';

/**
 * StatCard - Cartão minimalista para exibir estatísticas financeiras
 * Apple-inspired design com gradientes sutis
 */
export const StatCard = React.memo(function StatCard({
  label,
  value,
  icon,
  trend, // 'up', 'down', 'neutral'
  trendValue,
  variant = 'default', // 'default', 'income', 'expense'
  onPress,
  style,
  valueColor, // Cor customizada para o valor
}) {
  const gradientColors = useMemo(() => getGradientColors(variant), [variant]);
  const trendColor = useMemo(() => getTrendColor(trend), [trend]);

  const CardContainer = onPress ? TouchableOpacity : View;

  return (
    <CardContainer
      style={[styles.container, style]}
      onPress={onPress}
      activeOpacity={onPress ? 0.8 : 1}
      accessibilityRole={onPress ? "button" : "none"}
      accessibilityLabel={onPress ? `${label}: ${value}` : undefined}
      accessibilityHint={onPress ? "Toque para ver detalhes" : undefined}
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Header com label e icon */}
        <View style={styles.header}>
          <View style={styles.labelRow}>
            <Text variant="callout" color="secondary" style={styles.label}>
              {label}
            </Text>
            {onPress && (
              <ChevronRight size={14} color={colors.text.tertiary} style={styles.chevron} />
            )}
          </View>
          {icon && <View style={styles.iconContainer}>{icon}</View>}
        </View>

        {/* Valor principal */}
        <Text 
          variant="title3" 
          weight="bold" 
          style={[styles.value, valueColor && { color: valueColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.5}
        >
          {value}
        </Text>

        {/* Trend indicator (opcional) */}
        {trend && trendValue && (
          <View style={styles.trendContainer}>
            <Text 
              variant="footnote" 
              style={[styles.trendText, { color: trendColor }]}
            >
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '•'} {trendValue}
            </Text>
          </View>
        )}
      </LinearGradient>
    </CardContainer>
  );
});

function getGradientColors(variant) {
  switch (variant) {
    case 'income':
      return [colors.info.bg, colors.background.secondary]; // Azul claro
    case 'expense':
      return [colors.error.bg, colors.background.secondary];
    case 'warning':
      return [colors.warning.bg, colors.background.secondary];
    default:
      return [colors.background.secondary, colors.background.secondary];
  }
}

function getTrendColor(trend) {
  switch (trend) {
    case 'up':
      return colors.success.main;
    case 'down':
      return colors.error.main;
    default:
      return colors.text.tertiary;
  }
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    minWidth: 160,
    ...shadows.sm,
  },
  
  gradient: {
    padding: spacing[2],
    height: 120, // Fixo ao invés de minHeight
    justifyContent: 'space-between',
  },
  
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[0.5],
    flex: 1,
  },

  label: {
    flexShrink: 1,
  },

  chevron: {
    opacity: 0.5,
  },
  
  iconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  value: {
    marginVertical: spacing[0.5],
    flexShrink: 1, // Permite shrink se necessário
  },
  
  trendContainer: {
    marginTop: spacing[0.5],
  },
  
  trendText: {
    fontWeight: '600',
  },
});
