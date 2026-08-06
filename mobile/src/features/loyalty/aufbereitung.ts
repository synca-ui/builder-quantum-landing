import type {
  StampCardRow,
  StampEventRow,
  StampOverview,
  StampProgram,
  WalletBereitschaft,
} from "@maitr/core";

/**
 * Die Rechen- und Textarbeit des Stempelkarten-Bildschirms - als reine Funktionen,
 * ohne React und ohne react-native.
 *
 * Der Grund ist nicht Ordnungsliebe: im Repo gibt es keinen Testaufbau für
 * React-Native-Bildschirme (kein react-test-renderer, kein jest-expo, vitest läuft
 * in jsdom). Was hier steht, ist damit das Einzige, was sich prüfen LÄSST - und es
 * ist genau der Teil, in dem ein Fehler dem Wirt eine falsche Zahl oder eine falsche
 * Zusage anzeigt. Alles, was hier hineinpasst, gehört deshalb hierher und nicht in
 * den Bildschirm.
 */

/* ── Formular ────────────────────────────────────────────────────────────── */

export interface ProgrammEntwurf {
  name: string;
  maxStamps: number;
  rewardText: string;
  cooldownSeconds: number;
  /** `null` = die Karte verfällt nie. */
  validityDays: number | null;
  isActive: boolean;
}

/** Die sechs Felder in der Reihenfolge, in der sie im Bildschirm stehen. */
export type ProgrammFeld = keyof ProgrammEntwurf;

/**
 * 60 Zeichen, weil der Text auf dem Wallet-Pass steht und Wallet Längeres
 * kommentarlos abschneidet - der Gast läse dann eine andere Zusage als der Wirt
 * eingegeben hat. Muss zur Zod-Grenze im Server passen (server/maitr/routes.ts).
 */
export const PRAEMIE_MAX = 60;
export const NAME_MAX = 60;

/**
 * Vorschlagswerte für das Einrichtungsformular.
 *
 * `validityDays: null` ("nie") ist bewusst gesetzt und keine Bequemlichkeit:
 * verfallende Sammelstände sind in Deutschland rechtlich ungeklärt. Solange das
 * niemand entschieden hat, ist "nie" der einzige Vorschlag, der keine Zusage bricht.
 *
 * `rewardText` bleibt leer - er ist das einzige Pflichtfeld, das nur der Wirt
 * beantworten kann. Ein Vorschlag ("1x Kaffee gratis") stünde sonst nach zwei Tipps
 * als echte Zusage auf der Karte eines Gastes.
 */
export const VORSCHLAG: ProgrammEntwurf = {
  name: "Stempelkarte",
  maxStamps: 10,
  rewardText: "",
  cooldownSeconds: 3600,
  validityDays: null,
  isActive: true,
};

/** Kein freies Zahlenfeld: 5/8/10/12 sind die Werte, die am Tresen vorkommen. */
export const STEMPEL_OPTIONEN = [5, 8, 10, 12] as const;

/**
 * Kein freies Sekundenfeld. 36000 statt 3600 getippt sperrt zehn Stunden und fällt
 * niemandem auf - der Gast bekäme den ganzen Tag keinen zweiten Stempel und niemand
 * wüsste warum.
 */
export const SPERRFRIST_OPTIONEN: { wert: number; label: string }[] = [
  { wert: 1800, label: "30 Min." },
  { wert: 3600, label: "1 Std." },
  { wert: 14_400, label: "4 Std." },
  { wert: 86_400, label: "1 Tag" },
  { wert: 0, label: "aus" },
];

export const GUELTIGKEIT_OPTIONEN: { wert: number | null; label: string }[] = [
  { wert: null, label: "nie" },
  { wert: 180, label: "180 Tage" },
  { wert: 365, label: "365 Tage" },
];

export function entwurfAusProgramm(programm: StampProgram): ProgrammEntwurf {
  return {
    name: programm.name,
    maxStamps: programm.maxStamps,
    rewardText: programm.rewardText,
    cooldownSeconds: programm.cooldownSeconds,
    validityDays: programm.validityDays,
    isActive: programm.isActive,
  };
}

/**
 * Was sich gegenüber dem gespeicherten Programm geändert hat.
 *
 * Zwei Zwecke: der Speichern-Knopf bleibt still, solange nichts anders ist, und der
 * PATCH schickt nur die geänderten Felder - sonst schriebe ein Öffnen-und-Speichern
 * ohne Absicht denselben Prämientext neu und der Server klopfte ihn in jede laufende
 * Karte fest.
 */
export function geaenderteFelder(
  entwurf: ProgrammEntwurf,
  programm: StampProgram,
): ProgrammFeld[] {
  const alt = entwurfAusProgramm(programm);
  const felder: ProgrammFeld[] = [
    "name",
    "maxStamps",
    "rewardText",
    "cooldownSeconds",
    "validityDays",
    "isActive",
  ];
  return felder.filter((feld) => {
    // Beim Vergleich trimmen, sonst gilt ein versehentliches Leerzeichen am Ende als
    // Änderung - der Server trimmt ohnehin und schickte dieselben Zeichen zurück.
    if (feld === "name" || feld === "rewardText") {
      return String(entwurf[feld]).trim() !== String(alt[feld]).trim();
    }
    return entwurf[feld] !== alt[feld];
  });
}

/**
 * Formularprüfung, gleiche Grenzen wie das Zod-Schema des Servers. Gibt den
 * Klartext zurück, der im Bildschirm steht - `null` heißt: speicherbar.
 */
export function formularFehler(entwurf: ProgrammEntwurf): string | null {
  const name = entwurf.name.trim();
  if (name.length === 0) return "Das Programm braucht einen Namen.";
  if (name.length > NAME_MAX) return `Der Name darf höchstens ${NAME_MAX} Zeichen haben.`;

  const praemie = entwurf.rewardText.trim();
  if (praemie.length === 0) return "Trag ein, was der Gast bekommt.";
  if (praemie.length > PRAEMIE_MAX) {
    // Futur, nicht Präsens: die Grenze ist Vorsorge für den Wallet-Pass, den es
    // heute noch nicht gibt (siehe PASSAUSGABE_GEBAUT). „schneidet die Wallet ab"
    // behauptete einen Pass, der auf keinem Gerät liegt.
    return `Die Prämie darf höchstens ${PRAEMIE_MAX} Zeichen haben - länger passt später nicht auf einen Wallet-Pass.`;
  }

  if (!Number.isInteger(entwurf.maxStamps) || entwurf.maxStamps < 1 || entwurf.maxStamps > 50) {
    return "Die Zahl der Stempel liegt zwischen 1 und 50.";
  }
  return null;
}

/**
 * Was das Speichern tatsächlich bewirkt - VOR dem Speichern, mit echten Zahlen.
 *
 * Der Kern des Ganzen: die Wirkung ist asymmetrisch und man sieht sie den Feldern
 * nicht an. `maxStamps` und `validityDays` liegen als Snapshot auf der Karte und
 * rühren laufende Karten nicht an; die Sperrfrist wird bei jeder Buchung frisch aus
 * dem Programm gelesen und gilt sofort für alle. Der Wirt denkt "ab jetzt" und meint
 * damit meist beides zugleich.
 *
 * Der Prämientext ist der Sonderfall, den der Server auflöst: er schreibt beim
 * Speichern den ALTEN Text in jede laufende Karte ohne Snapshot, bevor der neue
 * gilt. Deshalb steht hier "für die laufenden Karten bleibt es bei ..." und nicht
 * die frühere, falsche Warnung "gilt rückwirkend".
 */
export function aenderungsWarnungen(
  entwurf: ProgrammEntwurf,
  programm: StampProgram,
  /**
   * OFFENE Karten - `StampOverview.offeneKarten`, nicht `aktiv`.
   *
   * Der Server schreibt den alten Prämientext in ACTIVE **und** COMPLETED. Stand
   * hier `aktiv`, nannte die Warnung eine kleinere Zahl als der Toast eine Sekunde
   * später ("für 15 laufende Karten festgehalten"), und die nicht genannten waren
   * genau die Gäste, die morgen ihren Kaffee abholen wollen - der Fall, für den die
   * ganze Snapshot-Mechanik gebaut ist.
   *
   * `null` heißt AUSDRÜCKLICH "unbekannt" - die Kennzahlen sind nicht durchgekommen.
   * Dann steht in der Warnung keine Zahl, statt hilfsweise eine 0 einzusetzen: "Es
   * läuft keine Karte" wäre in diesem Moment eine Behauptung, und genau auf sie hin
   * würde der Wirt die Prämie ändern.
   */
  offeneKarten: number | null,
): string[] {
  const geaendert = geaenderteFelder(entwurf, programm);
  const warnungen: string[] = [];
  const unbekannt = offeneKarten === null;
  const laufen = offeneKarten !== null && offeneKarten > 0;
  // „offen" und nicht „läuft": eine volle, noch nicht eingelöste Karte läuft nicht
  // mehr - sie trägt aber ein offenes Versprechen, und darum geht es hier.
  const kartenWort =
    offeneKarten === 1
      ? "1 Karte ist noch offen"
      : `${offeneKarten} Karten sind noch offen (auch die, die schon voll sind)`;

  if (geaendert.includes("maxStamps")) {
    warnungen.push(
      unbekannt
        ? `Für Karten, die schon laufen, bleibt es bei ${programm.maxStamps} Stempeln - die neue Zahl gilt erst für Karten, die ab jetzt ausgegeben werden.`
        : laufen
          ? `${kartenWort}. Für diese bleibt es bei ${programm.maxStamps} Stempeln - die neue Zahl gilt erst für Karten, die ab jetzt ausgegeben werden.`
          : "Die neue Zahl gilt für alle Karten, die ab jetzt ausgegeben werden.",
    );
  }

  if (geaendert.includes("rewardText")) {
    warnungen.push(
      unbekannt
        ? `Für Karten, die schon laufen, bleibt „${programm.rewardText}“ die Zusage - der neue Text gilt erst für Karten, die ab jetzt ausgegeben werden.`
        : laufen
          ? `${kartenWort}. Für diese bleibt „${programm.rewardText}“ die Zusage - der neue Text gilt erst für Karten, die ab jetzt ausgegeben werden.`
          : "Die neue Prämie gilt für alle Karten, die ab jetzt ausgegeben werden.",
    );
  }

  if (geaendert.includes("cooldownSeconds")) {
    warnungen.push("Die Sperrfrist gilt ab sofort für alle Karten, auch für die laufenden.");
  }

  if (geaendert.includes("validityDays")) {
    warnungen.push(
      "Die Gültigkeit betrifft nur neu ausgegebene Karten. Laufende Karten behalten ihr Datum.",
    );
  }

  if (geaendert.includes("isActive") && !entwurf.isActive) {
    warnungen.push("Es werden keine neuen Karten mehr ausgegeben. Laufende Karten bleiben gültig.");
  }

  return warnungen;
}

/* ── Anzeige ─────────────────────────────────────────────────────────────── */

/**
 * Zeitangabe in der Sprache eines Tresengesprächs. Absichtlich grob: auf die Minute
 * genaue Zeitpunkte über alle Gäste hinweg wären ein Anwesenheitsprotokoll, kein
 * Stempelstand. Der genaue Zeitpunkt steht im Kartendetail, auf Anlass geöffnet.
 */
export function relativeZeit(iso: string | null, jetzt: Date = new Date()): string {
  if (!iso) return "noch kein Stempel";
  const zeitpunkt = Date.parse(iso);
  if (Number.isNaN(zeitpunkt)) return "Zeitpunkt unbekannt";

  const minuten = Math.floor((jetzt.getTime() - zeitpunkt) / 60_000);
  if (minuten < 1) return "gerade eben";
  if (minuten < 60) return `vor ${minuten} Min.`;

  const stunden = Math.floor(minuten / 60);
  if (stunden < 24) return `vor ${stunden} Std.`;

  const tage = Math.floor(stunden / 24);
  if (tage === 1) return "gestern";
  if (tage < 30) return `vor ${tage} Tagen`;

  const monate = Math.floor(tage / 30);
  if (monate < 12) return `vor ${monate} ${monate === 1 ? "Monat" : "Monaten"}`;

  const jahre = Math.floor(monate / 12);
  return `vor ${jahre} ${jahre === 1 ? "Jahr" : "Jahren"}`;
}

/** Genauer Zeitpunkt - nur im Kartendetail, wo der Streitfall geklärt wird. */
export function genauerZeitpunkt(iso: string | null): string {
  if (!iso) return "-";
  const datum = new Date(iso);
  if (Number.isNaN(datum.getTime())) return "-";
  return datum.toLocaleString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Nur Datum - für "ausgegeben am" und "gültig bis". */
export function nurDatum(iso: string | null): string {
  if (!iso) return "-";
  const datum = new Date(iso);
  if (Number.isNaN(datum.getTime())) return "-";
  return datum.toLocaleDateString("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/**
 * Die kleine Zeile unter den drei Kacheln.
 *
 * Die mittlere Durchlaufdauer steht NUR da, wenn der Server sie geliefert hat - er
 * gibt `null` zurück, solange weniger als fünf Karten abgeschlossen sind. Bei drei
 * Karten wäre das kein Messwert, sondern Zufall, und stünde trotzdem wie einer da.
 * Der Wert ist der Median: ein Gast, der die Karte ein Jahr in der Jacke hatte,
 * verschöbe den Mittelwert komplett.
 */
export function uebersichtsZeile(uebersicht: StampOverview): string {
  // „davon" und nicht „·": `eingeschlafen` wird ausschliesslich INNERHALB der
  // ACTIVE-Karten gezählt und ist eine Teilmenge. Als zwei durch Punkt getrennte
  // Angaben las sich „12 Karten laufen · 5 eingeschlafen" wie 17 Sammler.
  const kopf =
    uebersicht.aktiv === 1
      ? `1 Karte läuft, davon ${uebersicht.eingeschlafen} eingeschlafen (30 Tage kein Stempel)`
      : `${uebersicht.aktiv} Karten laufen, davon ${uebersicht.eingeschlafen} eingeschlafen (30 Tage kein Stempel)`;
  const teile = [kopf];
  if (uebersicht.medianTageBisVoll !== null) {
    teile.push(`meist ${uebersicht.medianTageBisVoll} Tage bis voll`);
  }
  // Der Server zählt die Abweichungen ausdrücklich, damit sie "sichtbar statt still"
  // sind - gezeigt wurden sie bisher nirgends. Ohne diese Zeile erfährt der Wirt
  // davon nur, wenn er zufällig genau eine der betroffenen Karten öffnet.
  if (uebersicht.cacheAbweichungen > 0) {
    teile.push(
      uebersicht.cacheAbweichungen === 1
        ? "bei 1 Karte weicht der schnelle Zwischenstand ab - gültig ist der Verlauf"
        : `bei ${uebersicht.cacheAbweichungen} Karten weicht der schnelle Zwischenstand ab - gültig ist der Verlauf`,
    );
  }
  return teile.join(" · ");
}

/**
 * Ist diese Karte voll - also: wartet der Gast auf seine Prämie?
 *
 * AUS DEM STAND, NICHT AUS DEM STATUS. Kachel und Filter rechnen serverseitig aus
 * dem Hauptbuch (`stand >= max` bei offenem Status), Abzeichen und Knöpfe lasen
 * vorher `status === "COMPLETED"`. Bei einer Karte, deren Statusspalte hängen
 * geblieben ist - genau der Fall, gegen den das ganze Modul argumentiert -, listete
 * der Filter "Voll" sie, und im Kartendetail fehlte trotzdem der Knopf "Prämie
 * eingelöst", obwohl der Server ihn eingelöst hätte.
 *
 * Als reine Funktion, weil beide Bildschirme sie brauchen und die Antwort dieselbe
 * sein muss.
 */
export function istVoll(karte: {
  status: StampCardRow["status"];
  stand: { current: number; max: number };
}): boolean {
  const offen = karte.status === "ACTIVE" || karte.status === "COMPLETED";
  return offen && karte.stand.current >= karte.stand.max;
}

export const STATUS_TEXT: Record<StampCardRow["status"], string> = {
  ACTIVE: "läuft",
  COMPLETED: "voll",
  REDEEMED: "eingelöst",
  EXPIRED: "abgelaufen",
  VOIDED: "entwertet",
};

const EREIGNIS_TEXT: Record<StampEventRow["kind"], string> = {
  EARNED: "Stempel gesetzt",
  REDEEMED: "Prämie eingelöst",
  CORRECTION: "Korrektur",
  VOIDED: "Karte entwertet",
};

const QUELLE_TEXT: Record<StampEventRow["source"], string> = {
  QR_SCAN: "Pass gescannt",
  MANUAL: "von Hand",
  IMPORT: "übernommen",
  MOCK: "Beispiel",
};

/**
 * Eine Zeile des Hauptbuchs in Klartext.
 *
 * `staffName: null` heißt nicht "niemand", sondern "nicht mehr zuordenbar" - das
 * Konto des Mitarbeiters ist gelöscht, der Beleg bleibt. Der Unterschied ist genau
 * der, um den es im Missbrauchsfall geht.
 */
export function ereignisZeile(ereignis: StampEventRow): {
  titel: string;
  delta: string;
  herkunft: string;
} {
  const herkunft = [
    QUELLE_TEXT[ereignis.source],
    ereignis.staffName ?? "nicht mehr zuordenbar",
    ereignis.deviceLabel,
  ]
    .filter((teil): teil is string => Boolean(teil))
    .join(" · ");

  return {
    titel: EREIGNIS_TEXT[ereignis.kind],
    delta: ereignis.delta > 0 ? `+${ereignis.delta}` : String(ereignis.delta),
    herkunft,
  };
}

/**
 * Aus den Variablennamen aus `walletReadiness().missing` wird eine Zeile, die ein
 * Wirt lesen kann. Die Rohnamen wegzulassen wäre bequemer und für den, der es
 * einrichten muss, wertlos - deshalb stehen sie klein daneben, nicht statt dessen.
 */
const WALLET_MANGEL: { praefix: string; klartext: string }[] = [
  { praefix: "APNS_", klartext: "Push-Schlüssel von Apple" },
  { praefix: "APPLE_PASS_CERT", klartext: "Pass-Zertifikat von Apple" },
  { praefix: "APPLE_WWDR", klartext: "Pass-Zertifikat von Apple" },
  { praefix: "APPLE_", klartext: "Kennungen aus dem Apple-Entwicklerkonto" },
  { praefix: "GOOGLE_WALLET_SERVICE_ACCOUNT", klartext: "Dienstkonto-Schlüssel von Google" },
  { praefix: "GOOGLE_WALLET_ISSUER", klartext: "Aussteller-Kennung von Google" },
];

export function walletMangelKlartext(missing: unknown): string[] {
  // `unknown` und nicht `string[]`: der Wert kommt ungeprüft aus einer
  // Serverantwort, und ein `for…of` über `undefined` wäre ein Absturz auf einer
  // reinen Leseansicht. Dieselbe Vorsicht wie bei `istKartenZeile`.
  const gesehen: string[] = [];
  const liste = Array.isArray(missing) ? missing.filter((e) => typeof e === "string") : [];
  for (const eintrag of liste) {
    const treffer = WALLET_MANGEL.find((regel) => eintrag.startsWith(regel.praefix));
    const text = treffer ? treffer.klartext : eintrag;
    if (!gesehen.includes(text)) gesehen.push(text);
  }
  return gesehen;
}

/**
 * Ein Satz zum Wallet-Zustand - ohne einen Knopf daneben.
 *
 * Es gibt keinen Sendeweg zum Gast, den dieser Bildschirm auslösen könnte: der
 * Apple-Push trägt keinen Text (er sagt dem Gerät nur "hol den Pass neu"), Google
 * kennt für den hier verwendeten Passtyp keinen Benachrichtigungsschalter, und der
 * Gast hat keine App. Deshalb ist das ein Statusblock und kein Bedienelement - auch
 * kein deaktiviertes.
 */
export function walletSatz(wallet: WalletBereitschaft): string {
  // ZUERST die Frage, ob es überhaupt eine Passausgabe gibt - und erst danach die
  // Zugangsdaten. `wallet.apple` heisst ausschliesslich "die Variablen sind
  // hinterlegt"; es gibt im Repo weder Passbau noch APNs-Client. Wer sein Zertifikat
  // eintrug, las vorher "iPhone-Gäste sehen den neuen Stand ihrer Karte" und suchte
  // den Fehler danach in den Telefoneinstellungen seiner Gäste.
  if (!wallet.passausgabeGebaut) {
    return wallet.apple || wallet.google
      ? "Die Zugangsdaten sind hinterlegt, aber es werden noch keine Pässe ausgegeben - der Gast sieht seinen Stand heute nur, wenn du ihm die Karte zeigst."
      : "Wallet-Pässe werden noch nicht ausgegeben. Der Gast sieht seinen Stand heute nur, wenn du ihm die Karte zeigst.";
  }
  if (wallet.apple && wallet.google) {
    return "Der Gast sieht den neuen Stand seiner Karte, sobald ein Stempel dazukommt - auf dem iPhone auf dem Sperrbildschirm, auf Android in der Wallet.";
  }
  if (wallet.apple) {
    return "iPhone-Gäste sehen den neuen Stand ihrer Karte, sobald ein Stempel dazukommt. Für Android fehlt die Google-Freigabe noch.";
  }
  if (wallet.google) {
    return "Android-Gäste sehen den neuen Stand ihrer Karte, sobald ein Stempel dazukommt. Für das iPhone fehlt das Apple-Zertifikat noch.";
  }
  return "Solange das nicht eingerichtet ist, sieht der Gast seinen Stand nur, wenn du ihm die Karte zeigst. Ein Pass in Apple oder Google Wallet ist der einzige Weg, auf dem er ihn selbst sieht.";
}

/**
 * Die Statuszeile je Plattform.
 *
 * „eingerichtet" behauptete eine Zustellung; hinterlegt sind bloss Zugangsdaten.
 * Der Unterschied ist der zwischen „mein Gast bekommt das" und „ich habe etwas in
 * Railway eingetragen".
 */
export function walletStatusZeile(
  plattform: "Apple Wallet" | "Google Wallet",
  hinterlegt: boolean,
  passausgabeGebaut: boolean | undefined,
): string {
  if (!hinterlegt) return `${plattform}: noch nicht eingerichtet`;
  return passausgabeGebaut
    ? `${plattform}: eingerichtet`
    : `${plattform}: Zugangsdaten hinterlegt`;
}

/* ── Fehler ──────────────────────────────────────────────────────────────── */

export type FehlerArt =
  | "nicht_eingerichtet"
  | "kein_zugriff"
  | "weg"
  | "kein_netz"
  | "allgemein";

export interface FehlerAnzeige {
  art: FehlerArt;
  text: string;
  /** `false` heißt: ein "Erneut versuchen" hilft nicht und wird nicht angeboten. */
  wiederholbar: boolean;
}

/**
 * Fehler in die Sprache des Bildschirms übersetzen.
 *
 * Absichtlich auf die Form geprüft statt über `instanceof ApiError`: dieses Modul
 * soll ohne Laufzeit-Import aus `@maitr/core` auskommen, damit es rein bleibt und
 * ein Test einen Fehlerfall als schlichtes Objekt beschreiben kann.
 *
 * Der wichtige Fall ist 503 `loyalty_nicht_eingerichtet`: die Tabellen liegen als
 * Migrationsdatei vor und sind nicht eingespielt. Das ist kein Absturz und kein
 * Netzproblem - ein "Erneut versuchen" wird morgen genauso scheitern wie heute.
 *
 * WAS HIER NIE MEHR PASSIERT: `err.message` durchreichen. Der Standardzweig hat das
 * getan, und damit stand am Tresen wörtlich „Network request failed",
 * „Request-Timeout" oder „karte_nicht_gefunden" - englische Netzmeldungen und
 * Maschinencodes in einem Bildschirm, der sonst in ganzen Sätzen spricht. Die
 * Rohmeldung gehört in die Konsole, nicht auf den Bildschirm.
 */
export function fehlerAnzeige(
  fehler: unknown,
  /** Wovon geredet wird, wenn etwas nicht (mehr) da ist. */
  bereich: "programm" | "karte" = "programm",
): FehlerAnzeige {
  const status = (fehler as { status?: unknown })?.status;
  const rumpf = (fehler as { body?: { error?: unknown } })?.body;
  const kennung = typeof rumpf?.error === "string" ? rumpf.error : null;

  if (status === 503 && kennung === "loyalty_nicht_eingerichtet") {
    return {
      art: "nicht_eingerichtet",
      // NICHT "ohne weiteres Zutun bereit": der Ladeeffekt hängt an einem Nonce, den
      // nur `refresh()` erhöht, und einen Wiederholknopf gibt es hier bewusst nicht.
      // Der Satz versprach damit genau das Zutun weg, das nötig ist.
      text: "Die Stempelkarte ist auf dem Server noch nicht freigeschaltet. Sobald das erledigt ist, öffne diesen Bildschirm noch einmal.",
      wiederholbar: false,
    };
  }

  if (status === 403 && kennung === "nur_inhaber") {
    return {
      art: "kein_zugriff",
      text: "Das darf nur der Inhaber des Betriebs ändern.",
      wiederholbar: false,
    };
  }

  if (status === 403) {
    return {
      art: "kein_zugriff",
      // Keine Behauptung über einen fremden Betrieb: der häufigste Grund ist, dass
      // der Nutzer noch gar keinen hat (dann steht in `venueId` die Demokennung).
      text: "Für diesen Betrieb fehlt deinem Konto der Zugriff. Falls du noch keinen Betrieb angelegt hast, hol das zuerst nach.",
      wiederholbar: false,
    };
  }

  if (status === 401) {
    return {
      art: "kein_zugriff",
      text: "Deine Anmeldung ist abgelaufen. Melde dich neu an.",
      wiederholbar: false,
    };
  }

  if (status === 404) {
    return {
      art: "weg",
      text:
        bereich === "karte"
          ? "Diese Karte gibt es nicht mehr."
          : "Diese Stempelkarte gibt es nicht mehr.",
      wiederholbar: false,
    };
  }

  if (status === 400 || status === 422) {
    return {
      art: "allgemein",
      text: "Der Server hat die Anfrage abgewiesen. Öffne den Bildschirm noch einmal.",
      wiederholbar: false,
    };
  }

  if (typeof status !== "number") {
    // Kein HTTP-Status heisst: es kam gar keine Antwort - Netz weg, Zeitüberschreitung,
    // Abbruch. Das ist der einzige Fall, in dem "Erneut versuchen" wirklich hilft.
    if (fehler instanceof Error) {
      console.warn("[stempelkarte] Aufruf ohne Antwort:", fehler.message);
    }
    return {
      art: "kein_netz",
      text: "Keine Verbindung. Prüf das Netz und versuch es noch einmal.",
      wiederholbar: true,
    };
  }

  if (fehler instanceof Error) {
    console.warn(`[stempelkarte] HTTP ${status}:`, fehler.message);
  }
  return {
    art: "allgemein",
    text: "Die Stempelkarte konnte nicht geladen werden. Versuch es noch einmal.",
    wiederholbar: true,
  };
}

/* ── Formprüfung der Antworten ───────────────────────────────────────────── */

/**
 * Trägt diese Zeile die Felder, die der Bildschirm RENDERT?
 *
 * Geprüft wurde bisher `Array.isArray(items)` - und danach `karte.stand.current`
 * gelesen. Eine 200-Antwort von einem fremden Dienst (die Falle, gegen die der Hook
 * selbst argumentiert) mit `{"items":[{"id":"x"}]}` bestand diese Prüfung und warf
 * beim Rendern "Cannot read property 'current' of undefined". Geprüft wird deshalb,
 * was gerendert wird - nicht, was zufällig oben im Objekt steht.
 */
export function istKartenZeile(wert: unknown): wert is StampCardRow {
  const k = wert as StampCardRow | null;
  return (
    !!k &&
    typeof k === "object" &&
    typeof k.id === "string" &&
    typeof k.status === "string" &&
    !!k.stand &&
    typeof k.stand.current === "number" &&
    typeof k.stand.max === "number" &&
    !!k.gast &&
    typeof k.gast.anzeigename === "string"
  );
}

/** Dasselbe für das Kartendetail - dieselben Felder plus die, die nur dort stehen. */
export function istKartenDetail(wert: unknown): boolean {
  const k = wert as { programId?: unknown; rewardText?: unknown } | null;
  return istKartenZeile(wert) && typeof k?.programId === "string" && typeof k?.rewardText === "string";
}

/**
 * Fehlermeldungen der Buchungspfade (Stempeln, Einlösen, Karte ausgeben).
 * Getrennt von `fehlerAnzeige`, weil hier jeder 409 einen eigenen, konkreten Grund
 * trägt - "Konflikt" wäre am Tresen keine Auskunft.
 */
export function buchungsFehlerText(fehler: unknown, jetzt: Date = new Date()): string {
  const rumpf = (fehler as { body?: Record<string, unknown> })?.body;
  const kennung = typeof rumpf?.error === "string" ? rumpf.error : null;

  switch (kennung) {
    case "sperrfrist": {
      const frueheste = typeof rumpf?.frueheste === "string" ? rumpf.frueheste : null;
      const zeitpunkt = frueheste ? Date.parse(frueheste) : NaN;
      if (Number.isNaN(zeitpunkt)) {
        return "Ein Stempel pro Besuch - für diesen Gast ist die Sperrfrist noch nicht um.";
      }
      const minuten = Math.max(1, Math.ceil((zeitpunkt - jetzt.getTime()) / 60_000));
      return minuten < 60
        ? `Ein Stempel pro Besuch - wieder möglich in ${minuten} Min.`
        : `Ein Stempel pro Besuch - wieder möglich in ${Math.ceil(minuten / 60)} Std.`;
    }
    case "karte_nicht_aktiv": {
      const status = rumpf?.status;
      const text =
        typeof status === "string" && status in STATUS_TEXT
          ? STATUS_TEXT[status as StampCardRow["status"]]
          : "nicht mehr aktiv";
      return `Diese Karte ist ${text}.`;
    }
    case "karte_abgelaufen":
      return "Diese Karte ist abgelaufen.";
    case "praemie_nicht_erreicht": {
      const stand = typeof rumpf?.stand === "number" ? rumpf.stand : null;
      const benoetigt = typeof rumpf?.benoetigt === "number" ? rumpf.benoetigt : null;
      return stand !== null && benoetigt !== null
        ? `Die Karte ist noch nicht voll: ${stand} von ${benoetigt}.`
        : "Die Karte ist noch nicht voll.";
    }
    case "konflikt":
      return "Da war jemand gleichzeitig dran. Tipp noch einmal - gebucht wurde nichts.";
    case "karte_laeuft_bereits":
      return "Dieser Gast sammelt schon auf einer laufenden Karte.";
    case "keine_neuen_karten":
      return "„Neue Karten ausgeben“ ist ausgeschaltet.";
    case "kein_programm":
      return "Für diesen Betrieb ist noch keine Stempelkarte eingerichtet.";
    case "gast_geloescht":
      return "Für einen gelöschten Gast lässt sich keine Karte ausgeben.";
    case "gast_nicht_gefunden":
      return "Diesen Gast gibt es nicht.";
    case "karte_nicht_gefunden":
      return "Diese Karte gibt es nicht.";
    default:
      return fehlerAnzeige(fehler).text;
  }
}
