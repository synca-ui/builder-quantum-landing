import { useCallback, useEffect, useRef, useState } from "react";
import { api, isCoreConfigured, type DailyBriefing } from "@maitr/core";

import { useLang } from "../../lib/i18n";
import { briefingFixture, briefingFixtureEn } from "./fixtures";

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
  // Fixture je Sprache. Solange keine API verbunden ist (Demo), reagiert das Briefing
  // damit sofort auf den DE/EN-Umschalter.
  const lang = useLang();
  const fixture = lang === "en" ? briefingFixtureEn : briefingFixture;
  const [apiBriefing, setApiBriefing] = useState<DailyBriefing | null>(null);
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

    api.briefing
      .today(venueId, controller.signal)
      .then((data) => {
        if (!mounted.current) return;
        setApiBriefing(data);
        setSource("api");
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted.current || controller.signal.aborted) return;
        setApiBriefing(null);
        setSource("fixture");
        setError(err);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => controller.abort();
  }, [venueId, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  // Bei API-Quelle die API-Daten, sonst die sprachabhängige Fixture (reagiert live auf DE/EN).
  const briefing = source === "api" && apiBriefing ? apiBriefing : fixture;

  return { briefing, source, loading, error, refresh };
}
