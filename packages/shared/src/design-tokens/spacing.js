// Spacing tokens — 8pt grid system

const BASE = 8;

export const spacing = {
  0: 0,
  0.5: BASE * 0.5,   // 4
  1: BASE,             // 8
  1.5: BASE * 1.5,    // 12
  2: BASE * 2,         // 16
  2.5: BASE * 2.5,    // 20
  3: BASE * 3,         // 24
  4: BASE * 4,         // 32
  5: BASE * 5,         // 40
  6: BASE * 6,         // 48
  8: BASE * 8,         // 64
  10: BASE * 10,       // 80
  12: BASE * 12,       // 96
  16: BASE * 16,       // 128
  20: BASE * 20,       // 160
};

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

export const iconSizes = {
  xs: 16,
  sm: 20,
  md: 24,
  lg: 28,
  xl: 32,
  '2xl': 40,
};

export const shadows = {
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
