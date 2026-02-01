import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import {
  Sparkles, Upload, X, Copy, ChevronRight, ArrowLeft,
  CheckCircle2, Globe, MapPin, Clock, Phone, Mail,
  Image as ImageIcon, Star, Palette, Layout, FileText
} from "lucide-react";

// Optimized file conversion with image compression
function fileToDataUrl(file: File, maxWidth = 800): Promise<{ name: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Image compression for performance
      const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
      if (ratio < 1) {
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({
          name: file.name,
          dataUrl: canvas.toDataURL('image/webp', 0.8) // WebP with 80% quality
        });
      } else {
        // No compression needed
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error);
        reader.onload = () =>
          resolve({ name: file.name, dataUrl: String(reader.result || "") });
        reader.readAsDataURL(file);
      }
    };

    img.onerror = () => {
      // Fallback to regular FileReader
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error);
      reader.onload = () =>
        resolve({ name: file.name, dataUrl: String(reader.result || "") });
      reader.readAsDataURL(file);
    };

    img.src = URL.createObjectURL(file);
  });
}

export default function AutoConfigurator() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fileInfo, setFileInfo] = useState<{ name: string; dataUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(search);
      const sourceLink = params.get("sourceLink");
      if (sourceLink) {
        const decoded = decodeURIComponent(sourceLink);
        if (/maps/i.test(decoded)) setMapsLink(decoded);
        else setUrl(decoded);
      }
    } catch (e) {}
  }, [search]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (fileInfo?.dataUrl.startsWith('blob:')) {
        URL.revokeObjectURL(fileInfo.dataUrl);
      }
    };
  }, [fileInfo]);

  const handleFile = useCallback(async (f?: File) => {
    if (!f) {
      setFileInfo(null);
      return;
    }

    try {
      const converted = await fileToDataUrl(f);
      setFileInfo(converted);
    } catch (e) {
      console.error(e);
      toast({
        title: "File error",
        description: "Unable to read uploaded file. Please try a different image."
      });
    }
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const generate = useCallback(async () => {
    setLoading(true);
    setResult(null);

    try {
      const payload: any = {
        url: url || null,
        maps_link: mapsLink || null,
        business_name: businessName || null,
        file_name: fileInfo?.name || null,
        file_base64: fileInfo?.dataUrl || null,
      };

      const res = await fetch(`/api/autogen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResult(data);
      toast({
        title: "Auto-generation complete",
        description: "Your website configuration is ready!"
      });
    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : String(e);
      toast({
        title: "Generation failed",
        description: `Please try again. Error: ${errorMessage}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [url, mapsLink, businessName, fileInfo, toast]);

  const useConfiguration = () => {
    if (!result) return;
    try {
      const mapped: any = {
        userId: localStorage.getItem("sync_user_id") || undefined,
        businessName: result.business?.name || result.businessName || "",
        businessType: result.business?.category || result.businessType || "restaurant",
        location: result.business?.address || result.business?.location || "",
        slogan: result.business?.tagline || "",
        uniqueDescription: result.business?.description || "",
        template: result.style?.template || "minimalist",
        primaryColor: (result.style?.colors && result.style.colors[0]) || "#2563EB",
        secondaryColor: (result.style?.colors && result.style.colors[1]) || "#F8FAFC",
        fontFamily: result.style?.font || "Inter",
        selectedPages: result.modules
          ? Object.keys(result.modules).filter((k) => result.modules[k])
          : ["home", "menu", "contact"],
        customPages: [],
        openingHours: result.business?.opening_hours || {},
        menuItems: result.menu_items || [],
        reservationsEnabled: false,
        maxGuests: 0,
        notificationMethod: "email",
        contactMethods: result.business
          ? [result.business.phone, result.business.email].filter(Boolean)
          : [],
        socialMedia: result.business?.social || {},
        gallery: result.style?.gallery ? result.style.gallery : [],
        onlineOrdering: false,
        onlineStore: false,
        teamArea: false,
        hasDomain: false,
      };

      localStorage.setItem("configuratorData", JSON.stringify(mapped));
      toast({ title: "Configuration exported", description: "Opened configurator with generated data" });
      navigate("/configurator");
    } catch (e) {
      console.error(e);
      toast({ title: "Export failed", description: "Could not export configuration" });
    }
  };

  // Extract data for "What we have" section
  const extractedData = result?.business || result || {};
  const hasExtractedData = result && Object.keys(extractedData).length > 0;

  // ─── Input field component ───
  const Field = ({ label, value, onChange, placeholder, hint }: {
    label: string; value: string; onChange: (v: string) => void; placeholder: string; hint?: string;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border-gray-200 focus:border-purple-400 focus:ring-purple-100 text-sm"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-teal-50 to-gray-100">
      {/* ─── CUSTOM HEADER WITH BREADCRUMBS ─── */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-5 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <div className="flex items-center gap-2 text-sm">
              <button
                onClick={() => navigate('/')}
                className="font-semibold text-purple-600 hover:text-purple-700 transition-colors"
              >
                Maitr
              </button>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <button
                onClick={() => navigate('/selection')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                Selection
              </button>
              <ChevronRight className="w-4 h-4 text-gray-300" />
              <span className="text-gray-900 font-medium">Auto</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-semibold text-purple-700">Auto Mode</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-5 pt-8 pb-16" id="main-content">

        {/* ─── Page header ─── */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-2">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-50 to-orange-50">
              <Sparkles className="w-5 h-5 text-purple-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-extrabold text-gray-900">Auto-Generate Website</h1>
          </div>
          <p className="text-sm text-gray-500 ml-0.5">
            Enter a website URL, Google Maps link, or business name. Optionally upload a menu file to get started.
          </p>
        </div>

        {/* ─── WHAT WE HAVE SECTION (appears after generation) ─── */}
        {hasExtractedData && (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-100 rounded-2xl shadow-sm p-6 mb-8">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2 rounded-lg bg-green-100 shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-bold text-gray-900 mb-1">Successfully Extracted</h3>
                <p className="text-xs text-gray-600 leading-relaxed">
                  We've automatically extracted the following information. You can review and use this configuration:
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
              {extractedData.name && (
                <ExtractedInfoCard
                  icon={<Globe className="w-4 h-4" />}
                  label="Business"
                  value={extractedData.name}
                  color="green"
                />
              )}
              {extractedData.address && (
                <ExtractedInfoCard
                  icon={<MapPin className="w-4 h-4" />}
                  label="Location"
                  value={extractedData.address}
                  color="green"
                />
              )}
              {extractedData.opening_hours && (
                <ExtractedInfoCard
                  icon={<Clock className="w-4 h-4" />}
                  label="Hours"
                  value="Extracted"
                  color="green"
                />
              )}
              {extractedData.phone && (
                <ExtractedInfoCard
                  icon={<Phone className="w-4 h-4" />}
                  label="Phone"
                  value={extractedData.phone}
                  color="green"
                />
              )}
              {extractedData.email && (
                <ExtractedInfoCard
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  value={extractedData.email}
                  color="green"
                />
              )}
              {(result?.style?.colors && result.style.colors.length > 0) && (
                <ExtractedInfoCard
                  icon={<Palette className="w-4 h-4" />}
                  label="Brand Colors"
                  value={`${result.style.colors.length} colors`}
                  color="green"
                />
              )}
              {(result?.menu_items || result?.menuItems) && (
                <ExtractedInfoCard
                  icon={<Star className="w-4 h-4" />}
                  label="Menu"
                  value="Extracted"
                  color="green"
                />
              )}
              {(result?.style?.gallery && result.style.gallery.length > 0) && (
                <ExtractedInfoCard
                  icon={<ImageIcon className="w-4 h-4" />}
                  label="Images"
                  value={`${result.style.gallery.length} found`}
                  color="green"
                />
              )}
              {result?.modules && (
                <ExtractedInfoCard
                  icon={<Layout className="w-4 h-4" />}
                  label="Modules"
                  value={`${Object.keys(result.modules).filter(k => result.modules[k]).length} active`}
                  color="green"
                />
              )}
            </div>
          </div>
        )}

        {/* ─── Two-column layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* LEFT — Input form */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 flex flex-col">
            <div className="space-y-4 flex-1">
              <Field
                label="Website URL"
                value={url}
                onChange={setUrl}
                placeholder="https://example.com"
              />
              <Field
                label="Google Maps Link"
                value={mapsLink}
                onChange={setMapsLink}
                placeholder="https://maps.app.goo.gl/..."
                hint="Optional — helps us find address & contact info"
              />
              <Field
                label="Business Name"
                value={businessName}
                onChange={setBusinessName}
                placeholder="Café Central"
                hint="Optional — used as fallback if not found on the website"
              />

              {/* File upload dropzone */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                  Menu file <span className="font-normal normal-case text-gray-400">(optional)</span>
                </label>

                {!fileInfo ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all duration-200 ${
                      dragOver
                        ? "border-purple-400 bg-purple-50"
                        : "border-gray-200 hover:border-purple-300 hover:bg-gray-50"
                    }`}
                  >
                    <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1.5" />
                    <p className="text-xs text-gray-500">
                      <span className="font-semibold text-purple-600">Click to upload</span> or drag & drop
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">xlsx, pdf, jpg, png</p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between border border-gray-200 rounded-xl px-3.5 py-2.5 bg-gray-50">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                        <Upload className="w-4 h-4 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-800 truncate max-w-[160px]">{fileInfo.name}</p>
                        <p className="text-xs text-gray-400">Uploaded</p>
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
                  accept=".xlsx,.xls,.pdf,image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                  className="hidden"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2.5 mt-6 pt-5 border-t border-gray-100">
              <Button
                onClick={generate}
                disabled={loading}
                className="flex-1 bg-gradient-to-r from-purple-500 to-orange-500 text-white text-xs font-bold shadow-sm hover:shadow-md transition-shadow"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Generating…
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" /> Generate Automatically
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* RIGHT — Preview */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col">

            {/* Preview header */}
            <div className="px-6 pt-5 pb-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <h2 className="text-sm font-bold text-gray-900">Configuration Preview</h2>
                </div>
                {result && (
                  <button
                    onClick={() => {
                      navigator.clipboard?.writeText(JSON.stringify(result, null, 2));
                      toast({ title: "Copied", description: "Configuration JSON copied to clipboard" });
                    }}
                    className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Copy className="w-3.5 h-3.5" /> Copy JSON
                  </button>
                )}
              </div>
            </div>

            {/* Preview body */}
            <div className="flex-1 overflow-auto p-5" style={{ maxHeight: "520px" }}>
              {result ? (
                <div className="space-y-4">
                  {/* Visual Preview Cards */}
                  {result.style?.colors && result.style.colors.length > 0 && (
                    <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-100">
                      <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                        <Palette className="w-3.5 h-3.5" /> Brand Colors
                      </h3>
                      <div className="flex gap-2">
                        {result.style.colors.slice(0, 6).map((color: string, idx: number) => (
                          <div
                            key={idx}
                            className="flex-1 h-12 rounded-lg border-2 border-white shadow-sm"
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JSON Data */}
                  <div className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                    <h3 className="text-xs font-bold text-gray-700 mb-2 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" /> Raw Configuration
                    </h3>
                    <pre className="whitespace-pre-wrap text-xs text-gray-600 leading-relaxed font-mono">
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center py-12">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-orange-100 flex items-center justify-center mb-3">
                    <Sparkles className="w-6 h-6 text-purple-500" />
                  </div>
                  <p className="text-sm font-semibold text-gray-700">No configuration yet</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
                    Click "Generate Automatically" to extract your website data
                  </p>
                </div>
              )}
            </div>

            {/* Preview footer — CTA */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gradient-to-br from-gray-50 to-white rounded-b-2xl">
              <Button
                onClick={useConfiguration}
                disabled={!result}
                className={`w-full text-xs font-bold transition-all ${
                  result
                    ? "bg-gradient-to-r from-purple-500 to-orange-500 text-white shadow-sm hover:shadow-md"
                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                }`}
              >
                Use This Configuration <ChevronRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper component for extracted info cards
function ExtractedInfoCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'green' | 'blue' | 'purple';
}) {
  const colorClasses = {
    green: 'bg-green-50 border-green-100 text-green-600',
    blue: 'bg-blue-50 border-blue-100 text-blue-600',
    purple: 'bg-purple-50 border-purple-100 text-purple-600'
  };

  return (
    <div className="bg-white rounded-xl p-3 border border-green-100">
      <div className="flex items-center gap-2 mb-1">
        <div className={`p-1.5 rounded ${colorClasses[color]}`}>
          {icon}
        </div>
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-sm font-medium text-gray-800 truncate">{value}</p>
    </div>
  );
}