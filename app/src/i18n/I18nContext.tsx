import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { DICTIONARIES, type LanguageCode, type TranslationKey } from "./translations";

const STORAGE_KEY = "nobs-language";

function detectInitialLanguage(): LanguageCode {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && stored in DICTIONARIES) return stored as LanguageCode;
  const browserLang = navigator.language.slice(0, 2).toLowerCase();
  return browserLang in DICTIONARIES ? (browserLang as LanguageCode) : "en";
}

interface I18nContextValue {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  t: (key: TranslationKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>(detectInitialLanguage);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, language);
    document.documentElement.lang = language;
  }, [language]);

  const t = useMemo(() => {
    const dict = DICTIONARIES[language];
    return (key: TranslationKey, vars?: Record<string, string | number>) => {
      let text = dict[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) text = text.replaceAll(`{${name}}`, String(value));
      }
      return text;
    };
  }, [language]);

  function setLanguage(lang: LanguageCode) {
    setLanguageState(lang);
  }

  return <I18nContext.Provider value={{ language, setLanguage, t }}>{children}</I18nContext.Provider>;
}

export function useTranslation(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useTranslation must be used within an I18nProvider.");
  return ctx;
}
