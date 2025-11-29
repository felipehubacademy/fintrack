import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text } from './Text';

/**
 * Card Component - Minimal Apple-style card
 * 
 * Features:
 * - Clean white background
 * - Subtle shadow
 * - Rounded corners
 * - Optional glass effect
 */
export function Card({ 
  children, 
  variant = 'default', // 'default', 'glass', 'outlined'
  padding = 'default', // 'none', 'sm', 'default', 'lg'
  style,
  ...props 
}) {
  const cardStyles = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`padding_${padding}`],
    style,
  ];

  return (
    <View style={cardStyles} {...props}>
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
    <Text 
      variant="headline" 
      weight="semiBold"
      style={style}
      {...props}
    >
      {children}
    </Text>
  );
}

export function CardDescription({ children, style, ...props }) {
  return (
    <Text 
      variant="callout" 
      color="secondary"
      style={[styles.description, style]}
      {...props}
    >
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
  return (
    <View style={[styles.footer, style]} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  
  // Variants
  variant_default: {
    backgroundColor: colors.background.secondary,
    ...shadows.sm,
  },
  variant_glass: {
    backgroundColor: colors.background.glass,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  variant_outlined: {
    backgroundColor: colors.background.secondary,
    borderWidth: 1,
    borderColor: colors.border.main,
  },
  
  // Padding
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
  
  // Sections
  header: {
    marginBottom: spacing[1.5],
  },
  
  description: {
    marginTop: spacing[0.5],
  },
  
  content: {
    // No default styles, flexible content
  },
  
  footer: {
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});
