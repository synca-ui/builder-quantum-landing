import { useCallback, useEffect, useRef, useState } from "react";
import { api, isCoreConfigured, type DailyBriefing } from "@maitr/core";

import { briefingFixture } from "./fixtures";

export type BriefingSource = "api" | "fixture";

interface BriefingState {
  briefing: DailyBriefing;
  source: BriefingSource;
  loading: boolean;
  error: Error | null;
  refresh: () => void;
}

/**
 * Lädt das Tagesbriefing über `@maitr/core`.
 *
 * Solange der Endpunkt `/briefing/today` serverseitig fehlt, fällt der Hook auf die
 * Design-Fixture zurück und meldet das über `source`. So bleibt der Screen benutzbar,
 * ohne dass Beispieldaten unbemerkt für echte gehalten werden.
 */
export function useDailyBriefing(venueId: string): BriefingState {
  const [briefing, setBriefing] = useState<DailyBriefing>(briefingFixture);
  const [source, setSource] = useState<BriefingSource>("fixture");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [nonce, setNonce] = useState(0);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!isCoreConfigured()) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    void ladeBriefing(api.briefing.today(venueId, controller.signal), controller.signal, {
      erfolg: (data) => {
        if (!mounted.current) return;
        setBriefing(data);
        setSource("api");
        setError(null);
      },
      fehler: (err) => {
        if (!mounted.current) return;
        setBriefing(briefingFixture);
        setSource("fixture");
        setError(err);
      },
      fertig: () => {
        if (mounted.current) setLoading(false);
      },
    });

    return () => controller.abort();
  }, [venueId, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { briefing, source, loading, error, refresh };
}

/**
 * Einen Briefing-Abruf auswerten - ohne React, damit es sich prüfen lässt
 * (useDailyBriefing.spec.ts).
 *
 * Nach einem Abbruch meldet der Abruf NICHTS mehr, auch nicht „fertig". Anlass
 * (Prüfer-Befund 27, 15.09.): `finally` setzte `loading` auch für einen
 * abgebrochenen Abruf auf false. Stellt der Start-Screen nach einem neuen
 * Präsenzstand oder einem Betriebswechsel den Abruf neu, lief Abruf 2 noch, während
 * Abruf 1 schon „fertig" meldete - ein echter Betrieb sah so lange „Tagesbriefing
 * gerade nicht abrufbar" samt „Erneut versuchen". Dieselbe Prüfung wie in
 * `usePosteingang` und `useKommendeReservierungen`. Auch eine späte Erfolgsantwort
 * des abgebrochenen Abrufs zählt nicht: Sie gehört zum vorigen Betrieb.
 */
export function ladeBriefing(
  abruf: Promise<unknown>,
  signal: AbortSignal,
  melde: {
    erfolg: (briefing: DailyBriefing) => void;
    fehler: (err: Error) => void;
    fertig: () => void;
  },
): Promise<void> {
  return abruf
    .then((data) => {
      if (signal.aborted) return;
      // Antwort auf Form prüfen, nicht nur auf Erfolg. Ein HTTP 200 sagt nichts
      // darüber, dass wirklich ein Briefing kam: Zeigt die Basis-URL versehentlich
      // auf einen fremden Dienst, antwortet der ebenfalls mit 200 und die Seite
      // stürzte beim ersten `briefing.tasks.filter(...)` ab. Genau so ist es im
      // Simulator passiert, als der Vorgabewert auf Metros Port zeigte.
      // Der `catch`-Zweig unten konnte das nie fangen — er greift nur bei
      // geworfenen Fehlern, nicht bei einer erfolgreichen falschen Antwort.
      if (!data || !Array.isArray((data as { tasks?: unknown }).tasks)) {
        throw new Error("Antwort ist kein Briefing (tasks fehlt)");
      }
      melde.erfolg(data as DailyBriefing);
    })
    .catch((err: Error) => {
      if (signal.aborted) return;
      melde.fehler(err);
    })
    .finally(() => {
      if (!signal.aborted) melde.fertig();
    });
}
