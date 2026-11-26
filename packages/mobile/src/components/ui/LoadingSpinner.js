import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { useI18n } from '../../contexts/I18nContext';

export default function LoadingSpinner({ size = 'large', color, fullScreen = false, style }) {
  const { t } = useI18n();
  const spinnerColor = color || colors.brand.primary;
  
  if (fullScreen) {
    return (
      <View 
        style={[styles.fullScreenContainer, style]}
        accessibilityRole="progressbar"
        accessibilityLabel={t('common.loading')}
        accessibilityLiveRegion="polite"
      >
        <ActivityIndicator size={size} color={spinnerColor} />
      </View>
    );
  }

  return (
    <View 
      style={[styles.container, style]}
      accessibilityRole="progressbar"
      accessibilityLabel={t('common.loading')}
      accessibilityLiveRegion="polite"
    >
      <ActivityIndicator size={size} color={spinnerColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullScreenContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
  },
});
