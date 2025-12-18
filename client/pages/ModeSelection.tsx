import React, { useMemo, useState } from "react";
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

export default function ModeSelection() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const sourceLink = params.get("sourceLink");
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(decodeURIComponent(sourceLink || ""));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div>
      <Headbar title="Selection" breadcrumbs={["Dashboard", "Selection"]} />

      <div className="min-h-screen flex items-start justify-center bg-gradient-to-b from-white via-teal-50 to-gray-100 p-6">
        <div className="max-w-5xl w-full">
          <div className="text-center mb-6">
            <h1 className="text-3xl md:text-4xl font-extrabold">
              How would you like Maitr to help?
            </h1>
            <p className="mt-2 text-gray-600">
              Choose between a guided manual setup or let Maitr build a working
              app automatically from a single link.
            </p>
          </div>

          {sourceLink && (
            <div className="bg-white shadow-md rounded-2xl p-4 border border-gray-100 mb-6 flex items-center justify-between">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-teal-50">
                  <Sparkles className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <div className="text-sm text-gray-500">Detected source</div>
                  <div className="mt-1 text-sm font-medium break-words text-gray-800 max-w-xl">
                    {decodeURIComponent(sourceLink)}
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
                      `/configurator/auto?sourceLink=${encodeURIComponent(
                        decodeURIComponent(sourceLink),
                      )}`,
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
                    <Settings className="w-8 h-8 text-teal-600" />
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
                  <Button onClick={() => navigate("/configurator/manual")} className="bg-gradient-to-r from-teal-500 to-purple-500 text-white">
                    Continue to manual configurator
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="hover:shadow-2xl transition-shadow duration-300">
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-purple-100 to-orange-50">
                    <Sparkles className="w-8 h-8 text-purple-600" />
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
                        `/configurator/auto${sourceLink ? `?sourceLink=${sourceLink}` : ""}`,
                      )
                    }
                    className="bg-gradient-to-r from-purple-500 to-orange-500 text-white"
                  >
                    Start Automatic
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => navigate("/configurator/manual")}>
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
