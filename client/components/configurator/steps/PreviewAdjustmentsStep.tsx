import { useState } from "react";
import { ArrowLeft, ChevronRight, Smartphone, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { LivePhoneFrame } from "@/components/preview/LivePhoneFrame";
import PhonePortal from "@/components/preview/phone-portal";

interface PreviewAdjustmentsStepProps {
  nextStep: () => void;
  prevStep: () => void;
  TemplatePreviewContent?: React.ComponentType;
  getDisplayedDomain?: () => string;
}

export function PreviewAdjustmentsStep({
  nextStep,
  prevStep,
  TemplatePreviewContent,
  getDisplayedDomain,
}: PreviewAdjustmentsStepProps) {
  const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">(
    "mobile",
  );

  const business = useConfiguratorStore((s) => s.business);
  const design = useConfiguratorStore((s) => s.design);
  const actions = useConfiguratorActions();

  const displayDomain = getDisplayedDomain
    ? getDisplayedDomain()
    : `${business.domain?.selectedDomain || business.name.toLowerCase().replace(/\s+/g, "")}.maitr.de`;

  return (
    <div className="py-8 max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Preview & final tweaks
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Review your website and make any final adjustments before going live.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="space-y-6">
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Quick Adjustments
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Website Title
                </label>
                <Input
                  type="text"
                  value={business.name}
                  onChange={(e) =>
                    actions.business.updateBusinessName(e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Tagline
                </label>
                <Input
                  type="text"
                  value={business.slogan || ""}
                  onChange={(e) =>
                    actions.business.updateSlogan(e.target.value)
                  }
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={design.primaryColor}
                    onChange={(e) =>
                      actions.design.updatePrimaryColor(e.target.value)
                    }
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                  />
                  <Input
                    type="text"
                    value={design.primaryColor}
                    onChange={(e) =>
                      actions.design.updatePrimaryColor(e.target.value)
                    }
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Performance Score
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Speed</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full w-4/5"></div>
                  </div>
                  <span className="text-sm font-bold text-green-600">95</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">SEO</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-500 h-2 rounded-full w-5/6"></div>
                  </div>
                  <span className="text-sm font-bold text-blue-600">92</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Mobile</span>
                <div className="flex items-center space-x-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div className="bg-purple-500 h-2 rounded-full w-full"></div>
                  </div>
                  <span className="text-sm font-bold text-purple-600">100</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-gray-100 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
              <div className="flex space-x-2">
                <Button
                  variant={previewMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("mobile")}
                >
                  <Smartphone className="w-4 h-4" />
                </Button>
                <Button
                  variant={previewMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPreviewMode("desktop")}
                >
                  <Monitor className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex justify-center">
              {previewMode === "mobile" ? (
                <LivePhoneFrame widthClass="w-[320px]" heightClass="h-[600px]">
                  <PhonePortal>
                    {TemplatePreviewContent ? (
                      <TemplatePreviewContent />
                    ) : (
                      <div className="p-4 text-center text-gray-500">Preview</div>
                    )}
                  </PhonePortal>
                </LivePhoneFrame>
              ) : (
                <div className="w-full max-w-4xl h-96 bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
                  <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-center px-4">
                    <span className="text-xs text-gray-600 font-mono">
                      {displayDomain}
                    </span>
                  </div>
                  <div className="h-full overflow-hidden">
                    {TemplatePreviewContent ? (
                      <TemplatePreviewContent />
                    ) : (
                      <div>Preview</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            prevStep();
          }}
          variant="outline"
          size="lg"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Ready to Publish
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
