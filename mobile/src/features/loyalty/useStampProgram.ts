import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  api,
  isCoreConfigured,
  type StampCardFilter,
  type StampCardRow,
  type StampOverview,
  type StampProgram,
  type VenueRolle,
  type WalletBereitschaft,
} from "@maitr/core";

import { hasRealAuth } from "../../lib/auth";
import { fehlerAnzeige, istKartenZeile, type FehlerAnzeige } from "./aufbereitung";

/**
 * Der Zustand des Bildschirms, als EIN Wert statt als vier Flaggen - sonst gibt es
 * Mischzustände, die es nicht geben darf ("lädt" und "Fehler" zugleich).
 *
 *  - `demo`          Kein Konto, keine API-Konfiguration. Es geht kein Aufruf raus.
 *  - `kein_betrieb`  Angemeldet, aber ohne eigenen Betrieb. Es geht kein Aufruf raus.
 *  - `laedt`         Der ERSTE Ladevorgang läuft.
 *  - `fehler`        Die Abfrage kam nicht durch. Formular bleibt gesperrt.
 *  - `kein_programm` Es antwortete sauber `program: null` - der Regelfall am Anfang.
 *  - `bereit`        Programm da.
 */
export type ProgrammZustand =
  | "demo"
  | "kein_betrieb"
  | "laedt"
  | "fehler"
  | "kein_programm"
  | "bereit";

/** Zeilen je Seite. "Mehr laden" hängt die nächste an, statt das Limit hochzudrehen. */
const KARTEN_SEITE = 20;

export interface StampProgramState {
  zustand: ProgrammZustand;
  program: StampProgram | null;
  wallet: WalletBereitschaft | null;
  /** Rolle im Betrieb. Bestimmt, welche Knöpfe der Server einlöst. */
  rolle: VenueRolle;
  uebersicht: StampOverview | null;
  karten: StampCardRow[];
  /**
   * Es gibt eine nächste Seite. NICHT dasselbe wie `gekappt` - der Unterschied
   * entscheidet, ob "Mehr laden" hilft oder ob ein Teil unerreichbar ist.
   */
  mehrVorhanden: boolean;
  /** Der Server hat bei der Filterprüfung die Obergrenze erreicht (FILTER_OBERGRENZE). */
  gekappt: boolean;
  kartenLaden: boolean;
  mehrLaden: () => void;
  /** Fehler beim Laden des PROGRAMMS - sperrt das Formular. */
  ladeFehler: FehlerAnzeige | null;
  /** Fehler beim Laden der KENNZAHLEN - Programm und Liste bleiben bedienbar. */
  uebersichtFehler: FehlerAnzeige | null;
  /** Fehler beim Laden der LISTE - Programm und Kennzahlen bleiben stehen. */
  listenFehler: FehlerAnzeige | null;
  filter: StampCardFilter;
  setFilter: (filter: StampCardFilter) => void;
  refresh: () => void;
}

/**
 * Lädt Programm, Kennzahlen und Kartenliste über `@maitr/core`.
 *
 * Machart wie `useDailyBriefing` - AbortController, `mounted`-Ref, `isCoreConfigured`-
 * Weiche, Formprüfung der Antwort, `refresh()` über einen Nonce - mit EINEM
 * bewussten Unterschied: es gibt hier KEINEN Rückfall auf Beispieldaten.
 *
 * Beim Briefing ist ein Rückfall harmlos, hier wäre er gefährlich: der Wirt sähe
 * eine Prämie, die serverseitig nicht existiert, hielte sie für seine Einstellung
 * und liefe beim ersten Speichern in einen Fehler - oder schlimmer, gäbe eine Karte
 * mit einer Zusage aus, die nirgends steht. Deshalb: Fehler zeigen, Formular sperren.
 *
 * DREI EFFEKTE STATT ZWEI, und je einer für das, was er wirklich braucht:
 *  1. Programm + Wallet + Rolle  → [venueId, nonce]
 *  2. Kennzahlen                 → [venueId, programId, nonce]
 *  3. Kartenliste                → [venueId, programId, filter, cursor, nonce]
 * Vorher hingen Kennzahlen und Liste an EINEM Effekt mit `filter` und `limit` in den
 * Abhängigkeiten. Jeder Filtertipp rechnete damit die gesamte Übersicht neu - bei
 * 4.000 Karten alle Kartenzeilen plus sechzehn Folgeabfragen, für Zahlen, die sich
 * dabei nie ändern. Und ein Fehler der Liste riss die korrekt geladenen Kennzahlen
 * mit vom Bildschirm, weil `Promise.all` beides zugleich verwarf.
 */
export function useStampProgram(venueId: string, hatBetrieb: boolean): StampProgramState {
  // Beide Bedingungen sind über die Prozesslaufzeit konstant (Clerk-Schlüssel steht
  // im Bundle, `configureCore()` läuft einmal beim Import des Root-Layouts) - deshalb
  // darf die Startbelegung des Zustands davon abhängen. Gleiche Weiche wie im
  // Onboarding: ohne Konto endet jeder betriebsgebundene Aufruf in 401/403.
  const angemeldet = useMemo(() => hasRealAuth() && isCoreConfigured(), []);
  // `hatBetrieb` ist NICHT konstant (der Betrieb kann in dieser Sitzung entstehen),
  // deshalb steht es nicht im useMemo. Ohne diese zweite Bedingung ging der Aufruf
  // mit der DEMOKENNUNG raus, der Server antwortete 403, und auf dem Bildschirm
  // stand "Dieser Betrieb gehört nicht zu deinem Konto" - über einen Betrieb, den es
  // gar nicht gibt, ohne Knopf und ohne Weg zum Onboarding. Das ist der
  // wahrscheinlichste erste Aufruf dieses Bildschirms überhaupt.
  const echterServer = angemeldet && hatBetrieb;

  const startZustand: ProgrammZustand = !angemeldet ? "demo" : hatBetrieb ? "laedt" : "kein_betrieb";

  const [zustand, setZustand] = useState<ProgrammZustand>(startZustand);
  const [program, setProgram] = useState<StampProgram | null>(null);
  const [wallet, setWallet] = useState<WalletBereitschaft | null>(null);
  const [rolle, setRolle] = useState<VenueRolle>("STAFF");
  const [uebersicht, setUebersicht] = useState<StampOverview | null>(null);
  const [karten, setKarten] = useState<StampCardRow[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [gekappt, setGekappt] = useState(false);
  const [kartenLaden, setKartenLaden] = useState(false);
  const [ladeFehler, setLadeFehler] = useState<FehlerAnzeige | null>(null);
  // DREI Fehlerzustände, einer je Effekt. Vorher teilten sich die Ladewege EINEN:
  // scheiterte das Programm und kam die Liste durch, löschte deren Erfolgszweig den
  // Fehler wieder - übrig blieb `zustand: "fehler"` ohne Text, also ein Bildschirm
  // mit ausgegrauten Feldern, totem Speichern und ohne jede Meldung.
  const [uebersichtFehler, setUebersichtFehler] = useState<FehlerAnzeige | null>(null);
  const [listenFehler, setListenFehler] = useState<FehlerAnzeige | null>(null);
  const [filter, setFilter] = useState<StampCardFilter>("alle");
  /** Welche Seite geladen werden soll. `null` = die erste, ersetzt die Liste. */
  const [cursor, setCursor] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  /**
   * Für welchen Betrieb schon einmal etwas geladen wurde.
   *
   * Trennt ERSTLADEN von NACHLADEN. Ohne diese Unterscheidung wurde nach jedem
   * Speichern der gesamte Einstellungsbereich zum Skelett - inklusive der Felder, in
   * denen der Wirt gerade stand. Beim Betriebswechsel ist das Skelett dagegen
   * richtig: dann gehören die stehenden Werte zu jemand anderem.
   */
  const geladenFuer = useRef<string | null>(null);

  /* 1) Programm + Wallet-Zustand + Rolle. */
  useEffect(() => {
    if (!echterServer) {
      geladenFuer.current = null;
      setZustand(!angemeldet ? "demo" : "kein_betrieb");
      return;
    }

    const controller = new AbortController();
    const betriebGewechselt = geladenFuer.current !== venueId;
    setLadeFehler(null);
    if (betriebGewechselt) {
      setZustand("laedt");
      // Auch die ABGELEITETEN Werte zurücksetzen. `programId` speist den zweiten und
      // dritten Effekt, und die feuern im selben Commit - vorher mit NEUEM venueId
      // und der Programmkennung des ALTEN Betriebs. Beim Abmelden (venueId springt
      // auf die Demokennung) ging so die Programmkennung des echten Betriebs an eine
      // Betriebskennung, zu der sie nicht gehört.
      setProgram(null);
      setUebersicht(null);
      setKarten([]);
      setNextCursor(null);
      setGekappt(false);
      setUebersichtFehler(null);
      setListenFehler(null);
    }

    api.loyalty
      .program(venueId, controller.signal)
      .then((antwort) => {
        if (!mounted.current) return;
        // Antwort auf FORM prüfen, nicht nur auf Erfolg. Ein HTTP 200 sagt nicht,
        // dass es von diesem Server kam: zeigt die Basis-URL versehentlich auf einen
        // fremden Dienst, antwortet der ebenfalls mit 200 - und der Bildschirm zeigte
        // dann `program: undefined` als "noch nichts eingerichtet" an. Genau die
        // Falle, gegen die `useDailyBriefing` schon argumentiert.
        if (!antwort || typeof antwort !== "object" || !("program" in antwort)) {
          throw new Error("Antwort ist keine Programmauskunft");
        }
        setProgram(antwort.program);
        setWallet(antwort.wallet ?? null);
        // Fehlt die Rolle (älterer Server), gilt die vorsichtigere: STAFF sieht die
        // Inhaber-Knöpfe dann nicht, statt sie zu sehen und 403 zu bekommen.
        setRolle(antwort.rolle ?? "STAFF");
        geladenFuer.current = venueId;
        setZustand(antwort.program ? "bereit" : "kein_programm");
      })
      .catch((err: unknown) => {
        if (!mounted.current || controller.signal.aborted) return;
        setLadeFehler(fehlerAnzeige(err));
        setZustand("fehler");
      });

    return () => controller.abort();
  }, [venueId, nonce, echterServer, angemeldet]);

  const programId = program?.id ?? null;

  /* 2) Kennzahlen. Hängen NICHT an Filter oder Seite - sie ändern sich davon nicht. */
  useEffect(() => {
    if (!echterServer || !programId) {
      setUebersicht(null);
      return;
    }

    const controller = new AbortController();
    api.loyalty
      .overview(venueId, programId, controller.signal)
      .then((zahlen) => {
        if (!mounted.current) return;
        if (!zahlen || typeof zahlen.aktiv !== "number") {
          throw new Error("Antwort ist keine Übersicht");
        }
        setUebersicht(zahlen);
        setUebersichtFehler(null);
      })
      .catch((err: unknown) => {
        if (!mounted.current || controller.signal.aborted) return;
        // Die Zahlen dürfen scheitern, ohne die Einstellungen mitzureissen: das
        // Programm steht bereits und ist bedienbar. Deshalb bleibt `zustand` auf
        // "bereit" und der Fehler erscheint nur am Kennzahlenblock.
        setUebersichtFehler(fehlerAnzeige(err));
      });

    return () => controller.abort();
  }, [venueId, programId, nonce, echterServer]);

  /* 3) Kartenliste. Die einzige Abfrage, die Filter und Seite kennt. */
  useEffect(() => {
    if (!echterServer || !programId) {
      setKarten([]);
      setNextCursor(null);
      setGekappt(false);
      return;
    }

    const controller = new AbortController();
    const ersteSeite = cursor === null;
    setKartenLaden(true);

    api.loyalty
      .cards(
        venueId,
        programId,
        { filter, limit: KARTEN_SEITE, ...(cursor ? { cursor } : {}) },
        controller.signal,
      )
      .then((seite) => {
        if (!mounted.current) return;
        if (!seite || !Array.isArray(seite.items)) {
          throw new Error("Antwort ist keine Kartenliste");
        }
        // Geprüft wird, was der Bildschirm RENDERT. `Array.isArray` allein liess
        // `{"items":[{"id":"x"}]}` durch, und das Rendern warf danach beim Lesen von
        // `stand.current`. Unbrauchbare Zeilen fallen weg, statt den Bildschirm
        // umzulegen.
        const brauchbar = seite.items.filter(istKartenZeile);
        setKarten((vorher) => {
          if (ersteSeite) return brauchbar;
          // Nach id entdoppeln: ein zweimal ausgelöster Effekt darf keine Zeile
          // doppelt in die Liste hängen.
          const gesehen = new Set(vorher.map((k) => k.id));
          return [...vorher, ...brauchbar.filter((k) => !gesehen.has(k.id))];
        });
        setNextCursor(typeof seite.nextCursor === "string" ? seite.nextCursor : null);
        setGekappt(Boolean(seite.abgeschnitten));
        setListenFehler(null);
      })
      .catch((err: unknown) => {
        // Nur die Liste. Die Kennzahlen sind korrekt geladen und bleiben stehen -
        // vorher riss ein Listenfehler sie mit vom Bildschirm.
        if (!mounted.current || controller.signal.aborted) return;
        setListenFehler(fehlerAnzeige(err));
      })
      .finally(() => {
        if (mounted.current) setKartenLaden(false);
      });

    return () => controller.abort();
  }, [venueId, programId, filter, cursor, nonce, echterServer]);

  const refresh = useCallback(() => {
    // Beim Neuladen zurück auf die erste Seite: sonst hängte der dritte Effekt die
    // zuletzt geladene Seite ein zweites Mal an.
    setCursor(null);
    setNonce((n) => n + 1);
  }, []);

  const mehrLaden = useCallback(() => {
    setCursor((aktuell) => nextCursor ?? aktuell);
  }, [nextCursor]);

  // Filterwechsel setzt die Liste wieder auf die erste Seite zurück - nachgeladene
  // Seiten im Filter "voll" sollen nicht stillschweigend für "alle" weitergelten.
  const filterSetzen = useCallback((naechster: StampCardFilter) => {
    setFilter(naechster);
    setCursor(null);
    setKarten([]);
  }, []);

  return {
    zustand,
    program,
    wallet,
    rolle,
    uebersicht,
    karten,
    mehrVorhanden: nextCursor !== null,
    gekappt,
    kartenLaden,
    mehrLaden,
    ladeFehler,
    uebersichtFehler,
    listenFehler,
    filter,
    setFilter: filterSetzen,
    refresh,
  };
}
