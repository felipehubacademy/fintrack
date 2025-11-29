// 📝 Typography System - Apple San Francisco-inspired

export const typography = {
  // ===== FONT FAMILIES =====
  fonts: {
    // iOS usa San Francisco, Android usa Roboto
    // System adaptará automaticamente
    regular: 'System',
    medium: 'System',
    semiBold: 'System',
    bold: 'System',
  },

  // ===== FONT SIZES (Apple Scale) =====
  sizes: {
    // Micro text
    xs: 11,
    
    // Small text (captions, footnotes)
    sm: 13,
    
    // Body text
    base: 15,
    
    // Body emphasized
    md: 17,
    
    // Subheadline
    lg: 19,
    
    // Title 3
    xl: 22,
    
    // Title 2
    '2xl': 26,
    
    // Title 1
    '3xl': 32,
    
    // Large Title
    '4xl': 40,
    
    // Display (hero numbers)
    '5xl': 48,
    '6xl': 56,
  },

  // ===== FONT WEIGHTS (iOS Style) =====
  weights: {
    thin: '100',
    ultraLight: '200',
    light: '300',
    regular: '400',
    medium: '500',
    semiBold: '600',
    bold: '700',
    heavy: '800',
    black: '900',
  },

  // ===== LINE HEIGHTS =====
  lineHeights: {
    tight: 1.2,
    snug: 1.3,
    normal: 1.4,
    relaxed: 1.5,
    loose: 1.6,
  },

  // ===== LETTER SPACING =====
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
  },

  // ===== PRE-DEFINED TEXT STYLES (Apple Human Interface Guidelines) =====
  styles: {
    // Large Title
    largeTitle: {
      fontSize: 40,
      fontWeight: '700',
      letterSpacing: -0.5,
    },
    
    // Title 1
    title1: {
      fontSize: 32,
      fontWeight: '700',
      letterSpacing: -0.4,
    },
    
    // Title 2
    title2: {
      fontSize: 26,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    
    // Title 3
    title3: {
      fontSize: 22,
      fontWeight: '600',
      letterSpacing: -0.2,
    },
    
    // Headline
    headline: {
      fontSize: 19,
      fontWeight: '600',
      letterSpacing: -0.1,
    },
    
    // Body
    body: {
      fontSize: 17,
      fontWeight: '400',
      letterSpacing: 0,
    },
    
    // Body Emphasized
    bodyEmphasized: {
      fontSize: 17,
      fontWeight: '600',
      letterSpacing: 0,
    },
    
    // Callout
    callout: {
      fontSize: 15,
      fontWeight: '400',
      letterSpacing: 0,
    },
    
    // Subheadline
    subheadline: {
      fontSize: 13,
      fontWeight: '400',
      letterSpacing: 0,
    },
    
    // Footnote
    footnote: {
      fontSize: 11,
      fontWeight: '400',
      letterSpacing: 0,
    },
    
    // Caption 1
    caption1: {
      fontSize: 11,
      fontWeight: '400',
      letterSpacing: 0,
    },
    
    // Caption 2 (smallest)
    caption2: {
      fontSize: 10,
      fontWeight: '400',
      letterSpacing: 0,
    },
  },
};
