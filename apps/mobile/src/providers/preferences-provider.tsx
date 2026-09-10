import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, Platform } from 'react-native';

export type Language = 'pt' | 'en';
export type ThemeMode = 'dark' | 'light';

type PreferencesContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const languageKey = 'nightguide:language';
const themeKey = 'nightguide:theme';

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('pt');
  const [theme, setThemeState] = useState<ThemeMode>('dark');

  useEffect(() => {
    void Promise.all([AsyncStorage.getItem(languageKey), AsyncStorage.getItem(themeKey)]).then(([savedLanguage, savedTheme]) => {
      if (savedLanguage === 'en' || savedLanguage === 'pt') setLanguageState(savedLanguage);
      if (savedTheme === 'dark' || savedTheme === 'light') {
        setThemeState(savedTheme);
        applyTheme(savedTheme);
      } else {
        applyTheme('dark');
      }
    });
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    void AsyncStorage.setItem(languageKey, next);
  }

  function setTheme(next: ThemeMode) {
    setThemeState(next);
    applyTheme(next);
    void AsyncStorage.setItem(themeKey, next);
  }

  const value = useMemo(() => ({ language, setLanguage, theme, setTheme }), [language, theme]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

function applyTheme(theme: ThemeMode) {
  Appearance.setColorScheme(theme);
  if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.style.colorScheme = theme;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences deve ser usado dentro de PreferencesProvider.');
  return context;
}
