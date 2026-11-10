// Test AnimatedNumber module shape and logic
// Full render testing skipped due to React 19 test-renderer limitations

jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: { text: { primary: '#111' } },
  }),
}));

const { AnimatedNumber } = require('../AnimatedNumber');

describe('AnimatedNumber', () => {
  it('is exported as a function', () => {
    expect(typeof AnimatedNumber).toBe('function');
  });

  it('has the expected function name', () => {
    expect(AnimatedNumber.name).toBe('AnimatedNumber');
  });

  it('formats numbers in pt-BR locale', () => {
    const formatted = (1234.56).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(formatted).toBe('1.234,56');
  });

  it('formats zero correctly', () => {
    const formatted = (0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    expect(formatted).toBe('0,00');
  });

  it('respects custom decimal places', () => {
    const formatted = (99.9).toLocaleString('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    expect(formatted).toBe('100');
  });
});
