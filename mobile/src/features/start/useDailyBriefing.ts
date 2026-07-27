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

    api.briefing
      .today(venueId, controller.signal)
      .then((data) => {
        if (!mounted.current) return;
        setBriefing(data);
        setSource("api");
        setError(null);
      })
      .catch((err: Error) => {
        if (!mounted.current || controller.signal.aborted) return;
        setBriefing(briefingFixture);
        setSource("fixture");
        setError(err);
      })
      .finally(() => {
        if (mounted.current) setLoading(false);
      });

    return () => controller.abort();
  }, [venueId, nonce]);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  return { briefing, source, loading, error, refresh };
}
