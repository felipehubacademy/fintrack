// 📏 Spacing System - Apple 8pt Grid

// Base unit: 8px (Apple's standard)
const BASE_UNIT = 8;

export const spacing = {
  // Micro spacing
  0: 0,
  0.5: BASE_UNIT * 0.5,  // 4px
  1: BASE_UNIT,          // 8px
  1.5: BASE_UNIT * 1.5,  // 12px
  2: BASE_UNIT * 2,      // 16px
  2.5: BASE_UNIT * 2.5,  // 20px
  3: BASE_UNIT * 3,      // 24px
  4: BASE_UNIT * 4,      // 32px
  5: BASE_UNIT * 5,      // 40px
  6: BASE_UNIT * 6,      // 48px
  7: BASE_UNIT * 7,      // 56px
  8: BASE_UNIT * 8,      // 64px
  10: BASE_UNIT * 10,    // 80px
  12: BASE_UNIT * 12,    // 96px
  16: BASE_UNIT * 16,    // 128px
  20: BASE_UNIT * 20,    // 160px
};

// Border Radius (Apple-style rounded corners)
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
};

// Component-specific spacing
export const componentSpacing = {
  // Container padding
  containerPadding: spacing[2], // 16px
  
  // Card padding
  cardPadding: spacing[2], // 16px
  cardPaddingLarge: spacing[3], // 24px
  
  // Section spacing
  sectionSpacing: spacing[3], // 24px
  sectionSpacingLarge: spacing[4], // 32px
  
  // List item spacing
  listItemSpacing: spacing[2], // 16px
  
  // Button padding
  buttonPaddingVertical: spacing[1.5], // 12px
  buttonPaddingHorizontal: spacing[3], // 24px
  
  // Input padding
  inputPadding: spacing[1.5], // 12px
  
  // Safe area insets (for notch/home indicator)
  safeAreaTop: spacing[6], // 48px
  safeAreaBottom: spacing[3], // 24px
};

// Icon sizes
export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
  '3xl': 48,
};

// Avatar sizes
export const avatarSizes = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80,
};
