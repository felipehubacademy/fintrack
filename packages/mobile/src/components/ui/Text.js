import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { typography, colors } from '../../theme';

/**
 * Text Component - Apple HIG compliant
 * 
 * Usage:
 * <Text variant="title1">Hello</Text>
 * <Text variant="body" color="secondary">Description</Text>
 */
export function Text({ 
  variant = 'body',
  color = 'primary',
  align = 'left',
  weight,
  children,
  style,
  accessibilityRole,
  accessibilityLabel,
  ...props
}) {
  // Get color value
  const textColor = colors.text?.[color] || color;
  
  // Get typography style
  const variantStyle = typography.styles?.[variant] || typography.styles.body;
  
  // Get weight
  const fontWeight = weight ? typography.weights?.[weight] : variantStyle?.fontWeight;

  const textStyle = [
    styles.base,
    variantStyle,
    { 
      color: textColor,
      textAlign: align,
    },
    fontWeight && { fontWeight },
    style,
  ];

  // Determinar accessibilityRole baseado no variant se não fornecido
  const role = accessibilityRole || (variant.includes('title') || variant === 'headline' ? 'header' : 'text');

  return (
    <RNText 
      style={textStyle} 
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      allowFontScaling={true}
      maxFontSizeMultiplier={1.3}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    fontFamily: typography.fonts.regular,
  },
});

// Convenience components
export const LargeTitle = (props) => <Text variant="largeTitle" {...props} />;
export const Title1 = (props) => <Text variant="title1" {...props} />;
export const Title2 = (props) => <Text variant="title2" {...props} />;
export const Title3 = (props) => <Text variant="title3" {...props} />;
export const Headline = (props) => <Text variant="headline" {...props} />;
export const Body = (props) => <Text variant="body" {...props} />;
export const Callout = (props) => <Text variant="callout" {...props} />;
export const Subheadline = (props) => <Text variant="subheadline" {...props} />;
export const Footnote = (props) => <Text variant="footnote" {...props} />;
export const Caption = (props) => <Text variant="caption1" {...props} />;

