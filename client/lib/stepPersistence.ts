/**
 * Step-by-step persistence system for the configurator
 * Saves every action/change to localStorage and restores complete state
 */

export interface StepData {
  stepNumber: number;
  stepId: string;
  timestamp: number;
  action: 'step_change' | 'field_update' | 'template_select' | 'publish' | 'save';
  data: any;
  formData: any; // Complete form state at this step
}

export interface PersistenceState {
  steps: StepData[];
  currentStep: number;
  formData: any;
  lastUpdated: number;
  sessionId: string;
  configId?: string;
  publishedUrl?: string;
}

const STORAGE_KEY = 'configurator_persistence';
const SESSION_STORAGE_KEY = 'configurator_session';

/**
 * Step Persistence Manager
 */
export class StepPersistence {
  private sessionId: string;
  private state: PersistenceState;
  private enabled: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    try {
      const raw = localStorage.getItem('configurator_persist_enabled');
      this.enabled = raw === null ? true : raw === 'true';
    } catch { this.enabled = true; }
    this.state = this.loadState() || this.createInitialState();
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create initial state
   */
  private createInitialState(): PersistenceState {
    return {
      steps: [],
      currentStep: -1,
      formData: this.getDefaultFormData(),
      lastUpdated: Date.now(),
      sessionId: this.sessionId,
    };
  }

  /**
   * Default form data structure
   */
  private getDefaultFormData() {
    return {
      // Template Selection
      template: "",

      // Business Information
      businessName: "",
      businessType: "",
      location: "",
      logo: null,
      slogan: "",
      uniqueDescription: "",

      // Design & Style
      primaryColor: "#2563EB",
      secondaryColor: "#7C3AED",
      fontFamily: "sans-serif",
      fontColor: "#000000",
      fontSize: "medium",
      backgroundType: "color",
      backgroundColor: "#FFFFFF",
      backgroundImage: null,
      selectedPages: ["home"],
      customPages: [],
      openingHoursTextColor: "#0F172A",

      // Global preferences
      language: "en",
      themeMode: "light",

      // Homepage options
      showHomeHero: true,

      // Content & Features
      openingHours: {},
      menuItems: [],
      menuPdf: null,
      reservationsEnabled: false,
      reservationButtonColor: "#2563EB",
      reservationButtonTextColor: "#FFFFFF",
      reservationButtonShape: "rounded",
      timeSlots: [],
      maxGuests: 10,
      notificationMethod: "email",
      contactMethods: [],
      socialMedia: {},
      instagramSync: false,

      // Media & Advanced
      gallery: [],
      onlineOrdering: false,
      onlineStore: false,
      teamArea: false,

      // Online ordering configuration
      posProvider: "none",
      paymentMethods: {
        applePay: false,
        googlePay: false,
        card: true,
        cash: true,
      },
      orderOptions: { delivery: true, pickup: true, table: false },
      deliveryAddressRequired: true,

      // Online store configuration
      categories: ["Drinks", "Food"],
      showStockLevels: false,
      discountsEnabled: false,
      bundlesEnabled: false,
      seasonalOffersEnabled: false,

      // Team
      teamMembers: [],

      // Loyalty / Coupons / Offers
      loyaltyEnabled: false,
      loyaltyConfig: {
        stampsForReward: 10,
        rewardType: "discount",
        expiryDate: "",
      },
      couponsEnabled: false,
      coupons: [],
      offersEnabled: false,
      offers: [],

      cartItems: [],

      // Domain & Publishing
      hasDomain: false,
      domainName: "",
      selectedDomain: "",

      // SEO Optimization
      seoEnabled: false,
      metaTitle: "",
      metaDescription: "",
      keywords: "",
      socialMediaImage: null,
      googleAnalyticsId: "",
      seoApiOptimization: false,
      seoApiCost: 29.99,

      // UI State
      showOptionalFields: false,
    };
  }

  /**
   * Load state from localStorage
   */
  private loadState(): PersistenceState | null {
    if (!this.enabled) return null;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Validate the structure
        if (parsed.steps && Array.isArray(parsed.steps)) {
          return {
            ...parsed,
            sessionId: this.sessionId, // Always use new session ID
          };
        }
      }
    } catch (error) {
      console.warn('Failed to load persistence state:', error);
      // Try to clear corrupted data
      try {
        localStorage.removeItem(STORAGE_KEY);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch (clearError) {
        console.warn('Failed to clear corrupted persistence data:', clearError);
      }
    }
    return null;
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    if (!this.enabled) return;
    try {
      this.state.lastUpdated = Date.now();
      const serialized = JSON.stringify(this.state);

      // Try localStorage first
      try {
        localStorage.setItem(STORAGE_KEY, serialized);
      } catch (localError) {
        console.warn('localStorage failed, trying sessionStorage:', localError);
        // Fallback to sessionStorage if localStorage fails
        sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
      }

      // Also save to sessionStorage as backup if localStorage worked
      try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
      } catch (sessionError) {
        console.warn('sessionStorage backup failed:', sessionError);
      }
    } catch (error) {
      console.error('Failed to save persistence state:', error);
    }
  }

  /**
   * Record a new step
   */
  saveStep(stepNumber: number, stepId: string, action: StepData['action'], data: any, formData: any): void {
    try {
      const stepData: StepData = {
        stepNumber,
        stepId,
        timestamp: Date.now(),
        action,
        data: data || {},
        formData: formData ? { ...formData } : {}, // Safe deep copy
      };

      this.state.steps.push(stepData);
      this.state.currentStep = stepNumber;
      this.state.formData = formData ? { ...formData } : {};

      // Keep only last 50 steps to prevent storage bloat
      if (this.state.steps.length > 50) {
        this.state.steps = this.state.steps.slice(-50);
      }

      this.saveState();
    } catch (error) {
      console.error('Failed to save step:', error);
    }
  }

  /**
   * Update form data
   */
  updateFormData(field: string, value: any, formData: any): void {
    try {
      this.state.formData = formData ? { ...formData } : {};

      // Record field update
      this.saveStep(-1, 'field_update', 'field_update', { field, value }, formData);
    } catch (error) {
      console.error('Failed to update form data:', error);
    }
  }

  /**
   * Set config ID
   */
  setConfigId(configId: string): void {
    this.state.configId = configId;
    this.saveState();
  }

  /**
   * Set published URL
   */
  setPublishedUrl(url: string): void {
    this.state.publishedUrl = url;
    this.saveState();
  }

  /**
   * Get current state
   */
  getState(): PersistenceState {
    return { ...this.state };
  }

  /**
   * Get form data
   */
  getFormData(): any {
    return { ...this.state.formData };
  }

  /**
   * Get current step
   */
  getCurrentStep(): number {
    return this.state.currentStep;
  }

  /**
   * Get config ID
   */
  getConfigId(): string | undefined {
    return this.state.configId;
  }

  /**
   * Get published URL
   */
  getPublishedUrl(): string | undefined {
    return this.state.publishedUrl;
  }

  /**
   * Check if there are saved steps
   */
  hasSavedSteps(): boolean {
    return this.state.steps.length > 0;
  }

  /**
   * Get step history
   */
  getStepHistory(): StepData[] {
    return [...this.state.steps];
  }

  /**
   * Restore to a specific step
   */
  restoreToStep(stepIndex: number): any {
    if (stepIndex >= 0 && stepIndex < this.state.steps.length) {
      const targetStep = this.state.steps[stepIndex];
      this.state.currentStep = targetStep.stepNumber;
      this.state.formData = { ...targetStep.formData };
      this.saveState();
      return this.state.formData;
    }
    return null;
  }

  /**
   * Clear all data
   */
  clearAll(): void {
    this.state = this.createInitialState();
    this.saveState();
    // Also clear from both storages
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }

  /**
   * Export data for debugging
   */
  exportData(): string {
    return JSON.stringify(this.state, null, 2);
  }

  /**
   * Import data from export
   */
  importData(jsonData: string): boolean {
    try {
      const imported = JSON.parse(jsonData);
      if (imported.steps && Array.isArray(imported.steps)) {
        this.state = {
          ...imported,
          sessionId: this.sessionId,
          lastUpdated: Date.now(),
        };
        this.saveState();
        return true;
      }
    } catch (error) {
      console.error('Failed to import data:', error);
    }
    return false;
  }

  /**
   * Get summary for debugging
   */
  getSummary(): string {
    if (!this.hasSavedSteps()) {
      return "nothing was loaded: Your Business © 2025 Your Business";
    }

    const businessName = this.state.formData.businessName || "Your Business";
    const stepCount = this.state.steps.length;
    const lastAction = this.state.steps[this.state.steps.length - 1]?.action || "unknown";
    
    return `${businessName} - ${stepCount} steps saved, last action: ${lastAction}`;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    try { localStorage.setItem('configurator_persist_enabled', String(enabled)); } catch {}
    if (!enabled) {
      try { localStorage.removeItem(STORAGE_KEY); sessionStorage.removeItem(SESSION_STORAGE_KEY); } catch {}
    } else {
      this.saveState();
    }
  }

  getEnabled(): boolean { return this.enabled; }
}

// Global instance
export const stepPersistence = new StepPersistence();

// Helper functions for React components
export function usePersistence() {
  return {
    saveStep: stepPersistence.saveStep.bind(stepPersistence),
    updateFormData: stepPersistence.updateFormData.bind(stepPersistence),
    setConfigId: stepPersistence.setConfigId.bind(stepPersistence),
    setPublishedUrl: stepPersistence.setPublishedUrl.bind(stepPersistence),
    getState: stepPersistence.getState.bind(stepPersistence),
    getFormData: stepPersistence.getFormData.bind(stepPersistence),
    getCurrentStep: stepPersistence.getCurrentStep.bind(stepPersistence),
    getConfigId: stepPersistence.getConfigId.bind(stepPersistence),
    getPublishedUrl: stepPersistence.getPublishedUrl.bind(stepPersistence),
    hasSavedSteps: stepPersistence.hasSavedSteps.bind(stepPersistence),
    getStepHistory: stepPersistence.getStepHistory.bind(stepPersistence),
    restoreToStep: stepPersistence.restoreToStep.bind(stepPersistence),
    clearAll: stepPersistence.clearAll.bind(stepPersistence),
    getSummary: stepPersistence.getSummary.bind(stepPersistence),
  };
}
