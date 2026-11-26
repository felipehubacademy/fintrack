import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { formatMoney, formatNumber } from '@fintrack/shared/i18n';
import { useTheme } from '../../contexts/ThemeContext';
import { useI18n } from '../../contexts/I18nContext';

/**
 * Formats a value the way AnimatedNumber shows it.
 * format 'money' (default) uses the user's currency and locale;
 * 'number' is a plain locale number. prefix/suffix are added as given.
 */
export function formatAnimatedValue(value, { format = 'money', decimals = 2, prefix = '', suffix = '' } = {}) {
  const options = { minimumFractionDigits: decimals, maximumFractionDigits: decimals };
  const body = format === 'number'
    ? formatNumber(value, { numberOptions: options })
    : formatMoney(value, options);
  return `${prefix}${body}${suffix}`;
}

/** Count-up number (used once, when the hero number first appears). */
export function AnimatedNumber({
  value = 0,
  format = 'money',
  prefix = '',
  suffix = '',
  duration = 600,
  style,
  decimals = 2,
  animate = true,
}) {
  const { colors } = useTheme();
  // Subscribe to language/currency changes.
  useI18n();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const previousValue = useRef(0);
  const [display, setDisplay] = useState(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      setDisplay(value);
      return undefined;
    }
    const from = previousValue.current;
    previousValue.current = value;

    animatedValue.setValue(0);
    const listener = animatedValue.addListener(({ value: progress }) => {
      setDisplay(from + (value - from) * progress);
    });
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start(() => setDisplay(value));

    return () => animatedValue.removeListener(listener);
  }, [value, animate]);

  return (
    <Text style={[styles.text, { color: colors.text.primary }, style]}>
      {formatAnimatedValue(display, { format, decimals, prefix, suffix })}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
});
