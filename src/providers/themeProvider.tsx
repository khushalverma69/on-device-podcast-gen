import { createContext, useContext, useMemo } from 'react';

import { getTheme, type ThemeMode } from '../constants/theme';
import { useSettingsStore } from '../stores/settingsStore';

type ThemeContextValue = {
  mode: ThemeMode;
  tokens: ReturnType<typeof getTheme>;
  setMode: (mode: ThemeMode) => Promise<void>;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useSettingsStore((st) => st.themeMode);
  const setMode = useSettingsStore((st) => st.setThemeMode);

  const value = useMemo(
    () => ({
      mode,
      tokens: getTheme(),
      setMode,
    }),
    [mode, setMode]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeController(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useThemeController must be used within ThemeProvider');
  return ctx;
}
