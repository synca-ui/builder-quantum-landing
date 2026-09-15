import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useConfiguratorBusiness,
  useConfiguratorDesign,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import {
  PICKER_TEMPLATES,
  templateBeschreibungsKey,
  templateNameKey,
} from "@shared/templateCatalog";
import { TemplateStilprobe } from "@/components/configurator/TemplateStilprobe";

/**
 * Die angebotenen Vorlagen kommen aus shared/templateCatalog.ts — derselben
 * Liste, aus der prisma/seed.ts die Tabelle `Template` füllt und aus der
 * GET /api/templates antwortet. Vorher stand hier eine eigene Liste; sie lief
 * gegen den Seed auseinander, und wer eine der neueren Vorlagen wählte, bekam
 * beim Speichern 400 "Invalid template" von server/routes/configurations.ts.
 *
 * Bewusst nur helle Templates im Picker — dunkel stellt man sich über die
 * freien Farben selbst ein. Die früheren Templates "Stilvoll", "Gemütlich",
 * "Mitternacht", "Riviera" und "Verde" bleiben als Alt-Bestand im Renderer
 * lauffähig (IDs stylish/cozy/nocturne/riviera/verde), erscheinen hier aber
 * nicht mehr; im Katalog tragen sie `imPicker: false`.
 *
 * Aufbau seit 12.09.2026: Jede Karte trägt eine Stilprobe (echte DishCard in
 * der Palette der Vorlage, siehe TemplateStilprobe), darüber ein Filter nach
 * Betriebsart aus `businessTypes` des Katalogs, und die Leiste mit dem
 * Weiter-Knopf klebt am unteren Rand statt erst nach 16 Karten zu erscheinen.
 * Vorher: 16 reine Textkarten über drei Bildschirmhöhen, der Knopf ganz
 * unten, und der Look nur über Umweg im Telefon rechts zu erahnen.
 */
const TEMPLATES = PICKER_TEMPLATES.map((eintrag) => ({
  id: eintrag.id,
  nameKey: templateNameKey(eintrag.id),
  descriptionKey: templateBeschreibungsKey(eintrag.id),
  color: eintrag.punkt,
  previewColor: eintrag.auswahl,
  businessTypes: eintrag.businessTypes,
}));

/**
 * Filter-Reihenfolge = Reihenfolge der Betriebsarten im Business-Schritt.
 * Nur Arten, für die der Katalog überhaupt Vorlagen kennt — ein leerer
 * Filter wäre eine Sackgasse.
 */
const FILTER_ARTEN = ["cafe", "restaurant", "bar"].filter((art) =>
  TEMPLATES.some((t) => t.businessTypes.includes(art)),
);
const ALLE = "alle";

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
  const business = useConfiguratorBusiness();
  const { design: designActions } = useConfiguratorActions();

  /**
   * Vorbelegt mit der Betriebsart, falls sie schon feststeht (Rücksprung aus
   * einem späteren Schritt, geladene Konfiguration). Beim ersten Besuch ist
   * sie leer — dann "alle", denn die Betriebsart kommt erst in Schritt 2.
   */
  const [filter, setFilter] = useState<string>(() =>
    business.type && FILTER_ARTEN.includes(business.type)
      ? business.type
      : ALLE,
  );

  const sichtbar = useMemo(
    () =>
      filter === ALLE
        ? TEMPLATES
        : TEMPLATES.filter((t) => t.businessTypes.includes(filter)),
    [filter],
  );

  const handleSelect = (id: string) => {
    designActions.updateTemplate(id);
    if (setPreviewTemplateId) {
      setPreviewTemplateId(id);
    }
  };

  const handleNext = () => {
    if (design.template) nextStep();
  };

  /**
   * Gewähltes Template — auch wenn es nicht mehr im Picker steht (riviera,
   * verde, stylish …). Vorher verschwand dann die Fußleiste mit dem
   * Weiter-Knopf, und wer eine bestehende Konfiguration öffnete, kam nur
   * weiter, indem er ein anderes Template wählte — was seine Palette
   * überschrieb. Der Name kommt aus den i18n-Keys, die für den Alt-Bestand
   * stehen bleiben; fehlt auch der, steht die ID selbst da.
   */
  const selectedTemplate = design.template
    ? (TEMPLATES.find((t) => t.id === design.template) ?? {
        id: design.template,
        nameKey: templateNameKey(design.template),
      })
    : undefined;

  return (
    <div className="max-w-4xl mx-auto py-4">
      {/* Headline */}
      <div className="text-center mb-8">
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

      {/* Filter nach Betriebsart */}
      <div
        className="flex flex-wrap items-center gap-2 mb-6"
        role="group"
        aria-label={t("templates.filterLabel")}
      >
        <span className="text-sm text-gray-500 mr-1">
          {t("templates.filterLabel")}
        </span>
        {[ALLE, ...FILTER_ARTEN].map((art) => {
          const aktiv = filter === art;
          return (
            <button
              key={art}
              type="button"
              onClick={() => setFilter(art)}
              aria-pressed={aktiv}
              className={`px-3.5 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
                aktiv
                  ? "bg-gray-900 text-white border-gray-900"
                  : "bg-white text-gray-700 border-gray-200 hover:border-gray-400"
              }`}
            >
              {art === ALLE
                ? t("templates.filterAll")
                : t(`business.types.${art}`)}
            </button>
          );
        })}
        <span className="ml-auto text-xs text-gray-400 tabular-nums">
          {sichtbar.length}/{TEMPLATES.length}
        </span>
      </div>

      {/* Template Grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {sichtbar.map((template) => {
          const isSelected = design.template === template.id;
          return (
            <div
              key={template.id}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleSelect(template.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleSelect(template.id);
                }
              }}
              className={`
                group relative p-3 rounded-xl border-2 cursor-pointer transition-all duration-200
                focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400
                ${
                  isSelected
                    ? `${template.previewColor} shadow-md scale-[1.01]`
                    : "border-gray-100 hover:border-gray-300 hover:shadow-sm bg-white"
                }
              `}
            >
              <TemplateStilprobe template={template.id} />
              <div className="px-2 pt-3 pb-1">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${template.color}`}
                  />
                  <h3
                    data-vorlage-name={template.id}
                    className="font-bold text-gray-900 flex items-center gap-2 text-base"
                  >
                    {t(template.nameKey)}
                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600" />
                    )}
                  </h3>
                </div>
                <p className="text-sm text-gray-500 mt-1.5 leading-relaxed line-clamp-2">
                  {t(template.descriptionKey)}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/*
        Fußleiste klebt am unteren Rand des Scrollbereichs: Wer bei Karte 3
        fündig wird, muss nicht an 13 weiteren vorbei, um weiterzukommen.
        Erscheint wie zuvor erst mit einer Auswahl.
      */}
      {design.template && selectedTemplate && (
        <div className="sticky bottom-3 mt-6 z-10 bg-white/95 backdrop-blur border border-cyan-100 rounded-xl p-4 shadow-lg animate-in fade-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="text-center sm:text-left sm:flex-1">
              <span className="text-gray-500">
                {t("templates.selectedLabel")}:{" "}
              </span>
              <span className="font-bold text-gray-900 ml-1">
                {t(selectedTemplate.nameKey)}
              </span>
            </div>
            <Button
              onClick={handleNext}
              className="w-full sm:w-auto h-12 px-6 text-base font-bold text-white bg-gradient-to-r from-teal-500 via-purple-500 to-purple-600 hover:opacity-95 shadow-md transition-all rounded-lg"
            >
              {t("templates.useThis")}
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
