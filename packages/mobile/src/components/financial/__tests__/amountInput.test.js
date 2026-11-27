import { setLocaleSettings } from '@fintrack/shared/i18n';
import { sanitizeAmountInput, formatAmountInput, parseAmountInput } from '../amountInput';

describe('amount inputs follow the locale', () => {
  afterAll(() => setLocaleSettings({ language: 'en', currency: 'USD' }));

  it('uses a comma in Portuguese', () => {
    setLocaleSettings({ language: 'pt', currency: 'BRL' });
    expect(sanitizeAmountInput('12.5')).toBe('12,5');
    expect(sanitizeAmountInput('R$ 1234,567')).toBe('1234,56');
    expect(formatAmountInput(1234.5)).toBe('1234,50');
    expect(parseAmountInput('1.234,56')).toBe(1234.56);
    expect(parseAmountInput('12,5')).toBe(12.5);
  });

  it('uses a dot in English', () => {
    setLocaleSettings({ language: 'en', currency: 'USD' });
    expect(sanitizeAmountInput('12,5')).toBe('12.5');
    expect(formatAmountInput(7)).toBe('7.00');
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
    expect(parseAmountInput('')).toBe(0);
    expect(formatAmountInput(0)).toBe('');
  });

  it('keeps digits only when there is no separator', () => {
    expect(sanitizeAmountInput('abc 250')).toBe('250');
    expect(parseAmountInput(42)).toBe(42);
  });
});
