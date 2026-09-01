import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { ThemeMode } from '../types/settings';
import { getMonacoThemeName } from '../utils/monacoThemes';

export type ResolvedTheme = 'dark' | 'light';

export interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  monacoTheme: string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'octa-theme';

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light' || saved === 'system') {
        return saved;
      }
    } catch (e) {
      console.warn('Failed to read theme from localStorage:', e);
    }
    return 'dark';
  });

  const getSystemTheme = (): ResolvedTheme => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark';
  };

  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() => {
    if (theme === 'system') {
      return getSystemTheme();
    }
    return theme;
  });

  const applyThemeToDOM = useCallback((targetTheme: ResolvedTheme) => {
    const root = document.documentElement;
    if (targetTheme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
      root.style.colorScheme = 'dark';
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
      root.style.colorScheme = 'light';
    }
  }, []);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      // Also update global settings if present
      const savedSettings = localStorage.getItem('octa_global_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        parsed.theme = newTheme;
        localStorage.setItem('octa_global_settings', JSON.stringify(parsed));
      }
    } catch (e) {
      console.warn('Failed to save theme to localStorage:', e);
    }
  };

  const toggleTheme = () => {
    const nextTheme: ThemeMode = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
  };

  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemChange = (e: MediaQueryListEvent) => {
        const next: ResolvedTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(next);
        applyThemeToDOM(next);
      };

      const initial = mediaQuery.matches ? 'dark' : 'light';
      setResolvedTheme(initial);
      applyThemeToDOM(initial);

      mediaQuery.addEventListener('change', handleSystemChange);
      return () => mediaQuery.removeEventListener('change', handleSystemChange);
    } else {
      setResolvedTheme(theme);
      applyThemeToDOM(theme);
    }
  }, [theme, applyThemeToDOM]);

  const monacoTheme = getMonacoThemeName(resolvedTheme);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme, monacoTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
