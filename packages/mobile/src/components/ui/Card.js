import React from 'react';
import { View, StyleSheet } from 'react-native';
import { spacing, radius, shadows } from '../../theme';
import { useTheme } from '../../contexts/ThemeContext';
import { Text } from './Text';

export function Card({
  children,
  variant = 'default',
  padding = 'default',
  style,
  ...props
}) {
  const { colors } = useTheme();

  const variantStyles = {
    default: {
      backgroundColor: colors.background.secondary,
      ...shadows.sm,
    },
    glass: {
      backgroundColor: colors.background.glass,
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    outlined: {
      backgroundColor: colors.background.secondary,
      borderWidth: 1,
      borderColor: colors.border.main,
    },
  };

  return (
    <View
      style={[
        styles.base,
        variantStyles[variant],
        styles[`padding_${padding}`],
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, style, ...props }) {
  return (
    <View style={[styles.header, style]} {...props}>
      {children}
    </View>
  );
}

export function CardTitle({ children, style, ...props }) {
  return (
    <Text variant="headline" weight="semiBold" style={style} {...props}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, style, ...props }) {
  return (
    <Text variant="callout" color="secondary" style={[styles.description, style]} {...props}>
      {children}
    </Text>
  );
}

export function CardContent({ children, style, ...props }) {
  return (
    <View style={[styles.content, style]} {...props}>
      {children}
    </View>
  );
}

export function CardFooter({ children, style, ...props }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.footer, { borderTopColor: colors.border.light }, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: spacing[1.5],
  },
  padding_default: {
    padding: spacing[2],
  },
  padding_lg: {
    padding: spacing[3],
  },
  header: {
    marginBottom: spacing[1.5],
  },
  description: {
    marginTop: spacing[0.5],
  },
  content: {},
  footer: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
  },
});
