import { setLocaleSettings, parseMoney, decimalSeparator } from '@fintrack/shared/i18n';
import { splitTemplate } from '../template';
import { sanitizeAmountInput, amountPlaceholder } from '../amountInput';

describe('splitTemplate', () => {
  it('splits around a placeholder', () => {
    expect(splitTemplate('You can spend {{amount}} a day', 'amount')).toEqual(['You can spend ', ' a day']);
    expect(splitTemplate('{{amount}} por dia', 'amount')).toEqual(['', ' por dia']);
  });

  it('returns the whole text when the placeholder is missing', () => {
    const [before, after] = splitTemplate('No number here', 'amount');
    expect(`${before}${after}`).toBe('No number here');
  });
});

describe('sanitizeAmountInput', () => {
  it('keeps digits and one comma for pt', () => {
    expect(sanitizeAmountInput('12,5', ',')).toBe('12,5');
    expect(sanitizeAmountInput('R$ 12,567', ',')).toBe('12,56');
    expect(sanitizeAmountInput('1,2,3', ',')).toBe('1,23');
    expect(sanitizeAmountInput('12.5', ',')).toBe('12,5'); // dot typed on a pt keypad
  });

  it('keeps digits and one dot for en', () => {
    expect(sanitizeAmountInput('12.5', '.')).toBe('12.5');
    expect(sanitizeAmountInput('12,5', '.')).toBe('12.5');
    expect(sanitizeAmountInput('$1a2b', '.')).toBe('12');
  });

  it('drops leading zeros but keeps "0," for decimals', () => {
    expect(sanitizeAmountInput('007', ',')).toBe('7');
    expect(sanitizeAmountInput(',5', ',')).toBe('0,5');
    expect(sanitizeAmountInput('', ',')).toBe('');
  });

  it('builds a placeholder', () => {
    expect(amountPlaceholder(',')).toBe('0,00');
    expect(amountPlaceholder('.')).toBe('0.00');
  });

  it('round-trips through parseMoney in each locale', () => {
    setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
    expect(decimalSeparator()).toBe(',');
    expect(parseMoney(sanitizeAmountInput('1234,56', decimalSeparator()))).toBe(1234.56);

    setLocaleSettings({ language: 'en', locale: 'en-US', currency: 'USD' });
    expect(decimalSeparator()).toBe('.');
    expect(parseMoney(sanitizeAmountInput('1234.56', decimalSeparator()))).toBe(1234.56);

    setLocaleSettings({ language: 'es', locale: 'es-MX', currency: 'MXN' });
    expect(parseMoney(sanitizeAmountInput('80.5', decimalSeparator()))).toBe(80.5);

    setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
  });
});
