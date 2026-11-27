import React from 'react';
import { View, StyleSheet } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { logoFlatSvg } from '../../assets/logoFlatSvg';
import { useI18n } from '../../contexts/I18nContext';

/**
 * Logo: reusable MeuAzulão logo.
 * 
 * Props:
 * - size: 'xsmall' | 'small' | 'medium' | 'large' (default: 'medium')
 * - color: 'blue' | 'white' (default: 'blue')
 * - style: extra styles
 */
export default function Logo({ size = 'medium', color = 'blue', style }) {
  const { t } = useI18n();
  const sizes = {
    xsmall: 28,
    small: 40,
    medium: 80,
    large: 120,
  };

  const logoSize = sizes[size] || sizes.medium;

  // Criar versão do SVG com cores apropriadas
  const logoSvg = color === 'white' 
    ? logoFlatSvg.replace(/#036ecb/g, '#ffffff')
                 .replace(/#057bd9/g, '#ffffff')
                 .replace(/#0061bc/g, '#ffffff')
    : logoFlatSvg;

  return (
    <View style={[styles.container, style]}>
      <SvgXml 
        xml={logoSvg}
        width={logoSize}
        height={logoSize}
        accessibilityLabel={t('dashboard.ui.logoLabel')}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

