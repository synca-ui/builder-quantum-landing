/**
 * Domänen-Typen, die Web und Mobile teilen.
 * Bewusst entkoppelt von Prisma-Modellen: hier steht nur, was über die API geht.
 */

export type Iso8601 = string;

/**
 * Kanonische Wochentagsliste (kleingeschrieben, Englisch: "monday" … "sunday").
 *
 * Hierher verschoben aus shared/suggestedConfig.ts, wo sie vorher stand und von
 * dort exportiert wurde - eine Naht durch eine Datei, die aus ganz anderem
 * Anlass laufend umgebaut wird. Macht sie dort jemand wieder privat, stürzt
 * `z.enum(DAYS)` in server/schemas/configuration.ts beim MODULLADEN ab, nicht
 * erst bei der ersten Anfrage. `packages/core` ist die gemeinsame Sprache von
 * Web, Server und App - hier ist die richtige Stelle für eine Liste, die alle
 * drei brauchen.
 */
export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

export type Day = (typeof DAYS)[number];

/**
 * Ein Tageseintrag: entweder geschlossen (keine Uhrzeiten - "sonntags
 * geschlossen" braucht kein erfundenes `open`/`close`) oder geöffnet mit beiden
 * Uhrzeiten. `open`/`close` bleiben einfache Strings, weil ein TypeScript-Typ
 * kein Zeitformat (HH:MM, gültige Stunde/Minute) prüfen kann - das übernimmt
 * zur Laufzeit `strictOpeningTimeSchema` in server/schemas/configuration.ts.
 */
export type DayHours =
  | { closed: true }
  | { closed: false; open: string; close: string };

/**
 * Öffnungszeiten je Wochentag. Tagesschlüssel aus DAYS oben, jeder Tag optional
 * (ein Betrieb mit fünf Öffnungstagen trägt nur fünf Einträge ein).
 *
 * Geprüft wird diese Form zur Laufzeit für `Business.openingHours` durch
 * `server/schemas/configuration.ts#StrictOpeningHoursSchema` (dieselbe Liste
 * DAYS, derselbe closed/open/close-Aufbau als `z.discriminatedUnion("closed",
 * …)`) - NICHT durch das lose `OpeningHoursSchema` desselben Moduls: das gilt
 * für den Konfigurator, der Altbestand in der Datenbank hat, und lässt jeden
 * String als Tagesschlüssel zu (gemessen:
 * `OpeningHoursSchema.safeParse({Montag: …})` → success).
 *
 * Warum der Typ hier eigenständig steht statt aus `shared/` importiert:
 * `packages/core` ist die gemeinsame Sprache von Web und Mobile, aber
 * `mobile/metro.config.js` löst nur das Paket "@maitr/core" auf, nicht
 * "@shared". Ein Import aus `shared/` würde also den Mobile-Build brechen.
 */
export type OpeningHours = Partial<Record<Day, DayHours>>;

export interface Venue {
  id: string;
  name: string;
  /** Kurzbeschreibung, z. B. "Spezialitätenkaffee & hausgemachtes Gebäck". */
  tagline?: string;
  city?: string;
  district?: string;
  street?: string;
  timezone: string;
  tags: string[];
  /** Fehlt, solange kein Wert gesetzt wurde. Änderung über `api.venues.update`. */
  openingHours?: OpeningHours;

  /*
   * Die folgenden Felder liefert NUR die angemeldete Liste (`GET /venues`) -
   * das öffentliche Gastprofil (`GET /venues/:slug/public`) lässt sie weg,
   * es bleibt bei seiner Allowlist. Sie stammen aus der Veröffentlichung der
   * Web-App (server/routes/webapps.ts → ensureUserBusiness): Wer seine Seite
   * über den Konfigurator veröffentlicht, findet den Betrieb in der App mit
   * denselben Angaben vor, statt sie ein zweites Mal einzutippen.
   */
  /** Adresse des Betriebs in Maitr (Business.slug) - unveränderlich. */
  slug?: string;
  /**
   * Längere Beschreibung ("Über uns"). Fehlt, solange keine gesetzt ist - auch nach
   * `description: ""` über `api.venues.update` (der Server speichert dann NULL).
   */
  description?: string;
  /** Art des Betriebs, z. B. "restaurant", "cafe", "bar". */
  cuisine?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  phone?: string;
  email?: string;
  /** Die veröffentlichte Web-App, z. B. "https://haus-toeller.maitr.de". */
  website?: string;
  postalCode?: string;
  socialLinks?: Partial<Record<"instagram" | "facebook" | "tiktok" | "website", string>>;
  /** Präsenz-Score aus der Website-Analyse (0-100). */
  maitrScore?: number;
}

/** Eine Position der Speisekarte, wie `GET /venues/:venueId/menu` sie liefert. */
export interface VenueMenuItem {
  id: string;
  name: string;
  description?: string;
  /** In Euro; 0, wenn die Karte keinen Preis nennt ("auf Anfrage"). */
  price: number;
  imageUrl?: string;
}

export interface VenueMenuCategory {
  id: string;
  name: string;
  items: VenueMenuItem[];
}

/**
 * Die Speisekarte eines Betriebs, in der Reihenfolge der Karte. Sie entsteht
 * beim Veröffentlichen der Web-App (dieselben Gerichte, die die Seite zeigt)
 * und ist in der App nur lesbar - gepflegt wird sie im Konfigurator.
 */
export interface VenueMenu {
  categories: VenueMenuCategory[];
}

/**
 * Eingabe für `api.venues.update` - Änderungen an einem bestehenden Betrieb.
 *
 * Alle Felder optional, aber mindestens eines ist Pflicht (der Server lehnt eine
 * leere Anfrage ab). `tagline: ""` löscht die Kurzbeschreibung, `description: ""`
 * die Beschreibung (Server setzt jeweils intern `null`). `openingHours: null`
 * löscht die Öffnungszeiten vollständig - und `openingHours` ERSETZT immer den
 * ganzen Wochenplan, ein fehlender Tag gilt danach als „ohne Angabe".
 *
 * Absichtlich KEIN slug-Feld - wie bei `CreateVenueInput` leitet der Server die
 * Adresse selbst ab, und hier gilt zusätzlich: der Slug ändert sich mit diesem
 * Aufruf NIE. Er ist Teil der veröffentlichten Adresse; ein stiller Wechsel
 * würde eine ausgelieferte Web-App unerreichbar machen.
 */
export interface UpdateVenueInput {
  name?: string;
  /** Höchstens 200 Zeichen (nach dem Trimmen). */
  tagline?: string;
  /**
   * Längere Beschreibung ("Über uns"), höchstens 2000 Zeichen nach dem Trimmen -
   * dieselbe Grenze wie `CreateVenueInput.description`. Die Spalte, die der
   * Präsenz-Hebel „Beschreibung ergänzen" misst.
   */
  description?: string;
  /** IANA-Zone wie "Europe/Berlin". */
  timezone?: string;
  openingHours?: OpeningHours | null;
}

/**
 * Eingabe für `api.venues.create` - der erste eigene Betrieb.
 *
 * Nur `name` ist Pflicht: Adresse (slug), Zeitzone und Status setzt der Server.
 * Absichtlich KEIN slug-Feld - die Adresse leitet der Server aus dem Namen ab
 * (`shared/subdomain.ts`), damit Client und Server nicht zwei Vorstellungen davon
 * haben, was eine gültige Adresse ist.
 */
export interface CreateVenueInput {
  name: string;
  /** IANA-Zone wie "Europe/Berlin". Ohne Angabe setzt der Server Europe/Berlin. */
  timezone?: string;
  /** Freitext fürs Profil; taucht in der `Venue`-Antwort (noch) nicht auf. */
  description?: string;
}

export type TaskKind = "review" | "post" | "profile" | "channel" | "reservation";

/**
 * Eine der "drei Entscheidungen" auf dem Start-Screen.
 * `estimatedMinutes` und `impact` steuern die Reihenfolge im Tagesbriefing.
 */
export interface DailyTask {
  id: string;
  kind: TaskKind;
  /** Kleine Großbuchstaben-Zeile über der Karte, z. B. "Bewertung · 2 Min". */
  eyebrow: string;
  title: string;
  /** Optionaler Vorschlagstext (KI-Antwort, Beitragstext). */
  draft?: string;
  /** Wirkungsversprechen, z. B. "+35 % Profilaufrufe". */
  impact?: string;
  estimatedMinutes: number;
  primaryAction: { label: string; endpoint?: string };
  secondaryAction?: { label: string; endpoint?: string };
  /** 1-5 Sterne, nur bei `kind: "review"`. */
  rating?: number;
  /**
   * Zustand der Entscheidung über diese Aufgabe (`TaskDecision` serverseitig).
   *
   * Im Tagesbriefing steht hier immer "open" - erledigte Aufgaben werden gar nicht
   * erst ausgeliefert. "approved"/"dismissed" liefert nur die Antwort von
   * `briefing.approveTask`, damit die Karte den Erfolg zeigen kann, bevor das
   * nächste Briefing geladen ist. Optional, weil ältere Server das Feld nicht kennen.
   */
  state?: "open" | "approved" | "dismissed";
  /** Zeitpunkt der Freigabe/Verwerfung; fehlt, solange die Aufgabe offen ist. */
  decidedAt?: Iso8601;
}

export interface PresenceStats {
  /** Google-Sternebewertung, z. B. 4.6. 0 = noch keine Bewertung bekannt. */
  rating: number;
  /** Maitr-Präsenzscore 0-100. */
  score: number;
  /** Profilaufrufe im laufenden Zeitraum. */
  impressions: number;
  /** Anzahl der Bewertungen hinter `rating` (Google-Gesamtzahl, falls bekannt). */
  reviewCount?: number;
  /**
   * `false` = Profilaufrufe sind nicht gemessen (ohne Google-Freigabe gibt es
   * keine). Dann ist `impressions` 0 und die Oberfläche zeigt einen Strich statt
   * einer Null. Fehlt das Feld (älterer Server), gilt der Wert als gemessen.
   */
  impressionsKnown?: boolean;
  /** Worauf der Score beruht, z. B. "Beruht auf 3 von 5 Faktoren. …". */
  scoreHint?: string;
}

export interface DailyBriefing {
  venue: Venue;
  /** Serverzeit, damit Client und Betrieb dieselbe Tageslogik verwenden. */
  now: Iso8601;
  /** "morning" | "evening" steuert Hell-/Nachtbar-Darstellung. */
  daypart: "morning" | "day" | "evening";
  greeting: string;
  subline: string;
  stats: PresenceStats;
  tasks: DailyTask[];
}

export interface TableSlot {
  tableId: string;
  tableName: string;
  seats: number;
  reservations: Reservation[];
}

export interface Reservation {
  id: string;
  guestName: string;
  partySize: number;
  start: Iso8601;
  end: Iso8601;
  /**
   * `pending` = Anfrage, die der Betrieb noch bestätigen oder absagen muss (so kommt
   * jede Buchung aus der Web-App an). `no_show` = Gast nicht erschienen - früher auf
   * `cancelled` gefaltet, dann ließ sich eine Absage nicht von einem No-Show trennen.
   */
  status: "confirmed" | "pending" | "cancelled" | "walk_in" | "no_show";
  phone?: string;
  /** Nur in der Inhaber-Sicht: E-Mail des Gastes (Bestätigungs-Mails). */
  email?: string;
  /** Sonderwünsche aus dem Buchungsformular. */
  note?: string;
  /** Woher die Buchung kam: "website" (Web-App), "maitr" (App), "walk_in". */
  source?: string;
  /** Eingang der Buchung - für "neu seit" im Posteingang. */
  createdAt?: Iso8601;
}

export interface ServiceDay {
  date: string;
  serviceStartHour: number;
  serviceEndHour: number;
  bufferMinutes: number;
  seatsTotal: number;
  seatsReserved: number;
  tables: TableSlot[];
}
