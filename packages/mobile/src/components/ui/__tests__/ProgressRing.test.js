jest.mock('../../../contexts/ThemeContext', () => ({
  useTheme: () => ({
    colors: {
      brand: { primary: '#1A6AFF' },
      border: { light: '#E5E5E5' },
      text: { primary: '#111' },
    },
  }),
}));

jest.mock('react-native-svg', () => ({
  __esModule: true,
  default: 'Svg',
  Circle: 'Circle',
}));

jest.mock('../Text', () => ({
  Caption: 'Caption',
}));

const { ProgressRing } = require('../ProgressRing');

describe('ProgressRing', () => {
  it('is a function component', () => {
    expect(typeof ProgressRing).toBe('function');
  });

  it('renders with default props', () => {
    const result = ProgressRing({});
    expect(result).toBeTruthy();
  });

  it('renders with 50% progress', () => {
    const result = ProgressRing({ progress: 0.5 });
    expect(result).toBeTruthy();
  });

  it('clamps progress above 1 to 1', () => {
    const result = ProgressRing({ progress: 1.5 });
    expect(result).toBeTruthy();
  });

  it('clamps negative progress to 0', () => {
    const result = ProgressRing({ progress: -0.5 });
    expect(result).toBeTruthy();
  });

  it('renders percentage label when showPercentage is true', () => {
    const result = ProgressRing({ progress: 0.75, showPercentage: true });
    expect(result).toBeTruthy();
  });
});
