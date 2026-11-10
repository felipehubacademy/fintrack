jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({ isDark: false }),
}));

jest.mock('lucide-react-native', () => {
  const MockIcon = (name) => {
    const Component = (props) => `${name}Icon`;
    Component.displayName = name;
    return Component;
  };
  return {
    ShoppingCart: MockIcon('ShoppingCart'),
    Utensils: MockIcon('Utensils'),
    Car: MockIcon('Car'),
    Home: MockIcon('Home'),
    Heart: MockIcon('Heart'),
    Gamepad2: MockIcon('Gamepad2'),
    GraduationCap: MockIcon('GraduationCap'),
    Shirt: MockIcon('Shirt'),
    Smartphone: MockIcon('Smartphone'),
    Zap: MockIcon('Zap'),
    Banknote: MockIcon('Banknote'),
    Gift: MockIcon('Gift'),
    Briefcase: MockIcon('Briefcase'),
    HelpCircle: MockIcon('HelpCircle'),
  };
});

const { CategoryIcon } = require('../CategoryIcon');

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
});
