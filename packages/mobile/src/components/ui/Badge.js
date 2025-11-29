import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../../theme';
import { Caption } from './Text';

export default function Badge({ children, variant = 'default', size = 'medium', style }) {
  const getVariantStyle = () => {
    switch (variant) {
      case 'success':
        return { backgroundColor: colors.success.bg };
      case 'warning':
        return { backgroundColor: colors.warning.bg };
      case 'danger':
        return { backgroundColor: colors.error.bg };
      case 'info':
        return { backgroundColor: colors.info.bg };
      default:
        return { backgroundColor: colors.neutral[100] };
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'success':
        return colors.success.dark;
      case 'warning':
        return colors.warning.dark;
      case 'danger':
        return colors.error.dark;
      case 'info':
        return colors.info.dark;
      default:
        return colors.text.primary;
    }
  };

  const getSizeStyle = () => {
    switch (size) {
      case 'small':
        return { paddingHorizontal: spacing[1], paddingVertical: spacing[0.5] };
      case 'large':
        return { paddingHorizontal: spacing[2], paddingVertical: spacing[1] };
      default:
        return { paddingHorizontal: spacing[1.5], paddingVertical: spacing[0.5] };
    }
  };

  return (
    <View style={[styles.badge, getVariantStyle(), getSizeStyle(), style]}>
      <Caption weight="semiBold" style={{ color: getTextColor() }}>
        {children}
      </Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: radius.md,
    alignSelf: 'flex-start',
  },
});

