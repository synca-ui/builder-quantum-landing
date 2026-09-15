import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "expo-router";
import { api, isCoreConfigured } from "@maitr/core";

import { useStore, type InboxItem } from "../../lib/store";
import { echterPosteingang, googleQuelle, ungeleseneAnzahl } from "./echterPosteingang";

/** So weit reicht der Blick nach vorn - Anfragen für in vier Wochen sind noch offen. */
const TAGE_VORAUS = 30;

/**
 * Nach so kurzer Zeit fragt ein erneutes Fokussieren nicht noch einmal. Start und
 * Posteingang wechseln sich beim Antippen der Glocke ab; ohne diese Schwelle
 * kostete jedes Hin und Her zwei Anfragen.
 */
const FRISCH_MS = 60_000;

export interface Posteingang {
  /** `true` = echter Betrieb (Einträge aus Server und Präsenz), sonst Demo-Seed. */
  echterBetrieb: boolean;
  eintraege: InboxItem[];
  ungelesen: number;
  gelesen: Record<string, boolean>;
  /** Anfragen oder Präsenz sind unterwegs. */
  laedt: boolean;
  /** Die Reservierungsanfragen ließen sich nicht abrufen - nicht: „es gibt keine". */
  fehler: boolean;
  /**
   * Google hat nicht geantwortet: kein Präsenzstand, oder einer ohne Google-Eintrag
   * (kein Schlüssel, Places-Fehler, nie abgerufen). Neue Bewertungen und die
   * Google-Warnungen fehlen dann womöglich - „keine" wäre eine Behauptung.
   */
  googleFehlt: boolean;
  markiereGelesen: (id: string) => void;
  alleGelesen: () => void;
  /** Anfragen neu holen und - falls Google fehlt - den Präsenzstand. */
  erneutVersuchen: () => void;
}

interface Abruf {
  venueId: string;
  liste: unknown[];
}

/**
 * Posteingang und Glockenzähler aus einer Quelle.
 *
 * Echter Betrieb: offene Reservierungsanfragen (`api.reservations.upcoming`) plus
 * das, was der Präsenzstand im Store hergibt - zusammengesetzt in
 * `echterPosteingang`. Gelesen/ungelesen liegt weiter im Store (`inboxRead`),
 * damit Start und Posteingang dieselbe Zahl zeigen und sie einen Neustart übersteht.
 *
 * Demomodus und Showcase: unverändert `inbox` und `unreadCount` aus dem Store -
 * der Vorführzustand bleibt, wie er ist.
 *
 * ANLASS: Die Glocke auf Start zählte `INBOX_SEED`, auch für einen echten Wirt -
 * „5 ungelesen" am ersten Morgen, und keine davon betraf seinen Betrieb.
 */
export function usePosteingang(): Posteingang {
  const {
    venueId,
    hasRealVenue,
    showcase,
    praesenz,
    praesenzLaedt,
    aktualisierePraesenz,
    inbox,
    inboxRead,
    unreadCount,
    markInboxRead,
    markAllInboxRead,
  } = useStore();
  const echterBetrieb = hasRealVenue && !showcase;

  const [abruf, setAbruf] = useState<Abruf | null>(null);
  const [fehlerFuer, setFehlerFuer] = useState<string | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [nonce, setNonce] = useState(0);
  // Beginn des letzten Abrufs; 0 nach einem Fehlschlag, damit der nächste Fokus
  // sofort erneut fragt.
  const letzterAbruf = useRef(0);

  // Muss VOR `useFocusEffect` stehen: Beim ersten Fokus sieht dessen Rückruf dann
  // schon den frisch gesetzten `letzterAbruf` und stellt keine zweite Anfrage.
  useEffect(() => {
    if (!echterBetrieb) return;
    if (!isCoreConfigured()) {
      setFehlerFuer(venueId);
      return;
    }
    const controller = new AbortController();
    letzterAbruf.current = Date.now();
    setLaeuft(true);

    api.reservations
      .upcoming(venueId, TAGE_VORAUS, controller.signal)
      .then((daten) => {
        if (controller.signal.aborted) return;
        // Form prüfen, nicht nur Erfolg (dieselbe Lehre wie in `useDailyBriefing`):
        // Ein 200 von einem fremden Dienst ist auch ein Erfolg.
        if (!Array.isArray(daten)) throw new Error("Antwort ist keine Reservierungsliste");
        setAbruf({ venueId, liste: daten });
        setFehlerFuer(null);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        letzterAbruf.current = 0;
        setFehlerFuer(venueId);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLaeuft(false);
      });

    return () => controller.abort();
  }, [echterBetrieb, venueId, nonce]);

  // Start bleibt als Tab stehen. Ohne Nachfragen beim Zurückkehren zählte die
  // Glocke bis zum nächsten Kaltstart nur die Anfragen vom ersten Öffnen.
  useFocusEffect(
    useCallback(() => {
      if (!echterBetrieb) return;
      if (Date.now() - letzterAbruf.current < FRISCH_MS) return;
      setNonce((n) => n + 1);
    }, [echterBetrieb]),
  );

  // Nur die Liste DIESES Betriebs - nach einem Kontowechsel stünden sonst die
  // Anfragen des vorigen da, bis die neue Antwort eintrifft.
  const listeDa = abruf !== null && abruf.venueId === venueId;
  const fehler = fehlerFuer === venueId;
  const google = googleQuelle(praesenz, praesenzLaedt);

  const echteEintraege = echterBetrieb
    ? echterPosteingang({
        reservierungen: listeDa ? abruf.liste : null,
        praesenz,
        jetzt: Date.now(),
      })
    : [];

  // `markAllInboxRead` kennt nur die Seed-Kennungen. Für den echten Betrieb jede
  // gezeigte Kennung einzeln - React bündelt die Aktualisierungen im Tipp-Handler.
  const alleGelesen = () => {
    if (!echterBetrieb) {
      markAllInboxRead();
      return;
    }
    for (const eintrag of echteEintraege) markInboxRead(eintrag.id);
  };

  const erneutVersuchen = () => {
    if (!echterBetrieb) return;
    setNonce((n) => n + 1);
    // Nur wenn Google fehlt: Ein Stand mit Google-Eintrag hat seinen eigenen
    // „Aktualisieren"-Weg (Profil-Check, Bewertungen), und jeder Abruf kostet
    // einen Places-Aufruf. Fehlt Google, ist genau das der Grund für den Tipp.
    if (google === "fehlt") void aktualisierePraesenz();
  };

  if (!echterBetrieb) {
    return {
      echterBetrieb,
      eintraege: inbox,
      ungelesen: unreadCount,
      gelesen: inboxRead,
      laedt: false,
      fehler: false,
      googleFehlt: false,
      markiereGelesen: markInboxRead,
      alleGelesen,
      erneutVersuchen,
    };
  }

  return {
    echterBetrieb,
    eintraege: echteEintraege,
    ungelesen: ungeleseneAnzahl(echteEintraege, inboxRead),
    gelesen: inboxRead,
    // Auch „noch nie gefragt" zählt als Laden: Im ersten Render ist der Effekt noch
    // nicht gelaufen, und „Nichts Neues" für einen Augenblick wäre eine Behauptung.
    laedt: laeuft || (!listeDa && !fehler) || google === "laedt",
    fehler,
    googleFehlt: google === "fehlt",
    markiereGelesen: markInboxRead,
    alleGelesen,
    erneutVersuchen,
  };
}
