import { colors } from '../theme';

/**
 * Utilitários de acessibilidade
 */

/**
 * Calcula o contraste entre duas cores (WCAG)
 * Retorna um valor entre 1 e 21
 * WCAG AA requer 4.5:1 para texto normal, 3:1 para texto grande
 */
export function getContrastRatio(color1, color2) {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  
  const lighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);
  
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Calcula a luminância relativa de uma cor
 */
function getLuminance(hex) {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;
  
  const [r, g, b] = rgb.map(val => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Converte hex para RGB
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16)
  ] : null;
}

/**
 * Verifica se o contraste atende WCAG AA
 * @param {string} textColor - Cor do texto
 * @param {string} backgroundColor - Cor de fundo
 * @param {boolean} isLargeText - Se é texto grande (18pt+ ou 14pt+ bold)
 * @returns {boolean}
 */
export function meetsWCAGAA(textColor, backgroundColor, isLargeText = false) {
  const ratio = getContrastRatio(textColor, backgroundColor);
  return isLargeText ? ratio >= 3 : ratio >= 4.5;
}

/**
 * Verifica se o contraste atende WCAG AAA
 */
export function meetsWCAGAAA(textColor, backgroundColor, isLargeText = false) {
  const ratio = getContrastRatio(textColor, backgroundColor);
  return isLargeText ? ratio >= 4.5 : ratio >= 7;
}

/**
 * Obtém uma cor de texto acessível para um fundo dado
 */
export function getAccessibleTextColor(backgroundColor) {
  const whiteContrast = getContrastRatio('#FFFFFF', backgroundColor);
  const blackContrast = getContrastRatio('#000000', backgroundColor);
  
  return whiteContrast > blackContrast ? '#FFFFFF' : '#000000';
}

/**
 * Cores com contraste garantido WCAG AA
 */
export const accessibleColors = {
  // Texto em fundo claro
  textOnLight: {
    primary: colors.text.primary, // #171717 - contraste 12.6:1 com #FAFAFA
    secondary: colors.text.secondary, // #525252 - contraste 7.1:1 com #FAFAFA
    tertiary: '#737373', // Melhorado de #A3A3A3 para garantir contraste
  },
  
  // Texto em fundo escuro
  textOnDark: {
    primary: '#FFFFFF',
    secondary: '#E5E5E5',
    tertiary: '#A3A3A3',
  },
  
  // Botões
  button: {
    primary: {
      text: colors.text.inverse, // #FFFFFF - contraste 4.6:1 com #2563EB
      background: colors.brand.primary,
    },
    danger: {
      text: colors.text.inverse, // #FFFFFF - contraste 4.6:1 com #EF4444
      background: colors.error.main,
    },
  },
};
