/**
 * Template API Routes
 * Exposes the TemplateEngine service via REST endpoints
 *
 * Routes:
 * - GET /api/templates - Get all templates (optionally filtered by business type)
 * - GET /api/templates/:id - Get a single template by ID
 * - POST /api/templates/validate - Validate template configuration
 *
 * Future: When Marketplace is ready, these endpoints will support:
 * - Third-party template installation
 * - Custom theme definitions
 * - Template versioning
 */

import { Router, Request, Response } from "express";
import { templateEngine } from "../services/TemplateEngine";
import type {
  TemplateFilter,
  TemplateValidationResult,
} from "../types/template";

const router = Router();

/**
 * GET /api/templates
 * Get all available templates, optionally filtered by business type
 *
 * Query Parameters:
 * - businessType: string (e.g., "restaurant", "cafe", "bar")
 *
 * Response: Template[]
 *
 * Example:
 * GET /api/templates
 * GET /api/templates?businessType=restaurant
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const { businessType } = req.query;

    // Build filter object from query parameters
    const filter: TemplateFilter = {};
    if (typeof businessType === "string") {
      filter.businessType = businessType.toLowerCase();
    }

    // Get templates from engine
    const templates = await templateEngine.getAll(filter);

    res.json({
      success: true,
      count: templates.length,
      data: templates,
    });
  } catch (error) {
    console.error("Error fetching templates:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch templates",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

/**
 * GET /api/templates/:id
 * Get a single template by ID
 *
 * Parameters:
 * - id: string (template ID, e.g., "modern", "minimalist")
 *
 * Response: Template | null
 * Status: 200 (found), 404 (not found)
 *
 * Example:
 * GET /api/templates/modern
 * GET /api/templates/minimalist
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Validate ID is provided
    if (!id || typeof id !== "string") {
      res.status(400).json({
        success: false,
        error: "Invalid template ID",
      });
      return;
    }

    // Get template from engine
    const template = await templateEngine.getById(id);

    if (!template) {
      res.status(404).json({
        success: false,
        error: "Template not found",
        data: null,
      });
      return;
    }

    res.json({
      success: true,
      data: template,
    });
  } catch (error) {
    console.error("Error fetching template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch template",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

/**
 * POST /api/templates/validate
 * Validate that a template configuration is valid
 *
 * Request Body:
 * {
 *   templateId: string (required, e.g., "modern")
 *   tokens: {
 *     primaryColor?: string (hex color, e.g., "#4F46E5")
 *     secondaryColor?: string (hex color, e.g., "#7C3AED")
 *     fontColor?: string (hex color, e.g., "#000000")
 *     fontFamily?: string ("sans-serif" | "serif" | "display" | "monospace")
 *     fontSize?: string ("small" | "medium" | "large")
 *   }
 * }
 *
 * Response: TemplateValidationResult
 * {
 *   valid: boolean
 *   errors?: string[]
 * }
 *
 * Status: 200 (validation complete, check .valid)
 * Status: 400 (malformed request)
 * Status: 500 (server error)
 *
 * Example:
 * POST /api/templates/validate
 * {
 *   "templateId": "modern",
 *   "tokens": {
 *     "primaryColor": "#4F46E5",
 *     "fontFamily": "sans-serif"
 *   }
 * }
 */
router.post("/validate", async (req: Request, res: Response) => {
  try {
    const { templateId, tokens } = req.body;

    // Validate request body
    if (!templateId || typeof templateId !== "string") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid templateId in request body",
      });
      return;
    }

    if (!tokens || typeof tokens !== "object") {
      res.status(400).json({
        success: false,
        error: "Missing or invalid tokens in request body",
      });
      return;
    }

    // Validate configuration
    const result: TemplateValidationResult =
      await templateEngine.validateConfig(templateId, tokens);

    res.json({
      success: result.valid,
      valid: result.valid,
      errors: result.errors || [],
    });
  } catch (error) {
    console.error("Error validating template:", error);
    res.status(500).json({
      success: false,
      error: "Failed to validate template",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

/**
 * GET /api/templates/business-types
 * Get all available business types supported by templates
 *
 * Response: { success: boolean; data: string[] }
 *
 * Example:
 * GET /api/templates/business-types
 * Response: ["cafe", "restaurant", "bar"]
 */
router.get("/business-types", async (req: Request, res: Response) => {
  try {
    const types = await templateEngine.getBusinessTypes();

    res.json({
      success: true,
      data: types,
    });
  } catch (error) {
    console.error("Error fetching business types:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch business types",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

export default router;
