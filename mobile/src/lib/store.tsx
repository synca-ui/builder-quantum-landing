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
import { AppState } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, isCoreConfigured } from "@maitr/core";

import { formatHour, type TimelineBooking, type TimelineTable } from "../components/ui/Timeline";
import { serviceDays as seedDays, type ServiceDayFixture } from "../features/reservations/fixtures";
import { hasRealAuth, mobileAuthAdapter, subscribeToRealAuthSession } from "./auth";

/**
 * Zentraler App-Zustand der Demo.
 *
 * Kein echtes Backend: alles lebt im Speicher und wird aus den Design-Fixtures
 * seed-befüllt. Aktionen (anmelden, reservieren, Kanal verbinden, Aufgabe freigeben)
 * verändern diesen Zustand, damit sich die App wie ein fertiges Produkt anfühlt und
 * die Screens sich gegenseitig beeinflussen - eine Gastbuchung taucht z. B. im
 * Betriebs-Screen auf.
 *
 * Sobald `@maitr/core` an echte Endpunkte hängt, ersetzt dessen Datenfluss diesen
 * Store Slice für Slice.
 */

/* ── Session ─────────────────────────────────────────────────────────────── */

export interface SessionUser {
  name: string;
  email: string;
  venueName: string;
  district: string;
  initials: string;
}

/* ── Betriebskennung ─────────────────────────────────────────────────────────
   Welcher Betrieb ist gemeint? Bis hierher stand die Antwort als Konstante im
   Start-Screen. Sie gehört in den Store, weil zwei Screens sie brauchen: der
   Onboarding-Bildschirm legt den Betrieb an, der Start-Screen lädt sein Briefing
   dafür.

   Der Vorgabewert bleibt die Demokennung. Ohne Backend und ohne Clerk-Schlüssel
   ist das die einzige Kennung, die es gibt - und sie muss die App vollständig
   bedienbar halten (die Fixtures in `features/start/fixtures.ts` sind darauf
   gemünzt). Erst wenn `GET /venues` einen echten Betrieb meldet, wird sie ersetzt. */
export const DEMO_VENUE_ID = "venue_goldstueck";

const DEMO_USER: SessionUser = {
  name: "Sofia Brandt",
  email: "sofia@cafe-goldstueck.de",
  venueName: "Café Goldstück",
  district: "Ehrenfeld",
  initials: "SB",
};

/* ── Reservierungen ──────────────────────────────────────────────────────── */

/** Ein Servicetag inklusive seiner (veränderbaren) Belegung. */
export interface ServiceDayState extends ServiceDayFixture {}

/** Gastbuchung, die zuletzt abgeschlossen wurde - speist die Bestätigung. */
export interface GuestBookingResult {
  weekday: string;
  dateLabel: string;
  time: string;
  partySize: number;
  guest: string;
}

/* ── Inbox ───────────────────────────────────────────────────────────────── */

export type InboxKind = "review" | "reservation" | "post" | "system";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  title: string;
  body: string;
  /** Kurze Zeitangabe, z. B. „Vor 2 Std". */
  time: string;
  /** Ziel beim Antippen - ein App-Pfad. */
  href: string;
}

/** Posteingang, seed-befüllt. Jedes Ereignis verweist auf den passenden Screen. */
const INBOX_SEED: InboxItem[] = [
  {
    id: "in_whatsapp",
    kind: "reservation",
    title: "WhatsApp-Anfrage automatisch beantwortet",
    body: "Maitr hat Öffnungszeiten geschickt & M. Weber für Do 19:00 gebucht.",
    time: "Vor 20 Min",
    href: "/concierge",
  },
  {
    id: "in_review",
    kind: "review",
    title: "Neue 5★-Bewertung von Marion",
    body: "„Bester Flat White in Ehrenfeld …\" - Antwort liegt bereit.",
    time: "Vor 2 Std",
    href: "/bewertungen",
  },
  {
    id: "in_reservation",
    kind: "reservation",
    title: "Neue Reservierung · M. Weber",
    body: "Mi 16. Juli · 19:00 · 2 Personen · Tel. hinterlegt.",
    time: "Vor 3 Std",
    href: "/tische",
  },
  {
    id: "in_post",
    kind: "post",
    title: "Beitrag-Vorschlag bereit",
    body: "„Zimtschnecken\" für Do 9:00 - deine stärkste Stunde.",
    time: "Heute, 8:00",
    href: "/beitraege",
  },
  {
    id: "in_score",
    kind: "system",
    title: "Präsenzscore steigt",
    body: "Speisekarte hinterlegen bringt +12 Punkte.",
    time: "Gestern",
    href: "/profil-check",
  },
];

/* ── Autopilot-Aktivität (handelnde Automatisierung) ─────────────────────────
   Der Beweis, dass Maitr nicht nur vorschlägt, sondern erledigt: jede vom Autopilot
   oder per Freigabe ausgeführte Handlung landet hier als nachvollziehbarer Beleg. */

export type ActivityKind = "review" | "winback" | "post" | "reservation";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  /** Was Maitr getan hat. */
  title: string;
  detail: string;
  /** Menschliche Zeit, z. B. "gerade" oder "gestern 8:12". */
  time: string;
  /** true = ohne tägliche Freigabe vom Autopilot erledigt. */
  auto: boolean;
}

const ACTIVITY_SEED: ActivityItem[] = [
  {
    id: "act_seed_wa",
    kind: "reservation",
    title: "Tisch über WhatsApp gebucht",
    detail: "M. Weber · Do 19:00 · Anfrage automatisch beantwortet.",
    time: "vor 20 Min",
    auto: true,
  },
  {
    id: "act_seed_review",
    kind: "review",
    title: "5★-Antwort veröffentlicht",
    detail: "Auf Tobias R. bei Google geantwortet.",
    time: "gestern 8:12",
    auto: true,
  },
  {
    id: "act_seed_post",
    kind: "post",
    title: "Beitrag „Wochenend-Brunch\" geplant",
    detail: "Instagram + Google · Sa 10:30.",
    time: "vorgestern",
    auto: true,
  },
];

/** Autopilot-Kategorien: wenn an, erledigt Maitr diese Aufgaben ohne Freigabe. */
export type AutopilotCategory = "reviews" | "winback" | "posts";

/** Abo-Stufe. Die Auswahl ändert echten Zustand (kein toter Toast). */
export type PlanId = "start" | "pro" | "autopilot";

/* ── Beiträge ────────────────────────────────────────────────────────────── */

export type PostState = "live" | "suggestion" | "scheduled" | "published";
export type MediaTone = "warm" | "honey" | "cool";

export interface Post {
  id: string;
  state: PostState;
  title: string;
  /** Kanäle, auf denen der Beitrag läuft. */
  channels: string[];
  /** Menschlicher Slot-Text, z. B. "Do 9:00". */
  when: string;
  tone: MediaTone;
  /** Kennzahl (live) bzw. Begründung (Vorschlag). */
  note?: string;
}

const POSTS_SEED: Post[] = [
  {
    id: "p_live",
    state: "live",
    title: "Hausröstung „Ehrenfeld\" ist zurück",
    channels: ["Instagram", "Google"],
    when: "Mo 9:00",
    tone: "warm",
    note: "Live · 1.284 erreicht · 43 Profilbesuche",
  },
  {
    id: "p_suggestion",
    state: "suggestion",
    title: "Zimtschnecken, frisch um 8 aus dem Ofen. Wer zuerst kommt, riecht's zuerst.",
    channels: ["Instagram"],
    when: "Do 9:00",
    tone: "honey",
    note: "Do 9–11 Uhr: deine stärkste Stunde (+41 %)",
  },
  {
    id: "p_scheduled",
    state: "scheduled",
    title: "Wochenend Brunch ab 10 Uhr",
    channels: ["Instagram", "Google"],
    when: "Sa 10:30",
    tone: "warm",
  },
];

/** Zeit-Optionen für „Verschieben". */
export const POST_SLOTS = ["Do 9:00", "Do 17:00", "Fr 9:00", "Sa 10:30", "So 11:00"] as const;

/* ── Betriebsprofil (Google Business / Instagram) ────────────────────────── */

export interface OpeningHour {
  id: string;
  label: string;
  value: string;
  closed?: boolean;
}

export interface VenueProfile {
  name: string;
  tagline: string;
  /** Google-Business-Beschreibung. */
  bio: string;
  /** Instagram-Bio (kürzer). */
  instagramBio: string;
  street: string;
  city: string;
  tags: string[];
  hours: OpeningHour[];
}

const VENUE_PROFILE_SEED: VenueProfile = {
  name: "Café Goldstück",
  tagline: "Spezialitätenkaffee & hausgemachtes Gebäck",
  bio: "Kleines Spezialitätenkaffee in Köln-Ehrenfeld. Eigene Röstung, hausgemachtes Gebäck, Außenplätze und WLAN. Wir freuen uns auf dich.",
  instagramBio: "☕ Spezialitätenkaffee & Gebäck · Köln Ehrenfeld · Außenplätze · Reservierung ↓",
  street: "Körnerstr. 27",
  city: "50823 Köln",
  tags: ["Außenplätze", "Vegan", "WLAN", "Barrierefrei"],
  hours: [
    { id: "mo_fr", label: "Mo bis Fr", value: "8:00 – 18:00" },
    { id: "sa", label: "Samstag", value: "9:00 – 17:00" },
    { id: "so", label: "Sonntag", value: "Geschlossen", closed: true },
  ],
};

/* ── Wachstum: echte Zeitreihen je Kennzahl ──────────────────────────────── */

export interface GrowthMetric {
  key: string;
  label: string;
  /** Aktueller Monatswert, formatiert. */
  value: string;
  /** Veränderung zum Vormonat. */
  delta: string;
  trend: "up" | "flat";
  /** 6-Monats-Reihe (F M A M J J), relativ. */
  series: number[];
  /** Kurze Erklärung im Detail. */
  detail: string;
}

const GROWTH_METRICS: GrowthMetric[] = [
  {
    key: "aufrufe",
    label: "Aufrufe",
    value: "4.812",
    delta: "+18 % vs. Juni",
    trend: "up",
    series: [2710, 3120, 3480, 3890, 4180, 4812],
    detail: "Profilaufrufe bei Google & Instagram. Stärkster Tag: Samstag.",
  },
  {
    key: "bewertungen",
    label: "Bewertungen",
    value: "23",
    delta: "+5 vs. Juni",
    trend: "up",
    series: [11, 13, 15, 18, 18, 23],
    detail: "Neue Bewertungen im Monat. Schnitt 4,8 · Antwortquote 100 %.",
  },
  {
    key: "reservierungen",
    label: "Reservierungen",
    value: "61",
    delta: "+26 % vs. Juni",
    trend: "up",
    series: [38, 41, 44, 48, 52, 61],
    detail: "Provisionsfrei über Maitr. Kein Cent an Plattformen.",
  },
  {
    key: "routen",
    label: "Routen",
    value: "318",
    delta: "+11 % vs. Juni",
    trend: "up",
    series: [214, 236, 258, 274, 291, 318],
    detail: "Gäste, die sich zu dir navigieren ließen.",
  },
];

/* ── Gäste-CRM (der verteidigbare Kern) ──────────────────────────────────── */

export type GuestStatus = "stammgast" | "neu" | "inaktiv";

export interface Guest {
  id: string;
  name: string;
  phone: string;
  visits: number;
  /** Menschlich, z. B. "vor 3 Tagen" oder "vor 2 Monaten". */
  lastVisit: string;
  noShows: number;
  tags: string[];
  status: GuestStatus;
}

const GUESTS_SEED: Guest[] = [
  { id: "g_marion", name: "Marion K.", phone: "0170 55512 03", visits: 42, lastVisit: "vor 3 Tagen", noShows: 0, tags: ["Flat White", "Stammgast"], status: "stammgast" },
  { id: "g_weber", name: "M. Weber", phone: "0171 22218 40", visits: 8, lastVisit: "heute erwartet", noShows: 1, tags: ["Fenstertisch"], status: "stammgast" },
  { id: "g_yilmaz", name: "Fam. Yilmaz", phone: "0160 90087 11", visits: 5, lastVisit: "vor 1 Woche", noShows: 0, tags: ["Familie", "4 Pers"], status: "neu" },
  { id: "g_okafor", name: "S. Okafor", phone: "0152 33390 27", visits: 3, lastVisit: "vor 2 Wochen", noShows: 0, tags: [], status: "neu" },
  { id: "g_sommer", name: "K. Sommer", phone: "0176 44412 90", visits: 11, lastVisit: "vor 2 Monaten", noShows: 2, tags: ["Vegan"], status: "inaktiv" },
];

/* ── Speisekarte ─────────────────────────────────────────────────────────── */

export interface MenuItem {
  id: string;
  name: string;
  price: string;
  category: string;
}

const MENU_SEED: MenuItem[] = [];

/* ── Store-Form ──────────────────────────────────────────────────────────── */

interface StoreValue {
  // Session
  signedIn: boolean;
  user: SessionUser | null;
  signIn: () => void;
  /**
   * Abmelden räumt BEIDE Wahrheiten: den lokalen Zustand und - im echten
   * Anmeldebetrieb - die Clerk-Sitzung im SecureStore. Deshalb asynchron: Wer
   * danach navigiert, sollte abwarten, sonst startet der nächste Anmeldeversuch
   * gegen eine noch offene Sitzung.
   */
  signOut: () => Promise<void>;

  // Kanäle (Screen 11 + Journey 23): verbunden ja/nein je Plattform
  channels: Record<string, boolean>;
  connectChannel: (id: string) => void;
  setChannel: (id: string, connected: boolean) => void;

  // Profil-Check (Screen 10): erledigte Aufgaben, Score leitet sich daraus ab
  profileDone: Record<string, boolean>;
  toggleProfileItem: (id: string) => void;

  // Tagesbriefing (Screen 04): freigegebene Aufgaben verschwinden
  taskDone: Record<string, boolean>;
  completeTask: (id: string) => void;

  // Bewertungen (Screen 13): beantwortete Reviews
  reviewAnswered: Record<string, boolean>;
  answerReview: (id: string, author?: string) => void;

  // Beiträge (Screen 08): voller Lebenszyklus Vorschlag → eingeplant → veröffentlicht
  posts: Post[];
  schedulePost: (id: string) => void;
  reschedulePost: (id: string, when: string) => void;
  publishPost: (id: string) => void;
  updatePost: (id: string, patch: Partial<Pick<Post, "title" | "channels" | "when">>) => void;
  /** Foto/Sprach-first: aus Notiz + Stimmung einen eingeplanten Beitrag machen. */
  createQuickPost: (input: { note: string; tone: MediaTone; when: string; channels: string[] }) => void;

  /**
   * Kennung des aktuell bespielten Betriebs.
   *
   * `DEMO_VENUE_ID`, solange kein echter Betrieb bekannt ist - dann liefert die API
   * nichts Passendes und die Screens fallen auf ihre Fixtures zurück. Sobald
   * `GET /venues` oder `POST /venues` einen echten Betrieb meldet, steht hier dessen
   * Kennung, und `useDailyBriefing` lädt damit echte Daten.
   */
  venueId: string;
  /** true, sobald `venueId` von einem echten Betrieb stammt (nicht der Demokennung). */
  hasRealVenue: boolean;
  /**
   * Echten Betrieb übernehmen - aus `GET /venues` oder frisch angelegt. Setzt neben der
   * Kennung auch den Namen im Betriebsprofil, damit nicht die halbe App weiter
   * „Café Goldstück" zeigt, während der Server einen anderen Betrieb meint.
   */
  adoptVenue: (venue: { id: string; name?: string }) => void;

  // Betriebsprofil (Google Business / Instagram)
  venueProfile: VenueProfile;
  updateVenueProfile: (patch: Partial<VenueProfile>) => void;
  updateHour: (id: string, value: string, closed?: boolean) => void;

  // Wachstum: Kennzahlen mit Zeitreihen
  growthMetrics: GrowthMetric[];

  // Kanal-Metadaten (verbundenes Konto, Zeitpunkt) für die Verbinden-Seite
  channelMeta: Record<string, { account: string; since: string }>;
  connectChannelAs: (id: string, account: string) => void;
  disconnectChannel: (id: string) => void;

  // Inbox
  inbox: InboxItem[];
  inboxRead: Record<string, boolean>;
  unreadCount: number;
  markInboxRead: (id: string) => void;
  markAllInboxRead: () => void;

  // Reservierungen (Screens 02-07)
  days: ServiceDayState[];
  addReservation: (input: {
    dayId: string;
    guest: string;
    partySize: number;
    from: number;
    to?: number;
    phone?: string;
  }) => void;
  toggleTableBlock: (dayId: string, tableId: string) => void;
  /** No-Show erfassen: Tisch freigeben, Gäste-Graph lernt, Aktivität belegt. */
  markReservationNoShow: (dayId: string, guestName: string) => void;
  lastBooking: GuestBookingResult | null;
  setLastBooking: (booking: GuestBookingResult) => void;

  // Gäste-CRM
  guests: Guest[];
  reactivateGuest: (id: string, name?: string, auto?: boolean) => void;
  markNoShow: (id: string) => void;

  // Autopilot & Aktivität (handelnde Automatisierung)
  activityLog: ActivityItem[];
  logActivity: (item: Omit<ActivityItem, "id" | "time">) => void;
  autopilot: Record<AutopilotCategory, boolean>;
  setAutopilot: (category: AutopilotCategory, on: boolean) => void;

  // Abo-Stufe
  currentPlan: PlanId;
  setPlan: (plan: PlanId) => void;

  // Speisekarte
  menu: MenuItem[];
  addMenuItem: (item: Omit<MenuItem, "id">) => void;
  removeMenuItem: (id: string) => void;

  /**
   * Alles, was von diesem Betrieb auf dem Gerät liegt, entfernen - und den
   * Zustand auf den Punkt zurücksetzen, an dem eine frische Installation
   * startet. Gehört zur Kontolöschung (Screen „Konto löschen"): ohne das
   * blieben Gästenamen, Telefonnummern und Reservierungen im Gerätespeicher
   * stehen, obwohl das Konto weg ist.
   */
  deleteLocalData: () => Promise<void>;

  /** Erst nach dem Laden aus dem Speicher wird die App gerendert. */
  hydrated: boolean;
}

const StoreContext = createContext<StoreValue | null>(null);

/** Schlüssel des persistierten Schnappschusses. */
const PERSIST_KEY = "maitr.demo.state.v1";

/**
 * Wartezeit, bevor ein geänderter Zustand auf die Platte geht.
 *
 * Vorher schrieb jede einzelne Änderung sofort den kompletten Schnappschuss. Auf dem
 * Simulator gemessen: **ein Tastendruck = ein voller `AsyncStorage.setItem`** (vier
 * getippte Zeichen ergaben vier Schreibvorgänge à ~4,8 kB). „8:00 – 18:00" sind zwölf
 * Zeichen, also zwölf Plattenzugriffe, von denen elf im selben Moment veraltet sind.
 * 400 ms sind länger als der Abstand zwischen zwei Tastendrücken und kurz genug, dass
 * niemand die Verzögerung bemerkt - und weil beim Wegtauchen der App sofort geschrieben
 * wird (siehe `flushSnapshot`), geht dabei nichts verloren.
 */
const PERSIST_DEBOUNCE_MS = 400;

/**
 * Wie viele Einträge die Chronik behält.
 *
 * `activityLog` wuchs unbegrenzt - und zwar in zwei Richtungen: Der Schnappschuss auf
 * der Platte wurde mit jeder automatischen Aktion größer, und `AutopilotScreen`
 * rendert die Liste ungekürzt und unvirtualisiert (`AutopilotScreen.tsx:80`). Ein
 * Deckel begrenzt beides. 50 Einträge sind mehr, als „Zuletzt erledigt" je zeigen
 * soll, und weniger, als irgendein Gerät spürt.
 */
const ACTIVITY_LIMIT = 50;

/**
 * Wie lange wir im Clerk-Betrieb höchstens auf die Sitzungsmeldung warten.
 *
 * Ein Kaltstart mit Netz meldet lange davor; der Wert ist die Obergrenze für den
 * Fehlerfall - lieber ein paar Sekunden ruhige Fläche als eine App, die ohne Netz gar
 * nicht mehr aus dem Startbild kommt.
 *
 * Früher deckte die Eröffnungsanimation den Großteil dieser Zeit ab. Seit sie auf
 * 760 ms gekürzt ist (`OpeningAnimation`: HOLD 520 + FADE_OUT 240), deckt sie nur noch
 * den Anfang - im Fehlerfall sieht man danach die ruhige Fläche. Das ist der ehrlichere
 * Zustand: Es wird wirklich gewartet, und nur im Fehlerfall lange.
 */
const SESSION_TIMEOUT_MS = 4000;

/* ── Startzustand ─────────────────────────────────────────────────────────────
   Die Anfangswerte stehen als Konstanten hier statt inline im useState, weil sie
   an zwei Stellen gebraucht werden: beim ersten Start und in `deleteLocalData()`.
   Nach einer Kontolöschung muss das Gerät exakt dort stehen, wo eine frische
   Installation steht - nicht irgendwo dazwischen. */
const CHANNELS_SEED: Record<string, boolean> = {
  google: true,
  instagram: true,
  yelp: false,
  thefork: false,
  facebook: false,
};
const PROFILE_DONE_SEED: Record<string, boolean> = { photos: true };
const REVIEW_ANSWERED_SEED: Record<string, boolean> = { rev_tobias: true };
const CHANNEL_META_SEED: Record<string, { account: string; since: string }> = {
  google: { account: "Sofia Brandt · Inhaberin", since: "verbunden vor 4 Min" },
  instagram: { account: "@cafegoldstueck", since: "verbunden vor 12 Min" },
};
const AUTOPILOT_SEED: Record<AutopilotCategory, boolean> = {
  reviews: false,
  winback: false,
  posts: false,
};
const PLAN_SEED: PlanId = "pro";

/** Tiefe Kopie der Seed-Tage, damit der Reset-Zustand nie mutiert wird. */
function seedServiceDays(): ServiceDayState[] {
  return seedDays.map((day) => ({
    ...day,
    tables: day.tables.map((table) => ({
      ...table,
      bookings: table.bookings.map((booking) => ({ ...booking })),
    })),
  }));
}

/** Überschneiden sich zwei Zeitfenster? (Ende exklusiv, damit 20–22 an 18–20 anschließt.) */
function overlaps(from: number, to: number, b: TimelineBooking): boolean {
  return !(to <= b.from || from >= b.to);
}

/** Ist der Tisch im Fenster frei? Gesperrte Tische zählen nie als frei. */
function isFree(table: TimelineTable, from: number, to: number): boolean {
  return !table.blockedReason && table.bookings.every((b) => !overlaps(from, to, b));
}

/**
 * Kollisionsfreie IDs. `Date.now()` allein kollidiert bei mehreren Aufrufen in
 * derselben Millisekunde, ein reiner Zähler kollidiert nach einem Reload mit
 * persistierten IDs. Die Kombination aus sitzungseindeutiger Zeitbasis + Zähler
 * ist über Aufrufe UND Reloads hinweg eindeutig.
 */
let idCounter = 0;
function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [signedIn, setSignedIn] = useState(false);
  const [channels, setChannels] = useState<Record<string, boolean>>(CHANNELS_SEED);
  const [profileDone, setProfileDone] = useState<Record<string, boolean>>(PROFILE_DONE_SEED);
  const [taskDone, setTaskDone] = useState<Record<string, boolean>>({});
  const [reviewAnswered, setReviewAnswered] =
    useState<Record<string, boolean>>(REVIEW_ANSWERED_SEED);
  const [posts, setPosts] = useState<Post[]>(POSTS_SEED);
  const [venueId, setVenueId] = useState<string>(DEMO_VENUE_ID);
  const [venueProfile, setVenueProfile] = useState<VenueProfile>(VENUE_PROFILE_SEED);
  const [channelMeta, setChannelMeta] =
    useState<Record<string, { account: string; since: string }>>(CHANNEL_META_SEED);
  const [days, setDays] = useState<ServiceDayState[]>(seedServiceDays);
  const [lastBooking, setLastBookingState] = useState<GuestBookingResult | null>(null);
  const [inboxRead, setInboxRead] = useState<Record<string, boolean>>({});
  const [guests, setGuests] = useState<Guest[]>(GUESTS_SEED);
  const [menu, setMenu] = useState<MenuItem[]>(MENU_SEED);
  const [activityLog, setActivityLog] = useState<ActivityItem[]>(ACTIVITY_SEED);
  const [autopilot, setAutopilotState] =
    useState<Record<AutopilotCategory, boolean>>(AUTOPILOT_SEED);
  const [currentPlan, setCurrentPlan] = useState<PlanId>(PLAN_SEED);
  const [storageHydrated, setStorageHydrated] = useState(false);
  /**
   * Steht die Anmeldelage fest?
   *
   * Im Demomodus sofort: dort entscheidet allein der persistierte Merker. Im
   * Clerk-Betrieb erst, wenn Clerk seine Sitzung gemeldet hat - vorher wüssten wir
   * nicht, ob wir den Login oder den Start zeigen müssen, und `app/index.tsx`
   * entscheidet diese Weiche genau einmal.
   */
  const [sessionKnown, setSessionKnown] = useState(() => !hasRealAuth());

  const setPlan = useCallback((plan: PlanId) => setCurrentPlan(plan), []);

  const logActivity = useCallback((item: Omit<ActivityItem, "id" | "time">) => {
    // Gedeckelt: siehe ACTIVITY_LIMIT. Neueste zuerst, der Rest fällt hinten raus.
    setActivityLog((list) =>
      [{ ...item, id: uid("act"), time: "gerade" }, ...list].slice(0, ACTIVITY_LIMIT),
    );
  }, []);
  const setAutopilot = useCallback(
    (category: AutopilotCategory, on: boolean) =>
      setAutopilotState((a) => ({ ...a, [category]: on })),
    [],
  );

  const markInboxRead = useCallback(
    (id: string) => setInboxRead((r) => ({ ...r, [id]: true })),
    [],
  );
  const markAllInboxRead = useCallback(
    () => setInboxRead(Object.fromEntries(INBOX_SEED.map((i) => [i.id, true]))),
    [],
  );
  const unreadCount = INBOX_SEED.filter((i) => !inboxRead[i.id]).length;

  const signIn = useCallback(() => setSignedIn(true), []);

  /**
   * Abmelden - und zwar vollständig.
   *
   * Vorher setzte das hier nur `signedIn` auf false. Im Clerk-Betrieb blieb die
   * Sitzung damit im SecureStore gültig: Die App zeigte den Login, aber
   * `mobileAuthAdapter.getToken()` lieferte weiter ein Bearer-Token, und ein
   * erneutes „Weiter mit Google" startete den SSO-Flow gegen eine noch aktive
   * Sitzung. Der eigentliche Abmeldevorgang liegt in `lib/auth.ts` (dort kennt man
   * Clerk), hier wird er nur mit dem lokalen Zustand zusammengeführt.
   *
   * Reihenfolge mit Absicht: erst der lokale Merker, damit die Oberfläche sofort
   * umschaltet, dann der Netz-/Speicher-Teil. Im Demomodus räumt der Adapter nur
   * die beiden AsyncStorage-Schlüssel - Clerk wird dort nicht angefasst.
   */
  const signOut = useCallback(async () => {
    setSignedIn(false);
    // Ohne Sitzung gibt es keinen eigenen Betrieb mehr. Bliebe die echte Kennung
    // stehen, lüde der nächste Anmelder für einen Wimpernschlag das Briefing eines
    // fremden Betriebs - bis die eigene Abfrage antwortet.
    setVenueId(DEMO_VENUE_ID);
    await mobileAuthAdapter.signOut();
  }, []);

  const connectChannel = useCallback(
    (id: string) => setChannels((c) => ({ ...c, [id]: true })),
    [],
  );
  const setChannel = useCallback(
    (id: string, connected: boolean) => setChannels((c) => ({ ...c, [id]: connected })),
    [],
  );

  const toggleProfileItem = useCallback(
    (id: string) => setProfileDone((p) => ({ ...p, [id]: !p[id] })),
    [],
  );
  const completeTask = useCallback(
    (id: string) => setTaskDone((t) => ({ ...t, [id]: true })),
    [],
  );
  const answerReview = useCallback(
    (id: string, author?: string) => {
      setReviewAnswered((r) => ({ ...r, [id]: true }));
      logActivity({
        kind: "review",
        title: "Bewertungsantwort veröffentlicht",
        detail: author ? `Auf ${author} bei Google geantwortet.` : "Antwort bei Google veröffentlicht.",
        auto: false,
      });
    },
    [logActivity],
  );
  const patchPost = useCallback(
    (id: string, patch: Partial<Post>) =>
      setPosts((list) => list.map((p) => (p.id === id ? { ...p, ...patch } : p))),
    [],
  );
  const schedulePost = useCallback(
    (id: string) => patchPost(id, { state: "scheduled" }),
    [patchPost],
  );
  const reschedulePost = useCallback(
    (id: string, when: string) => patchPost(id, { when, state: "scheduled" }),
    [patchPost],
  );
  const publishPost = useCallback(
    (id: string) => patchPost(id, { state: "live", note: "Live · gerade veröffentlicht" }),
    [patchPost],
  );
  const updatePost = useCallback<StoreValue["updatePost"]>(
    (id, patch) => patchPost(id, patch),
    [patchPost],
  );
  const createQuickPost = useCallback<StoreValue["createQuickPost"]>(
    (input) => {
      // Foto/Sprach-first: aus ein paar Worten wird ein eingeplanter Beitrag zur
      // stärksten Stunde. Marketing als Geste, nicht als Aufgabe.
      setPosts((list) => [
        {
          id: uid("p_quick"),
          state: "scheduled",
          title: input.note,
          channels: input.channels,
          when: input.when,
          tone: input.tone,
          note: "Von dir · schnell gepostet",
        },
        ...list,
      ]);
      logActivity({
        kind: "post",
        title: "Beitrag geplant",
        detail: `„${input.note.slice(0, 40)}${input.note.length > 40 ? "…" : ""}" · ${input.when} · ${input.channels.join(" + ")}`,
        auto: false,
      });
    },
    [logActivity],
  );

  const updateVenueProfile = useCallback(
    (patch: Partial<VenueProfile>) => setVenueProfile((v) => ({ ...v, ...patch })),
    [],
  );
  const updateHour = useCallback(
    (id: string, value: string, closed?: boolean) =>
      setVenueProfile((v) => ({
        ...v,
        hours: v.hours.map((h) => (h.id === id ? { ...h, value, closed } : h)),
      })),
    [],
  );

  const adoptVenue = useCallback<StoreValue["adoptVenue"]>((venue) => {
    if (!venue?.id) return;
    setVenueId(venue.id);
    // Nur überschreiben, wenn der Server wirklich einen Namen mitschickt - ein leerer
    // Name würde sonst die Kopfzeile des Start-Screens leeren.
    const name = venue.name;
    if (name) setVenueProfile((v) => (v.name === name ? v : { ...v, name }));
  }, []);

  /* ── Welcher Betrieb gehört zu dieser Anmeldung? ────────────────────────────
     Genau eine Stelle fragt das, und sie fragt es nur, wenn es etwas zu fragen gibt.

     Drei Bedingungen, alle drei nötig:
     - `signedIn`: ohne Sitzung antwortet `GET /venues` mit 401.
     - `hasRealAuth()`: ohne Clerk-Schlüssel gibt es überhaupt kein Konto, an dem ein
       Betrieb hängen könnte. Der Demo-Token aus dem AsyncStorage taugt dem Server
       nicht - der Aufruf könnte nur scheitern.
     - `isCoreConfigured()`: sonst wirft `getCoreConfig()` in `http.ts`.

     Im Demomodus passiert hier deshalb NICHTS: kein `fetch`, keine Clerk-Berührung,
     `venueId` bleibt `DEMO_VENUE_ID`, und die App startet wie bisher. */
  useEffect(() => {
    if (!signedIn || !hasRealAuth() || !isCoreConfigured()) return;

    let alive = true;
    api.venues
      .mine()
      .then((list) => {
        if (!alive) return;
        // Form prüfen, nicht nur den Erfolg (dieselbe Lehre wie in `useDailyBriefing`):
        // Ein HTTP 200 von einem fremden Dienst ist ebenfalls ein Erfolg.
        const first = Array.isArray(list) ? list[0] : undefined;
        if (first?.id) adoptVenue(first);
      })
      .catch(() => {
        // Kein Netz, 401, noch kein Betrieb: die Demokennung bleibt stehen. Der
        // Start-Screen zeigt dann seine Fixture samt „API nicht verbunden" - das ist
        // der ehrliche Zustand, kein Absturz.
      });

    return () => {
      alive = false;
    };
  }, [signedIn, adoptVenue]);

  const connectChannelAs = useCallback(
    (id: string, account: string) => {
      setChannels((c) => ({ ...c, [id]: true }));
      setChannelMeta((m) => ({ ...m, [id]: { account, since: "gerade verbunden" } }));
    },
    [],
  );
  const disconnectChannel = useCallback((id: string) => {
    setChannels((c) => ({ ...c, [id]: false }));
    setChannelMeta((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
  }, []);

  const addReservation = useCallback<StoreValue["addReservation"]>(
    ({ dayId, guest, partySize, from, to, phone }) => {
      const duration = (to ?? from + 2) - from;

      // Gast ins CRM aufnehmen bzw. Besuch hochzählen - der USP-Kern: die
      // Gästebeziehung gehört dem Betrieb, jede Buchung reichert sie an.
      if (guest && guest !== "Walk in") {
        setGuests((list) => {
          const existing = list.find((g) => g.name === guest);
          if (existing) {
            return list.map((g) =>
              g.id === existing.id
                ? { ...g, visits: g.visits + 1, lastVisit: "gerade reserviert" }
                : g,
            );
          }
          return [
            {
              id: uid("g"),
              name: guest,
              phone: phone ?? "—",
              visits: 1,
              lastVisit: "gerade reserviert",
              noShows: 0,
              tags: ["Neu"],
              status: "neu" as GuestStatus,
            },
            ...list,
          ];
        });
      }

      setDays((current) =>
        current.map((day) => {
          if (day.id !== dayId) return day;

          // Einen kollisionsfreien Platz finden: erst zum Wunschtermin, sonst den
          // frühesten freien Slot im Servicefenster durchsuchen. So legt sich keine
          // Buchung sichtbar über eine andere.
          const pick = (start: number) =>
            day.tables.find((t) => isFree(t, start, start + duration) && t.seats >= partySize) ??
            day.tables.find((t) => isFree(t, start, start + duration));

          let start = from;
          let target = pick(start);

          if (!target) {
            for (let s = day.serviceFrom; s + duration <= day.serviceTo; s += 0.5) {
              const found = pick(s);
              if (found) {
                start = s;
                target = found;
                break;
              }
            }
          }

          // Wirklich alles belegt: an den Wunschtisch hängen (seltener Randfall).
          target = target ?? day.tables[0];

          const booking: TimelineBooking = {
            id: `res_${day.id}_${target.id}_${start}_${day.tables.length}`,
            guest,
            partySize,
            from: start,
            to: start + duration,
          };

          const tables = day.tables.map((t) =>
            t.id === target!.id ? { ...t, bookings: [...t.bookings, booking] } : t,
          );

          // „Plätze" zählt im Design belegte Tische, nicht Personen - je Buchung +1,
          // gedeckelt auf die Gesamtzahl. So bleibt es bei „4 von 8", nie „12 von 8".
          const seatsReserved = Math.min(day.seatsTotal, day.seatsReserved + 1);
          const state: ServiceDayState["state"] =
            seatsReserved >= day.seatsTotal ? "full" : "partial";

          return { ...day, tables, seatsReserved, state };
        }),
      );
    },
    [],
  );

  const toggleTableBlock = useCallback((dayId: string, tableId: string) => {
    setDays((current) =>
      current.map((day) => {
        if (day.id !== dayId) return day;
        const tables = day.tables.map((t) =>
          t.id === tableId
            ? {
                ...t,
                blockedReason: t.blockedReason ? undefined : "Manuell gesperrt",
                // Beim Sperren die Buchungen des Tisches entfernen; Entsperren lässt ihn leer.
                bookings: [],
              }
            : t,
        );
        return { ...day, tables };
      }),
    );
  }, []);

  const setLastBooking = useCallback(
    (booking: GuestBookingResult) => setLastBookingState(booking),
    [],
  );

  const reactivateGuest = useCallback(
    (id: string, name?: string, auto = false) => {
      setGuests((list) =>
        list.map((g) =>
          g.id === id ? { ...g, status: "neu", lastVisit: "Rückholung gesendet" } : g,
        ),
      );
      // Handelnde Automatisierung: es passiert wirklich etwas - eine belegte Nachricht.
      // `auto` unterscheidet vom Autopilot erledigte von per Freigabe ausgelösten.
      if (name) {
        logActivity({
          kind: "winback",
          title: auto ? `Autopilot: ${name} zurückgeholt` : `Rückhol-Nachricht an ${name} gesendet`,
          detail: "Per WhatsApp · freundliche Einladung zurück ins Café.",
          auto,
        });
      }
    },
    [logActivity],
  );

  const markNoShow = useCallback((id: string) => {
    setGuests((list) => list.map((g) => (g.id === id ? { ...g, noShows: g.noShows + 1 } : g)));
  }, []);

  const markReservationNoShow = useCallback(
    (dayId: string, guestName: string) => {
      const day = days.find((d) => d.id === dayId);
      const table = day?.tables.find((t) => t.bookings.some((b) => b.guest === guestName));
      const booking = table?.bookings.find((b) => b.guest === guestName);
      if (!day || !table || !booking) return;

      // Der autonome Kern: Tisch wird nicht nur frei, Maitr besetzt ihn sofort aus dem
      // eigenen Gäste-Graph nach. Bevorzugt ein inaktiver Stammgast (Rückholung), sonst
      // ein Stammgast, der heute noch nicht gebucht ist. So verfällt der Slot nie.
      const bookedToday = new Set(day.tables.flatMap((t) => t.bookings.map((b) => b.guest)));
      const refill =
        guests.find((g) => g.status === "inaktiv" && !bookedToday.has(g.name)) ??
        guests.find(
          (g) => g.status === "stammgast" && g.name !== guestName && !bookedToday.has(g.name),
        );
      const rescued = Math.round(booking.partySize * 9); // Ø-Umsatz je Gedeck ≈ 9 €

      setDays((current) =>
        current.map((d) => {
          if (d.id !== dayId) return d;
          const tables = d.tables.map((t) => {
            if (t.id !== table.id) return t;
            const without = t.bookings.filter((b) => b.guest !== guestName);
            const refilled = refill
              ? [
                  ...without,
                  {
                    id: uid("res"),
                    guest: refill.name,
                    partySize: booking.partySize,
                    from: booking.from,
                    to: booking.to,
                  },
                ]
              : without;
            return { ...t, bookings: refilled };
          });
          const next = tables.flatMap((t) => t.bookings).sort((a, b) => a.from - b.from)[0];
          return {
            ...d,
            tables,
            // Nachbesetzt → Platzzahl bleibt; ohne Nachrücker sinkt sie.
            seatsReserved: refill ? d.seatsReserved : Math.max(0, d.seatsReserved - 1),
            state: "partial" as const,
            nextArrival: next
              ? {
                  guest: next.guest,
                  time: formatHour(next.from),
                  meta: refill && next.guest === refill.name ? "Nachbesetzt · Maitr" : "Bestätigt",
                }
              : undefined,
          };
        }),
      );

      // Graph lernt: No-Show-Quote hoch beim Ausfall; der Nachrücker wird reaktiviert.
      setGuests((list) =>
        list.map((g) => {
          if (g.name === guestName) return { ...g, noShows: g.noShows + 1 };
          if (refill && g.id === refill.id)
            return { ...g, status: "neu" as GuestStatus, lastVisit: "gerade nachgerückt", visits: g.visits + 1 };
          return g;
        }),
      );

      logActivity({ kind: "reservation", title: `No-Show erfasst: ${guestName}`, detail: `${table.name} frei geworden.`, auto: true });
      if (refill) {
        logActivity({
          kind: "reservation",
          title: `Tisch nachbesetzt: ${refill.name}`,
          detail: `${table.name} sofort neu vergeben aus dem Gäste-Graph · +${rescued} € gerettet.`,
          auto: true,
        });
      }
    },
    [days, guests, logActivity],
  );

  const addMenuItem = useCallback((item: Omit<MenuItem, "id">) => {
    setMenu((list) => [...list, { ...item, id: uid("m") }]);
  }, []);
  const removeMenuItem = useCallback((id: string) => {
    setMenu((list) => list.filter((m) => m.id !== id));
  }, []);

  /** Zuletzt geänderter, noch nicht geschriebener Stand (roh, noch nicht serialisiert). */
  const pendingSnapshot = useRef<object | null>(null);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Kontolöschung, lokaler Teil: Zustand auf den Startpunkt, Schnappschuss weg.
   *
   * Beides ist nötig. Nur den Schlüssel zu löschen, reicht nicht: der
   * Persistenz-Effekt unten schreibt bei JEDER Zustandsänderung neu und hätte
   * den alten Zustand beim nächsten Tastendruck wieder im Speicher. Umgekehrt
   * reicht auch der Reset allein nicht - erst das Entfernen macht das Fenster
   * dazwischen leer. Dass der Effekt danach noch einmal schreibt, ist
   * unschädlich: Was er dann speichert, ist der Startzustand.
   *
   * Seit die Schreibvorgänge entprellt sind, kommt ein Schritt dazu: Ein bereits
   * vorgemerkter Stand von VOR der Löschung darf nicht 400 ms später doch noch auf
   * der Platte landen. Deshalb wird er hier verworfen, bevor irgendetwas anderes
   * passiert.
   */
  const deleteLocalData = useCallback(async () => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
    }
    pendingSnapshot.current = null;

    setSignedIn(false);
    setChannels(CHANNELS_SEED);
    setChannelMeta(CHANNEL_META_SEED);
    setProfileDone(PROFILE_DONE_SEED);
    setTaskDone({});
    setReviewAnswered(REVIEW_ANSWERED_SEED);
    setPosts(POSTS_SEED);
    setVenueId(DEMO_VENUE_ID);
    setVenueProfile(VENUE_PROFILE_SEED);
    setInboxRead({});
    setDays(seedServiceDays());
    setGuests(GUESTS_SEED);
    setMenu(MENU_SEED);
    setActivityLog(ACTIVITY_SEED);
    setAutopilotState(AUTOPILOT_SEED);
    setCurrentPlan(PLAN_SEED);
    setLastBookingState(null);

    await AsyncStorage.removeItem(PERSIST_KEY);
  }, []);

  /* ── Persistenz: hydrieren beim Start, Snapshot entprellt bei Änderungen ─── */

  const hydratedRef = useRef(false);

  /**
   * Den vorgemerkten Stand jetzt wirklich schreiben.
   *
   * Wird sowohl vom Zeitgeber gerufen (Ruhepause vorbei) als auch von Hand, wenn die
   * App wegtaucht. Ist nichts vorgemerkt, passiert nichts - der zweite Aufruf
   * hintereinander schreibt also nicht doppelt.
   */
  const flushSnapshot = useCallback(() => {
    if (writeTimer.current) {
      clearTimeout(writeTimer.current);
      writeTimer.current = null;
    }
    const state = pendingSnapshot.current;
    if (!state) return;
    pendingSnapshot.current = null;
    AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(state)).catch(() => {});
  }, []);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(PERSIST_KEY)
      .then((raw) => {
        if (!alive || !raw) return;
        const s = JSON.parse(raw);
        // Der persistierte Merker gilt NUR im Demomodus. Im Clerk-Betrieb ist die
        // Clerk-Sitzung die Wahrheit (siehe Effekt darunter); den Schnappschuss
        // trotzdem einzuspielen, würde ein Rennen zwischen zwei Quellen eröffnen -
        // je nachdem, wer zuerst antwortet, stünde die App angemeldet oder nicht.
        if (typeof s.signedIn === "boolean" && !hasRealAuth()) setSignedIn(s.signedIn);
        if (s.channels) setChannels(s.channels);
        if (s.channelMeta) setChannelMeta(s.channelMeta);
        if (s.profileDone) setProfileDone(s.profileDone);
        if (s.taskDone) setTaskDone(s.taskDone);
        if (s.reviewAnswered) setReviewAnswered(s.reviewAnswered);
        if (s.posts) setPosts(s.posts);
        // Die zuletzt bekannte Betriebskennung überlebt den Neustart, damit der
        // Start-Screen nicht erst eine Runde Fixture zeigt, bis `GET /venues`
        // antwortet. Der Netzabruf oben korrigiert sie, falls sie veraltet ist.
        //
        // Dieselbe Einschränkung wie beim `signedIn`-Merker zwei Zeilen darüber: Nur
        // im Clerk-Betrieb kann eine echte Kennung gültig sein. Fällt ein Bau auf den
        // Demomodus zurück (Schlüssel entfernt), bliebe sonst die Kennung eines
        // Betriebs stehen, den dieses Gerät gar nicht mehr abfragen darf.
        if (typeof s.venueId === "string" && s.venueId && hasRealAuth()) setVenueId(s.venueId);
        if (s.venueProfile) setVenueProfile(s.venueProfile);
        if (s.inboxRead) setInboxRead(s.inboxRead);
        if (s.days) setDays(s.days);
        if (s.guests) setGuests(s.guests);
        if (s.menu) setMenu(s.menu);
        // Auch beim Einlesen deckeln: Schnappschüsse aus der Zeit vor dem Limit
        // können beliebig lang sein.
        if (s.activityLog) setActivityLog(s.activityLog.slice(0, ACTIVITY_LIMIT));
        if (s.autopilot) setAutopilotState(s.autopilot);
        if (s.currentPlan) setCurrentPlan(s.currentPlan);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) {
          hydratedRef.current = true;
          setStorageHydrated(true);
        }
      });
    return () => {
      alive = false;
    };
  }, []);

  /* ── Clerk-Sitzung ⇄ lokaler Merker ──────────────────────────────────────────
     Im echten Anmeldebetrieb entscheidet allein Clerk, ob jemand angemeldet ist.
     Das Abo zieht beide Richtungen gerade: Neustart mit gültiger Sitzung meldet an,
     eine abgelaufene oder anderswo beendete Sitzung meldet ab.
     Im Demomodus liefert `subscribeToRealAuthSession()` einen No-Op zurück und rührt
     das Clerk-Paket nicht an - `hasRealAuth()` fragt hier nur, ob überhaupt gewartet
     werden muss. */
  useEffect(() => {
    if (!hasRealAuth()) return;

    // Notbremse: Ohne Netz (oder mit abgeschalteter Native API) lädt Clerk nicht und
    // meldet nie. Ohne diesen Zeitgeber bliebe die App im leeren Canvas stehen, denn
    // `hydrated` gibt das Routing frei. Nach Ablauf gilt „nicht angemeldet" - der
    // Login ist der einzige Screen, der ohne Sitzung ehrlich funktioniert.
    const notbremse = setTimeout(() => setSessionKnown(true), SESSION_TIMEOUT_MS);

    const unsubscribe = subscribeToRealAuthSession((signedInAtClerk) => {
      clearTimeout(notbremse);
      setSignedIn(signedInAtClerk);
      setSessionKnown(true);
    });

    return () => {
      clearTimeout(notbremse);
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Erst nach dem Hydrieren schreiben - sonst überschreiben die Defaults den Speicher.
    if (!hydratedRef.current) return;
    // Nur den Stand vormerken. Weder `JSON.stringify` noch der Plattenzugriff laufen
    // hier - beides erledigt `flushSnapshot` nach der Ruhepause. Die Objekte im Store
    // werden nie mutiert (jede Aktion legt neue an), das spätere Serialisieren sieht
    // also genau den Stand, der hier vorlag.
    pendingSnapshot.current = {
      signedIn,
      channels,
      channelMeta,
      profileDone,
      taskDone,
      reviewAnswered,
      posts,
      venueId,
      venueProfile,
      inboxRead,
      days,
      guests,
      menu,
      activityLog,
      autopilot,
      currentPlan,
    };
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = setTimeout(flushSnapshot, PERSIST_DEBOUNCE_MS);
  }, [
    flushSnapshot,
    signedIn,
    channels,
    channelMeta,
    profileDone,
    taskDone,
    reviewAnswered,
    posts,
    venueId,
    venueProfile,
    inboxRead,
    days,
    guests,
    menu,
    activityLog,
    autopilot,
    currentPlan,
  ]);

  /* ── Die Ruhepause darf nichts kosten ────────────────────────────────────────
     Entprellen heißt: Zwischen der letzten Änderung und dem Schreiben liegen bis zu
     400 ms, in denen der Stand nur im Speicher steht. Wandert die App in genau dieser
     Zeitspanne in den Hintergrund (oder wird sie beendet), wäre die letzte Eingabe
     weg. Deshalb schreibt der Zustandswechsel sofort - dasselbe Muster wie in
     `usePendingCommit`, wo eine offene Freigabe beim Wegtauchen ebenfalls sofort
     verbindlich wird. */
  useEffect(() => {
    const sub = AppState.addEventListener("change", (state) => {
      if (state !== "active") flushSnapshot();
    });
    return () => {
      sub.remove();
      flushSnapshot();
    };
  }, [flushSnapshot]);

  /* ── Speisekarte ist die einzige Wahrheit für ihre Aufgaben ─────────────────
     „Speisekarte hinterlegen" erscheint an zwei Stellen - im Profil-Check (Score,
     `profileDone.menu`) und im Tagesbriefing (Screen 04, `taskDone.task_profile_menu`).
     Beide meinen dieselbe reale Handlung. Statt sie beim Hinzufügen/Entfernen einzeln
     nachzuziehen (und Gefahr zu laufen, dass sie auseinanderlaufen), leiten wir beide
     Häkchen aus der Gerichtliste ab: mindestens ein Gericht ⟺ erledigt. */
  useEffect(() => {
    if (!hydratedRef.current) return;
    const hasMenu = menu.length > 0;
    setProfileDone((p) => (Boolean(p.menu) === hasMenu ? p : { ...p, menu: hasMenu }));
    setTaskDone((t) =>
      Boolean(t.task_profile_menu) === hasMenu ? t : { ...t, task_profile_menu: hasMenu },
    );
  }, [menu]);

  /**
   * Gerendert wird erst, wenn BEIDES feststeht: der gespeicherte Zustand und - im
   * Clerk-Betrieb - die Anmeldelage. `app/index.tsx` fällt seine Weiche
   * (Start oder Login) genau einmal; eine zu frühe Freigabe schickte einen
   * angemeldeten Nutzer auf den Login, von dem ihn nichts mehr wegholt.
   */
  const hydrated = storageHydrated && sessionKnown;

  const value = useMemo<StoreValue>(
    () => ({
      signedIn,
      user: signedIn ? DEMO_USER : null,
      signIn,
      signOut,
      channels,
      connectChannel,
      setChannel,
      profileDone,
      toggleProfileItem,
      taskDone,
      completeTask,
      reviewAnswered,
      answerReview,
      posts,
      schedulePost,
      reschedulePost,
      publishPost,
      updatePost,
      createQuickPost,
      venueId,
      hasRealVenue: venueId !== DEMO_VENUE_ID,
      adoptVenue,
      venueProfile,
      updateVenueProfile,
      updateHour,
      growthMetrics: GROWTH_METRICS,
      channelMeta,
      connectChannelAs,
      disconnectChannel,
      inbox: INBOX_SEED,
      inboxRead,
      unreadCount,
      markInboxRead,
      markAllInboxRead,
      days,
      addReservation,
      toggleTableBlock,
      markReservationNoShow,
      lastBooking,
      setLastBooking,
      guests,
      reactivateGuest,
      markNoShow,
      activityLog,
      logActivity,
      autopilot,
      setAutopilot,
      currentPlan,
      setPlan,
      menu,
      addMenuItem,
      removeMenuItem,
      deleteLocalData,
      hydrated,
    }),
    [
      signedIn,
      signIn,
      signOut,
      channels,
      connectChannel,
      setChannel,
      profileDone,
      toggleProfileItem,
      taskDone,
      completeTask,
      reviewAnswered,
      answerReview,
      posts,
      schedulePost,
      reschedulePost,
      publishPost,
      updatePost,
      createQuickPost,
      venueId,
      adoptVenue,
      venueProfile,
      updateVenueProfile,
      updateHour,
      channelMeta,
      connectChannelAs,
      disconnectChannel,
      inboxRead,
      unreadCount,
      markInboxRead,
      markAllInboxRead,
      days,
      addReservation,
      toggleTableBlock,
      markReservationNoShow,
      lastBooking,
      setLastBooking,
      guests,
      reactivateGuest,
      markNoShow,
      activityLog,
      logActivity,
      autopilot,
      setAutopilot,
      currentPlan,
      setPlan,
      menu,
      addMenuItem,
      removeMenuItem,
      deleteLocalData,
      hydrated,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore muss innerhalb von <AppStateProvider> stehen.");
  return store;
}

/** "18:30" → 18.5. Die Zeitschiene rechnet in Dezimalstunden. */
export function parseClock(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h + (m ?? 0) / 60;
}
