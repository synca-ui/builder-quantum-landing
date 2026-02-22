import React, { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import Headbar from "@/components/Headbar";
import {
  ArrowLeft,
  ChevronRight,
  CheckCircle2,
  Globe,
  Phone,
  Mail,
  Instagram,
  Utensils,
  Clock,
  Star,
  Image as ImageIcon,
  Sparkles,
  Edit3,
  Palette,
  Type,
  MapPin,
  Check,
  Info,
  Building,
  FileText,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// Typen
// ─────────────────────────────────────────────────────────────────────────────
interface ReviewJob {
  businessName?: string | null;
  businessType?: string | null;
  phone?: string | null;
  email?: string | null;
  instagramUrl?: string | null;
  menuUrl?: string | null;
  hasReservation?: boolean;
  analysisFeedback?: string | null;
  maitrScore?: number | null;
  websiteUrl?: string;
  suggestedConfig?: any;
  extractedData?: any;
}

interface ReviewForm {
  businessName: string;
  businessType: string;
  slogan: string;
  description: string;
  phone: string;
  email: string;
  location: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  fontFamily: string;
  template: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Konstanten
// ─────────────────────────────────────────────────────────────────────────────
const FONT_OPTIONS = [
  {
    id: "sans-serif",
    name: "Sans Serif",
    class: "font-sans",
    preview: "Modern & Clean",
    description: "Perfekt für digitale Lesbarkeit",
  },
  {
    id: "serif",
    name: "Serif",
    class: "font-serif",
    preview: "Klassisch & Elegant",
    description: "Traditionell und anspruchsvoll",
  },
  {
    id: "mono",
    name: "Display",
    class: "font-mono",
    preview: "Bold & Kreativ",
    description: "Auffällig und einzigartig",
  },
];

const TEMPLATE_OPTIONS = [
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Klar, aufgeräumt, modern",
  },
  {
    id: "classic",
    name: "Classic",
    description: "Warm, einladend, traditionell",
  },
  { id: "bold", name: "Bold", description: "Mutig, lebendig, auffällig" },
];

const COLOR_PRESETS = [
  { primary: "#2563EB", secondary: "#7C3AED", bg: "#EFF6FF", name: "Ocean" },
  { primary: "#059669", secondary: "#10B981", bg: "#F0FDF4", name: "Forest" },
  { primary: "#DC2626", secondary: "#F59E0B", bg: "#FFF7ED", name: "Sunset" },
  { primary: "#7C2D12", secondary: "#EA580C", bg: "#FFEDD5", name: "Autumn" },
  { primary: "#1F2937", secondary: "#374151", bg: "#F3F4F6", name: "Elegant" },
  { primary: "#BE185D", secondary: "#EC4899", bg: "#FDF2F8", name: "Berry" },
  { primary: "#6366F1", secondary: "#8B5CF6", bg: "#EEF2FF", name: "Purple" },
  { primary: "#0891B2", secondary: "#06B6D4", bg: "#ECFEFF", name: "Sky" },
];

const BUSINESS_TYPES = [
  "restaurant",
  "cafe",
  "bar",
  "bakery",
  "pizzeria",
  "sushi",
  "steakhouse",
  "bistro",
  "imbiss",
  "foodtruck",
];

// ─────────────────────────────────────────────────────────────────────────────
// Schritt-Indikator
// ─────────────────────────────────────────────────────────────────────────────
const STEPS_NAV = [
  { label: "Basis", icon: Building },
  { label: "Design", icon: Palette },
  { label: "Inhalte", icon: FileText },
  { label: "Erstellen", icon: Sparkles },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-12">
      {STEPS_NAV.map((s, i) => {
        const Icon = s.icon;
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={i}>
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                  done
                    ? "bg-teal-500 border-teal-500"
                    : active
                      ? "bg-white border-teal-500 shadow-md"
                      : "bg-white border-gray-200"
                }`}
              >
                {done ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Icon
                    className={`w-4 h-4 ${active ? "text-teal-600" : "text-gray-300"}`}
                  />
                )}
              </div>
              <span
                className={`text-xs font-semibold ${active ? "text-teal-600" : done ? "text-gray-500" : "text-gray-300"}`}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS_NAV.length - 1 && (
              <div
                className={`h-0.5 w-16 mx-1 mb-5 transition-all ${i < current ? "bg-teal-500" : "bg-gray-200"}`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Farbfeld
// ─────────────────────────────────────────────────────────────────────────────
function ColorInput({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <label className="relative cursor-pointer group">
          <div
            className="w-12 h-12 rounded-xl border-2 border-white shadow-md group-hover:scale-105 transition-transform"
            style={{ background: value }}
          />
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
          />
        </label>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
          className="w-32 font-mono text-sm rounded-xl"
        />
        {hint && <p className="text-xs text-gray-400">{hint}</p>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hauptkomponente
// ─────────────────────────────────────────────────────────────────────────────
export default function AutoReview() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { toast } = useToast();

  const [job, setJob] = useState<ReviewJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0); // 0 Basis | 1 Design | 2 Inhalte | 3 Erstellen

  const [form, setForm] = useState<ReviewForm>({
    businessName: "",
    businessType: "restaurant",
    slogan: "",
    description: "",
    phone: "",
    email: "",
    location: "",
    primaryColor: "#7c3aed",
    secondaryColor: "#f97316",
    backgroundColor: "#ffffff",
    fontFamily: "sans-serif",
    template: "minimalist",
  });

  const set = useCallback(
    <K extends keyof ReviewForm>(k: K, v: ReviewForm[K]) => {
      setForm((prev) => ({ ...prev, [k]: v }));
    },
    [],
  );

  // ── Daten laden ──────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams(search);
    const wsUrl = params.get("url");

    const cached = sessionStorage.getItem("autoReviewJob");
    if (cached) {
      try {
        const j: ReviewJob = JSON.parse(cached);
        setJob(j);
        prefill(j);
        setLoading(false);
        return;
      } catch {
        /* fallback */
      }
    }

    if (!wsUrl) {
      setLoading(false);
      return;
    }

    fetch(`/api/scraper-job/full?websiteUrl=${encodeURIComponent(wsUrl)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.job) {
          setJob(data.job);
          prefill(data.job);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [search]);

  function prefill(j: ReviewJob) {
    const cfg = j.suggestedConfig ?? j.extractedData ?? {};
    setForm((prev) => ({
      ...prev,
      businessName: j.businessName || cfg.businessName || "",
      businessType: j.businessType || cfg.businessType || "restaurant",
      slogan: cfg.slogan || "",
      description: cfg.description || j.analysisFeedback || "",
      phone: j.phone || cfg.phone || "",
      email: j.email || cfg.email || "",
      location: cfg.location || "",
      primaryColor: cfg.primaryColor || prev.primaryColor,
      secondaryColor: cfg.secondaryColor || prev.secondaryColor,
      backgroundColor: cfg.backgroundColor || prev.backgroundColor,
      fontFamily: cfg.fontFamily || prev.fontFamily,
      template: cfg.template || prev.template,
    }));
  }

  // ── App erstellen ────────────────────────────────────────────────────────
  const handleCreate = async () => {
    setSaving(true);
    try {
      const mapped = {
        userId: localStorage.getItem("sync_user_id") || undefined,
        businessName: form.businessName,
        businessType: form.businessType,
        location: form.location,
        slogan: form.slogan,
        uniqueDescription: form.description,
        template: form.template,
        primaryColor: form.primaryColor,
        secondaryColor: form.secondaryColor,
        backgroundColor: form.backgroundColor,
        fontFamily: form.fontFamily,
        contactMethods: [form.phone, form.email].filter(Boolean),
        socialMedia: job?.instagramUrl ? { instagram: job.instagramUrl } : {},
        menuItems: job?.suggestedConfig?.menuItems || [],
        gallery: job?.suggestedConfig?.gallery || [],
        openingHours: job?.suggestedConfig?.openingHours || {},
        selectedPages: ["home", "menu", "contact"],
        status: "draft",
        websiteUrl: job?.websiteUrl,
        maitrScore: job?.maitrScore,
      };

      localStorage.setItem("configuratorData", JSON.stringify(mapped));
      sessionStorage.removeItem("autoReviewJob");

      toast({
        title: "Bereit! 🎉",
        description: "Deine Konfiguration wird geladen.",
      });
      navigate("/configurator");
    } catch {
      toast({
        title: "Fehler",
        description: "Bitte versuche es erneut.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const photos = job?.suggestedConfig?.gallery ?? [];
  const menuItems = job?.suggestedConfig?.menuItems ?? [];
  const extractedColors = job?.suggestedConfig?.colors ?? [];

  // ─── Lade-Screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/40 to-gray-100">
        <Headbar title="Überprüfen & Anpassen" />
        <div className="flex items-center justify-center h-64">
          <div className="text-sm text-gray-400 animate-pulse flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-teal-500"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            Daten werden geladen…
          </div>
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50/40 to-gray-100">
      <Headbar title="Überprüfen & Anpassen" />

      <div className="max-w-4xl mx-auto px-5 pt-4 pb-20">
        {/* Zurück */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors mb-8"
        >
          <ArrowLeft className="w-4 h-4" />
          Zurück zum Konfigurator
        </button>

        {/* Seiten-Header */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
            </div>
            {job?.maitrScore && (
              <div className="flex items-baseline gap-1 px-3 py-1 rounded-full bg-teal-50 border border-teal-100">
                <span className="text-lg font-black text-teal-600">
                  {job.maitrScore}
                </span>
                <span className="text-xs text-teal-400 font-medium">
                  /100 Maitr Score
                </span>
              </div>
            )}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">
            Überprüfe & passe an
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Wir haben alles automatisch extrahiert. Überprüfe die Daten und
            passe sie nach Bedarf an.
          </p>
        </div>

        {/* Schritt-Indikator */}
        <StepIndicator current={step} />

        {/* ════════════════════════════════════════════════
            SCHRITT 0 — Basis-Informationen
        ════════════════════════════════════════════════ */}
        {step === 0 && (
          <div className="space-y-6">
            {/* KI-Extraktion Zusammenfassung */}
            {job && (
              <div className="bg-teal-50 border border-teal-100 rounded-2xl p-5 flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-teal-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-teal-800 mb-1">
                    Automatisch extrahiert
                  </p>
                  <p className="text-xs text-teal-700 leading-relaxed">
                    {[
                      job.businessName && `Name: ${job.businessName}`,
                      job.phone && `Telefon: ${job.phone}`,
                      job.email && `E-Mail: ${job.email}`,
                      menuItems.length && `${menuItems.length} Gerichte`,
                      photos.length && `${photos.length} Fotos`,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Building className="w-5 h-5 text-teal-600" />{" "}
                Basis-Informationen
              </h3>
              <div className="grid sm:grid-cols-2 gap-6">
                <FormField
                  label="Restaurantname *"
                  value={form.businessName}
                  onChange={(v) => set("businessName", v)}
                  placeholder="z.B. Kleiner Kiepenkerl"
                />
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Typ
                  </label>
                  <select
                    value={form.businessType}
                    onChange={(e) => set("businessType", e.target.value)}
                    className="w-full rounded-xl border border-gray-200 text-sm px-3 py-2 focus:border-teal-400 focus:ring-1 focus:ring-teal-100 outline-none bg-white"
                  >
                    {BUSINESS_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
                <FormField
                  label="Slogan"
                  value={form.slogan}
                  onChange={(v) => set("slogan", v)}
                  placeholder="Kurzer einprägsamer Satz…"
                />
                <FormField
                  label="Standort"
                  value={form.location}
                  onChange={(v) => set("location", v)}
                  placeholder="Münster, NRW"
                />
                <FormField
                  label="Telefon"
                  value={form.phone}
                  onChange={(v) => set("phone", v)}
                  placeholder="+49 251 …"
                />
                <FormField
                  label="E-Mail"
                  value={form.email}
                  onChange={(v) => set("email", v)}
                  placeholder="info@…"
                />
              </div>
              <div className="mt-6">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Beschreibung
                </label>
                <Textarea
                  value={form.description}
                  onChange={(e) => set("description", e.target.value)}
                  placeholder="Kurze Beschreibung des Restaurants…"
                  rows={3}
                  className="rounded-xl border-gray-200 focus:border-teal-400 text-sm resize-none"
                />
              </div>
            </div>

            {/* KI-Feedback */}
            {job?.analysisFeedback && (
              <div className="bg-purple-50 border border-purple-100 rounded-2xl p-6">
                <h3 className="text-sm font-bold text-purple-800 mb-2 flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> KI-Analyse
                </h3>
                <p className="text-sm text-purple-700 leading-relaxed">
                  {job.analysisFeedback}
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════════════════════════════════════
            SCHRITT 1 — Design
        ════════════════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Template */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-teal-600" /> Website-Stil
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {TEMPLATE_OPTIONS.map((t) => (
                  <Card
                    key={t.id}
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      form.template === t.id
                        ? "border-teal-500 bg-teal-50 shadow-md"
                        : "border-gray-200 hover:border-teal-300 hover:shadow-sm"
                    }`}
                    onClick={() => set("template", t.id)}
                  >
                    <CardContent className="p-5 text-center">
                      <div className="font-bold text-sm text-gray-900 mb-1">
                        {t.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {t.description}
                      </div>
                      {form.template === t.id && (
                        <div className="mt-3 flex justify-center">
                          <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Farb-Presets */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Palette className="w-5 h-5 text-teal-600" /> Farben
              </h3>

              {/* Extrahierte Marken-Farben */}
              {extractedColors.length > 0 && (
                <div className="mb-6">
                  <p className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-teal-500" />
                    Automatisch extrahierte Marken-Farben
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {extractedColors.slice(0, 8).map((c: string, i: number) => (
                      <button
                        key={i}
                        onClick={() => set("primaryColor", c)}
                        title={c}
                        className={`w-10 h-10 rounded-xl border-2 transition-all hover:scale-110 ${
                          form.primaryColor === c
                            ? "border-teal-500 shadow-md scale-110"
                            : "border-white shadow"
                        }`}
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Color Presets */}
              <div className="mb-6">
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Schnell-Presets
                </p>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => {
                        set("primaryColor", preset.primary);
                        set("secondaryColor", preset.secondary);
                        set("backgroundColor", preset.bg);
                      }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all ${
                        form.primaryColor === preset.primary
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-gray-200 text-gray-600 hover:border-teal-300"
                      }`}
                    >
                      <span
                        className="w-3 h-3 rounded-full inline-block"
                        style={{ background: preset.primary }}
                      />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Manuelle Farben */}
              <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
                <ColorInput
                  label="Primärfarbe (Buttons, CTAs)"
                  value={form.primaryColor}
                  onChange={(v) => set("primaryColor", v)}
                />
                <ColorInput
                  label="Sekundärfarbe (Akzente)"
                  value={form.secondaryColor}
                  onChange={(v) => set("secondaryColor", v)}
                />
                <ColorInput
                  label="Hintergrundfarbe"
                  value={form.backgroundColor}
                  onChange={(v) => set("backgroundColor", v)}
                />
              </div>
            </div>

            {/* Schrift */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Type className="w-5 h-5 text-teal-600" /> Typografie
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {FONT_OPTIONS.map((font) => (
                  <Card
                    key={font.id}
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      form.fontFamily === font.id
                        ? "border-teal-500 bg-teal-50 shadow-md"
                        : "border-gray-200 hover:border-teal-300 hover:shadow-sm"
                    }`}
                    onClick={() => set("fontFamily", font.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`text-2xl font-bold mb-2 ${font.class}`}>
                        Ag
                      </div>
                      <div className="font-bold text-sm text-gray-900">
                        {font.name}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {font.preview}
                      </div>
                      {form.fontFamily === font.id && (
                        <div className="mt-3 flex justify-center">
                          <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            SCHRITT 2 — Inhalte (Menü, Fotos)
        ════════════════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-6">
            {/* Menü */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Utensils className="w-5 h-5 text-teal-600" />
                Speisekarte
                {menuItems.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    · {menuItems.length} Gerichte extrahiert
                  </span>
                )}
              </h3>
              {menuItems.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                  {menuItems.slice(0, 30).map((item: any, i: number) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-white rounded-xl px-4 py-2.5 border border-gray-100"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-700 truncate">
                          {item.name || item.title || "Gericht"}
                        </span>
                      </div>
                      {item.price && (
                        <span className="text-sm font-bold text-gray-500 shrink-0 ml-3">
                          {item.price}
                        </span>
                      )}
                    </div>
                  ))}
                  {menuItems.length > 30 && (
                    <p className="text-xs text-gray-400 px-4 py-2">
                      +{menuItems.length - 30} weitere Gerichte
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <Utensils className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Keine Speisekarte extrahiert.</p>
                  <p className="text-xs mt-1">
                    Du kannst sie später im Konfigurator manuell hinzufügen.
                  </p>
                </div>
              )}
            </div>

            {/* Fotos */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-teal-600" />
                Fotos
                {photos.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-gray-400">
                    · {photos.length} gefunden
                  </span>
                )}
              </h3>
              {photos.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                  {photos.slice(0, 12).map((src: string, i: number) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl overflow-hidden bg-gray-200 border border-white shadow-sm"
                    >
                      <img
                        src={src}
                        alt=""
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  ))}
                  {photos.length > 12 && (
                    <div className="aspect-square rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center">
                      <span className="text-xs font-bold text-gray-400">
                        +{photos.length - 12}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Keine Fotos extrahiert.</p>
                  <p className="text-xs mt-1">
                    Du kannst sie später manuell hochladen.
                  </p>
                </div>
              )}
            </div>

            {/* Gefundene Links */}
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-teal-600" /> Kontakt & Links
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { icon: Globe, label: "Website", value: job?.websiteUrl },
                  { icon: Phone, label: "Telefon", value: job?.phone },
                  { icon: Mail, label: "E-Mail", value: job?.email },
                  {
                    icon: Instagram,
                    label: "Instagram",
                    value: job?.instagramUrl,
                  },
                  { icon: Utensils, label: "Speisekarte", value: job?.menuUrl },
                  {
                    icon: Clock,
                    label: "Reservierung",
                    value: job?.hasReservation ? "System erkannt" : undefined,
                  },
                ]
                  .filter((r) => r.value)
                  .map(({ icon: Icon, label, value }) => (
                    <div
                      key={label}
                      className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3"
                    >
                      <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-teal-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-400 font-medium">
                          {label}
                        </p>
                        <p className="text-sm font-semibold text-gray-700 truncate">
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            SCHRITT 3 — Bestätigen & Erstellen
        ════════════════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-teal-600" /> Zusammenfassung
              </h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { label: "Name", value: form.businessName },
                  { label: "Typ", value: form.businessType },
                  { label: "Standort", value: form.location },
                  { label: "Telefon", value: form.phone },
                  { label: "E-Mail", value: form.email },
                  { label: "Template", value: form.template },
                  { label: "Schrift", value: form.fontFamily },
                  {
                    label: "Menü-Gerichte",
                    value: menuItems.length
                      ? `${menuItems.length} extrahiert`
                      : "Manuell hinzufügen",
                  },
                  {
                    label: "Fotos",
                    value: photos.length
                      ? `${photos.length} extrahiert`
                      : "Manuell hochladen",
                  },
                ]
                  .filter((r) => r.value)
                  .map(({ label, value }) => (
                    <div
                      key={label}
                      className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3"
                    >
                      <Check className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs text-gray-400 font-medium">
                          {label}
                        </p>
                        <p className="text-sm font-semibold text-gray-700">
                          {value}
                        </p>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Farb-Vorschau */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-bold text-gray-700 mb-3">
                  Farbpalette
                </p>
                <div className="flex gap-3">
                  {[
                    form.primaryColor,
                    form.secondaryColor,
                    form.backgroundColor,
                  ].map((c, i) => (
                    <div key={i} className="flex flex-col items-center gap-1">
                      <div
                        className="w-10 h-10 rounded-xl border border-gray-200 shadow-sm"
                        style={{ background: c }}
                      />
                      <span className="text-xs text-gray-400 font-mono">
                        {c}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CTA-Box */}
            <div className="bg-gradient-to-br from-teal-50 to-purple-50 border border-teal-100 rounded-2xl p-8 text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Alles bereit!
              </h3>
              <p className="text-sm text-gray-600 mb-6 max-w-sm mx-auto">
                Deine App wird mit allen extrahierten Daten erstellt. Du kannst
                danach noch alles weiter anpassen.
              </p>
              <Button
                onClick={handleCreate}
                disabled={saving || !form.businessName}
                size="lg"
                className="bg-gradient-to-r from-teal-500 to-purple-500 text-white shadow-lg hover:shadow-xl transition-shadow px-10"
              >
                {saving ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="animate-spin h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                      />
                    </svg>
                    Wird erstellt…
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Star className="w-5 h-5" />
                    App jetzt erstellen
                    <ChevronRight className="w-5 h-5" />
                  </span>
                )}
              </Button>
              {!form.businessName && (
                <p className="mt-3 text-xs text-red-500">
                  Bitte gib unter „Basis" mindestens den Restaurantnamen ein.
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="flex justify-between mt-12 pt-6 border-t border-gray-100">
          <Button
            onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
            variant="outline"
            size="lg"
            className="border-gray-300"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            {step === 0 ? "Abbrechen" : "Zurück"}
          </Button>
          {step < 3 && (
            <Button
              onClick={() => setStep((s) => s + 1)}
              size="lg"
              className="bg-gradient-to-r from-teal-500 to-purple-500 text-white shadow-lg"
            >
              Weiter <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hilfskomponenten
// ─────────────────────────────────────────────────────────────────────────────
function FormField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-bold text-gray-700 mb-2">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border-gray-200 focus:border-teal-400 focus:ring-teal-100 text-sm"
      />
    </div>
  );
}
