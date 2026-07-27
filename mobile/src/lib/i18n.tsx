import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Zweisprachigkeit (DE/EN) für die Demo.
 *
 * Idee: keine externe i18n-Bibliothek und kein zentrales Key-Register, sondern ein
 * **inline-zweisprachiger** Wert `Localized<T>` - entweder ein einfacher Wert oder ein
 * Paar `{ de, en }`. In Komponenten:
 *
 *     const t = useT();
 *     <Text>{t({ de: "Speichern", en: "Save" })}</Text>
 *
 * Vorteil: Übersetzung steht direkt an der Verwendung (kein Auseinanderlaufen), und
 * bereits vorhandene reine Strings funktionieren weiter (werden unverändert zurückgegeben).
 *
 * WICHTIG - Trennung von Anzeige und Logik: Werte, auf denen die Auswertung per
 * String-Vergleich rechnet (z. B. `tags.includes("Außenplätze")`, `guest.lastVisit ===
 * "Rückholung gesendet"` in `analytics.ts`), bleiben in ihrer kanonischen (deutschen)
 * Form gespeichert. Übersetzt wird NUR bei der Anzeige - sonst brechen Score/Kennzahlen.
 */

export type Lang = "de" | "en";

/** Ein Wert, der einfach (reiner Wert) oder zweisprachig sein kann. */
export type Localized<T = string> = T | { de: T; en: T };

function isPair<T>(v: Localized<T>): v is { de: T; en: T } {
  return typeof v === "object" && v !== null && "de" in (v as object) && "en" in (v as object);
}

/** Löst einen `Localized`-Wert für eine Sprache auf; reine Werte kommen unverändert zurück. */
export function resolveLocalized<T>(v: Localized<T>, lang: Lang): T {
  return isPair(v) ? v[lang] : v;
}

interface LanguageValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  /** Auflöser für die aktuelle Sprache: `t({ de, en })` bzw. `t(reinerWert)`. */
  t: <T>(v: Localized<T>) => T;
}

const LanguageContext = createContext<LanguageValue | null>(null);
const LANG_KEY = "maitr.demo.lang.v1";

/**
 * Hält die aktive Sprache (persistiert). Liegt hoch im Baum, damit jeder Screen `useT`
 * nutzen kann. Getrennt von Demo-Daten (`resetDemo` setzt die Sprache NICHT zurück).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("de");
  const hydrated = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(LANG_KEY)
      .then((v) => {
        if (v === "de" || v === "en") setLangState(v);
      })
      .catch(() => {})
      .finally(() => {
        hydrated.current = true;
      });
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    AsyncStorage.setItem(LANG_KEY, l).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((l) => {
      const next: Lang = l === "de" ? "en" : "de";
      AsyncStorage.setItem(LANG_KEY, next).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo<LanguageValue>(
    () => ({
      lang,
      setLang,
      toggleLang,
      t: <T,>(v: Localized<T>) => resolveLocalized(v, lang),
    }),
    [lang, setLang, toggleLang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

function useLanguage(): LanguageValue {
  const value = useContext(LanguageContext);
  if (!value) throw new Error("useLanguage muss innerhalb von <LanguageProvider> stehen.");
  return value;
}

/** Aktueller Sprach-Auflöser: `const t = useT(); t({ de, en })`. */
export function useT(): <T>(v: Localized<T>) => T {
  return useLanguage().t;
}

/** Aktive Sprache (für Datums-/Zahlenformate o. Ä.). */
export function useLang(): Lang {
  return useLanguage().lang;
}

/** Sprache umschalten/setzen (für den Umschalter in Demo/Konto). */
export function useLanguageControls(): Pick<LanguageValue, "lang" | "setLang" | "toggleLang"> {
  const { lang, setLang, toggleLang } = useLanguage();
  return { lang, setLang, toggleLang };
}
