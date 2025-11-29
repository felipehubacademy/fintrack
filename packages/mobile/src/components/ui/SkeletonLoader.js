import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { colors, spacing, radius } from '../../theme';

/**
 * SkeletonLoader - Componente de loading skeleton padronizado
 * 
 * Props:
 * - width: Largura do skeleton (number ou '100%')
 * - height: Altura do skeleton (number)
 * - variant: 'text' | 'card' | 'circle' | 'custom' (default: 'text')
 * - style: Estilos adicionais
 * - count: Quantidade de skeletons (para listas)
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  variant = 'text',
  style,
  count = 1,
}) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getSkeletonStyle = () => {
    const baseStyle = {
      width: typeof width === 'number' ? width : width,
      height,
      backgroundColor: colors.neutral[200],
      borderRadius: radius.md,
    };

    switch (variant) {
      case 'circle':
        return {
          ...baseStyle,
          borderRadius: height / 2,
        };
      case 'card':
        return {
          ...baseStyle,
          borderRadius: radius.lg,
          height: height || 120,
        };
      case 'text':
      default:
        return baseStyle;
    }
  };

  if (count > 1) {
    return (
      <View style={style}>
        {Array.from({ length: count }).map((_, index) => (
          <Animated.View
            key={index}
            style={[
              getSkeletonStyle(),
              { opacity },
              index < count - 1 && { marginBottom: spacing[2] },
            ]}
          />
        ))}
      </View>
    );
  }

  return (
    <Animated.View style={[getSkeletonStyle(), { opacity }, style]} />
  );
}

/**
 * SkeletonCard - Skeleton para cards de transação
 */
export function SkeletonCard({ count = 3 }) {
  return (
    <View style={styles.cardContainer}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.cardItem}>
          <SkeletonLoader variant="circle" width={40} height={40} />
          <View style={styles.cardContent}>
            <SkeletonLoader width="70%" height={16} style={{ marginBottom: spacing[1] }} />
            <SkeletonLoader width="50%" height={12} />
          </View>
          <SkeletonLoader width={60} height={16} />
        </View>
      ))}
    </View>
  );
}

/**
 * SkeletonList - Skeleton para listas
 */
export function SkeletonList({ count = 5, showHeader = false }) {
  return (
    <View style={styles.listContainer}>
      {showHeader && (
        <View style={styles.listHeader}>
          <SkeletonLoader width="40%" height={20} />
          <SkeletonLoader width="30%" height={20} />
        </View>
      )}
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.listItem}>
          <SkeletonLoader variant="circle" width={48} height={48} />
          <View style={styles.listContent}>
            <SkeletonLoader width="60%" height={16} style={{ marginBottom: spacing[0.5] }} />
            <SkeletonLoader width="40%" height={14} />
          </View>
          <SkeletonLoader width={80} height={16} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: colors.background.secondary,
    borderRadius: radius.lg,
    padding: spacing[2],
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  cardContent: {
    flex: 1,
  },
  listContainer: {
    gap: spacing[2],
  },
  listHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing[2],
    marginBottom: spacing[1],
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  listContent: {
    flex: 1,
  },
});

