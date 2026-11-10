// MeuAzulao Mobile Theme — consumes shared design tokens
import {
  brand,
  semantic,
  financial,
  neutral,
  light,
  dark,
} from '@fintrack/shared/design-tokens';

export { brand, semantic, financial, neutral };

export const colors = {
  brand,
  success: semantic.success,
  error: semantic.error,
  warning: semantic.warning,
  info: semantic.info,
  neutral,
  background: light.background,
  text: light.text,
  border: light.border,
  financial,
  overlay: light.overlay,
};

export const colorsDark = {
  brand,
  success: semantic.success,
  error: semantic.error,
  warning: semantic.warning,
  info: semantic.info,
  neutral,
  background: dark.background,
  text: dark.text,
  border: dark.border,
  financial,
  overlay: dark.overlay,
};

export const gradients = {
  primary: brand.gradient,
  accent: brand.accentGradient,
  success: ['#10B981', '#059669'],
  error: ['#E5484D', '#C13239'],
  warning: ['#F59E0B', '#D97706'],
  cardPrimary: ['#EFF6FF', '#DBEAFE'],
  cardSuccess: ['#ECFDF5', '#D1FAE5'],
  cardAccent: ['#FFF8E1', '#FFE0B2'],
  glass: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
};

export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12,
  },
};
