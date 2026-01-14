/**
 * Template Engine Service
 *
 * Singleton service acting as the Source of Truth for all template definitions.
 * Now fetches template data directly from NeonDB using Prisma.
 *
 * Responsibilities:
 * - Provide centralized access to all template definitions
 * - Validate template configurations
 * - Filter templates by business type or category
 * - Act as an abstraction layer for template storage (Prisma/Database)
 */

import type {
  Template,
  TemplateFilter,
  TemplateValidationResult,
  DesignTokens,
  TemplateLayout,
  TemplatePreview,
} from "./template";
import prisma from "../db/prisma";
import type { JsonValue } from "@prisma/client";

class TemplateEngine {
  private static instance: TemplateEngine;

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
   * Cast JSON value to specific interface type
   * Ensures TypeScript type safety when reading JSON fields from Prisma
   */
  private castJsonValue<T>(value: JsonValue): T {
    return value as T;
  }

  /**
   * Convert Prisma Template to internal Template format
   * Maps database model to the interface expected by consuming code
   *
   * Defensive implementation handles:
   * - Empty or null JSON objects from database
   * - Missing properties
   * - Type mismatches
   */
  private mapPrismaTemplateToTemplate(prismaTemplate: any): Template {
    try {
      // Safely cast JSON values with null checks
      const layout = this.castJsonValue<TemplateLayout>(
        prismaTemplate.layout && Object.keys(prismaTemplate.layout).length > 0
          ? prismaTemplate.layout
          : { intent: "narrative", navigation: "top" }
      );

      const tokens = this.castJsonValue<DesignTokens>(
        prismaTemplate.tokens && Object.keys(prismaTemplate.tokens).length > 0
          ? prismaTemplate.tokens
          : {
              colors: {
                background: "#ffffff",
                accent: "#000000",
                text: "#000000",
                primary: "#000000",
                secondary: "#ffffff",
                border: "#e0e0e0",
              },
              typography: {
                h1: { size: "2rem", weight: 700, lineHeight: "1.2" },
                h2: { size: "1.5rem", weight: 600, lineHeight: "1.3" },
                body: { size: "1rem", weight: 400, lineHeight: "1.5" },
              },
              spacing: {
                xs: "0.25rem",
                sm: "0.5rem",
                md: "1rem",
                lg: "1.5rem",
                xl: "2rem",
              },
            }
      );

      const preview = this.castJsonValue<TemplatePreview>(
        prismaTemplate.preview && Object.keys(prismaTemplate.preview).length > 0
          ? prismaTemplate.preview
          : { thumbnail: "bg-white", features: [] }
      );

      // Map Prisma category array to businessTypes for backward compatibility
      const businessTypes = Array.isArray(prismaTemplate.category)
        ? prismaTemplate.category
        : [];

      // Build style object from tokens with defensive fallbacks
      const style = {
        background: tokens.colors?.background || "#ffffff",
        accent: tokens.colors?.accent || "#000000",
        text: tokens.colors?.text || "#000000",
        secondary: tokens.colors?.secondary || "#ffffff",
        layout: layout.intent || "narrative",
        navigation: layout.navigation || "top",
        typography: layout.typography?.headingFont || "sans-serif",
      };

      // Build mockup object with reasonable defaults
      const mockup = {
        nav: {
          bg: "bg-white",
          text: "text-black",
          border: "border-gray-200",
        },
        hero: {
          bg: "bg-white",
          text: "text-black",
        },
        cards: {
          bg: "bg-gray-50",
          border: "border-gray-200",
          text: "text-gray-800",
        },
      };

      return {
        id: prismaTemplate.id || "unknown",
        name: prismaTemplate.name || "Unnamed Template",
        description: prismaTemplate.description || "",
        preview: preview.thumbnail || "bg-white",
        businessTypes,
        style,
        features: Array.isArray(preview.features) ? preview.features : [],
        mockup,
      };
    } catch (error) {
      console.error(
        "[TemplateEngine] Error mapping Prisma template to Template:",
        {
          templateId: prismaTemplate?.id,
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined,
          prismaTemplate: JSON.stringify(prismaTemplate),
        }
      );
      throw new Error(
        `Failed to map template ${prismaTemplate?.id}: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Get all templates, optionally filtered by business type
   * Queries the database directly via Prisma
   *
   * @param filter Optional filter criteria (businessType, category, etc.)
   * @returns Promise resolving to array of matching templates
   *
   * @example
   * const allTemplates = await engine.getAll();
   * const restaurantTemplates = await engine.getAll({ businessType: "GASTRONOMY" });
   */
  async getAll(filter?: TemplateFilter): Promise<Template[]> {
    try {
      // Log database connection attempt
      console.log("[TemplateEngine] Fetching templates from database", {
        filter,
        databaseUrl: process.env.DATABASE_URL ? "configured" : "NOT CONFIGURED",
      });

      const where: any = {};

      // Filter by business type using Prisma's array contains operator
      if (filter?.businessType) {
        where.category = {
          has: filter.businessType,
        };
      }

      // Execute Prisma query with detailed error handling
      let prismaTemplates: any[];
      try {
        prismaTemplates = await (prisma as any).template.findMany({
          where,
        });
      } catch (dbError) {
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        const errorCode = (dbError as any)?.code;
        const errorDetails = {
          message: errorMessage,
          code: errorCode,
          stack: dbError instanceof Error ? dbError.stack : undefined,
          databaseUrl: process.env.DATABASE_URL
            ? `${process.env.DATABASE_URL.substring(0, 30)}...`
            : "NOT CONFIGURED",
          timestamp: new Date().toISOString(),
        };
        console.error("[TemplateEngine] DATABASE_ERROR in findMany:", errorDetails);
        throw dbError;
      }

      console.log(
        `[TemplateEngine] Successfully fetched ${prismaTemplates.length} templates from database`
      );

      // Map each Prisma template to internal Template format
      const templates = prismaTemplates.map((t: any) => {
        try {
          return this.mapPrismaTemplateToTemplate(t);
        } catch (mapError) {
          console.error(
            `[TemplateEngine] Error mapping template ${t?.id}:`,
            mapError
          );
          throw mapError;
        }
      });

      return templates;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      const errorDetails = {
        message: errorMessage,
        code: errorCode,
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString(),
      };
      console.error("[TemplateEngine] FATAL: Failed to fetch templates:", errorDetails);
      throw error;
    }
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
    try {
      console.log("[TemplateEngine] Fetching template by ID", { id });

      let prismaTemplate: any;
      try {
        prismaTemplate = await (prisma as any).template.findUnique({
          where: { id },
        });
      } catch (dbError) {
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        const errorCode = (dbError as any)?.code;
        const errorDetails = {
          templateId: id,
          message: errorMessage,
          code: errorCode,
          stack: dbError instanceof Error ? dbError.stack : undefined,
        };
        console.error("[TemplateEngine] DATABASE_ERROR in findUnique:", errorDetails);
        throw dbError;
      }

      if (!prismaTemplate) {
        console.log(`[TemplateEngine] Template not found: ${id}`);
        return null;
      }

      console.log(`[TemplateEngine] Successfully fetched template: ${id}`);
      return this.mapPrismaTemplateToTemplate(prismaTemplate);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      const errorDetails = {
        templateId: id,
        message: errorMessage,
        code: errorCode,
        stack: error instanceof Error ? error.stack : undefined,
      };
      console.error("[TemplateEngine] FATAL: Failed to fetch template:", errorDetails);
      throw error;
    }
  }

  /**
   * Validate that a configuration's template and design tokens are valid
   * Checks:
   * - Template exists in database
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
    try {
      console.log("[TemplateEngine] Validating template configuration", {
        templateId,
        hasTokens: !!tokens,
      });

      const errors: string[] = [];

      // 1. Verify template exists in database
      let template: any;
      try {
        template = await (prisma as any).template.findUnique({
          where: { id: templateId },
        });
      } catch (dbError) {
        const errorMessage = dbError instanceof Error ? dbError.message : String(dbError);
        const errorCode = (dbError as any)?.code;
        console.error("[TemplateEngine] DATABASE_ERROR in validateConfig:", {
          templateId,
          message: errorMessage,
          code: errorCode,
          stack: dbError instanceof Error ? dbError.stack : undefined,
        });
        throw dbError;
      }

      if (!template) {
        errors.push(`Template "${templateId}" does not exist`);
        return { valid: false, errors };
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

      const isValid = errors.length === 0;
      console.log("[TemplateEngine] Validation result:", {
        templateId,
        valid: isValid,
        errorCount: errors.length,
      });

      return {
        valid: isValid,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorCode = (error as any)?.code;
      console.error("[TemplateEngine] FATAL: Validation failed:", {
        templateId,
        message: errorMessage,
        code: errorCode,
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  }

  /**
   * Get all available business types supported by any template
   * Useful for UI dropdowns and filtering
   * Queries database for unique category values
   *
   * @returns Promise resolving to unique business types
   *
   * @example
   * const types = await engine.getBusinessTypes();
   * // ["GASTRONOMY", "CREATIVE", "SERVICE"]
   */
  async getBusinessTypes(): Promise<string[]> {
    try {
      const templates = await (prisma as any).template.findMany({
        select: {
          category: true,
        },
      });

      const types = new Set<string>();
      templates.forEach((t: any) => {
        if (Array.isArray(t.category)) {
          t.category.forEach((cat: string) => types.add(cat));
        }
      });

      return Array.from(types).sort();
    } catch (error) {
      console.error("[TemplateEngine] Error fetching business types:", error);
      throw new Error("Failed to fetch business types from database");
    }
  }

  /**
   * Check if a template supports a specific business type
   * @param templateId Template ID to check
   * @param businessType Business type to verify (e.g., "GASTRONOMY", "SERVICE")
   * @returns Promise resolving to boolean
   *
   * @example
   * const supports = await engine.supportsBusinessType("modern", "GASTRONOMY");
   */
  async supportsBusinessType(
    templateId: string,
    businessType: string,
  ): Promise<boolean> {
    try {
      const template = await (prisma as any).template.findUnique({
        where: { id: templateId },
        select: {
          category: true,
        },
      });

      if (!template) {
        return false;
      }

      return (
        Array.isArray(template.category) &&
        template.category.includes(businessType.toUpperCase())
      );
    } catch (error) {
      console.error(
        `[TemplateEngine] Error checking business type support:`,
        error,
      );
      return false;
    }
  }
}

/**
 * Export singleton instance
 * Usage: const engine = templateEngine;
 * Or: const engine = TemplateEngine.getInstance();
 */
export const templateEngine = TemplateEngine.getInstance();

export default TemplateEngine;
