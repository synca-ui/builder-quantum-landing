// Client-side API functions for configuration management

import { handleFetchError } from "@/utils/debug";

export interface Configuration {
  id?: string;
  userId: string;
  businessName: string;
  businessType: string;
  location?: string;
  slogan?: string;
  uniqueDescription?: string;
  template: string;
  homepageDishImageVisibility?: string;
  primaryColor: string;
  secondaryColor: string;
  backgroundColor?: string;
  fontFamily: string;
  selectedPages: string[];
  customPages: string[];
  openingHours: Record<string, any>;
  menuItems: any[];
  reservationsEnabled: boolean;
  maxGuests: number;
  notificationMethod: string;
  contactMethods: string[];
  socialMedia: Record<string, string>;
  gallery: any[];
  onlineOrdering: boolean;
  onlineStore: boolean;
  teamArea: boolean;
  hasDomain: boolean;
  domainName?: string;
  selectedDomain?: string;
  createdAt?: string;
  updatedAt?: string;
  status?: "draft" | "published" | "archived";
  publishedUrl?: string;
  previewUrl?: string;
  paymentOptions?: string[];
  offers?: any[];
  offerBanner?: any;
  priceColor?: string;
  reservationButtonColor?: string;
  reservationButtonShape?: "pill" | "rounded" | "square";
  reservationButtonTextColor?: string;
  headerFontColor?: string;
  headerBackgroundColor?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Base API request function with improved error handling.
//
// Alle Routen in server/routes/configurations.ts antworten mit
// `{ success, data, message }`. Diese Hülle wird HIER ausgepackt, sodass
// `ApiResponse.data` die Nutzlast selbst ist. Früher kam die ganze Hülle als
// `data` an: /site/:subdomain zeigte „Your Business“, und der Konfigurator
// merkte sich nie die id – jedes Speichern legte eine neue Konfiguration an.
//
// `expectData`: Ein 2xx ohne `data` gilt als Fehlschlag, weil fast jede Route
// eine Nutzlast verspricht. Nur Routen ohne Nutzlast (DELETE) schalten das ab.
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
  { expectData = true }: { expectData?: boolean } = {},
): Promise<ApiResponse<T>> {
  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout

    const response = await fetch(`/api${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      signal: controller.signal,
      ...options,
    });

    clearTimeout(timeoutId);

    // Handle non-JSON responses
    let body;
    try {
      body = await response.json();
    } catch (jsonError) {
      console.warn("Failed to parse JSON response:", jsonError);
      return {
        success: false,
        error: response.ok
          ? "Invalid server response"
          : `HTTP error! status: ${response.status}`,
      };
    }

    if (!response.ok || body?.success === false) {
      return {
        success: false,
        error: body?.error || `HTTP error! status: ${response.status}`,
        message: body?.message,
      };
    }

    const isEnvelope =
      body !== null && typeof body === "object" && "success" in body;
    const payload = isEnvelope ? body.data : body;

    if (expectData && payload == null) {
      return {
        success: false,
        error: "Server response contained no data",
        message: body?.message,
      };
    }

    return {
      success: true,
      data: payload,
      message: isEnvelope ? body.message : undefined,
    };
  } catch (error) {
    console.warn("API request failed:", { endpoint, error });

    // Use debug utilities for better error handling
    if (error instanceof Error) {
      handleFetchError(error, `API request to ${endpoint}`);

      if (error.name === "AbortError") {
        return {
          success: false,
          error: "Request timeout - server may be unavailable",
        };
      }
      if (error.message.includes("Failed to fetch")) {
        return {
          success: false,
          error: "Unable to connect to server - API may be unavailable",
        };
      }
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: "Unknown network error",
    };
  }
}

// Configuration API functions with error handling
export const configurationApi = {
  // Save configuration (create or update)
  async save(
    config: Partial<Configuration>,
    token?: string,
  ): Promise<ApiResponse<Configuration>> {
    try {
      return await apiRequest<Configuration>(
        "/configurations",
        {
          method: "POST",
          body: JSON.stringify(config),
        },
        token,
      );
    } catch (error) {
      console.warn("Failed to save configuration:", error);
      return {
        success: false,
        error: "Failed to save configuration - server may be unavailable",
      };
    }
  },

  // Get all user configurations
  async getAll(token?: string): Promise<ApiResponse<Configuration[]>> {
    try {
      return await apiRequest<Configuration[]>("/configurations", {}, token);
    } catch (error) {
      console.warn("Failed to get configurations:", error);
      return {
        success: false,
        error: "Failed to load configurations - server may be unavailable",
        data: [], // Return empty array as fallback
      };
    }
  },

  // Get specific configuration
  async get(id: string, token?: string): Promise<ApiResponse<Configuration>> {
    try {
      return await apiRequest<Configuration>(
        `/configurations/${id}`,
        {},
        token,
      );
    } catch (error) {
      console.warn("Failed to get configuration:", error);
      return {
        success: false,
        error: "Failed to load configuration - server may be unavailable",
      };
    }
  },

  // Delete configuration
  async delete(id: string, token?: string): Promise<ApiResponse<void>> {
    try {
      return await apiRequest<void>(
        `/configurations/${id}`,
        {
          method: "DELETE",
        },
        token,
        // Die Route antwortet nur mit `{ success, message }`.
        { expectData: false },
      );
    } catch (error) {
      console.warn("Failed to delete configuration:", error);
      return {
        success: false,
        error: "Failed to delete configuration - server may be unavailable",
      };
    }
  },

  // Publish configuration (accepts optional config payload to avoid FS writes on server)
  async publish(
    id: string,
    config?: Partial<Configuration>,
    token?: string,
  ): Promise<ApiResponse<Configuration>> {
    try {
      return await apiRequest<Configuration>(
        `/configurations/${id}/publish`,
        {
          method: "POST",
          // Sende die config direkt als JSON-Body
          body: config ? JSON.stringify(config) : undefined,
        },
        token,
      );
    } catch (error) {
      console.warn("Failed to publish configuration:", error);
      return {
        success: false,
        error: "Failed to publish configuration - server may be unavailable",
      };
    }
  },

  // Get published site by subdomain
  async getPublishedSite(
    subdomain: string,
  ): Promise<ApiResponse<Configuration>> {
    try {
      return await apiRequest<Configuration>(`/sites/${subdomain}`);
    } catch (error) {
      console.warn("Failed to get published site:", error);
      return {
        success: false,
        error: "Failed to load published site - server may be unavailable",
      };
    }
  },
};
