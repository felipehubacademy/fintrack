import { setLocaleSettings, t } from '@fintrack/shared/i18n';
import { categoryLabel, categoryKey, normalizeCategoryName, DEFAULT_CATEGORY_NAMES } from '../categoryLabel';

describe('categoryLabel', () => {
  afterAll(() => setLocaleSettings({ language: 'pt', locale: 'pt-BR', currency: 'BRL' }));

  it('normalizes accents, case and spaces', () => {
    expect(normalizeCategoryName('  Alimentação ')).toBe('alimentacao');
    expect(normalizeCategoryName('Investimentos   (Retorno)')).toBe('investimentos (retorno)');
  });

  it('maps the default Portuguese names to keys', () => {
    expect(categoryKey('Alimentação')).toBe('food');
    expect(categoryKey('ALIMENTACAO')).toBe('food');
    expect(categoryKey('Feira')).toBe('farmersMarket');
    expect(categoryKey('Investimentos (Retorno)')).toBe('investmentReturns');
    expect(categoryKey('Padaria do Zé')).toBeNull();
  });

  it('shows defaults in the user language', () => {
    setLocaleSettings({ language: 'en' });
    expect(categoryLabel('Alimentação')).toBe('Food');
    expect(categoryLabel('Feira')).toBe('Farmers market');
    expect(categoryLabel('Outros')).toBe('Other');

    setLocaleSettings({ language: 'es' });
    expect(categoryLabel('Alimentação')).toBe('Comida');
    expect(categoryLabel('Feira')).toBe('Tianguis');

    setLocaleSettings({ language: 'pt' });
    expect(categoryLabel('Alimentação')).toBe('Alimentação');
    expect(categoryLabel('Feira')).toBe('Feira');
  });

  it('returns user-created names unchanged', () => {
    setLocaleSettings({ language: 'en' });
    expect(categoryLabel('Padaria do Zé')).toBe('Padaria do Zé');
  });

  it('labels a missing category', () => {
    setLocaleSettings({ language: 'en' });
    expect(categoryLabel('')).toBe('No category');
    expect(categoryLabel(null)).toBe('No category');
  });

  it('accepts the hook t()', () => {
    const fakeT = (key) => `T:${key}`;
    expect(categoryLabel('Saúde', fakeT)).toBe('T:categories.health');
  });

  it('every mapped key exists in en, pt and es', () => {
    ['en', 'pt', 'es'].forEach((language) => {
      setLocaleSettings({ language });
      DEFAULT_CATEGORY_NAMES.forEach((name) => {
        const key = categoryKey(name);
        expect(t(`categories.${key}`)).not.toBe(`categories.${key}`);
      });
    });
  });
});
