import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { motion } from "framer-motion";
import {
  ChevronRight,
  ArrowLeft,
  Sparkles,
  Rocket,
  Menu,
  X,
  Settings,
  Smartphone,
  Share2,
  Home,
  Save,
  Cloud,
  AlertCircle,
} from "lucide-react";

// Zustand Store
import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";

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

// Step Components
import { WelcomePage } from "@/components/configurator/steps/WelcomePage";
import { TemplateStep } from "@/components/configurator/steps/TemplateStep";
import { BusinessInfoStep } from "@/components/configurator/steps/BusinessInfoStep";
import { DesignStep } from "@/components/configurator/steps/DesignStep";
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
import { TemplatePreviewContent } from "@/components/configurator/preview/TemplatePreviewContent";
import QRCode from "@/components/qr/QRCode";

// API & Utils
import { configurationApi, type Configuration } from "@/lib/api";
import { publishWebApp } from "@/lib/webapps";
import { usePersistence } from "@/lib/stepPersistence";
import { toast } from "@/hooks/use-toast";

// ===== CONFIGURATOR STEPS DEFINITION =====
const CONFIGURATOR_STEPS_CONFIG = [
  { id: "template", title: "Choose your template", description: "Select a design that matches your vision", phase: 0, phaseTitle: "Template Selection", component: "template" },
  { id: "business-info", title: "Tell us about your business", description: "Basic information to get started", phase: 1, phaseTitle: "Business Information", component: "business-info" },
  { id: "design-customization", title: "Customize your design", description: "Colors, fonts, and styling", phase: 2, phaseTitle: "Design Customization", component: "design-customization" },
  { id: "page-structure", title: "Select your pages", description: "Choose which pages your website will include", phase: 3, phaseTitle: "Content Structure", component: "page-structure" },
  { id: "opening-hours", title: "Set your opening hours", description: "When are you open for business?", phase: 4, phaseTitle: "Business Details", component: "opening-hours" },
  { id: "menu-products", title: "Add your menu or products", description: "Showcase what you offer", phase: 4, phaseTitle: "Business Details", component: "menu-products" },
  { id: "reservations", title: "Setup reservations", description: "Enable table bookings for your business", phase: 4, phaseTitle: "Business Details", component: "reservations" },
  { id: "contact-social", title: "Contact & social media", description: "How can customers reach you?", phase: 4, phaseTitle: "Business Details", component: "contact-social" },
  { id: "media-gallery", title: "Upload your photos", description: "Show off your space, food, and atmosphere", phase: 5, phaseTitle: "Media & Advanced", component: "media-gallery" },
  { id: "advanced-features", title: "Optional features", description: "Enable advanced functionality", phase: 5, phaseTitle: "Media & Advanced", component: "advanced-features" },
  { id: "feature-config", title: "Configure selected feature", description: "Adjust settings for the feature you just enabled", phase: 5, phaseTitle: "Media & Advanced", component: "feature-config" },
  { id: "domain-hosting", title: "Choose your domain", description: "Select how customers will find your website", phase: 6, phaseTitle: "Publishing", component: "domain-hosting" },
  { id: "seo-optimization", title: "SEO Optimization", description: "Improve your search engine visibility", phase: 6, phaseTitle: "Publishing", component: "seo-optimization" },
  { id: "preview-adjustments", title: "Preview & Final Adjustments", description: "Review your site and make last-minute changes", phase: 6, phaseTitle: "Publishing", component: "preview-adjustments" },
  { id: "publish", title: "Publish your website", description: "Go live with your new website", phase: 6, phaseTitle: "Publishing", component: "publish" },
];

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
            <Button size="sm" onClick={() => navigator.clipboard.writeText(url)}>
              Copy Link
            </Button>
            <Button size="sm" variant="secondary" onClick={() => window.open(url, "_blank")}>
              Open
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Configurator() {
  const { isSignedIn, getToken } = useAuth();
  const persistence = usePersistence();
  const navigate = useNavigate();
  const actions = useConfiguratorActions();

  // === OPTIMIZED STORE ACCESS ===
  // Wir abonnieren NUR die Felder, die wir für die UI/Navigation brauchen.
  // Das verhindert die Endlosschleife (#185 Error).
  const currentStep = useConfiguratorStore((state) => state.ui.currentStep);
  const businessName = useConfiguratorStore((state) => state.business.name);
  const domainData = useConfiguratorStore((state) => state.business.domain);
  
  // Actions holen (diese ändern sich nie, daher sicher)
  const { goToStep, setCurrentStep, nextStep: nextStepStore, prevStep: prevStepStore } = useConfiguratorStore((state) => ({
    goToStep: state.goToStep,
    setCurrentStep: state.setCurrentStep,
    nextStep: state.nextStep,
    prevStep: state.prevStep,
  }));

  // Local State
  const isInitialized = useRef(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(() => persistence.getConfigId() || null);
  const [publishedUrl, setPublishedUrl] = useState<string | null>(() => persistence.getPublishedUrl() || null);
  const [pendingFeatureConfig, setPendingFeatureConfig] = useState<string | null>(null);

  // Helpers
  const configuratorSteps = CONFIGURATOR_STEPS_CONFIG;

  const getBaseHost = useCallback(() => {
    try {
      return window.location.hostname.replace(/^www\./, "");
    } catch { return "maitr.de"; }
  }, []);

  const slugifyName = useCallback((s: string) => 
    (s || "site").toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 30), 
  []);

  // Berechnet die Live-URL nur basierend auf den notwendigen Feldern (nicht mehr "formData")
  const getLiveUrl = useCallback(() => {
    if (publishedUrl) return publishedUrl;
    const origin = (() => { try { return window.location.origin.replace(/\/$/, ""); } catch { return `https://${getBaseHost()}`; } })();
    const id = currentConfigId || "";
    const name = slugifyName(businessName || "site");
    if (id) return `${origin}/${id}/${name}`;
    return origin;
  }, [publishedUrl, currentConfigId, businessName, getBaseHost, slugifyName]);

  const getDisplayedDomain = useCallback(() => {
    if (publishedUrl) { try { return new URL(publishedUrl).hostname; } catch {} }
    if (domainData?.hasDomain && domainData?.domainName) return domainData.domainName;
    const slug = slugifyName(domainData?.selectedDomain || businessName || "site");
    return `${slug}.${getBaseHost()}`;
  }, [publishedUrl, domainData, businessName, getBaseHost, slugifyName]);

  // Actions
  const saveToBackend = useCallback(async (data: Partial<Configuration>) => {
    if (!isSignedIn) return;
    setSaveStatus("saving");
    try {
      const token = await getToken();
      if (!token) throw new Error("No token");
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
      console.error("Save failed", error);
      setSaveStatus("error");
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  }, [isSignedIn, getToken, currentConfigId, persistence]);

  // Init
  useEffect(() => {
    if (isInitialized.current) return;
    setIsVisible(true);
    const hasSaved = persistence.hasSavedSteps();
    if (hasSaved) toast({ title: "State Restored", description: "Loaded previous progress" });
    isInitialized.current = true;
  }, []);

  // Navigation Wrappers
  const nextStep = useCallback(() => nextStepStore(), [nextStepStore]);
  const prevStep = useCallback(() => prevStepStore(), [prevStepStore]);
  const handleStart = useCallback(() => setCurrentStep(0), [setCurrentStep]);

  // --- LIVE PREVIEW ---
  // Diese Version verhindert die Endlosschleife, 
  // da sie keine Props mehr durchreicht.
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
                {/* WICHTIG: Hier KEINE Props übergeben! */}
                {/* Die Komponente holt sich die Daten selbst aus dem Store. */}
                <TemplatePreviewContent />
              </PhonePortal>
            </LivePhoneFrame>
          </div>
        </Card>
      </div>
    );
  }, [getLiveUrl]);
  // --- RENDER MAIN CONTENT ---
  const renderMainContent = () => {
    if (currentStep === -1) {
      return <WelcomePage onStart={handleStart} currentConfigId={currentConfigId} publishedUrl={publishedUrl} />;
    }

    const currentStepConfig = configuratorSteps[currentStep];
    if (!currentStepConfig) return null;

    switch (currentStepConfig.component) {
      case "template":
        return <TemplateStep nextStep={nextStep} prevStep={prevStep} />;
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
        return <AdvancedFeaturesStep nextStep={nextStep} prevStep={prevStep} setPendingFeatureConfig={setPendingFeatureConfig} setCurrentStep={setCurrentStep} configuratorSteps={configuratorSteps} />;
      case "feature-config":
        return <FeatureConfigStep nextStep={nextStep} prevStep={prevStep} pendingFeatureConfig={pendingFeatureConfig} setPendingFeatureConfig={setPendingFeatureConfig} setCurrentStep={setCurrentStep} configuratorSteps={configuratorSteps} />;
      case "domain-hosting":
        return <DomainHostingStep nextStep={nextStep} prevStep={prevStep} getBaseHost={getBaseHost} getDisplayedDomain={getDisplayedDomain} />;
      case "seo-optimization":
        return <SEOOptimizationStep nextStep={nextStep} prevStep={prevStep} getDisplayedDomain={getDisplayedDomain} />;
      case "preview-adjustments":
        return <PreviewAdjustmentsStep nextStep={nextStep} prevStep={prevStep} TemplatePreviewContent={TemplatePreviewContent} getDisplayedDomain={getDisplayedDomain} />;
      case "publish":
        return <PublishStep nextStep={nextStep} prevStep={prevStep} getLiveUrl={getLiveUrl} getDisplayedDomain={getDisplayedDomain} saveToBackend={saveToBackend} />;
      default:
        return <div>Unknown Step</div>;
    }
  };

  // Main Layout
  return (
    <div className={`min-h-screen bg-white transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}>
      {/* Navigation Bar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button onClick={() => navigate("/")} className="flex items-center space-x-2 text-gray-900 hover:text-teal-600">
                <Home className="w-5 h-5" /><span className="font-semibold hidden sm:inline">Maitr</span>
              </button>
              {currentStep >= 0 && (
                <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                  <span>Step {currentStep + 1}</span><span>/</span><span>{configuratorSteps.length}</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3">
              {saveStatus === "saving" && <Cloud className="w-4 h-4 animate-pulse text-gray-600" />}
              {saveStatus === "saved" && <Save className="w-4 h-4 text-green-600" />}
              <Button variant="outline" size="sm" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                {isMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          {currentStep >= 0 && (
             <div className="h-1 bg-gray-100">
                <motion.div className="h-full bg-gradient-to-r from-teal-500 to-purple-500" 
                  initial={{ width: 0 }} 
                  animate={{ width: `${((currentStep + 1) / configuratorSteps.length) * 100}%` }} 
                />
             </div>
          )}
        </div>
        {isMenuOpen && (
          <div className="border-t border-gray-200 bg-white p-4">
             <div className="flex gap-4">
                <Button variant="outline" size="sm" onClick={() => { actions.data.resetConfig(); setIsMenuOpen(false); }}>
                  <Settings className="w-4 h-4 mr-2" /> Reset
                </Button>
                <Button variant="default" size="sm" onClick={() => { goToStep(configuratorSteps.length - 1); setIsMenuOpen(false); }}>
                  <Rocket className="w-4 h-4 mr-2" /> Publish
                </Button>
             </div>
          </div>
        )}
      </nav>

      {/* Content Area */}
      <div className="pt-20">
        {currentStep === -1 ? renderMainContent() : (
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lg:hidden mb-4">
              <Button variant="outline" size="sm" className="w-full" onClick={() => {
                 const el = document.getElementById("mobile-preview");
                 if(el) el.style.display = el.style.display === "none" ? "block" : "none";
              }}>
                <Smartphone className="w-4 h-4 mr-2" /> Toggle Preview
              </Button>
              <div id="mobile-preview" className="mt-4 hidden"><LivePreview /></div>
            </div>
            <div className="lg:col-span-2 min-h-[80vh]">{renderMainContent()}</div>
            {/* <div className="hidden lg:block order-1 lg:order-2"><LivePreview /></div> */}
          </div>
        )}
      </div>
    </div>
  );
}
