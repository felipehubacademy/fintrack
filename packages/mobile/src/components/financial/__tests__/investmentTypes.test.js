import { getFixedT } from '@fintrack/shared/i18n';

jest.mock('lucide-react-native', () => new Proxy({}, { get: (_, name) => name }));
import { INVESTMENT_TYPES, investmentTypeInfo, investmentTypeLabel } from '../investmentTypes';

describe('investment types', () => {
  it('has a label for every type in every language', () => {
    for (const lang of ['en', 'pt', 'es']) {
      const t = getFixedT(lang);
      for (const type of INVESTMENT_TYPES) {
        const label = investmentTypeLabel(type.value, t);
        expect(label).toBeTruthy();
        expect(label).not.toContain('investments.');
      }
    }
  });

  it('falls back to "other" for unknown types', () => {
    expect(investmentTypeInfo('bonds_from_mars').value).toBe('other');
    expect(investmentTypeLabel(undefined, getFixedT('pt'))).toBe('Outros');
  });
});
