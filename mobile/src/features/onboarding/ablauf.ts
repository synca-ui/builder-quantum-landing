import { ApiError, type OpeningHours, type Venue } from "@maitr/core";
// Eigener Unterpfad statt des Pakets oben: "@maitr/core"s öffentliche
// Oberfläche (packages/core/src/index.ts) reicht Typen aus ./types nur über
// `export type * from "./types"` durch - das ist zur Laufzeit vollständig
// entfernt, `DAYS` (ein WERT, keine Typdeklaration) käme darüber also nie an.
// `mobile/metro.config.js` löst `@maitr/core/<pfad>` gezielt auf
// (`moduleName.startsWith("@maitr/core/")`) - kein Sonderfall, das Muster
// benutzen `InsightsSection.tsx` und `lib/analytics.ts` schon für
// "@maitr/core/analytics".
import { DAYS, type Day } from "@maitr/core/types";

/**
 * Die Entscheidungen des neuen Onboardings - als reine Funktionen, ohne React.
 *
 * Derselbe Anlass wie bei `features/loyalty/aufbereitung.ts`: für React-Native-
 * Bildschirme gibt es in diesem Repo keinen Testaufbau (kein react-test-renderer,
 * kein jest-expo, das Wurzel-vitest läuft in jsdom). Was in einer Komponente steht,
 * ist damit ungeprüft. Alles, was hier eine Entscheidung ist - welcher Schritt
 * dran ist, ob Google wirklich verbunden ist, wohin die Einstiegsweiche schickt -
 * gehört deshalb hierher; die Bildschirme bleiben dünn und rufen nur auf.
 *
 * Der neue Ablauf ersetzt die alte, erfundene Journey (`features/journey/`) und
 * die halb echte Checkliste in `OnboardingScreen.tsx` - beide bleiben vorerst
 * stehen, das Umhängen ist ein eigener Schritt. Vier Bildschirmschritte:
 * Willkommen, Betrieb anlegen, Google verbinden, Zeiten - plus Abschluss.
 * „Willkommen" trägt hier keinen eigenen Zustand: er ruft keine API, kann nicht
 * scheitern und lässt sich nicht überspringen - er ist reine Vorstellung und
 * immer der erste Bildschirm. Die drei Schritte mit echten Entscheidungen sind
 * `betrieb`, `google`, `zeiten`.
 */

/* ── Zustand eines Schrittes und des ganzen Ablaufs ─────────────────────────── */

/** Reihenfolge der Schritte mit echtem Zustand - fix, weil der Ablauf sie auch ist. */
export const SCHRITT_REIHENFOLGE = ["betrieb", "google", "zeiten"] as const;
export type SchrittId = (typeof SCHRITT_REIHENFOLGE)[number];

export type SchrittStatus = "offen" | "laeuft" | "erledigt" | "uebersprungen" | "gescheitert";

export type AblaufZustand = Record<SchrittId, SchrittStatus>;

/** Zustand eines frischen Ablaufs - alle drei Schritte offen. */
export const ANFANGSZUSTAND: AblaufZustand = { betrieb: "offen", google: "offen", zeiten: "offen" };

/* ── Welcher Schritt ist der aktuelle? ───────────────────────────────────────
   Regel: der erste in `SCHRITT_REIHENFOLGE`, der weder erledigt noch
   übersprungen ist. „laeuft" und „gescheitert" bleiben aktuell - ein laufender
   Aufruf braucht keine zweite Aufforderung, ein gescheiterter braucht die
   Möglichkeit, es noch einmal zu versuchen. `null` heißt: alle drei stehen -
   dann ist der Abschluss dran, keiner der drei Schritte mehr. */
export function aktuellerSchritt(zustand: AblaufZustand): SchrittId | null {
  for (const id of SCHRITT_REIHENFOLGE) {
    const status = zustand[id];
    if (status !== "erledigt" && status !== "uebersprungen") return id;
  }
  return null;
}

export interface SchrittAnzeige {
  id: SchrittId;
  status: SchrittStatus;
  /**
   * Genau ein Eintrag der Liste trägt `true` - oder keiner, wenn alles erledigt
   * oder übersprungen ist. Zwei gleichzeitig wären zwei Aufforderungen zugleich
   * und damit keine Führung mehr; die Liste kann das strukturell nicht, weil sie
   * aus `aktuellerSchritt()` abgeleitet ist, das immer höchstens eine Kennung
   * zurückgibt.
   */
  aktuell: boolean;
}

/** Die drei Schritte in Anzeigereihenfolge, je mit ihrem Aktuell-Merker. */
export function schrittListe(zustand: AblaufZustand): SchrittAnzeige[] {
  const laufend = aktuellerSchritt(zustand);
  return SCHRITT_REIHENFOLGE.map((id) => ({ id, status: zustand[id], aktuell: id === laufend }));
}

/* ── Fortschritt für die Anzeige ──────────────────────────────────────────────
   „X von Y". Übersprungene Schritte zählen NICHT als erledigt - sonst meldete
   der Abschluss „fertig" über etwas, das niemand getan hat (Google z. B. nie
   verbunden, nur weggeklickt). */
export interface Fortschritt {
  erledigt: number;
  gesamt: number;
}

export function fortschritt(zustand: AblaufZustand): Fortschritt {
  const erledigt = SCHRITT_REIHENFOLGE.filter((id) => zustand[id] === "erledigt").length;
  return { erledigt, gesamt: SCHRITT_REIHENFOLGE.length };
}

/* ── Ist wirklich etwas da? (Google, Öffnungszeiten) ─────────────────────────
   Beide Fragen kommen aus Serverantworten, deren Form nicht garantiert ist -
   dieselbe Lehre wie in `store.tsx` und `OnboardingScreen.tsx`: ein HTTP 200
   von einem fremden Dienst ist auch ein Erfolg. Deshalb wird die Form geprüft,
   nicht nur vorausgesetzt. */
function istRecord(wert: unknown): wert is Record<string, unknown> {
  return typeof wert === "object" && wert !== null;
}

/**
 * Ist GOOGLE wirklich verbunden?
 *
 * NICHT schon bei bloßer Anwesenheit der Zeile - der Status zählt. Eine
 * Verbindung mit Status „EXPIRED" oder „REVOKED" ist NICHT verbunden; ein
 * Häkchen dafür wäre eine erfundene Angabe, die Bewertungen und Beiträge
 * verspricht, obwohl der Server keinen gültigen Token mehr hat.
 *
 * Nimmt `unknown` entgegen statt `IntegrationConnection[]`, weil der Aufrufer
 * die rohe Antwort von `api.integrations.list()` durchreichen können soll, ohne
 * sie vorher selbst zu prüfen - genau wie `istKartenZeile` in der Loyalty-
 * Aufbereitung.
 */
export function googleVerbunden(integrationen: unknown): boolean {
  if (!Array.isArray(integrationen)) return false;
  return integrationen.some(
    (eintrag) => istRecord(eintrag) && eintrag.provider === "GOOGLE" && eintrag.status === "ACTIVE",
  );
}

/** Wie viele Wochentage tragen einen Eintrag - geschlossen zählt mit, das ist auch eine Angabe. */
export function oeffnungszeitenTage(venue: Pick<Venue, "openingHours"> | null | undefined): number {
  if (!venue?.openingHours) return 0;
  return Object.keys(venue.openingHours).length;
}

/** Steht überhaupt etwas an Öffnungszeiten? */
export function hatOeffnungszeiten(venue: Pick<Venue, "openingHours"> | null | undefined): boolean {
  return oeffnungszeitenTage(venue) > 0;
}

/* ── Vorschlag für Öffnungszeiten ─────────────────────────────────────────────
   Nur ein VORSCHLAG zum Überschreiben, keine erkannte Angabe - es gibt keine
   Quelle, aus der Maitr die echten Zeiten eines neuen Betriebs kennen könnte.
   Der Bildschirm muss das dem Wirt genauso sagen, nicht nur dieser Kommentar.
   Mo-Fr 9-17 Uhr, Sa/So geschlossen: die häufigste Bürozeiten-Vorbelegung,
   leichter zu korrigieren als eine leere Liste. Form geprüft gegen
   `StrictOpeningHoursSchema` aus server/schemas/configuration.ts in
   ablauf.spec.ts - ein selbst gebauter Nachbau des Schemas bewiese nichts. */
export const OEFFNUNGSZEITEN_VORSCHLAG: OpeningHours = {
  monday: { closed: false, open: "09:00", close: "17:00" },
  tuesday: { closed: false, open: "09:00", close: "17:00" },
  wednesday: { closed: false, open: "09:00", close: "17:00" },
  thursday: { closed: false, open: "09:00", close: "17:00" },
  friday: { closed: false, open: "09:00", close: "17:00" },
  saturday: { closed: true },
  sunday: { closed: true },
};

/* ── Formular-Zustand für Öffnungszeiten (Schritt 4) ──────────────────────────
   Ein Wochentag im Formular trägt eine von DREI Aussagen, nicht zwei:
   „geoeffnet" (mit Uhrzeiten), „geschlossen" (ausdrücklich zu) oder
   „ohneAngabe" - der Wirt hat zu diesem Tag noch nichts gesagt, weder im
   bestehenden Bestand noch im Formular berührt. Das ist NICHT dasselbe wie
   „geschlossen": ein Betrieb ohne Angabe zu Sonntag hat damit nicht ausgesagt
   „sonntags zu" - dieselbe Unterscheidung, die `ablaufAusServerdaten` weiter
   unten für den Betriebsstatus zieht (kein bekannter Betrieb ≠ „der Betrieb
   ist geschlossen"). Vorher machte `entwurfAusZeiten` aus einem fehlenden Tag
   „geschlossen" mit Vorgabezeiten, und `zeitenAusEntwurf` schickte
   anschließend immer alle sieben Tage - eine reine Bestätigung ohne jede
   Änderung hätte damit für jeden bisher unbelegten Tag ein hartes
   `closed: true` in die Datenbank geschrieben. */
export type TagStand = "geoeffnet" | "geschlossen" | "ohneAngabe";

export interface TagEntwurf {
  stand: TagStand;
  /**
   * Vorbelegung für den Fall, dass der Wirt den Tag im Formular öffnet - bei
   * stand !== "geoeffnet" ohne Bedeutung für `zeitenAusEntwurf` (siehe dort),
   * nur damit das Formular keine leeren Felder zeigt, sobald umgeschaltet wird.
   */
  open: string;
  close: string;
}

export type ZeitenEntwurf = Record<Day, TagEntwurf>;

const ZEITEN_VORBELEGUNG = { open: "09:00", close: "17:00" } as const;

/**
 * Server-Öffnungszeiten (oder der Vorschlag oben) in bearbeitbaren
 * Formular-Zustand bringen - die Rückrichtung von `zeitenAusEntwurf`.
 *
 * Ein Tag ohne Eintrag in `quelle` (oder `quelle` fehlt ganz) wird
 * "ohneAngabe", NICHT "geschlossen" - Fachfehler, siehe oben. `quelle` kommt
 * entweder aus `venue.openingHours` (dort können echte Tage fehlen) oder aus
 * `OEFFNUNGSZEITEN_VORSCHLAG` (der alle sieben Tage führt - "ohneAngabe" kommt
 * über diesen Weg also nie vor).
 */
export function entwurfAusZeiten(quelle: OpeningHours | undefined): ZeitenEntwurf {
  const entwurf = {} as ZeitenEntwurf;
  for (const tag of DAYS) {
    const eintrag = quelle?.[tag];
    if (!eintrag) {
      entwurf[tag] = { stand: "ohneAngabe", ...ZEITEN_VORBELEGUNG };
    } else if (eintrag.closed) {
      entwurf[tag] = { stand: "geschlossen", ...ZEITEN_VORBELEGUNG };
    } else {
      entwurf[tag] = { stand: "geoeffnet", open: eintrag.open, close: eintrag.close };
    }
  }
  return entwurf;
}

/**
 * Dieselbe Uhrzeitregel wie `strictOpeningTimeSchema` in
 * server/schemas/configuration.ts (Stunde 00-23, Minute 00-59, führende Null
 * nötig) - hier eigenständig nachgebildet statt importiert: Dieses Modul wird
 * in die App gebündelt, und `mobile/metro.config.js` löst aus mobile/ heraus
 * nur den Paketnamen "@maitr/core" auf (mitsamt Unterpfaden), keinen Pfad nach
 * server/. Die Übereinstimmung ist damit eine Behauptung, die dieses Modul
 * nicht selbst beweisen kann - deshalb hält `ablauf.spec.ts` beide Regeln
 * nebeneinander (dort DARF das echte Schema importiert werden, es läuft nie im
 * App-Bundle, nur unter vitest/node - wie schon bei OEFFNUNGSZEITEN_VORSCHLAG
 * oben). KEIN open < close-Erfordernis: 18:00 bis 01:00 ist eine gültige
 * Sperrstunde nach Mitternacht, kein Tippfehler - siehe die Begründung am
 * echten Schema.
 */
const UHRZEIT_MUSTER = /^([01]\d|2[0-3]):[0-5]\d$/;

export function gueltigeUhrzeit(wert: string): boolean {
  return UHRZEIT_MUSTER.test(wert);
}

/**
 * Eine einzelne ungültige Uhrzeit - genug, um im Formular genau das eine
 * betroffene Feld zu markieren, statt pauschal "Ungültige Eingabe" zu zeigen.
 */
export interface ZeitenFeldFehler {
  tag: Day;
  feld: "open" | "close";
  /** Der geprüfte (getrimmte) Wert - das ist es, was tatsächlich durchfiel. */
  wert: string;
}

export type ZeitenErgebnis =
  | { ok: true; werte: OpeningHours }
  | { ok: false; fehler: ZeitenFeldFehler[] };

/**
 * Formular-Zustand zurück in die Form, die `api.venues.update` erwartet - die
 * Hinrichtung von `entwurfAusZeiten`. Zwei Fachfehler behoben:
 *
 * a) STILLES „GESCHLOSSEN": Tage mit stand "ohneAngabe" fehlen im Ergebnis
 *    GANZ, statt als `{closed: true}` mitgeschickt zu werden. Nur "geoeffnet"
 *    und "geschlossen" sind Aussagen des Wirts, "ohneAngabe" ist keine.
 * b) UNGEPRÜFTE UHRZEITEN: jedes `open`/`close` bei stand "geoeffnet" wird VOR
 *    dem Zusammenbauen geprüft (`gueltigeUhrzeit`, siehe dort). Bei einem
 *    Fehler kommt KEIN Ergebnis zum Senden zustande - `ok: false` mit JEDEM
 *    betroffenen Feld, nicht nur dem ersten: bei bis zu vierzehn Feldern soll
 *    der Wirt nicht sieben Runden lang neu absenden, um jeden Tippfehler
 *    einzeln zu finden.
 */
export function zeitenAusEntwurf(entwurf: ZeitenEntwurf): ZeitenErgebnis {
  const fehler: ZeitenFeldFehler[] = [];
  const werte: OpeningHours = {};

  for (const tag of DAYS) {
    const eintrag = entwurf[tag];
    if (eintrag.stand === "ohneAngabe") continue; // Fachfehler a: keine Aussage, kein Eintrag.
    if (eintrag.stand === "geschlossen") {
      werte[tag] = { closed: true };
      continue;
    }

    const open = eintrag.open.trim();
    const close = eintrag.close.trim();
    if (!gueltigeUhrzeit(open)) fehler.push({ tag, feld: "open", wert: open });
    if (!gueltigeUhrzeit(close)) fehler.push({ tag, feld: "close", wert: close });
    werte[tag] = { closed: false, open, close };
  }

  return fehler.length > 0 ? { ok: false, fehler } : { ok: true, werte };
}

/* ── Der eigene Betrieb aus Serverantworten ────────────────────────────────
   Zwei Fragen, die beide auf einer Serverantwort landen, deren Form nicht
   garantiert ist - dieselbe Vorsicht wie bei `googleVerbunden` oben. */

/**
 * Steckt im 409-Fehler von `POST /venues` ein brauchbarer Betrieb?
 *
 * 409 heißt hier "hast du schon", nicht "abgelehnt" - der vorhandene Betrieb
 * kommt im Fehlerrumpf mit. Bisher stand diese Prüfung WORTGLEICH zweimal im
 * Baum (`OnboardingScreen.tsx` und `onboarding/screens.tsx`), an keiner der
 * beiden Stellen geprüft. Jetzt einmal hier, mit Test.
 */
export function venueAusKonflikt(err: unknown): Venue | null {
  if (!(err instanceof ApiError) || err.status !== 409) return null;
  const rumpf = istRecord(err.body) ? err.body : undefined;
  const venue = rumpf?.venue;
  return istRecord(venue) && typeof venue.id === "string" && venue.id.length > 0
    ? (venue as unknown as Venue)
    : null;
}

/**
 * Der eigene Betrieb aus der Antwort von `venues.mine()` - EINE Regel für den
 * ganzen Ablauf, keine zwei. Bisher fiel die Auswahl beim Laden (Schritt 4,
 * Abschluss) auf `liste[0]` zurück, sobald `venueId` in der Liste fehlte; das
 * Speichern (`api.venues.update(venueId, …)`) bestand dagegen strikt auf der
 * bekannten Kennung. Fällt der Rückfall je an, bearbeitet der Wirt einen
 * ANDEREN Betrieb als den, gegen den anschließend gespeichert wird - und
 * bekommt für die nicht passende Kennung einen 403 „Kein Zugriff auf diesen
 * Betrieb", den `fehlerText` als „Nicht angemeldet" übersetzt. Falscher Rat:
 * er IST angemeldet, nur zwei Kennungen liefen auseinander.
 *
 * Deshalb keine Ausweichkennung mehr: Steht `venueId` nicht in `liste`, ist
 * das Ergebnis `null` - „kein bekannter Betrieb", nicht „irgendeiner". Der
 * legitime Fall, in dem `venueId` lokal fehlt, obwohl serverseitig schon ein
 * Betrieb existiert (z. B. nach einem Neustart ohne persistierte Kennung),
 * klärt sich über den 409-Weg von `venueAusKonflikt` beim nächsten
 * Anlegeversuch - kein Grund, hier zu raten.
 */
export function eigenerVenue(liste: unknown, venueId: string): Venue | null {
  if (!Array.isArray(liste) || !venueId) return null;
  const treffer = liste.find((eintrag) => istRecord(eintrag) && eintrag.id === venueId);
  return istRecord(treffer) ? (treffer as unknown as Venue) : null;
}

/* ── Anfangszustand aus dem, was der Server schon weiß ────────────────────────
   Wer im Onboarding landet, hat nicht zwangsläufig bei null angefangen: ein
   Betrieb kann schon stehen (z. B. nach einem abgebrochenen ersten Versuch),
   Google kann schon verbunden sein, Öffnungszeiten können schon hinterlegt
   sein. Jeder dieser drei Schritte startet dann direkt als „erledigt" statt
   „offen" - Schritt 4 „was schon da ist bestätigen" setzt genau das voraus. */
export function ablaufAusServerdaten(input: {
  /**
   * Typischerweise das Ergebnis von `eigenerVenue(...)` - NICHT ein
   * behaupteter Zustand. Der Abschluss-Bildschirm setzte "betrieb" bisher
   * pauschal auf "erledigt" fest, OHNE die zwei Zeilen vorher geholte Antwort
   * von `venues.mine()` überhaupt anzusehen - das einzige Häkchen im Fluss,
   * das gegen nichts geprüft wurde, ausgerechnet unter dem Kommentar, der
   * „Häkchen nur für Belegtes" ausschreibt. `betrieb` gilt jetzt genau dann
   * als erledigt, wenn hier wirklich ein Betrieb ankommt - `null` (kein
   * Treffer, oder der Abruf ist fehlgeschlagen) bleibt "offen", genau wie bei
   * einem Wirt, der noch gar nichts angelegt hat.
   */
  venue: Pick<Venue, "id" | "openingHours"> | null;
  integrationen: unknown;
}): AblaufZustand {
  return {
    betrieb: input.venue ? "erledigt" : "offen",
    google: googleVerbunden(input.integrationen) ? "erledigt" : "offen",
    zeiten: hatOeffnungszeiten(input.venue) ? "erledigt" : "offen",
  };
}

/**
 * Ein fehlendes natives Modul ist KEIN Netzfehler, sieht ohne diese
 * Unterscheidung aber wie einer aus: `mobile/app/_layout.tsx` hält fest, dass
 * genau diese Meldung ("Cannot find native module 'ExpoWebBrowser'") in
 * diesem Projekt schon einmal auftrat - und `ExpoWebBrowser` ist das Modul, an
 * dem der Google-Schritt hängt (`WebBrowser.openAuthSessionAsync` in
 * `AblaufGoogle`). Ein Wirt, dem "keine Verbindung zum Server" gesagt wird,
 * prüft sein WLAN und findet dort nichts - die Anfrage kam nie beim Server an,
 * sie ist nie losgeschickt worden.
 */
function istFehlendesNativesModul(err: Error): boolean {
  return /cannot find native module/i.test(err.message);
}

/* ── Serverfehler in eine Zeile für den Tresen ────────────────────────────────
   Übernommen aus `OnboardingScreen.tsx` (`fehlerText`) statt eine zweite
   Fassung zu schreiben - Grundsatz „erweitern, nicht duplizieren". Neu dazu
   kommt der PATCH-Fall: `ownerGuard` in server/maitr/routes.ts weist Personal
   mit 403 `nur_inhaber` ab. Das ist NICHT „nicht angemeldet" (die Zeile, die
   401/403 bisher pauschal bekamen) - eine neue Anmeldung ändert nichts daran,
   dass diese Anmeldung zu einer Aushilfe gehört, nicht zum Inhaber. Ebenfalls
   neu: das fehlende native Modul (siehe `istFehlendesNativesModul` oben) wird
   nicht mehr in denselben Topf wie ein echter Netzfehler geworfen. */
export function fehlerText(err: unknown): string {
  if (err instanceof ApiError) {
    const rumpf = istRecord(err.body) ? err.body : undefined;
    if (err.status === 403 && rumpf?.error === "nur_inhaber") {
      return "Das darf nur der Inhaber des Betriebs ändern - hier ist eine Aushilfe angemeldet, nicht der Inhaber.";
    }
    if (err.status === 401 || err.status === 403) return "Nicht angemeldet. Bitte neu anmelden.";
    // 422 (Öffnungszeiten oder Name ungültig) und 409 ohne Rumpf tragen einen
    // deutschen Servertext - der wird wörtlich gezeigt, er ist genauer als jede
    // Ersatzformel.
    return err.message;
  }
  if (err instanceof Error && istFehlendesNativesModul(err)) {
    return "Diese Funktion fehlt in dieser App-Installation (natives Modul nicht gefunden). Am WLAN liegt es nicht - meist hilft ein Neustart der App oder eine neu installierte Version.";
  }
  return "Keine Verbindung zum Server. Bitte später noch einmal versuchen.";
}

/**
 * Rät dieser Fehler zu einer neuen Anmeldung - und kann der Bildschirm sie
 * dann auch anbieten?
 *
 * ANLASS: Im Simulator gemessen. Ohne gültige Sitzung antwortet `POST /venues`
 * mit 401, der Betriebsschritt zeigte daraufhin sauber „Nicht angemeldet. Bitte
 * neu anmelden." - und bot keinen Weg dorthin an. Ein Rat, den der Bildschirm
 * selbst nicht einlösen kann, ist eine halbe Sackgasse: Der Wirt weiß, was zu
 * tun wäre, und kommt trotzdem nicht hin.
 *
 * Bewusst NICHT für `nur_inhaber` (403 mit diesem Rumpf): Dort ist eine neue
 * Anmeldung gerade NICHT die Lösung - dieselbe Aushilfe käme wieder an, und
 * ein Knopf „Zur Anmeldung" wäre dort eine Irreführung. `fehlerText` trennt die
 * beiden Fälle schon im Text; hier wird dieselbe Trennung für die Aktion
 * gezogen.
 */
export function brauchtNeueAnmeldung(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const rumpf = istRecord(err.body) ? err.body : undefined;
  if (err.status === 403 && rumpf?.error === "nur_inhaber") return false;
  return err.status === 401 || err.status === 403;
}

/* ── Die Weiche für den Einstieg ──────────────────────────────────────────────
   Sie steht jetzt in `app/index.tsx`. Vorher schickte die Datei jeden
   Angemeldeten stur nach `/start`, egal ob ein echter Betrieb dranhing - ein
   neuer Wirt landete damit in den Beispieldaten eines fremden Betriebs, und das
   Onboarding war von der Oberfläche aus überhaupt nicht erreichbar. Drei
   Eingaben, alle nötig:

   - `angemeldet`: ohne Sitzung ist Login die einzig ehrliche Antwort.
   - `echterAnmeldebetrieb`: entspricht `hasRealAuth()` - läuft die App ohne
     Clerk-Schlüssel (Demomodus), gibt es kein Konto, an dem ein echter Betrieb
     hängen könnte, und `GET /venues` würde nie aufgerufen (siehe der Effekt
     „Welcher Betrieb gehört zu dieser Anmeldung?" in store.tsx). Der
     Demo-Betrieb gilt dort als vorhanden - sonst wäre die App ohne
     Konfiguration nicht mehr bedienbar, und genau das darf nicht passieren.
   - `betrieb`: der Stand von `GET /venues`, dreiwertig. `GET /venues` läuft
     asynchron; „unbekannt" ist der Zustand, bevor die Antwort da ist. Eine
     Weiche, die dann schon entscheidet, rät - und ein angemeldeter Wirt MIT
     Betrieb sähe einmal das Onboarding aufblitzen, bevor die Antwort ihn
     korrigiert. Deshalb der eigene Rückgabewert „warten": kein Redirect, bis
     feststeht, was wirklich zutrifft. */
export type BetriebBekanntheit = "bekannt" | "keiner" | "unbekannt";
export type Einstiegsziel = "login" | "onboarding" | "start" | "warten";

export function einstiegsWeiche(input: {
  angemeldet: boolean;
  echterAnmeldebetrieb: boolean;
  betrieb: BetriebBekanntheit;
}): Einstiegsziel {
  if (!input.angemeldet) return "login";
  if (!input.echterAnmeldebetrieb) return "start";
  if (input.betrieb === "unbekannt") return "warten";
  if (input.betrieb === "keiner") return "onboarding";
  return "start";
}
