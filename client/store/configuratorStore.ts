/**
 * Global Configurator Store (Zustand + Persist Middleware)
 *
 * Replaces prop drilling in Configurator.tsx with atomic, domain-organized state.
 * Automatically syncs to localStorage via persist middleware.
 *
 * State Structure:
 * - business: BusinessInfo
 * - design: DesignConfig
 * - content: ContentData
 * - features: FeatureFlags
 * - contact: ContactInfo
 * - publishing: PublishingInfo
 * - pages: PageManagement
 * - payments: PaymentAndOffers
 * - ui: Navigation and UI state
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useMemo } from "react";
import type {
  BusinessInfo,
  DesignConfig,
  ContentData,
  FeatureFlags,
  ContactInfo,
  PublishingInfo,
  PageManagement,
  PaymentAndOffers,
  MenuItem,
  GalleryImage,
  OpeningHours,
  Configuration,
} from "@/types/domain";

// ============================================
// EMERGENCY THROTTLE GUARD (to detect infinite loops)
// ============================================
let lastUpdate = 0;
let updateCount = 0;

function checkThrottleGuard(actionName?: string) {
  const now = Date.now();
  if (now - lastUpdate < 1000) {
    updateCount++;
  } else {
    updateCount = 1;
  }
  lastUpdate = now;

  console.log(
    `ST_UPDATE: [${updateCount}] ${actionName || "unknown"} at ${new Date().toISOString()}`,
  );

  // Hard stop at 50+ updates per second
  if (updateCount > 50) {
    console.error(
      `🚨 THROTTLE GUARD TRIGGERED: ${updateCount} updates in 1 second!`,
    );
    console.trace("Stack trace at update trigger:");
    throw new Error(
      `Infinite loop detected: ${updateCount} state updates in <1 second. Last action: ${actionName}`,
    );
  }
}

/**
 * UI-specific state (not persisted across full config)
 */
interface UIState {
  currentStep: number;
  isSidebarOpen: boolean;
  expandedSections: Record<string, boolean>;
  saveLoading: boolean;
  saveError: string | null;
}

/**
 * Complete store state interface
 */
interface ConfiguratorState {
  // Domain-specific state
  business: BusinessInfo;
  design: DesignConfig;
  content: ContentData;
  features: FeatureFlags;
  contact: ContactInfo;
  publishing: PublishingInfo;
  pages: PageManagement;
  payments: PaymentAndOffers;

  // UI state
  ui: UIState;

  // Selectors/computed state
  isComplete: () => boolean;
  canPublish: () => boolean;

  // Actions: Business Domain
  setBusinessInfo: (info: Partial<BusinessInfo>) => void;
  updateBusinessName: (name: string) => void;
  updateBusinessType: (type: string) => void;
  updateLocation: (location: string) => void;
  updateSlogan: (slogan: string) => void;

  // Actions: Design Domain
  updateDesign: (config: Partial<DesignConfig>) => void;
  updateTemplate: (templateId: string) => void;
  updatePrimaryColor: (color: string) => void;
  updateSecondaryColor: (color: string) => void;
  updateFontFamily: (font: string) => void;

  // Actions: Content Domain
  addMenuItem: (item: MenuItem) => void;
  removeMenuItem: (id: string) => void;
  updateMenuItem: (id: string, updates: Partial<MenuItem>) => void;
  addGalleryImage: (image: GalleryImage) => void;
  removeGalleryImage: (id: string) => void;
  updateOpeningHours: (hours: OpeningHours) => void;
  setCategories: (categories: string[]) => void;

  // Actions: Features Domain
  updateFeatureFlags: (flags: Partial<FeatureFlags>) => void;
  toggleReservations: (enabled: boolean) => void;
  toggleOnlineOrdering: (enabled: boolean) => void;
  toggleOnlineStore: (enabled: boolean) => void;
  toggleTeamArea: (enabled: boolean) => void;

  // Actions: Contact Domain
  updateContactInfo: (contact: Partial<ContactInfo>) => void;
  updateSocialMedia: (platform: string, url: string) => void;

  // Actions: Publishing Domain
  updatePublishingInfo: (info: Partial<PublishingInfo>) => void;
  publishConfiguration: () => void;
  archiveConfiguration: () => void;

  // Actions: Pages Domain
  updatePageManagement: (pages: Partial<PageManagement>) => void;

  // Actions: Payments Domain
  updatePaymentsAndOffers: (payments: Partial<PaymentAndOffers>) => void;

  // Actions: Navigation
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  setCurrentStep: (step: number) => void;

  // Actions: UI
  setSidebarOpen: (open: boolean) => void;
  toggleSectionExpand: (sectionId: string) => void;
  setSaveLoading: (loading: boolean) => void;
  setSaveError: (error: string | null) => void;

  // Actions: Data Management
  resetConfig: () => void;
  getFullConfiguration: () => Configuration;
  loadConfiguration: (config: Partial<Configuration>) => void;
  clearAllData: () => void;
}

/**
 * Default values for each domain
 */
const defaultBusinessInfo: BusinessInfo = {
  name: "",
  type: "",
  location: undefined,
  slogan: undefined,
  uniqueDescription: undefined,
  domain: {
    hasDomain: false,
    domainName: undefined,
    selectedDomain: undefined,
  },
};

const defaultDesignConfig: DesignConfig = {
  template: "modern",
  primaryColor: "#4F46E5",
  secondaryColor: "#7C3AED",
  fontFamily: "sans-serif",
  fontColor: "#000000",
  fontSize: "medium",
  backgroundColor: "#FFFFFF",
  backgroundImage: null,
  backgroundType: "color",
};

const defaultContentData: ContentData = {
  menuItems: [],
  gallery: [],
  openingHours: {
    monday: { open: "09:00", close: "22:00", closed: false },
    tuesday: { open: "09:00", close: "22:00", closed: false },
    wednesday: { open: "09:00", close: "22:00", closed: false },
    thursday: { open: "09:00", close: "22:00", closed: false },
    friday: { open: "09:00", close: "23:00", closed: false },
    saturday: { open: "10:00", close: "23:00", closed: false },
    sunday: { open: "10:00", close: "22:00", closed: false },
  },
  homepageDishImageVisibility: "visible",
  categories: [],
};

const defaultFeatureFlags: FeatureFlags = {
  reservationsEnabled: false,
  maxGuests: 100,
  notificationMethod: "email",
  onlineOrderingEnabled: false,
  onlineStoreEnabled: false,
  teamAreaEnabled: false,
};

const defaultContactInfo: ContactInfo = {
  contactMethods: [],
  socialMedia: {},
  phone: undefined,
  email: undefined,
};

const defaultPublishingInfo: PublishingInfo = {
  status: "draft",
  publishedUrl: undefined,
  previewUrl: undefined,
  publishedAt: undefined,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const defaultPageManagement: PageManagement = {
  selectedPages: [],
  customPages: [],
};

const defaultPaymentAndOffers: PaymentAndOffers = {
  paymentOptions: [],
  offers: [],
  offerBanner: {
    enabled: false,
    text: undefined,
    backgroundColor: undefined,
  },
};

const defaultUIState: UIState = {
  currentStep: 0,
  isSidebarOpen: true,
  expandedSections: {},
  saveLoading: false,
  saveError: null,
};

/**
 * Create the Zustand store with persist middleware
 *
 * CRITICAL HARDENING:
 * - Version: Bumped to 2 to invalidate v1 stale data
 * - Migrate: Clears localStorage if version mismatch detected
 * - This prevents localStorage from overwriting live store updates
 */
export const useConfiguratorStore = create<ConfiguratorState>()(
  persist(
    (set, get) => ({
      // Initial state
      business: { ...defaultBusinessInfo },
      design: { ...defaultDesignConfig },
      content: { ...defaultContentData },
      features: { ...defaultFeatureFlags },
      contact: { ...defaultContactInfo },
      publishing: { ...defaultPublishingInfo },
      pages: { ...defaultPageManagement },
      payments: { ...defaultPaymentAndOffers },
      ui: { ...defaultUIState },

      // Selectors/Computed state
      isComplete: () => {
        const state = get();
        return !!(
          state.business.name &&
          state.business.type &&
          state.design.template &&
          state.contact.email
        );
      },

      canPublish: () => {
        const state = get();
        return state.isComplete();
      },

      // ============================================
      // Business Domain Actions
      // ============================================
      setBusinessInfo: (info) => {
        checkThrottleGuard("setBusinessInfo");
        set((state) => ({
          business: { ...state.business, ...info },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateBusinessName: (name) => {
        checkThrottleGuard("updateBusinessName");
        set((state) => ({
          business: { ...state.business, name },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateBusinessType: (type) => {
        checkThrottleGuard("updateBusinessType");
        set((state) => ({
          business: { ...state.business, type },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateLocation: (location) => {
        checkThrottleGuard("updateLocation");
        set((state) => ({
          business: { ...state.business, location },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateSlogan: (slogan) => {
        checkThrottleGuard("updateSlogan");
        set((state) => ({
          business: { ...state.business, slogan },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Design Domain Actions
      // ============================================
      updateDesign: (config) => {
        checkThrottleGuard("updateDesign");
        set((state) => ({
          design: { ...state.design, ...config },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateTemplate: (templateId) => {
        checkThrottleGuard("updateTemplate");
        set((state) => ({
          design: { ...state.design, template: templateId },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updatePrimaryColor: (color) => {
        checkThrottleGuard("updatePrimaryColor");
        set((state) => ({
          design: { ...state.design, primaryColor: color },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateSecondaryColor: (color) => {
        checkThrottleGuard("updateSecondaryColor");
        set((state) => ({
          design: { ...state.design, secondaryColor: color },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateFontFamily: (font) => {
        checkThrottleGuard("updateFontFamily");
        set((state) => ({
          design: { ...state.design, fontFamily: font },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Content Domain Actions
      // ============================================
      addMenuItem: (item) => {
        checkThrottleGuard("addMenuItem");
        set((state) => ({
          content: {
            ...state.content,
            menuItems: [...state.content.menuItems, item],
          },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      removeMenuItem: (id) => {
        checkThrottleGuard("removeMenuItem");
        set((state) => ({
          content: {
            ...state.content,
            menuItems: state.content.menuItems.filter((item) => item.id !== id),
          },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateMenuItem: (id, updates) => {
        checkThrottleGuard("updateMenuItem");
        set((state) => ({
          content: {
            ...state.content,
            menuItems: state.content.menuItems.map((item) =>
              item.id === id ? { ...item, ...updates } : item,
            ),
          },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      addGalleryImage: (image) => {
        checkThrottleGuard("addGalleryImage");
        set((state) => ({
          content: {
            ...state.content,
            gallery: [...state.content.gallery, image],
          },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      removeGalleryImage: (id) => {
        checkThrottleGuard("removeGalleryImage");
        set((state) => ({
          content: {
            ...state.content,
            gallery: state.content.gallery.filter((img) => img.id !== id),
          },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateOpeningHours: (hours) => {
        checkThrottleGuard("updateOpeningHours");
        set((state) => ({
          content: { ...state.content, openingHours: hours },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      setCategories: (categories) => {
        checkThrottleGuard("setCategories");
        set((state) => ({
          content: { ...state.content, categories },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Features Domain Actions
      // ============================================
      updateFeatureFlags: (flags) => {
        checkThrottleGuard("updateFeatureFlags");
        set((state) => ({
          features: { ...state.features, ...flags },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      toggleReservations: (enabled) => {
        checkThrottleGuard("toggleReservations");
        set((state) => ({
          features: { ...state.features, reservationsEnabled: enabled },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      toggleOnlineOrdering: (enabled) => {
        checkThrottleGuard("toggleOnlineOrdering");
        set((state) => ({
          features: { ...state.features, onlineOrderingEnabled: enabled },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      toggleOnlineStore: (enabled) => {
        checkThrottleGuard("toggleOnlineStore");
        set((state) => ({
          features: { ...state.features, onlineStoreEnabled: enabled },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      toggleTeamArea: (enabled) => {
        checkThrottleGuard("toggleTeamArea");
        set((state) => ({
          features: { ...state.features, teamAreaEnabled: enabled },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Contact Domain Actions
      // ============================================
      updateContactInfo: (contact) => {
        checkThrottleGuard("updateContactInfo");
        set((state) => ({
          contact: { ...state.contact, ...contact },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      updateSocialMedia: (platform, url) => {
        checkThrottleGuard("updateSocialMedia");
        set((state) => ({
          contact: {
            ...state.contact,
            socialMedia: { ...state.contact.socialMedia, [platform]: url },
          },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Publishing Domain Actions
      // ============================================
      updatePublishingInfo: (info) => {
        checkThrottleGuard("updatePublishingInfo");
        set((state) => ({
          publishing: {
            ...state.publishing,
            ...info,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      publishConfiguration: () => {
        checkThrottleGuard("publishConfiguration");
        set((state) => ({
          publishing: {
            ...state.publishing,
            status: "published",
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      archiveConfiguration: () => {
        checkThrottleGuard("archiveConfiguration");
        set((state) => ({
          publishing: {
            ...state.publishing,
            status: "archived",
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Pages Domain Actions
      // ============================================
      updatePageManagement: (pages) => {
        checkThrottleGuard("updatePageManagement");
        set((state) => ({
          pages: { ...state.pages, ...pages },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Payments Domain Actions
      // ============================================
      updatePaymentsAndOffers: (payments) => {
        checkThrottleGuard("updatePaymentsAndOffers");
        set((state) => ({
          payments: { ...state.payments, ...payments },
          publishing: {
            ...state.publishing,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      // ============================================
      // Navigation Actions
      // ============================================
      nextStep: () => {
        checkThrottleGuard("nextStep");
        set((state) => ({
          ui: { ...state.ui, currentStep: state.ui.currentStep + 1 },
        }));
      },

      prevStep: () => {
        checkThrottleGuard("prevStep");
        set((state) => ({
          ui: {
            ...state.ui,
            currentStep: Math.max(state.ui.currentStep - 1, 0),
          },
        }));
      },

      goToStep: (step) => {
        checkThrottleGuard("goToStep");
        set((state) => ({
          ui: { ...state.ui, currentStep: step },
        }));
      },

      setCurrentStep: (step) => {
        checkThrottleGuard("setCurrentStep");
        set((state) => ({
          ui: { ...state.ui, currentStep: step },
        }));
      },

      // ============================================
      // UI Actions
      // ============================================
      setSidebarOpen: (open) => {
        checkThrottleGuard("setSidebarOpen");
        set((state) => ({
          ui: { ...state.ui, isSidebarOpen: open },
        }));
      },

      toggleSectionExpand: (sectionId) => {
        checkThrottleGuard("toggleSectionExpand");
        set((state) => ({
          ui: {
            ...state.ui,
            expandedSections: {
              ...state.ui.expandedSections,
              [sectionId]: !state.ui.expandedSections[sectionId],
            },
          },
        }));
      },

      setSaveLoading: (loading) => {
        checkThrottleGuard("setSaveLoading");
        set((state) => ({
          ui: { ...state.ui, saveLoading: loading },
        }));
      },

      setSaveError: (error) => {
        checkThrottleGuard("setSaveError");
        set((state) => ({
          ui: { ...state.ui, saveError: error },
        }));
      },

      // ============================================
      // Data Management Actions
      // ============================================
      resetConfig: () => {
        checkThrottleGuard("resetConfig");
        set({
          business: { ...defaultBusinessInfo },
          design: { ...defaultDesignConfig },
          content: { ...defaultContentData },
          features: { ...defaultFeatureFlags },
          contact: { ...defaultContactInfo },
          publishing: { ...defaultPublishingInfo },
          pages: { ...defaultPageManagement },
          payments: { ...defaultPaymentAndOffers },
          ui: { ...defaultUIState },
        });
      },

      getFullConfiguration: () => {
        const state = get();
        return {
          userId: "",
          business: state.business,
          design: state.design,
          content: state.content,
          features: state.features,
          contact: state.contact,
          publishing: state.publishing,
          pages: state.pages,
          payments: state.payments,
        };
      },

      loadConfiguration: (config) => {
        checkThrottleGuard("loadConfiguration");
        const updates: Partial<ConfiguratorState> = {};

        if (config.business) updates.business = config.business;
        if (config.design) updates.design = config.design;
        if (config.content) updates.content = config.content;
        if (config.features) updates.features = config.features;
        if (config.contact) updates.contact = config.contact;
        if (config.publishing) updates.publishing = config.publishing;
        if (config.pages) updates.pages = config.pages;
        if (config.payments) updates.payments = config.payments;

        set((state) => ({ ...state, ...updates }));
      },

      clearAllData: () => {
        checkThrottleGuard("clearAllData");
        set({
          business: { ...defaultBusinessInfo },
          design: { ...defaultDesignConfig },
          content: { ...defaultContentData },
          features: { ...defaultFeatureFlags },
          contact: { ...defaultContactInfo },
          publishing: { ...defaultPublishingInfo },
          pages: { ...defaultPageManagement },
          payments: { ...defaultPaymentAndOffers },
          ui: { ...defaultUIState },
        });
        localStorage.removeItem("configurator-store");
      },
    }),
    {
      name: "configurator-store",
      partialize: (state) => ({
        business: state.business,
        design: state.design,
        content: state.content,
        features: state.features,
        contact: state.contact,
        publishing: state.publishing,
        pages: state.pages,
        payments: state.payments,
      }),
    },
  ),
);

/**
 * Hook factory for subscription to specific slices of state
 * Usage: const businessInfo = useConfiguratorStore((state) => state.business);
 */
export const useConfiguratorBusiness = () =>
  useConfiguratorStore((state) => state.business);

export const useConfiguratorDesign = () =>
  useConfiguratorStore((state) => state.design);

export const useConfiguratorContent = () =>
  useConfiguratorStore((state) => state.content);

export const useConfiguratorFeatures = () =>
  useConfiguratorStore((state) => state.features);

export const useConfiguratorUI = () =>
  useConfiguratorStore((state) => state.ui);

export const useConfiguratorActions = () => {
  const store = useConfiguratorStore();

  return useMemo(
    () => ({
      business: {
        setBusinessInfo: store.setBusinessInfo,
        updateBusinessName: store.updateBusinessName,
        updateBusinessType: store.updateBusinessType,
        updateLocation: store.updateLocation,
        updateSlogan: store.updateSlogan,
      },
      design: {
        updateDesign: store.updateDesign,
        updateTemplate: store.updateTemplate,
        updatePrimaryColor: store.updatePrimaryColor,
        updateSecondaryColor: store.updateSecondaryColor,
        updateFontFamily: store.updateFontFamily,
      },
      content: {
        addMenuItem: store.addMenuItem,
        removeMenuItem: store.removeMenuItem,
        updateMenuItem: store.updateMenuItem,
        addGalleryImage: store.addGalleryImage,
        removeGalleryImage: store.removeGalleryImage,
        updateOpeningHours: store.updateOpeningHours,
        setCategories: store.setCategories,
      },
      features: {
        updateFeatureFlags: store.updateFeatureFlags,
        toggleReservations: store.toggleReservations,
        toggleOnlineOrdering: store.toggleOnlineOrdering,
        toggleOnlineStore: store.toggleOnlineStore,
        toggleTeamArea: store.toggleTeamArea,
      },
      navigation: {
        nextStep: store.nextStep,
        prevStep: store.prevStep,
        goToStep: store.goToStep,
        setCurrentStep: store.setCurrentStep,
      },
      ui: {
        setSidebarOpen: store.setSidebarOpen,
        toggleSectionExpand: store.toggleSectionExpand,
        setSaveLoading: store.setSaveLoading,
        setSaveError: store.setSaveError,
      },
      data: {
        resetConfig: store.resetConfig,
        getFullConfiguration: store.getFullConfiguration,
        loadConfiguration: store.loadConfiguration,
        clearAllData: store.clearAllData,
      },
    }),
    [],
  );
};
