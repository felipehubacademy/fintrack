import { setLocaleSettings } from '@fintrack/shared/i18n';
import {
  parseDateParts,
  toLocalDate,
  formatShortDate,
  formatMonthYear,
  formatMonthName,
  monthKeyLabel,
  formatBrazilDate,
} from '../date';

describe('date utils', () => {
  afterAll(() => setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' }));

  it('parses date-only strings as local dates', () => {
    expect(parseDateParts('2026-11-26')).toEqual({ year: 2026, month: 11, day: 26 });
    expect(parseDateParts('2026-11')).toEqual({ year: 2026, month: 11, day: 1 });
    expect(parseDateParts('not a date')).toBeNull();
    expect(toLocalDate('2026-11-26')).toEqual(new Date(2026, 10, 26));
  });

  it('formats in the active locale', () => {
    setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
    expect(formatShortDate('2026-11-26')).toBe('26/11/2026');
    expect(formatShortDate('2026-11-26', { withYear: false })).toBe('26/11');
    expect(formatMonthName('2026-11-01', { short: false })).toBe('novembro');

    setLocaleSettings({ language: 'en', locale: 'en-US', currency: 'USD' });
    expect(formatShortDate('2026-11-26')).toBe('11/26/2026');
    expect(formatMonthYear('2026-11-01')).toBe('November 2026');
    expect(monthKeyLabel('2026-03')).toBe('Mar');

    setLocaleSettings({ language: 'es', locale: 'es-MX', currency: 'MXN' });
    expect(formatMonthName('2026-01-01', { short: false })).toBe('enero');
  });

  it('keeps the old formatBrazil* names working', () => {
    setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' });
    expect(formatBrazilDate('2026-11-26')).toBe('26/11/2026');
  });

  it('returns an empty string for bad input', () => {
    expect(formatShortDate(null)).toBe('');
    expect(formatShortDate('garbage')).toBe('');
  });
});
