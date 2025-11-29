import React, { useState, useMemo, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { colors, spacing, radius } from '../../theme';
import { Text, Caption } from '../ui/Text';
import { formatCurrency } from '@fintrack/shared/utils';

/**
 * CategoryDonutChart - Gráfico donut minimalista
 */
export const CategoryDonutChart = React.memo(function CategoryDonutChart({ data, title, onCategoryPress }) {
  const [expanded, setExpanded] = useState(false);
  const [activeSlice, setActiveSlice] = useState(null);

  // Constantes
  const COLLAPSED_LIMIT = 3;
  const SIZE = 200;
  const RADIUS = 85;
  const HOLE_RADIUS = 55;
  const CENTER = SIZE / 2;

  // Cores para as categorias - memoizado
  const defaultColors = useMemo(() => [
    colors.brand.primary,
    colors.success.main,
    colors.warning.main,
    colors.error.main,
    '#8B5CF6', // purple
    '#EC4899', // pink
    '#14B8A6', // teal
    '#F59E0B', // amber
  ], []);

  // Preparar dados com cores - memoizado
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((item, index) => {
      const color = item.color || defaultColors[index % defaultColors.length];
      return {
        value: item.value,
        color: color,
        name: item.label,
      };
    });
  }, [data, defaultColors]);

  // Calcular total - memoizado
  const total = useMemo(() => {
    return chartData.reduce((sum, item) => sum + item.value, 0);
  }, [chartData]);

  const hasMore = useMemo(() => data.length > COLLAPSED_LIMIT, [data.length]);

  if (!data || data.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text variant="callout" color="secondary" align="center">
          Sem dados para exibir
        </Text>
      </View>
    );
  }
  
  // Criar paths SVG para cada fatia - memoizado
  const slices = useMemo(() => {
    let currentAngle = -90; // Começar do topo
    
    return chartData.map((item) => {
      const percentage = (item.value / total) * 100;
      const angle = (percentage / 100) * 360;
      
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      // Converter graus para radianos
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      
      // Calcular pontos externos
      const x1 = CENTER + RADIUS * Math.cos(startRad);
      const y1 = CENTER + RADIUS * Math.sin(startRad);
      const x2 = CENTER + RADIUS * Math.cos(endRad);
      const y2 = CENTER + RADIUS * Math.sin(endRad);
      
      // Calcular pontos internos (hole)
      const x3 = CENTER + HOLE_RADIUS * Math.cos(endRad);
      const y3 = CENTER + HOLE_RADIUS * Math.sin(endRad);
      const x4 = CENTER + HOLE_RADIUS * Math.cos(startRad);
      const y4 = CENTER + HOLE_RADIUS * Math.sin(startRad);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      // Path: M (move to) -> A (arc external) -> L (line to) -> A (arc internal) -> Z (close)
      const outerArc = `M ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
      const innerPath = HOLE_RADIUS
        ? `L ${x3} ${y3} A ${HOLE_RADIUS} ${HOLE_RADIUS} 0 ${largeArcFlag} 0 ${x4} ${y4}`
        : `L ${CENTER} ${CENTER}`;
      const pathData = `${outerArc} ${innerPath} Z`;
      
      currentAngle = endAngle;
      
      return {
        path: pathData,
        color: item.color,
        name: item.name,
        value: item.value,
        percentage: percentage.toFixed(1),
      };
    });
  }, [chartData, total, CENTER, RADIUS, HOLE_RADIUS]);

  const handleLegendPress = useCallback((sliceName, sliceValue) => {
    setActiveSlice({ name: sliceName, value: sliceValue });
    onCategoryPress?.(sliceName);
  }, [onCategoryPress]);

  return (
    <View style={styles.container}>
      {title && (
        <Text variant="headline" weight="semiBold" style={styles.title}>
          {title}
        </Text>
      )}

      <View style={styles.chartContainer}>
        {/* SVG Donut Chart */}
        <Svg width={SIZE} height={SIZE}>
          <G>
            {slices.map((slice, index) => (
              <Path
                key={index}
                d={slice.path}
                fill={slice.color}
                stroke="#FFFFFF"
                strokeWidth={2}
                onPress={() => setActiveSlice({ name: slice.name, value: slice.value })}
              />
            ))}
          </G>
        </Svg>
        
        {/* Center text sobreposto */}
        <View style={styles.centerTextContainer}>
          <Text
            variant="callout"
            weight="bold"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.4}
            style={styles.centerValue}
          >
            {formatCurrency(activeSlice?.value ?? total)}
          </Text>
          <Caption color="secondary" style={{ fontSize: 11 }}>
            {activeSlice?.name || 'Total'}
          </Caption>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {slices
          .slice(0, expanded ? slices.length : COLLAPSED_LIMIT)
          .map((slice, index) => {
            const color = slice.color;
            
            return (
              <TouchableOpacity
                key={index}
                style={styles.legendItem}
                activeOpacity={0.7}
                onPress={() => handleLegendPress(slice.name, slice.value)}
                accessibilityRole="button"
                accessibilityLabel={`${slice.name}: ${formatCurrency(slice.value)} (${slice.percentage}%)`}
                accessibilityHint="Toque para ver detalhes desta categoria"
              >
                <View style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: color }]} />
                  <Text variant="callout" style={styles.legendLabel}>
                    {slice.name}
                  </Text>
                </View>
                <View style={styles.legendValues}>
                  <Text 
                    variant="callout" 
                    weight="semiBold" 
                    style={styles.legendPercentage}
                    numberOfLines={1}
                  >
                    {slice.percentage}%
                  </Text>
                  <Caption 
                    color="secondary" 
                    style={styles.legendAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.7}
                  >
                    {formatCurrency(slice.value)}
                  </Caption>
                </View>
              </TouchableOpacity>
            );
          })}

        {/* Botão Ver todas/Ver menos */}
        {hasMore && (
          <TouchableOpacity 
            style={styles.expandButton}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={expanded ? "Ver menos categorias" : `Ver todas as ${data.length} categorias`}
            accessibilityHint={expanded ? "Recolher lista de categorias" : "Expandir para ver todas as categorias"}
          >
            <Text variant="footnote" weight="semiBold" style={{ color: colors.brand.primary }}>
              {expanded ? 'Ver menos' : `Ver todas (${data.length})`}
            </Text>
            {expanded ? (
              <ChevronUp size={16} color={colors.brand.primary} strokeWidth={2.5} />
            ) : (
              <ChevronDown size={16} color={colors.brand.primary} strokeWidth={2.5} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing[2],
  },

  title: {
    marginBottom: spacing[3],
  },

  chartContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[3],
    position: 'relative',
    height: 200,
    width: 200,
    alignSelf: 'center',
  },

  centerTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 45,
    paddingVertical: 45,
  },

  centerValue: {
    marginBottom: spacing[0.5],
  },

  emptyContainer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },

  legend: {
    gap: spacing[1.5],
    marginTop: spacing[2],
  },

  legendItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Alinhamento no topo
    paddingVertical: spacing[1],
    minHeight: 32, // Altura mínima
  },

  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },

  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing[1.5],
  },

  legendLabel: {
    flex: 1,
    flexShrink: 1,
    marginRight: spacing[1],
  },

  legendValues: {
    alignItems: 'flex-end',
    marginLeft: spacing[1],
    flexShrink: 0, // Não encolhe
    minWidth: 80, // Largura mínima
  },

  legendPercentage: {
    marginBottom: spacing[0.5],
    textAlign: 'right',
  },

  legendAmount: {
    fontSize: 11,
    textAlign: 'right',
  },

  expandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[2],
    marginTop: spacing[1],
    gap: spacing[1],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

