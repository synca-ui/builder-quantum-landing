/**
 * Template API Routes
 * Exposes the TemplateEngine service via REST endpoints
 *
 * Routes:
 * - GET /api/templates - Get all templates (optionally filtered by business type)
 * - GET /api/templates/:id - Get a single template by ID
 * - GET /api/templates/:id/ratings - Get template ratings and reviews
 * - POST /api/templates/:id/rate - Submit a rating for a template
 * - POST /api/templates/validate - Validate template configuration
 *
 * Future: When Marketplace is ready, these endpoints will support:
 * - Third-party template installation
 * - Custom theme definitions
 * - Template versioning
 */

import { Router, Request, Response } from "express";
import { templateEngine } from "../services/TemplateEngine";
import { requireAuth } from "../middleware/auth";
import prisma from "../db/prisma";
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

/**
 * GET /api/templates/:id/ratings
 * Get ratings and reviews for a template
 *
 * Parameters:
 * - id: string (template ID)
 *
 * Response: { success: boolean; avgRating: number; count: number; ratings: TemplateRating[] }
 *
 * Example:
 * GET /api/templates/modern/ratings
 */
router.get("/:id/ratings", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const template = await prisma.template.findUnique({
      where: { id },
      include: {
        ratings: {
          select: {
            id: true,
            rating: true,
            comment: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
      },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    const avgRating =
      template.ratings.length > 0
        ? template.ratings.reduce((sum, r) => sum + r.rating, 0) /
          template.ratings.length
        : 0;

    res.json({
      success: true,
      data: {
        templateId: id,
        avgRating: Math.round(avgRating * 10) / 10,
        totalRatings: template.ratings.length,
        ratings: template.ratings,
      },
    });
  } catch (error) {
    console.error("Error fetching template ratings:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch ratings",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

/**
 * POST /api/templates/:id/rate
 * Submit a rating for a template (requires auth)
 *
 * Parameters:
 * - id: string (template ID)
 *
 * Request Body:
 * {
 *   rating: number (1-5),
 *   comment?: string (optional review text)
 * }
 *
 * Response: { success: boolean; data: TemplateRating }
 *
 * Example:
 * POST /api/templates/modern/rate
 * { "rating": 5, "comment": "Great template!" }
 */
router.post("/:id/rate", requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { rating, comment } = req.body;

    // Validate rating
    if (!rating || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      return res.status(400).json({
        success: false,
        error: "Invalid rating",
        message: "Rating must be an integer between 1 and 5",
      });
    }

    // Verify template exists
    const template = await prisma.template.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: "Template not found",
      });
    }

    // Create or update rating
    const templateRating = await prisma.templateRating.upsert({
      where: {
        templateId_userId: {
          templateId: id,
          userId,
        },
      },
      update: {
        rating,
        comment: comment || null,
      },
      create: {
        templateId: id,
        userId,
        rating,
        comment: comment || null,
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
          },
        },
      },
    });

    // Update template's avgRating
    const allRatings = await prisma.templateRating.findMany({
      where: { templateId: id },
      select: { rating: true },
    });

    const avgRating =
      allRatings.reduce((sum, r) => sum + r.rating, 0) / allRatings.length;

    await prisma.template.update({
      where: { id },
      data: { avgRating: Math.round(avgRating * 10) / 10 },
    });

    res.json({
      success: true,
      message: "Rating submitted successfully",
      data: templateRating,
    });
  } catch (error) {
    console.error("Error submitting template rating:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit rating",
      message:
        error instanceof Error ? error.message : "Unknown error occurred",
    });
  }
});

export default router;
