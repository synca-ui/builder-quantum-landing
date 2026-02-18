import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import Headbar from "@/components/Headbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import MaitrScoreCircle from "@/components/MaitrScoreCircle";
import { useAnalysis, setIsLoading, setN8nData, setSourceLink } from "@/data/analysisStore";
import { useMaitrScore } from "@/hooks/useMaitrScore";

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Component ────────────────────────────────────────────────────────────────
export default function ModeSelection() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const urlSource = params.get("sourceLink");

  const { isLoading, n8nData } = useAnalysis();
  const [copied, setCopied] = useState(false);
  const [scraperData, setScraperData] = useState<ScraperJobData | null>(null);

  const decodedUrl = urlSource ? decodeURIComponent(urlSource) : null;
  const shouldShowMaitrScore = !!urlSource && !!decodedUrl;

  const effectiveScraperData = scraperData;

  // ── Score resolution ──
  const webhookConfirmed = !!n8nData;
  const { maitrScore: hookScore, scoreStatus } = useMaitrScore(decodedUrl, webhookConfirmed);
  const maitrScore = effectiveScraperData?.maitrScore ?? hookScore ?? 0;
  const scoreIsLoading = isLoading || scoreStatus === "pending" || scoreStatus === "idle";
  const highScore = maitrScore > 80;

  // ── Flatten extracted fields ──
  const businessName = effectiveScraperData?.businessName || effectiveScraperData?.extractedData?.businessName || "";
  const businessType = effectiveScraperData?.businessType || effectiveScraperData?.extractedData?.businessType || "";
  const phone = effectiveScraperData?.phone || effectiveScraperData?.extractedData?.phone || null;
  const email = effectiveScraperData?.email || effectiveScraperData?.extractedData?.email || null;
  const instagramUrl = effectiveScraperData?.instagramUrl || effectiveScraperData?.extractedData?.instagramUrl || null;
  const menuUrl = effectiveScraperData?.menuUrl || effectiveScraperData?.extractedData?.menuUrl || null;
  const hasReservation = effectiveScraperData?.hasReservation || effectiveScraperData?.extractedData?.hasReservation || false;
  const analysisFeedback = effectiveScraperData?.analysisFeedback || effectiveScraperData?.extractedData?.analysisFeedback || null;

  // ── Extraction meta ──
  const extractionTime = (() => {
    const raw = effectiveScraperData?.completedAt || effectiveScraperData?.createdAt;
    if (!raw) return undefined;
    return new Date(raw).toLocaleString("de-DE", {
      day: "2-digit", month: "2-digit", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  })();

  const processingTime = (() => {
    if (effectiveScraperData?.completedAt && effectiveScraperData?.startedAt) {
      const ms =
        new Date(effectiveScraperData.completedAt).getTime() -
        new Date(effectiveScraperData.startedAt).getTime();
      return `${Math.round(ms / 1000)}s`;
    }
    return "5s";
  })();

  const loadingMessages = [
    "Webseite wird analysiert…",
    "Geschäftsinformationen werden extrahiert…",
    "Maitr Score wird berechnet…",
  ];

  // ── Handlers ──
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decodedUrl || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* silent */ }
  };

  useEffect(() => {
    if (urlSource) {
      setSourceLink(decodedUrl!);
      if (!n8nData) runAnalysis(decodedUrl!);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSource]);

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
        console.error("n8n forward failed", res.status);
        setIsLoading(false);
        return;
      }

      const payload = await res.json();
      if (payload?.success) {
        setN8nData({ _webhookConfirmed: true } as any);
        if (payload.scraperJob) setScraperData(payload.scraperJob);
      }
      setIsLoading(false);
    } catch (err) {
      console.error("n8n call error", err);
      setIsLoading(false);
    }
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0d1117] via-[#0f1623] to-[#0d1117]">
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
            <h1 className="text-3xl md:text-4xl font-extrabold text-white">Wie möchtest du starten?</h1>
            <p className="mt-2 text-gray-400 text-sm max-w-md mx-auto">
              Wähle die Option, die am besten zu deinen Anforderungen passt.
            </p>
          </div>
        )}

        {/* ─── MAITR SCORE CARD ────────────────────────────────────────────── */}
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

        {/* ─── SOURCE CARD ─────────────────────────────────────────────────── */}
        {shouldShowMaitrScore && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-purple-900/40 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Analysierte Website
                </div>
                <div className="mt-0.5 text-sm font-semibold text-gray-200 break-all">
                  {decodedUrl}
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  Logos & Farben können nach dem Start des automatischen Modus angepasst werden.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  navigate(
                    `/configurator/auto?sourceLink=${encodeURIComponent(decodedUrl || "")}`
                  )
                }
                className="text-xs font-semibold border-white/20 text-white hover:bg-white/10"
              >
                Automatisch starten
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="text-xs font-semibold text-gray-400 hover:text-white hover:bg-white/10"
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                {copied ? "Kopiert!" : "Kopieren"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── MODE SELECTION CARDS ────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">

          {/* Manuell */}
          <div className="rounded-2xl p-6 bg-white/5 border border-white/10 hover:border-white/20 transition-all duration-300 flex flex-col">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-900/40 shrink-0">
                <Settings className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Manuelle Konfiguration</h3>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
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
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 shrink-0" />
                  {t}
                </li>
              ))}
            </ul>

            <div className="mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configurator/manual")}
                className="w-full text-xs font-semibold border-white/20 text-white hover:bg-white/10"
              >
                Zum manuellen Konfigurator
              </Button>
            </div>
          </div>

          {/* Automatisch – empfohlen */}
          <div
            className={`relative rounded-2xl p-6 flex flex-col border transition-all duration-300 hover:border-purple-400/60 ${highScore
                ? "border-purple-500/50 bg-gradient-to-b from-purple-900/30 to-transparent"
                : "border-purple-500/30 bg-white/5"
              }`}
          >
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-500 to-orange-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3" /> Empfohlen
              </span>
            </div>

            <div className="flex items-start gap-3 mb-4 mt-1">
              <div className="p-2.5 rounded-xl bg-purple-900/40 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Automatisch (Zero-Input)</h3>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">
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
                    ? "bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 shadow-lg shadow-purple-900/40"
                    : "bg-gradient-to-r from-purple-600 to-orange-500"
                  }`}
              >
                Automatisch starten {highScore && "✨"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configurator/manual")}
                className="text-xs font-semibold text-gray-400 border-white/20 shrink-0 hover:bg-white/10 hover:text-white"
              >
                Nachher bearbeiten
              </Button>
            </div>
          </div>
        </div>

        {/* ─── FOOTER ──────────────────────────────────────────────────────── */}
        <p className="mt-8 text-center text-xs text-gray-600">
          Brauchen Sie Hilfe? Unser Concierge kann die Einrichtung für Sie abschließen — oder Sie passen alles selbst nach Ihren Wünschen an.
        </p>
      </div>
    </div>
  );
}