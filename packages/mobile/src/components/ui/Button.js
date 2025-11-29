import React from 'react';
import { TouchableOpacity, ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors, spacing, radius, shadows } from '../../theme';
import { Text } from './Text';
import { HapticFeedback } from '../../utils/haptics';

/**
 * Button Component - Apple-style
 * 
 * Variants:
 * - primary: Filled blue button (main CTA)
 * - secondary: Gray filled button
 * - outline: Outline button
 * - ghost: Text-only button
 * - danger: Destructive action
 * 
 * Sizes:
 * - sm: Small (32px height)
 * - md: Medium (44px height - Apple standard)
 * - lg: Large (56px height)
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
  accessibilityLabel,
  accessibilityHint,
  ...props
}) {
  const isDisabled = disabled || loading;

  const buttonStyles = [
    styles.base,
    styles[`size_${size}`],
    styles[`variant_${variant}`],
    isDisabled && styles.disabled,
    fullWidth && styles.fullWidth,
    style,
  ];

  const textColor = getTextColor(variant, isDisabled);
  const indicatorColor = variant === 'ghost' || variant === 'outline' ? colors.brand.primary : colors.neutral[0];

  const handlePress = () => {
    if (!isDisabled && onPress) {
      // Haptic feedback baseado no tipo de botão
      if (variant === 'danger') {
        HapticFeedback.warning();
      } else if (variant === 'primary') {
        HapticFeedback.medium();
      } else {
        HapticFeedback.light();
      }
      onPress();
    }
  };

  return (
    <TouchableOpacity
      style={buttonStyles}
      onPress={handlePress}
      disabled={isDisabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled }}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={indicatorColor} />
      ) : (
        <View style={styles.content}>
          {icon && iconPosition === 'left' && (
            <View style={styles.iconLeft}>{icon}</View>
          )}
          <Text
            variant="bodyEmphasized"
            style={[{ color: textColor }, textStyle]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={styles.iconRight}>{icon}</View>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

function getTextColor(variant, disabled) {
  if (disabled) return colors.text.tertiary;
  
  switch (variant) {
    case 'primary':
    case 'danger':
      return colors.text.inverse;
    case 'outline':
    case 'ghost':
      return colors.brand.primary;
    case 'secondary':
      return colors.text.primary;
    default:
      return colors.text.primary;
  }
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  
  // Sizes (Apple HIG: minimum 44pt touch target)
  size_sm: {
    height: 36,
    paddingHorizontal: spacing[2],
  },
  size_md: {
    height: 48,
    paddingHorizontal: spacing[3],
  },
  size_lg: {
    height: 56,
    paddingHorizontal: spacing[4],
  },
  
  // Variants
  variant_primary: {
    backgroundColor: colors.brand.primary,
    ...shadows.sm,
  },
  variant_secondary: {
    backgroundColor: colors.neutral[100],
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.brand.primary,
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: colors.error.main,
    ...shadows.sm,
  },
  
  disabled: {
    opacity: 0.4,
  },
  
  fullWidth: {
    width: '100%',
  },
  
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  iconLeft: {
    marginRight: spacing[1],
  },
  
  iconRight: {
    marginLeft: spacing[1],
  },
});
