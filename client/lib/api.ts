// Client-side API functions for configuration management

export interface Configuration {
  id?: string;
  userId: string;
  businessName: string;
  businessType: string;
  location?: string;
  slogan?: string;
  uniqueDescription?: string;
  template: string;
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
  status?: 'draft' | 'published' | 'archived';
  publishedUrl?: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Get user ID from localStorage or generate anonymous one
function getUserId(): string {
  let userId = localStorage.getItem('sync_user_id');
  if (!userId) {
    userId = 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
    localStorage.setItem('sync_user_id', userId);
  }
  return userId;
}

// Base API request function
async function apiRequest<T>(
  endpoint: string, 
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': getUserId(),
        ...options.headers,
      },
      ...options,
    });

    const data = await response.json();

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
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

// Configuration API functions
export const configurationApi = {
  // Save configuration (create or update)
  async save(config: Partial<Configuration>): Promise<ApiResponse<Configuration>> {
    return apiRequest<Configuration>('/configurations', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  },

  // Get all user configurations
  async getAll(): Promise<ApiResponse<Configuration[]>> {
    return apiRequest<Configuration[]>('/configurations');
  },

  // Get specific configuration
  async get(id: string): Promise<ApiResponse<Configuration>> {
    return apiRequest<Configuration>(`/configurations/${id}`);
  },

  // Delete configuration
  async delete(id: string): Promise<ApiResponse<void>> {
    return apiRequest<void>(`/configurations/${id}`, {
      method: 'DELETE',
    });
  },

  // Publish configuration
  async publish(id: string): Promise<ApiResponse<Configuration>> {
    return apiRequest<Configuration>(`/configurations/${id}/publish`, {
      method: 'POST',
    });
  },

  // Get published site by subdomain
  async getPublishedSite(subdomain: string): Promise<ApiResponse<Configuration>> {
    return apiRequest<Configuration>(`/sites/${subdomain}`);
  },
};

// Auto-save functionality
export class AutoSaver {
  private saveTimeout: NodeJS.Timeout | null = null;
  private lastSavedData: string = '';

  constructor(
    private saveFunction: (data: Partial<Configuration>) => Promise<void>,
    private debounceMs: number = 2000
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
        console.log('Configuration auto-saved');
      } catch (error) {
        console.error('Auto-save failed:', error);
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
      console.log('Configuration saved immediately');
    } catch (error) {
      console.error('Immediate save failed:', error);
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

  // Check if user has saved configurations
  async hasSavedConfigurations(): Promise<boolean> {
    const result = await configurationApi.getAll();
    return result.success && result.data && result.data.length > 0;
  },

  // Get user's latest configuration
  async getLatestConfiguration(): Promise<Configuration | null> {
    const result = await configurationApi.getAll();
    if (result.success && result.data && result.data.length > 0) {
      // Sort by updatedAt and return the most recent
      const sorted = result.data.sort((a, b) => 
        new Date(b.updatedAt || b.createdAt || 0).getTime() - 
        new Date(a.updatedAt || a.createdAt || 0).getTime()
      );
      return sorted[0];
    }
    return null;
  },
};

// Error handling utilities
export function handleApiError(error: string): string {
  if (error.includes('Network error')) {
    return 'Unable to connect to the server. Please check your internet connection.';
  }
  if (error.includes('404')) {
    return 'The requested resource was not found.';
  }
  if (error.includes('500')) {
    return 'A server error occurred. Please try again later.';
  }
  return error;
}
