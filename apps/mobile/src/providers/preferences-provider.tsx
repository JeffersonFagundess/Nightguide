import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, type PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'pt' | 'en';

type PreferencesContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);
const languageKey = 'nightguide:language';

export function PreferencesProvider({ children }: PropsWithChildren) {
  const [language, setLanguageState] = useState<Language>('pt');

  useEffect(() => {
    void AsyncStorage.getItem(languageKey).then((saved) => {
      if (saved === 'en' || saved === 'pt') setLanguageState(saved);
    });
  }, []);

  function setLanguage(next: Language) {
    setLanguageState(next);
    void AsyncStorage.setItem(languageKey, next);
  }

  const value = useMemo(() => ({ language, setLanguage }), [language]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const context = useContext(PreferencesContext);
  if (!context) throw new Error('usePreferences deve ser usado dentro de PreferencesProvider.');
  return context;
}
