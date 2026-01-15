import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Rocket,
  Crown,
  Menu,
  X,
  Settings,
  Smartphone,
  Share2,
  Coffee,
  ShoppingBag,
  Utensils,
  Home,
  Save,
  Cloud,
  AlertCircle,
} from "lucide-react";

// Zustand Store
import { useConfiguratorStore, useConfiguratorActions } from "@/store/configuratorStore";

// UI Components
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Step Components - All 14 extracted steps
import { WelcomePage } from "@/components/configurator/steps/WelcomePage";
import { TemplateStep } from "@/components/configurator/steps/TemplateStep";
import BusinessInfoStep from "@/components/configurator/steps/BusinessInfoStep";
import DesignStep from "@/components/configurator/steps/DesignStep";
import { PageStructureStep } from "@/components/configurator/steps/PageStructureStep";
import { OpeningHoursStep } from "@/components/configurator/steps/OpeningHoursStep";
import { MenuProductsStep } from "@/components/configurator/steps/MenuProductsStep";
import { ReservationsStep } from "@/components/configurator/steps/ReservationsStep";
import { ContactSocialStep } from "@/components/configurator/steps/ContactSocialStep";
import { MediaGalleryStep } from "@/components/configurator/steps/MediaGalleryStep";
import { AdvancedFeaturesStep } from "@/components/configurator/steps/AdvancedFeaturesStep";
import { FeatureConfigStep } from "@/components/configurator/steps/FeatureConfigStep";
import { DomainHostingStep } from "@/components/configurator/steps/DomainHostingStep";
import { SEOOptimizationStep } from "@/components/configurator/steps/SEOOptimizationStep";
import { PreviewAdjustmentsStep } from "@/components/configurator/steps/PreviewAdjustmentsStep";
import { PublishStep } from "@/components/configurator/steps/PublishStep";

// Preview & Template Components
import LivePhoneFrame from "@/components/preview/LivePhoneFrame";
import PhonePortal from "@/components/preview/phone-portal";
import ReservationButton from "@/components/ui/ReservationButton";
import MenuSection from "@/components/sections/MenuSection";
import GalleryGrid from "@/components/sections/GalleryGrid";
import TemplateRegistry, {
  defaultTemplates,
} from "@/components/template/TemplateRegistry";
import QRCode from "@/components/qr/QRCode";

// API & Utils
import { configurationApi, sessionApi, type Configuration } from "@/lib/api";
import { publishWebApp } from "@/lib/webapps";
import { stepPersistence, usePersistence } from "@/lib/stepPersistence";
import { toast } from "@/hooks/use-toast";
import { normalizeImageSrc } from "@/lib/configurator-data";

// ===== CONFIGURATOR STEPS DEFINITION =====
const CONFIGURATOR_STEPS_CONFIG = [
  {
    id: "template",
    title: "Choose your template",
    description: "Select a design that matches your vision",
    phase: 0,
    phaseTitle: "Template Selection",
    component: "template",
  },
  {
    id: "business-info",
    title: "Tell us about your business",
    description: "Basic information to get started",
    phase: 1,
    phaseTitle: "Business Information",
    component: "business-info",
  },
  {
    id: "design-customization",
    title: "Customize your design",
    description: "Colors, fonts, and styling",
    phase: 2,
    phaseTitle: "Design Customization",
    component: "design-customization",
  },
  {
    id: "page-structure",
    title: "Select your pages",
    description: "Choose which pages your website will include",
    phase: 3,
    phaseTitle: "Content Structure",
    component: "page-structure",
  },
  {
    id: "opening-hours",
    title: "Set your opening hours",
    description: "When are you open for business?",
    phase: 4,
    phaseTitle: "Business Details",
    component: "opening-hours",
  },
  {
    id: "menu-products",
    title: "Add your menu or products",
    description: "Showcase what you offer",
    phase: 4,
    phaseTitle: "Business Details",
    component: "menu-products",
  },
  {
    id: "reservations",
    title: "Setup reservations",
    description: "Enable table bookings for your business",
    phase: 4,
    phaseTitle: "Business Details",
    component: "reservations",
  },
  {
    id: "contact-social",
    title: "Contact & social media",
    description: "How can customers reach you?",
    phase: 4,
    phaseTitle: "Business Details",
    component: "contact-social",
  },
  {
    id: "media-gallery",
    title: "Upload your photos",
    description: "Show off your space, food, and atmosphere",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "media-gallery",
  },
  {
    id: "advanced-features",
    title: "Optional features",
    description: "Enable advanced functionality",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "advanced-features",
  },
  {
    id: "feature-config",
    title: "Configure selected feature",
    description: "Adjust settings for the feature you just enabled",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "feature-config",
  },
  {
    id: "domain-hosting",
    title: "Choose your domain",
    description: "Select how customers will find your website",
    phase: 6,
    phaseTitle: "Publishing",
    component: "domain-hosting",
  },
  {
    id: "seo-optimization",
    title: "SEO Optimization",
    description: "Improve your search engine visibility",
    phase: 6,
    phaseTitle: "Publishing",
    component: "seo-optimization",
  },
  {
    id: "preview-adjustments",
    title: "Preview & Final Adjustments",
    description: "Review your site and make last-minute changes",
    phase: 6,
    phaseTitle: "Publishing",
    component: "preview-adjustments",
  },
  {
    id: "publish",
    title: "Publish your website",
    description: "Go live with your new website",
    phase: 6,
    phaseTitle: "Publishing",
    component: "publish",
  },
];

// QR Share Dialog Component
function ShareQRButton({ url }: { url: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="border-gray-300">
          <Share2 className="w-4 h-4 mr-2" /> Share QR
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Scan to open</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <QRCode value={url} size={220} />
          <div className="text-xs text-gray-600 break-all text-center max-w-[90%]">
            {url}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => navigator.clipboard.writeText(url)}
            >
              Copy Link
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => window.open(url, "_blank")}
            >
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Configurator() {
  // ===== AUTHENTICATION & PERSISTENCE =====
  const { isSignedIn, getToken } = useAuth();
  const persistence = usePersistence();
  const navigate = useNavigate();
  const actions = useConfiguratorActions();

  // ===== ZUSTAND STORE STATE =====
  const currentStep = useConfiguratorStore((state) => state.ui.currentStep);
  const businessName = useConfiguratorStore((state) => state.business.name);
  const goToStep = useConfiguratorStore((state) => state.goToStep);
  const setCurrentStep = useConfiguratorStore((state) => state.setCurrentStep);
  const nextStepStore = useConfiguratorStore((state) => state.nextStep);
  const prevStepStore = useConfiguratorStore((state) => state.prevStep);

  // Full store state for formData sync (backward compatibility with LivePreview)
  const fullStoreState = useConfiguratorStore((state) => state);

  // ===== LOCAL UI STATE =====
  const isInitialized = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [persistEnabled, setPersistEnabled] = useState(() => {
    try {
      return persistence.getEnabled ? persistence.getEnabled() : true;
    } catch {
      return true;
    }
  });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(() => {
    return persistence.getConfigId() || null;
  });
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "published" | "error">("idle");
  const [publishedUrl, setPublishedUrl] = useState<string | null>(() => {
    return persistence.getPublishedUrl() || null;
  });
  const [pendingFeatureConfig, setPendingFeatureConfig] = useState<string | null>(null);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  // Cart state for online ordering
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);

  // ===== FORMDATA BRIDGE FOR LIVEPREVIEW (Backward Compatibility) =====
  // Sync Zustand store to formData format for LivePreview component
  const formData = useMemo(() => {
    return {
      // Business
      businessName: fullStoreState.business.name,
      businessType: fullStoreState.business.type,
      location: fullStoreState.business.location,
      slogan: fullStoreState.business.slogan,
      uniqueDescription: fullStoreState.business.uniqueDescription,
      hasDomain: fullStoreState.business.domain?.hasDomain || false,
      domainName: fullStoreState.business.domain?.domainName,
      selectedDomain: fullStoreState.business.domain?.selectedDomain,

      // Design
      template: fullStoreState.design.template,
      primaryColor: fullStoreState.design.primaryColor,
      secondaryColor: fullStoreState.design.secondaryColor,
      fontFamily: fullStoreState.design.fontFamily,
      fontColor: fullStoreState.design.fontColor,
      fontSize: fullStoreState.design.fontSize,
      backgroundColor: fullStoreState.design.backgroundColor,

      // Content
      menuItems: fullStoreState.content.menuItems,
      gallery: fullStoreState.content.gallery,
      openingHours: fullStoreState.content.openingHours,
      categories: fullStoreState.content.categories,

      // Features
      reservationsEnabled: fullStoreState.features.reservationsEnabled,
      maxGuests: fullStoreState.features.maxGuests,
      notificationMethod: fullStoreState.features.notificationMethod,
      onlineOrderingEnabled: fullStoreState.features.onlineOrderingEnabled,
      onlineStoreEnabled: fullStoreState.features.onlineStoreEnabled,
      teamAreaEnabled: fullStoreState.features.teamAreaEnabled,

      // Contact
      contactMethods: fullStoreState.contact.contactMethods,
      socialMedia: fullStoreState.contact.socialMedia,
      phone: fullStoreState.contact.phone,
      email: fullStoreState.contact.email,

      // Pages
      selectedPages: fullStoreState.pages.selectedPages,

      // Payments
      offers: (fullStoreState.payments as any).offers || [],
      offerBanner: (fullStoreState.payments as any).offerBanner || {},

      // Extended features (stored in features with any cast)
      ...(fullStoreState.features as any),
    };
  }, [fullStoreState]);

  // ===== HELPER FUNCTIONS =====
  const configuratorSteps = CONFIGURATOR_STEPS_CONFIG;

  const getBaseHost = useCallback(() => {
    try {
      const h = window.location.hostname.replace(/^www\./, "");
      const parts = h.split(".");
      if (parts.length >= 2) return parts.slice(-2).join(".");
      return h;
    } catch {
      return "maitr.de";
    }
  }, []);

  const getDisplayedDomain = useCallback(() => {
    if (publishedUrl) {
      try {
        return new URL(publishedUrl).hostname;
      } catch {}
    }
    if (formData.hasDomain && formData.domainName) return formData.domainName;
    const slug = (formData.selectedDomain || formData.businessName || "site")
      .toLowerCase()
      .replace(/\s+/g, "");
    return `${slug}.${getBaseHost()}`;
  }, [
    formData.hasDomain,
    formData.domainName,
    formData.selectedDomain,
    formData.businessName,
    publishedUrl,
    getBaseHost,
  ]);

  const slugifyName = useCallback(
    (s: string) =>
      (s || "site")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 30),
    []
  );

  const getLiveUrl = useCallback(() => {
    if (publishedUrl) return publishedUrl;
    const origin = (() => {
      try {
        return window.location.origin.replace(/\/$/, "");
      } catch {
        return `https://${getBaseHost()}`;
      }
    })();
    const id = currentConfigId || "";
    const name = slugifyName(formData.businessName || "site");
    if (id) return `${origin}/${id}/${name}`;
    return origin;
  }, [publishedUrl, currentConfigId, formData.businessName, getBaseHost, slugifyName]);

  // Cart functions
  const addToCart = useCallback((item: any, qty: number = 1) => {
    const quantity = Math.max(1, Math.floor(qty || 1));
    setCartItems((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.name === item.name);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.name === item.name
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  const removeFromCart = useCallback((itemName: string) => {
    setCartItems((prev) => prev.filter((item) => item.name !== itemName));
  }, []);

  const cartItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  const cartTotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0
    );
  }, [cartItems]);

  // Save to backend
  const saveToBackend = useCallback(
    async (data: Partial<Configuration>) => {
      if (!isSignedIn) {
        console.warn("Cannot save: user not signed in");
        return;
      }

      setSaveStatus("saving");
      try {
        const token = await getToken();
        if (!token) {
          throw new Error("No auth token available");
        }

        let configId = currentConfigId;

        if (!configId) {
          const newConfig = await configurationApi.create(data, token);
          configId = newConfig.id;
          setCurrentConfigId(configId);
          persistence.setConfigId(configId);
        } else {
          await configurationApi.update(configId, data, token);
        }

        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (error) {
        console.error("Failed to save configuration:", error);
        setSaveStatus("error");
        setTimeout(() => setSaveStatus("idle"), 3000);
      }
    },
    [isSignedIn, getToken, currentConfigId, persistence]
  );

  // Publish configuration
  const publishConfiguration = useCallback(async () => {
    if (!isSignedIn) {
      alert("Please sign in to publish your website");
      return;
    }

    setPublishStatus("publishing");
    try {
      const token = await getToken();
      if (!token) throw new Error("No auth token available");

      const configData = actions.data.getFullConfiguration();
      await saveToBackend(configData);

      const subdomain =
        formData.selectedDomain ||
        formData.businessName.toLowerCase().replace(/\s+/g, "");

      const result = await publishWebApp(subdomain, configData, token);

      setPublishedUrl(result.publishedUrl || getLiveUrl());
      persistence.setPublishedUrl(result.publishedUrl || getLiveUrl());
      actions.publishing.publishConfiguration();

      setPublishStatus("published");
      toast({
        title: "Website Published!",
        description: "Your website is now live.",
      });
    } catch (error) {
      console.error("Publishing failed:", error);
      setPublishStatus("error");
      toast({
        title: "Publishing Failed",
        description: "There was an error publishing your website.",
        variant: "destructive",
      });
      setTimeout(() => setPublishStatus("idle"), 3000);
    }
  }, [
    isSignedIn,
    getToken,
    formData.selectedDomain,
    formData.businessName,
    saveToBackend,
    getLiveUrl,
    persistence,
    actions,
  ]);

  // ===== INITIALIZATION (LOCKED ENTRY PATTERN) =====
  useEffect(() => {
    if (isInitialized.current) return;

    setIsVisible(true);

    const hasSaved = persistence.hasSavedSteps();
    const summary = persistence.getSummary();

    console.log("=== Configurator Initialization ===");
    console.log("Has saved steps:", hasSaved);
    console.log("Summary:", summary);
    console.log("Current step:", currentStep);
    console.log("Business name:", businessName);
    console.log("===================================");

    if (hasSaved) {
      toast({
        title: "State Restored",
        description: `Loaded your previous progress: ${summary}`,
      });
    } else {
      toast({
        title: "New Session",
        description: "Starting fresh - all steps will be saved automatically",
      });
    }

    isInitialized.current = true;
  }, []);

  // ===== NAVIGATION =====
  const nextStep = useCallback(() => {
    nextStepStore();
  }, [nextStepStore]);

  const prevStep = useCallback(() => {
    prevStepStore();
  }, [prevStepStore]);

  const handleStart = useCallback(() => {
    setCurrentStep(0);
  }, [setCurrentStep]);

  // ===== LIVE PREVIEW COMPONENT =====
  const TemplatePreviewContent = useCallback(() => {
    const activeTemplate = previewTemplateId || formData.template || "modern";
    const TemplateComponent = TemplateRegistry[activeTemplate];

    if (!TemplateComponent) {
      return (
        <div className="flex items-center justify-center h-full bg-gray-100">
          <p className="text-gray-500">Template not found</p>
        </div>
      );
    }

    return (
      <div
        className="w-full h-full overflow-y-auto"
        style={{
          fontFamily: formData.fontFamily,
          color: formData.fontColor,
          backgroundColor: formData.backgroundColor,
        }}
      >
        <TemplateComponent
          config={formData}
          addToCart={addToCart}
          cartItemsCount={cartItemsCount}
        />
      </div>
    );
  }, [previewTemplateId, formData, addToCart, cartItemsCount]);

  const LivePreview = useCallback(() => {
    return (
      <div className="sticky top-24 h-[calc(100vh-7rem)]">
        <Card className="h-full p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Live Preview</h3>
            <ShareQRButton url={getLiveUrl()} />
          </div>
          <div className="h-[calc(100%-3rem)] flex items-center justify-center">
            <LivePhoneFrame widthClass="w-full max-w-[280px]" heightClass="h-full max-h-[580px]">
              <PhonePortal>
                <TemplatePreviewContent />
              </PhonePortal>
            </LivePhoneFrame>
          </div>
        </Card>
      </div>
    );
  }, [getLiveUrl, TemplatePreviewContent]);

  // ===== NAVIGATION BAR =====
  const Navigation = () => {
    const progress = ((currentStep + 1) / configuratorSteps.length) * 100;

    return (
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate("/")}
                className="flex items-center space-x-2 text-gray-900 hover:text-teal-600 transition-colors"
              >
                <Home className="w-5 h-5" />
                <span className="font-semibold hidden sm:inline">Maitr</span>
              </button>

              {currentStep >= 0 && (
                <div className="hidden md:flex items-center space-x-2 text-sm">
                  <span className="text-gray-500">Step {currentStep + 1}</span>
                  <span className="text-gray-300">/</span>
                  <span className="text-gray-500">{configuratorSteps.length}</span>
                  <span className="text-gray-300 mx-2">·</span>
                  <span className="text-gray-700 font-medium">
                    {configuratorSteps[currentStep]?.title || "Configuration"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center space-x-3">
              {saveStatus === "saving" && (
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Cloud className="w-4 h-4 animate-pulse" />
                  <span className="hidden sm:inline">Saving...</span>
                </div>
              )}
              {saveStatus === "saved" && (
                <div className="flex items-center space-x-2 text-sm text-green-600">
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Saved</span>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="flex items-center space-x-2 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">Error</span>
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
              >
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {currentStep >= 0 && (
            <div className="h-1 bg-gray-100">
              <motion.div
                className="h-full bg-gradient-to-r from-teal-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>

        {isMenuOpen && (
          <div className="border-t border-gray-200 bg-white">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    actions.data.resetConfig();
                    setIsMenuOpen(false);
                  }}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  Reset
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const config = actions.data.getFullConfiguration();
                    saveToBackend(config);
                    setIsMenuOpen(false);
                  }}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Save Now
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    window.open(getLiveUrl(), "_blank");
                    setIsMenuOpen(false);
                  }}
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    goToStep(configuratorSteps.length - 1);
                    setIsMenuOpen(false);
                  }}
                  className="bg-gradient-to-r from-teal-500 to-purple-500"
                >
                  <Rocket className="w-4 h-4 mr-2" />
                  Publish
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    );
  };

  // ===== RENDER MAIN CONTENT =====
  const renderMainContent = () => {
    if (currentStep === -1) {
      return (
        <WelcomePage
          onStart={handleStart}
          currentConfigId={currentConfigId}
          publishedUrl={publishedUrl}
        />
      );
    }

    const currentStepConfig = configuratorSteps[currentStep];
    if (!currentStepConfig) return null;

    switch (currentStepConfig.component) {
      case "template":
        return (
          <TemplateStep
            nextStep={nextStep}
            prevStep={prevStep}
            previewTemplateId={previewTemplateId}
            setPreviewTemplateId={setPreviewTemplateId}
          />
        );
      case "business-info":
        return <BusinessInfoStep nextStep={nextStep} prevStep={prevStep} />;
      case "design-customization":
        return <DesignStep nextStep={nextStep} prevStep={prevStep} />;
      case "page-structure":
        return <PageStructureStep nextStep={nextStep} prevStep={prevStep} />;
      case "opening-hours":
        return <OpeningHoursStep nextStep={nextStep} prevStep={prevStep} />;
      case "menu-products":
        return <MenuProductsStep nextStep={nextStep} prevStep={prevStep} />;
      case "reservations":
        return <ReservationsStep nextStep={nextStep} prevStep={prevStep} />;
      case "contact-social":
        return <ContactSocialStep nextStep={nextStep} prevStep={prevStep} />;
      case "media-gallery":
        return <MediaGalleryStep nextStep={nextStep} prevStep={prevStep} />;
      case "advanced-features":
        return (
          <AdvancedFeaturesStep
            nextStep={nextStep}
            prevStep={prevStep}
            setPendingFeatureConfig={setPendingFeatureConfig}
            setCurrentStep={setCurrentStep}
            configuratorSteps={configuratorSteps}
          />
        );
      case "feature-config":
        return (
          <FeatureConfigStep
            nextStep={nextStep}
            prevStep={prevStep}
            pendingFeatureConfig={pendingFeatureConfig}
            setPendingFeatureConfig={setPendingFeatureConfig}
            setCurrentStep={setCurrentStep}
            configuratorSteps={configuratorSteps}
          />
        );
      case "domain-hosting":
        return (
          <DomainHostingStep
            nextStep={nextStep}
            prevStep={prevStep}
            getBaseHost={getBaseHost}
            getDisplayedDomain={getDisplayedDomain}
          />
        );
      case "seo-optimization":
        return (
          <SEOOptimizationStep
            nextStep={nextStep}
            prevStep={prevStep}
            getDisplayedDomain={getDisplayedDomain}
          />
        );
      case "preview-adjustments":
        return (
          <PreviewAdjustmentsStep
            nextStep={nextStep}
            prevStep={prevStep}
            TemplatePreviewContent={TemplatePreviewContent}
            getDisplayedDomain={getDisplayedDomain}
          />
        );
      case "publish":
        return (
          <PublishStep
            prevStep={prevStep}
            getLiveUrl={getLiveUrl}
            getDisplayedDomain={getDisplayedDomain}
            saveToBackend={saveToBackend}
          />
        );
      default:
        return (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentStepConfig.title}
            </h2>
            <p className="text-gray-600 mb-8">{currentStepConfig.description}</p>
            <p className="text-sm text-gray-500 mb-8">
              Step component '{currentStepConfig.component}' is coming soon...
            </p>
            <div className="flex justify-between max-w-lg mx-auto">
              <Button type="button" onClick={prevStep} variant="outline" size="lg">
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back
              </Button>
              <Button onClick={nextStep} size="lg" className="bg-gradient-to-r from-teal-500 to-purple-500">
                Continue
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        );
    }
  };

  // ===== MAIN RENDER =====
  return (
    <div
      className={`min-h-screen bg-white transition-opacity duration-1000 ${
        isVisible ? "opacity-100" : "opacity-0"
      }`}
    >
      <Navigation />

      {currentStep === -1 ? (
        <div className="pt-20">{renderMainContent()}</div>
      ) : currentStep === 0 ? (
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderMainContent()}
          </div>
        </div>
      ) : (
        <div className="pt-20">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const preview = document.getElementById("mobile-preview");
                  if (preview) {
                    preview.style.display =
                      preview.style.display === "none" ? "block" : "none";
                  }
                }}
                className="w-full"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Toggle Preview
              </Button>
              <div id="mobile-preview" className="mt-4 hidden lg:hidden">
                <LivePreview />
              </div>
            </div>

            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="min-h-[60vh] lg:min-h-[80vh]">
                {renderMainContent()}
              </div>
            </div>

            <div className="hidden lg:block order-1 lg:order-2">
              <LivePreview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
