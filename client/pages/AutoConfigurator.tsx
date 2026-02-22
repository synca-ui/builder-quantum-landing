import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Headbar from "@/components/Headbar";
import {
  Sparkles, Upload, X, ChevronRight, ArrowLeft,
  Globe, MapPin, FileText, CheckCircle2, AlertCircle,
  Image as ImageIcon, Utensils, Camera, Zap, Search,
} from "lucide-react";

// ─── Typen ────────────────────────────────────────────────────────────────────
type GenStatus = "idle" | "loading" | "done" | "error";

interface ScraperJob {
  id?: string;
  status?: string;
  businessName?: string | null;
  businessType?: string | null;
  websiteUrl?: string;
  phone?: string | null;
  email?: string | null;
  instagramUrl?: string | null;
  menuUrl?: string | null;
  hasReservation?: boolean;
  analysisFeedback?: string | null;
  maitrScore?: number | null;
  suggestedConfig?: any;
  photos?: string[];
  extractedData?: any;
}

// ─── Schritt-Definitionen für Loading-Animation ───────────────────────────────
const STEPS = [
  { icon: Search, label: "Webseite wird analysiert", delay: 0 },
  { icon: MapPin, label: "Google Maps Daten werden extrahiert", delay: 6000 },
  { icon: Utensils, label: "Speisekarte wird gescrappt", delay: 14000 },
  { icon: Camera, label: "Fotos werden gesammelt", delay: 22000 },
  { icon: Zap, label: "Vibe & Atmosphäre wird analysiert", delay: 32000 },
  { icon: Sparkles, label: "Konfiguration wird erstellt", delay: 42000 },
];

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function getFileTypeLabel(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return "PDF";
  if (["csv", "xlsx", "xls"].includes(ext)) return "Tabelle";
  if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "Bild";
  return "Datei";
}

// ─── Haupt-Komponente ────────────────────────────────────────────────────────
export default function AutoConfigurator() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Formular-Felder
  const [url, setUrl] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fileInfo, setFileInfo] = useState<{ name: string; base64: string } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Status
  const [genStatus, setGenStatus] = useState<GenStatus>("idle");
  const [activeStep, setActiveStep] = useState(0);
  const [result, setResult] = useState<ScraperJob | null>(null);
  const [jobUrl, setJobUrl] = useState<string | null>(null);

  // ── URL-Params auslesen + ScraperJob pre-fill ────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(search);
    const src = params.get("sourceLink");
    if (!src) return;
    const decoded = decodeURIComponent(src);
    if (/maps/i.test(decoded)) setMapsLink(decoded);
    else setUrl(decoded);

    // Gespeicherte Scraper-Daten vorladen
    fetch(`/api/scraper-job/full?websiteUrl=${encodeURIComponent(decoded)}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const job: ScraperJob | null = data?.job ?? null;
        if (!job) return;
        if (job.businessName) setBusinessName(job.businessName);
      })
      .catch(() => {/* still */ });
  }, [search]);

  // ── Cleanup ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  // ── Datei-Upload ─────────────────────────────────────────────────────────
  const handleFile = useCallback(async (f?: File) => {
    if (!f) { setFileInfo(null); return; }
    try {
      const base64 = await fileToBase64(f);
      setFileInfo({ name: f.name, base64 });
    } catch {
      toast({ title: "Fehler", description: "Datei konnte nicht gelesen werden.", variant: "destructive" });
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Step-Animation ────────────────────────────────────────────────────────
  function startStepAnimation() {
    setActiveStep(0);
    STEPS.forEach((step, i) => {
      if (i === 0) return;
      setTimeout(() => setActiveStep(i), step.delay);
    });
  }

  // ── Polling für Job-Abschluss ─────────────────────────────────────────────
  function startPolling(websiteUrl: string) {
    let attempts = 0;
    const MAX = 120; // 120 × 3s = 6 Minuten max

    pollRef.current = setInterval(async () => {
      attempts++;
      if (attempts > MAX) {
        clearInterval(pollRef.current!);
        setGenStatus("error");
        toast({ title: "Timeout", description: "Der Workflow hat zu lange gebraucht.", variant: "destructive" });
        return;
      }

      try {
        const res = await fetch(`/api/scraper-job/full?websiteUrl=${encodeURIComponent(websiteUrl)}`);
        const data = await res.json();
        const job: ScraperJob | null = data?.job ?? null;

        if (!job) return;

        if (job.status === "completed") {
          clearInterval(pollRef.current!);
          setResult(job);
          setGenStatus("done");
          toast({ title: "Fertig! 🎉", description: "Deine Website-Konfiguration ist bereit." });
        } else if (job.status === "failed") {
          clearInterval(pollRef.current!);
          setGenStatus("error");
          toast({ title: "Fehler", description: "Der Scraper-Job ist fehlgeschlagen.", variant: "destructive" });
        }
      } catch { /* retry */ }
    }, 3000);
  }

  // ── Generierung starten ───────────────────────────────────────────────────
  const generate = useCallback(async () => {
    const link = url.trim() || mapsLink.trim();
    if (!link) {
      toast({ title: "URL fehlt", description: "Bitte gib eine Website-URL oder Google Maps Link ein.", variant: "destructive" });
      return;
    }

    setGenStatus("loading");
    setResult(null);
    setJobUrl(link);
    startStepAnimation();

    try {
      const res = await fetch("/api/forward-to-n8n", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link,
          mapsLink: mapsLink || null,
          businessName: businessName || null,
          deepScrape: true,
          menuFile: fileInfo ? { name: fileInfo.name, base64: fileInfo.base64 } : null,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const payload = await res.json();
      if (!payload?.success) throw new Error("n8n hat keinen Erfolg gemeldet");

      // Polling starten
      startPolling(link);
    } catch (err) {
      console.error(err);
      // Trotzdem pollen — Job könnte schon in der DB sein
      startPolling(link);
    }
  }, [url, mapsLink, businessName, fileInfo, toast]);

  // ── Konfiguration verwenden → Review-Seite ────────────────────────────────
  const goToReview = () => {
    if (!result) return;
    // Job-Daten für Review in sessionStorage cachen
    sessionStorage.setItem("autoReviewJob", JSON.stringify(result));
    navigate(`/configurator/review?url=${encodeURIComponent(jobUrl ?? url)}`);
  };

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/40 to-gray-100">
      {/* Maitr-Standard-Header */}
      <Headbar title="Automatisch" />

      {/* Zurück-Button direkt unter Header */}
      <div className="max-w-6xl mx-auto px-5 pt-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zur Auswahl
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-5 pb-16">

        {/* Seiten-Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-50 to-orange-50">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Website automatisch generieren</h1>
          </div>
          <p className="text-sm text-gray-500">
            Gib eine Website-URL oder einen Google Maps Link ein. Wir extrahieren alles automatisch — Fotos, Speisekarte, Kontakt, Vibe.
          </p>
        </div>

        {/* Zwei-Spalten-Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── LINKS: Formular ─────────────────────────────────────────── */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="space-y-4 flex-1">

              <Field
                label="Website URL"
                value={url}
                onChange={setUrl}
                placeholder="https://kleiner-kiepenkerl.de"
              />

              <Field
                label="Google Maps Link"
                value={mapsLink}
                onChange={setMapsLink}
                placeholder="https://maps.app.goo.gl/..."
                hint="Optional — hilft uns Adresse & Kontaktdaten zu finden"
              />

              <Field
                label="Restaurantname"
                value={businessName}
                onChange={setBusinessName}
                placeholder="Café Central"
                hint="Optional — wird als Fallback genutzt, falls nicht auf der Website gefunden"
              />

              {/* Datei-Upload: PDF, Bild, CSV */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Speisekarte <span className="font-normal normal-case text-gray-400">(optional)</span>
                </label>

                {!fileInfo ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${dragOver ? "border-purple-400 bg-purple-50" : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                      }`}
                  >
                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-purple-600">Klicken zum Hochladen</span> oder per Drag & Drop
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF, JPG, PNG oder CSV</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[180px]">{fileInfo.name}</p>
                        <p className="text-xs text-gray-400">{getFileTypeLabel(fileInfo.name)} hochgeladen</p>
                      </div>
                    </div>
                    <button onClick={() => setFileInfo(null)} className="text-gray-400 hover:text-red-500 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.csv,.xlsx,.xls,image/*"
                  onChange={e => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* CTA */}
            <div className="mt-6 pt-5 border-t border-gray-100">
              <Button
                onClick={generate}
                disabled={genStatus === "loading"}
                className="w-full bg-gradient-to-r from-purple-500 to-orange-500 text-white text-sm font-bold shadow-sm hover:shadow-md transition-shadow h-12 rounded-xl"
              >
                {genStatus === "loading" ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Analyse läuft…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4" />
                    Automatisch generieren
                  </span>
                )}
              </Button>

              {genStatus === "idle" && (
                <p className="text-xs text-gray-400 text-center mt-2">
                  Dauert ca. 1–3 Minuten · Fotos, Menü & Atmosphäre werden analysiert
                </p>
              )}
            </div>
          </div>

          {/* ── RECHTS: Loading-Animation / Ergebnis-Preview ────────────── */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col overflow-hidden">

            {/* Idle-Zustand */}
            {genStatus === "idle" && (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-10 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-1">Noch keine Analyse</p>
                  <p className="text-xs text-gray-400 max-w-[220px]">
                    Klicke auf „Automatisch generieren" um den Workflow zu starten.
                  </p>
                </div>
                {/* Was wird extrahiert */}
                <div className="grid grid-cols-2 gap-2 mt-2 w-full max-w-xs text-left">
                  {[
                    { icon: Globe, text: "Kontaktdaten" },
                    { icon: Utensils, text: "Speisekarte" },
                    { icon: Camera, text: "Fotos" },
                    { icon: Zap, text: "Vibe-Analyse" },
                  ].map(({ icon: Icon, text }) => (
                    <div key={text} className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                      <Icon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                      {text}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Loading-Zustand: Schritt-Animation */}
            {genStatus === "loading" && (
              <div className="flex-1 flex flex-col justify-center p-8">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6 text-center">
                  Workflow läuft
                </p>

                <div className="space-y-3">
                  {STEPS.map((step, i) => {
                    const Icon = step.icon;
                    const done = i < activeStep;
                    const active = i === activeStep;
                    const pending = i > activeStep;
                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${active ? "bg-purple-50 border border-purple-100" :
                          done ? "bg-green-50 border border-green-100 opacity-70" :
                            "bg-gray-50 border border-transparent opacity-40"
                          }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${active ? "bg-purple-100" : done ? "bg-green-100" : "bg-gray-100"
                          }`}>
                          {done ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Icon className={`w-4 h-4 ${active ? "text-purple-500" : "text-gray-400"}`} />
                          )}
                        </div>
                        <span className={`text-sm font-medium ${active ? "text-purple-700" : done ? "text-green-700" : "text-gray-400"
                          }`}>
                          {step.label}
                        </span>
                        {active && (
                          <span className="ml-auto">
                            <svg className="animate-spin h-4 w-4 text-purple-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                            </svg>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 text-center mt-6">
                  Bitte warte — dies kann 1–3 Minuten dauern.
                </p>
              </div>
            )}

            {/* Fehler-Zustand */}
            {genStatus === "error" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-red-400" />
                </div>
                <p className="text-sm font-semibold text-gray-700">Analyse fehlgeschlagen</p>
                <p className="text-xs text-gray-400 max-w-[220px]">
                  Bitte überprüfe die URL und versuche es erneut.
                </p>
                <Button
                  onClick={() => setGenStatus("idle")}
                  variant="outline"
                  size="sm"
                  className="mt-2 text-xs"
                >
                  Nochmal versuchen
                </Button>
              </div>
            )}

            {/* Done-Zustand: Ergebnis-Preview */}
            {genStatus === "done" && result && (
              <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="px-6 pt-5 pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    </div>
                    <span className="text-sm font-bold text-gray-900">Analyse abgeschlossen</span>
                  </div>
                </div>

                {/* Extrahierte Daten */}
                <div className="flex-1 overflow-auto p-5 space-y-3">
                  <ResultRow icon={<Globe />} label="Name" value={result.businessName} />
                  <ResultRow icon={<Utensils />} label="Typ" value={result.businessType} />
                  <ResultRow icon={<Globe />} label="E-Mail" value={result.email} />
                  <ResultRow icon={<Globe />} label="Telefon" value={result.phone} />
                  <ResultRow icon={<Globe />} label="Instagram" value={result.instagramUrl ? "Gefunden" : undefined} />
                  <ResultRow icon={<Utensils />} label="Speisekarte" value={result.menuUrl ? "Online verfügbar" : undefined} />
                  <ResultRow icon={<Globe />} label="Score" value={result.maitrScore ? `${result.maitrScore}/100` : undefined} />
                  {result.analysisFeedback && (
                    <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                      <p className="text-xs text-gray-500 font-medium mb-1">KI-Feedback</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{result.analysisFeedback}</p>
                    </div>
                  )}
                </div>

                {/* Footer-CTA */}
                <div className="p-5 border-t border-gray-100">
                  <Button
                    onClick={goToReview}
                    className="w-full bg-gradient-to-r from-purple-500 to-orange-500 text-white text-sm font-bold h-11 rounded-xl shadow-sm hover:shadow-md transition-shadow"
                  >
                    Konfiguration überprüfen & anpassen
                    <ChevronRight className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Hilfs-Komponenten ────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, hint }: {
  label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <Input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-100 text-sm"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function ResultRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <div className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 text-teal-500">
        {React.cloneElement(icon as React.ReactElement, { className: "w-3.5 h-3.5" })}
      </div>
      <span className="text-xs text-gray-400 font-medium w-24 shrink-0">{label}</span>
      <span className="text-xs font-semibold text-gray-800 truncate">{value}</span>
    </div>
  );
}