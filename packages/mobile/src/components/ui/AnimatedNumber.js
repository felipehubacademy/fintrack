import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';

export function AnimatedNumber({
  value = 0,
  prefix = 'R$ ',
  duration = 600,
  style,
  decimals = 2,
}) {
  const { colors } = useTheme();
  const animatedValue = useRef(new Animated.Value(0)).current;
  const displayRef = useRef(null);
  const previousValue = useRef(0);

  useEffect(() => {
    const from = previousValue.current;
    previousValue.current = value;

    animatedValue.setValue(0);
    Animated.timing(animatedValue, {
      toValue: 1,
      duration,
      useNativeDriver: false,
    }).start();

    const listener = animatedValue.addListener(({ value: progress }) => {
      const current = from + (value - from) * progress;
      if (displayRef.current) {
        const formatted = current.toLocaleString('pt-BR', {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        });
        displayRef.current.setNativeProps({
          text: `${prefix}${formatted}`,
        });
      }
    });

    return () => animatedValue.removeListener(listener);
  }, [value]);

  const formatted = value.toLocaleString('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return (
    <Text
      ref={displayRef}
      style={[styles.text, { color: colors.text.primary }, style]}
    >
      {prefix}{formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  text: {
    fontVariant: ['tabular-nums'],
  },
});
