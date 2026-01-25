/**
 * Deployment Helper
 * Handles deployment to Maitr infrastructure with progress tracking
 */

import axios from "axios";

export type DeploymentStage =
  | "validating"
  | "checking_subdomain"
  | "persisting"
  | "routing"
  | "complete"
  | "error";

export interface DeploymentResult {
  success: boolean;
  publishedUrl?: string;
  previewUrl?: string;
  siteId?: string;
  webAppId?: string;
  configId?: string;
  publishedAt?: string;
  elapsed?: number;
  error?: string;
  errors?: string[];
  warnings?: string[];
  stage: DeploymentStage;
  provider: "netlify" | "vercel" | "internal";
}

export interface DeploymentConfig {
  subdomain: string;
  config: any;
  configId?: string;
  token?: string;
  siteId?: string;
  onProgress?: (stage: DeploymentStage, message: string) => void;
}

// Stage messages in German
const STAGE_MESSAGES: Record<DeploymentStage, string> = {
  validating: "Daten werden validiert...",
  checking_subdomain: "Subdomain wird überprüft...",
  persisting: "Konfiguration wird gespeichert...",
  routing: "Subdomain wird geroutet...",
  complete: "Website ist live!",
  error: "Fehler aufgetreten",
};

/**
 * Simulate stage progression for smoother UX
 * Backend is fast but we want visual feedback
 */
async function simulateProgress(
  onProgress: ((stage: DeploymentStage, message: string) => void) | undefined,
  stages: DeploymentStage[],
  delayMs: number = 400,
): Promise<void> {
  if (!onProgress) return;

  for (const stage of stages) {
    onProgress(stage, STAGE_MESSAGES[stage]);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

/**
 * Publish to internal Maitr infrastructure
 * Uses POST /api/apps/publish
 */
async function publishInternal(
  config: DeploymentConfig,
): Promise<DeploymentResult> {
  const { onProgress } = config;

  try {
    // Start progress simulation
    const progressPromise = simulateProgress(
      onProgress,
      ["validating", "checking_subdomain", "persisting"],
      500,
    );

    // Make the actual API call
    const res = await axios.post(
      "/api/apps/publish",
      {
        subdomain: config.subdomain,
        config: config.config,
        configId: config.configId,
      },
      {
        headers: {
          "Content-Type": "application/json",
          ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
        },
        timeout: 30000, // 30 second timeout
      },
    );

    // Wait for progress simulation to complete
    await progressPromise;

    // Show routing stage
    if (onProgress) {
      onProgress("routing", STAGE_MESSAGES.routing);
      await new Promise((resolve) => setTimeout(resolve, 600));
    }

    const data = res.data;

    if (data.success) {
      // Success!
      if (onProgress) {
        onProgress("complete", STAGE_MESSAGES.complete);
      }

      return {
        success: true,
        publishedUrl: data.publishedUrl,
        previewUrl: data.previewUrl,
        webAppId: data.webAppId,
        configId: data.configId,
        publishedAt: data.publishedAt,
        elapsed: data.elapsed,
        warnings: data.warnings,
        stage: "complete",
        provider: "internal",
      };
    } else {
      // API returned error
      if (onProgress) {
        onProgress("error", data.error || STAGE_MESSAGES.error);
      }

      return {
        success: false,
        error: data.error || "Unbekannter Fehler",
        errors: data.errors,
        warnings: data.warnings,
        stage: data.stage || "error",
        provider: "internal",
      };
    }
  } catch (error) {
    console.error("[Deployment] Internal publish failed:", error);

    if (onProgress) {
      onProgress("error", STAGE_MESSAGES.error);
    }

    // Handle Axios errors
    if (axios.isAxiosError(error)) {
      const responseData = error.response?.data;
      return {
        success: false,
        error: responseData?.error || error.message || "Netzwerkfehler",
        errors: responseData?.errors,
        stage: responseData?.stage || "error",
        provider: "internal",
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Unbekannter Fehler",
      stage: "error",
      provider: "internal",
    };
  }
}

/**
 * Main deployment function
 * Currently uses internal publishing, future support for Netlify/Vercel MCP
 */
export async function deploy(
  config: DeploymentConfig,
): Promise<DeploymentResult> {
  console.log(
    `[Deployment] Starting publish for subdomain: ${config.subdomain}`,
  );

  // Use internal Maitr publishing
  // When Netlify/Vercel MCP is connected, this would check availability and use those
  return publishInternal(config);
}

/**
 * Get deployment status (for future polling support)
 */
export async function getDeploymentStatus(webAppId: string): Promise<{
  status: "pending" | "building" | "ready" | "error";
  url?: string;
}> {
  try {
    const res = await axios.get(`/api/apps/${webAppId}`);
    return {
      status: res.data?.publishedAt ? "ready" : "pending",
      url: res.data?.publishedUrl,
    };
  } catch {
    return { status: "ready" }; // Assume ready if we can't check
  }
}

/**
 * Pre-validate configuration before publish
 */
export function validateConfig(config: any): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!config?.business?.name || config.business.name.length < 2) {
    errors.push("Geschäftsname ist erforderlich");
  }
  if (!config?.business?.type) {
    errors.push("Geschäftstyp ist erforderlich");
  }
  if (!config?.design?.template) {
    errors.push("Template muss ausgewählt werden");
  }

  // Warnings
  if (!config?.contact?.email && !config?.contact?.phone) {
    warnings.push("Keine Kontaktdaten angegeben");
  }
  if (!config?.content?.menuItems?.length) {
    warnings.push("Keine Produkte/Speisekarte");
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
