jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('phosphor-react-native', () => {
  const MockIcon = (name) => {
    const Component = (props) => `${name}Icon`;
    Component.displayName = name;
    return Component;
  };
  return new Proxy({}, { get: (_, name) => MockIcon(name) });
});

const { CategoryIcon, getCategoryColor, CATEGORIES } = require('../CategoryIcon');

describe('CategoryIcon', () => {
  it('is a function component', () => {
    expect(typeof CategoryIcon).toBe('function');
  });

  it('returns a truthy value for known category', () => {
    const result = CategoryIcon({ category: 'Alimentação' });
    expect(result).toBeTruthy();
  });

  it('returns a truthy value for unknown category (fallback)', () => {
    const result = CategoryIcon({ category: 'Unknown Category' });
    expect(result).toBeTruthy();
  });

  it('accepts custom size prop', () => {
    const result = CategoryIcon({ category: 'Transporte', size: 60 });
    expect(result).toBeTruthy();
  });

  it('exports getCategoryColor helper', () => {
    expect(getCategoryColor('Alimentação')).toBe('#EF4444');
    expect(getCategoryColor('Unknown')).toBe('#737373');
  });

  it('exports CATEGORIES list with 30+ entries', () => {
    expect(Array.isArray(CATEGORIES)).toBe(true);
    expect(CATEGORIES.length).toBeGreaterThanOrEqual(30);
  });
});
