import React from "react";
import { z } from "zod";

// Zod schemas for runtime validation
export const TemplateStyleSchema = z.object({
  background: z.string(),
  accent: z.string(),
  text: z.string(),
  secondary: z.string(),
  layout: z.string(),
  navigation: z.string(),
  typography: z.string(),
});

export const TemplateMockupSchema = z.object({
  nav: z.object({
    bg: z.string(),
    text: z.string(),
    border: z.string(),
  }),
  hero: z.object({
    bg: z.string(),
    text: z.string(),
  }),
  cards: z.object({
    bg: z.string(),
    border: z.string(),
    text: z.string(),
  }),
});

export const TemplateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  preview: z.string(),
  businessTypes: z.array(z.string()),
  style: TemplateStyleSchema,
  features: z.array(z.string()),
  mockup: TemplateMockupSchema,
});

export const TemplateThemeSchema = z.object({
  primary: z.string(),
  secondary: z.string(),
  text: z.string(),
  background: z.string(),
  highlight: z.string(),
  buttonRadius: z.string(),
  buttonHover: z.string(),
});

export interface TemplateStyle {
  background: string;
  accent: string;
  text: string;
  secondary: string;
  layout: string;
  navigation: string;
  typography: string;
}

export interface TemplateMockup {
  nav: {
    bg: string;
    text: string;
    border: string;
  };
  hero: {
    bg: string;
    text: string;
  };
  cards: {
    bg: string;
    border: string;
    text: string;
  };
}

export interface Template {
  id: string;
  name: string;
  description: string;
  preview: string;
  businessTypes: string[];
  style: TemplateStyle;
  features: string[];
  mockup: TemplateMockup;
}

export interface TemplateTheme {
  primary: string;
  secondary: string;
  text: string;
  background: string;
  highlight: string;
  buttonRadius: string;
  buttonHover: string;
}

export const defaultTemplates: Template[] = [
  {
    id: "minimalist",
    name: "Minimalist",
    description:
      "Narrative, minimal design guiding users through full-screen sections.",
    preview: "bg-gradient-to-br from-white to-gray-100",
    businessTypes: ["cafe", "restaurant", "bar"],
    style: {
      background: "#FFFFFF",
      accent: "#111827",
      text: "#111827",
      secondary: "#F3F4F6",
      layout: "narrative-fullscreen",
      navigation: "overlay-hamburger",
      typography: "minimal-sans",
    },
    features: ["Ultra Clean", "Fast Loading", "Content Focus"],
    mockup: {
      nav: {
        bg: "bg-white",
        text: "text-black",
        border: "border-transparent",
      },
      hero: { bg: "bg-white", text: "text-black" },
      cards: {
        bg: "bg-gray-50",
        border: "border-gray-100",
        text: "text-gray-800",
      },
    },
  },
  {
    id: "modern",
    name: "Modern",
    description: "Contemporary design with bold colors and sleek animations",
    preview: "bg-gradient-to-br from-blue-500 to-purple-600",
    businessTypes: ["cafe", "restaurant", "bar"],
    style: {
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      accent: "#4F46E5",
      text: "#FFFFFF",
      secondary: "#6366F1",
      layout: "modern-cards",
      navigation: "glassmorphism",
      typography: "modern-geometric",
    },
    features: ["Gradient Backgrounds", "Glass Effects", "Bold Typography"],
    mockup: {
      nav: {
        bg: "bg-white/10 backdrop-blur-md",
        text: "text-white",
        border: "border-white/20",
      },
      hero: {
        bg: "bg-gradient-to-r from-blue-500 to-purple-600",
        text: "text-white",
      },
      cards: {
        bg: "bg-white/15 backdrop-blur-sm",
        border: "border-white/30",
        text: "text-white",
      },
    },
  },
  {
    id: "stylish",
    name: "Stylish",
    description:
      "Visual-first design with overlays, mixed sections, and motion",
    preview: "bg-gradient-to-br from-emerald-50 to-slate-800",
    businessTypes: ["cafe", "restaurant", "bar"],
    style: {
      background: "#111827",
      accent: "#059669",
      text: "#F9FAFB",
      secondary: "#1F2937",
      layout: "visual-overlap",
      navigation: "contrast",
      typography: "decorative-serif",
    },
    features: ["Overlapping Visuals", "Mixed Sections", "Animated Hovers"],
    mockup: {
      nav: {
        bg: "bg-slate-900/80 backdrop-blur",
        text: "text-white",
        border: "border-emerald-300/20",
      },
      hero: {
        bg: "bg-gradient-to-r from-emerald-500/20 to-transparent",
        text: "text-white",
      },
      cards: {
        bg: "bg-white/5 backdrop-blur",
        border: "border-white/10",
        text: "text-slate-100",
      },
    },
  },
  {
    id: "cozy",
    name: "Cozy",
    description:
      "Warm, friendly aesthetic with rounded elements and authentic photography.",
    preview: "bg-gradient-to-br from-amber-100 via-orange-50 to-rose-50",
    businessTypes: ["cafe", "restaurant", "bar"],
    style: {
      background: "#FFFBF0",
      accent: "#EA580C",
      text: "#1F2937",
      secondary: "#FEF3C7",
      layout: "cozy-grid",
      navigation: "rounded-top",
      typography: "handwritten-sans",
    },
    features: ["Warm Colors", "Rounded Corners", "Community Feel"],
    mockup: {
      nav: {
        bg: "bg-white/90",
        text: "text-amber-900",
        border: "border-amber-200",
      },
      hero: {
        bg: "bg-amber-50",
        text: "text-amber-900",
      },
      cards: {
        bg: "bg-white",
        border: "border-amber-200",
        text: "text-slate-800",
      },
    },
  },
];

export const defaultTemplateThemes: Record<string, TemplateTheme> = {
  minimalist: {
    primary: "#2563EB",
    secondary: "#7C3AED",
    text: "#1A1A1A",
    background: "#FFFFFF",
    highlight: "#14B8A6",
    buttonRadius: "rounded-lg",
    buttonHover: "grow",
  },
  modern: {
    primary: "#4F46E5",
    secondary: "#7C3AED",
    text: "#FFFFFF",
    background: "#111827",
    highlight: "#22D3EE",
    buttonRadius: "rounded-xl",
    buttonHover: "glow",
  },
  stylish: {
    primary: "#059669",
    secondary: "#10B981",
    text: "#F9FAFB",
    background: "#111827",
    highlight: "#F59E0B",
    buttonRadius: "rounded-2xl",
    buttonHover: "grow",
  },
  cozy: {
    primary: "#EA580C",
    secondary: "#F59E0B",
    text: "#1F2937",
    background: "#FFFBF0",
    highlight: "#FDBA74",
    buttonRadius: "rounded-2xl",
    buttonHover: "grow",
  },
};

interface TemplateRegistryProps {
  selectedTemplate?: string;
  onTemplateSelect?: (templateId: string) => void;
  businessType?: string;
}

export function TemplateRegistry({
  selectedTemplate,
  onTemplateSelect,
  businessType,
}: TemplateRegistryProps) {
  const availableTemplates = defaultTemplates.filter(
    (template) =>
      !template.businessTypes ||
      template.businessTypes.includes(businessType || "") ||
      !businessType,
  );

  return (
    <div className="grid grid-cols-3 gap-4">
      {availableTemplates.map((template) => (
        <div
          key={template.id}
          className={`cursor-pointer transition-all duration-300 border-2 rounded-lg p-4 ${
            selectedTemplate === template.id
              ? "border-teal-500 bg-teal-50 shadow-lg"
              : "border-gray-200 hover:border-teal-300 hover:shadow-md"
          }`}
          onClick={() => onTemplateSelect?.(template.id)}
        >
          <div className="flex items-center space-x-3">
            <div
              className={`w-3 h-3 rounded-full ${template.preview} flex-shrink-0`}
            ></div>
            <div className="flex-1 min-w-0">
              <h4 className="text-md font-bold text-gray-900 truncate">
                {template.name}
              </h4>
              <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                {template.description}
              </p>
              <div className="flex flex-wrap gap-1 mt-2">
                {template.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default TemplateRegistry;
