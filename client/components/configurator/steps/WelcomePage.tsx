import { useState } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import { usePersistence } from "@/lib/stepPersistence";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Check,
  AlertCircle,
  Settings,
  Sparkles,
  ChevronRight,
  Eye,
  Building,
  Palette,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WelcomePageProps {
  onStart: () => void;
  currentConfigId: string | null;
  publishedUrl: string | null;
}

export default function WelcomePage({
  onStart,
  currentConfigId,
  publishedUrl,
}: WelcomePageProps) {
  const [showDebug, setShowDebug] = useState(false);

  // Read from Zustand store
  const currentStep = useConfiguratorStore((s) => s.ui.currentStep);
  const businessName = useConfiguratorStore((s) => s.business.name);
  const template = useConfiguratorStore((s) => s.design.template);

  // Persistence system
  const persistence = usePersistence();
  const hasSaved = persistence.hasSavedSteps();
  const summary = persistence.getSummary();
  const stepHistory = persistence.getStepHistory();

  return (
    <div className="min-h-[calc(100vh-5rem)] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        {/* Persistence Status Banner */}
        <div className="mb-8">
          <Card
            className={`p-4 ${hasSaved ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {hasSaved ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                )}
                <div>
                  <h3
                    className={`font-semibold ${hasSaved ? "text-green-900" : "text-orange-900"}`}
                  >
                    {hasSaved ? "Progress Restored" : "Fresh Start"}
                  </h3>
                  <p
                    className={`text-sm ${hasSaved ? "text-green-700" : "text-orange-700"}`}
                  >
                    {summary}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDebug(!showDebug)}
                  className="text-xs"
                >
                  {showDebug ? "Hide" : "Debug"}
                </Button>
                {hasSaved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (
                        confirm(
                          "This will clear all saved progress. Are you sure?",
                        )
                      ) {
                        persistence.clearAll();
                        window.location.reload();
                      }
                    }}
                    className="text-xs text-red-600 hover:text-red-800"
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Debug Panel */}
        {showDebug && (
          <Card className="mb-8 p-6 bg-gray-50 border-gray-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Persistence Debug Panel
            </h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Current State
                </h4>
                <div className="space-y-1 text-gray-600">
                  <p>Step: {currentStep}</p>
                  <p>Config ID: {currentConfigId || "None"}</p>
                  <p>Business: {businessName || "None"}</p>
                  <p>Template: {template || "None"}</p>
                  <p>Published: {publishedUrl ? "Yes" : "No"}</p>
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">
                  Step History
                </h4>
                <div className="max-h-32 overflow-y-auto space-y-1 text-gray-600">
                  {stepHistory.length === 0 ? (
                    <p className="text-orange-600 font-mono text-xs">
                      nothing was loaded: Your Business © 2025 Your Business
                    </p>
                  ) : (
                    stepHistory.slice(-5).map((step, index) => (
                      <div key={index} className="text-xs font-mono">
                        {new Date(step.timestamp).toLocaleTimeString()}:{" "}
                        {step.action} (Step {step.stepNumber})
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 mb-2">Actions</h4>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const exported = persistence.exportData();
                      navigator.clipboard.writeText(exported);
                      toast({
                        title: "Copied",
                        description: "Debug data copied to clipboard",
                      });
                    }}
                    className="w-full text-xs"
                  >
                    Export Debug Data
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const data = prompt("Paste debug data to import:");
                      if (data && persistence.importData(data)) {
                        toast({
                          title: "Imported",
                          description: "Debug data imported successfully",
                        });
                        window.location.reload();
                      }
                    }}
                    className="w-full text-xs"
                  >
                    Import Debug Data
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Build Your Perfect{" "}
              <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">
                Web App
              </span>
            </h1>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Create a professional web app for your business in minutes. Choose
              a template, preview it live, customize, and publish.
            </p>
            <ul className="space-y-2 text-gray-700 mb-8">
              <li className="flex items-center">
                <Check className="w-4 h-4 text-teal-600 mr-2" /> Live app-like
                template previews
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-teal-600 mr-2" /> Minimal, fast,
                and clean flow
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-teal-600 mr-2" /> Auto-save every
                step
              </li>
              <li className="flex items-center">
                <Check className="w-4 h-4 text-teal-600 mr-2" /> One-click
                publish
              </li>
            </ul>

            {/* Continue or Start Button */}
            <div className="space-y-3">
              <Button
                onClick={onStart}
                size="lg"
                className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-8 py-6 text-lg font-bold rounded-full shadow-xl hover:scale-105 transition-all duration-300 w-full sm:w-auto"
              >
                <Sparkles className="w-5 h-5" />
                {hasSaved ? "Continue Configuration" : "Let's Get Started"}
                <ChevronRight className="w-5 h-5" />
              </Button>

              {hasSaved && publishedUrl && (
                <div className="mt-4">
                  <Button
                    variant="outline"
                    onClick={() => window.open(publishedUrl, "_blank")}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Published Site
                  </Button>
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="w-full h-80 bg-gradient-to-br from-teal-50 to-purple-50 border border-gray-200 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                {hasSaved && businessName ? (
                  <>
                    <Building className="w-10 h-10 text-teal-500 mx-auto mb-3" />
                    <p className="text-gray-900 font-semibold mb-1">
                      {businessName}
                    </p>
                    <p className="text-gray-600 text-sm">
                      {template
                        ? `${template} template`
                        : "Configuration in progress"}
                    </p>
                  </>
                ) : (
                  <>
                    <Palette className="w-10 h-10 text-teal-500 mx-auto mb-3" />
                    <p className="text-gray-600">
                      Start by choosing a template on the next step
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
