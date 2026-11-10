import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { colors as lightColors, colorsDark } from '../theme/colors';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState(null); // null = follow system

  const resolvedMode = mode ?? (systemScheme === 'dark' ? 'dark' : 'light');

  const theme = useMemo(() => ({
    mode: resolvedMode,
    colors: resolvedMode === 'dark' ? colorsDark : lightColors,
    isDark: resolvedMode === 'dark',
    setMode,
    toggleMode: () => setMode((prev) => {
      const current = prev ?? (systemScheme === 'dark' ? 'dark' : 'light');
      return current === 'dark' ? 'light' : 'dark';
    }),
    useSystem: () => setMode(null),
  }), [resolvedMode, systemScheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
