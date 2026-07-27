import { Alert, View } from "react-native";
import { useRouter, type Href } from "expo-router";

import { Eyebrow } from "../src/components/ui/Eyebrow";
import { ListCard, ListRow } from "../src/components/ui/ListCard";
import { MaitrWordmark } from "../src/components/MaitrWordmark";
import { NavHeader } from "../src/components/ui/NavHeader";
import { Screen } from "../src/components/ui/Screen";
import { Text } from "../src/components/ui/Text";
import { useAppearance } from "../src/lib/appearance";
import { useLanguageControls } from "../src/lib/i18n";
import { useStore } from "../src/lib/store";
import { Toggle } from "../src/components/ui/Toggle";
import { useTheme } from "../src/theme";

interface DemoEntry {
  /** Nummer im Design-Dokument. */
  no: string;
  title: string;
  href?: Href;
  /** Für Screens, die kein eigener Pfad ist, sondern ein Zustand. */
  hint?: string;
}

interface DemoSection {
  label: string;
  entries: DemoEntry[];
}

/**
 * Alle 25 Screens aus "Maitr App-Screens.dc.html", gruppiert wie im Design.
 * Screens ohne eigenen Pfad sind Zustände eines anderen Screens - der Hinweis sagt,
 * wie man sie erreicht.
 */
const sections: DemoSection[] = [
  {
    label: "Öffentlich",
    entries: [
      { no: "01", title: "Login", href: "/login" },
      { no: "15", title: "Onboarding", href: "/onboarding" },
    ],
  },
  {
    label: "Gast",
    entries: [
      { no: "17", title: "Öffentliches Profil", href: "/gast/profil" },
      { no: "03", title: "Reservieren", href: "/gast/reservieren" },
      { no: "02", title: "Bestätigung", href: "/gast/bestaetigung" },
    ],
  },
  {
    label: "Betrieb",
    entries: [
      { no: "04", title: "Start · Guten Morgen", href: "/start" },
      { no: "16", title: "Guten Abend · Nachtbar", hint: "Nachtbar oben einschalten" },
      { no: "05", title: "Reservierung · Heute", href: "/tische" },
      { no: "06", title: "Reservierung · Ausgebucht", hint: "Im Tische-Screen ein Datum weiter" },
      { no: "07", title: "Reservierung · Leerer Tag", hint: "Im Tische-Screen zwei Daten weiter" },
      { no: "08", title: "Beiträge", href: "/beitraege" },
      { no: "09", title: "Dein Juli", href: "/wachstum" },
      { no: "10", title: "Profil Check", href: "/profil-check" },
      { no: "11", title: "Deine Kanäle", href: "/kanaele" },
      { no: "12", title: "Konto & Abo", href: "/konto" },
      { no: "13", title: "Bewertungen", href: "/bewertungen" },
      { no: "14", title: "Antwort bearbeiten", href: "/aufgabe/rev_marion" },
      { no: "+", title: "Gäste · CRM", href: "/gaeste" },
      { no: "+", title: "Speisekarte", href: "/speisekarte" },
      { no: "+", title: "Profil verwalten", href: "/profil" },
    ],
  },
  {
    label: "Journey",
    entries: [
      { no: "18", title: "Willkommen · 1 / 7", href: "/journey/willkommen" },
      { no: "19", title: "Betrieb finden · 2 / 7", href: "/journey/betrieb" },
      { no: "20", title: "Google verbinden · 3 / 7", href: "/journey/google" },
      { no: "21", title: "Öffnungszeiten · 4 / 7", href: "/journey/zeiten" },
      { no: "22", title: "Tische einrichten · 5 / 7", href: "/journey/tische" },
      { no: "23", title: "Kanäle verbinden · 6 / 7", href: "/journey/kanaele" },
      { no: "24", title: "Fotos und Ton · 7 / 7", href: "/journey/medien" },
      { no: "25", title: "Fertig · Live", href: "/journey/fertig" },
    ],
  },
];

/**
 * Demo-Verzeichnis. Kein Produkt-Screen, sondern der Einstieg zum Vorführen:
 * jeder Screen des Designs ist von hier aus einen Tap entfernt.
 */
export default function DemoIndex() {
  const theme = useTheme();
  const router = useRouter();
  const { nightMode, toggleNightMode } = useAppearance();
  const { lang, toggleLang } = useLanguageControls();
  const { resetDemo } = useStore();

  const total = sections.reduce((sum, section) => sum + section.entries.length, 0);

  const confirmReset = () => {
    Alert.alert(
      "Demo zurücksetzen?",
      "Holt die drei Entscheidungen auf der Startseite und alle Kennzahlen zurück - so, wie beim ersten Start. Erledigte Aufgaben und Änderungen dieser Sitzung gehen verloren.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Zurücksetzen",
          style: "destructive",
          onPress: () => {
            resetDemo();
            router.replace("/start");
          },
        },
      ],
    );
  };

  return (
    <Screen contentStyle={{ gap: theme.spacing.xl }}>
      {router.canGoBack() ? <NavHeader /> : null}
      <View style={{ gap: 6 }}>
        <MaitrWordmark size={34} />
        <Text variant="body" tone="secondary">
          Präsenz Dashboard für Kleingastronomen
        </Text>
        <Eyebrow>
          Café Goldstück · Köln Ehrenfeld · {total} Screens · inkl. Anbindungsjourney
        </Eyebrow>
      </View>

      <ListCard>
        <ListRow
          title={lang === "en" ? "Language · English" : "Sprache · Deutsch"}
          meta={lang === "en" ? "Tap to switch the demo to German" : "Tippen, um die Demo auf Englisch zu stellen"}
          onPress={toggleLang}
          trailing={
            <Toggle
              value={lang === "en"}
              onValueChange={toggleLang}
              accessibilityLabel="English"
            />
          }
        />
        <ListRow
          title="Nachtbar Modus"
          meta="Schaltet Palette und Start-Screen auf Abend"
          trailing={
            <Toggle
              value={nightMode}
              onValueChange={toggleNightMode}
              accessibilityLabel="Nachtbar Modus"
            />
          }
        />
        <ListRow
          title="Demo zurücksetzen"
          meta="Holt die drei Aufgaben & Kennzahlen zurück"
          onPress={confirmReset}
          trailing={
            <Text variant="numeric" tone="accent" style={{ fontSize: 20 }}>
              ↺
            </Text>
          }
        />
      </ListCard>

      {sections.map((section) => (
        <View key={section.label} style={{ gap: theme.spacing.md }}>
          <Eyebrow tone="accent">{section.label}</Eyebrow>
          <ListCard>
            {section.entries.map((entry) => (
              <ListRow
                key={entry.no}
                title={entry.title}
                meta={entry.hint}
                leading={
                  <Text variant="numeric" tone="faint" style={{ fontSize: 14, width: 22 }}>
                    {entry.no}
                  </Text>
                }
                trailing={
                  entry.href ? (
                    <Text variant="numeric" tone="faint" style={{ fontSize: 22 }}>
                      ›
                    </Text>
                  ) : null
                }
                onPress={entry.href ? () => router.push(entry.href!) : undefined}
              />
            ))}
          </ListCard>
        </View>
      ))}
    </Screen>
  );
}
