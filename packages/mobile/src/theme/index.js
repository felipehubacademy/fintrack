// 🎨 MeuAzulão Design System - Complete Export

// Import internals
import * as colorModule from './colors.js';
import * as typographyModule from './typography.js';
import * as spacingModule from './spacing.js';

// Re-export
export const colors = colorModule.colors;
export const gradients = colorModule.gradients;
export const shadows = colorModule.shadows;
export const typography = typographyModule.typography;
export const spacing = spacingModule.spacing;
export const radius = spacingModule.radius;
export const componentSpacing = spacingModule.componentSpacing;
export const iconSizes = spacingModule.iconSizes;
export const avatarSizes = spacingModule.avatarSizes;

// Animation timing (Apple-like)
export const animations = {
  durations: {
    instant: 100,
    fast: 200,
    normal: 300,
    slow: 500,
    slower: 700,
  },
  
  easing: {
    // iOS default easing
    default: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    // Material ease
    material: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
    // Smooth ease
    smooth: 'cubic-bezier(0.4, 0.0, 0.6, 1)',
  },
};

// Z-Index scale
export const zIndex = {
  base: 0,
  dropdown: 1000,
  sticky: 1100,
  fixed: 1200,
  modalBackdrop: 1300,
  modal: 1400,
  popover: 1500,
  tooltip: 1600,
  notification: 1700,
};

// Breakpoints (for responsive)
export const breakpoints = {
  xs: 0,
  sm: 375,  // iPhone SE
  md: 414,  // iPhone Pro
  lg: 768,  // iPad Mini
  xl: 1024, // iPad
};

// Complete theme object
export const theme = {
  colors,
  gradients,
  shadows,
  typography,
  spacing,
  radius,
  componentSpacing,
  iconSizes,
  avatarSizes,
  animations,
  zIndex,
  breakpoints,
};

export default theme;
