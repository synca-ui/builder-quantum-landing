import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Settings, Sparkles, Copy, CheckCircle2, Globe,
  Clock, Phone, Mail, Instagram, ExternalLink, Utensils,
  TrendingUp, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Headbar from "@/components/Headbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import MaitrScoreCircle from "@/components/MaitrScoreCircle";
import { useAnalysis, setIsLoading, setN8nData, setSourceLink } from "@/data/analysisStore";
import { useMaitrScore } from "@/hooks/useMaitrScore";

// ScraperJob data structure based on Prisma schema
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

export default function ModeSelection() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const urlSource = params.get("sourceLink");
  const { isLoading, n8nData } = useAnalysis();
  const [copied, setCopied] = useState(false);
  const [scraperData, setScraperData] = useState<ScraperJobData | null>(null);

  const decodedUrl = urlSource ? decodeURIComponent(urlSource) : null;

  // Nur Maitr-Score anzeigen wenn über magicLink weitergeleitet
  const shouldShowMaitrScore = !!urlSource && !!decodedUrl;

  // Für Demo-Zwecke: Test-Daten wenn ein sourceLink vorhanden ist
  const mockScraperData = shouldShowMaitrScore && !scraperData ? {
    id: "demo-123",
    businessName: "Demo Restaurant Berlin",
    businessType: "Restaurant",
    websiteUrl: decodedUrl || "https://demo-restaurant.de",
    status: "completed",
    maitrScore: 78,
    phone: "+49 30 12345678",
    email: "info@demo-restaurant.de",
    instagramUrl: "https://instagram.com/demo_restaurant",
    menuUrl: "/menu",
    hasReservation: true,
    isDeepScrapeReady: true,
    analysisFeedback: "Ihr Restaurant zeigt eine gute digitale Präsenz mit verbesserungsfähigen Bereichen.",
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    startedAt: new Date(Date.now() - 5000).toISOString(),
    extractedData: {
      businessName: "Demo Restaurant Berlin",
      businessType: "Restaurant",
      email: "info@demo-restaurant.de",
      phone: "+49 30 12345678",
      instagramUrl: "https://instagram.com/demo_restaurant",
      menuUrl: "/menu",
      hasReservation: true,
      isDeepScrapeReady: true,
      maitrScore: 78,
      analysisFeedback: "Gute Grundstruktur mit Optimierungspotential",
      analysis_timestamp: new Date().toISOString()
    }
  } : null;

  // Use mock data if no real scraper data available
  const effectiveScraperData = scraperData || mockScraperData;

  // Get maitr score from either scraperData or hook
  const webhookConfirmed = !!n8nData;
  const { maitrScore: hookScore, scoreStatus } = useMaitrScore(decodedUrl, webhookConfirmed);
  const maitrScore = effectiveScraperData?.maitrScore ?? hookScore ?? 0;

  const scoreIsLoading = isLoading || scoreStatus === "pending" || scoreStatus === "idle";

  const loadingMessages = [
    "Analyzing your website…",
    "Extracting business information…",
    "Calculating Maitr Score…",
  ];

  const highScore = maitrScore > 80;

  // Extract meaningful data from ScraperJob
  const hasExtractedData = effectiveScraperData?.status === "completed" || !!effectiveScraperData?.extractedData;

  const businessName = effectiveScraperData?.businessName ||
    effectiveScraperData?.extractedData?.businessName ||
    "";

  const businessType = effectiveScraperData?.businessType ||
    effectiveScraperData?.extractedData?.businessType ||
    "";

  const phone = effectiveScraperData?.phone ||
    effectiveScraperData?.extractedData?.phone ||
    null;

  const email = effectiveScraperData?.email ||
    effectiveScraperData?.extractedData?.email ||
    null;

  const instagramUrl = effectiveScraperData?.instagramUrl ||
    effectiveScraperData?.extractedData?.instagramUrl ||
    null;

  const menuUrl = effectiveScraperData?.menuUrl ||
    effectiveScraperData?.extractedData?.menuUrl ||
    null;

  const hasReservation = effectiveScraperData?.hasReservation ||
    effectiveScraperData?.extractedData?.hasReservation ||
    false;

  const analysisFeedback = effectiveScraperData?.analysisFeedback ||
    effectiveScraperData?.extractedData?.analysisFeedback ||
    null;

  const isDeepScrapeReady = (effectiveScraperData as any)?.isDeepScrapeReady ||
    (effectiveScraperData as any)?.extractedData?.isDeepScrapeReady ||
    false;

  // Count extracted data points for summary
  const extractedCount = [
    businessName,
    phone,
    email,
    instagramUrl,
    menuUrl,
    hasReservation,
    isDeepScrapeReady
  ].filter(Boolean).length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decodedUrl || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) { }
  };

  useEffect(() => {
    if (urlSource) {
      setSourceLink(decodedUrl!);
      if (!n8nData) {
        runAnalysis(decodedUrl!);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSource]);

  async function runAnalysis(link: string) {
    try {
      setIsLoading(true);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 30000);

      const res = await fetch(`/api/forward-to-n8n`, {
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

        // If payload contains scraper data, store it
        if (payload.scraperJob) {
          setScraperData(payload.scraperJob);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error("n8n call error", err);
      setIsLoading(false);
    }
  }

  // Helper function to get score rating text
  const getScoreRating = () => {
    if (maitrScore >= 86) return { text: "Excellent", color: "text-emerald-600", icon: <CheckCircle2 className="w-4 h-4" /> };
    if (maitrScore >= 71) return { text: "Good", color: "text-teal-600", icon: <TrendingUp className="w-4 h-4" /> };
    if (maitrScore >= 51) return { text: "Fair", color: "text-amber-600", icon: <AlertCircle className="w-4 h-4" /> };
    return { text: "Needs Work", color: "text-red-600", icon: <AlertCircle className="w-4 h-4" /> };
  };

  // Score-Zusammensetzung berechnen
  const getScoreBreakdown = () => {
    return {
      technicalScore: Math.min(25, Math.round(maitrScore * 0.3)), // Max 25 Punkte
      contentScore: Math.min(20, Math.round(maitrScore * 0.25)), // Max 20 Punkte
      businessInfoScore: Math.min(30, Math.round(maitrScore * 0.35)), // Max 30 Punkte
      digitalPresenceScore: Math.min(25, Math.round(maitrScore * 0.25)) // Max 25 Punkte
    };
  };

  // Extraktionsinformationen zusammenstellen
  const getExtractionInfo = () => {
    const extractionTime = effectiveScraperData?.completedAt || effectiveScraperData?.createdAt || new Date().toISOString();
    const analysisDate = new Date(extractionTime);

    return {
      extractionTime: analysisDate.toLocaleString('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      websiteUrl: decodedUrl,
      dataPoints: extractedCount,
      processingTime: effectiveScraperData?.completedAt && effectiveScraperData?.startedAt
        ? `${Math.round((new Date(effectiveScraperData.completedAt).getTime() - new Date(effectiveScraperData.startedAt).getTime()) / 1000)}s`
        : '5s'
    };
  };

  const scoreRating = getScoreRating();
  const scoreBreakdown = shouldShowMaitrScore ? getScoreBreakdown() : null;
  const extractionInfo = shouldShowMaitrScore ? getExtractionInfo() : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50 to-gray-100">
      <Headbar title="Selection" />
      <LoadingOverlay visible={isLoading} messages={loadingMessages} onCancel={() => setIsLoading(false)} />

      <div className="max-w-4xl mx-auto px-5 pt-10 pb-16">
        {/* ─── HERO ─── */}
        <div className="text-center mb-10">
          {/* Test Panel für Demo */}
          {!shouldShowMaitrScore && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-sm text-blue-700 mb-2">
                <strong>Demo-Modus:</strong> Um die Score-Details zu sehen, fügen Sie `?sourceLink=https://demo-restaurant.de` zur URL hinzu
              </p>
              <button
                onClick={() => window.location.href = window.location.href + '?sourceLink=https://demo-restaurant.de'}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Demo mit Score-Details anzeigen
              </button>
            </div>
          )}

          {/* Maitr-Score nur anzeigen wenn über magicLink weitergeleitet */}
          {shouldShowMaitrScore && (
            <MaitrScoreCircle score={maitrScore} isLoading={scoreIsLoading} />
          )}

          <h1 className={`${shouldShowMaitrScore ? 'mt-5' : 'mt-0'} text-3xl md:text-4xl font-extrabold text-gray-900`}>
            {shouldShowMaitrScore
              ? (businessName || "Website Analysis Complete!")
              : "Choose Your Path"
            }
          </h1>
          <p className="mt-2 text-gray-500 text-sm max-w-md mx-auto">
            {shouldShowMaitrScore
              ? (scoreIsLoading
                ? "Analyzing your site… this may take a moment."
                : analysisFeedback || "Your site analysis is complete! Choose how you'd like to proceed:")
              : "Select the option that best fits your needs to get started."
            }
          </p>

          {/* ─── DETAILED SCORE INFORMATION ─── */}
          {shouldShowMaitrScore && !scoreIsLoading && maitrScore > 0 && (
            <div className="mt-8 space-y-6">
              {/* Extrahierte Daten Zusammenfassung */}
              {hasExtractedData && extractedCount > 0 && (
                <div className="inline-flex items-center gap-3 px-5 py-3 bg-white border border-teal-100 rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-teal-50">
                      <CheckCircle2 className="w-4 h-4 text-teal-600" />
                    </div>
                    <span className="text-sm font-semibold text-gray-700">
                      {extractedCount} Datenpunkt{extractedCount !== 1 ? 'e' : ''} extrahiert
                    </span>
                  </div>

                  {/* Mini icons showing what was found */}
                  <div className="flex items-center gap-1.5 pl-3 border-l border-gray-200">
                    {businessName && (
                      <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center" title="Business name">
                        <Globe className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                    )}
                    {phone && (
                      <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center" title="Phone number">
                        <Phone className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                    )}
                    {email && (
                      <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center" title="Email">
                        <Mail className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                    )}
                    {instagramUrl && (
                      <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center" title="Instagram">
                        <Instagram className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                    )}
                    {menuUrl && (
                      <div className="w-6 h-6 rounded-md bg-teal-50 flex items-center justify-center" title="Menu">
                        <Utensils className="w-3.5 h-3.5 text-teal-600" />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Detaillierte Score-Informationen */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {/* Score Zusammensetzung */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-50">
                      <TrendingUp className="w-5 h-5 text-blue-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Score Zusammensetzung</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Technical Infrastructure</span>
                      <span className="text-sm font-bold text-gray-900">
                        {scoreBreakdown?.technicalScore || 0}/25
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Content Quality</span>
                      <span className="text-sm font-bold text-gray-900">
                        {scoreBreakdown?.contentScore || 0}/20
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Business Information</span>
                      <span className="text-sm font-bold text-gray-900">
                        {scoreBreakdown?.businessInfoScore || 0}/30
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Digital Presence</span>
                      <span className="text-sm font-bold text-gray-900">
                        {scoreBreakdown?.digitalPresenceScore || 0}/25
                      </span>
                    </div>
                    <div className="pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg">
                        <span className="text-sm font-bold text-gray-900">Gesamt Score</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-lg font-bold ${scoreRating.color}`}>
                            {maitrScore}/100
                          </span>
                          {scoreRating.icon}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Extraktions-Informationen */}
                <div className="bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-green-50">
                      <Clock className="w-5 h-5 text-green-600" />
                    </div>
                    <h3 className="font-bold text-gray-900">Analyse Details</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <span className="text-sm font-medium text-gray-700">Website URL</span>
                      </div>
                      <span className="text-sm font-mono text-gray-900 break-all mt-1">
                        {extractionInfo?.websiteUrl}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Analyse Zeit</span>
                      <span className="text-sm font-bold text-gray-900">
                        {extractionInfo?.extractionTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Verarbeitungszeit</span>
                      <span className="text-sm font-bold text-gray-900">
                        {extractionInfo?.processingTime}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <span className="text-sm font-medium text-gray-700">Datenpunkte gefunden</span>
                      <span className="text-sm font-bold text-green-600">
                        {extractionInfo?.dataPoints || 0}
                      </span>
                    </div>

                    {businessType && (
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <span className="text-sm font-medium text-gray-700">Business Type</span>
                        <span className="text-sm font-bold text-gray-900 capitalize">
                          {businessType}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── DETAILED EXTRACTED DATA SECTION ─── */}
        {shouldShowMaitrScore && hasExtractedData && !scoreIsLoading && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-50 shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">Was wir über Sie gefunden haben</h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Basierend auf Ihrem Maitr-Score von{" "}
                    <span className={`font-bold ${scoreRating.color}`}>{maitrScore}</span>
                    {" "}({scoreRating.text}) haben wir folgende Informationen extrahiert:
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {businessName && (
                <InfoCard
                  icon={<Globe className="w-4 h-4" />}
                  label="Business Name"
                  value={businessName}
                />
              )}

              {businessType && (
                <InfoCard
                  icon={<Utensils className="w-4 h-4" />}
                  label="Business Type"
                  value={businessType}
                />
              )}

              {phone && (
                <InfoCard
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={phone}
                />
              )}

              {email && (
                <InfoCard
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  value={email}
                />
              )}

              {instagramUrl && (
                <InfoCardWithLink
                  icon={<Instagram className="w-4 h-4" />}
                  label="Instagram"
                  value="Profile Found"
                  link={instagramUrl}
                />
              )}

              {menuUrl && (
                <InfoCardWithLink
                  icon={<Utensils className="w-4 h-4" />}
                  label="Menu"
                  value="Available Online"
                  link={decodedUrl + menuUrl}
                />
              )}

              {hasReservation && (
                <InfoCard
                  icon={<Clock className="w-4 h-4" />}
                  label="Reservations"
                  value="System Detected"
                />
              )}

              {isDeepScrapeReady && (
                <InfoCard
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  label="Deep Scrape"
                  value="Ready for Analysis"
                />
              )}
            </div>

            <div className="mt-5 pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                Mit dem automatischen Modus verwenden wir diese Daten, um Ihre Website sofort zu generieren
              </p>
            </div>
          </div>
        )}

        {/* ─── SOURCE CARD ─── */}
        {shouldShowMaitrScore && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-gradient-to-br from-purple-50 to-teal-50 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Analysierte Website</div>
                <div className="mt-0.5 text-sm font-semibold text-gray-800 break-all">{decodedUrl}</div>
                <div className="mt-1 text-xs text-gray-400">
                  Sie können Logos hochladen und Farben anpassen, nachdem Sie den automatischen Modus gewählt haben.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 sm:ml-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/configurator/auto?sourceLink=${encodeURIComponent(decodedUrl || "")}`)}
                className="text-xs font-semibold"
              >
                Automatisch starten
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs font-semibold text-gray-500">
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── MODE SELECTION CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {/* Manual – precise control */}
          <div className="rounded-2xl shadow-sm p-6 bg-white border border-gray-200 hover:shadow-md transition-shadow duration-300 flex flex-col">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-50 shrink-0">
                <Settings className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Manual Configuration</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Step-by-step guided setup where you control every detail. Perfect for customization and specific requirements.
                </p>
              </div>
            </div>

            <ul className="text-xs text-gray-500 space-y-1.5 mb-6 ml-0.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                Complete control over design
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                Step-by-step guided process
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                Fine-tune prices and opening hours
              </li>
            </ul>

            <div className="mt-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configurator/manual")}
                className="w-full text-xs font-semibold"
              >
                Continue to manual configurator
              </Button>
            </div>
          </div>

          {/* Automatic – recommended */}
          <div className={`relative rounded-2xl shadow-sm p-6 flex flex-col border transition-shadow duration-300 hover:shadow-md ${highScore ? "border-purple-300 bg-gradient-to-b from-purple-50 to-white" : "border-purple-200 bg-white"
            }`}>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="inline-flex items-center gap-1 bg-gradient-to-r from-purple-500 to-orange-500 text-white text-xs font-bold px-3 py-0.5 rounded-full shadow-sm">
                <Sparkles className="w-3 h-3" /> Recommended
              </span>
            </div>

            <div className="flex items-start gap-3 mb-4 mt-1">
              <div className="p-2.5 rounded-xl bg-purple-50 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Automatic (Zero-Input)</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  We extract name, address, hours, photos and more from the link and propose a ready-to-publish app. Perfect for a fast launch.
                </p>
              </div>
            </div>

            <ul className="text-xs text-gray-500 space-y-1.5 mb-6 ml-0.5">
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                Extracts menu & contact info
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                Generates colors & layout
              </li>
              <li className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                Live preview & edit after generation
              </li>
            </ul>

            <div className="mt-auto flex items-center gap-2">
              <Button
                onClick={() => navigate(`/configurator/auto${urlSource ? `?sourceLink=${urlSource}` : ""}`)}
                size="sm"
                className={`flex-1 text-xs font-bold text-white transition-all duration-300 ${highScore
                    ? "bg-gradient-to-r from-cyan-500 via-purple-500 to-orange-500 shadow-md shadow-purple-200"
                    : "bg-gradient-to-r from-purple-500 to-orange-500"
                  }`}
              >
                Start Automatic {highScore && "✨"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/configurator/manual")}
                className="text-xs font-semibold text-gray-500 shrink-0"
              >
                Edit after
              </Button>
            </div>
          </div>
        </div>

        {/* ─── FOOTER ─── */}
        <p className="mt-8 text-center text-xs text-gray-400">
          Need help? Our Concierge can finish the setup for you — or you can continue tweaking everything yourself.
        </p>
      </div>
    </div>
  );
}

// Helper component for info cards
function InfoCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="bg-teal-50/30 rounded-xl p-3 border border-teal-100/50">
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded bg-teal-50 text-teal-600">
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}

// Helper component for info cards with external links
function InfoCardWithLink({ icon, label, value, link }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  link: string;
}) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="bg-teal-50/30 rounded-xl p-3 border border-teal-100/50 hover:border-teal-200 hover:bg-teal-50/50 transition-colors group"
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="p-1.5 rounded bg-teal-50 text-teal-600">
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
        <ExternalLink className="w-3 h-3 text-gray-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className="text-sm font-medium text-teal-700 truncate group-hover:text-teal-800 transition-colors">
        {value}
      </p>
    </a>
  );
}
