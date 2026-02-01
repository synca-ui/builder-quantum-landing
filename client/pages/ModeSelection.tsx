import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Sparkles, Copy, CheckCircle2, Globe, MapPin, Clock, Phone, Mail, Image as ImageIcon, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import Headbar from "@/components/Headbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import MaitrScoreCircle from "@/components/MaitrScoreCircle";
import { useAnalysis, setIsLoading, setN8nData, setSourceLink } from "@/data/analysisStore";
import { useMaitrScore } from "../../server/routes/useMaitrScore.ts";

// Define interface for extracted data
interface ExtractedData {
  name?: string;
  address?: string;
  opening_hours?: any;
  phone?: string;
  email?: string;
  images?: string[];
  menu_items?: any[];
  menuItems?: any[];
  colors?: string[];
  [key: string]: any; // Allow additional properties
}

export default function ModeSelection() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const urlSource = params.get("sourceLink");
  const { isLoading, n8nData } = useAnalysis();
  const [copied, setCopied] = useState(false);

  // Decodierte URL für Polling + Anzeige
  const decodedUrl = urlSource ? decodeURIComponent(urlSource) : null;

  // Polling startet erst nachdem der n8n-Webhook-Call gemacht wurde
  const webhookConfirmed = !!n8nData;
  const { maitrScore, scoreStatus } = useMaitrScore(decodedUrl, webhookConfirmed);

  // Score-Kreis: Loading solange pending, sonst den Score zeigen
  const scoreIsLoading = isLoading || scoreStatus === "pending" || scoreStatus === "idle";

  const loadingMessages = [
    "Maitr is analyzing…",
    "Gathering branding…",
    "Almost ready…",
  ];

  const highScore = maitrScore > 80;

  // Extract extracted data from n8nData if available
  const extractedData: ExtractedData = n8nData?.analysis || n8nData?.restaurant || {};
  const hasExtractedData = Object.keys(extractedData).length > 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decodedUrl || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {}
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
      const timer = setTimeout(() => controller.abort(), 25000);

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
      }

      setIsLoading(false);
    } catch (err) {
      console.error("n8n call error", err);
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50 to-gray-100">
      <Headbar title="Selection" />
      <LoadingOverlay visible={isLoading} messages={loadingMessages} onCancel={() => setIsLoading(false)} />

      <div className="max-w-4xl mx-auto px-5 pt-10 pb-16">

        {/* ─── HERO ─── */}
        <div className="text-center mb-10">
          <MaitrScoreCircle score={maitrScore} isLoading={scoreIsLoading} />

          <h1 className="mt-5 text-3xl md:text-4xl font-extrabold text-gray-900">
            Welcome, Friend!
          </h1>
          <p className="mt-2 text-gray-500 text-sm max-w-md mx-auto">
            {scoreIsLoading
              ? "Analyzing your site… this may take a moment."
              : "Your site looks great! Choose how you'd like to proceed:"}
          </p>
        </div>

        {/* ─── WHAT WE ALREADY KNOW SECTION ─── */}
        {hasExtractedData && !scoreIsLoading && (
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-100 rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-teal-100 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-teal-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 mb-1">What we already know</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Based on your Maitr Score of <span className="font-bold text-teal-600">{maitrScore}</span>,
                  we've automatically extracted the following information from your website:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
              {extractedData.name && (
                <InfoCard
                  icon={<Globe className="w-4 h-4" />}
                  label="Business Name"
                  value={extractedData.name}
                />
              )}
              {extractedData.address && (
                <InfoCard
                  icon={<MapPin className="w-4 h-4" />}
                  label="Address"
                  value={extractedData.address}
                />
              )}
              {extractedData.opening_hours && (
                <InfoCard
                  icon={<Clock className="w-4 h-4" />}
                  label="Opening Hours"
                  value="Available"
                />
              )}
              {extractedData.phone && (
                <InfoCard
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={extractedData.phone}
                />
              )}
              {extractedData.email && (
                <InfoCard
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  value={extractedData.email}
                />
              )}
              {extractedData.images && extractedData.images.length > 0 && (
                <InfoCard
                  icon={<ImageIcon className="w-4 h-4" />}
                  label="Images"
                  value={`${extractedData.images.length} found`}
                />
              )}
              {(extractedData.menu_items || extractedData.menuItems) && (
                <InfoCard
                  icon={<Star className="w-4 h-4" />}
                  label="Menu Items"
                  value="Extracted"
                />
              )}
              {extractedData.colors && extractedData.colors.length > 0 && (
                <div className="bg-white rounded-xl p-3 border border-teal-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="p-1.5 rounded bg-teal-50">
                      <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded" />
                    </div>
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Brand Colors</span>
                  </div>
                  <div className="flex gap-1.5">
                    {extractedData.colors.slice(0, 5).map((color: string, idx: number) => (
                      <div
                        key={idx}
                        className="w-6 h-6 rounded-lg border border-gray-200 shadow-sm"
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-teal-100">
              <p className="text-xs text-gray-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                With automatic mode, we'll use this data to generate your website instantly
              </p>
            </div>
          </div>
        )}

        {/* ─── SOURCE CARD ─── */}
        {urlSource && (
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-lg bg-gradient-to-br from-purple-50 to-teal-50 shrink-0">
                <Sparkles className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Detected source</div>
                <div className="mt-0.5 text-sm font-semibold text-gray-800 break-all">{decodedUrl}</div>
                <div className="mt-1 text-xs text-gray-400">
                  You can upload logos and tweak colors after choosing automatic mode.
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
                Start Automatic
              </Button>
              <Button variant="ghost" size="sm" onClick={handleCopy} className="text-xs font-semibold text-gray-500">
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                {copied ? "Copied!" : "Copy"}
              </Button>
            </div>
          </div>
        )}

        {/* ─── TWO OPTION CARDS ─── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Manual */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col hover:shadow-md transition-shadow duration-300">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-teal-50 shrink-0">
                <Settings className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-base">Guided (Manual)</h3>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Step through content, colors and modules with full control. Best if you want to exactly tailor the look-and-feel.
                </p>
              </div>
            </div>

            <ul className="text-xs text-gray-500 space-y-1.5 mb-6 ml-0.5">
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" /> Pick sections and modules</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" /> Upload logos & images</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" /> Fine-tune prices and opening hours</li>
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
          <div className={`relative rounded-2xl shadow-sm p-6 flex flex-col border transition-shadow duration-300 hover:shadow-md ${highScore ? "border-purple-300 bg-gradient-to-b from-purple-50 to-white" : "border-purple-200 bg-white"}`}>
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
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" /> Extracts menu & images</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" /> Generates colors & layout</li>
              <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" /> Live preview & edit after generation</li>
            </ul>

            <div className="mt-auto flex items-center gap-2">
              <Button
                onClick={() => navigate(`/configurator/auto${urlSource ? `?sourceLink=${urlSource}` : ""}`)}
                size="sm"
                className={`flex-1 text-xs font-bold text-white transition-all duration-300 ${
                  highScore
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
    <div className="bg-white rounded-xl p-3 border border-teal-100">
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