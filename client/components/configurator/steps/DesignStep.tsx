import { useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Check, ArrowLeft, ChevronRight, Palette, Type, PaintBucket, Navigation, Info, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  useConfiguratorDesign,
  useConfiguratorActions,
  useConfiguratorBusiness,
} from "@/store/configuratorStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// --- KONSTANTEN ---
const FONT_OPTIONS = [
  {
    id: "sans-serif",
    name: "Sans Serif",
    class: "font-sans",
    preview: "Modern & Clean",
    description: "Perfekt für digitale Lesbarkeit",
  },
  {
    id: "serif",
    name: "Serif",
    class: "font-serif",
    preview: "Klassisch & Elegant",
    description: "Traditionell und anspruchsvoll",
  },
  {
    id: "mono",
    name: "Display",
    class: "font-mono",
    preview: "Bold & Kreativ",
    description: "Auffällig und einzigartig",
  },
];

const FONT_SIZES = [
  {
    id: "small",
    name: "Klein",
    description: "Kompakt und minimal",
  },
  {
    id: "medium",
    name: "Mittel",
    description: "Standard Lesbarkeit",
  },
  {
    id: "large",
    name: "Groß",
    description: "Laut und deutlich",
  },
];

// Header font size options with pixel values
const HEADER_FONT_SIZES = [
  { id: "xs", name: "10px", value: "10px" },
  { id: "small", name: "12px", value: "12px" },
  { id: "medium", name: "14px", value: "14px" },
  { id: "large", name: "16px", value: "16px" },
  { id: "xl", name: "18px", value: "18px" },
  { id: "2xl", name: "20px", value: "20px" },
];

// Color tooltips for hover info
const COLOR_TOOLTIPS: Record<string, string> = {
  primary: "Buttons, Links, CTAs, Hauptakzente",
  secondary: "Gradients, Hover-Effekte, sekundäre Elemente",
  background: "Seitenhintergrund",
  price: "Nur für Preisanzeigen (€)",
  font: "Haupttextfarbe für Inhalte",
  headerFont: "Textfarbe der Navigation",
  headerBackground: "Hintergrund der Navigation",
};

const COLOR_PRESETS = [
  { primary: "#2563EB", secondary: "#7C3AED", bg: "#EFF6FF", name: "Ocean" },
  { primary: "#059669", secondary: "#10B981", bg: "#F0FDF4", name: "Forest" },
  { primary: "#DC2626", secondary: "#F59E0B", bg: "#FFF7ED", name: "Sunset" },
  { primary: "#7C2D12", secondary: "#EA580C", bg: "#FFEDD5", name: "Autumn" },
  { primary: "#1F2937", secondary: "#374151", bg: "#F3F4F6", name: "Elegant" },
  { primary: "#BE185D", secondary: "#EC4899", bg: "#FDF2F8", name: "Berry" },
  { primary: "#6366F1", secondary: "#8B5CF6", bg: "#EEF2FF", name: "Purple" },
  { primary: "#0891B2", secondary: "#06B6D4", bg: "#ECFEFF", name: "Sky" },
];

// --- HELPER: Tooltip Info Icon ---
const ColorInfoIcon = ({ tooltipKey }: { tooltipKey: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button type="button" className="ml-1.5 text-gray-400 hover:text-teal-500 transition-colors">
        <HelpCircle className="w-4 h-4" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[200px] text-xs">
      <p>{COLOR_TOOLTIPS[tooltipKey]}</p>
    </TooltipContent>
  </Tooltip>
);

// --- HELPER COMPONENT (Verhindert Neu-Rendern beim Tippen) ---
const ColorInput = ({ label, value, onChange, tooltipKey }: { label: string, value: string, onChange: (val: string) => void, tooltipKey?: string }) => {
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  const handleBlur = () => {
    if (localValue !== value) onChange(localValue);
  };

  // FIX: Hier wurde der Typ <HTMLInputElement> hinzugefügt, damit .blur() existiert
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
      onChange(localValue);
    }
  };

  return (
    <div>
      <label className="flex items-center text-sm font-bold text-gray-700 mb-4">
        {label}
        {tooltipKey && <ColorInfoIcon tooltipKey={tooltipKey} />}
      </label>
      <div className="flex items-center space-x-4">
        <div className="relative">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-all hover:scale-105 shadow-sm"
            style={{ WebkitAppearance: "none", padding: "4px" }}
          />
        </div>
        <div className="flex-1">
          <Input
            value={localValue || ""}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all uppercase"
            placeholder="#000000"
            maxLength={7}
          />
        </div>
      </div>
    </div>
  );
};

// --- INTERFACE ---
interface DesignStepProps {
  nextStep: () => void;
  prevStep: () => void;
}

// --- COMPONENT ---
export function DesignStep({ nextStep, prevStep }: DesignStepProps) {
  const { t } = useTranslation();
  const design = useConfiguratorDesign();
  const { design: designActions } = useConfiguratorActions();

  // Helper für Felder, die ggf. nicht im Basis-Typ sind
  const updateAny = (key: string, val: string) => {
    designActions.updateDesign({ [key]: val } as any);
  };

  // Validation
  const isValid = !!(
    design.primaryColor &&
    design.secondaryColor
  );

  // Handlers
  const handleColorPresetSelect = useCallback(
    (preset: (typeof COLOR_PRESETS)[0]) => {
      designActions.updateDesign({
        primaryColor: preset.primary,
        secondaryColor: preset.secondary,
        backgroundColor: preset.bg,
      });
    },
    [designActions]
  );

  // Check Helper
  const isColorPresetSelected = (preset: (typeof COLOR_PRESETS)[0]) => {
    return (
      design.primaryColor === preset.primary &&
      design.secondaryColor === preset.secondary
    );
  };

  return (
    <TooltipProvider>
    <div className="py-8 max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          {t("design.title")}
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          {t("design.subtitle")}
        </p>
      </div>

      <div className="space-y-12">

        {/* --- COLOR THEMES --- */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            {t("design.colorThemes")}
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {COLOR_PRESETS.map((preset, index) => {
              const isSelected = isColorPresetSelected(preset);
              return (
                <button
                  key={index}
                  onClick={() => handleColorPresetSelect(preset)}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    isSelected
                      ? "border-teal-500 bg-teal-50 shadow-lg transform scale-105"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="relative mb-3">
                    <div className="flex space-x-1">
                      <div
                        className="w-8 h-8 rounded-lg shadow-sm"
                        style={{ backgroundColor: preset.primary }}
                      ></div>
                      <div
                        className="w-8 h-8 rounded-lg shadow-sm"
                        style={{ backgroundColor: preset.secondary }}
                      ></div>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isSelected ? "text-teal-700" : "text-gray-700"
                    }`}
                  >
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- CUSTOM COLORS (Optimized) --- */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <PaintBucket className="w-5 h-5 text-teal-600" /> {t("design.customColors")}
          </h3>

          <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">

            <ColorInput
              label={t("design.primaryColor")}
              value={design.primaryColor || "#4F46E5"}
              onChange={designActions.updatePrimaryColor}
              tooltipKey="primary"
            />

            <ColorInput
              label={t("design.secondaryColor")}
              value={design.secondaryColor || "#7C3AED"}
              onChange={designActions.updateSecondaryColor}
              tooltipKey="secondary"
            />

            <ColorInput
              label={t("design.backgroundColor")}
              value={design.backgroundColor || "#FFFFFF"}
              onChange={(v) => updateAny('backgroundColor', v)}
              tooltipKey="background"
            />

            <ColorInput
              label={t("design.priceColor")}
              value={(design as any).priceColor || "#059669"}
              onChange={(v) => updateAny('priceColor', v)}
              tooltipKey="price"
            />

            <ColorInput
              label={t("design.fontColor")}
              value={design.fontColor || "#000000"}
              onChange={(v) => designActions.updateDesign({ fontColor: v })}
              tooltipKey="font"
            />

          </div>
        </div>

        {/* --- HEADER/NAVIGATION CUSTOMIZATION --- */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Navigation className="w-5 h-5 text-teal-600" /> Navigation (Headbar)
          </h3>

          <div className="grid sm:grid-cols-2 gap-6 lg:gap-8">
            <ColorInput
              label="Header Schriftfarbe"
              value={(design as any).headerFontColor || "#000000"}
              onChange={(v) => updateAny('headerFontColor', v)}
              tooltipKey="headerFont"
            />

            <ColorInput
              label="Header Hintergrund"
              value={(design as any).headerBackgroundColor || "#FFFFFF"}
              onChange={(v) => updateAny('headerBackgroundColor', v)}
              tooltipKey="headerBackground"
            />
          </div>

          {/* Header Font Size - Granular pixel options */}
          <div className="mt-6">
            <label className="block text-sm font-bold text-gray-700 mb-4">Header Schriftgröße</label>
            <div className="flex flex-wrap gap-2">
              {HEADER_FONT_SIZES.map((size) => {
                const isSelected = ((design as any).headerFontSize || 'medium') === size.id;
                return (
                  <button
                    key={`header-${size.id}`}
                    type="button"
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                      isSelected
                        ? "bg-teal-500 text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-teal-100 hover:text-teal-700"
                    }`}
                    onClick={() => updateAny('headerFontSize', size.id)}
                  >
                    {size.name}
                    {isSelected && <Check className="w-3 h-3 ml-1.5 inline" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* --- TYPOGRAPHY STYLE --- */}
        <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Type className="w-5 h-5 text-teal-600" /> {t("design.typography")}
          </h3>

          <div className="space-y-8">
            {/* Font Family */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">{t("design.fontFamily")}</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {FONT_OPTIONS.map((font) => (
                  <Card
                    key={font.id}
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      design.fontFamily === font.id
                        ? "border-teal-500 bg-teal-50 shadow-md"
                        : "border-gray-200 hover:border-teal-300 hover:shadow-sm"
                    }`}
                    onClick={() => designActions.updateFontFamily(font.id)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`text-2xl font-bold mb-2 ${font.class}`}>Ag</div>
                      <div className="font-bold text-sm text-gray-900">{font.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{font.preview}</div>

                      {design.fontFamily === font.id && (
                        <div className="mt-3 flex justify-center">
                          <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">{t("design.fontSize")}</label>
              <div className="grid grid-cols-3 gap-4">
                {FONT_SIZES.map((size) => {
                  // @ts-ignore
                  const isSelected = (design.fontSize || 'medium') === size.id;
                  return (
                    <Card
                      key={size.id}
                      className={`cursor-pointer transition-all duration-300 border-2 ${
                        isSelected
                          ? "border-teal-500 bg-teal-50 shadow-md"
                          : "border-gray-200 hover:border-teal-300"
                      }`}
                      onClick={() => updateAny('fontSize', size.id)}
                    >
                      <CardContent className="p-4 text-center">
                        <div
                          className={`font-bold mb-2 ${
                            size.id === "small"
                              ? "text-sm"
                              : size.id === "medium"
                                ? "text-base"
                                : "text-lg"
                          }`}
                        >
                          {size.name}
                        </div>
                        <div className="text-xs text-gray-500">
                          {size.description}
                        </div>
                        {isSelected && (
                          <div className="mt-3 flex justify-center">
                            <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-white" />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

      </div>

      <div className="flex justify-between mt-12 pt-6 border-t border-gray-100">
        <Button onClick={prevStep} variant="outline" size="lg" className="border-gray-300">
          <ArrowLeft className="mr-2 w-5 h-5" /> {t("common.back")}
        </Button>
        <Button
          onClick={() => isValid && nextStep()}
          disabled={!isValid}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500 text-white shadow-lg"
        >
          {t("common.next")} <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
    </TooltipProvider>
  );
}
