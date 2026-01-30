import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { publishWebApp } from "@/lib/webapps";
import {
  Rocket,
  Settings,
  Share2,
  Cloud,
  Check,
  Save,
  Loader2,
  Undo2,
} from "lucide-react";

import {
  useConfiguratorStore,
  useConfiguratorActions,
} from "@/store/configuratorStore";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { injectGlobalStyles } from "@/lib/styleInjector";

// Steps Importssd
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

// Preview & Utils
import LivePhoneFrame from "@/components/preview/LivePhoneFrame";
import PhonePortal from "@/components/preview/phone-portal";
import { TemplatePreviewContent } from "@/components/configurator/preview/TemplatePreviewContent";
import QRCode from "@/components/qr/QRCode";
import { LanguageSelector } from "@/components/ui/LanguageSelector";

import { configurationApi, type Configuration } from "@/lib/api";
import { usePersistence } from "@/lib/stepPersistence";

const CONFIGURATOR_STEPS_CONFIG = [
  {
    id: "template",
    title: "Choose your template",
    phase: 0,
    phaseTitle: "Template Selection",
    component: "template",
  },
  {
    id: "business-info",
    title: "Tell us about your business",
    phase: 1,
    phaseTitle: "Business Information",
    component: "business-info",
  },
  {
    id: "design-customization",
    title: "Design Customization",
    phase: 2,
    phaseTitle: "Design Customization",
    component: "design-customization",
  },
  {
    id: "page-structure",
    title: "Select your pages",
    phase: 3,
    phaseTitle: "Content Structure",
    component: "page-structure",
  },
  {
    id: "opening-hours",
    title: "Set your opening hours",
    phase: 4,
    phaseTitle: "Business Details",
    component: "opening-hours",
  },
  {
    id: "menu-products",
    title: "Add your menu or products",
    phase: 4,
    phaseTitle: "Business Details",
    component: "menu-products",
  },
  {
    id: "reservations",
    title: "Setup reservations",
    phase: 4,
    phaseTitle: "Business Details",
    component: "reservations",
  },
  {
    id: "contact-social",
    title: "Contact & social media",
    phase: 4,
    phaseTitle: "Business Details",
    component: "contact-social",
  },
  {
    id: "media-gallery",
    title: "Upload your photos",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "media-gallery",
  },
  {
    id: "advanced-features",
    title: "Optional features",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "advanced-features",
  },
  {
    id: "feature-config",
    title: "Configure feature",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "feature-config",
  },
  {
    id: "domain-hosting",
    title: "Choose your domain",
    phase: 6,
    phaseTitle: "Publishing",
    component: "domain-hosting",
  },
  {
    id: "seo-optimization",
    title: "SEO Optimization",
    phase: 6,
    phaseTitle: "Publishing",
    component: "seo-optimization",
  },
  {
    id: "preview-adjustments",
    title: "Preview & final tweaks",
    phase: 6,
    phaseTitle: "Publishing",
    component: "preview-adjustments",
  },
  {
    id: "publish",
    title: "Publish your website",
    phase: 6,
    phaseTitle: "Publishing",
    component: "publish",
  },
];

function ShareQRButton({
  url,
  t,
}: {
  url: string;
  t: (key: string) => string;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 text-xs text-gray-500 hover:text-gray-900 hover:bg-white/50"
        >
          <Share2 className="w-3 h-3 mr-2" /> {t("nav.shareQr")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("nav.scanToOpen")}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          <QRCode value={url} size={220} />
          <div className="text-xs text-gray-600 break-all text-center">
            {url}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Configurator() {
  const { t } = useTranslation();
  const { isSignedIn, getToken } = useAuth();
  const persistence = usePersistence();
  const navigate = useNavigate();
  const actions = useConfiguratorActions();

  const currentStep = useConfiguratorStore((s) => s.ui.currentStep);
  const cloudSyncEnabled = useConfiguratorStore((s) => s.ui.cloudSyncEnabled);
  const historyCount = useConfiguratorStore((s) => s.ui.historyCount);
  const nextStepStore = useConfiguratorStore((s) => s.nextStep);
  const prevStepStore = useConfiguratorStore((s) => s.prevStep);
  const setCurrentStep = useConfiguratorStore((s) => s.setCurrentStep);
  const business = useConfiguratorStore((s) => s.business); // <-- DIESE ZEILE HINZUFÜGEN
  const design = useConfiguratorStore((s) => s.design);
  const features = useConfiguratorStore((s) => s.features);
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(
    () => persistence.getConfigId() || null,
  );
  const [publishedUrl, setPublishedUrl] = useState<string | null>(
    () => persistence.getPublishedUrl() || null,
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );
  const [pendingFeatureConfig, setPendingFeatureConfig] = useState<any>(null);

  const getLiveUrl = useCallback(() => {
    if (publishedUrl) return publishedUrl;

    const subdomain = business.domain?.selectedDomain ||
      business.name.toLowerCase().replace(/[^a-z0-9]/g, "-") ||
      "site";

    return `https://${subdomain}.maitr.de`;
  }, [publishedUrl, business.domain?.selectedDomain, business.name]);

  const getDisplayedDomain = useCallback(() => {
    const selected = business.domain?.selectedDomain;

    if (selected) {
      return selected.includes(".") ? selected : `${selected}.maitr.de`;
    }

    // Fallback, falls noch nichts gewählt wurde
    return "site.maitr.de";
  }, [business.domain?.selectedDomain]);

  // ✅ StyleInjector Integration
  useEffect(() => {
    // Styles injizieren
    injectGlobalStyles({
      template: design.template || 'minimalist',
      primaryColor: design.primaryColor || '#2563EB',
      secondaryColor: design.secondaryColor || '#7C3AED',
      backgroundColor: design.backgroundColor || '#FFFFFF',
      fontColor: design.fontColor || '#111827',
      priceColor: design.priceColor || '#059669',
      headerFontColor: design.headerFontColor || '#5e30eb',
      headerBackgroundColor: design.headerBackgroundColor || '#FFFFFF',
      headerFontSize: design.headerFontSize || '3xl',
      reservationButtonColor: features.reservationButtonColor || '#94e3fe',
      reservationButtonTextColor: features.reservationButtonTextColor || '#000000',
    });

    return () => {
      // ID muss exakt mit STYLE_ELEMENT_ID in styleInjector.ts übereinstimmen
      const styleElement = document.getElementById('maitr-injected-styles');
      if (styleElement) styleElement.remove();
    };
  }, [
    // Alle Werte hinzufügen, die eine Live-Aktualisierung auslösen sollen
    design.template,
    design.primaryColor,
    design.secondaryColor,
    design.backgroundColor,
    design.fontColor,
    design.headerFontColor,
    design.headerFontSize,
    design.priceColor,
    features.reservationButtonColor,
    features.reservationButtonTextColor
  ]);

  const saveToBackend = useCallback(
    async (data: Partial<Configuration>) => {
      if (!isSignedIn) return;
      setSaveStatus("saving");
      try {
        const token = await getToken();
        if (!token) throw new Error("No token");
        const payload = currentConfigId
          ? { ...data, id: currentConfigId }
          : data;
        const res = await configurationApi.save(payload, token);
        const saved = (res as any).data || res;
        if (!currentConfigId && saved?.id) {
          setCurrentConfigId(saved.id);
          persistence.setConfigId(saved.id);
        }
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      } catch (e) {
        console.error(e);
        setSaveStatus("idle");
      }
    },
    [isSignedIn, getToken, currentConfigId, persistence],
  );

  const handlePublish = useCallback(async () => {
    if (!isSignedIn) return;
    setSaveStatus("saving");

    try {
      const token = await getToken();
      const config = actions.data.getFullConfiguration();
      // Generiere Subdomain aus dem gewählten Namen oder Business-Namen
      const subdomain = business.domain?.selectedDomain ||
        business.name.toLowerCase().replace(/[^a-z0-9]/g, "-");

      const result = await publishWebApp(subdomain, config, token || undefined);

      if (result.success) {
        setPublishedUrl(result.publishedUrl);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2000);
      }
    } catch (e) {
      console.error("Publishing failed", e);
      setSaveStatus("idle");
    }
  }, [isSignedIn, getToken, setPublishedUrl, actions.data, business.domain?.selectedDomain, business.name]);

  const [isTransitioning, setIsTransitioning] = useState(false);

  const nextStep = useCallback(async () => {
    // Verhindere Preview-Updates während Transition
    setIsTransitioning(true);

    actions.history.pushHistory(); // Push history before navigation

    // Kurze Delay für stabile Transition
    await new Promise(resolve => setTimeout(resolve, 50));

    nextStepStore();

    // Re-enable Preview nach Step-Wechsel
    setTimeout(() => setIsTransitioning(false), 150);
  }, [nextStepStore, actions.history]);

  const prevStep = useCallback(async () => {
    // Verhindere Preview-Updates während Transition
    setIsTransitioning(true);

    actions.history.pushHistory(); // Push history before navigation

    // Kurze Delay für stabile Transition
    await new Promise(resolve => setTimeout(resolve, 50));

    prevStepStore();

    // Re-enable Preview nach Step-Wechsel
    setTimeout(() => setIsTransitioning(false), 150);
  }, [prevStepStore, actions.history]);

  const handleStart = useCallback(() => setCurrentStep(0), [setCurrentStep]);

  const progressPercentage = useMemo(() => {
    if (currentStep < 0) return 0;
    return ((currentStep + 1) / CONFIGURATOR_STEPS_CONFIG.length) * 100;
  }, [currentStep]);

  const currentPhase = useMemo(() => {
    if (currentStep < 0) return null;
    return CONFIGURATOR_STEPS_CONFIG[currentStep] || null;
  }, [currentStep]);

  const isFullWidthStep = useMemo(() => {
    const stepId = CONFIGURATOR_STEPS_CONFIG[currentStep]?.id;
    return stepId === "preview-adjustments";
  }, [currentStep]);

  // --- LIVE PREVIEW COMPONENT ---
  const LivePreview = () => (
    <div className="flex flex-col items-center justify-start pt-2">
      <div className="w-[280px] xl:w-[320px] flex justify-between items-center mb-4 px-1 opacity-90 transition-opacity shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
          <h3 className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
            {t("nav.livePreview")}
          </h3>
        </div>
        <ShareQRButton url={getLiveUrl()} t={t} />
      </div>

      <div className={`relative z-10 transform origin-top scale-[0.75] xl:scale-[0.85] transition-all duration-200 pointer-events-auto ${
        isTransitioning ? 'opacity-80 scale-[0.74] xl:scale-[0.84]' : 'opacity-100'
      }`}>
        <div className="absolute inset-0 bg-gradient-to-tr from-teal-500/10 to-purple-500/10 blur-3xl rounded-full opacity-30 -z-10" />
        <LivePhoneFrame widthClass="w-[360px]" heightClass="h-[740px]">
          <PhonePortal>
            <div className={`transition-opacity duration-200 ${
              isTransitioning ? 'opacity-50' : 'opacity-100'
            }`}>
              <TemplatePreviewContent />
            </div>
          </PhonePortal>
        </LivePhoneFrame>
      </div>

      <div className="mt-[-80px] xl:mt-[-40px] text-center opacity-60 shrink-0">
        <p className="text-[10px] text-gray-400 font-medium">
          {t("nav.interactive")}
        </p>
      </div>
    </div>
  );

  const NavigationHeader = () => (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200/80 h-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center space-x-4">
            <button onClick={() => navigate("/")} className="relative group">
              <span className="text-3xl font-black bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">
                Maitr
              </span>
            </button>
            {currentStep >= 0 && (
              <div className="hidden md:flex items-center ml-8">
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full border border-gray-100">
                  <Settings className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-bold text-gray-700">
                    {t("nav.step", {
                      current: currentStep + 1,
                      total: CONFIGURATOR_STEPS_CONFIG.length,
                    })}
                  </span>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden ml-2">
                    <motion.div
                      className="bg-gradient-to-r from-teal-500 to-purple-500 h-1.5 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="hidden md:flex items-center space-x-3">
            {/* Language Selector */}
            <LanguageSelector variant="compact" />

            {/* Undo Button */}
            {currentStep >= 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  actions.history.undo();
                }}
                disabled={historyCount === 0}
                className="text-gray-500 hover:text-gray-900 gap-1.5 disabled:opacity-40"
                title={
                  historyCount > 0
                    ? `Rückgängig (${historyCount})`
                    : "Keine Änderungen zum Rückgängigmachen"
                }
              >
                <Undo2 className="w-4 h-4" />
                <span className="hidden lg:inline text-xs">Zurück</span>
              </Button>
            )}

            {/* Cloud Sync Toggle + Save Button */}
            <div className="flex items-center gap-2 bg-gray-50 rounded-full px-2 py-1 border border-gray-200">
              <button
                onClick={() =>
                  actions.ui.setCloudSyncEnabled(!cloudSyncEnabled)
                }
                className={`p-1.5 rounded-full transition-colors ${
                  cloudSyncEnabled
                    ? "bg-teal-500 text-white"
                    : "bg-gray-200 text-gray-500"
                }`}
                title={
                  cloudSyncEnabled
                    ? "Cloud-Sync aktiv"
                    : "Cloud-Sync deaktiviert"
                }
              >
                <Cloud className="w-3.5 h-3.5" />
              </button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  // Push to history before saving
                  actions.history.pushHistory();
                  if (cloudSyncEnabled) {
                    saveToBackend(actions.data.getFullConfiguration()).then(() => {});
                  } else {
                    setSaveStatus("saved");
                    setTimeout(() => setSaveStatus("idle"), 2000);
                  }
                }}
                disabled={saveStatus === "saving"}
                className="h-7 px-3 text-xs font-medium"
              >
                {saveStatus === "saving" ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />{" "}
                    Speichern...
                  </>
                ) : saveStatus === "saved" ? (
                  <>
                    <Check className="w-3 h-3 text-green-500 mr-1" />{" "}
                    Gespeichert
                  </>
                ) : (
                  <>
                    <Save className="w-3 h-3 mr-1" /> Speichern
                  </>
                )}
              </Button>
            </div>

            {/* Publish Button */}
            {currentStep >= 0 && (
              <Button
                size="sm"
                onClick={handlePublish} // ✅ Hier handlePublish statt saveToBackend nutzen!
                className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 ..."
              >
                <Rocket className="w-4 h-4 mr-2" /> {t("nav.publishWebsite")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );

  const renderMainContent = () => {
    if (currentStep === -1)
      return (
        <WelcomePage
          onStart={handleStart}
          currentConfigId={currentConfigId}
          publishedUrl={publishedUrl}
        />
      );
    const config = CONFIGURATOR_STEPS_CONFIG[currentStep];
    if (!config) return <div>Unknown Step</div>;
    switch (config.component) {
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
            configuratorSteps={CONFIGURATOR_STEPS_CONFIG}
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
            configuratorSteps={CONFIGURATOR_STEPS_CONFIG}
          />
        );
      case "domain-hosting":
        return (
          <DomainHostingStep
            nextStep={nextStep}
            prevStep={prevStep}
            getBaseHost={() => "maitr.de"}
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
            configId={currentConfigId}
            getLiveUrl={getLiveUrl}
            getDisplayedDomain={getDisplayedDomain}
            saveToBackend={saveToBackend}
          />
        );
      default:
        return <div>Step coming soon</div>;
    }
  };

  return (
    // FIX: Kein overflow-hidden hier, damit nur der Browser-Scrollbalken genutzt wird
    <div className="min-h-screen bg-gray-50/30 transition-opacity duration-700">
      <NavigationHeader />

      <div className="pt-24 pb-12 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* items-start sorgt dafür, dass die sticky Spalte nicht gestreckt wird */}
        <div className="grid lg:grid-cols-12 gap-8 items-start relative">
          {/* LINKES PANEL */}
          <div
            className={`${isFullWidthStep ? "lg:col-span-12" : "lg:col-span-7 xl:col-span-8"} order-2 lg:order-1`}
          >
            {currentStep === -1 ? (
              renderMainContent()
            ) : (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 min-h-[600px]">
                {renderMainContent()}
              </div>
            )}
          </div>

          {/* RECHTES PANEL: Sticky Live Preview */}
          {!isFullWidthStep && currentStep !== -1 && (
            <div className="hidden lg:block lg:col-span-5 xl:col-span-4 order-1 lg:order-2 sticky top-28 self-start">
              <LivePreview />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
