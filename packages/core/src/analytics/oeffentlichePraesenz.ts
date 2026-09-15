/**
 * Öffentliche Präsenz - was sich über einen Betrieb OHNE Google-Freigabe sagen
 * lässt, und was daraus folgt.
 *
 * ANLASS: Die App zeigte nach der Anmeldung einen Präsenzscore, der aus vier
 * lokal abgehakten Kästchen bestand, und eine Bewertung "4,8 · 128", die im Code
 * stand. Beides ließ sich längst messen: Google nennt Schnitt, Anzahl, fünf
 * Bewertungen, Fotos, Öffnungszeiten, Telefon und Website eines Betriebs über
 * die Places-API - ohne dass der Wirt sein Unternehmensprofil freigibt. Dazu
 * kommt, was seine Website hergibt (Speisekarte, Reservierung, mobil lesbar)
 * und was Maitr selbst über ihn weiß (Karte, Beschreibung, Kanäle).
 *
 * Diese Datei ist REIN: keine Requests, keine Datenbank. Der Server sammelt
 * (server/maitr/praesenz/), diese Funktionen werten aus. Die Auswertung läuft
 * über denselben `presenceScore` wie das Tagesbriefing - ein Score, eine Formel.
 * Was die öffentliche Datenlage nicht hergibt (Antwortquote, Reichweite), wird
 * als unbekannt geführt statt als Null gerechnet (siehe `PresenceCoverage`).
 */

import type { Day, Iso8601, OpeningHours } from "../types";
import { DAYS } from "../types";
import { daysBetween, round } from "./math";
import { presenceScore } from "./presence";
import { extractThemes } from "./reviews";
import type {
  ProfileSignals,
  ReviewRecord,
  ReviewTheme,
  ScoreFactor,
  ScoreFactorKey,
  VenueDataset,
} from "./types";

/* ── Eingabe: was die Prüfung gesammelt hat ─────────────────────────────── */

/** Eine der (höchstens fünf) Bewertungen, die Google Places öffentlich zeigt. */
export interface OeffentlicheBewertung {
  /** Ressourcenname bei Google (`places/…/reviews/…`) - eindeutig. */
  id: string;
  autor: string;
  /** 1-5. */
  rating: number;
  text: string;
  createdAt: Iso8601;
  /** "vor 2 Wochen" - wie Google es selbst formuliert. */
  relativ?: string;
  /** Die Bewertung bei Google Maps. */
  url?: string;
}

export type GoogleBetriebsstatus =
  | "OPERATIONAL"
  | "CLOSED_TEMPORARILY"
  | "CLOSED_PERMANENTLY"
  | "UNBEKANNT";

/** Der Google-Maps-Eintrag des Betriebs, wie Places ihn ohne Freigabe herausgibt. */
export interface GoogleEintrag {
  placeId: string;
  name: string;
  adresse?: string;
  /** Schnitt über alle Bewertungen; fehlt, solange es keine gibt. */
  rating?: number;
  reviewCount: number;
  /** Bis zu fünf "relevanteste" Bewertungen - keine vollständige Liste. */
  bewertungen: OeffentlicheBewertung[];
  /** Aufgelöste Bildadressen (ohne Schlüssel), höchstens fünf. */
  fotos: string[];
  /** Wie viele Fotos Google nennt (die Antwort trägt höchstens zehn). */
  fotoAnzahl: number;
  oeffnungszeiten?: OpeningHours;
  /**
   * Tage, für die Google mehrere Zeitfenster nennt (Mittagspause). Sie fehlen in
   * `oeffnungszeiten`, weil die App je Tag nur ein Fenster kennt - ohne diese Liste
   * sähe ein Betrieb mit Pause an jedem Tag aus wie einer ohne Zeiten.
   */
  tageMitPause?: Day[];
  telefon?: string;
  website?: string;
  mapsUrl?: string;
  status: GoogleBetriebsstatus;
  /** 1 (günstig) bis 4 (sehr teuer). */
  preisniveau?: 1 | 2 | 3 | 4;
  /** Googles redaktionelle Kurzbeschreibung. */
  beschreibung?: string;
  aussenplaetze?: boolean;
  reservierbar?: boolean;
  vegetarisch?: boolean;
  /** z. B. "Brauhaus", "Café". */
  typ?: string;
  lat?: number;
  lng?: number;
}

/** Was die eigene Website des Betriebs hergibt. */
export interface WebsitePruefung {
  /** Endadresse nach Weiterleitungen. */
  url: string;
  erreichbar: boolean;
  https: boolean;
  titel?: string;
  /** Viewport-Meta vorhanden - ohne sie ist die Seite auf dem Handy winzig. */
  mobilTauglich: boolean;
  /** schema.org-Auszeichnung des Betriebs (Restaurant/LocalBusiness). */
  strukturierteDaten: boolean;
  speisekarteVerlinkt: boolean;
  reservierung?: { anbieter: string; url: string };
  oeffnungszeitenGefunden: boolean;
  adresseGefunden: boolean;
  instagram?: string;
  facebook?: string;
  ladezeitMs?: number;
  /** Warum die Seite nicht lesbar war (nur bei `erreichbar: false`). */
  fehler?: string;
}

/** Was Maitr selbst über den Betrieb weiß - immer bekannt, nie geraten. */
export interface MaitrProfil {
  name: string;
  hatSpeisekarte: boolean;
  hatBeschreibung: boolean;
  tags: string[];
  oeffnungszeiten?: OpeningHours;
  instagram?: string;
  /** Die veröffentlichte Web-App, z. B. "https://haus-toeller.maitr.de". */
  website?: string;
  telefon?: string;
}

/**
 * Zustand des Google-Abrufs. `ausstehend` = noch nie versucht, `kein_schluessel`
 * = der Server kann nicht (kein Places-Schlüssel) - für den Bericht dasselbe:
 * keine Google-Daten, und der Hinweis sagt, dass sie noch fehlen.
 */
export type GoogleAbrufStatus =
  | "bereit"
  | "ausstehend"
  | "kein_schluessel"
  | "nicht_gefunden"
  | "fehler";

export interface PraesenzSnapshot {
  now: Iso8601;
  google: GoogleEintrag | null;
  googleStatus: GoogleAbrufStatus;
  website: WebsitePruefung | null;
  maitr: MaitrProfil;
}

/* ── Ausgabe: der Bericht ───────────────────────────────────────────────── */

/** Ein Hebel: was der Wirt tun kann, und was es ungefähr bringt. */
export interface PraesenzHebel {
  id: string;
  titel: string;
  detail: string;
  /** Ungefährer Score-Gewinn. 0 = wichtig, aber nicht in Punkten messbar. */
  punkte: number;
  quelle: "google" | "website" | "maitr";
  /** App-Pfad, wenn sich die Sache in der App erledigen lässt. */
  route?: string;
  /** Externe Adresse, wenn sie bei Google oder auf der Website zu erledigen ist. */
  url?: string;
}

export interface WebsiteBefund {
  id: string;
  titel: string;
  ok: boolean;
  detail?: string;
}

export interface PraesenzBericht {
  /** 0-100, über die bekannten Faktoren gerechnet (siehe `deckung`). */
  score: number;
  faktoren: ScoreFactor[];
  deckung: {
    /** Anteil des Gesamtgewichts, der gemessen oder geschätzt vorliegt (0-1). */
    gemessen: number;
    unbekannt: ScoreFactorKey[];
    geschaetzt: ScoreFactorKey[];
    /** Ein Satz für die Oberfläche: worauf der Score beruht, was noch fehlt. */
    hinweis: string;
  };
  /** Nach Wirkung sortiert; Statusprobleme (nicht gefunden, geschlossen) zuerst. */
  hebel: PraesenzHebel[];
  websiteBefunde: WebsiteBefund[];
  bewertungen: {
    schnitt: number | null;
    anzahl: number;
    themen: ReviewTheme[];
    /** Datum der neuesten der gezeigten Bewertungen. */
    juengste?: Iso8601;
  };
}

/* ── Hilfen ─────────────────────────────────────────────────────────────── */

const GOOGLE_PROFIL_URL = "https://business.google.com/";

/** Tage, an denen zwei Zeitpläne verschiedenes sagen. Nur Tage, die beide kennen. */
export function oeffnungszeitenWeichenAb(a?: OpeningHours, b?: OpeningHours): Day[] {
  if (!a || !b) return [];
  const anders: Day[] = [];
  for (const tag of DAYS) {
    const x = a[tag];
    const y = b[tag];
    if (!x || !y) continue;
    // Über `"open" in` statt `closed`-Verengung: Die Wurzel-tsconfig läuft ohne
    // strict, dort verengt TypeScript die Union an `closed` nicht zuverlässig.
    const xZeit = "open" in x ? `${x.open}-${x.close}` : "zu";
    const yZeit = "open" in y ? `${y.open}-${y.close}` : "zu";
    if (x.closed !== y.closed || xZeit !== yZeit) anders.push(tag);
  }
  return anders;
}

const TAG_KURZ: Record<Day, string> = {
  monday: "Mo",
  tuesday: "Di",
  wednesday: "Mi",
  thursday: "Do",
  friday: "Fr",
  saturday: "Sa",
  sunday: "So",
};

function sterne(wert: number): string {
  return `${wert.toFixed(1).replace(".", ",")}★`;
}

/* ── Vom Snapshot zum Dataset ───────────────────────────────────────────── */

/**
 * Das normalisierte Dataset, auf dem `presenceScore` rechnet.
 *
 * Bewertungen: die fünf von Places, damit Aktivität und Themen etwas haben.
 * Schnitt und Anzahl kommen über `reviewSummary` aus Googles Gesamtzahl, nicht
 * aus der Fünfer-Stichprobe. Profilsignale: nur, was eine Quelle gemessen hat -
 * ohne Google-Eintrag bleiben Fotos, Öffnungszeiten, Website und Telefon
 * `undefined` und zählen weder positiv noch negativ.
 */
export function datasetAusPraesenz(s: PraesenzSnapshot): VenueDataset {
  const { google, website: gepruefteWebsite, maitr } = s;
  // Eine Seite, die nicht antwortete, zählt wie keine Seite: Sie sagt nichts über
  // Karte, Reservierung oder Instagram. ANLASS (Prüfbefund): `websiteNichtErreichbar`
  // führt alle Befunde negativ, und weil `website` gesetzt war, galt "keine
  // Reservierung" als GEMESSEN - der Score sank, und der Bericht behauptete "Weder
  // Website noch Google-Eintrag bieten eine Reservierung an", nur weil die Seite
  // beim Abruf kurz hing. Karte und Instagram stützen sich ohne lesbare Seite
  // allein auf das, was Maitr weiß - wie ohne Website.
  const website = gepruefteWebsite?.erreichbar ? gepruefteWebsite : null;

  const reviews: ReviewRecord[] = (google?.bewertungen ?? []).map((b) => ({
    id: b.id,
    source: "google",
    rating: b.rating,
    text: b.text,
    createdAt: b.createdAt,
  }));

  const aussenplaetze =
    google && typeof google.aussenplaetze === "boolean"
      ? google.aussenplaetze
      : maitr.tags.some((t) => /außenplätze|terrasse|biergarten/i.test(t))
        ? true
        : undefined;

  const profile: ProfileSignals = {
    hasMenu: maitr.hatSpeisekarte || Boolean(website?.speisekarteVerlinkt),
    hasBio: maitr.hatBeschreibung || Boolean(google?.beschreibung),
    hasInstagram: Boolean(maitr.instagram || website?.instagram),
    ...(google ? { photoCount: google.fotoAnzahl } : {}),
    ...(google ? { hasOpeningHours: Boolean(google.oeffnungszeiten) } : {}),
    ...(google ? { hasWebsite: Boolean(google.website) } : {}),
    ...(google ? { hasPhone: Boolean(google.telefon) } : {}),
    ...(aussenplaetze !== undefined ? { hasOutdoorAttribute: aussenplaetze } : {}),
    // Gemessen ist "keine Reservierung" nur, wenn eine Quelle etwas dazu sagt:
    // eine erreichbare Website (ihr fehlt ein Buchungsweg) oder Googles Attribut
    // `reservable`. Ein Google-Eintrag ohne dieses Attribut und ohne Website ist
    // keine Aussage - vorher wurde daraus ein gemessenes false samt Hebel
    // "Weder Website noch Google-Eintrag bieten eine Reservierung an".
    ...(website?.reservierung || google?.reservierbar === true
      ? { hasReservation: true }
      : website?.erreichbar || google?.reservierbar === false
        ? { hasReservation: false }
        : {}),
  };

  const unknown: ScoreFactorKey[] = ["responsiveness", "reach"];
  if (!google) unknown.push("rating", "activity");

  return {
    now: s.now,
    timezone: "Europe/Berlin",
    reviews,
    engagement: [],
    reservations: [],
    guests: [],
    profile,
    averageCheck: 0,
    ...(google && typeof google.rating === "number"
      ? { reviewSummary: { averageRating: google.rating, total: google.reviewCount } }
      : {}),
    coverage: { unknown, estimated: google ? ["activity"] : [] },
  };
}

/* ── Der Bericht ────────────────────────────────────────────────────────── */

/**
 * @param basis Das Dataset, auf dem der Score rechnet. Der Server reicht hier
 *   dasselbe herein wie ins Tagesbriefing (server/maitr/dataset.ts) - mit
 *   Google-Freigabe also die synchronisierten Bewertungen samt Antworten. So
 *   zeigen Start-Kachel und Profil-Check denselben Score, statt zwei Rechnungen
 *   über zwei Datenlagen. Ohne `basis` rechnet der Bericht allein aus dem Snapshot.
 */
export function praesenzBericht(s: PraesenzSnapshot, basis?: VenueDataset): PraesenzBericht {
  const { google, website, maitr } = s;
  const dataset = basis ?? datasetAusPraesenz(s);
  const ergebnis = presenceScore(dataset);
  const faktor = (key: ScoreFactorKey) => ergebnis.factors.find((f) => f.key === key)!;
  const measured = ergebnis.coverage.measuredWeight;

  const themen = extractThemes(dataset.reviews);
  const juengste = dataset.reviews
    .map((r) => r.createdAt)
    .sort((a, b) => Date.parse(b) - Date.parse(a))[0];

  /* ── Hebel ── */
  const status: PraesenzHebel[] = [];
  const hebel: PraesenzHebel[] = [];

  if (s.googleStatus === "nicht_gefunden") {
    status.push({
      id: "google_nicht_gefunden",
      titel: "Bei Google Maps nicht gefunden",
      detail:
        "Ohne Unternehmensprofil fehlen Bewertungen, Fotos und Öffnungszeiten dort, wo die meisten Gäste zuerst suchen. Lege dein Profil an - oder prüfe, ob Name und Adresse bei Google anders lauten.",
      punkte: 0,
      quelle: "google",
      url: GOOGLE_PROFIL_URL,
    });
  }

  if (google && google.status !== "OPERATIONAL" && google.status !== "UNBEKANNT") {
    status.push({
      id: "google_geschlossen",
      titel:
        google.status === "CLOSED_PERMANENTLY"
          ? "Google zeigt deinen Betrieb als dauerhaft geschlossen"
          : "Google zeigt deinen Betrieb als vorübergehend geschlossen",
      detail: "Gäste sehen das vor jeder Bewertung. Wenn das nicht stimmt, korrigiere es im Unternehmensprofil.",
      punkte: 0,
      quelle: "google",
      url: google.mapsUrl ?? GOOGLE_PROFIL_URL,
    });
  }

  // Bewertungsschnitt
  const rating = faktor("rating");
  if (google && rating.status !== "unbekannt" && rating.openPoints > 0) {
    const kritisch = themen.filter((t) => t.sentiment !== "positiv").map((t) => t.topic);
    hebel.push({
      id: "rating",
      titel:
        google.reviewCount === 0
          ? "Erste Google-Bewertungen sammeln"
          : `Bewertungsschnitt ${sterne(google.rating ?? 0)} anheben`,
      detail:
        google.reviewCount === 0
          ? "Noch keine Bewertung bei Google. Bitte die nächsten zufriedenen Gäste direkt um eine - die ersten fünf zählen am meisten."
          : kritisch.length
            ? `Gäste erwähnen kritisch: ${kritisch.join(", ")}. Hier liegt dein nächster Stern.`
            : `${google.reviewCount} Bewertungen. Jede neue 5★-Bewertung zieht den Schnitt nach oben - bitte zufriedene Stammgäste darum.`,
      punkte: rating.openPoints,
      quelle: "google",
      url: google.mapsUrl,
    });
  }

  // Aktivität (geschätzt aus den fünf gezeigten Bewertungen)
  const activity = faktor("activity");
  if (google && activity.status !== "unbekannt" && activity.openPoints > 0) {
    const alter = juengste ? daysBetween(s.now, juengste) : null;
    hebel.push({
      id: "activity",
      titel: "Frische Bewertungen sammeln",
      detail:
        alter !== null
          ? `Die neueste der gezeigten Bewertungen ist ${alter} Tage alt. Vier Bewertungen im Monat gelten als aktiv.`
          : "Google zeigt keine aktuelle Bewertung. Vier Bewertungen im Monat gelten als aktiv.",
      punkte: activity.openPoints,
      quelle: "google",
      url: google.mapsUrl,
    });
  }

  // Vollständigkeit - je fehlendem Signal ein eigener Hebel mit seinem Anteil.
  const completeness = faktor("completeness");
  const p = dataset.profile;
  const gemessen = [
    p.hasMenu,
    p.hasHolidayHours,
    p.hasOutdoorAttribute,
    p.hasBio,
    typeof p.photoCount === "number" ? p.photoCount >= 5 : undefined,
    p.hasOpeningHours,
    p.hasWebsite,
    p.hasPhone,
    p.hasInstagram,
    p.hasReservation,
  ].filter((f) => typeof f === "boolean").length;
  const proSignal =
    gemessen > 0 && measured > 0 ? round(((completeness.weight / measured) * 100) / gemessen) : 0;

  if (!p.hasMenu) {
    hebel.push({
      id: "menu",
      titel: "Speisekarte hinterlegen",
      // Kein Versprechen, dass eine in der App angelegte Karte auf der Web-App
      // erscheint: Die App speichert Gerichte bisher nur auf dem Gerät, die
      // Karte der Web-App entsteht im Konfigurator (businessProfil.ts).
      detail: "53 % der Gäste schauen vorab in die Karte. Hinterlege sie im Konfigurator deiner Web-App - dann sehen Gäste sie online.",
      punkte: proSignal,
      quelle: "maitr",
      route: "/speisekarte",
    });
  }
  if (!p.hasBio) {
    hebel.push({
      id: "bio",
      titel: "Beschreibung ergänzen",
      detail: "Zwei, drei Sätze, was deinen Betrieb ausmacht - für Gastprofil und Google.",
      punkte: proSignal,
      quelle: "maitr",
      route: "/profil",
    });
  }
  if (google && typeof p.photoCount === "number" && p.photoCount < 5) {
    hebel.push({
      id: "photos",
      titel: "5 aktuelle Fotos bei Google",
      detail: `Google zeigt ${p.photoCount === 1 ? "ein Foto" : `${p.photoCount} Fotos`}. Profile mit fünf und mehr Fotos bekommen deutlich mehr Routenanfragen.`,
      punkte: proSignal,
      quelle: "google",
      url: google.mapsUrl ?? GOOGLE_PROFIL_URL,
    });
  }
  if (google && p.hasOpeningHours === false) {
    hebel.push({
      id: "hours",
      titel: "Öffnungszeiten bei Google eintragen",
      detail: "Fehlende Zeiten sind Grund Nr. 1 für 1★-Bewertungen - Gäste stehen vor verschlossener Tür.",
      punkte: proSignal,
      quelle: "google",
      url: google.mapsUrl ?? GOOGLE_PROFIL_URL,
    });
  }
  if (google && p.hasWebsite === false) {
    hebel.push({
      id: "website",
      titel: "Website bei Google hinterlegen",
      detail: maitr.website
        ? `Trage ${maitr.website} im Unternehmensprofil ein - dann führt der Website-Knopf zu deiner Karte und Reservierung.`
        : "Ohne Website-Link bei Google endet die Suche der Gäste bei der Konkurrenz.",
      punkte: proSignal,
      quelle: "google",
      url: google.mapsUrl ?? GOOGLE_PROFIL_URL,
    });
  }
  if (google && p.hasPhone === false) {
    hebel.push({
      id: "phone",
      titel: "Telefonnummer bei Google hinterlegen",
      detail: "Der Anruf-Knopf ist auf dem Handy der kürzeste Weg zur Reservierung.",
      punkte: proSignal,
      quelle: "google",
      url: google.mapsUrl ?? GOOGLE_PROFIL_URL,
    });
  }
  if (p.hasOutdoorAttribute === false) {
    hebel.push({
      id: "outdoor",
      titel: "Attribut „Außenplätze“ prüfen",
      detail: "Jeder 3. Gast filtert nach Terrasse. Wenn du draußen Plätze hast, setze das Attribut bei Google.",
      punkte: proSignal,
      quelle: "google",
      url: google?.mapsUrl ?? GOOGLE_PROFIL_URL,
    });
  }
  if (p.hasInstagram === false) {
    hebel.push({
      id: "instagram",
      titel: "Instagram verlinken",
      detail: "Weder dein Maitr-Profil noch deine Website nennen ein Instagram-Konto.",
      punkte: proSignal,
      quelle: "maitr",
      route: "/kanaele",
    });
  }
  if (p.hasReservation === false) {
    hebel.push({
      id: "reservation",
      titel: "Online-Reservierung anbieten",
      detail: "Weder Website noch Google-Eintrag bieten eine Reservierung an. Deine Maitr-Web-App bringt eine mit - verlinke sie.",
      punkte: proSignal,
      quelle: "website",
      route: "/tische",
    });
  }

  // Google und Maitr widersprechen sich bei den Zeiten - kein Punktehebel, aber
  // der teuerste Fehler, den ein Gast erlebt.
  const abweichend = oeffnungszeitenWeichenAb(google?.oeffnungszeiten, maitr.oeffnungszeiten);
  if (abweichend.length) {
    hebel.push({
      id: "hours_diff",
      titel: "Öffnungszeiten weichen ab",
      detail: `Google und Maitr nennen für ${abweichend.map((t) => TAG_KURZ[t]).join(", ")} andere Zeiten. Eine Fassung muss falsch sein - prüfe beide.`,
      punkte: 0,
      quelle: "google",
      route: "/profil",
    });
  }

  hebel.sort((a, b) => b.punkte - a.punkte);

  /* ── Website-Befunde ── */
  const websiteBefunde: WebsiteBefund[] = [];
  if (website) {
    websiteBefunde.push({
      id: "erreichbar",
      titel: "Website erreichbar",
      ok: website.erreichbar,
      detail: website.erreichbar ? website.url : (website.fehler ?? "Nicht erreichbar"),
    });
    if (website.erreichbar) {
      websiteBefunde.push(
        {
          id: "https",
          titel: "Verschlüsselt (HTTPS)",
          ok: website.https,
          detail: website.https ? undefined : "Browser warnen vor unverschlüsselten Seiten.",
        },
        {
          id: "mobil",
          titel: "Mobil lesbar",
          ok: website.mobilTauglich,
          detail: website.mobilTauglich ? undefined : "Kein Viewport - auf dem Handy erscheint die Seite winzig.",
        },
        { id: "titel", titel: "Seitentitel gesetzt", ok: Boolean(website.titel), detail: website.titel },
        {
          id: "schema",
          titel: "Strukturierte Daten (schema.org)",
          ok: website.strukturierteDaten,
          detail: website.strukturierteDaten
            ? undefined
            : "Google liest Adresse und Öffnungszeiten daraus - ohne sie rät es.",
        },
        {
          id: "menu",
          titel: "Speisekarte auffindbar",
          ok: website.speisekarteVerlinkt,
          detail: website.speisekarteVerlinkt ? undefined : "Kein Speisekarten-Link auf der Startseite gefunden.",
        },
        {
          id: "reservation",
          titel: "Online-Reservierung",
          ok: Boolean(website.reservierung),
          detail: website.reservierung ? `über ${website.reservierung.anbieter}` : "Kein Reservierungsweg auf der Seite.",
        },
        {
          id: "hours",
          titel: "Öffnungszeiten auf der Seite",
          ok: website.oeffnungszeitenGefunden,
        },
        { id: "address", titel: "Adresse auf der Seite", ok: website.adresseGefunden },
        {
          id: "instagram",
          titel: "Instagram verlinkt",
          ok: Boolean(website.instagram),
          detail: website.instagram,
        },
      );
    }
  }

  /* ── Deckung ── */
  const hinweisTeile: string[] = [];
  if (s.googleStatus === "kein_schluessel" || s.googleStatus === "ausstehend") {
    hinweisTeile.push("Google-Daten sind noch nicht abgerufen.");
  } else if (s.googleStatus === "fehler") {
    hinweisTeile.push("Der Google-Abruf ist fehlgeschlagen.");
  } else if (s.googleStatus === "nicht_gefunden") {
    hinweisTeile.push("Bei Google Maps wurde kein passender Eintrag gefunden.");
  }
  if (ergebnis.coverage.unknown.includes("responsiveness") || ergebnis.coverage.unknown.includes("reach")) {
    hinweisTeile.push("Antwortquote und Reichweite kommen erst mit der Google-Freigabe dazu.");
  }
  const bekannt = ergebnis.factors.filter((f) => f.status !== "unbekannt").length;
  hinweisTeile.unshift(`Beruht auf ${bekannt} von ${ergebnis.factors.length} Faktoren.`);

  return {
    score: ergebnis.score,
    faktoren: ergebnis.factors,
    deckung: {
      gemessen: measured,
      unbekannt: ergebnis.coverage.unknown,
      geschaetzt: ergebnis.coverage.estimated,
      hinweis: hinweisTeile.join(" "),
    },
    hebel: [...status, ...hebel],
    websiteBefunde,
    bewertungen: {
      schnitt: google && typeof google.rating === "number" ? google.rating : null,
      anzahl: google?.reviewCount ?? 0,
      themen,
      ...(juengste ? { juengste } : {}),
    },
  };
}
