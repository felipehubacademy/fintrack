// Test AnimatedNumber module shape and its formatting.
// Full render testing skipped due to React 19 test-renderer limitations.
import { setLocaleSettings } from '@fintrack/shared/i18n';

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { text: { primary: '#111' } },
  }),
}));

const { AnimatedNumber, formatAnimatedValue } = require('../AnimatedNumber');

// Intl uses a no-break space between the symbol and the number.
const plain = (s) => s.replace(/ | /g, ' ');

describe('AnimatedNumber', () => {
  afterAll(() => setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' }));

  it('is exported as a function', () => {
    expect(typeof AnimatedNumber).toBe('function');
    expect(AnimatedNumber.name).toBe('AnimatedNumber');
  });

  it('formats money in pt-BR', () => {
    setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
    expect(plain(formatAnimatedValue(1234.56))).toBe('R$ 1.234,56');
    expect(plain(formatAnimatedValue(0))).toBe('R$ 0,00');
  });

  it('formats money in en-US', () => {
    setLocaleSettings({ language: 'en', locale: 'en-US', currency: 'USD' });
    expect(formatAnimatedValue(1234.56)).toBe('$1,234.56');
  });

  it('formats plain numbers with custom decimals, prefix and suffix', () => {
    setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
    expect(formatAnimatedValue(99.9, { format: 'number', decimals: 0 })).toBe('100');
    expect(formatAnimatedValue(12.5, { format: 'number', decimals: 1, suffix: '%' })).toBe('12,5%');
    expect(formatAnimatedValue(3, { format: 'number', decimals: 0, prefix: '+' })).toBe('+3');
  });
});
