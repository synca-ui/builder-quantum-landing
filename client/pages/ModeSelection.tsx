import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMemo } from "react";

export default function ModeSelection() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const sourceLink = params.get("sourceLink");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-white to-gray-50 p-6">
      <div className="max-w-5xl w-full space-y-6">
        {sourceLink && (
          <div className="bg-white rounded-lg shadow p-4 border border-gray-100 text-sm text-gray-700">
            <div className="font-semibold">Detected link</div>
            <div className="mt-1 break-words">{decodeURIComponent(sourceLink)}</div>
            <div className="mt-3 text-sm text-gray-600">You can choose the automatic flow to let Maitr generate your app from this link, or continue manually to tweak everything yourself.</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card className="p-6">
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Settings className="w-8 h-8 text-gray-700" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">⚙️ Halbautomatisch konfigurieren</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Schritt-für-Schritt Anleitung: Inhalte, Farben und Module manuell auswählen und anpassen. Volle Kontrolle über jeden Aspekt Ihrer App.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => navigate("/configurator/manual")}
                      className="bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                    >
                      Weiter zum halbautomatischen Konfigurator
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-6">
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-gray-100">
                  <Sparkles className="w-8 h-8 text-purple-600" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">🤖 Vollautomatisch erstellen</h2>
                  <p className="mt-2 text-sm text-gray-600">
                    Geben Sie eine URL, Google-Maps-Link oder Firmennamen ein. Wir extrahieren Inhalte automatisch (Name, Adresse, Öffnungszeiten, Bilder, Farben, Reviews) und schlagen ein fertiges Layout sowie Module vor. Live-Vorschau, Anpassungen und Veröffentlichung möglich.
                  </p>
                  <div className="mt-6">
                    <Button
                      onClick={() => navigate(`/configurator/auto${sourceLink ? `?sourceLink=${sourceLink}` : ""}`)}
                      className="bg-gradient-to-r from-purple-500 to-orange-500 text-white"
                    >
                      {sourceLink ? "Vollautomatisch starten (with link)" : "Vollautomatisch starten"}
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
