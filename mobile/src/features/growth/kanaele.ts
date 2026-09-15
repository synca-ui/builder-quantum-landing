/**
 * Kanäle, Wachstum und Beiträge für den ECHTEN Betrieb - die reinen
 * Entscheidungen, ohne React.
 *
 * Anlass: die Integrationsprüfung vom 15.09. (docs/product/INTEGRATIONSPRUEFUNG_APP.md,
 * Punkte 2, 21, 23 und der Beitragsteil von 6). Kanäle, Wachstum und Beiträge
 * zeigten einem echten Wirt die Vorführwerte von „Café Goldstück“: fünf
 * verbindbare Kanäle, obwohl der Server nur Google und Meta kennt, ein
 * simuliertes Verbinden, „Beiträge veröffentlichen“ als Berechtigung, die kein
 * Connector hat. Hier steht, was davon für einen echten Betrieb gilt. Demo und
 * Showcase gehen jeweils unverändert durch (`echterBetrieb === false`).
 *
 * Getrennt von den Screens, damit es sich ohne React-Native-Testaufbau prüfen
 * lässt (kanaele.spec.ts) - dieselbe Aufteilung wie lib/praesenz.ts.
 */
import type { DailyTask, Reservation, VenuePresence } from "@maitr/core";
import type { ProviderId } from "@maitr/core/integrations";

import { anzahlText, sterneText } from "../../lib/praesenz";
import { CHANNELS, type ChannelDef } from "./channels";

/* ── Kanäle ──────────────────────────────────────────────────────────────── */

/**
 * Welche Server-Verbindung hinter einem Kanal der Oberfläche steht.
 *
 * Instagram UND Facebook hängen an derselben META-Verbindung (eine Freigabe über
 * die Facebook-Seite, siehe packages/core/src/integrations/meta.ts) - so setzt es
 * auch `ladeKanaele` im Store. Yelp und TheFork haben keinen Connector.
 */
export function serverProvider(channelId: string): ProviderId | null {
  if (channelId === "google") return "google";
  if (channelId === "instagram" || channelId === "facebook") return "meta";
  return null;
}

/** Lässt sich der Kanal verbinden? Im Demo alle (Vorführung), echt nur mit Connector. */
export function kanalVerfuegbar(channelId: string, echterBetrieb: boolean): boolean {
  return !echterBetrieb || serverProvider(channelId) !== null;
}

/** Die Kanäle, die „x von y verbunden“ zählt. */
export function zaehlbareKanaele(echterBetrieb: boolean): ChannelDef[] {
  return CHANNELS.filter((c) => kanalVerfuegbar(c.id, echterBetrieb));
}

export interface KanalZaehlung {
  verbunden: number;
  gesamt: number;
  offen: number;
}

/**
 * „x von y verbunden“. Für einen echten Betrieb zählen Yelp und TheFork nicht mit:
 * „2 von 5“ hieße, drei Kanäle warteten nur auf einen Tipp - zwei davon lassen
 * sich gar nicht verbinden.
 */
export function kanalZaehlung(channels: Record<string, boolean>, echterBetrieb: boolean): KanalZaehlung {
  const liste = zaehlbareKanaele(echterBetrieb);
  const verbunden = liste.filter((c) => channels[c.id] === true).length;
  return { verbunden, gesamt: liste.length, offen: liste.length - verbunden };
}

export type KanalStatus = "verbunden" | "verbinden" | "nicht_verfuegbar";

export function kanalStatus(
  channelId: string,
  channels: Record<string, boolean>,
  echterBetrieb: boolean,
): KanalStatus {
  if (!kanalVerfuegbar(channelId, echterBetrieb)) return "nicht_verfuegbar";
  return channels[channelId] === true ? "verbunden" : "verbinden";
}

export function kanalStatusText(status: KanalStatus): string {
  return status === "verbunden" ? "Verbunden" : status === "verbinden" ? "Verbinden ›" : "Nicht verfügbar";
}

/**
 * Nutzen-Zeile unter dem Kanalnamen. Der Katalog verspricht „Beiträge automatisch
 * teilen“ und „Reviews automatisch beantworten“ - beides kann kein Connector.
 * Für den echten Betrieb steht hier, was die Verbindung wirklich bringt.
 */
export function kanalZweck(channel: ChannelDef, echterBetrieb: boolean): string {
  if (!echterBetrieb) return channel.purpose;
  switch (channel.id) {
    case "google":
      return "Bewertungen & Sichtbarkeit bei Google";
    case "instagram":
      return "Reichweite deines Profils";
    case "facebook":
      return "Empfehlungen deiner Seite";
    default:
      return "Noch keine Anbindung";
  }
}

/**
 * „Maitr darf“ - nur, was der Code wirklich tut. Die Connectoren
 * (packages/core/src/integrations) können ausschließlich lesen: Google holt
 * Bewertungen (v4 reviews) und Maps-Aufrufe (Performance-API), Meta holt die
 * Instagram-Reichweite (insights) und die Empfehlungen der Facebook-Seite
 * (ratings). Veröffentlichen, Beantworten, Zeiten pflegen: nichts davon ist gebaut.
 */
export function kanalBerechtigungen(channel: ChannelDef, echterBetrieb: boolean): string[] {
  if (!echterBetrieb) return channel.scopes;
  const provider = serverProvider(channel.id);
  if (provider === "google") return ["Bewertungen und Sichtbarkeit lesen"];
  if (provider === "meta") return ["Reichweite und Empfehlungen lesen"];
  return [];
}

/**
 * Wie ein echter OAuth-Durchlauf ausging.
 *
 * Maßgeblich ist allein `verbunden` - der Kanalstatus, NACHDEM die App die Liste
 * vom Server neu geholt hat. Der Rücksprung aus dem Browser ist eine Behauptung,
 * kein Beleg (dieselbe Lehre wie in AblaufGoogle). Umgekehrt zählt auch ein
 * geschlossener Browser nicht als Abbruch, wenn die Verbindung trotzdem steht:
 * Der Callback kann gespeichert haben, bevor der Rücksprung ankam.
 *
 * `rueckUrl` trägt den Deep-Link des Servers: `?provider=…&status=error`, wenn
 * der Codetausch scheiterte (server/maitr/routes.ts, Integrations-Callback).
 * Bewusst per Muster statt `new URL()` gelesen - `maitr://` ist kein Schema, das
 * jede URL-Umsetzung zuverlässig zerlegt.
 */
export function verbindenAusgang(input: {
  browserTyp: string;
  rueckUrl?: string;
  verbunden: boolean;
  kanalName: string;
}): { erfolg: boolean; meldung: string } {
  if (input.verbunden) return { erfolg: true, meldung: `${input.kanalName} verbunden` };
  if (input.browserTyp !== "success") {
    return { erfolg: false, meldung: "Verbindung abgebrochen. Du kannst es erneut versuchen." };
  }
  const status = /[?&]status=([^&#]*)/.exec(input.rueckUrl ?? "")?.[1];
  if (status === "error") {
    return {
      erfolg: false,
      meldung: `Die Anmeldung bei ${input.kanalName} ist fehlgeschlagen. Bitte erneut versuchen.`,
    };
  }
  return {
    erfolg: false,
    meldung: "Die Verbindung wurde nicht bestätigt. Bitte erneut versuchen.",
  };
}

/**
 * Wohin „Google verbinden" aus Bewertungen und Präsenzbericht führt.
 *
 * Die Kanal-Seite, nicht das Onboarding. Anlass (Prüfer-Befund 21, 15.09.): Der
 * Onboarding-Schritt prüfte die Verbindung nur für sich und lud den Kanalstatus des
 * Stores nie neu - nach erfolgreichem OAuth zeigten Bewertungen, Kanäle, Wachstum
 * und Beiträge weiter „nicht verbunden", bis die App neu startete. „Weiter" schickte
 * den bestehenden Wirt außerdem durch Zeiten- und Fertig-Schritt. Die Kanal-Seite
 * (ChannelDetailScreen) lädt den Store nach dem Rücksprung neu und bleibt, wo der
 * Wirt war.
 */
export const GOOGLE_VERBINDEN_ROUTE = "/kanal/google" as const;

/* ── Wachstum ────────────────────────────────────────────────────────────── */

export interface KachelWert {
  value: string;
  delta: string;
}

/**
 * Kachel „Bewertungen“ aus dem Google-Eintrag (Places, ohne Freigabe).
 *
 * KEIN Vormonatsdelta: `PresenceSnapshot` wird per upsert überschrieben, eine
 * Historie gibt es nicht. Schnitt und Anzahl aus `google`, nicht aus
 * `bericht.bewertungen` - ohne Eintrag setzt der Server dort `anzahl: 0`, und das
 * hieße „keine Bewertungen“, obwohl die Zahl schlicht unbekannt ist (dieselbe
 * Regel wie in GoogleBewertungenAnsicht).
 */
export function bewertungKachel(praesenz: VenuePresence | null, laedt: boolean): KachelWert {
  if (!praesenz) {
    return laedt ? { value: "…", delta: "wird geladen" } : { value: "–", delta: "nicht abgerufen" };
  }
  const google = praesenz.google;
  if (google) {
    const anzahl = typeof google.reviewCount === "number" ? google.reviewCount : null;
    if (typeof google.rating === "number" && anzahl !== 0) {
      return {
        value: sterneText(google.rating),
        delta: anzahl === null ? "bei Google" : `${anzahlText(anzahl)} bei Google`,
      };
    }
    return { value: "–", delta: anzahl === 0 ? "noch keine bei Google" : "bei Google ohne Schnitt" };
  }
  switch (praesenz.status) {
    case "nicht_gefunden":
      return { value: "–", delta: "bei Google nicht gefunden" };
    case "fehler":
      return { value: "–", delta: "Abruf fehlgeschlagen" };
    case "kein_schluessel":
      return { value: "–", delta: "nicht abrufbar" };
    default:
      return { value: "–", delta: "noch nicht abgerufen" };
  }
}

/**
 * Wie viele Reservierungen in den kommenden Tagen wirklich anstehen.
 *
 * `reservations.upcoming` liefert ALLE Zustände, auch Absagen und No-Shows (damit
 * die App sie als erledigt zeigen kann) - die zählen hier nicht. Offene Anfragen
 * aus der Web-App (`pending`) zählen mit: Der Gast kommt, sofern der Betrieb
 * nicht absagt. `null`, wenn die Antwort nicht die erwartete Form hat - das ist
 * „nicht abrufbar“, nicht „keine“.
 */
export function zaehleKommendeReservierungen(antwort: unknown): number | null {
  if (!Array.isArray(antwort)) return null;
  let anzahl = 0;
  for (const eintrag of antwort as Partial<Reservation>[]) {
    if (!eintrag || typeof eintrag !== "object" || typeof eintrag.status !== "string") return null;
    if (eintrag.status !== "cancelled" && eintrag.status !== "no_show") anzahl += 1;
  }
  return anzahl;
}

export type ReservierungsAbruf = { art: "laedt" } | { art: "fehler" } | { art: "da"; anzahl: number };

export function reservierungKachel(abruf: ReservierungsAbruf, tage: number): KachelWert {
  if (abruf.art === "laedt") return { value: "…", delta: "wird geladen" };
  if (abruf.art === "fehler") return { value: "–", delta: "nicht abrufbar" };
  return { value: anzahlText(abruf.anzahl), delta: `nächste ${tage} Tage` };
}

/**
 * Erklärung anstelle von Aufrufe-/Routen-Kacheln und 6-Monats-Chart.
 *
 * Bewusst KEIN „kommt mit der Freigabe“: Auch mit Freigabe holt der Google-
 * Connector nur Maps-Aufrufe (BUSINESS_IMPRESSIONS_*_MAPS), weder Routen noch
 * Anrufe, und die App zeigt davon nichts an. Wahr ist nur die Bedingung.
 */
export function sichtbarkeitHinweis(googleVerbunden: boolean): { text: string; verbindenZeigen: boolean } {
  return googleVerbunden
    ? { text: "Google ist verbunden. Aufrufe, Routen und Anrufe zeigt Maitr hier noch nicht an.", verbindenZeigen: false }
    : {
        text: "Aufrufe, Routen und Anrufe kennt nur Google. Ohne Google-Freigabe kann Maitr sie nicht abrufen.",
        verbindenZeigen: true,
      };
}

/** Leerzustand im Kennzahl-Detail für den echten Betrieb - es gibt keine Monatsreihen. */
export function kennzahlLeerzustand(key: string | undefined, googleVerbunden: boolean): { title: string; message: string } {
  switch (key) {
    case "bewertungen":
      return {
        title: "Kein Verlauf verfügbar",
        message: "Maitr speichert nur den letzten Stand deiner Google-Bewertungen, keinen Monatsverlauf.",
      };
    case "reservierungen":
      return {
        title: "Kein Verlauf verfügbar",
        message: "Einen Monatsverlauf deiner Reservierungen zeigt Maitr noch nicht an.",
      };
    default:
      return { title: "Kein Verlauf verfügbar", message: sichtbarkeitHinweis(googleVerbunden).text };
  }
}

/* ── Erkenntnisse aus dem Tagesbriefing ──────────────────────────────────── */

/**
 * Aufgaben aus `GET /briefing/today` - Form prüfen, nicht nur Erfolg (dieselbe
 * Lehre wie in useDailyBriefing). `null` heißt „keine brauchbare Antwort“, nicht
 * „keine Aufgaben“. Einzelne kaputte Einträge fallen weg statt die Liste zu kippen.
 */
export function aufgabenAusBriefing(antwort: unknown): DailyTask[] | null {
  if (!antwort || typeof antwort !== "object") return null;
  const tasks = (antwort as { tasks?: unknown }).tasks;
  if (!Array.isArray(tasks)) return null;
  return tasks.filter(
    (t): t is DailyTask =>
      !!t &&
      typeof t === "object" &&
      typeof (t as DailyTask).id === "string" &&
      typeof (t as DailyTask).title === "string" &&
      !AUFGABEN_OHNE_GRUNDLAGE.includes((t as DailyTask).id),
  );
}

/**
 * Aufgaben, deren TITEL schon eine Behauptung ohne Grundlage ist.
 *
 * `roi_month` („X € Provision gespart“, packages/core/src/analytics/insights.ts)
 * rechnet mit einem Ø-Bon, den kein Betrieb je gesetzt hat (Schema-Default 9 €),
 * einem angenommenen Provisionssatz von 2,5 % und zählt unbestätigte Web-Anfragen
 * als vermittelt (dataset.ts bildet PENDING auf „confirmed“ ab). Das ROI-Panel im
 * Wachstum ist aus genau diesem Grund für den echten Betrieb weg - die Aufgabe
 * darunter hätte dieselbe Zahl wieder hereingeholt (Prüfer-Befund 15.09.).
 */
const AUFGABEN_OHNE_GRUNDLAGE = ["roi_month"];

/**
 * Kennungs-Präfixe, deren Zahl im `impact` aus den eigenen Daten gemessen ist:
 * Präsenzpunkte aus dem Präsenzbericht, Reichweiten-Plus aus den Engagement-Werten
 * des verbundenen Kanals.
 */
const GEMESSENE_WIRKUNG = ["profile_", "timing_"];

/**
 * Wirkung einer Aufgabe, wie sie auf der Karte stehen darf. Zahlen nur, wo sie
 * gemessen sind - „+35 % Profilaufrufe“ an jeder Bewertung ist eine Konstante,
 * „~X € Auslastung“ und „X € Beziehung“ hängen am nie gesetzten Ø-Bon. Wörter ohne
 * Zahl („Schaden begrenzen“, „Tisch absichern“) behaupten nichts Messbares.
 */
export function aufgabenWirkung(task: { id: string; impact?: unknown }): string | null {
  if (typeof task.impact !== "string") return null;
  const impact = task.impact.trim();
  if (!impact) return null;
  if (GEMESSENE_WIRKUNG.some((praefix) => task.id.startsWith(praefix))) return impact;
  return /[0-9€%]/.test(impact) ? null : impact;
}

/**
 * `primaryAction.endpoint` als App-Route. Der Server setzt dort die `route` der
 * Erkenntnis ("/bewertungen", "/profil-check" …). Nur app-interne Pfade werden
 * angesprungen - ein Schema („https://“, „maitr://“) oder „//host“ nicht, das
 * wäre ein Sprung aus einer Serverantwort irgendwohin.
 */
export function aufgabenRoute(endpoint: unknown, aktuelleRoute?: string): string | null {
  if (typeof endpoint !== "string") return null;
  if (!/^\/[A-Za-z0-9\-_/]*$/.test(endpoint) || endpoint.startsWith("//")) return null;
  // Ein Sprung auf den Screen, auf dem die Karte schon steht, legt ihn nur ein
  // zweites Mal auf den Stapel („Wachstum ansehen“ im Wachstum).
  if (aktuelleRoute !== undefined && endpoint.replace(/\/+$/, "") === aktuelleRoute.replace(/\/+$/, "")) return null;
  return endpoint;
}

/**
 * Sichtbare Erkenntnisse: ERST die weggewischten herausnehmen, DANN kürzen.
 * Andersherum (so stand es bis 15.09. im Demo-Zweig) blieb nach jedem Wischen ein
 * Platz leer, obwohl weitere Erkenntnisse vorlagen.
 */
export function sichtbareEintraege<T extends { id: string }>(
  eintraege: T[],
  weggewischt: Record<string, boolean>,
  limit: number,
): T[] {
  return eintraege.filter((e) => !weggewischt[e.id]).slice(0, limit);
}

/* ── Beiträge ────────────────────────────────────────────────────────────── */

/** Kanalnamen, wie Beiträge sie tragen, mit der Kanal-Kennung dahinter. */
const BEITRAGS_KANAELE: { name: string; id: string }[] = [
  { name: "Instagram", id: "instagram" },
  { name: "Google", id: "google" },
  { name: "Facebook", id: "facebook" },
];

/**
 * Wählbare Kanäle für einen Beitrag. Echt nur verbundene - ein Chip „Google“
 * ohne Verbindung sähe aus, als ginge der Entwurf dorthin.
 */
export function beitragsKanaele(channels: Record<string, boolean>, echterBetrieb: boolean): string[] {
  return BEITRAGS_KANAELE.filter((k) => !echterBetrieb || channels[k.id] === true).map((k) => k.name);
}

/** Auswahl auf das Erlaubte beschneiden (Reihenfolge wie `erlaubt`). */
export function kanaeleFuerBeitrag(auswahl: string[], erlaubt: string[]): string[] {
  return erlaubt.filter((k) => auswahl.includes(k));
}

/** Präfix der Beiträge, die auf dem Gerät entstanden sind (`createQuickPost` im Store). */
export const EIGENER_BEITRAG_PREFIX = "p_quick";

/**
 * Welcher Entwurf zu welchem Betrieb gehört: Beitrags-id → venueId.
 *
 * Anlass (Prüfer-Befund 15.09.): Beiträge im Store hängen an keinem Betrieb, und
 * `signOut` räumt sie nicht. Das Präfix allein ließ deshalb zwei fremde Sorten als
 * „deine Entwürfe“ durch - Schnellbeiträge aus dem Demo („Frische Zimtschnecken,
 * gerade aus dem Ofen.“) und die Entwürfe eines vorher angemeldeten Kontos samt
 * Bearbeiten-Knopf. Die Zuordnung entsteht beim Anlegen im echten Betrieb und liegt
 * neben dem Store (PostsScreen.tsx), bis der Beitrag selbst eine venueId trägt.
 */
export type BeitragsZuordnung = Record<string, string>;

/**
 * Welche Beiträge zu sehen sind.
 *
 * Echter Betrieb: nur Entwürfe, die für GENAU diesen Betrieb angelegt wurden. Der
 * Seed („Hausröstung Ehrenfeld ist zurück · 1.284 erreicht“) ist Café Goldstück,
 * ein Schnellbeitrag ohne Zuordnung stammt aus dem Demo oder von vor dieser Regel.
 *
 * Demo/Showcase: alles wie bisher - bis auf Entwürfe, die einem echten Betrieb
 * gehören. Sonst stünde der Entwurf eines Wirts nach dem Abmelden in der
 * Vorführung als „Eingeplant“ mit „Jetzt veröffentlichen“.
 */
export function sichtbareBeitraege<T extends { id: string }>(
  posts: T[],
  echterBetrieb: boolean,
  zuordnung: BeitragsZuordnung,
  venueId: string,
): T[] {
  if (echterBetrieb) {
    return posts.filter(
      (p) => p.id.startsWith(EIGENER_BEITRAG_PREFIX) && venueId !== "" && zuordnung[p.id] === venueId,
    );
  }
  return posts.filter((p) => zuordnung[p.id] === undefined);
}

/**
 * Der Beitrag, den `createQuickPost` gerade angelegt hat. Der Store vergibt die id
 * selbst und gibt sie nicht zurück; erkennbar ist er als Schnellbeitrag, der vorher
 * nicht da war, mit genau dem gemerkten Text. Der Text schützt davor, einen
 * zeitgleich aus dem Speicher geladenen Beitrag für den neuen zu halten.
 */
export function neuerEigenerBeitrag(
  vorherIds: readonly string[],
  posts: { id: string; title: string }[],
  titel: string,
): string | null {
  const vorher = new Set(vorherIds);
  const neu = posts.find((p) => p.id.startsWith(EIGENER_BEITRAG_PREFIX) && !vorher.has(p.id) && p.title === titel);
  return neu ? neu.id : null;
}

/**
 * Gespeicherte Zuordnung lesen. Alles, was keine Zuordnung aus Zeichenketten ist,
 * zählt als leer - ein kaputter Speicherstand darf keinen Entwurf einem Betrieb
 * zuschlagen.
 */
export function zuordnungAusSpeicher(roh: string | null): BeitragsZuordnung {
  if (!roh) return {};
  let wert: unknown;
  try {
    wert = JSON.parse(roh);
  } catch {
    return {};
  }
  if (!wert || typeof wert !== "object" || Array.isArray(wert)) return {};
  const zuordnung: BeitragsZuordnung = {};
  for (const [id, venueId] of Object.entries(wert as Record<string, unknown>)) {
    if (typeof venueId === "string" && venueId !== "") zuordnung[id] = venueId;
  }
  return zuordnung;
}

/**
 * Zuordnung um einen Entwurf ergänzen. Einträge zu Beiträgen, die es im Store nicht
 * mehr gibt (Kontolöschung setzt die Beiträge zurück), fallen dabei weg - sonst
 * wüchse der Speicherstand mit jedem Entwurf.
 */
export function zuordnungMit(
  zuordnung: BeitragsZuordnung,
  postId: string,
  venueId: string,
  vorhandeneIds: readonly string[],
): BeitragsZuordnung {
  const vorhanden = new Set(vorhandeneIds);
  const naechste: BeitragsZuordnung = {};
  for (const [id, betrieb] of Object.entries(zuordnung)) {
    if (vorhanden.has(id)) naechste[id] = betrieb;
  }
  naechste[postId] = venueId;
  return naechste;
}

/**
 * Antipp-Vorschläge aus der eigenen Speisekarte statt „Zimtschnecken/Flat White“.
 * Server-Gerichte zuerst (die veröffentlichte Karte), Namen ohne Dopplung. Der
 * Satz behauptet nichts über das Gericht („frisch“, „neu“), was Maitr nicht weiß.
 */
export function beitragsVorschlaege(menu: { id: string; name: string }[], max = 3): string[] {
  const sortiert = [...menu].sort(
    (a, b) => Number(!a.id.startsWith("srv-")) - Number(!b.id.startsWith("srv-")),
  );
  const namen: string[] = [];
  for (const gericht of sortiert) {
    const name = typeof gericht.name === "string" ? gericht.name.trim() : "";
    if (!name || namen.includes(name)) continue;
    namen.push(name);
    if (namen.length >= max) break;
  }
  return namen.map((name) => `Heute auf unserer Karte: ${name}.`);
}

/** Zeitpunkt eines Entwurfs ohne gewählten Termin. */
export const ENTWURF_OHNE_TERMIN = "ohne Termin";

/** Kopfzeile einer Beitragskarte im echten Betrieb - nie „Live“ oder „Eingeplant“. */
export function entwurfZeile(post: { when: string; channels: string[] }): string {
  const kanaele = post.channels.length > 0 ? post.channels.join(" + ") : "kein Kanal";
  return `Entwurf · ${post.when} · ${kanaele}`;
}
