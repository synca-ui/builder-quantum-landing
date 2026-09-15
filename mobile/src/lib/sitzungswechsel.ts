/**
 * Was vom Betriebszustand stehen bleiben darf, wenn die Sitzung wechselt - die
 * reine Entscheidung, ohne React.
 *
 * Anlass: Prüfer-Befunde vom 15.09. (Integrationsprüfung App, Nr. 22, 23, 24, 28).
 * Der Store hielt Speisekarte, Profil, Kanalstatus, Präsenz und erledigte Aufgaben
 * in EINEM Topf für alle Sitzungen - und räumte ihn nur an einer Stelle:
 *
 *  - `signOut` übersprang das Räumen, sobald es aus dem Showcase kam (die Referenz
 *    stand beim Aufruf noch auf „Showcase"). Ein vorgeführtes Gericht („m_…") blieb
 *    liegen und blockierte danach die Server-Speisekarte des echten Kontos (22).
 *  - Endete die Clerk-Sitzung ohne Abmelden-Knopf (Widerruf, „überall abmelden"),
 *    räumte niemand: Das nächste Konto sah Präsenz, Profil und Karte des alten (23).
 *  - `signOut` setzte die Kanäle auf den Seed „Google/Instagram verbunden · Sofia
 *    Brandt", ließ aber `kanaeleGeprueftFuer` stehen - beim Wiederanmelden desselben
 *    Kontos lieferte der Store genau diesen Seed aus, bis `GET /integrations`
 *    antwortete (24).
 *  - Der Showcase übernahm den gespeicherten Kanalstatus eines echten Betriebs
 *    („0 von 5 verbunden") statt seiner Vorführwerte (28).
 *
 * Die Entscheidung steht deshalb hier, einmal, für alle drei Wechsel - und der
 * Store setzt sie nur noch um. Getrennt von store.tsx, damit sie sich ohne
 * React-Native-Testaufbau prüfen lässt (sitzungswechsel.spec.ts), dieselbe
 * Aufteilung wie lib/praesenz.ts.
 *
 * Im reinen Demomodus (ohne Clerk-Schlüssel) ändert sich nichts gegenüber vorher:
 * Dort gibt es nur den Demo-Betrieb, und sein Zustand IST die Vorführung.
 */
import type { BetriebBekanntheit } from "../features/onboarding/ablauf";
import type { PraesenzEintrag } from "./praesenz";
import type {
  ActivityItem,
  AutopilotCategory,
  Guest,
  GuestBookingResult,
  MenuItem,
  PlanId,
  Post,
  ServiceDayState,
  VenueProfile,
} from "./store";

export type Kanalstatus = Record<string, boolean>;
export type Kanalkonten = Record<string, { account: string; since: string }>;

/** Zustand, der der Anmeldung gehört, die ihn geladen oder angelegt hat. */
export interface Betriebszustand {
  venueId: string;
  venueKnown: BetriebBekanntheit;
  praesenzEintrag: PraesenzEintrag | null;
  praesenzLaedt: boolean;
  kanaeleGeprueftFuer: string | null;
  lastBooking: GuestBookingResult | null;
  channels: Kanalstatus;
  channelMeta: Kanalkonten;
  menu: MenuItem[];
  venueProfile: VenueProfile;
  taskDone: Record<string, boolean>;
  profileDone: Record<string, boolean>;
  posts: Post[];
  inboxRead: Record<string, boolean>;
}

/**
 * Zustand, den nur die Vorführung anzeigt - den eine echte Sitzung aber trotzdem
 * verändern kann (die Gastbuchungs-Vorschau trägt in `days`/`guests` ein, ein
 * Schnellbeitrag schreibt in die Chronik).
 */
export interface Vorfuehrzustand {
  reviewAnswered: Record<string, boolean>;
  days: ServiceDayState[];
  guests: Guest[];
  activityLog: ActivityItem[];
  autopilot: Record<AutopilotCategory, boolean>;
  currentPlan: PlanId;
}

export type Gesamtzustand = Betriebszustand & Vorfuehrzustand;

/** Startzustand einer frischen Installation, plus der Kanalstatus „nichts geprüft". */
export interface Startwerte extends Gesamtzustand {
  keineKanaele: Kanalstatus;
}

export type Sitzungswechsel =
  /** Abmelden-Knopf (`signOut`) - aus einer echten Sitzung oder aus dem Showcase. */
  | "abmelden"
  /** Clerk meldet „keine Sitzung mehr", ohne dass `signOut` lief. */
  | "sitzung_beendet"
  /** Showcase-Knopf auf dem Login. */
  | "showcase_betreten";

export interface Lage {
  /** `hasRealAuth()`: Clerk-Schlüssel gesetzt. */
  echterAnmeldebetrieb: boolean;
  /** Läuft gerade der Showcase (vor dem Wechsel)? */
  showcase: boolean;
}

/**
 * Welche Teile des Zustands der Wechsel neu setzt. `null` heißt: nichts anfassen.
 * Was im Ergebnis fehlt, bleibt, wie es ist.
 */
export function zustandNachWechsel(
  wechsel: Sitzungswechsel,
  lage: Lage,
  start: Startwerte,
): Partial<Gesamtzustand> | null {
  // Betriebsbindung - galt schon vorher in jedem Modus beim Abmelden:
  // - Kennung: Bliebe die echte stehen, lüde der nächste Anmelder für einen
  //   Wimpernschlag das Briefing eines fremden Betriebs.
  // - Bekanntheit: Bliebe sie auf „bekannt", sähe die Einstiegsweiche einen
  //   bestätigten Betrieb, der nicht seiner ist. Der Anfangswert ist im Demomodus
  //   „bekannt" (der Demo-Betrieb bleibt die Wahrheit), sonst „unbekannt".
  // - Präsenz: Bewertungen und Score eines fremden Betriebs.
  // - Letzte Buchung: liegt nur im Arbeitsspeicher und trägt keinen Betrieb.
  const bindung: Partial<Gesamtzustand> = {
    venueId: start.venueId,
    venueKnown: start.venueKnown,
    praesenzEintrag: null,
    lastBooking: null,
  };

  if (!lage.echterAnmeldebetrieb) {
    // Demomodus: unverändert. Kein Clerk, also kein „Sitzung beendet", und der
    // Showcase-Knopf steht nur im Clerk-Login.
    return wechsel === "abmelden" ? bindung : null;
  }

  // Der Showcase ist die eine Anmeldung, über die Clerk nichts weiß - Clerks
  // „keine Sitzung" beendet ihn nicht (siehe das Abo im Store).
  if (wechsel === "sitzung_beendet" && lage.showcase) return null;

  if (wechsel === "showcase_betreten") {
    // Die Vorführung beginnt im kuratierten Startzustand (leere Speisekarte, Score
    // 64, Café Goldstück, Google und Instagram verbunden) - egal, was eine echte
    // Sitzung vorher auf dem Gerät hinterlassen hat. Auch der Kaltstart ohne
    // Clerk-Sitzung zählt: Der Schnappschuss kann den Kanalstatus, das Profil und
    // die Speisekarte eines echten Betriebs enthalten (Befund 28).
    const { keineKanaele: _nichtFuerDenShowcase, ...seed } = start;
    return seed;
  }

  // Eine Sitzung im echten Anmeldebetrieb endet - gleich, ob sie echt war oder
  // eine Vorführung: Nichts davon darf in die nächste Anmeldung wandern.
  return {
    ...bindung,
    // Ein abgebrochener Präsenzabruf setzt `praesenzLaedt` nicht mehr zurück
    // (siehe den Präsenz-Effekt im Store) - sonst hinge der Spinner.
    praesenzLaedt: false,
    // Ohne Zurücksetzen hielte der Store den Kanalstatus beim Wiederanmelden
    // desselben Kontos für schon geprüft (Befund 24).
    kanaeleGeprueftFuer: null,
    // „Nicht geprüft" statt Seed: Für einen echten Betrieb ist „Google verbunden ·
    // Sofia Brandt" eine Behauptung. Der Showcase setzt seine Vorführwerte beim
    // Betreten selbst.
    channels: start.keineKanaele,
    channelMeta: {},
    menu: start.menu,
    venueProfile: start.venueProfile,
    taskDone: start.taskDone,
    profileDone: start.profileDone,
    // Beitragsentwürfe („p_quick…") tragen keinen Betrieb, und die Gelesen-Merker
    // des echten Posteingangs heißen wie ihre Quelle („hebel_hours_diff").
    posts: start.posts,
    inboxRead: start.inboxRead,
  };
}

/** Je Zustandsteil der Setter, der ihn übernimmt - der Typ erzwingt Vollständigkeit. */
export type Setzer = { [K in keyof Gesamtzustand]: (wert: Gesamtzustand[K]) => void };

/**
 * Ergebnis von `zustandNachWechsel` in den Store schreiben. `null`-Werte (Präsenz,
 * letzte Buchung) werden gesetzt, nur fehlende Schlüssel bleiben unberührt.
 */
export function wendeZustandAn(zustand: Partial<Gesamtzustand> | null, setzer: Setzer): void {
  if (!zustand) return;
  for (const schluessel of Object.keys(zustand) as (keyof Gesamtzustand)[]) {
    const wert = zustand[schluessel];
    if (wert === undefined) continue;
    (setzer[schluessel] as (wert: unknown) => void)(wert);
  }
}

/** Stand der Kaltstartprüfung - siehe `kaltstartOhneSitzung`. */
export type Kaltstartschritt = "warten" | "raeumen" | "nichts";

export interface Kaltstartlage {
  /** `hasRealAuth()`: Clerk-Schlüssel gesetzt. */
  echterAnmeldebetrieb: boolean;
  /**
   * Clerks ERSTE Meldung in diesem App-Lauf: `true`/`false` für Sitzung ja/nein,
   * `null`, solange Clerk noch nicht gemeldet hat. Die Notbremse im Store (Clerk
   * lädt ohne Netz nicht) zählt NICHT als Meldung - „nicht angemeldet" heißt dort
   * nur „unbekannt", und eine womöglich noch gültige Sitzung darf ihren lokalen
   * Stand nicht verlieren.
   */
  ersteClerkMeldung: boolean | null;
  /** Hat der Store den Schnappschuss aus AsyncStorage schon eingespielt? */
  schnappschussEingelesen: boolean;
  /** Läuft die Vorführung (nach dem Einlesen: auch aus dem Schnappschuss)? */
  showcase: boolean;
}

/**
 * Muss der Kaltstart räumen, weil die Sitzung endete, während die App beendet war?
 *
 * Anlass: Nachprüfung zu Befund 23 (15.09.). Das Räumen bei „Sitzung beendet"
 * hängt im Clerk-Abo am Wechsel angemeldet → abgemeldet. Beim Kaltstart gibt es
 * diesen Wechsel nicht: `signedIn` beginnt im echten Anmeldebetrieb auf false (der
 * Schnappschuss setzt ihn dort nur im Showcase). Wurde die Sitzung von Konto A
 * widerrufen, während die App zu war („überall abmelden", Passwort-Reset), spielte
 * die Hydrierung Kennung, Profil, Speisekarte, Beiträge und Merker von A ein, Clerk
 * meldete „keine Sitzung", und niemand räumte. Meldete sich danach Konto B an,
 * sah B ohne Server-Karte A's Speisekarte samt Beitragsvorschlägen; ohne Betrieb
 * landeten Profil und Karte von A im neu angelegten Betrieb von B.
 *
 * Deshalb räumt Clerks erste Meldung „keine Sitzung" genauso wie der laufende
 * Wechsel - aber erst, wenn der Schnappschuss eingelesen ist. Vorher würde die
 * Hydrierung das Räumen wieder überschreiben, und ob ein eingelesener Showcase
 * läuft (den Clerk nicht beenden darf), stünde noch nicht fest. Ohne Schnappschuss
 * (frische Installation) ist das Räumen wirkungslos: Es setzt die Startwerte, die
 * ohnehin gelten.
 */
export function kaltstartOhneSitzung(lage: Kaltstartlage): Kaltstartschritt {
  // Demomodus: kein Clerk, der Demo-Betrieb IST die Vorführung.
  if (!lage.echterAnmeldebetrieb) return "nichts";
  if (lage.ersteClerkMeldung === null) return "warten";
  // Gültige Sitzung: Der Stand gehört ihr; endet sie später, räumt das Abo.
  if (lage.ersteClerkMeldung) return "nichts";
  if (!lage.schnappschussEingelesen) return "warten";
  if (lage.showcase) return "nichts";
  return "raeumen";
}
