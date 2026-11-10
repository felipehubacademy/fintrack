import React from 'react';
import { renderHook, act } from '@testing-library/react-hooks';

// Must mock before importing
jest.mock('react-native', () => ({
  ...jest.requireActual('../../__mocks__/react-native-mock'),
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('../../theme/colors', () => ({
  colors: {
    brand: { primary: '#1A6AFF', accent: '#F5A623' },
    text: { primary: '#111' },
    background: { primary: '#FFF' },
    border: { light: '#E5E5E5' },
    success: { main: '#10B981' },
    error: { main: '#E5484D' },
    warning: { main: '#F5A623' },
    info: { main: '#3B82F6' },
    neutral: {},
    financial: {},
    overlay: {},
  },
  colorsDark: {
    brand: { primary: '#1A6AFF', accent: '#F5A623' },
    text: { primary: '#FFF' },
    background: { primary: '#0A0A0A' },
    border: { light: '#333' },
    success: { main: '#10B981' },
    error: { main: '#E5484D' },
    warning: { main: '#F5A623' },
    info: { main: '#3B82F6' },
    neutral: {},
    financial: {},
    overlay: {},
  },
}));

const { useColorScheme } = require('react-native');
const { ThemeProvider, useTheme } = require('../ThemeContext');

const wrapper = ({ children }) => React.createElement(ThemeProvider, null, children);

describe('ThemeContext', () => {
  beforeEach(() => {
    useColorScheme.mockReturnValue('light');
  });

  it('provides light colors by default', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(false);
    expect(result.current.colors.background.primary).toBe('#FFF');
  });

  it('follows system dark mode', () => {
    useColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(true);
    expect(result.current.colors.background.primary).toBe('#0A0A0A');
  });

  it('toggleMode switches from light to dark', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(false);
    act(() => result.current.toggleMode());
    expect(result.current.isDark).toBe(true);
  });

  it('toggleMode switches from dark to light', () => {
    useColorScheme.mockReturnValue('dark');
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.isDark).toBe(true);
    act(() => result.current.toggleMode());
    expect(result.current.isDark).toBe(false);
  });

  it('useSystem reverts to system preference', () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    act(() => result.current.setMode('dark'));
    expect(result.current.isDark).toBe(true);
    act(() => result.current.useSystem());
    expect(result.current.isDark).toBe(false);
  });

  it('throws when used outside ThemeProvider', () => {
    const { result } = renderHook(() => {
      try {
        return useTheme();
      } catch (e) {
        return { error: e.message };
      }
    });
    expect(result.current.error).toMatch(/ThemeProvider/);
  });
});
