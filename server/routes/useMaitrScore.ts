// hooks/useMaitrScore.ts
import { useState, useEffect, useRef, useCallback } from "react";

interface UseMaitrScoreReturn {
  maitrScore: number;
  scoreStatus: "idle" | "pending" | "completed" | "failed" | "timeout";
}

const API_BASE = process.env.REACT_APP_API_BASE || "";
const POLL_INTERVAL_MS = 3000;   // alle 3s prüfen
const POLL_TIMEOUT_MS = 120_000; // nach 2 min aufgeben

/**
 * Pollt den maitrScore aus ScraperJob bis der Workflow fertig ist.
 * @param websiteUrl – die URL die der User eingegeben hat (= ScraperJob.websiteUrl)
 * @param enabled – nur poller wenn true (z.B. erst nach dem n8n-Webhook-Call)
 */
export function useMaitrScore(websiteUrl: string | null, enabled: boolean = true): UseMaitrScoreReturn {
  const [maitrScore, setMaitrScore] = useState<number>(0);
  const [scoreStatus, setScoreStatus] = useState<UseMaitrScoreReturn["scoreStatus"]>("idle");
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const fetchScore = useCallback(async () => {
    if (!websiteUrl) return;

    try {
      const res = await fetch(
        `${API_BASE}/api/scraper-job/score?websiteUrl=${encodeURIComponent(websiteUrl)}`
      );

      if (!res.ok) {
        stopPolling();
        setScoreStatus("failed");
        return;
      }

      const data = await res.json();

      // Workflow noch nicht fertig → weiter poller
      if (data.status === "pending" || data.status === "not_found" || data.maitrScore === null) {
        // Timeout-Check
        if (Date.now() - startTimeRef.current > POLL_TIMEOUT_MS) {
          stopPolling();
          setScoreStatus("timeout");
        }
        return;
      }

      // Workflow fehlgeschlagen
      if (data.status === "failed") {
        stopPolling();
        setScoreStatus("failed");
        return;
      }

      // ✅ Score vorhanden → fertig
      stopPolling();
      setMaitrScore(data.maitrScore ?? 0);
      setScoreStatus("completed");
    } catch (err) {
      // Netzwerkfehler bei einem einzelnen Poll → nicht sofort aufgeben, weiter versuchen
      if (Date.now() - startTimeRef.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setScoreStatus("timeout");
      }
    }
  }, [websiteUrl, stopPolling]);

  useEffect(() => {
    if (!enabled || !websiteUrl) {
      stopPolling();
      setScoreStatus("idle");
      return;
    }

    setScoreStatus("pending");
    startTimeRef.current = Date.now();

    // Erster Call sofort
    fetchScore();

    // Dann alle 3s
    pollRef.current = setInterval(fetchScore, POLL_INTERVAL_MS);

    return () => stopPolling();
  }, [websiteUrl, enabled, fetchScore, stopPolling]);

  return { maitrScore, scoreStatus };
}
