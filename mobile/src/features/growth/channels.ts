/** Kanal-Katalog: Stammdaten für Liste, Verbinden-Seite und Profilverwaltung. */
export interface ChannelDef {
  id: string;
  name: string;
  /** Kürzel im Avatar. */
  initials: string;
  /** Markenfarbe. */
  color: string;
  /** Nutzen-Untertitel in der Liste. */
  purpose: string;
  /** Was Maitr nach dem Verbinden darf. */
  scopes: string[];
  /** Vorgeschlagenes Konto beim Verbinden (Demo). */
  suggestedAccount: string;
  /** Ob dieser Kanal ein pflegbares Profil hat (Öffnungszeiten/Bio). */
  managesProfile?: "google" | "instagram";
}

export const CHANNELS: ChannelDef[] = [
  {
    id: "google",
    name: "Google Business",
    initials: "G",
    color: "#4285F4",
    purpose: "Profil, Bewertungen & Öffnungszeiten",
    scopes: [
      "Bewertungen lesen und beantworten",
      "Öffnungszeiten aktuell halten",
      "Beiträge veröffentlichen",
    ],
    suggestedAccount: "Sofia Brandt · Inhaberin",
    managesProfile: "google",
  },
  {
    id: "instagram",
    name: "Instagram",
    initials: "Ig",
    color: "#C13584",
    purpose: "Beiträge automatisch teilen",
    scopes: ["Beiträge & Stories posten", "Bio und Link pflegen", "Kommentare sehen"],
    suggestedAccount: "@cafegoldstueck",
    managesProfile: "instagram",
  },
  {
    id: "yelp",
    name: "Yelp",
    initials: "Y",
    color: "#D32323",
    purpose: "Reviews automatisch beantworten",
    scopes: ["Bewertungen lesen und beantworten"],
    suggestedAccount: "Café Goldstück",
  },
  {
    id: "thefork",
    name: "TheFork",
    initials: "Tf",
    color: "#1F7A72",
    purpose: "Reservierungen bündeln",
    scopes: ["Reservierungen empfangen", "Verfügbarkeit synchronisieren"],
    suggestedAccount: "Café Goldstück",
  },
  {
    id: "facebook",
    name: "Facebook",
    initials: "f",
    color: "#1877F2",
    purpose: "Seite & Empfehlungen",
    scopes: ["Seite verwalten", "Beiträge posten"],
    suggestedAccount: "Café Goldstück",
  },
];

export function findChannel(id?: string): ChannelDef {
  return CHANNELS.find((c) => c.id === id) ?? CHANNELS[0];
}
