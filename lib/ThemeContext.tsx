import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/stores/useSettingsStore';
import { createTheme, type AppTheme } from '@/lib/theme';

const ThemeContext = createContext<AppTheme>(createTheme('light'));

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const themeSetting = useSettingsStore((s) => s.theme);
  const systemScheme = useColorScheme();

  const theme = useMemo(() => {
    let mode: 'light' | 'dark' = 'light';
    if (themeSetting === 'dark') mode = 'dark';
    else if (themeSetting === 'system') mode = systemScheme === 'dark' ? 'dark' : 'light';
    return createTheme(mode);
  }, [themeSetting, systemScheme]);

  return (
    <ThemeContext.Provider value={theme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}
