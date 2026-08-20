import { request } from "../http";
import type {
  CreateVenueInput,
  DailyBriefing,
  DailyTask,
  Iso8601,
  Reservation,
  ServiceDay,
  UpdateVenueInput,
  Venue,
} from "../types";
import type { ProviderId } from "../integrations";

/**
 * Endpunkt-Wrapper. Dünne Schicht über `request()` - keine UI-Logik, kein State.
 * Web und Mobile rufen dieselben Funktionen auf.
 */

/**
 * Kennungen im Pfad IMMER kodieren.
 *
 * Die Kennungen sind heute uuids, in denen kein Sonderzeichen vorkommt - deshalb
 * fiel es nicht auf. Sie kommen aber aus einer Serverantwort und nicht aus einer
 * Konstanten: ein `/` oder `?` darin verschöbe den Aufruf auf eine andere Route
 * oder hängte einen Query-Parameter an, und das fiele erst im Betrieb auf.
 */
function teil(wert: string): string {
  return encodeURIComponent(wert);
}

/**
 * Betriebs- und Integrationspfade an EINER Stelle - und damit prüfbar.
 *
 * Derselbe Anlass wie bei `LOYALTY_PFADE` weiter unten: Pfade sind schlichte
 * Zeichenketten, weder Typecheck noch Build noch Testlauf bemerken einen
 * Tippfehler darin. `server/__tests__/apiContract.spec.ts` prüfte bisher nur
 * `API_PATHS` (`client/lib/apiPaths.ts`) und `LOYALTY_PFADE` - die Pfade von
 * `venues.update`, `integrations.list` und `integrations.connectUrl` standen
 * roh im Funktionsrumpf und fielen durchs Netz: ein Vertipper wäre typgrün,
 * buildgrün, testgrün gewesen und erst im Betrieb ein 404. Die beiden älteren
 * Pfade (`/venues`, `/venues/:slug/public`) haben dasselbe Problem, es ist dort
 * nur noch nicht aufgefallen - deshalb stehen sie mit hier.
 *
 * Kennungen laufen durch `teil()`, aus demselben Grund wie bei `LOYALTY_PFADE`:
 * sie kommen aus einer Serverantwort oder einem Aufrufparameter, nicht aus
 * einer Konstanten. `provider` ist heute durch `ProviderId` auf "google"/"meta"
 * eingeschränkt und bräuchte das Escaping streng genommen nicht - er läuft
 * trotzdem durch `teil()`, damit diese Stelle nicht von einer Typprüfung
 * abhängt, die sich unbemerkt ändern kann.
 */
export const BETRIEB_PFADE = {
  /** Sammlung: GET (eigene Betriebe) und POST (neuen Betrieb anlegen) teilen sich den Pfad. */
  betriebe: "/venues",
  betrieb: (venueId: string) => `/venues/${teil(venueId)}`,
  oeffentlich: (slug: string) => `/venues/${teil(slug)}/public`,
  integrationen: "/integrations",
  integrationVerbinden: (provider: ProviderId) => `/integrations/${teil(provider)}/connect`,
} as const;

export const briefing = {
  /** Tagesbriefing für den Start-Screen ("Guten Morgen, Café Goldstück"). */
  today(venueId: string, signal?: AbortSignal) {
    return request<DailyBriefing>("/briefing/today", { query: { venueId }, signal });
  },

  /** Aufgabe freigeben (Bewertung antworten, Beitrag einplanen). */
  approveTask(taskId: string) {
    return request<DailyTask>(`/briefing/tasks/${taskId}/approve`, { method: "POST" });
  },

  /** Entwurf vor der Freigabe anpassen. */
  updateDraft(taskId: string, draft: string) {
    return request<DailyTask>(`/briefing/tasks/${taskId}`, {
      method: "PATCH",
      body: { draft },
    });
  },
};

export const reservations = {
  /** Tischbelegung eines Servicetags. */
  day(venueId: string, date: string, signal?: AbortSignal) {
    return request<ServiceDay>("/reservations/day", { query: { venueId, date }, signal });
  },

  create(input: {
    venueId: string;
    guestName: string;
    partySize: number;
    start: string;
    phone?: string;
  }) {
    return request<Reservation>("/reservations", { method: "POST", body: input });
  },

  /** Walk-in direkt am Tisch eintragen. */
  walkIn(input: { venueId: string; tableId: string; partySize: number }) {
    return request<Reservation>("/reservations/walk-in", { method: "POST", body: input });
  },

  cancel(reservationId: string) {
    return request<void>(`/reservations/${reservationId}`, { method: "DELETE" });
  },
};

export const venues = {
  mine() {
    return request<Venue[]>(BETRIEB_PFADE.betriebe);
  },

  /**
   * Den ersten eigenen Betrieb anlegen. Der Schritt zwischen "angemeldet" und
   * "sieht eigene Daten": Ohne Betrieb liefert `mine()` eine leere Liste und jeder
   * betriebsgebundene Aufruf endet in 403.
   *
   * Antwortet mit 201 und dem angelegten Betrieb. ZWEI Fälle, die der Aufrufer
   * behandeln sollte - beide kommen als `ApiError`:
   *  - 409: Es gibt schon einen Betrieb. Ein zweiter ist bewusst nicht möglich
   *    (Begründung an der Route in server/maitr/routes.ts). Der vorhandene liegt
   *    dann in `error.body.venue` - ein Doppeltipp muss also keine Sackgasse sein.
   *  - 422: Der Name taugt nicht als Adresse; nach einem anderen Namen fragen.
   */
  create(input: CreateVenueInput) {
    return request<Venue>(BETRIEB_PFADE.betriebe, { method: "POST", body: input });
  },

  /** Oeffentliches Gast-Profil - ohne Anmeldung erreichbar. */
  publicProfile(slug: string, signal?: AbortSignal) {
    return request<Venue>(BETRIEB_PFADE.oeffentlich(slug), { anonymous: true, signal });
  },

  /**
   * Betrieb ändern - Name, Kurzbeschreibung, Zeitzone, Öffnungszeiten. Nur die
   * geänderten Felder schicken. Antwortet mit 200 und demselben Venue-Objekt wie
   * `mine()`. Der Slug ändert sich NIE mit - siehe `UpdateVenueInput`.
   *
   * Fehlerfälle, die der Aufrufer behandeln sollte - alle kommen als `ApiError`
   * (Texte wörtlich aus `server/maitr/middleware.ts` bzw. `ownerGuard` in
   * `server/maitr/routes.ts`):
   *  - 400 `venueId fehlt`: keine Betriebskennung in Pfad, Query oder Rumpf
   *    (`requireVenueAccess`).
   *  - 400 `Widersprüchliche venueId in Pfad, Query und Rumpf`: die genannten
   *    Kennungen stimmen nicht überein (`requireVenueAccess`).
   *  - 403 `Kein Zugriff auf diesen Betrieb`: der Anfragende ist kein Mitglied
   *    dieses Betriebs (`requireVenueAccess`).
   *  - 403 `nur_inhaber`: Mitglied, aber Personal - nur Inhaber oder Admin
   *    dürfen den Betrieb ändern (`ownerGuard`).
   *  - 422: Eingabe ungültig (z. B. unbekannte Zeitzone, Name zu kurz).
   */
  update(venueId: string, patch: UpdateVenueInput) {
    return request<Venue>(BETRIEB_PFADE.betrieb(venueId), { method: "PATCH", body: patch });
  },
};

/* ── Integrationen (Kanäle verbinden) ────────────────────────────────────── */

/**
 * Form von `GET /integrations`. Bewusst HIER beschrieben und nicht aus dem
 * Server importiert - derselbe Grund wie bei den Stempelkarten-Typen weiter
 * unten: `packages/core` ist die gemeinsame Sprache von Web und Mobile und darf
 * nicht auf `server/` zeigen.
 *
 * `provider` kommt in GROSSSCHREIBUNG ("GOOGLE"/"META"/"WHATSAPP") - so
 * speichert und liefert der Server ihn (Prisma-Enum `ChannelProvider`,
 * ausgeliefert vom Handler von `integrationsRouter.get("/")` in
 * server/maitr/routes.ts). Das ist eine ANDERE Schreibweise als `ProviderId`
 * ("google"/"meta") aus `../integrations`: jene steuert die OAuth-Bausteine
 * (Autorisierungs-URL, Scopes) und kennt WhatsApp nicht - dafür gibt es keinen
 * eigenen Consent-Screen. Diese Form hier ist der gespeicherte
 * Verbindungszustand und listet JEDE `ChannelConnection` des Betriebs, auch
 * WHATSAPP-Zeilen: die Route filtert nicht nach Provider (siehe
 * server/maitr/sync.ts und server/__tests__/maitrSyncWhatsApp.spec.ts, wo genau
 * das schon einmal übersehen wurde). Tokens sind bewusst nicht Teil der Form -
 * der Server liefert sie nie aus.
 */
export interface IntegrationConnection {
  provider: "GOOGLE" | "META" | "WHATSAPP";
  accountId: string;
  status: "ACTIVE" | "EXPIRED" | "REVOKED";
  expiresAt: Iso8601;
  scopes: string[];
}

export const integrations = {
  /**
   * Verbundene Kanäle eines Betriebs. Leeres Array = noch nichts verbunden.
   *
   * Kann `provider: "WHATSAPP"`-Zeilen enthalten, auch ohne eigenen
   * Connect-Fluss dafür - die Route liefert jede `ChannelConnection` des
   * Betriebs ungefiltert aus. Ein Aufrufer, der nur "GOOGLE" und "META"
   * unterscheidet, behandelt eine WhatsApp-Zeile sonst still als Meta-Zeile.
   */
  list(venueId: string, signal?: AbortSignal) {
    return request<IntegrationConnection[]>(BETRIEB_PFADE.integrationen, { query: { venueId }, signal });
  },

  /**
   * Autorisierungs-URL für den OAuth-Consent-Screen des Anbieters. `provider`
   * kleingeschrieben ("google"/"meta") - so verlangt es die Route.
   *
   * Liefert NUR die URL. Ob danach wirklich eine Verbindung entsteht, sagt
   * allein `list()` - der Rücksprung nach dem Consent-Screen läuft serverseitig
   * über den Deep-Link zurück in die App, nicht über diesen Aufruf.
   */
  connectUrl(venueId: string, provider: ProviderId, signal?: AbortSignal) {
    return request<{ url: string }>(BETRIEB_PFADE.integrationVerbinden(provider), {
      query: { venueId },
      signal,
    });
  },
};

/* ── Stempelkarte ────────────────────────────────────────────────────────── */

/**
 * Die Formen der Stempelkarten-API. Bewusst HIER beschrieben und nicht aus dem
 * Server importiert - `packages/core` ist die gemeinsame Sprache von Web und Mobile
 * und darf nicht auf `server/` zeigen.
 *
 * Zur Vollständigkeit gehört, was NICHT hier steht: es gibt keinen `notify`- und
 * keinen `broadcast`-Aufruf. Der Apple-Wallet-Push trägt keinen Text (er sagt dem
 * Gerät nur "hol den Pass neu"), Google kennt für den hier verwendeten Passtyp
 * keinen Benachrichtigungsschalter, und der Gast hat keine App. Ein Sendeknopf wäre
 * eine Zusage, die kein Kanal einlöst - deshalb existiert er auch nicht als
 * deaktivierter Knopf.
 */
export interface StampProgram {
  id: string;
  name: string;
  maxStamps: number;
  rewardText: string;
  isActive: boolean;
  cooldownSeconds: number;
  /** `null` = die Karte verfällt nie. */
  validityDays: number | null;
  /** Abgeleitet; die Wallet-Kennungen selbst gehen nie über die Grenze. */
  walletStatus: { apple: boolean; google: boolean };
}

/** Zustand des SERVERS, nicht des Programms: was für Wallet-Pässe noch fehlt. */
export interface WalletBereitschaft {
  /** Die Apple-Zugangsdaten sind hinterlegt. NICHT: "es gibt Pässe". */
  apple: boolean;
  google: boolean;
  ready: boolean;
  missing: string[];
  /**
   * Baut der Server überhaupt schon Wallet-Pässe? Heute: nein.
   *
   * Zwei Dimensionen, und der Bildschirm kannte nur eine. `apple: true` heisst
   * ausschliesslich, dass die Umgebungsvariablen parsen - es gibt im Repo weder
   * Passbau noch APNs-Client. Ohne dieses Feld stand am Bildschirm "Apple Wallet:
   * eingerichtet" und "iPhone-Gäste sehen den neuen Stand", während auf keinem
   * Gerät je ein Pass lag.
   *
   * Optional getippt, weil ein älterer Server das Feld nicht mitschickt; fehlt es,
   * behandelt der Bildschirm es wie `false` - die vorsichtigere Richtung.
   */
  passausgabeGebaut?: boolean;
}

/** Rolle des Anfragenden im Betrieb. Bestimmt, welche Knöpfe der Server einlöst. */
export type VenueRolle = "OWNER" | "STAFF" | "ADMIN";

export interface StampGuest {
  id: string;
  /** Bei anonymisierten Gästen serverseitig durch "Gelöschter Gast" ersetzt. */
  anzeigename: string;
  geloescht: boolean;
  istBeispiel: boolean;
}

export interface StampCardRow {
  id: string;
  stand: { current: number; max: number };
  status: "ACTIVE" | "COMPLETED" | "REDEEMED" | "EXPIRED" | "VOIDED";
  cycle: number;
  letzterStempelAt: string | null;
  gast: StampGuest;
}

export interface StampCardDetail {
  id: string;
  programId: string;
  /** Aus dem Hauptbuch gerechnet - das Detail ist die Ansicht im Streitfall. */
  stand: { current: number; max: number };
  cacheStand: number;
  status: StampCardRow["status"];
  cycle: number;
  redeemedCount: number;
  rewardText: string;
  rewardTextQuelle: "karte" | "programm";
  ausgegebenAm: string;
  gueltigBis: string | null;
  vollSeit: string | null;
  eingeloestAm: string | null;
  gast: StampGuest;
  walletGeraete: number;
}

export interface StampEventRow {
  id: string;
  createdAt: string;
  kind: "EARNED" | "REDEEMED" | "CORRECTION" | "VOIDED";
  delta: number;
  balanceAfter: number;
  source: "QR_SCAN" | "MANUAL" | "IMPORT" | "MOCK";
  /** `null` = nicht mehr zuordenbar (Konto des Mitarbeiters gelöscht). */
  staffName: string | null;
  deviceLabel: string | null;
  note: string | null;
}

export interface StampOverview {
  gesamt: number;
  aktiv: number;
  /**
   * Karten, die noch ein offenes Versprechen tragen (ACTIVE **und** COMPLETED).
   *
   * Genau die Menge, in die der Server bei einer Prämienänderung den alten Text
   * festschreibt. Der Bildschirm warnt mit dieser Zahl - vorher stand dort `aktiv`,
   * und die volle Karte des Gastes, der morgen seinen Kaffee abholt, fehlte in der
   * Warnung, die es für sie gibt. `aktiv + voll` ist kein Ersatz: `voll` kommt aus
   * dem Hauptbuch, `aktiv` aus dem Status, eine Karte kann in beiden stehen.
   */
  offeneKarten: number;
  fastVoll: number;
  voll: number;
  eingeschlafen: number;
  /** GÄSTE mit mehr als einer Karte - nicht die Zahl der Folgekarten. */
  wiederkommer: number;
  eingeloest30d: number;
  medianTageBisVoll: number | null;
  walletRegistrierteKarten: number;
  cacheAbweichungen: number;
}

/** Was eine Programmänderung tatsächlich bewirkt hat - mit echten Zahlen. */
export interface StampWirkung {
  laufendeKarten: number;
  praemieFestgeschrieben: number;
  sofortWirksam: Array<"cooldownSeconds">;
  nurFuerNeueKarten: Array<"maxStamps" | "rewardText" | "validityDays">;
}

export type StampCardFilter = "alle" | "fastvoll" | "voll" | "eingeschlafen";

/**
 * Die zwölf Pfade der Stempelkarte an EINER Stelle - und damit prüfbar.
 *
 * Anlass ist derselbe wie bei `client/lib/apiPaths.ts`: Pfade sind schlicht
 * Zeichenketten, und weder Typecheck noch Build noch Testlauf bemerken einen
 * Tippfehler darin. Der Vertragstest (`server/__tests__/apiContract.spec.ts`) prüfte
 * bisher NUR die Weboberfläche; Mobile und `packages/core` hatten ihre Pfade roh im
 * Funktionsrumpf stehen und waren davon nicht gedeckt. Ein Vertipper wäre erst im
 * Betrieb aufgefallen.
 *
 * Die Kennungen laufen durch `teil()`: sie kommen aus einer Serverantwort, nicht aus
 * einer Konstanten, und ein `/` darin verschöbe den Aufruf auf eine andere Route.
 */
export const LOYALTY_PFADE = {
  programm: "/loyalty/program",
  programmMitId: (programId: string) => `/loyalty/program/${teil(programId)}`,
  uebersicht: (programId: string) => `/loyalty/program/${teil(programId)}/overview`,
  kartenListe: (programId: string) => `/loyalty/program/${teil(programId)}/cards`,
  karten: "/loyalty/cards",
  karte: (cardId: string) => `/loyalty/cards/${teil(cardId)}`,
  ereignisse: (cardId: string) => `/loyalty/cards/${teil(cardId)}/events`,
  gastLink: (cardId: string) => `/loyalty/cards/${teil(cardId)}/gast-link`,
  stempeln: (cardId: string) => `/loyalty/cards/${teil(cardId)}/stamps`,
  einloesen: (cardId: string) => `/loyalty/cards/${teil(cardId)}/redeem`,
  entwerten: (cardId: string) => `/loyalty/cards/${teil(cardId)}/void`,
  gastAnonymisieren: (guestId: string) => `/loyalty/guests/${teil(guestId)}/anonymize`,
} as const;

/**
 * Push-Registrierung der Betreiber-App. Das Token gehört dem Konto, nicht
 * einem Betrieb — deshalb ohne venueId. Registrieren ist idempotent (Upsert).
 */
export const push = {
  register(input: { token: string; platform?: "ios" | "android" }) {
    return request<void>("/push/register", { method: "POST", body: input });
  },
  unregister(input: { token: string }) {
    return request<void>("/push/unregister", { method: "POST", body: input });
  },
};

export const loyalty = {
  /** Programm, Wallet-Zustand und die eigene Rolle. `program: null` = noch nichts eingerichtet. */
  program(venueId: string, signal?: AbortSignal) {
    return request<{
      program: StampProgram | null;
      wallet: WalletBereitschaft;
      /** Fehlt bei einem älteren Server; der Bildschirm behandelt das als "STAFF". */
      rolle?: VenueRolle;
    }>(LOYALTY_PFADE.programm, { query: { venueId }, signal });
  },

  /**
   * Programm anlegen. 409 `programm_existiert_bereits`, wenn es schon eines gibt -
   * das vorhandene liegt dann in `error.body.program`.
   */
  createProgram(input: {
    venueId: string;
    name: string;
    maxStamps: number;
    rewardText: string;
    cooldownSeconds: number;
    validityDays: number | null;
    isActive: boolean;
  }) {
    return request<{ program: StampProgram }>(LOYALTY_PFADE.programm, {
      method: "POST",
      body: input,
    });
  },

  /**
   * Programm ändern. Nur die geänderten Felder schicken.
   *
   * Die Antwort trägt `wirkung` - damit der Bildschirm nach dem Speichern sagen
   * kann, was tatsächlich passiert ist: wie viele Karten laufen, in wie viele davon
   * der ALTE Prämientext festgeschrieben wurde (damit niemand rückwirkend eine
   * andere Zusage bekommt) und welche Felder erst für neue Karten gelten.
   */
  updateProgram(
    programId: string,
    input: Partial<{
      venueId: string;
      name: string;
      maxStamps: number;
      rewardText: string;
      cooldownSeconds: number;
      validityDays: number | null;
      isActive: boolean;
    }>,
  ) {
    return request<{ program: StampProgram; wirkung: StampWirkung }>(
      LOYALTY_PFADE.programmMitId(programId),
      { method: "PATCH", body: input },
    );
  },

  overview(venueId: string, programId: string, signal?: AbortSignal) {
    return request<StampOverview>(LOYALTY_PFADE.uebersicht(programId), {
      query: { venueId },
      signal,
    });
  },

  cards(
    venueId: string,
    programId: string,
    optionen: { filter?: StampCardFilter; cursor?: string; limit?: number } = {},
    signal?: AbortSignal,
  ) {
    return request<{ items: StampCardRow[]; nextCursor: string | null; abgeschnitten: boolean }>(
      LOYALTY_PFADE.kartenListe(programId),
      {
        query: {
          venueId,
          filter: optionen.filter ?? "alle",
          ...(optionen.cursor ? { cursor: optionen.cursor } : {}),
          ...(optionen.limit ? { limit: String(optionen.limit) } : {}),
        },
        signal,
      },
    );
  },

  card(venueId: string, cardId: string, signal?: AbortSignal) {
    return request<StampCardDetail>(LOYALTY_PFADE.karte(cardId), { query: { venueId }, signal });
  },

  /**
   * Teilbarer Gast-Link der Karte (signierte URL für QR/Teilen-Dialog).
   * 503, wenn der Server kein Link-Secret konfiguriert hat.
   */
  guestLink(venueId: string, cardId: string) {
    return request<{ url: string }>(LOYALTY_PFADE.gastLink(cardId), {
      query: { venueId },
    });
  },

  events(venueId: string, cardId: string, limit?: number, signal?: AbortSignal) {
    return request<{ items: StampEventRow[] }>(LOYALTY_PFADE.ereignisse(cardId), {
      query: { venueId, ...(limit ? { limit: String(limit) } : {}) },
      signal,
    });
  },

  /** Karte ausgeben - für einen bekannten Gast ODER einen neu erfassten, nie beides. */
  issueCard(input: { venueId: string; guestId?: string; gast?: { name: string; phone?: string } }) {
    return request<{ karte: StampCardDetail }>(LOYALTY_PFADE.karten, { method: "POST", body: input });
  },

  /**
   * Stempeln. `idempotencyKey` muss vom Gerät kommen und bei einem Wiederholversuch
   * DERSELBE sein - dann antwortet der Server 200 mit `wiederholung: true` statt ein
   * zweites Mal zu buchen. Ein neuer Schlüssel je Tipp hebt den Schutz auf.
   *
   * 409 `sperrfrist` trägt `frueheste` (ISO): so lange gilt "ein Stempel pro Besuch".
   */
  stamp(cardId: string, input: { venueId: string; idempotencyKey: string; note?: string; deviceLabel?: string }) {
    return request<{ karte: StampCardDetail; wiederholung: boolean }>(
      LOYALTY_PFADE.stempeln(cardId),
      { method: "POST", body: input },
    );
  },

  redeem(cardId: string, input: { venueId: string; idempotencyKey: string; note?: string }) {
    return request<{ karte: StampCardDetail; wiederholung: boolean }>(
      LOYALTY_PFADE.einloesen(cardId),
      { method: "POST", body: input },
    );
  },

  /** UNUMKEHRBAR. Gehört hinter eine Rückfrage mit Grund, nicht in eine Liste. */
  voidCard(cardId: string, input: { venueId: string; grund: string }) {
    return request<{ karte: StampCardDetail; wiederholung: boolean }>(
      LOYALTY_PFADE.entwerten(cardId),
      { method: "POST", body: input },
    );
  },

  /**
   * "Daten dieses Gastes löschen" = Anonymisierung. Karten und Hauptbuch bleiben
   * stehen; sie gehören dem Betrieb und sind sein Nachweis im Streit- und
   * Missbrauchsfall. Ein echtes Löschen gibt es bewusst nicht.
   */
  anonymizeGuest(guestId: string, input: { venueId: string }) {
    return request<void>(LOYALTY_PFADE.gastAnonymisieren(guestId), { method: "POST", body: input });
  },
};

export { ApiError } from "../http";
