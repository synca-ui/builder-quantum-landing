import { useCallback } from "react";
import { Check, Eye, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfiguratorDesign, useConfiguratorActions } from "@/store/configuratorStore";

// Template-Daten (angepasst an dein Design)
const TEMPLATES = [
  {
    id: "minimalist",
    name: "Minimalist",
    description: "Narrative, minimal design guiding users through full-screen sections.",
    color: "bg-emerald-500",
    previewColor: "border-emerald-400 bg-emerald-50/30"
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with bold colors and sleek animations",
    color: "bg-indigo-500",
    previewColor: "border-indigo-400 bg-indigo-50/30"
  },
  {
    id: "stylish",
    name: "Stylish",
    description: "Visual-first design with overlays, mixed sections, and motion",
    color: "bg-slate-500",
    previewColor: "border-slate-400 bg-slate-50/30"
  },
  {
    id: "cozy",
    name: "Cozy",
    description: "Warm, friendly aesthetic with rounded elements and authentic photography.",
    color: "bg-orange-300",
    previewColor: "border-orange-400 bg-orange-50/30"
  },
];

// FIX: Interface erweitert um die Preview-Props
interface TemplateStepProps {
  nextStep: () => void;
  prevStep: () => void;
  previewTemplateId?: string | null;
  setPreviewTemplateId?: (id: string | null) => void;
}

export function TemplateStep({
                               nextStep,
                               prevStep,
                               previewTemplateId,
                               setPreviewTemplateId
                             }: TemplateStepProps) {
  const design = useConfiguratorDesign();
  const { design: designActions } = useConfiguratorActions();

  // Handler: Aktualisiert sowohl den Store (für Auswahl) als auch die Preview (für Handy rechts)
  const handleSelect = (id: string) => {
    // 1. Store Update (damit der Haken sichtbar wird)
    designActions.updateTemplate(id);

    // 2. Preview Update (damit das Handy sich ändert)
    if (setPreviewTemplateId) {
      setPreviewTemplateId(id);
    }
  };

  const handleNext = () => {
    if (design.template) nextStep();
  };

  // Den Namen des aktuell gewählten Templates finden für die Anzeige unten
  const selectedTemplate = TEMPLATES.find(t => t.id === design.template);

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Headline */}
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
          Choose Your <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-600">Template</span>
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto text-lg">
          Click on a template to see a live preview. Each template is designed for real web apps.
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-4 text-lg">Available Templates</h3>
        {/* Template Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {TEMPLATES.map((t) => {
            const isSelected = design.template === t.id;
            return (
              <div
                key={t.id}
                onClick={() => handleSelect(t.id)}
                className={`
                    group relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                    ${isSelected
                  ? `${t.previewColor} shadow-md scale-[1.01]`
                  : "border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white"}
                  `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    {/* Kleiner Farb-Punkt */}
                    <div className={`mt-1.5 w-3 h-3 rounded-full ${t.color}`} />
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                        {t.name}
                        {isSelected && <Check className="w-5 h-5 text-emerald-600" />}
                      </h3>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{t.description}</p>
                    </div>
                  </div>
                  {/* Eye Icon Button */}
                  <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <Eye className="w-5 h-5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action Bar */}
      {design.template && (
        <div className="mt-8 bg-cyan-50/50 border border-cyan-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
          <div className="text-center mb-4">
            <span className="text-gray-500">Selected: </span>
            <span className="font-bold text-gray-900 ml-1">{selectedTemplate?.name}</span>
          </div>

          <Button
            onClick={handleNext}
            className="w-full h-14 text-lg font-bold text-white bg-gradient-to-r from-teal-500 via-purple-500 to-purple-600 hover:opacity-95 hover:scale-[1.01] shadow-lg hover:shadow-xl transition-all rounded-lg"
          >
            <span className="mr-2">✨</span> Use This Template <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}