jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      text: { primary: '#111' },
    },
  }),
}));

const { AnimatedNumber } = require('../AnimatedNumber');

describe('AnimatedNumber', () => {
  it('is a function component', () => {
    expect(typeof AnimatedNumber).toBe('function');
  });

  it('renders with default props', () => {
    const result = AnimatedNumber({ value: 100 });
    expect(result).toBeTruthy();
  });

  it('renders with custom prefix', () => {
    const result = AnimatedNumber({ value: 50, prefix: '$ ' });
    expect(result).toBeTruthy();
  });

  it('renders with zero value', () => {
    const result = AnimatedNumber({ value: 0 });
    expect(result).toBeTruthy();
  });
});
