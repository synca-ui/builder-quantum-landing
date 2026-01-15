import { useState, useEffect } from "react";
import { useConfiguratorStore, useConfiguratorActions } from "@/store/configuratorStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Check,
  Eye,
  Sparkles,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { defaultTemplates } from "@/components/template/TemplateRegistry";
import LivePhoneFrame from "@/components/preview/LivePhoneFrame";
import TemplatePreviewContent from "@/components/preview/TemplatePreviewContent";

interface TemplateStepProps {
  nextStep: () => void;
  prevStep: () => void;
  previewTemplateId: string | null;
  setPreviewTemplateId: (id: string | null) => void;
}

export default function TemplateStep({
  nextStep,
  prevStep,
  previewTemplateId,
  setPreviewTemplateId,
}: TemplateStepProps) {
  // Read from Zustand store
  const template = useConfiguratorStore((s) => s.design.template);
  const businessType = useConfiguratorStore((s) => s.business.type);
  
  // Get actions
  const actions = useConfiguratorActions();

  // Local state for UI only
  const [selectedTemplate, setSelectedTemplate] = useState(
    previewTemplateId || template || "modern",
  );

  // Initialize preview if not set
  useEffect(() => {
    if (!previewTemplateId && !template) {
      setPreviewTemplateId("modern");
    }
  }, [previewTemplateId, template, setPreviewTemplateId]);

  // CRITICAL BUG FIX: Update Zustand immediately when clicking a template
  // This ensures the Live Preview updates instantly
  const handleTemplateClick = (templateId: string) => {
    setSelectedTemplate(templateId);
    setPreviewTemplateId(templateId);
    // ✅ FIX: Call Zustand action immediately
    actions.design.updateTemplate(templateId);
  };

  const handleUseTemplate = () => {
    if (selectedTemplate) {
      // Ensure template is saved to store (already done in handleTemplateClick)
      actions.design.updateTemplate(selectedTemplate);
      nextStep();
    }
  };

  // Filter templates based on business type
  const templates = defaultTemplates;
  const availableTemplates = templates.filter(
    (t) =>
      !t.businessTypes ||
      t.businessTypes.includes(businessType) ||
      !businessType,
  );

  return (
    <div className="py-8">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
          Choose Your{" "}
          <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">
            Template
          </span>
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Click on a template to see a live preview. Each template is designed
          for real web apps.
        </p>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Template Selection */}
        <div className="space-y-4 order-2 lg:order-1">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Available Templates
          </h3>
          {availableTemplates.map((template) => (
            <Card
              key={template.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${
                selectedTemplate === template.id
                  ? template.id === "modern"
                    ? "border-blue-500 bg-blue-50 shadow-lg"
                    : "border-teal-500 bg-teal-50 shadow-lg"
                  : template.id === "modern"
                    ? "border-gray-200 hover:border-blue-300 hover:shadow-md"
                    : "border-gray-200 hover:border-teal-300 hover:shadow-md"
              }`}
              onClick={() => handleTemplateClick(template.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-3 h-3 rounded-full ${template.preview} flex-shrink-0`}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-md font-bold text-gray-900 truncate">
                        {template.name}
                      </h4>
                      {selectedTemplate === template.id &&
                        (template.id === "modern" ? (
                          <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                        ) : (
                          <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        ))}
                    </div>
                    <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                      {template.description}
                    </p>
                  </div>
                  <Eye
                    className={`w-5 h-5 flex-shrink-0 ${selectedTemplate === template.id ? (template.id === "modern" ? "text-blue-600" : "text-teal-600") : "text-gray-400"}`}
                  />
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Use Template Button */}
          {selectedTemplate && (
            <Card
              className={`p-4 ${selectedTemplate === "modern" ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" : "bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200"}`}
            >
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-3">
                  Previewing:{" "}
                  <strong>
                    {templates.find((t) => t.id === selectedTemplate)?.name}
                  </strong>
                </p>
                <Button
                  onClick={handleUseTemplate}
                  className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white font-bold w-full"
                >
                  <Sparkles className="mr-2 w-4 h-4" />
                  Use This Template
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </Card>
          )}
        </div>

        {/* Live Preview */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-8">
          <div className="bg-gray-100 rounded-2xl p-4 lg:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base lg:text-lg font-bold text-gray-900">
                Live Preview
              </h3>
              <div className="text-center">
                <span className="text-xs text-gray-500 font-mono">
                  Live Preview
                </span>
              </div>
            </div>

            <div className="flex justify-center">
              <LivePhoneFrame
                widthClass="w-48 lg:w-56"
                heightClass="h-[360px] lg:h-[420px]"
              >
                <TemplatePreviewContent />
              </LivePhoneFrame>
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
          Back to Welcome
        </Button>
        <div className="text-center">
          <p className="text-sm text-gray-500">
            {selectedTemplate
              ? 'Click "Use This Template" to continue'
              : "Select a template to see live preview"}
          </p>
        </div>
      </div>
    </div>
  );
}
