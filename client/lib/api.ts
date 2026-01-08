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
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get user ID from localStorage or generate anonymous one
function getUserId(): string {
  let userId = localStorage.getItem("sync_user_id");
  if (!userId) {
    userId =
      "user_" + Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem("sync_user_id", userId);
  }
  return userId;
}

// Base API request function with improved error handling
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  token?: string,
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
    let data;
    try {
      data = await response.json();
    } catch (jsonError) {
      console.warn("Failed to parse JSON response:", jsonError);
      data = { error: "Invalid server response" };
    }

    if (!response.ok) {
      return {
        success: false,
        error: data.error || `HTTP error! status: ${response.status}`,
      };
    }

    return {
      success: true,
      data: data.configuration || data.configurations || data.site || data,
      message: data.message,
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
      return await apiRequest<Configuration>(`/configurations/${id}`, {}, token);
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
          body: config ? JSON.stringify({ config }) : undefined,
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

// Auto-save functionality
export class AutoSaver {
  private saveTimeout: NodeJS.Timeout | null = null;
  private lastSavedData: string = "";

  constructor(
    private saveFunction: (data: Partial<Configuration>) => Promise<void>,
    private debounceMs: number = 2000,
  ) {}

  // Queue a save operation
  save(data: Partial<Configuration>): void {
    const dataString = JSON.stringify(data);

    // Don't save if data hasn't changed
    if (dataString === this.lastSavedData) {
      return;
    }

    // Clear existing timeout
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
    }

    // Set new timeout
    this.saveTimeout = setTimeout(async () => {
      try {
        await this.saveFunction(data);
        this.lastSavedData = dataString;
        console.log("Configuration auto-saved");
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, this.debounceMs);
  }

  // Force immediate save
  async saveNow(data: Partial<Configuration>): Promise<void> {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }

    try {
      await this.saveFunction(data);
      this.lastSavedData = JSON.stringify(data);
      console.log("Configuration saved immediately");
    } catch (error) {
      console.error("Immediate save failed:", error);
      throw error;
    }
  }

  // Cancel pending save
  cancel(): void {
    if (this.saveTimeout) {
      clearTimeout(this.saveTimeout);
      this.saveTimeout = null;
    }
  }

  // Cleanup
  destroy(): void {
    this.cancel();
  }
}

// Session management
export const sessionApi = {
  // Get current user ID
  getUserId,

  // Check if user has saved configurations with fallback
  async hasSavedConfigurations(token?: string): Promise<boolean> {
    try {
      const result = await configurationApi.getAll(token);
      return result.success && result.data && result.data.length > 0;
    } catch (error) {
      console.warn(
        "Failed to check saved configurations, falling back to localStorage:",
        error,
      );
      // Fallback to localStorage check
      try {
        const savedData = localStorage.getItem("configuratorData");
        return savedData !== null;
      } catch (storageError) {
        console.warn("localStorage also unavailable:", storageError);
        return false;
      }
    }
  },

  // Get user's latest configuration with fallback
  async getLatestConfiguration(token?: string): Promise<Configuration | null> {
    try {
      const result = await configurationApi.getAll(token);
      if (result.success && result.data && result.data.length > 0) {
        // Sort by updatedAt and return the most recent
        const sorted = result.data.sort(
          (a, b) =>
            new Date(b.updatedAt || b.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.createdAt || 0).getTime(),
        );
        return sorted[0];
      }
    } catch (error) {
      console.warn(
        "Failed to get latest configuration from API, trying localStorage:",
        error,
      );
      // Fallback to localStorage
      try {
        const savedData = localStorage.getItem("configuratorData");
        const savedId = localStorage.getItem("currentConfigId");
        if (savedData) {
          const parsedData = JSON.parse(savedData);
          return {
            ...parsedData,
            id: savedId || undefined,
          } as Configuration;
        }
      } catch (storageError) {
        console.warn("localStorage fallback also failed:", storageError);
      }
    }
    return null;
  },

  // Check API health
  async checkApiHealth(): Promise<boolean> {
    try {
      const response = await fetch("/api/ping", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        // Short timeout for health check
        signal: AbortSignal.timeout(5000),
      });
      return response.ok;
    } catch (error) {
      console.warn("API health check failed:", error);
      return false;
    }
  },
};

// Error handling utilities
export function handleApiError(error: string): string {
  if (error.includes("Network error")) {
    return "Unable to connect to the server. Please check your internet connection.";
  }
  if (error.includes("404")) {
    return "The requested resource was not found.";
  }
  if (error.includes("500")) {
    return "A server error occurred. Please try again later.";
  }
  return error;
}
