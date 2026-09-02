import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LOCALE_LABELS,
  translations,
  type Locale,
  type TranslationKey,
} from "./translations";

// Module-level setting (mirrors src/utils/haptics.ts) so the locale is
// readable before the provider mounts (e.g. hydrate at app start).
const LANGUAGE_PREF_KEY = "language";
let storedLocale: Locale | null = null;

export const hydrateLanguageSetting = async () => {
  try {
    const value = await AsyncStorage.getItem(LANGUAGE_PREF_KEY);
    if (value === "en" || value === "hi" || value === "mr") {
      storedLocale = value;
    }
  } catch {
    storedLocale = null;
  }
};

type LanguageContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

const interpolate = (
  text: string,
  params?: Record<string, string | number>,
) => {
  if (!params) return text;
  let result = text;
  for (const [name, value] of Object.entries(params)) {
    result = result.split(`{{${name}}}`).join(String(value));
  }
  return result;
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(storedLocale ?? "en");

  // Pick up a locale hydrated after mount (hydrate is async, provider
  // usually mounts first on cold start).
  useEffect(() => {
    if (storedLocale && storedLocale !== locale) {
      setLocaleState(storedLocale);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    storedLocale = next;
    AsyncStorage.setItem(LANGUAGE_PREF_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => {
      const dict = translations[locale];
      const text =
        (dict && key in dict && dict[key]) ||
        translations.en[key] ||
        key;
      return interpolate(text, params);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}

export { LOCALE_LABELS };
export type { Locale, TranslationKey };
