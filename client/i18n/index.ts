import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import de from "./locales/de.json";
import en from "./locales/en.json";

// Define available languages
export const LANGUAGES = {
  de: { name: "Deutsch", flag: "🇩🇪", code: "de" },
  en: { name: "English", flag: "🇬🇧", code: "en" },
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

// Default language is German (primary market)
export const DEFAULT_LANGUAGE: LanguageCode = "de";

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(LANGUAGES),
    
    // Detection options
    detection: {
      // Order of language detection methods
      order: ["localStorage", "navigator", "htmlTag"],
      // Cache user selection in localStorage
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Namespace settings
    ns: ["translation"],
    defaultNS: "translation",

    // Debug in development
    debug: import.meta.env.DEV,

    // React-specific options
    react: {
      useSuspense: false, // Disable suspense for SSR compatibility
    },
  });

// Helper function to change language
export const changeLanguage = (lang: LanguageCode) => {
  return i18n.changeLanguage(lang);
};

// Helper to get current language
export const getCurrentLanguage = (): LanguageCode => {
  return (i18n.language?.split("-")[0] as LanguageCode) || DEFAULT_LANGUAGE;
};

export default i18n;
