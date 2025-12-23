import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Sparkles, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import Headbar from "@/components/Headbar";
import LoadingOverlay from "@/components/LoadingOverlay";
import { useAnalysis, setIsLoading, setN8nData, setSourceLink } from "@/data/analysisStore";
import type { N8nResult } from "@/types/n8n";

export default function ModeSelection() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const urlSource = params.get("sourceLink");
  const { isLoading, n8nData } = useAnalysis();
  const [copied, setCopied] = useState(false);

  const messages = [
    "Gathering ingredients from your site…",
    "Analyzing branding & colors…",
    "Digitalizing your menu…",
  ];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decodeURIComponent(urlSource || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (urlSource) {
      const decoded = decodeURIComponent(urlSource);
      setSourceLink(decoded);
      // Only run analysis if we don't already have n8nData cached
      if (!n8nData) {
        runAnalysis(decoded);
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
        setIsLoading(false);
        console.error("n8n forward failed", res.status);
        return;
      }

      const payload = await res.json();

      // payload shape: { success: true, forwarded: true, response: <json|text> }
      const data = (payload?.response ?? payload) as N8nResult;

      setN8nData(data || null);
    } catch (err) {
      console.error("n8n call error", err);
    } finally {
      setIsLoading(false);
    }
  }

  const recommendedFullAuto = n8nData?.analysis?.recommendation === "full_auto";
  const highScore = (n8nData?.analysis?.maitr_score ?? 0) > 80;

  return (
    <div>
      <Headbar title="Selection" breadcrumbs={["Dashboard", "Selection"]} />

      <LoadingOverlay visible={isLoading} messages={messages} onCancel={() => setIsLoading(false)} />

      <div className="min-h-screen flex items-start justify-center bg-gradient-to-b from-white via-teal-50 to-gray-100 p-6">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-6">
            {n8nData && (
              <div className="mb-4 p-4 bg-gradient-to-r from-cyan-50 to-orange-50 rounded-xl border border-cyan-200">
                <div className="text-sm font-medium text-gray-600">Maitr Score</div>
                <div className="text-4xl font-black bg-gradient-to-r from-cyan-500 to-orange-500 bg-clip-text text-transparent mt-1">
                  {n8nData.analysis.maitr_score}
                </div>
              </div>
            )}
            <h1 className="text-3xl md:text-4xl font-extrabold">
              {n8nData ? `Welcome, ${n8nData.restaurant.name}!` : "How would you like Maitr to help?"}
            </h1>
            <p className="mt-2 text-gray-600">
              {n8nData
                ? "Your site looks great! Choose how you'd like to proceed:"
                : "Choose between a guided manual setup or let Maitr build a working app automatically from a single link."}
            </p>
          </div>

          {urlSource && (
            <div className="bg-white shadow-md rounded-2xl p-4 border border-gray-100 mb-6 flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-teal-50">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Detected source</div>
                  <div className="mt-1 text-sm font-medium break-words text-gray-800 max-w-xl">
                    {decodeURIComponent(urlSource)}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Tip: You can upload logos and tweak colors after choosing
                    automatic mode.
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    navigate(
                      `/configurator/auto?sourceLink=${encodeURIComponent(decodeURIComponent(urlSource))}`,
                    )
                  }
                >
                  Start Automatic
                </Button>
                <Button variant="ghost" size="sm" onClick={handleCopy} className="flex items-center">
                  <Copy className="w-4 h-4 mr-2" /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-teal-100 to-white">
                    <Settings className="w-8 h-8 text-teal-600" style={{ color: n8nData?.branding?.primary_color }} />
                  </div>
                  <div>
                    <CardTitle>Guided (Manual)</CardTitle>
                    <CardDescription>
                      Step through content, colors and modules with full
                      control. Best if you want to exactly tailor the
                      look-and-feel.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="mt-2 text-sm text-gray-600 space-y-2 list-inside">
                  <li>• Pick sections and modules</li>
                  <li>• Upload logos & images</li>
                  <li>• Fine-tune prices and opening hours</li>
                </ul>

                <div className="mt-6">
                  <Button
                    onClick={() => navigate("/configurator/manual")}
                    variant={"outline"}
                    size="sm"
                    className=""
                  >
                    Continue to manual configurator
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-100 to-orange-50">
                    <Sparkles className="w-8 h-8 text-purple-600" style={{ color: n8nData?.branding?.primary_color }} />
                  </div>
                  <div>
                    <CardTitle>Automatic (Zero-Input)</CardTitle>
                    <CardDescription>
                      We extract name, address, hours, photos and more from the
                      link and propose a ready-to-publish app. Perfect for a
                      fast launch.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <ul className="mt-2 text-sm text-gray-600 space-y-2 list-inside">
                  <li>• Extracts menu & images</li>
                  <li>• Generates colors & layout</li>
                  <li>• Live preview & edit after generation</li>
                </ul>

                <div className="mt-6 flex items-center gap-3">
                  <Button
                    onClick={() =>
                      navigate(
                        `/configurator/auto${urlSource ? `?sourceLink=${urlSource}` : ""}`,
                      )
                    }
                    className={`${
                      highScore
                        ? "bg-gradient-to-r from-cyan-400 via-purple-500 to-orange-500 text-white shadow-lg shadow-orange-400/40 animate-pulse scale-105 font-bold"
                        : "bg-gradient-to-r from-purple-500 to-orange-500 text-white"
                    } transition-all duration-300`}
                  >
                    Start Automatic
                    {highScore && <span className="ml-2">✨</span>}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/configurator/manual")}
                  >
                    I want to edit after
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-10 text-center text-sm text-gray-500">
            Need help? Our Concierge can finish the setup for you — or you can
            continue tweaking everything yourself.
          </div>
        </div>
      </div>
    </div>
  );
}
