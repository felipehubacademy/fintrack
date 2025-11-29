// 🎨 MeuAzulão Design System - Premium Edition
// Inspirado em: Apple, Nubank, Revolut, N26

export const colors = {
  // ===== BRAND IDENTITY =====
  brand: {
    primary: '#2563EB',        // Azul MeuAzulão principal
    primaryLight: '#3B82F6',   // Azul claro
    primaryDark: '#1E40AF',    // Azul escuro
    accent: '#60A5FA',         // Azul accent
    gradient: ['#2563EB', '#1E3A8A'], // Gradiente principal
  },

  // ===== SEMANTIC COLORS =====
  success: {
    main: '#10B981',
    light: '#34D399',
    dark: '#059669',
    bg: '#ECFDF5',
  },
  
  error: {
    main: '#EF4444',
    light: '#F87171',
    dark: '#DC2626',
    bg: '#FEF2F2',
  },
  
  warning: {
    main: '#F59E0B',
    light: '#FBBF24',
    dark: '#D97706',
    bg: '#FFFBEB',
  },
  
  info: {
    main: '#3B82F6',
    light: '#60A5FA',
    dark: '#2563EB',
    bg: '#EFF6FF',
  },

  // ===== NEUTRALS (Apple-like) =====
  neutral: {
    0: '#FFFFFF',
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
    950: '#0A0A0A',
  },

  // ===== UI ELEMENTS =====
  background: {
    primary: '#FAFAFA',      // Background principal
    secondary: '#FFFFFF',    // Cards/Surfaces
    tertiary: '#F5F5F5',     // Sections
    glass: 'rgba(255, 255, 255, 0.8)', // Glassmorphism
  },

  text: {
    primary: '#171717',      // Texto principal (contraste 12.6:1 com #FAFAFA - WCAG AAA)
    secondary: '#525252',    // Texto secundário (contraste 7.1:1 com #FAFAFA - WCAG AA)
    tertiary: '#737373',     // Texto disabled/placeholder (melhorado de #A3A3A3 para garantir contraste 4.5:1)
    inverse: '#FFFFFF',      // Texto em fundos escuros
    link: '#2563EB',         // Links
  },

  border: {
    light: '#F5F5F5',
    main: '#E5E5E5',
    dark: '#D4D4D4',
  },

  // ===== FINANCIAL =====
  financial: {
    income: '#10B981',
    expense: '#EF4444',
    transfer: '#3B82F6',
    pending: '#F59E0B',
  },

  // ===== OVERLAYS =====
  overlay: {
    light: 'rgba(0, 0, 0, 0.05)',
    medium: 'rgba(0, 0, 0, 0.3)',
    dark: 'rgba(0, 0, 0, 0.6)',
  },
};

// ===== GRADIENTS =====
export const gradients = {
  primary: ['#2563EB', '#1E3A8A'],
  success: ['#10B981', '#059669'],
  error: ['#EF4444', '#DC2626'],
  warning: ['#F59E0B', '#D97706'],
  
  // Gradientes sutis para cards
  cardPrimary: ['#EFF6FF', '#DBEAFE'],
  cardSuccess: ['#ECFDF5', '#D1FAE5'],
  cardError: ['#FEF2F2', '#FEE2E2'],
  
  // Glassmorphism gradients
  glass: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'],
};

// ===== SHADOWS (Apple-style) =====
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
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
};
