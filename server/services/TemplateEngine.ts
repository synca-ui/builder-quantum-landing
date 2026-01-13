/**
 * Template Engine Service
 *
 * Singleton service acting as the Source of Truth for all template definitions.
 * Currently uses static/mock data, but designed to transition to Prisma/Database
 * without requiring changes to consuming code (async methods future-proof this).
 *
 * Responsibilities:
 * - Provide centralized access to all template definitions
 * - Validate template configurations
 * - Filter templates by business type or category
 * - Act as an abstraction layer for template storage (DB, JSON files, etc.)
 */

import type {
  Template,
  TemplateFilter,
  TemplateValidationResult,
} from "./template";

class TemplateEngine {
  private static instance: TemplateEngine;

  /**
   * Static readonly templates - Mock DB for now
   * In Phase 2, this will be replaced with Prisma queries
   */
  private readonly templates: Template[] = [
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

  /**
   * Singleton pattern - ensures only one instance exists
   */
  public static getInstance(): TemplateEngine {
    if (!TemplateEngine.instance) {
      TemplateEngine.instance = new TemplateEngine();
    }
    return TemplateEngine.instance;
  }

  /**
   * Get all templates, optionally filtered by business type
   * @param filter Optional filter criteria (businessType, category, etc.)
   * @returns Promise resolving to array of matching templates
   *
   * @example
   * const allTemplates = await engine.getAll();
   * const restaurantTemplates = await engine.getAll({ businessType: "restaurant" });
   */
  async getAll(filter?: TemplateFilter): Promise<Template[]> {
    // Simulate async DB call (for future Prisma migration)
    return new Promise((resolve) => {
      setTimeout(() => {
        if (!filter) {
          resolve([...this.templates]);
          return;
        }

        let filtered = [...this.templates];

        if (filter.businessType) {
          filtered = filtered.filter((template) =>
            template.businessTypes.includes(filter.businessType!),
          );
        }

        resolve(filtered);
      }, 0); // Async simulation with 0ms delay
    });
  }

  /**
   * Get a single template by ID
   * @param id Template ID (e.g., "minimalist", "modern")
   * @returns Promise resolving to Template or null if not found
   *
   * @example
   * const template = await engine.getById("modern");
   */
  async getById(id: string): Promise<Template | null> {
    // Simulate async DB call
    return new Promise((resolve) => {
      setTimeout(() => {
        const template = this.templates.find((t) => t.id === id) || null;
        resolve(template);
      }, 0);
    });
  }

  /**
   * Validate that a configuration's template and design tokens are valid
   * Checks:
   * - Template exists
   * - Colors are valid hex format
   * - Font family is supported
   *
   * @param templateId ID of the template to validate against
   * @param tokens Configuration tokens (colors, fonts, etc.) to validate
   * @returns Promise resolving to validation result
   *
   * @example
   * const result = await engine.validateConfig("modern", {
   *   primaryColor: "#4F46E5",
   *   fontFamily: "sans-serif"
   * });
   */
  async validateConfig(
    templateId: string,
    tokens: any,
  ): Promise<TemplateValidationResult> {
    // Simulate async DB call
    return new Promise((resolve) => {
      setTimeout(() => {
        const errors: string[] = [];

        // 1. Verify template exists
        const template = this.templates.find((t) => t.id === templateId);
        if (!template) {
          errors.push(`Template "${templateId}" does not exist`);
          resolve({ valid: false, errors });
          return;
        }

        // 2. Validate color format (if provided)
        const colorRegex = /^#[0-9A-Fa-f]{6}$/;
        if (tokens.primaryColor && !colorRegex.test(tokens.primaryColor)) {
          errors.push(
            `Invalid primaryColor format: "${tokens.primaryColor}" (must be hex like #RRGGBB)`,
          );
        }
        if (tokens.secondaryColor && !colorRegex.test(tokens.secondaryColor)) {
          errors.push(
            `Invalid secondaryColor format: "${tokens.secondaryColor}" (must be hex like #RRGGBB)`,
          );
        }
        if (tokens.fontColor && !colorRegex.test(tokens.fontColor)) {
          errors.push(
            `Invalid fontColor format: "${tokens.fontColor}" (must be hex like #RRGGBB)`,
          );
        }

        // 3. Validate font family (if provided)
        const validFonts = ["sans-serif", "serif", "display", "monospace"];
        if (tokens.fontFamily && !validFonts.includes(tokens.fontFamily)) {
          errors.push(
            `Invalid fontFamily: "${tokens.fontFamily}". Allowed: ${validFonts.join(", ")}`,
          );
        }

        // 4. Validate font size (if provided)
        const validSizes = ["small", "medium", "large"];
        if (tokens.fontSize && !validSizes.includes(tokens.fontSize)) {
          errors.push(
            `Invalid fontSize: "${tokens.fontSize}". Allowed: ${validSizes.join(", ")}`,
          );
        }

        resolve({
          valid: errors.length === 0,
          errors: errors.length > 0 ? errors : undefined,
        });
      }, 0);
    });
  }

  /**
   * Get all available business types supported by any template
   * Useful for UI dropdowns and filtering
   * @returns Promise resolving to unique business types
   *
   * @example
   * const types = await engine.getBusinessTypes();
   * // ["cafe", "restaurant", "bar"]
   */
  async getBusinessTypes(): Promise<string[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const types = new Set<string>();
        this.templates.forEach((t) => {
          t.businessTypes.forEach((bt) => types.add(bt));
        });
        resolve(Array.from(types).sort());
      }, 0);
    });
  }

  /**
   * Check if a template supports a specific business type
   * @param templateId Template ID to check
   * @param businessType Business type to verify
   * @returns Promise resolving to boolean
   *
   * @example
   * const supports = await engine.supportsBusinessType("modern", "restaurant");
   */
  async supportsBusinessType(
    templateId: string,
    businessType: string,
  ): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const template = this.templates.find((t) => t.id === templateId);
        resolve(
          template?.businessTypes.includes(businessType.toLowerCase()) ?? false,
        );
      }, 0);
    });
  }
}

/**
 * Export singleton instance
 * Usage: const engine = templateEngine;
 * Or: const engine = TemplateEngine.getInstance();
 */
export const templateEngine = TemplateEngine.getInstance();

export default TemplateEngine;
