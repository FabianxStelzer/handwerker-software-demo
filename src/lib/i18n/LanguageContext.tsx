"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { Language, TranslationKey, getTranslation, languageNames } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => string;
  translateContent: (text: string) => Promise<string>;
  languageNames: Record<Language, string>;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "de",
  setLanguage: () => {},
  t: (key) => key,
  translateContent: async (text) => text,
  languageNames,
});

export function LanguageProvider({ children, initialLanguage = "de" }: { children: React.ReactNode; initialLanguage?: Language }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  useEffect(() => {
    const stored = localStorage.getItem("user-language") as Language | null;
    if (stored && stored !== language) setLanguageState(stored);
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("user-language", lang);
  }, []);

  const t = useCallback((key: TranslationKey) => {
    return getTranslation(language, key);
  }, [language]);

  const translateContent = useCallback(async (text: string): Promise<string> => {
    if (language === "de" || !text || text.trim().length === 0) return text;
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, targetLang: language }),
      });
      if (res.ok) {
        const data = await res.json();
        return data.translated || text;
      }
    } catch { /* fallback to original */ }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, translateContent, languageNames }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
