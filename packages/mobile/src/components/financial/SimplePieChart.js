import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Caption } from '../ui/Text';

const { width } = Dimensions.get('window');
const CHART_SIZE = width - spacing[2] * 4;

/**
 * SimplePieChart - Gráfico de pizza minimalista
 * Exibe categorias com suas porcentagens
 */
export function SimplePieChart({ data, title }) {
  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="callout" color="secondary" align="center">
          Sem dados para exibir
        </Text>
      </View>
    );
  }

  // Calcular total
  const total = data.reduce((sum, item) => sum + item.value, 0);

  // Cores para as categorias (rotação de palette)
  const chartColors = [
    colors.brand.primary,
    colors.success.main,
    colors.warning.main,
    colors.error.main,
    colors.info.main,
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
  ];

  return (
    <View style={styles.container}>
      {title && (
        <Text variant="headline" weight="semiBold" style={styles.title}>
          {title}
        </Text>
      )}
      {/* Lista removida - breakdown completo está no summaryContainer abaixo */}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },

  title: {
    marginBottom: spacing[2],
  },

  list: {
    gap: spacing[1.5],
  },

  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[1],
  },

  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[1.5],
  },

  itemRight: {
    marginLeft: spacing[2],
  },

  emptyContainer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
});

