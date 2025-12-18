import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import Headbar from "@/components/Headbar";

function fileToDataUrl(file: File): Promise<{ name: string; dataUrl: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () =>
      resolve({ name: file.name, dataUrl: String(reader.result || "") });
    reader.readAsDataURL(file);
  });
}

export default function AutoConfigurator() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const { toast } = useToast();

  const [url, setUrl] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [businessName, setBusinessName] = useState("");

  useEffect(() => {
    try {
      const params = new URLSearchParams(search);
      const sourceLink = params.get("sourceLink");
      if (sourceLink) {
        const decoded = decodeURIComponent(sourceLink);
        if (/maps/i.test(decoded)) setMapsLink(decoded);
        else setUrl(decoded);
      }
    } catch (e) {
      // ignore
    }
  }, [search]);

  const [fileInfo, setFileInfo] = useState<{
    name: string;
    dataUrl: string;
  } | null>(null);
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
      toast({
        title: "File error",
        description: "Unable to read uploaded file",
      });
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
      const mapped: any = {
        userId: localStorage.getItem("sync_user_id") || undefined,
        businessName: result.business?.name || result.businessName || "",
        businessType:
          result.business?.category || result.businessType || "restaurant",
        location: result.business?.address || result.business?.location || "",
        slogan: result.business?.tagline || "",
        uniqueDescription: result.business?.description || "",
        template: result.style?.template || "minimalist",
        primaryColor:
          (result.style?.colors && result.style.colors[0]) || "#2563EB",
        secondaryColor:
          (result.style?.colors && result.style.colors[1]) || "#F8FAFC",
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
      toast({
        title: "Configuration exported",
        description: "Opened configurator with generated data",
      });
      navigate("/configurator");
    } catch (e) {
      console.error(e);
      toast({
        title: "Export failed",
        description: "Could not export configuration",
      });
    }
  };

  return (
    <div>
      <Headbar
        title="Auto Configurator"
        breadcrumbs={["Dashboard", "Configurator", "Auto"]}
      />

      <div className="min-h-screen flex items-start justify-center p-4 bg-gradient-to-b from-white via-purple-50 to-orange-50">
        <div className="max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>🤖 Vollautomatisch erstellen</CardTitle>
              <CardDescription>
                Geben Sie eine Website-URL, Google-Maps-Link oder Firmennamen
                ein. Optional: Menü-Datei hochladen (xlsx, pdf, jpg, png).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium">Website URL</label>
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">Google Maps Link</label>
                  <Input
                    value={mapsLink}
                    onChange={(e) => setMapsLink(e.target.value)}
                    placeholder="https://maps.app.goo.gl/..."
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">
                    Business Name (optional)
                  </label>
                  <Input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Café Central"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium">
                    Upload menu (optional)
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.pdf,image/*"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                    aria-label="Upload menu file"
                    className="mt-2"
                  />
                  {fileInfo && (
                    <div className="mt-2 text-sm text-muted-foreground">
                      Uploaded: {fileInfo.name}
                    </div>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-3">
                  <Button
                    onClick={generate}
                    disabled={loading}
                    className="bg-gradient-to-r from-purple-500 to-orange-500 text-white"
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
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
                        Generating...
                      </>
                    ) : (
                      "Generate Automatically"
                    )}
                  </Button>

                  <Button variant="outline" onClick={() => navigate("/mode-selection")}>
                    Back
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Preview</CardTitle>
              <CardDescription>Vorschau der generierten Konfiguration</CardDescription>
            </CardHeader>

            <CardContent className="relative p-0">
              <div className="mt-3 max-h-[70vh] overflow-auto text-xs bg-white p-4 rounded-b border-b" style={{paddingBottom: 96}}>
                {result ? (
                  <pre className="whitespace-pre-wrap text-sm">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                ) : (
                  <div className="text-sm text-muted-foreground">
                    No generated configuration yet. Click "Generate
                    Automatically" to start.
                  </div>
                )}
              </div>

              <CardFooter className="sticky bottom-0 bg-card p-4 border-t">
                <div className="ml-auto flex items-center gap-3">
                  <Button onClick={useConfiguration} disabled={!result} className="bg-green-600 text-white">
                    Use This Configuration
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!result) return;
                      navigator.clipboard?.writeText(JSON.stringify(result, null, 2));
                      toast({
                        title: "Copied",
                        description: "Configuration JSON copied to clipboard",
                      });
                    }}
                  >
                    Copy JSON
                  </Button>
                </div>
              </CardFooter>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
