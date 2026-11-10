const { formatCurrency, parseCurrency } = require('@fintrack/shared/utils/currencyUtils');

describe('formatCurrency', () => {
  it('formats positive values as BRL', () => {
    const result = formatCurrency(1234.56);
    expect(result).toContain('1.234,56');
    expect(result).toContain('R$');
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toContain('0,00');
  });

  it('returns R$ 0,00 for null', () => {
    expect(formatCurrency(null)).toBe('R$ 0,00');
  });

  it('returns R$ 0,00 for undefined', () => {
    expect(formatCurrency(undefined)).toBe('R$ 0,00');
  });

  it('returns R$ 0,00 for NaN', () => {
    expect(formatCurrency(NaN)).toBe('R$ 0,00');
  });

  it('formats negative values', () => {
    const result = formatCurrency(-500);
    expect(result).toContain('500,00');
  });

  it('formats large values with thousands separator', () => {
    const result = formatCurrency(1000000);
    expect(result).toContain('1.000.000');
  });
});

describe('parseCurrency', () => {
  it('parses BR format "R$ 1.234,56"', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
  });

  it('parses plain decimal with comma', () => {
    expect(parseCurrency('100,50')).toBe(100.5);
  });

  it('returns 0 for empty string', () => {
    expect(parseCurrency('')).toBe(0);
  });

  it('returns 0 for null', () => {
    expect(parseCurrency(null)).toBe(0);
  });
});
