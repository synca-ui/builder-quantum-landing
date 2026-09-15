import { useCallback, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";
import { api, isCoreConfigured, type Reservation } from "@maitr/core";

import {
  RESERVIERUNGS_FENSTER_TAGE,
  fehlerText,
  istReservierung,
  reservierungenAus,
  unklarObGeaendert,
  type Entscheidung,
} from "./echteReservierungen";

export interface KommendeReservierungen {
  /**
   * `null`, solange für diesen Betrieb noch keine Liste angekommen ist - das ist
   * NICHT dasselbe wie `[]`. Ein gescheiterter erster Abruf darf nicht als
   * "keine Reservierungen" erscheinen.
   */
  reservierungen: Reservation[] | null;
  laedt: boolean;
  /** Fehler des letzten Abrufs. Eine ältere Liste bleibt daneben stehen. */
  fehler: string | null;
  /** Wann die gezeigte Liste geholt wurde (ms). */
  standMs: number | null;
  refresh: () => void;
  /**
   * Status beim Server ändern. Die Zeile wechselt ERST mit der Serverantwort -
   * nicht optimistisch: Bestätigen und Absagen einer Anfrage mailen dem Gast, und eine
   * Zeile, die "Abgesagt" zeigt, obwohl der Aufruf scheiterte, hieße für den Wirt,
   * der Gast wisse Bescheid. `true` bei Erfolg.
   */
  setzeStatus: (id: string, status: Entscheidung) => Promise<boolean>;
  /** Fehlertext je Reservierungs-Id, bis zum nächsten Versuch an dieser Zeile. */
  zeilenFehler: Record<string, string>;
  /** Zeilen, deren Änderung gerade unterwegs ist - Knöpfe dort sperren. */
  inArbeit: Record<string, boolean>;
}

function ohne<T>(eintraege: Record<string, T>, id: string): Record<string, T> {
  if (!(id in eintraege)) return eintraege;
  const { [id]: _weg, ...rest } = eintraege;
  return rest;
}

/**
 * Reservierungen des echten Betriebs ab heute über `GET /reservations/upcoming`.
 *
 * Machart wie `useDailyBriefing` (AbortController, Formprüfung, `refresh()` über
 * einen Nonce), aber OHNE Rückfall auf Beispieldaten: Eine Fixture-Buchung von
 * "M. Weber" in der Liste eines echten Betriebs sähe aus wie eine echte.
 *
 * Nur für den echten Betrieb aufrufen - mit der Demokennung antwortet der Server
 * 403, und die Screens entscheiden vorher über `hasRealVenue && !showcase`.
 */
export function useKommendeReservierungen(
  venueId: string,
  tage: number = RESERVIERUNGS_FENSTER_TAGE,
): KommendeReservierungen {
  // Die Liste merkt sich, für welchen Betrieb sie gilt. Wechselt das Konto den
  // Betrieb, darf die alte Liste nicht eine Sekunde lang als die neue gelten.
  const [stand, setStand] = useState<{ venueId: string; liste: Reservation[]; um: number } | null>(
    null,
  );
  const [laedt, setLaedt] = useState(true);
  const [fehler, setFehler] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [zeilenFehler, setZeilenFehler] = useState<Record<string, string>>({});
  const [inArbeit, setInArbeit] = useState<Record<string, boolean>>({});

  const gemountet = useRef(true);
  useEffect(() => {
    gemountet.current = true;
    return () => {
      gemountet.current = false;
    };
  }, []);

  // Statusänderungen, die WÄHREND eines Abrufs zurückkamen, schlagen dessen
  // Ergebnis: Der Abruf hat die Liste womöglich vor der Änderung gelesen und
  // setzte die eben abgesagte Zeile sonst wieder auf "Anfrage".
  const schreibNr = useRef(0);
  const geschrieben = useRef(new Map<string, { zeile: Reservation; nr: number }>());
  const laufend = useRef(new Set<string>());

  useEffect(() => {
    if (!isCoreConfigured()) {
      setLaedt(false);
      setFehler("Die App ist mit keinem Server verbunden.");
      return;
    }

    const controller = new AbortController();
    const startNr = schreibNr.current;
    setLaedt(true);

    api.reservations
      .upcoming(venueId, tage, controller.signal)
      .then((roh) => {
        if (controller.signal.aborted || !gemountet.current) return;
        const liste = reservierungenAus(roh);
        if (!liste) throw new Error("Antwort ist keine Reservierungsliste");
        const zusammen = liste.map((r) => {
          const neuer = geschrieben.current.get(r.id);
          return neuer && neuer.nr > startNr ? neuer.zeile : r;
        });
        setStand({ venueId, liste: zusammen, um: Date.now() });
        setFehler(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || !gemountet.current) return;
        setFehler(fehlerText(err, "laden"));
      })
      .finally(() => {
        if (!controller.signal.aborted && gemountet.current) setLaedt(false);
      });

    return () => controller.abort();
  }, [venueId, tage, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // ANLASS (Prüfung 15.09.): Der Push „Neue Reservierungsanfrage" ruft nur
  // router.push("/(tabs)/tische"). War der Tab schon offen, gibt es weder einen
  // Fokuswechsel noch ein neues useFocusEffect - der Wirt sah die alte Liste mit
  // "Keine Anfrage offen". Kommt die App zurück in den Vordergrund (auch nach dem
  // Antippen eines Pushs aus der Mitteilungszentrale), neu holen.
  useEffect(() => {
    let vorher = AppState.currentState;
    const abo = AppState.addEventListener("change", (naechster) => {
      if (vorher !== "active" && naechster === "active") refresh();
      vorher = naechster;
    });
    return () => abo.remove();
  }, [refresh]);

  const setzeStatus = useCallback(
    async (id: string, status: Entscheidung) => {
      // Doppeltipp auf "Absagen" darf nicht zwei Anfragen (und zwei Mails) auslösen.
      if (laufend.current.has(id)) return false;
      laufend.current.add(id);
      const betrieb = venueId;
      setInArbeit((m) => ({ ...m, [id]: true }));
      setZeilenFehler((m) => ohne(m, id));

      try {
        const antwort: unknown = await api.reservations.setStatus(id, betrieb, status);
        if (!istReservierung(antwort) || antwort.id !== id) {
          // Ob die Änderung durchging, ist unklar - der catch-Zweig holt die Liste neu.
          throw new Error("Antwort ist keine Reservierung");
        }
        if (!gemountet.current) return true;
        schreibNr.current += 1;
        geschrieben.current.set(id, { zeile: antwort, nr: schreibNr.current });
        setStand((s) =>
          s && s.venueId === betrieb
            ? { ...s, liste: s.liste.map((r) => (r.id === id ? antwort : r)) }
            : s,
        );
        return true;
      } catch (err: unknown) {
        if (!gemountet.current) return false;
        setZeilenFehler((m) => ({ ...m, [id]: fehlerText(err, "zeile") }));
        // 400/404: Der Server kennt einen anderen Stand als die Liste (schon
        // abgeschlossen, gelöscht). Ohne Status (Timeout, Netz, falsche Form) oder
        // 5xx: Der Server schreibt den Status vor der Gast-Mail und antwortet erst
        // danach - die Änderung kann durch sein. In allen Fällen neu holen, damit
        // die Zeile nicht mit den alten Knöpfen stehen bleibt.
        const code = (err as { status?: unknown })?.status;
        if (code === 400 || code === 404 || unklarObGeaendert(err)) refresh();
        return false;
      } finally {
        laufend.current.delete(id);
        if (gemountet.current) setInArbeit((m) => ohne(m, id));
      }
    },
    [venueId, refresh],
  );

  const gilt = stand && stand.venueId === venueId ? stand : null;

  return {
    reservierungen: gilt ? gilt.liste : null,
    laedt,
    fehler,
    standMs: gilt ? gilt.um : null,
    refresh,
    setzeStatus,
    zeilenFehler,
    inArbeit,
  };
}

/**
 * Aktuelle Zeit, jede Minute neu. Ohne Takt bliebe ein offener Bildschirm auf dem
 * Stand seines ersten Renderns: Um 19:01 stünde an der 19-Uhr-Reservierung noch
 * "Absagen" statt "No-Show", und "Heute" hieße nach Mitternacht weiter heute.
 */
export function useMinutenTakt(): number {
  const [jetzt, setJetzt] = useState(() => Date.now());
  useEffect(() => {
    const takt = setInterval(() => setJetzt(Date.now()), 60_000);
    return () => clearInterval(takt);
  }, []);
  return jetzt;
}
