/**
 * useTemplates Hook
 *
 * Custom React hook that encapsulates template fetching logic.
 * Handles server-side data fetching, loading states, and error handling.
 *
 * The server (TemplateEngine) is the Single Source of Truth for templates.
 * This hook simplifies integration in components.
 *
 * @param businessType Optional filter: fetch only templates supporting this business type
 * @returns { templates, isLoading, error, retry }
 *
 * @example
 * const { templates, isLoading, error, retry } = useTemplates("restaurant");
 */

import { useState, useEffect, useCallback } from "react";
import type { Template } from "@/components/template/TemplateRegistry";

interface UseTemplatesReturn {
  templates: Template[];
  isLoading: boolean;
  error: string | null;
  retry: () => Promise<void>;
}

export function useTemplates(businessType?: string): UseTemplatesReturn {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Fetch templates from server API
   * Called on mount and when businessType changes
   */
  const fetchTemplates = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Build API URL with optional query parameters
      const url = new URL("/api/templates", window.location.origin);
      if (businessType && businessType.trim()) {
        url.searchParams.append("businessType", businessType.toLowerCase());
      }

      // Fetch from server
      const response = await fetch(url.toString());

      if (!response.ok) {
        throw new Error(
          `Failed to fetch templates: ${response.status} ${response.statusText}`,
        );
      }

      // Parse and validate response
      const data = await response.json();

      if (!data.success || !Array.isArray(data.data)) {
        throw new Error("Invalid template data received from server");
      }

      setTemplates(data.data as Template[]);
      setError(null);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to fetch templates";
      setError(errorMessage);
      setTemplates([]);
      console.error("Template fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [businessType]);

  /**
   * Fetch templates on mount and when businessType changes
   */
  useEffect(() => {
    void fetchTemplates();
  }, [fetchTemplates]);

  /**
   * Manual retry function for components to call on error
   */
  const retry = useCallback(async () => {
    await fetchTemplates();
  }, [fetchTemplates]);

  return {
    templates,
    isLoading,
    error,
    retry,
  };
}
