import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { defaultLanguage, languageOptions, rtlLanguages, translations, type LanguageCode } from './translations';

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = 'ui.language';

const isLanguageCode = (value: string | null): value is LanguageCode => {
  if (!value) return false;
  return languageOptions.some(option => option.code === value);
};

const resolveInitialLanguage = (): LanguageCode => {
  if (typeof window === 'undefined') return defaultLanguage;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (isLanguageCode(stored)) return stored;
  const navigatorLang = window.navigator.language?.split('-')[0] ?? '';
  if (isLanguageCode(navigatorLang)) return navigatorLang;
  return defaultLanguage;
};

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(resolveInitialLanguage);

  const setLanguage = useCallback((next: LanguageCode) => {
    setLanguageState(next);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, next);
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  const t = useCallback(
    (key: string, fallback?: string) => {
      return (
        translations[language]?.[key] ||
        translations[defaultLanguage]?.[key] ||
        fallback ||
        key
      );
    },
    [language]
  );

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = language;
    document.documentElement.dir = rtlLanguages.includes(language) ? 'rtl' : 'ltr';
  }, [language]);

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}

export { languageOptions, type LanguageCode };
