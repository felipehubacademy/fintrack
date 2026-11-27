// MeuAzulão mobile theme.
//
// `tokens` holds the launch design tokens (plan 4.2), light and dark.
// `colors` / `colorsDark` keep the older nested shape (brand.primary,
// background.secondary, text.primary, ...) that every screen already uses,
// with the old names mapped onto the new token values, so existing screens
// pick up the new palette without code changes.
import { financial as sharedFinancial, neutral } from '@fintrack/shared/design-tokens';

export const tokens = {
  light: {
    brand500: '#1F5BFF',
    brand50: '#EEF3FF',
    ink900: '#0B1220',
    ink500: '#5B6475',
    surface: '#FFFFFF',
    surface2: '#F5F7FB',
    positive: '#12B76A',
    warning: '#F79009',
    negative: '#F04438',
    whatsapp: '#25D366',
  },
  dark: {
    brand500: '#4C7DFF',
    brand50: '#111A33',
    ink900: '#F4F6FA',
    ink500: '#9AA3B2',
    surface: '#0B0F17',
    surface2: '#141A24',
    positive: '#32D583',
    warning: '#FDB022',
    negative: '#F97066',
    whatsapp: '#25D366',
  },
};

// Text on the WhatsApp green (#25D366 needs dark text for contrast).
export const WHATSAPP_GREEN = '#25D366';
export const WHATSAPP_TEXT = '#0B1220';

function withAlpha(hex, alpha) {
  const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
  return `${hex}${a}`;
}

function build(mode) {
  const t = tokens[mode];
  const isDark = mode === 'dark';
  const brand = {
    primary: t.brand500,
    primaryLight: isDark ? '#7A9DFF' : '#4C7DFF',
    primaryDark: isDark ? '#1F5BFF' : '#1747CC',
    secondary: t.brand500,
    bg: t.brand50,
    // Accent kept for older screens (gold highlight); not part of the new palette.
    accent: '#F5A623',
    accentLight: '#FFD080',
    accentDark: '#CC8400',
    gradient: [t.brand500, isDark ? '#1F5BFF' : '#1747CC'],
    accentGradient: ['#F5A623', '#CC8400'],
  };
  const semanticColor = (main, light, dark) => ({
    main,
    light,
    dark,
    bg: isDark ? withAlpha(main, 0.16) : withAlpha(main, 0.1),
    bgDark: withAlpha(main, 0.16),
  });
  return {
    // New token names
    tokens: t,
    ink: { 900: t.ink900, 500: t.ink500 },
    surface: t.surface,
    surface2: t.surface2,
    positive: t.positive,
    negative: t.negative,
    whatsapp: t.whatsapp,
    // Old names mapped to the new values
    brand,
    success: semanticColor(t.positive, isDark ? '#6CE9A6' : '#32D583', isDark ? '#12B76A' : '#039855'),
    error: semanticColor(t.negative, isDark ? '#FDA29B' : '#F97066', isDark ? '#F04438' : '#D92D20'),
    warning: semanticColor(t.warning, isDark ? '#FEC84B' : '#FDB022', isDark ? '#F79009' : '#DC6803'),
    info: semanticColor(t.brand500, brand.primaryLight, brand.primaryDark),
    neutral,
    background: {
      primary: t.surface2,
      secondary: t.surface,
      tertiary: isDark ? '#1C2330' : '#EBEFF5',
      glass: isDark ? 'rgba(11, 15, 23, 0.8)' : 'rgba(255, 255, 255, 0.8)',
    },
    text: {
      primary: t.ink900,
      secondary: t.ink500,
      tertiary: isDark ? '#6B7385' : '#8A93A3',
      inverse: isDark ? '#0B1220' : '#FFFFFF',
      link: t.brand500,
      accent: '#F5A623',
    },
    border: {
      light: isDark ? '#1F2633' : '#E6EAF1',
      main: isDark ? '#2A3240' : '#D9DEE7',
      dark: isDark ? '#3A4352' : '#C2C9D4',
      default: isDark ? '#2A3240' : '#D9DEE7',
    },
    financial: {
      ...sharedFinancial,
      income: t.positive,
      expense: t.negative,
      transfer: t.brand500,
      pending: t.warning,
    },
    overlay: isDark
      ? { light: 'rgba(255, 255, 255, 0.05)', medium: 'rgba(0, 0, 0, 0.5)', dark: 'rgba(0, 0, 0, 0.8)' }
      : { light: 'rgba(0, 0, 0, 0.05)', medium: 'rgba(0, 0, 0, 0.3)', dark: 'rgba(0, 0, 0, 0.6)' },
    isDark,
  };
}

export const colors = build('light');
export const colorsDark = build('dark');

// Backwards-compatible named exports
export const brand = colors.brand;
export const semantic = {
  success: colors.success,
  error: colors.error,
  warning: colors.warning,
  info: colors.info,
};
export const financial = colors.financial;
export { neutral };

export const gradients = {
  primary: colors.brand.gradient,
  accent: colors.brand.accentGradient,
  success: [tokens.light.positive, '#039855'],
  error: [tokens.light.negative, '#D92D20'],
  warning: [tokens.light.warning, '#DC6803'],
  cardPrimary: [tokens.light.brand50, '#DCE6FF'],
  cardSuccess: ['#ECFDF3', '#D1FADF'],
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
