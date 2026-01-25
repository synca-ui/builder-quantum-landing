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

// Initialize i18next - using initReactI18next for proper React binding
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: de },
      en: { translation: en },
    },
    lng: DEFAULT_LANGUAGE, // Set initial language explicitly
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: Object.keys(LANGUAGES),

    // Detection options
    detection: {
      order: ["localStorage", "navigator", "htmlTag"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },

    interpolation: {
      escapeValue: false,
    },

    ns: ["translation"],
    defaultNS: "translation",

    // React-specific options - useSuspense must be false to avoid issues
    react: {
      useSuspense: false,
      bindI18n: "languageChanged",
      bindI18nStore: "",
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
