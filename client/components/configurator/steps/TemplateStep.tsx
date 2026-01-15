import { useConfiguratorStore, useConfiguratorActions } from "@/store/configuratorStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Eye, Sparkles, ChevronRight, ArrowLeft } from "lucide-react";
import { defaultTemplates } from "@/components/template/TemplateRegistry";

interface TemplateStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

export function TemplateStep({ nextStep, prevStep }: TemplateStepProps) {
  // 1. ZUGRIFF AUF DEN STORE (Source of Truth)
  // Wir lesen direkt "template" aus dem Design-Slice.
  const currentTemplateId = useConfiguratorStore((state) => state.design.template);
  const businessType = useConfiguratorStore((state) => state.business.type);

  // 2. ACTIONS ZUM UPDATEN
  const actions = useConfiguratorActions();

  // Handler: Updated sofort den Store -> Globale LivePreview reagiert sofort
  const handleTemplateClick = (templateId: string) => {
    actions.design.updateTemplate(templateId);
  };

  const handleUseTemplate = () => {
    // Validierung: Nur weiter, wenn ein Template gewählt ist
    if (currentTemplateId) {
      nextStep();
    }
  };

  // Filter templates based on business type
  const availableTemplates = defaultTemplates.filter(
    (t) =>
      !t.businessTypes ||
      t.businessTypes.includes(businessType) ||
      !businessType
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

      {/* Grid Layout angepasst: Keine rechte Spalte mehr für Preview hier! */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Available Templates
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableTemplates.map((template) => {
            const isSelected = currentTemplateId === template.id;
            const isModern = template.id === "modern";

            return (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  isSelected
                    ? isModern
                      ? "border-blue-500 bg-blue-50 shadow-lg"
                      : "border-teal-500 bg-teal-50 shadow-lg"
                    : isModern
                      ? "border-gray-200 hover:border-blue-300 hover:shadow-md"
                      : "border-gray-200 hover:border-teal-300 hover:shadow-md"
                }`}
                onClick={() => handleTemplateClick(template.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${template.preview} flex-shrink-0`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-md font-bold text-gray-900 truncate">
                          {template.name}
                        </h4>
                        {isSelected && (
                          <Check className={`w-4 h-4 flex-shrink-0 ${isModern ? "text-blue-600" : "text-teal-600"}`} />
                        )}
                      </div>
                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                    <Eye className={`w-5 h-5 flex-shrink-0 ${isSelected ? (isModern ? "text-blue-600" : "text-teal-600") : "text-gray-400"}`} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Use Template Button */}
        {currentTemplateId && (
          <div className="flex justify-center mt-6">
            <Card className={`p-4 w-full max-w-md ${currentTemplateId === "modern" ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" : "bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200"}`}>
              <div className="text-center">
                <p className="text-gray-600 text-sm mb-3">
                  Selected: <strong>{defaultTemplates.find((t) => t.id === currentTemplateId)?.name}</strong>
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
          </div>
        )}
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
      </div>
    </div>
  );
}
