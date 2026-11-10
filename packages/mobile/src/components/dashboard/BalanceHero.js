import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Eye, EyeOff, TrendingUp, TrendingDown } from 'lucide-react-native';
import { spacing, radius } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Title1, Caption, Callout } from '../ui/Text';
import { AnimatedNumber } from '../ui/AnimatedNumber';

export function BalanceHero({
  balance = 0,
  income = 0,
  expenses = 0,
  hidden = false,
  onToggleHidden,
  userName,
}) {
  const { colors, isDark } = useTheme();

  return (
    <LinearGradient
      colors={isDark
        ? [colors.brand.primaryDark, colors.background.tertiary]
        : colors.brand.gradient
      }
      style={styles.container}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      <View style={styles.header}>
        <Caption style={styles.greeting}>
          {userName ? `Olá, ${userName.split(' ')[0]}` : 'Saldo do mês'}
        </Caption>
        {onToggleHidden && (
          <TouchableOpacity onPress={onToggleHidden} hitSlop={12}>
            {hidden
              ? <EyeOff size={20} color="rgba(255,255,255,0.7)" />
              : <Eye size={20} color="rgba(255,255,255,0.7)" />
            }
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.balanceRow}>
        {hidden ? (
          <Title1 style={styles.balanceText}>R$ ••••••</Title1>
        ) : (
          <AnimatedNumber
            value={balance}
            style={styles.balanceText}
            decimals={2}
          />
        )}
      </View>

      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <TrendingUp size={14} color="#34D399" />
          </View>
          <View>
            <Caption style={styles.summaryLabel}>Entradas</Caption>
            {hidden ? (
              <Callout style={styles.summaryValue}>R$ ••••</Callout>
            ) : (
              <AnimatedNumber
                value={income}
                style={styles.summaryValue}
                decimals={2}
              />
            )}
          </View>
        </View>

        <View style={[styles.divider, { backgroundColor: 'rgba(255,255,255,0.2)' }]} />

        <View style={styles.summaryItem}>
          <View style={styles.summaryIcon}>
            <TrendingDown size={14} color="#F87171" />
          </View>
          <View>
            <Caption style={styles.summaryLabel}>Saídas</Caption>
            {hidden ? (
              <Callout style={styles.summaryValue}>R$ ••••</Callout>
            ) : (
              <AnimatedNumber
                value={expenses}
                style={styles.summaryValue}
                decimals={2}
              />
            )}
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing[2],
    borderRadius: radius.xl,
    padding: spacing[3],
    marginBottom: spacing[2],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
  },
  balanceRow: {
    marginBottom: spacing[2.5],
  },
  balanceText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
  },
  summaryValue: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  divider: {
    width: 1,
    height: 32,
    marginHorizontal: spacing[2],
  },
});
