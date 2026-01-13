/**
 * Design Customization Step Component
 * Handles template selection, colors, fonts, and styling
 * Consumes Zustand store directly - zero prop drilling
 */

import { useCallback, useMemo } from "react";
import { Check, ArrowLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { defaultTemplates } from "@/components/template/TemplateRegistry";
import {
  useConfiguratorDesign,
  useConfiguratorBusiness,
  useConfiguratorActions,
} from "@/store/configuratorStore";

// Font options matching the original Configurator
const FONT_OPTIONS = [
  {
    id: "sans-serif",
    name: "Sans Serif",
    class: "font-sans",
    preview: "Modern & Clean",
    description: "Perfect for digital readability",
  },
  {
    id: "serif",
    name: "Serif",
    class: "font-serif",
    preview: "Classic & Elegant",
    description: "Traditional and sophisticated",
  },
  {
    id: "display",
    name: "Display",
    class: "font-mono",
    preview: "Bold & Creative",
    description: "Eye-catching and unique",
  },
];

// Font size options
const FONT_SIZES = [
  {
    id: "small",
    name: "Small",
    description: "Compact and minimal",
  },
  {
    id: "medium",
    name: "Medium",
    description: "Standard readability",
  },
  {
    id: "large",
    name: "Large",
    description: "Bold and prominent",
  },
];

// Color presets
const COLOR_PRESETS = [
  {
    primary: "#2563EB",
    secondary: "#7C3AED",
    name: "Ocean",
    accent: "#0EA5E9",
  },
  {
    primary: "#059669",
    secondary: "#10B981",
    name: "Forest",
    accent: "#22C55E",
  },
  {
    primary: "#DC2626",
    secondary: "#F59E0B",
    name: "Sunset",
    accent: "#F97316",
  },
  {
    primary: "#7C2D12",
    secondary: "#EA580C",
    name: "Autumn",
    accent: "#F59E0B",
  },
  {
    primary: "#1F2937",
    secondary: "#374151",
    name: "Elegant",
    accent: "#6B7280",
  },
  {
    primary: "#BE185D",
    secondary: "#EC4899",
    name: "Vibrant",
    accent: "#F472B6",
  },
  {
    primary: "#6366F1",
    secondary: "#8B5CF6",
    name: "Purple",
    accent: "#A855F7",
  },
  {
    primary: "#0891B2",
    secondary: "#06B6D4",
    name: "Sky",
    accent: "#38BDF8",
  },
];

export default function DesignStep() {
  // Get state from store
  const design = useConfiguratorDesign();
  const business = useConfiguratorBusiness();

  // Get actions from store
  const { design: designActions, navigation: navigationActions } =
    useConfiguratorActions();

  // Filter templates by business type
  const availableTemplates = useMemo(() => {
    return defaultTemplates.filter(
      (template) =>
        !template.businessTypes ||
        template.businessTypes.includes(business.type) ||
        !business.type,
    );
  }, [business.type]);

  // Validation - require at least one template and primary/secondary colors
  const isValid = !!(
    design.template &&
    design.primaryColor &&
    design.secondaryColor
  );

  // Handlers
  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      designActions.updateTemplate(templateId);
    },
    [designActions],
  );

  const handleColorPresetSelect = useCallback(
    (preset: (typeof COLOR_PRESETS)[0]) => {
      designActions.updatePrimaryColor(preset.primary);
      designActions.updateSecondaryColor(preset.secondary);
    },
    [designActions],
  );

  const handlePrimaryColorChange = useCallback(
    (value: string) => {
      designActions.updatePrimaryColor(value);
    },
    [designActions],
  );

  const handleSecondaryColorChange = useCallback(
    (value: string) => {
      designActions.updateSecondaryColor(value);
    },
    [designActions],
  );

  const handleFontFamilySelect = useCallback(
    (fontId: string) => {
      designActions.updateFontFamily(fontId);
    },
    [designActions],
  );

  const handleFontSizeSelect = useCallback(
    (sizeId: string) => {
      designActions.updateDesign({ fontSize: sizeId });
    },
    [designActions],
  );

  const handleFontColorChange = useCallback(
    (value: string) => {
      designActions.updateDesign({ fontColor: value });
    },
    [designActions],
  );

  const handleShowHomeHeroToggle = useCallback(
    (checked: boolean) => {
      designActions.updateDesign({ showHomeHero: checked });
    },
    [designActions],
  );

  const handlePrevStep = useCallback(() => {
    navigationActions.prevStep();
  }, [navigationActions]);

  const handleNextStep = useCallback(() => {
    if (isValid) {
      navigationActions.nextStep();
    }
  }, [isValid, navigationActions]);

  // Check if color preset is selected
  const isColorPresetSelected = (preset: (typeof COLOR_PRESETS)[0]) => {
    return (
      design.primaryColor === preset.primary &&
      design.secondaryColor === preset.secondary
    );
  };

  return (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Customize your design
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose colors, fonts and styling that represent your business
          personality and create a memorable brand experience.
        </p>
      </div>

      <div className="space-y-12">
        {/* Template Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Choose Your Template *
          </label>
          <p className="text-sm text-gray-500 mb-4">
            Select a design template that matches your vision
          </p>
          <div className="space-y-3">
            {availableTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  design.template === template.id
                    ? "border-teal-500 bg-teal-50 shadow-lg"
                    : "border-gray-200 hover:border-teal-300"
                }`}
                onClick={() => handleTemplateSelect(template.id)}
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
                        {design.template === template.id && (
                          <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
                        )}
                      </div>
                      <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Color Themes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Color Themes
          </label>
          <p className="text-sm text-gray-500 mb-6">
            Choose a preset or customize your own colors below
          </p>
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

        {/* Custom Color Section */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Custom Colors
          </h3>
          <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                Primary Color *
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="color"
                    value={design.primaryColor}
                    onChange={(e) => {
                      e.stopPropagation();
                      handlePrimaryColorChange(e.target.value);
                    }}
                    className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-all hover:scale-105 shadow-sm"
                    style={{ WebkitAppearance: "none", padding: "4px" }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={design.primaryColor}
                    onChange={(e) => handlePrimaryColorChange(e.target.value)}
                    className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    placeholder="#2563EB"
                  />
                  <p className="text-xs text-gray-500 mt-1">Main brand color</p>
                </div>
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                Secondary Color *
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="color"
                    value={design.secondaryColor}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSecondaryColorChange(e.target.value);
                    }}
                    className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-all hover:scale-105 shadow-sm"
                    style={{ WebkitAppearance: "none", padding: "4px" }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={design.secondaryColor}
                    onChange={(e) => handleSecondaryColorChange(e.target.value)}
                    className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    placeholder="#7C3AED"
                  />
                  <p className="text-xs text-gray-500 mt-1">Accent color</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Font Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Typography Style
          </label>
          <div className="grid grid-cols-3 gap-4">
            {FONT_OPTIONS.map((font) => (
              <Card
                key={font.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  design.fontFamily === font.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                }`}
                onClick={() => handleFontFamilySelect(font.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`text-lg font-bold mb-2 ${font.class}`}>
                    {font.name}
                  </div>
                  <div className={`text-sm text-gray-600 ${font.class}`}>
                    {font.preview}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {font.description}
                  </div>
                  {design.fontFamily === font.id && (
                    <div className="mt-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Font Color */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Text Color
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={design.fontColor || "#000000"}
              onChange={(e) => handleFontColorChange(e.target.value)}
              className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
            />
            <div className="flex-1">
              <input
                type="text"
                value={design.fontColor || "#000000"}
                onChange={(e) => handleFontColorChange(e.target.value)}
                placeholder="#000000"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a hex color code or use the color picker
              </p>
            </div>
          </div>
        </div>

        {/* Homepage Options */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Homepage Options
          </label>
          <div className="space-y-2">
            <label className="inline-flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={!!design.backgroundColor}
                onChange={(e) => handleShowHomeHeroToggle(e.target.checked)}
              />
              <span>Show header block under headline (logo + name)</span>
            </label>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Text Size
          </label>
          <div className="grid grid-cols-3 gap-4">
            {FONT_SIZES.map((size) => (
              <Card
                key={size.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  design.fontSize === size.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                }`}
                onClick={() => handleFontSizeSelect(size.id)}
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
                  {design.fontSize === size.id && (
                    <div className="mt-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button
          type="button"
          onClick={handlePrevStep}
          variant="outline"
          size="lg"
        >
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={handleNextStep}
          disabled={!isValid}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
