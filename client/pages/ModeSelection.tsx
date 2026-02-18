import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Headbar from "@/components/Headbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import MaitrScoreCircle from "@/components/MaitrScoreCircle";
import { useAnalysis, setIsLoading, setN8nData, setSourceLink } from "@/data/analysisStore";
import { useMaitrScore } from "@/hooks/useMaitrScore";

// ─── Typen ────────────────────────────────────────────────────────────────────
interface ScraperJobData {
  id: string;
  businessName: string;
  businessType?: string;
  websiteUrl: string;
  status: string;
  extractedData?: {
    email?: string | null;
    phone?: string | null;
    status?: string;
    menuUrl?: string;
    maitrScore?: number;
    businessName?: string;
    businessType?: string;
    instagramUrl?: string;
    hasReservation?: boolean;
    analysisFeedback?: string;
    googleSearchQuery?: string;
    isDeepScrapeReady?: boolean;
    extractedData?: {
      raw_snippet?: string;
      ssl_detected?: boolean;
      analysis_timestamp?: string;
    };
  };
  userId?: string | null;
  createdAt: string;
  startedAt?: string | null;
  completedAt?: string | null;
  maitrScore?: number | null;
  email?: string | null;
  phone?: string | null;
  instagramUrl?: string | null;
  menuUrl?: string | null;
  hasReservation?: boolean;
  googleSearchQuery?: string | null;
  analysisFeedback?: string | null;
  isDeepScrapeReady?: boolean;
}

// ─── Komponente ───────────────────────────────────────────────────────────────
export default function ModeSelection() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const urlSource = params.get("sourceLink");

  const { isLoading, n8nData } = useAnalysis();
  const [copied, setCopied] = useState(false);
  const [scraperData, setScraperData] = useState<ScraperJobData | null>(null);
  const [scraperLoading, setScraperLoading] = useState(false);

  const decodedUrl = urlSource ? decodeURIComponent(urlSource) : null;
  const shouldShowMaitrScore = !!urlSource && !!decodedUrl;

  // ── Score-Auflösung ──
  const webhookConfirmed = !!n8nData;
  const { maitrScore: hookScore, scoreStatus } = useMaitrScore(decodedUrl, webhookConfirmed);
  const maitrScore = scraperData?.maitrScore ?? hookScore ?? 0;
  const scoreIsLoading = isLoading || scraperLoading || scoreStatus === "pending" || scoreStatus === "idle";
  const highScore = maitrScore > 80;

  // ── Extrahierte Felder abflachen ──
  // Daten kommen entweder aus scraperData direkt oder aus extractedData (verschachtelt)
  const businessName = scraperData?.businessName || scraperData?.extractedData?.businessName || "";
  const businessType = scraperData?.businessType || scraperData?.extractedData?.businessType || "";
  const phone = scraperData?.phone || scraperData?.extractedData?.phone || null;
  const email = scraperData?.email || scraperData?.extractedData?.email || null;
  const instagramUrl = scraperData?.instagramUrl || scraperData?.extractedData?.instagramUrl || null;
  const menuUrl = scraperData?.menuUrl || scraperData?.extractedData?.menuUrl || null;
  const hasReservation = scraperData?.hasReservation || scraperData?.extractedData?.hasReservation || false;
  const analysisFeedback = scraperData?.analysisFeedback || scraperData?.extractedData?.analysisFeedback || null;

  // ── Analyse-Meta ──
  const extractionTime = (() => {
    const raw = scraperData?.completedAt || scraperData?.createdAt;
    if (!raw) return undefined;
    return new Date(raw).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  })();

  const processingTime = (() => {
    if (scraperData?.completedAt && scraperData?.startedAt) {
      const ms =
        new Date(scraperData.completedAt).getTime() -
        new Date(scraperData.startedAt).getTime();
      return `${Math.round(ms / 1000)}s`;
    }
    return undefined;
  })();

  const loadingMessages = [
    "Webseite wird analysiert…",
    "Geschäftsinformationen werden extrahiert…",
    "Maitr Score wird berechnet…",
  ];

  // ── Scraper-Job direkt aus NeonDB laden ──────────────────────────────────
  // Wird ausgelöst sobald eine URL vorhanden ist.
  // Passt den Endpunkt (/api/scraper-job) an euren tatsächlichen Route-Namen an.
  async function fetchScraperJob(url: string) {
    try {
      setScraperLoading(true);
      const res = await fetch(
        `/api/scraper-job?url=${encodeURIComponent(url)}`,
        { method: "GET" }
      );
      if (!res.ok) {
        console.warn("ScraperJob-Fetch fehlgeschlagen:", res.status);
        return;
      }
      const data = await res.json();
      // API gibt entweder { scraperJob: {...} } oder direkt das Objekt zurück
      const job: ScraperJobData = data.scraperJob ?? data;
      if (job?.id) setScraperData(job);
    } catch (err) {
      console.error("ScraperJob-Fetch Fehler:", err);
    } finally {
      setScraperLoading(false);
    }
  }

  // ── n8n-Analyse ausführen ────────────────────────────────────────────────
  async function runAnalysis(link: string) {
    try {
      setIsLoading(true);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      const res = await fetch("/api/forward-to-n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ link, timestamp: new Date().toISOString() }),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (!res.ok) {
        console.error("n8n-Weiterleitung fehlgeschlagen:", res.status);
        setIsLoading(false);
        return;
      }

      const payload = await res.json();
      if (payload?.success) {
        setN8nData({ _webhookConfirmed: true } as any);
        // Falls n8n den Job direkt zurückgibt → verwenden
        if (payload.scraperJob) {
          setScraperData(payload.scraperJob);
        } else {
          // Ansonsten separat aus NeonDB laden
          await fetchScraperJob(link);
        }
      }
      setIsLoading(false);
    } catch (err) {
      console.error("n8n-Aufruf Fehler:", err);
      setIsLoading(false);
    }
  }

  // ── Handlers ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decodedUrl || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* still */ }
  };

  useEffect(() => {
    if (!urlSource) return;
    setSourceLink(decodedUrl!);

    if (n8nData) {
      // Webhook bereits bestätigt → nur Daten laden
      fetchScraperJob(decodedUrl!);
    } else {
      // Erste Analyse starten
      runAnalysis(decodedUrl!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSource]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <Headbar title="Auswahl" />
      <LoadingOverlay
        visible={isLoading}
        messages={loadingMessages}
        onCancel={() => setIsLoading(false)}
      />

      <div className="max-w-4xl mx-auto px-5 pt-10 pb-16">

        {/* ─── SEITENTITEL (kein sourceLink) ─── */}
        {!shouldShowMaitrScore && (
          <div className="text-center mb-10">
            <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900">
              Wie möchtest du starten?
            </h1>
            <p className="mt-2 text-gray-500 text-sm max-w-md mx-auto">
              Wähle die Option, die am besten zu deinen Anforderungen passt.
            </p>
          </div>
        )}

        {/* ─── MAITR SCORE CARD (dunkel) ─── */}
        {shouldShowMaitrScore && (
          <div className="mb-6">
            <MaitrScoreCircle
              score={maitrScore}
              isLoading={scoreIsLoading}
              businessName={businessName || undefined}
              businessType={businessType || undefined}
              phone={phone}
              email={email}
              instagramUrl={instagramUrl}
              menuUrl={menuUrl ? (decodedUrl ?? "") + menuUrl : undefined}
              hasReservation={hasReservation}
              analysisFeedback={analysisFeedback}
              websiteUrl={decodedUrl ?? undefined}
              extractionTime={extractionTime}
              processingTime={processingTime}
            />
          </div>
        )}

        {/* ─── ANALYSIERTE WEBSITE KARTE ─── */}
        {shouldShowMaitrScore && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-gradient-to-br from-purple-50 to-teal-50 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Analysierte Website
                </div>
                <div className="mt-0.5 text-sm font-semibold text-gray-800 break-all">
                  {decodedUrl}
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  Logos & Farben können nach dem Start des automatischen Modus angepasst werden.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(`/configurator/auto?sourceLink=${encodeURIComponent(decodedUrl || "")}`)
                }
                className="text-xs font-semibold"
              >
                Automatisch starten
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-xs font-semibold text-gray-500"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                {copied ? "Kopiert!" : "Kopieren"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── MODUS-AUSWAHL KARTEN ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          {/* Manuell */}
          <div className="rounded-2xl shadow-sm p-6 bg-white border border-gray-200 hover:shadow-md transition-shadow duration-300 flex flex-col">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-50 shrink-0">
                <Settings className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Manuelle Konfiguration</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Schritt-für-Schritt-Einrichtung, bei der du alles selbst bestimmst.
                  Ideal für individuelle Anpassungen und spezifische Anforderungen.
                </p>
              </div>
            </div>

            <ul className="text-xs text-gray-500 space-y-1.5 mb-6 ml-0.5">
              {[
                "Vollständige Kontrolle über das Design",
                "Geführter Schritt-für-Schritt-Prozess",
                "Preise und Öffnungszeiten selbst festlegen",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configurator/manual")}
                className="w-full text-xs font-semibold"
              >
                Zum manuellen Konfigurator
              </Button>
            </div>
          </div>

          {/* Automatisch – empfohlen */}
          <div
            className={`relative rounded-2xl shadow-sm p-6 flex flex-col border transition-shadow duration-300 hover:shadow-md ${highScore
                ? "border-purple-300 bg-gradient-to-b from-purple-50 to-white"
                : "border-purple-200 bg-white"
              }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-500 to-orange-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3" /> Empfohlen
              </span>
            </div>

            <div className="flex items-start gap-3 mb-4 mt-1">
              <div className="p-2.5 rounded-xl bg-purple-50 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Automatisch (Zero-Input)</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Wir extrahieren Name, Adresse, Öffnungszeiten, Fotos und mehr aus dem Link
                  und erstellen eine veröffentlichungsfertige App. Perfekt für einen schnellen Start.
                </p>
              </div>
            </div>

            <ul className="text-xs text-gray-500 space-y-1.5 mb-6 ml-0.5">
              {[
                "Extrahiert Menü & Kontaktdaten",
                "Generiert Farben & Layout automatisch",
                "Live-Vorschau & Bearbeitung nach der Generierung",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-auto flex items-center gap-2">
              <Button
                onClick={() =>
                  navigate(`/configurator/auto${urlSource ? `?sourceLink=${urlSource}` : ""}`)
                }
                size="sm"
                className={`flex-1 text-xs font-bold text-white transition-all duration-300 ${highScore
                    ? "bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 shadow-md shadow-purple-200"
                    : "bg-gradient-to-r from-purple-500 to-orange-500"
                  }`}
              >
                Automatisch starten {highScore && "✨"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configurator/manual")}
                className="text-xs font-semibold text-gray-500 shrink-0"
              >
                Nachher bearbeiten
              </Button>
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <p className="mt-8 text-center text-xs text-gray-400">
          Brauchen Sie Hilfe? Unser Concierge kann die Einrichtung für Sie abschließen — oder
          Sie passen alles selbst nach Ihren Wünschen an.
        </p>
      </div>
    </div>
  );
}