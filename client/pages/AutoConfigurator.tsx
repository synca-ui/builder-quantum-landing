import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

function fileToDataUrl(file: File): Promise<{ name: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve({ name: file.name, dataUrl: String(reader.result || "") });
    reader.readAsDataURL(file);
  });
}

export default function AutoConfigurator() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [fileInfo, setFileInfo] = useState<{ name: string; dataUrl: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);

  const handleFile = async (f?: File) => {
    if (!f) {
      setFileInfo(null);
      return;
    }
    try {
      const converted = await fileToDataUrl(f);
      setFileInfo(converted);
    } catch (e) {
      console.error(e);
      toast({ title: "File error", description: "Unable to read uploaded file" });
    }
  };

  const generate = async () => {
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setResult(data);
      setLoading(false);
      toast({ title: "Auto-generation complete" });
    } catch (e) {
      console.error(e);
      toast({ title: "Generation failed", description: String(e) });
      setLoading(false);
    }
  };

  const useConfiguration = () => {
    if (!result) return;
    try {
      // Map auto result to existing configurator schema
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
        selectedPages: result.modules ? Object.keys(result.modules).filter((k) => result.modules[k]) : ["home", "menu", "contact"],
        customPages: [],
        openingHours: result.business?.opening_hours || {},
        menuItems: result.menu_items || [],
        reservationsEnabled: false,
        maxGuests: 0,
        notificationMethod: "email",
        contactMethods: result.business ? [result.business.phone, result.business.email].filter(Boolean) : [],
        socialMedia: result.business?.social || {},
        gallery: result.style?.gallery ? result.style.gallery : [],
        onlineOrdering: false,
        onlineStore: false,
        teamArea: false,
        hasDomain: false,
      };

      // Persist to localStorage so the manual configurator can pick it up
      localStorage.setItem("configuratorData", JSON.stringify(mapped));
      toast({ title: "Configuration exported", description: "Opened configurator with generated data" });
      navigate("/configurator");
    } catch (e) {
      console.error(e);
      toast({ title: "Export failed", description: "Could not export configuration" });
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center p-8 bg-gray-50">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardContent>
            <h2 className="text-2xl font-bold">🤖 Vollautomatisch erstellen</h2>
            <p className="mt-2 text-sm text-gray-600">Geben Sie eine Website-URL, Google-Maps-Link oder Firmennamen ein. Optional: Menü-Datei hochladen (xlsx, pdf, jpg, png).</p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="text-xs font-medium">Website URL</label>
                <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com" />
              </div>
              <div>
                <label className="text-xs font-medium">Google Maps Link</label>
                <Input value={mapsLink} onChange={(e) => setMapsLink(e.target.value)} placeholder="https://maps.app.goo.gl/..." />
              </div>
              <div>
                <label className="text-xs font-medium">Business Name (optional)</label>
                <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Café Central" />
              </div>
              <div>
                <label className="text-xs font-medium">Upload menu (optional)</label>
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf,image/*"
                  onChange={(e) => handleFile(e.target.files?.[0])}
                />
                {fileInfo && <div className="mt-2 text-sm text-gray-600">Uploaded: {fileInfo.name}</div>}
              </div>

              <div className="mt-4 flex items-center gap-3">
                <Button onClick={generate} disabled={loading} className="bg-gradient-to-r from-purple-500 to-orange-500 text-white">
                  {loading ? "Generating..." : "Generate Automatically"}
                </Button>
                <Button variant="outline" onClick={() => navigate('/mode-selection')}>Back</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent>
            <h3 className="text-lg font-semibold">Preview</h3>
            <div className="mt-3 max-h-[70vh] overflow-auto text-xs bg-white p-3 rounded border">
              {result ? (
                <pre className="whitespace-pre-wrap">{JSON.stringify(result, null, 2)}</pre>
              ) : (
                <div className="text-sm text-gray-500">No generated configuration yet. Click "Generate Automatically" to start.</div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <Button onClick={useConfiguration} disabled={!result} className="bg-green-600 text-white">
                Use This Configuration
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  if (!result) return;
                  navigator.clipboard?.writeText(JSON.stringify(result, null, 2));
                  toast({ title: "Copied", description: "Configuration JSON copied to clipboard" });
                }}
              >
                Copy JSON
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
