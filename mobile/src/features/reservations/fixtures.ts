import type { TimelineTable } from "../../components/ui/Timeline";

/**
 * Die drei Servicetage aus Screens 05-07. Sie liegen bewusst zusammen in einer Liste:
 * der Tische-Screen blättert mit den Pfeilen durch sie und zeigt so alle drei Zustände
 * desselben Screens - belegt, ausgebucht, leer.
 */
export interface ServiceDayFixture {
  id: string;
  /** Kopfzeilen-Pille, z. B. "MI 16. JULI". */
  label: string;
  serviceFrom: number;
  serviceTo: number;
  serviceLabel: string;
  seatsTotal: number;
  seatsReserved: number;
  bufferMinutes: number;
  tables: TimelineTable[];
  /** `full` und `empty` schalten die Sonderzustände frei. */
  state: "partial" | "full" | "empty";
  /** Nächste Ankunft, nur im Teilbelegungs-Zustand. */
  nextArrival?: { guest: string; time: string; meta: string };
  /** Hinweistext im ausgebuchten Zustand. */
  fullNotice?: string;
}

export const serviceDays: ServiceDayFixture[] = [
  {
    id: "day_wed",
    label: "Mi 16. Juli",
    serviceFrom: 18,
    serviceTo: 22,
    serviceLabel: "Service 18–22 Uhr",
    seatsTotal: 8,
    seatsReserved: 3,
    bufferMinutes: 15,
    state: "partial",
    nextArrival: {
      guest: "M. Weber",
      time: "19:00",
      meta: "Bestätigt · Tel. hinterlegt",
    },
    tables: [
      {
        id: "t1",
        name: "Tisch 1",
        seats: 2,
        bookings: [{ id: "b1", guest: "M. Weber", partySize: 2, from: 19, to: 21 }],
      },
      {
        id: "t2",
        name: "Tisch 2",
        seats: 4,
        bookings: [{ id: "b2", guest: "Fam. Yilmaz", partySize: 4, from: 18, to: 20 }],
      },
      {
        id: "t3",
        name: "Tisch 3",
        seats: 4,
        bookings: [{ id: "b3", guest: "S. Okafor", partySize: 4, from: 20, to: 22 }],
      },
    ],
  },
  {
    id: "day_sat",
    label: "Sa 19. Juli",
    serviceFrom: 18,
    serviceTo: 22,
    serviceLabel: "Service 18–22 Uhr",
    seatsTotal: 8,
    seatsReserved: 8,
    bufferMinutes: 0,
    state: "full",
    fullNotice:
      "Anfragen für Samstag laufen weiter. Gäste sehen automatisch den nächsten freien Tag (So, 20. Juli).",
    tables: [
      {
        id: "t1",
        name: "Tisch 1",
        seats: 2,
        bookings: [
          { id: "b4", guest: "K. Sommer", partySize: 2, from: 18, to: 20 },
          { id: "b5", guest: "M. Weber", partySize: 2, from: 20, to: 22 },
        ],
      },
      {
        id: "t2",
        name: "Tisch 2",
        seats: 4,
        bookings: [
          { id: "b6", guest: "Fam. Yilmaz", partySize: 4, from: 18, to: 20 },
          { id: "b7", guest: "S. Okafor", partySize: 4, from: 20, to: 22 },
        ],
      },
      {
        id: "t3",
        name: "Tisch 3",
        seats: 4,
        bookings: [],
        blockedReason: "Heute gesperrt · Stammtisch",
      },
    ],
  },
  {
    id: "day_tue",
    label: "Di 22. Juli",
    serviceFrom: 18,
    serviceTo: 22,
    serviceLabel: "Service 18–22 Uhr",
    seatsTotal: 8,
    seatsReserved: 0,
    bufferMinutes: 0,
    state: "empty",
    tables: [
      { id: "t1", name: "Tisch 1", seats: 2, bookings: [] },
      { id: "t2", name: "Tisch 2", seats: 4, bookings: [] },
      { id: "t3", name: "Tisch 3", seats: 4, bookings: [] },
    ],
  },
];

/** Gast-Buchungsstrecke (Screen 03). */
export const guestBooking = {
  venueName: "Café Goldstück",
  venueLocation: "Köln Ehrenfeld",
  days: [
    { key: "wed", weekday: "Mi", day: "16.", available: true },
    { key: "thu", weekday: "Do", day: "17.", available: true },
    { key: "fri", weekday: "Fr", day: "18.", available: true },
    { key: "sat", weekday: "Sa", day: "19.", available: false },
    { key: "sun", weekday: "So", day: "20.", available: true },
  ],
  partySizes: [1, 2, 3, 4, 5, 6],
  times: [
    { key: "18:00", available: true },
    { key: "18:30", available: true },
    { key: "19:00", available: false },
    { key: "19:30", available: false },
    { key: "20:00", available: true },
  ],
  guestName: "Marie Weber",
  guestPhone: "0170 …",
} as const;

/** Gast-Bestätigung (Screen 02). */
export const guestConfirmation = {
  guestFirstName: "Marie",
  when: "Mi, 16. Juli · 18:30",
  partySize: 2,
  where: "Körnerstr. 27",
  venueName: "Café Goldstück",
  smsNote:
    "Bestätigung per SMS an 0170 … · Kostenlos stornierbar bis 2 Std vorher · Link in der SMS.",
  /** Zweiter Block: Vorschlag, wenn der Wunschtag voll ist. */
  fullDaySuggestion: {
    state: "Zustand: Tag ausgebucht",
    headline: "Samstag sind wir voll, schön dass du kommen willst!",
    body: "Der nächste freie Abend für 2 Personen:",
    action: "Sonntag, 20. Juli · 19:00 wählen",
  },
} as const;
