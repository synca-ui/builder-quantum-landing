import i18n from "i18next";
import { initReactI18next } from "react-i18next";

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

// Configure basic i18n options shared between server and client
const baseInitOptions = {
  resources: {
    de: { translation: de },
    en: { translation: en },
  },
  lng: DEFAULT_LANGUAGE, // Set initial language explicitly
  fallbackLng: DEFAULT_LANGUAGE,
  supportedLngs: Object.keys(LANGUAGES),

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
} as const;

// Initialize i18next - use initReactI18next for React binding
i18n.use(initReactI18next);

// Only load browser-specific detector when running in the browser (avoid SSR/build issues)
if (typeof window !== "undefined") {
  // Use dynamic import so bundlers that build server-side won't try to resolve this module
  void import("i18next-browser-languagedetector")
    .then((mod) => {
      const LanguageDetector = (mod && (mod as any).default) || mod;
      i18n.use(LanguageDetector).init({
        ...baseInitOptions,
        // Detection options
        detection: {
          order: ["localStorage", "navigator", "htmlTag"],
          caches: ["localStorage"],
          lookupLocalStorage: "i18nextLng",
        },
      } as any);
    })
    .catch((err) => {
      console.warn("i18next language detector failed to load:", err);
      // Fallback to basic init without detector
      i18n.init(baseInitOptions as any);
    });
} else {
  // Server-side / build environment - init without the browser detector
  i18n.init(baseInitOptions as any);
}

// Helper function to change language
export const changeLanguage = (lang: LanguageCode) => {
  return i18n.changeLanguage(lang);
};

// Helper to get current language
export const getCurrentLanguage = (): LanguageCode => {
  return (i18n.language?.split("-")[0] as LanguageCode) || DEFAULT_LANGUAGE;
};

export default i18n;
