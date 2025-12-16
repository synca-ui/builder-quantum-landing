import { Request, Response } from "express";
import {
  generateRestaurantSchema,
  validateSchema,
  schemaToJsonString,
  hasEnoughDataForSchema,
} from "../services/schemaGenerator";
import { RestaurantSchemaConfig } from "../../shared/types/schema";

/**
 * POST /api/schema/generate
 * Generate JSON-LD schema for a restaurant/business configuration
 *
 * Request body:
 * {
 *   businessName: string,
 *   description?: string,
 *   location?: string,
 *   address?: string,
 *   phone?: string,
 *   email?: string,
 *   website?: string,
 *   logo?: string,
 *   openingHours?: Record<string, { open: string; close: string }>,
 *   menuItems?: Array<{ name, description?, price?, category?, image? }>,
 *   latitude?: number,
 *   longitude?: number,
 *   reviews?: Array<{ rating, author, text, date }>,
 *   socialLinks?: { facebook?, instagram?, twitter?, linkedin? }
 * }
 */
export async function handleGenerateSchema(req: Request, res: Response) {
  try {
    const config = req.body as RestaurantSchemaConfig;

    // Validate required fields
    if (!config.businessName) {
      return res.status(400).json({
        success: false,
        error: "businessName is required",
      });
    }

    // Check if we have enough data
    if (!hasEnoughDataForSchema(config)) {
      return res.status(400).json({
        success: false,
        error:
          "Insufficient data for schema generation. businessName and openingHours are required.",
      });
    }

    // Generate schema
    const schema = generateRestaurantSchema(config);

    // Validate generated schema
    if (!validateSchema(schema)) {
      return res.status(500).json({
        success: false,
        error: "Generated schema validation failed",
      });
    }

    // Return successful response
    return res.json({
      success: true,
      schema,
      jsonString: schemaToJsonString(schema),
    });
  } catch (error) {
    console.error("Schema generation error:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Schema generation failed",
    });
  }
}

/**
 * POST /api/schema/validate
 * Validate an existing JSON-LD schema
 */
export async function handleValidateSchema(req: Request, res: Response) {
  try {
    const { schema } = req.body;

    if (!schema) {
      return res.status(400).json({
        success: false,
        error: "schema is required",
      });
    }

    const isValid = validateSchema(schema);

    return res.json({
      success: true,
      valid: isValid,
    });
  } catch (error) {
    console.error("Schema validation error:", error);
    return res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Schema validation failed",
    });
  }
}
