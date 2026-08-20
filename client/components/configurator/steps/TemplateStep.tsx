import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useConfiguratorDesign,
  useConfiguratorActions,
} from "@/store/configuratorStore";

// Template data with translation keys
const TEMPLATES = [
  {
    id: "minimalist",
    nameKey: "templates.minimalist",
    descriptionKey: "templates.minimalistDesc",
    color: "bg-emerald-500",
    previewColor: "border-emerald-400 bg-emerald-50/30",
  },
  {
    id: "modern",
    nameKey: "templates.modern",
    descriptionKey: "templates.modernDesc",
    color: "bg-indigo-500",
    previewColor: "border-indigo-400 bg-indigo-50/30",
  },
  // Bewusst nur helle Templates im Picker — dunkel stellt man sich über die
  // freien Farben selbst ein. Die früheren Templates "Stilvoll", "Gemütlich"
  // und das dunkle "Mitternacht" bleiben als Alt-Bestand im Renderer
  // lauffähig (IDs stylish/cozy/nocturne), erscheinen hier aber nicht mehr.
  {
    id: "riviera",
    nameKey: "templates.riviera",
    descriptionKey: "templates.rivieraDesc",
    color: "bg-sky-700",
    previewColor: "border-sky-500 bg-sky-50/30",
  },
  {
    id: "verde",
    nameKey: "templates.verde",
    descriptionKey: "templates.verdeDesc",
    color: "bg-emerald-700",
    previewColor: "border-emerald-500 bg-emerald-50/30",
  },
];

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
  setPreviewTemplateId,
}: TemplateStepProps) {
  const { t } = useTranslation();
  const design = useConfiguratorDesign();
  const { design: designActions } = useConfiguratorActions();

  const handleSelect = (id: string) => {
    designActions.updateTemplate(id);
    if (setPreviewTemplateId) {
      setPreviewTemplateId(id);
    }
  };

  const handleNext = () => {
    if (design.template) nextStep();
  };

  const selectedTemplate = TEMPLATES.find((t) => t.id === design.template);

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Headline */}
      <div className="text-center mb-10">
        <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
          {t("steps.template.title").split(" ").slice(0, -1).join(" ")}{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-purple-600">
            {t("steps.template.title").split(" ").slice(-1)}
          </span>
        </h2>
        <p className="text-gray-500 max-w-lg mx-auto text-lg">
          {t("steps.template.subtitle")}
        </p>
      </div>

      <div className="mb-6">
        <h3 className="font-bold text-gray-900 mb-4 text-lg">
          {t("templates.available")}
        </h3>
        {/* Template Grid */}
        <div className="grid md:grid-cols-2 gap-4">
          {TEMPLATES.map((template) => {
            const isSelected = design.template === template.id;
            return (
              <div
                key={template.id}
                onClick={() => handleSelect(template.id)}
                className={`
                  group relative p-6 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${
                    isSelected
                      ? `${template.previewColor} shadow-md scale-[1.01]`
                      : "border-gray-100 hover:border-gray-200 hover:shadow-sm bg-white"
                  }
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div
                      className={`mt-1.5 w-3 h-3 rounded-full ${template.color}`}
                    />
                    <div>
                      <h3 className="font-bold text-gray-900 flex items-center gap-2 text-lg">
                        {t(template.nameKey)}
                        {isSelected && (
                          <Check className="w-5 h-5 text-emerald-600" />
                        )}
                      </h3>
                      <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                        {t(template.descriptionKey)}
                      </p>
                    </div>
                  </div>
                  {/*
                    Hier stand ein Augen-Knopf ohne onClick. Er versprach eine
                    eigene Vorschau und tat nichts — ein Klick darauf waehlte
                    ueber die umschliessende Karte nur die Vorlage aus, wie
                    jeder andere Klick auch. "Kein Knopf, der nichts tut":
                    entfernt statt mit einer Funktion versehen, denn die
                    Vorschau steht ohnehin permanent daneben (Configurator.tsx
                    rendert sie in jedem Schritt).
                  */}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Action Bar */}
      {design.template && selectedTemplate && (
        <div className="mt-8 bg-cyan-50/50 border border-cyan-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4 shadow-sm">
          <div className="text-center mb-4">
            <span className="text-gray-500">
              {t("templates.selectedLabel")}:{" "}
            </span>
            <span className="font-bold text-gray-900 ml-1">
              {t(selectedTemplate.nameKey)}
            </span>
          </div>

          <Button
            onClick={handleNext}
            className="w-full h-14 text-lg font-bold text-white bg-gradient-to-r from-teal-500 via-purple-500 to-purple-600 hover:opacity-95 hover:scale-[1.01] shadow-lg hover:shadow-xl transition-all rounded-lg"
          >
            <span className="mr-2">✨</span> {t("templates.useThis")}{" "}
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
