import { getDeviceId } from "@/lib/utils";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import BusinessInfoStep from "@/components/configurator/steps/BusinessInfoStep";
import DesignStep from "@/components/configurator/steps/DesignStep";
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
  Globe,
  Palette,
  MapPin,
  Phone,
  Mail,
  Upload,
  Clock,
  Calendar,
  Users,
  Camera,
  Instagram,
  Facebook,
  Share2,
  Coffee,
  ShoppingBag,
  Utensils,
  Store,
  Building,
  Plus,
  Check,
  Star,
  Heart,
  Zap,
  Play,
  Eye,
  ChevronDown,
  Monitor,
  Wifi,
  Shield,
  Home,
  Save,
  Cloud,
  AlertCircle,
  Search,
  Sun,
  Moon,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import LivePhoneFrame from "@/components/preview/LivePhoneFrame";
import PhonePortal from "@/components/preview/phone-portal";
import ReservationButton from "@/components/ui/ReservationButton";
import MenuSection from "@/components/sections/MenuSection";
import GalleryGrid from "@/components/sections/GalleryGrid";
import TemplateRegistry, {
  defaultTemplates,
} from "@/components/template/TemplateRegistry";
import { configurationApi, sessionApi, type Configuration } from "@/lib/api";
import { useAuth } from "@clerk/clerk-react";
import { publishWebApp } from "@/lib/webapps";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import QRCode from "@/components/qr/QRCode";
import { toast } from "@/hooks/use-toast";
import { stepPersistence, usePersistence } from "@/lib/stepPersistence";

// Image src normalizer usable across the configurator (supports url, data uri, and File)
export function normalizeImageSrc(img: any): string {
  if (!img) return "/placeholder.svg";
  if (typeof img === "string") return img;
  const url = img?.url;
  if (typeof url === "string") return url;
  const file = (img as any)?.file || img;
  if (typeof File !== "undefined" && file instanceof File)
    return URL.createObjectURL(file);
  return "/placeholder.svg";
}

// ===== STABLE CONFIGURATOR STEPS DEFINITION =====
// Moved outside component to prevent recreating on every render
// This ensures stable references for useMemo dependencies
const CONFIGURATOR_STEPS_CONFIG = [
  // Step 0: Template Selection
  {
    id: "template",
    title: "Choose your template",
    description: "Select a design that matches your vision",
    phase: 0,
    phaseTitle: "Template Selection",
    component: "template",
  },

  // Step 1: Business Information
  {
    id: "business-info",
    title: "Tell us about your business",
    description: "Basic information to get started",
    phase: 1,
    phaseTitle: "Business Information",
    component: "business-info",
  },

  // Step 2: Design Customization
  {
    id: "design-customization",
    title: "Customize your design",
    description: "Colors, fonts, and styling",
    phase: 2,
    phaseTitle: "Design Customization",
    component: "design-customization",
  },

  // Step 3: Page Structure
  {
    id: "page-structure",
    title: "Select your pages",
    description: "Choose which pages your website will include",
    phase: 3,
    phaseTitle: "Content Structure",
    component: "page-structure",
  },

  // Step 4: Opening Hours
  {
    id: "opening-hours",
    title: "Set your opening hours",
    description: "When are you open for business?",
    phase: 4,
    phaseTitle: "Business Details",
    component: "opening-hours",
  },

  // Step 5: Menu/Products
  {
    id: "menu-products",
    title: "Add your menu or products",
    description: "Showcase what you offer",
    phase: 4,
    phaseTitle: "Business Details",
    component: "menu-products",
  },

  // Step 6: Reservations
  {
    id: "reservations",
    title: "Setup reservations",
    description: "Enable table bookings for your business",
    phase: 4,
    phaseTitle: "Business Details",
    component: "reservations",
  },

  // Step 7: Contact & Social
  {
    id: "contact-social",
    title: "Contact & social media",
    description: "How can customers reach you?",
    phase: 4,
    phaseTitle: "Business Details",
    component: "contact-social",
  },

  // Step 8: Media Gallery
  {
    id: "media-gallery",
    title: "Upload your photos",
    description: "Show off your space, food, and atmosphere",
    phase: 5,
    phaseTitle: "Media & Advanced",
    component: "media-gallery",
  },

  // Step 9: Advanced Features
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

  // Step 10: Domain & Hosting
  {
    id: "domain-hosting",
    title: "Choose your domain",
    description: "Select how customers will find your website",
    phase: 6,
    phaseTitle: "Publishing",
    component: "domain-hosting",
  },

  // Step 11: SEO Optimization
  {
    id: "seo-optimization",
    title: "SEO Optimization",
    description: "Improve your search engine visibility",
    phase: 6,
    phaseTitle: "Publishing",
    component: "seo-optimization",
  },

  // Step 12: Preview & Adjustments
  {
    id: "preview-adjustments",
    title: "Preview & Final Adjustments",
    description: "Review your site and make last-minute changes",
    phase: 6,
    phaseTitle: "Publishing",
    component: "preview-adjustments",
  },

  // Step 13: Publish
  {
    id: "publish",
    title: "Publish your website",
    description: "Go live with your new website",
    phase: 6,
    phaseTitle: "Publishing",
    component: "publish",
  },
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
  // Initialize Clerk auth and persistence system FIRST (before any callbacks)
  const { isSignedIn, getToken } = useAuth();
  const persistence = usePersistence();
  const navigate = useNavigate();

  // Get step orchestration from Zustand store with strict selector hygiene
  const currentStep = useConfiguratorStore((state) => state.ui.currentStep);
  const businessName = useConfiguratorStore((state) => state.business.name);
  const { goToStep, setCurrentStep } = useConfiguratorStore((state) => ({
    goToStep: state.goToStep,
    setCurrentStep: state.setCurrentStep,
  }));

  // ===== LOCKED ENTRY PATTERN =====
  // Ensures initialization logic runs exactly once per session
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
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(() => {
    return persistence.getConfigId() || null;
  });
  const [publishStatus, setPublishStatus] = useState<
    "idle" | "publishing" | "published" | "error"
  >("idle");
  const [publishedUrl, setPublishedUrl] = useState<string | null>(() => {
    return persistence.getPublishedUrl() || null;
  });
  const [pendingFeatureConfig, setPendingFeatureConfig] = useState<
    string | null
  >(null);

  // Initialize form data from persistence system
  const [formData, setFormData] = useState(() => {
    const restoredData = persistence.getFormData();
    console.log("Restored form data:", restoredData);
    return restoredData;
  });

  // Compute base host dynamically (e.g., synca.digital)
  const getBaseHost = useCallback(() => {
    try {
      const h = window.location.hostname.replace(/^www\./, "");
      const parts = h.split(".");
      if (parts.length >= 2) return parts.slice(-2).join(".");
      return h;
    } catch {
      return "synca.digital";
    }
  }, []);

  // Depends on publishedUrl and formData; must be declared AFTER their initialization to avoid TDZ
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
    [],
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
  }, [
    publishedUrl,
    currentConfigId,
    formData.businessName,
    getBaseHost,
    slugifyName,
  ]);

  // ===== LOCKED ENTRY INITIALIZATION EFFECT =====
  // This effect runs EXACTLY ONCE on component mount, regardless of re-renders
  // The isInitialized ref prevents any subsequent executions
  useEffect(() => {
    // Block second execution - this is the critical guard
    if (isInitialized.current) return;

    setIsVisible(true);

    // Log restoration status
    const hasSaved = persistence.hasSavedSteps();
    const summary = persistence.getSummary();

    console.log("=== Configurator Locked-Entry Initialization ===");
    console.log("Has saved steps:", hasSaved);
    console.log("Summary:", summary);
    console.log("Current step:", currentStep);
    console.log("Business name:", businessName);
    console.log("Config ID:", currentConfigId);
    console.log("Published URL:", publishedUrl);
    console.log("================================================");

    // Check if this is a fresh load with no business data
    if (!businessName) {
      console.log("Fresh session detected - no business data yet");
      // Store defaults are already initialized, so UI is ready for step 0
    }

    // Show toast with restoration status
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

    // Mark initialization as complete - prevents re-execution
    isInitialized.current = true;
  }, []);

  // Template preview selection (for step 0 live preview before committing)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(
    null,
  );

  // Shopping cart state for ordering feature
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [showCart, setShowCart] = useState(false);

  // Add to cart function (supports quantity)
  const addToCart = useCallback((item: any, qty: number = 1) => {
    const quantity = Math.max(1, Math.floor(qty || 1));
    setCartItems((prev) => {
      const existingItem = prev.find((cartItem) => cartItem.name === item.name);
      if (existingItem) {
        return prev.map((cartItem) =>
          cartItem.name === item.name
            ? { ...cartItem, quantity: cartItem.quantity + quantity }
            : cartItem,
        );
      }
      return [...prev, { ...item, quantity }];
    });
  }, []);

  // Remove from cart function
  const removeFromCart = useCallback((itemName: string) => {
    setCartItems((prev) => prev.filter((item) => item.name !== itemName));
  }, []);

  // Get total cart items count
  const cartItemsCount = useMemo(() => {
    return cartItems.reduce((total, item) => total + item.quantity, 0);
  }, [cartItems]);

  // Get cart total price
  const cartTotal = useMemo(() => {
    return cartItems.reduce(
      (total, item) => total + parseFloat(item.price) * item.quantity,
      0,
    );
  }, [cartItems]);

  // COMPLETE Configuration steps
  const configuratorSteps = [
    // Step 0: Template Selection
    {
      id: "template",
      title: "Choose your template",
      description: "Select a design that matches your vision",
      phase: 0,
      phaseTitle: "Template Selection",
      component: "template",
    },

    // Step 1: Business Information
    {
      id: "business-info",
      title: "Tell us about your business",
      description: "Basic information to get started",
      phase: 1,
      phaseTitle: "Business Information",
      component: "business-info",
    },

    // Step 2: Design Customization
    {
      id: "design-customization",
      title: "Customize your design",
      description: "Colors, fonts, and styling",
      phase: 2,
      phaseTitle: "Design Customization",
      component: "design-customization",
    },

    // Step 3: Page Structure
    {
      id: "page-structure",
      title: "Select your pages",
      description: "Choose which pages your website will include",
      phase: 3,
      phaseTitle: "Content Structure",
      component: "page-structure",
    },

    // Step 4: Opening Hours
    {
      id: "opening-hours",
      title: "Set your opening hours",
      description: "When are you open for business?",
      phase: 4,
      phaseTitle: "Business Details",
      component: "opening-hours",
    },

    // Step 5: Menu/Products
    {
      id: "menu-products",
      title: "Add your menu or products",
      description: "Showcase what you offer",
      phase: 4,
      phaseTitle: "Business Details",
      component: "menu-products",
    },

    // Step 6: Reservations
    {
      id: "reservations",
      title: "Setup reservations",
      description: "Enable table bookings for your business",
      phase: 4,
      phaseTitle: "Business Details",
      component: "reservations",
    },

    // Step 7: Contact & Social
    {
      id: "contact-social",
      title: "Contact & social media",
      description: "How can customers reach you?",
      phase: 4,
      phaseTitle: "Business Details",
      component: "contact-social",
    },

    // Step 8: Media Gallery
    {
      id: "media-gallery",
      title: "Upload your photos",
      description: "Show off your space, food, and atmosphere",
      phase: 5,
      phaseTitle: "Media & Advanced",
      component: "media-gallery",
    },

    // Step 9: Advanced Features
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

    // Step 10: Domain & Hosting
    {
      id: "domain-hosting",
      title: "Choose your domain",
      description: "Select how customers will find your website",
      phase: 6,
      phaseTitle: "Publishing",
      component: "domain-hosting",
    },

    // Step 11: SEO Optimization
    {
      id: "seo-optimization",
      title: "SEO Optimization",
      description: "Improve your search engine visibility",
      phase: 6,
      phaseTitle: "Publishing",
      component: "seo-optimization",
    },

    // Step 12: Final Preview
    {
      id: "preview-adjustments",
      title: "Preview & final tweaks",
      description: "Review and make final adjustments",
      phase: 6,
      phaseTitle: "Publishing",
      component: "preview-adjustments",
    },

    // Step 13: Publish
    {
      id: "publish",
      title: "Publish your website",
      description: "Make your website live!",
      phase: 6,
      phaseTitle: "Publishing",
      component: "publish",
    },
  ];

  // Business type options
  const businessTypes = [
    {
      value: "cafe",
      label: "Café",
      icon: <Coffee className="w-6 h-6" />,
      gradient: "from-amber-400 to-orange-500",
    },
    {
      value: "restaurant",
      label: "Restaurant",
      icon: <Utensils className="w-6 h-6" />,
      gradient: "from-red-400 to-rose-500",
    },
    {
      value: "bar",
      label: "Bar",
      icon: <ShoppingBag className="w-6 h-6" />,
      gradient: "from-purple-500 to-indigo-600",
    },
  ];

  // Use canonical template definitions from TemplateRegistry
  const templates = defaultTemplates;

  // Font options with working functionality
  const fontOptions = [
    {
      id: "sans-serif",
      name: "Sans Serif",
      class: "font-sans",
      preview: "Modern & Clean",
      description: "Perfect for digital readability",
    },
    {
      id: "serif",
      name: "Serif",
      class: "font-serif",
      preview: "Classic & Elegant",
      description: "Traditional and sophisticated",
    },
    {
      id: "display",
      name: "Display",
      class: "font-mono",
      preview: "Bold & Creative",
      description: "Eye-catching and unique",
    },
  ];

  // Page options
  const pageOptions = [
    {
      id: "home",
      name: "Home",
      required: true,
      icon: <Home className="w-4 h-4" />,
    },
    {
      id: "menu",
      name: "Menu",
      icon: <Coffee className="w-4 h-4" />,
      condition: ["cafe", "restaurant", "bar"],
    },
    { id: "gallery", name: "Gallery", icon: <Camera className="w-4 h-4" /> },
    { id: "about", name: "About", icon: <Heart className="w-4 h-4" /> },
    {
      id: "reservations",
      name: "Reservations",
      icon: <Calendar className="w-4 h-4" />,
      condition: ["restaurant", "bar"],
    },
    { id: "contact", name: "Contact", icon: <Phone className="w-4 h-4" /> },
  ];

  // Input handling
  const inputRefs = useRef<
    Record<string, HTMLInputElement | HTMLTextAreaElement | null>
  >({});

  const collectFormValues = useCallback(() => {
    const values: any = {};
    Object.keys(inputRefs.current).forEach((field) => {
      const element = inputRefs.current[field];
      if (element) {
        values[field] = element.value;
      }
    });
    return values;
  }, []);

  const updateFormDataFromInputs = useCallback(() => {
    const inputValues = collectFormValues();
    const contactMethods: any[] = [];
    const socialMedia: any = {};
    const regularFields: any = {};

    Object.keys(inputValues).forEach((key) => {
      if (key.startsWith("contact_")) {
        const contactType = key.replace("contact_", "");
        const value = inputValues[key];
        if (value && value.trim()) {
          contactMethods.push({ type: contactType, value: value.trim() });
        }
      } else if (key.startsWith("social_")) {
        const platform = key.replace("social_", "");
        const value = inputValues[key];
        if (value && value.trim()) {
          socialMedia[platform] = value.trim();
        }
      } else {
        regularFields[key] = inputValues[key];
      }
    });

    const processedData = {
      ...regularFields,
      ...(contactMethods.length > 0 && { contactMethods }),
      ...(Object.keys(socialMedia).length > 0 && { socialMedia }),
    };

    setFormData((prev) => ({ ...prev, ...processedData }));
  }, [collectFormValues]);

  const handleInputBlur = useCallback(
    (field: string) => {
      return () => updateFormDataFromInputs();
    },
    [updateFormDataFromInputs],
  );

  const setInputRef = useCallback((field: string) => {
    return (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputRefs.current[field] = element;
    };
  }, []);

  // Form data update helper
  const updateFormData = useCallback(
    (field: string, value: any) => {
      setFormData((prev) => {
        const newData = { ...prev, [field]: value };
        persistence.updateFormData(field, value, newData);
        return newData;
      });
    },
    [persistence],
  );

  // Navigation functions
  const startConfigurator = useCallback(() => {
    // Use requestAnimationFrame for smoother transition
    requestAnimationFrame(() => {
      setCurrentStep(0); // Go to template selection
      persistence.saveStep(
        0,
        "template",
        "step_change",
        { action: "started" },
        formData,
      );
    });
  }, [formData, persistence]);

  const nextStep = useCallback(() => {
    if (currentStep < configuratorSteps.length - 1) {
      updateFormDataFromInputs();
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      persistence.saveStep(
        newStep,
        configuratorSteps[newStep]?.id || "unknown",
        "step_change",
        { action: "next", from: currentStep },
        formData,
      );
    }
  }, [
    currentStep,
    configuratorSteps,
    updateFormDataFromInputs,
    formData,
    persistence,
  ]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      updateFormDataFromInputs();
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      persistence.saveStep(
        newStep,
        configuratorSteps[newStep]?.id || "unknown",
        "step_change",
        { action: "prev", from: currentStep },
        formData,
      );
    } else if (currentStep === 0) {
      // Go back to welcome page
      setCurrentStep(-1);
      persistence.saveStep(
        -1,
        "welcome",
        "step_change",
        { action: "back_to_welcome" },
        formData,
      );
    }
  }, [
    currentStep,
    updateFormDataFromInputs,
    formData,
    persistence,
    configuratorSteps,
  ]);

  // Back to Template Selection function
  const backToTemplates = useCallback(() => {
    updateFormDataFromInputs();
    setCurrentStep(0);
    persistence.saveStep(
      0,
      "template",
      "step_change",
      { action: "back_to_templates", from: currentStep },
      formData,
    );
  }, [updateFormDataFromInputs, formData, persistence, currentStep]);

  // Normalize payload to server schema (e.g., contactMethods must be string[])
  const normalizeConfigPayload = useCallback(
    (data: any): Partial<Configuration> => {
      const clone: any = { ...data };
      if (Array.isArray(clone.contactMethods)) {
        clone.contactMethods = clone.contactMethods
          .map((m: any) =>
            typeof m === "string"
              ? m
              : [m?.type, m?.value].filter(Boolean).join(": ").trim(),
          )
          .filter((s: any) => typeof s === "string" && s.trim());
      }
      return clone as Partial<Configuration>;
    },
    [],
  );

  // Save and publish functions
  const saveToBackend = useCallback(
    async (data: Partial<Configuration>) => {
      const t = await getToken();
      if (!t) {
        setSaveStatus("error");
        toast({
          title: "Please log in",
          description: "Sign in to save your website",
        });
        navigate("/login", {
          replace: false,
          state: { from: { pathname: "/configurator" } },
        } as any);
        return;
      }
      setSaveStatus("saving");
      try {
        const mediaSafe = await sanitizeMedia(data);
        const configData = {
          ...normalizeConfigPayload(mediaSafe),
          userId: sessionApi.getUserId(),
        };

        if (currentConfigId) {
          configData.id = currentConfigId;
        }

        const result = await configurationApi.save(configData, t);

        if (result.success && result.data) {
          const configId = result.data.id || null;
          setCurrentConfigId(configId);
          setSaveStatus("saved");

          // Save to persistence system
          if (configId) {
            persistence.setConfigId(configId);
          }
          persistence.saveStep(
            currentStep,
            "save",
            "save",
            { configId, success: true },
            data,
          );

          // Keep legacy localStorage for backward compatibility
          localStorage.setItem("configuratorData", JSON.stringify(data));
        } else {
          setSaveStatus("error");
          persistence.saveStep(
            currentStep,
            "save",
            "save",
            { success: false, error: result.error },
            data,
          );
        }
      } catch (error) {
        setSaveStatus("error");
        console.error("Save error:", error);
      }
    },
    [currentConfigId, currentStep, persistence, getToken],
  );

  // Convert File/Blob/blob: URLs to data URLs so they persist across sessions and servers
  const fileOrUrlToDataUrl = useCallback(
    async (input: any): Promise<string | null> => {
      try {
        if (!input) return null;
        if (typeof input === "string") {
          if (input.startsWith("data:")) return input;
          if (input.startsWith("blob:")) {
            const resp = await fetch(input);
            const blob = await resp.blob();
            const reader = new FileReader();
            return await new Promise((resolve, reject) => {
              reader.onerror = () => reject(reader.error);
              reader.onloadend = () => resolve(String(reader.result || ""));
              reader.readAsDataURL(blob);
            });
          }
          return input;
        }
        if (input instanceof Blob) {
          const reader = new FileReader();
          return await new Promise((resolve, reject) => {
            reader.onerror = () => reject(reader.error);
            reader.onloadend = () => resolve(String(reader.result || ""));
            reader.readAsDataURL(input);
          });
        }
        return null;
      } catch {
        return null;
      }
    },
    [],
  );

  const sanitizeMedia = useCallback(
    async (data: any) => {
      const clone: any = { ...data };
      if (clone.logo) {
        const converted = await fileOrUrlToDataUrl(clone.logo);
        if (converted) clone.logo = converted;
      }
      if (Array.isArray(clone.gallery)) {
        const out = [] as any[];
        for (const img of clone.gallery) {
          const entry: any = { ...img };
          if (
            entry &&
            typeof entry.url === "string" &&
            entry.url.startsWith("blob:")
          ) {
            const converted = await fileOrUrlToDataUrl(entry.url);
            if (converted) entry.url = converted;
          }
          if (entry && entry.file) delete entry.file;
          out.push(entry);
        }
        clone.gallery = out;
      }
      if (Array.isArray(clone.menuItems)) {
        clone.menuItems = await Promise.all(
          clone.menuItems.map(async (it: any) => {
            const item = { ...it };
            if (item.image) {
              const imageToConvert =
                item.image.file || item.image.url || item.image;
              const converted = await fileOrUrlToDataUrl(imageToConvert);
              if (converted) item.image = converted;
            }
            return item;
          }),
        );
      }
      return clone;
    },
    [fileOrUrlToDataUrl],
  );

  const publishConfiguration = useCallback(async () => {
    if (!isSignedIn) {
      toast({
        title: "Please log in",
        description: "Sign in to publish your website",
      });
      navigate("/login", {
        replace: false,
        state: { from: { pathname: "/configurator" } },
      } as any);
      setPublishStatus("error");
      return;
    }
    // Best-effort save; in serverless it may be skipped but that's fine
    if (!currentConfigId) {
      await saveToBackend(formData as Partial<Configuration>);
    }

    setPublishStatus("publishing");
    toast({ title: "Publishing...", description: "Generating your live app" });
    try {
      const mediaSafe = await sanitizeMedia(formData);
      setFormData(mediaSafe);

      // If authenticated, publish to protected apps endpoint; else fallback
      let live: string | null = null;
      if (isSignedIn) {
        const token = await getToken();
        const cfg = normalizeConfigPayload(mediaSafe) as any;
        const slugSource = (cfg.slug || cfg.businessName || "").toString();
        const slug =
          slugSource
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "")
            .slice(0, 63) || `site-${Date.now().toString(36)}`;
        const publishRes = await publishWebApp(slug, cfg, token);
        live =
          publishRes.publishedUrl || publishRes.previewUrl || `/site/${slug}`;
      } else {
        const result = await configurationApi.publish(
          currentConfigId || "new",
          normalizeConfigPayload(mediaSafe) as any,
        );
        if (result.success && result.data) {
          live =
            (result.data as any).previewUrl || result.data.publishedUrl || null;
        }
      }

      if (live) {
        setPublishStatus("published");
        setPublishedUrl(live);

        // Save to persistence system
        if (live) {
          persistence.setPublishedUrl(live);
        }
        persistence.saveStep(
          currentStep,
          "publish",
          "publish",
          {
            success: true,
            publishedUrl: live,
            configId: currentConfigId,
          },
          formData,
        );

        if (live) {
          toast({
            title: "Published",
            description: "Opening your live app...",
          });
          window.open(live, "_blank");
        } else {
          toast({ title: "Published", description: "Live URL not returned" });
        }
      } else {
        setPublishStatus("error");
        persistence.saveStep(
          currentStep,
          "publish",
          "publish",
          {
            success: false,
            error: result.error,
            configId: currentConfigId,
          },
          formData,
        );
        toast({
          title: "Publish failed",
          description: result.error || "Unknown error",
          variant: "destructive" as any,
        });
      }
    } catch (error: any) {
      setPublishStatus("error");
      console.error("Publish error:", error);
      persistence.saveStep(
        currentStep,
        "publish",
        "publish",
        {
          success: false,
          error: error?.message || String(error),
          configId: currentConfigId,
        },
        formData,
      );
      toast({
        title: "Publish error",
        description: error?.message || String(error),
        variant: "destructive" as any,
      });
    }
  }, [currentConfigId, formData, saveToBackend, currentStep, persistence]);

  // Sync current draft to server preview cache (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      (async () => {
        try {
          const sid = persistence.getSessionId
            ? persistence.getSessionId()
            : "local";
          const mediaSafe = await sanitizeMedia(formData);
          const payload = JSON.stringify({ config: mediaSafe });
          const blob = new Blob([payload], { type: "application/json" });
          if (
            !(navigator as any).sendBeacon ||
            !(navigator as any).sendBeacon(`/api/preview/${sid}`, blob)
          ) {
            await fetch(`/api/preview/${sid}`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": sessionApi.getUserId(),
              },
              body: payload,
            }).catch(() => {});
          }
        } catch {}
      })();
    }, 500);
    return () => clearTimeout(t);
  }, [formData, persistence, sanitizeMedia]);

  // Progress calculation
  const progressPercentage = useMemo(() => {
    if (currentStep < 0) return 0;
    return ((currentStep + 1) / configuratorSteps.length) * 100;
  }, [currentStep, configuratorSteps.length]);

  // Current phase data
  const currentPhase = useMemo(() => {
    if (currentStep < 0) return null;
    return configuratorSteps[currentStep] || null;
  }, [currentStep, configuratorSteps]);

  // Enhanced Navigation component
  const Navigation = () => (
    <nav className="fixed top-0 w-full z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-b border-gray-200 dark:border-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <a
                href="/"
                className="text-3xl font-black bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent"
              >
                Maitr
              </a>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full opacity-75"></div>
            </div>

            {/* Progress indicator - only show when in configurator steps */}
            {currentStep >= 0 && (
              <div className="hidden md:flex items-center ml-8">
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
                  <Settings className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-bold text-gray-700">
                    Step {currentStep + 1} of {configuratorSteps.length}
                  </span>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-purple-500 h-1.5 rounded-full transition-transform duration-300 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Status */}
            {currentStep >= 0 && (
              <div className="hidden lg:flex items-center space-x-2 ml-4">
                {saveStatus === "saving" && (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <Cloud className="w-4 h-4 animate-pulse" />
                    <span className="text-xs">Saving...</span>
                  </div>
                )}
                {saveStatus === "saved" && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-xs">Saved</span>
                  </div>
                )}
                {saveStatus === "error" && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">Save failed</span>
                  </div>
                )}
              </div>
            )}

            {/* Phase indicator */}
            {currentPhase && (
              <div className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-teal-500/10 to-purple-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                <Crown className="w-3 h-3 text-teal-600" />
                <span className="text-xs font-bold text-teal-700">
                  {currentPhase.phaseTitle}
                </span>
              </div>
            )}
          </div>

          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              {/* Persist toggle */}
              <div className="hidden md:flex items-center gap-2 text-xs text-gray-600">
                <span>Save progress</span>
                <Switch
                  checked={persistEnabled}
                  onCheckedChange={(v: boolean) => {
                    setPersistEnabled(v);
                    try {
                      persistence.setEnabled?.(v);
                    } catch {}
                    toast({
                      title: v ? "Saving enabled" : "Saving disabled",
                      description: v
                        ? "Your steps will be stored and restored"
                        : "Progress will not be stored",
                    });
                  }}
                />
              </div>
              {/* Back to Templates button - only show after template selection */}
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={backToTemplates}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Templates
                </Button>
              )}

              {currentStep >= 0 && (
                <div className="flex items-center space-x-2">
                  {publishStatus === "published" && publishedUrl ? (
                    <>
                      <Button
                        size="sm"
                        onClick={() => window.open(getLiveUrl(), "_blank")}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm font-bold rounded-full shadow-lg"
                      >
                        <Globe className="w-4 h-4 mr-2" />
                        View Live Site
                      </Button>
                      <ShareQRButton url={publishedUrl} />
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={async () => {
                          const sid = persistence.getSessionId
                            ? persistence.getSessionId()
                            : "local";
                          try {
                            const mediaSafe = await sanitizeMedia(formData);
                            const payload = JSON.stringify({
                              config: mediaSafe,
                            });
                            const blob = new Blob([payload], {
                              type: "application/json",
                            });
                            if (
                              !(navigator as any).sendBeacon ||
                              !(navigator as any).sendBeacon(
                                `/api/preview/${sid}`,
                                blob,
                              )
                            ) {
                              await fetch(`/api/preview/${sid}`, {
                                method: "POST",
                                headers: {
                                  "Content-Type": "application/json",
                                  "x-user-id": sessionApi.getUserId(),
                                },
                                body: payload,
                              }).catch(() => {});
                            }
                          } catch {}
                          window.open(`/site/preview-${sid}`, "_blank");
                        }}
                        className="border-gray-300"
                      >
                        1:1 Preview
                      </Button>
                      <Button
                        size="sm"
                        onClick={publishConfiguration}
                        disabled={publishStatus === "publishing"}
                        className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-6 py-2 text-sm font-bold rounded-full shadow-lg ml-2"
                      >
                        {publishStatus === "publishing" ? (
                          <>
                            <Cloud className="w-4 h-4 mr-2 animate-pulse" />
                            Publishing...
                          </>
                        ) : (
                          <>
                            <Rocket className="w-4 h-4 mr-2" />
                            Publish Website
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700"
            >
              {isMenuOpen ? (
                <X className="w-6 h-6" />
              ) : (
                <Menu className="w-6 h-6" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Modern App-Style Template Preview
  const PaymentOptionsStep = () => {
    const paymentOptions = ["Credit Card", "PayPal", "Cash"];
    return (
      <motion.div
        key="payment-options"
        initial={{ opacity: 0, x: 10 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -10 }}
      >
        <div className="space-y-4">
          {paymentOptions.map((option) => (
            <div
              key={option}
              className="flex items-center justify-between rounded-lg border bg-white p-4"
            >
              <label
                htmlFor={`payment-${option}`}
                className="text-sm font-medium"
              >
                {option}
              </label>
              <Switch
                id={`payment-${option}`}
                checked={formData.paymentOptions?.includes(option)}
                onCheckedChange={(checked) => {
                  const newOptions = checked
                    ? [...(formData.paymentOptions || []), option]
                    : formData.paymentOptions?.filter((o) => o !== option);
                  updateFormData("paymentOptions", newOptions);
                }}
              />
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  const OffersBanner = ({ offers, styles, offerBanner }) => {
    if (!offers || offers.length === 0) return null;

    const normalizeImageSrc = (img: any): string => {
      if (!img) return "/placeholder.svg";
      if (typeof img === "string") return img;
      const url = img?.url;
      if (typeof url === "string") return url;
      const file = (img as any)?.file || img;
      if (typeof File !== "undefined" && file instanceof File)
        return URL.createObjectURL(file);
      return "/placeholder.svg";
    };

    const list = Array.isArray(offers) ? offers : [];
    const [idx, setIdx] = useState(0);
    useEffect(() => {
      if (list.length <= 1) return;
      const t = setInterval(() => setIdx((i) => (i + 1) % list.length), 3000);
      return () => clearInterval(t);
    }, [list.length]);

    const offer = list[Math.max(0, Math.min(idx, list.length - 1))];

    const size = offerBanner?.size === "small" ? "small" : "big";
    const cardAspect =
      offerBanner?.cardAspect === "square" ? "square" : "rectangle";
    const radiusClass =
      offerBanner?.shape === "pill" ? "rounded-full" : "rounded-xl";

    const bannerStyles = {
      backgroundColor: offerBanner?.backgroundColor || "#000000",
      color: offerBanner?.textColor || "#FFFFFF",
    };

    const textSize = offerBanner?.textSize || "md";
    const nameCls =
      textSize === "sm"
        ? "text-lg"
        : textSize === "lg"
          ? "text-3xl"
          : "text-2xl";
    const descCls =
      textSize === "sm" ? "text-xs" : textSize === "lg" ? "text-lg" : "text-sm";
    const priceCls =
      textSize === "sm"
        ? "text-base"
        : textSize === "lg"
          ? "text-2xl"
          : "text-xl";

    const buttonStyles = {
      backgroundColor: offerBanner?.buttonColor || "#FFFFFF",
      color: offerBanner?.backgroundColor || "#000000",
    };

    const buttonRadius =
      offerBanner?.shape === "pill" ? "rounded-full" : "rounded-lg";

    return (
      <div
        className={`relative text-white mb-4 overflow-hidden ${radiusClass}`}
        style={bannerStyles}
      >
        {offer.image && (
          <img
            src={normalizeImageSrc(offer.image)}
            alt={offer.name}
            className={`${cardAspect === "square" ? "aspect-square" : size === "small" ? "h-24" : "h-40"} w-full object-cover opacity-50`}
          />
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
          <h3 className={`font-bold ${nameCls}`}>{offer.name}</h3>
          {offer.description && (
            <p className={`${descCls}`}>{offer.description}</p>
          )}
          {typeof offer.price !== "undefined" && (
            <p className={`font-bold mt-2 ${priceCls}`}>${offer.price}</p>
          )}
        </div>
      </div>
    );
  };

  const TemplatePreviewContent = () => {
    const normalizeImageSrc = (img: any): string => {
      if (!img) return "/placeholder.svg";
      if (typeof img === "string") return img;
      const url = img?.url;
      if (typeof url === "string") return url;
      const file = (img as any)?.file || img;
      if (typeof File !== "undefined" && file instanceof File)
        return URL.createObjectURL(file);
      return "/placeholder.svg";
    };
    const [previewState, setPreviewState] = useState({
      menuOpen: false,
      activePage: "home",
      hoveredItem: null,
      openHoursExpanded: false,
      orderStage: "select" as "select" | "cart" | "payment" | "done",
      showCartSidebar: true,
      mapView: false,
      sortMode: "popularity" as "popularity" | "price",
      activeCategory: "all",
    });

    const getBusinessName = () => {
      if (formData.businessName) return formData.businessName;
      // Template-specific business names
      const templateNames = {
        minimalist: "Simple",
        modern: "FLUX",
        stylish: "Style",
        cozy: "Cozy",
      };
      const selectedId =
        currentStep === 0
          ? previewTemplateId || formData.template
          : formData.template;
      return templateNames[selectedId] || "Your Business";
    };

    // Helper function for font size classes
    const getFontSizeClass = (baseSize: string) => {
      const sizeMap = {
        small: {
          "text-xs": "text-xs",
          "text-sm": "text-xs",
          "text-base": "text-sm",
          "text-lg": "text-base",
          "text-xl": "text-lg",
          "text-2xl": "text-xl",
        },
        medium: {
          "text-xs": "text-xs",
          "text-sm": "text-sm",
          "text-base": "text-base",
          "text-lg": "text-lg",
          "text-xl": "text-xl",
          "text-2xl": "text-2xl",
        },
        large: {
          "text-xs": "text-sm",
          "text-sm": "text-base",
          "text-base": "text-lg",
          "text-lg": "text-xl",
          "text-xl": "text-2xl",
          "text-2xl": "text-3xl",
        },
      };
      return sizeMap[styles.userFontSize]
        ? sizeMap[styles.userFontSize][baseSize] || baseSize
        : baseSize;
    };

    const getBusinessIcon = () => {
      switch (formData.businessType) {
        case "cafe":
          return <Coffee className="w-4 h-4" />;
        case "restaurant":
          return <Utensils className="w-4 h-4" />;
        case "bar":
          return <Star className="w-4 h-4" />;
        default:
          return <Building className="w-4 h-4" />;
      }
    };

    // Helper to convert hex like #2563EB to rgba(a)
    const toRgba = (hex: string, alpha = 1) => {
      if (!hex) return `rgba(0,0,0,${alpha})`;
      let h = hex.replace("#", "");
      if (h.length === 3) {
        h = h
          .split("")
          .map((c) => c + c)
          .join("");
      }
      const int = parseInt(h, 16);
      const r = (int >> 16) & 255;
      const g = (int >> 8) & 255;
      const b = int & 255;
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    // Template-specific content
    const selectedId =
      currentStep === 0
        ? previewTemplateId || formData.template
        : formData.template;

    // i18n dictionary and helper for preview UI
    const dict = {
      en: {
        home: "Home",
        menu: "Menu",
        gallery: "Gallery",
        about: "About",
        reservations: "Reservations",
        contact: "Contact",
        aboutUs: "About Us",
        followUs: "Follow Us",
        settings: "Settings",
        pageNotAvailable: "Page Not Available",
        contactInfoPlaceholder: "Contact information will appear here",
        cart: "Cart",
        clearCart: "Clear Cart",
        checkout: "Checkout",
        total: "Total:",
      },
      de: {
        home: "Startseite",
        menu: "Speisekarte",
        gallery: "Galerie",
        about: "Über uns",
        reservations: "Reservierungen",
        contact: "Kontakt",
        aboutUs: "Über uns",
        followUs: "Folge uns",
        settings: "Einstellungen",
        pageNotAvailable: "Seite nicht verfügbar",
        contactInfoPlaceholder: "Kontaktinformationen erscheinen hier",
        cart: "Warenkorb",
        clearCart: "Leeren",
        checkout: "Zur Kasse",
        total: "Summe:",
      },
    } as const;
    const t = (key: keyof (typeof dict)["en"]) =>
      (dict as any)[formData.language]?.[key] || dict.en[key];
    const pageLabel = (id: string) => t(id as any);

    const templateContent = {
      minimalist: {
        items: [
          {
            name: "Coffee",
            description: "Fresh brewed",
            price: "3.50",
            emoji: "☕",
          },
          {
            name: "Sandwich",
            description: "Daily special",
            price: "7.00",
            emoji: "🥪",
          },
          {
            name: "Salad",
            description: "Mixed greens",
            price: "6.50",
            emoji: "���",
          },
        ],
        tagline: "Simple. Fresh. Good.",
        hours: "8:00 - 18:00",
        special: "Daily Fresh",
      },
      modern: {
        items: [
          {
            name: "Signature Latte",
            description: "Premium espresso with oat milk",
            price: "5.50",
          },
          {
            name: "Energy Bowl",
            description: "Quinoa, avocado, fresh greens",
            price: "12.00",
          },
          {
            name: "Urban Burger",
            description: "Plant-based patty, local ingredients",
            price: "15.00",
          },
        ],
        tagline: "Bold Flavors, Bright Future",
        hours: "7:00 - 22:00",
        special: "Vibrant Experience",
      },
      stylish: {
        items: [
          {
            name: "Organic Latte",
            description: "Fair trade beans, oat milk",
            price: "4.75",
            emoji: "��",
          },
          {
            name: "Fresh Wrap",
            description: "Seasonal vegetables, herbs",
            price: "8.50",
            emoji: "����",
          },
          {
            name: "Green Smoothie",
            description: "Spinach, apple, ginger",
            price: "6.00",
            emoji: "��",
          },
        ],
        tagline: "Fresh, Healthy, Natural",
        hours: "6:30 - 19:30",
        special: "100% Organic",
      },
      cozy: {
        items: [
          {
            name: "Grandma's Pie",
            description: "Warm slice with seasonal fruit",
            price: "7.50",
          },
          {
            name: "House Lemonade",
            description: "Freshly squeezed, lightly sweetened",
            price: "12.00",
          },
          {
            name: "House Roast",
            description: "Slow-brewed, comforting aroma",
            price: "6.00",
          },
        ],
        tagline: "Enter the Digital Realm",
        hours: "24/7 Online",
        special: "Gaming Zone Active",
      },
    };

    const currentContent =
      templateContent[selectedId] || templateContent["minimalist"];

    // Offers helper for badges
    const offerNames = (formData.offersEnabled ? formData.offers || [] : [])
      .flatMap((o: any) => String(o.products || "").split(","))
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    // Ensure selectedIdForSwitch is available for styling
    const selectedIdForSwitch =
      currentStep === 0
        ? previewTemplateId || formData.template
        : formData.template;

    // Compose runtime styles from template defaults and user selections
    const themeOverride =
      (formData.templateThemes &&
        selectedIdForSwitch &&
        formData.templateThemes[selectedIdForSwitch]) ||
      {};
    const selectedTemplateDef = templates.find(
      (t) => t.id === selectedIdForSwitch,
    );
    const baseTemplateStyle = selectedTemplateDef
      ? selectedTemplateDef.style
      : templates[0].style;
    const isDark = formData.themeMode === "dark";
    const forcedTextColor =
      selectedIdForSwitch === "modern"
        ? "#FFFFFF"
        : isDark
          ? "#F8FAFC"
          : formData.fontColor;
    const styles = {
      ...baseTemplateStyle,
      userPrimary:
        themeOverride.primary ||
        formData.primaryColor ||
        (baseTemplateStyle as any).accent,
      userSecondary: isDark
        ? "#0F172A"
        : themeOverride.secondary ||
          formData.secondaryColor ||
          (baseTemplateStyle as any).secondary,
      userFontColor: themeOverride.text || forcedTextColor,
      userFontSize: formData.fontSize,
      userBackground: isDark
        ? "#0B1020"
        : themeOverride.background ||
          formData.backgroundColor ||
          (baseTemplateStyle as any).background,
    };

    const LogoDisplay = () => {
      if (formData.logo) {
        return (
          <img
            src={
              typeof formData.logo === "string"
                ? formData.logo
                : URL.createObjectURL(formData.logo)
            }
            alt="Business logo"
            className="w-6 h-6 object-contain rounded"
            style={{ color: styles.userPrimary }}
          />
        );
      }
      return getBusinessIcon();
    };

    // Dropdown menu toggle
    const toggleMenu = () => {
      setPreviewState((prev) => ({ ...prev, menuOpen: !prev.menuOpen }));
    };

    const navigateToPage = (page: string) => {
      const id = String(page).toLowerCase();
      setPreviewState((prev) => ({
        ...prev,
        activePage: id,
        menuOpen: false,
      }));
      setShowCart(false);
    };

    // Fetch Instagram photos when instagram sync is enabled and a profile URL exists
    useEffect(() => {
      // let cancelled = false;
      // const tryFetchInstagram = async () => {
      //   if (!formData.instagramSync) return;
      //   const profileUrl = formData.socialMedia?.instagram;
      //   if (!profileUrl) return;
      //   try {
      //     const resp = await fetch(
      //       `/api/instagram?profileUrl=${encodeURIComponent(profileUrl)}`,
      //     );
      //     if (!resp.ok) return;
      //     const data = await resp.json();
      //     if (cancelled) return;
      //     if (Array.isArray(data) && data.length > 0) {
      //       // Map to gallery format expected by configurator
      //       const updated = data.map((src: string) => ({
      //         url: src,
      //         alt: "Instagram photo",
      //       }));
      //       updateFormData("gallery", updated);
      //     }
      //   } catch (e) {
      //     // ignore fetch errors softly
      //     console.warn("Instagram fetch failed:", e);
      //   }
      // };
      // tryFetchInstagram();
      // return () => {
      //   cancelled = true;
      // };
    }, [formData.instagramSync, formData.socialMedia?.instagram]);

    if (!selectedIdForSwitch) {
      return (
        <div className="h-full flex items-center justify-center bg-gray-50">
          <div className="text-center">
            <Palette className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-xs text-gray-500">Choose a template</p>
          </div>
        </div>
      );
    }

    const fontClass =
      fontOptions.find((f) => f.id === formData.fontFamily)?.class ||
      "font-sans";

    // Always include Home in overlay menus
    const menuPages = useMemo(() => {
      const set = new Set<string>([
        "home",
        ...(formData.selectedPages || []),
        ...(formData.offerPageEnabled ? ["offers"] : []),
        "settings",
      ]);
      return Array.from(set);
    }, [formData.selectedPages, formData.offerPageEnabled]);

    // Template-aware page rendering
    // Product modal state
    const [productModalOpen, setProductModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
    const [selectedQty, setSelectedQty] = useState<number>(1);
    const [showArrowHint, setShowArrowHint] = useState(true);

    const openProductModal = (item: any) => {
      setSelectedProduct(item);
      setSelectedQty(1);
      setShowArrowHint(true);
      setProductModalOpen(true);
      setTimeout(() => setShowArrowHint(false), 1800);
    };

    const renderPageContent = () => {
      const getTemplateStyles = () => {
        switch (selectedIdForSwitch) {
          case "minimalist":
            return {
              page: "p-4 pt-6",
              title: "text-lg font-medium mb-4 text-center text-black",
              itemCard: "py-2 border-b border-gray-200 last:border-b-0",
              itemName: "font-medium text-sm text-black",
              itemDesc: "text-xs text-gray-600",
              itemPrice: "font-medium text-sm text-black",
              galleryItem:
                "aspect-square bg-gray-100 rounded flex items-center justify-center",
              aboutLogo:
                "w-16 h-16 mx-auto bg-gray-100 rounded flex items-center justify-center",
              contactIcon: "w-4 h-4 text-gray-600",
              homeCard:
                "bg-gray-50 rounded p-2 text-center border border-gray-100",
            };
          case "modern":
            return {
              page: "p-4 pt-6",
              title:
                "text-lg font-bold mb-4 text-center text-white drop-shadow-lg",
              itemCard:
                "bg-white/25 backdrop-blur-md rounded-2xl p-4 border border-white/40 shadow-xl",
              itemName: "font-bold text-sm text-white drop-shadow-md",
              itemDesc: "text-xs text-white/90 drop-shadow-sm",
              itemPrice: "font-bold text-sm text-blue-200 drop-shadow-md",
              galleryItem:
                "aspect-[4/3] bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/40",
              aboutLogo:
                "w-16 h-16 mx-auto bg-white/30 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/40",
              contactIcon: "w-4 h-4 text-blue-200 drop-shadow-sm",
              homeCard:
                "bg-white/25 backdrop-blur-md rounded-2xl p-2 text-center border border-white/40 shadow-lg",
            };
          case "stylish":
            return {
              page: "p-4 pt-6",
              title: "text-lg font-semibold mb-4 text-center text-slate-800",
              itemCard:
                "bg-white rounded-lg p-3 shadow-sm border border-emerald-200",
              itemName: "font-semibold text-sm text-slate-800",
              itemDesc: "text-xs text-slate-600",
              itemPrice: "font-semibold text-sm text-emerald-600",
              galleryItem:
                "aspect-square bg-emerald-100 rounded-lg flex items-center justify-center",
              aboutLogo:
                "w-16 h-16 mx-auto bg-emerald-100 rounded-lg flex items-center justify-center",
              contactIcon: "w-4 h-4 text-emerald-600",
              homeCard:
                "bg-white rounded-lg p-2 text-center border border-emerald-200",
            };
          case "cozy":
            return {
              page: "p-4 pt-6 bg-orange-50",
              title: "text-lg font-semibold mb-4 text-center text-amber-900",
              itemCard:
                "bg-white rounded-xl p-4 border border-amber-200 shadow-sm",
              itemName: "font-semibold text-sm text-amber-900",
              itemDesc: "text-xs text-amber-700",
              itemPrice: "font-bold text-sm text-orange-600",
              galleryItem:
                "aspect-square bg-amber-50 rounded-xl flex items-center justify-center border border-amber-200",
              aboutLogo:
                "w-16 h-16 mx-auto bg-amber-100 rounded-xl flex items-center justify-center border border-amber-200",
              contactIcon: "w-4 h-4 text-orange-600",
              homeCard:
                "bg-white rounded-xl p-3 text-center border border-amber-200",
            };
          default:
            return {
              page: "p-4 pt-6",
              title: "text-lg font-bold mb-4 text-center",
              itemCard: "bg-white/90 backdrop-blur rounded-lg p-3 shadow-sm",
              itemName: "font-semibold text-sm",
              itemDesc: "text-xs text-gray-600",
              itemPrice: "font-bold text-sm",
              galleryItem:
                "aspect-square bg-gray-200 rounded-lg flex items-center justify-center",
              aboutLogo:
                "w-16 h-16 mx-auto bg-gray-200 rounded-full flex items-center justify-center",
              contactIcon: "w-4 h-4 text-gray-600",
              homeCard: "bg-white/10 backdrop-blur rounded-lg p-2 text-center",
            };
        }
      };

      const templateStyles = getTemplateStyles();

      switch (previewState.activePage) {
        case "settings":
          return (
            <div className={templateStyles.page}>
              <h2 className={templateStyles.title}>{t("settings")}</h2>
              <div className="space-y-4">
                <div>
                  <h3 className={templateStyles.itemName}>Language</h3>
                  <div className="mt-2 inline-flex rounded-lg border overflow-hidden">
                    <button
                      className={`px-3 py-1 text-sm ${formData.language === "en" ? "bg-gray-100" : ""}`}
                      onClick={() => updateFormData("language", "en")}
                    >
                      EN
                    </button>
                    <button
                      className={`px-3 py-1 text-sm ${formData.language === "de" ? "bg-gray-100" : ""}`}
                      onClick={() => updateFormData("language", "de")}
                    >
                      DE
                    </button>
                  </div>
                </div>
                <div>
                  <h3 className={templateStyles.itemName}>Theme</h3>
                  <div className="mt-2 inline-flex rounded-lg border overflow-hidden">
                    <button
                      className={`px-3 py-1 text-sm ${formData.themeMode === "light" ? "bg-gray-100" : ""}`}
                      onClick={() => updateFormData("themeMode", "light")}
                    >
                      Light
                    </button>
                    <button
                      className={`px-3 py-1 text-sm ${formData.themeMode === "dark" ? "bg-gray-100" : ""}`}
                      onClick={() => updateFormData("themeMode", "dark")}
                    >
                      Dark
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        case "offers":
          return (
            <div className={templateStyles.page}>
              <h2 className={templateStyles.title}>Offers</h2>
              <div className="space-y-3">
                {(formData.offers || []).length === 0 && (
                  <div className="text-center py-8">
                    <p className={templateStyles.itemDesc}>
                      No offers yet. Add offers in More features → Offers.
                    </p>
                  </div>
                )}
                {(formData.offers || []).map((o: any, i: number) => (
                  <div
                    key={i}
                    className={`${templateStyles.itemCard} flex items-center gap-3`}
                  >
                    {o.image && (
                      <img
                        src={normalizeImageSrc(o.image)}
                        alt={o.name}
                        className={`w-16 h-16 object-cover ${formData.offerBanner?.shape === "pill" ? "rounded-full" : "rounded-lg"}`}
                      />
                    )}
                    <div className="flex-1">
                      <div className={templateStyles.itemName}>{o.name}</div>
                      {o.description && (
                        <div className={templateStyles.itemDesc}>
                          {o.description}
                        </div>
                      )}
                    </div>
                    {o.price && (
                      <div
                        className={templateStyles.itemPrice}
                        style={{ color: styles.userPrimary }}
                      >
                        ${o.price}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        case "menu":
          if (!formData.selectedPages.includes("menu")) {
            return (
              <div className={templateStyles.page}>
                <div className="text-center py-8">
                  <h2 className={templateStyles.title}>Page Not Available</h2>
                  <p className={templateStyles.itemDesc}>
                    {t("pageNotAvailable")}
                  </p>
                </div>
              </div>
            );
          }

          // Use user's actual menu items if they exist, otherwise show template items
          const menuItemsToShow =
            formData.menuItems.length > 0
              ? formData.menuItems
              : currentContent.items;

          return (
            <div className={templateStyles.page}>
              <h2 className={templateStyles.title}>{t("menu")}</h2>
              {formData.onlineStore && (
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex gap-2 overflow-x-auto">
                    <button
                      className={`px-2 py-1 text-xs border rounded ${previewState.activeCategory === "all" ? "bg-gray-100" : ""}`}
                      onClick={() =>
                        setPreviewState((p) => ({
                          ...p,
                          activeCategory: "all",
                        }))
                      }
                    >
                      All
                    </button>
                    {(formData.categories || []).map((c: string) => (
                      <button
                        key={c}
                        className={`px-2 py-1 text-xs border rounded ${previewState.activeCategory === c ? "bg-gray-100" : ""}`}
                        onClick={() =>
                          setPreviewState((p) => ({ ...p, activeCategory: c }))
                        }
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <label>Sort</label>
                    <select
                      className="border rounded px-2 py-1"
                      value={previewState.sortMode}
                      onChange={(e) =>
                        setPreviewState((p) => ({
                          ...p,
                          sortMode: e.target.value as any,
                        }))
                      }
                    >
                      <option value="popularity">Popularity</option>
                      <option value="price">Price</option>
                    </select>
                    <label className="inline-flex items-center gap-1">
                      <input
                        type="checkbox"
                        checked={previewState.mapView}
                        onChange={(e) =>
                          setPreviewState((p) => ({
                            ...p,
                            mapView: e.target.checked,
                          }))
                        }
                      />
                      <span>Map view</span>
                    </label>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                {menuItemsToShow
                  .filter(
                    (it: any) =>
                      previewState.activeCategory === "all" ||
                      (it.category || "Other") === previewState.activeCategory,
                  )
                  .sort((a: any, b: any) =>
                    previewState.sortMode === "price"
                      ? parseFloat(a.price) - parseFloat(b.price)
                      : 0,
                  )
                  .map((item, index) =>
                    selectedIdForSwitch === "minimalist" ? (
                      <details
                        key={index}
                        className={`${templateStyles.itemCard} cursor-pointer open:shadow-md`}
                      >
                        <summary
                          className="flex items-center justify-between list-none"
                          onClick={(e) => {
                            e.preventDefault();
                            openProductModal(item);
                          }}
                        >
                          <h3 className={templateStyles.itemName}>
                            {item.name}
                          </h3>
                          <span
                            className={templateStyles.itemPrice}
                            style={{ color: styles.userPrimary }}
                          >
                            ${item.price}
                          </span>
                        </summary>
                        <div className="mt-2 text-left">
                          <p className={templateStyles.itemDesc}>
                            {item.description}
                            {formData.showStockLevels &&
                              typeof item.stock !== "undefined" && (
                                <span className="ml-2 text-[10px]">
                                  Stock: {item.stock}
                                </span>
                              )}
                          </p>
                        </div>
                      </details>
                    ) : (
                      <div
                        key={index}
                        className={templateStyles.itemCard}
                        onClick={() => openProductModal(item)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-2">
                            <span className="hidden">
                              {item.emoji || "🍽��"}
                            </span>
                            <div>
                              <h3 className={templateStyles.itemName}>
                                {item.name}
                                {formData.offersEnabled &&
                                  offerNames.some((n) =>
                                    item.name.toLowerCase().includes(n),
                                  ) && (
                                    <span className="ml-2 text-[10px] text-white bg-red-500 rounded px-1">
                                      Offer
                                    </span>
                                  )}
                              </h3>
                              <p className={templateStyles.itemDesc}>
                                {item.description}
                                {formData.showStockLevels &&
                                  typeof item.stock !== "undefined" && (
                                    <span className="ml-2 text-[10px]">
                                      Stock: {item.stock}
                                    </span>
                                  )}
                              </p>
                            </div>
                          </div>
                          <span
                            className={templateStyles.itemPrice}
                            style={{ color: styles.userPrimary }}
                          >
                            ${item.price}
                          </span>
                          {formData.onlineOrdering && (
                            <button
                              className="ml-2 w-6 h-6 bg-teal-500 hover:bg-teal-600 text-white rounded-full flex items-center justify-center text-xs transition-transform hover:scale-110"
                              onClick={(e) => {
                                e.stopPropagation();
                                addToCart(item);
                              }}
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    ),
                  )}
                {menuItemsToShow.length === 0 && (
                  <div className="text-center py-8">
                    <p className={templateStyles.itemDesc}>
                      No menu items added yet. Add items in the menu step to see
                      them here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          );

        case "gallery":
          if (!formData.selectedPages.includes("gallery")) {
            return (
              <div className={templateStyles.page}>
                <div className="text-center py-8">
                  <h2 className={templateStyles.title}>Page Not Available</h2>
                  <p className={templateStyles.itemDesc}>
                    {t("pageNotAvailable")}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div className={templateStyles.page}>
              <h2 className={templateStyles.title}>{t("gallery")}</h2>
              <div className="grid grid-cols-2 gap-2">
                {formData.gallery.length > 0
                  ? formData.gallery.map((image, index) => (
                      <div
                        key={index}
                        className={
                          templateStyles.galleryItem + " overflow-hidden"
                        }
                      >
                        <img
                          src={normalizeImageSrc(image)}
                          alt={image.alt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))
                  : [1, 2, 3, 4].map((i) => (
                      <div key={i} className={templateStyles.galleryItem}>
                        <Camera className="w-6 h-6 text-gray-400" />
                        <p className="text-xs text-gray-500 mt-1">Photo {i}</p>
                      </div>
                    ))}
              </div>
              {formData.gallery.length === 0 && (
                <div className="text-center py-4">
                  <p className={templateStyles.itemDesc}>
                    Upload photos in the media gallery step to see them here.
                  </p>
                </div>
              )}
            </div>
          );

        case "about":
          if (!formData.selectedPages.includes("about")) {
            return (
              <div className={templateStyles.page}>
                <div className="text-center py-8">
                  <h2 className={templateStyles.title}>Page Not Available</h2>
                  <p className={templateStyles.itemDesc}>
                    {t("pageNotAvailable")}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div className={templateStyles.page}>
              <h2 className={templateStyles.title}>{t("aboutUs")}</h2>
              <div className="text-center space-y-3">
                <div
                  className={templateStyles.aboutLogo}
                  style={{ backgroundColor: `${styles.userPrimary}20` }}
                >
                  <div style={{ color: styles.userPrimary }}>
                    <LogoDisplay />
                  </div>
                </div>
                <div>
                  <h3 className={templateStyles.itemName}>
                    {getBusinessName()}
                  </h3>
                  <p className={templateStyles.itemDesc}>
                    {formData.slogan || currentContent.tagline}
                  </p>
                  <p className={templateStyles.itemDesc + " mt-2"}>
                    {formData.uniqueDescription || currentContent.special}
                  </p>
                  {formData.location && (
                    <div className="flex items-center justify-center mt-2 space-x-2">
                      <MapPin className={templateStyles.contactIcon} />
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${templateStyles.itemDesc} underline`}
                      >
                        {formData.location}
                      </a>
                    </div>
                  )}
                </div>
              </div>
              {formData.teamArea && (formData.teamMembers || []).length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-2">
                  {formData.teamMembers.map((m: any, i: number) => (
                    <div
                      key={i}
                      className="p-2 bg-white rounded border hover:shadow"
                    >
                      <div className="font-semibold text-sm">{m.name}</div>
                      <div className="text-xs text-gray-600">{m.role}</div>
                      <div className="text-xs">{m.status}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );

        case "contact":
          if (!formData.selectedPages.includes("contact")) {
            return (
              <div className={templateStyles.page}>
                <div className="text-center py-8">
                  <h2 className={templateStyles.title}>Page Not Available</h2>
                  <p className={templateStyles.itemDesc}>
                    {t("pageNotAvailable")}
                  </p>
                </div>
              </div>
            );
          }
          return (
            <div className={templateStyles.page}>
              <h2 className={templateStyles.title}>{t("contact")}</h2>
              <div className="space-y-3">
                {/* Phone */}
                {formData.contactMethods?.find((c) => c.type === "phone") && (
                  <div className="flex items-center space-x-2">
                    <Phone className={templateStyles.contactIcon} />
                    <span className={templateStyles.itemDesc}>
                      {formData.contactMethods.find((c) => c.type === "phone")
                        ?.value || "+1 (555) 123-4567"}
                    </span>
                  </div>
                )}

                {/* Email */}
                {formData.contactMethods?.find((c) => c.type === "email") && (
                  <div className="flex items-center space-x-2">
                    <Mail className={templateStyles.contactIcon} />
                    <span className={templateStyles.itemDesc}>
                      {
                        formData.contactMethods.find((c) => c.type === "email")
                          ?.value
                      }
                    </span>
                  </div>
                )}

                {/* Location */}
                {formData.location && (
                  <div className="flex items-center space-x-2">
                    <MapPin className={templateStyles.contactIcon} />
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${templateStyles.itemDesc} underline`}
                    >
                      {formData.location}
                    </a>
                  </div>
                )}

                {/* Opening Hours */}
                {formData.openingHours &&
                  Object.keys(formData.openingHours).length > 0 && (
                    <div className="flex items-center space-x-2">
                      <Clock className={templateStyles.contactIcon} />
                      <span
                        className={templateStyles.itemDesc}
                        style={{
                          color:
                            formData.openingHoursTextColor ||
                            styles.userFontColor,
                        }}
                      >
                        {currentContent.hours}
                      </span>
                    </div>
                  )}

                {/* Social Media */}
                {formData.socialMedia &&
                  (Object.keys(formData.socialMedia).length > 0 ||
                    formData.instagramSync) && (
                    <div className="mt-4">
                      <h3 className={templateStyles.itemName + " mb-2"}>
                        {t("followUs")}
                      </h3>
                      <div className="flex space-x-3">
                        {formData.socialMedia.instagram && (
                          <a
                            href={formData.socialMedia.instagram}
                            className="flex items-center space-x-1 text-pink-600 hover:text-pink-700"
                          >
                            <Instagram className="w-4 h-4" />
                            <span className="text-xs">Instagram</span>
                          </a>
                        )}
                        {formData.socialMedia.facebook && (
                          <a
                            href={formData.socialMedia.facebook}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-700"
                          >
                            <Facebook className="w-4 h-4" />
                            <span className="text-xs">Facebook</span>
                          </a>
                        )}
                        {formData.instagramSync &&
                          !formData.socialMedia.instagram && (
                            <div className="flex items-center space-x-1 text-pink-600">
                              <Instagram className="w-4 h-4" />
                              <span className="text-xs">Instagram</span>
                            </div>
                          )}
                      </div>
                    </div>
                  )}

                {/* Default fallback if no contact info */}
                {(!formData.contactMethods ||
                  formData.contactMethods.length === 0) &&
                  !formData.location &&
                  !formData.socialMedia && (
                    <div className="text-center py-4">
                      <p className={templateStyles.itemDesc}>
                        {t("contactInfoPlaceholder")}
                      </p>
                    </div>
                  )}
              </div>
            </div>
          );

        default: // home
          return (
            <div className={templateStyles.page}>
              {/* Loyalty bar is now at the bottom */}
              {formData.showHomeHero && (
                <div className="text-center mb-4">
                  <div className={templateStyles.aboutLogo + " mb-2"}>
                    <LogoDisplay />
                  </div>
                  <h1 className={templateStyles.itemName + " text-base"}>
                    {getBusinessName()}
                  </h1>
                  <p className={templateStyles.itemDesc}>
                    {formData.slogan || currentContent.tagline}
                  </p>
                </div>
              )}

              {(formData.offers || []).length > 0 && (
                <OffersBanner
                  offers={formData.offers}
                  styles={styles}
                  offerBanner={formData.offerBanner}
                />
              )}

              <div className={`mb-4 grid grid-cols-2 gap-2`}>
                {(formData.menuItems.length > 0
                  ? formData.menuItems
                  : currentContent.items
                )
                  .slice(0, 4)
                  .map((item, index) => (
                    <div
                      key={index}
                      className={`${templateStyles.homeCard} relative cursor-pointer`}
                      onClick={() => openProductModal(item)}
                    >
                      <div className="hidden">{item.emoji || "🍽️"}</div>
                      {formData.homepageDishImageVisibility !== "hidden" && (
                        <img
                          src={normalizeImageSrc(item.image)}
                          alt={item.name}
                          className="w-full h-20 object-cover rounded-lg mb-2"
                        />
                      )}
                      <h3
                        className={
                          templateStyles.itemName + " text-xs truncate"
                        }
                      >
                        {item.name}
                      </h3>
                      <p
                        className={templateStyles.itemPrice + " text-xs"}
                        style={{ color: styles.userPrimary }}
                      >
                        ${item.price}
                      </p>
                      {/* Show + icon if ordering is enabled */}
                      {formData.onlineOrdering && (
                        <button
                          className="absolute top-1 right-1 w-4 h-4 bg-teal-500 text-white rounded-full flex items-center justify-center text-xs transition-transform hover:scale-110"
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                        >
                          <Plus className="w-2 h-2" />
                        </button>
                      )}
                    </div>
                  ))}
              </div>

              {/* Reservation Button */}
              {formData.reservationsEnabled && (
                <div className="text-center mt-4">
                  <button
                    className={`px-4 py-2 text-xs font-medium transition-colors ${
                      formData.reservationButtonShape === "rounded"
                        ? "rounded-lg"
                        : formData.reservationButtonShape === "pill"
                          ? "rounded-full"
                          : "rounded-none"
                    }`}
                    style={{
                      backgroundColor: formData.reservationButtonColor,
                      color: formData.reservationButtonTextColor || "#FFFFFF",
                    }}
                    onClick={() => {
                      /* Handle reservation */
                    }}
                  >
                    <Calendar className="w-3 h-3 mr-1 inline" />
                    Reserve Table
                  </button>
                </div>
              )}

              <LoyaltyCardInline />

              {/* Small Opening Hours at Bottom (click to expand) */}
              {formData.openingHours &&
                Object.keys(formData.openingHours).length > 0 && (
                  <div className="text-center mt-6 pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-center space-x-2 mb-2">
                      <Clock
                        className="w-3 h-3"
                        style={{
                          color:
                            formData.openingHoursTextColor ||
                            styles.userFontColor,
                        }}
                      />
                      <span
                        className="text-xs font-medium"
                        style={{
                          color:
                            formData.openingHoursTextColor ||
                            styles.userFontColor,
                        }}
                      >
                        Opening Hours
                      </span>
                    </div>

                    <div
                      className="text-xs space-y-0.5"
                      style={{
                        color:
                          formData.openingHoursTextColor ||
                          styles.userFontColor,
                        cursor: "pointer",
                      }}
                      onClick={() =>
                        setPreviewState((p) => ({
                          ...p,
                          openHoursExpanded: !p.openHoursExpanded,
                        }))
                      }
                      title="Click to expand hours"
                    >
                      {previewState.openHoursExpanded
                        ? Object.entries(formData.openingHours).map(
                            ([day, hours]) => (
                              <div
                                key={day}
                                className="flex justify-between items-center py-1 text-sm"
                              >
                                <span style={{ fontWeight: 600 }}>{day}</span>
                                <span>
                                  {hours.closed
                                    ? "Closed"
                                    : `${hours.open} - ${hours.close}`}
                                </span>
                              </div>
                            ),
                          )
                        : Object.entries(formData.openingHours)
                            .slice(0, 2)
                            .map(([day, hours]) => (
                              <div
                                key={day}
                                className="flex justify-between items-center"
                              >
                                <span>{day}</span>
                                <span>
                                  {hours.closed
                                    ? "Closed"
                                    : `${hours.open} - ${hours.close}`}
                                </span>
                              </div>
                            ))}

                      {!previewState.openHoursExpanded &&
                        Object.keys(formData.openingHours).length > 2 && (
                          <div
                            className="text-xs mt-1"
                            style={{
                              color:
                                formData.openingHoursTextColor ||
                                styles.userFontColor,
                              opacity: 0.7,
                            }}
                          >
                            +{Object.keys(formData.openingHours).length - 2}{" "}
                            more days
                          </div>
                        )}
                    </div>
                  </div>
                )}

              {/* Social Media Icons */}
              {formData.socialMedia &&
                (Object.keys(formData.socialMedia).length > 0 ||
                  formData.instagramSync) && (
                  <div className="text-center mt-4">
                    <div className="flex justify-center space-x-4">
                      {formData.socialMedia.instagram && (
                        <a
                          href={formData.socialMedia.instagram}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-pink-500 hover:text-pink-600 transition-colors"
                        >
                          <Instagram className="w-4 h-4" />
                        </a>
                      )}
                      {formData.socialMedia.facebook && (
                        <a
                          href={formData.socialMedia.facebook}
                          className="text-blue-500 hover:text-blue-600 transition-colors"
                        >
                          <Facebook className="w-4 h-4" />
                        </a>
                      )}
                      {formData.instagramSync &&
                        !formData.socialMedia.instagram && (
                          <div className="text-pink-500">
                            <Instagram className="w-4 h-4" />
                          </div>
                        )}
                    </div>
                  </div>
                )}
            </div>
          );
      }
    };

    // Ordering progress & cart sidebar (preview only)
    const OrderProgress = () => null;

    const StampCardBar = () => {
      if (!formData.loyaltyEnabled) return null;

      const target = formData.loyaltyConfig?.stampsForReward || 10;
      const deviceId = getDeviceId();
      const [have, setHave] = useState(() => {
        const savedStamps = localStorage.getItem(`stamps_${deviceId}`);
        return savedStamps ? parseInt(savedStamps, 10) : 0;
      });

      useEffect(() => {
        const handleStorageChange = () => {
          const savedStamps = localStorage.getItem(`stamps_${deviceId}`);
          setHave(savedStamps ? parseInt(savedStamps, 10) : 0);
        };
        window.addEventListener("storage", handleStorageChange);
        // also listen for local changes
        const interval = setInterval(handleStorageChange, 500);
        return () => {
          window.removeEventListener("storage", handleStorageChange);
          clearInterval(interval);
        };
      }, [deviceId]);

      const pct = (have / target) * 100;

      return (
        <div className="absolute bottom-2 left-2 right-2 bg-white p-3 border rounded-lg shadow-md z-20">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-xs font-semibold">Loyalty Card</h3>
            <span className="text-xs font-semibold">
              {have} / {target}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-teal-500 h-2 rounded-full"
              style={{ width: `${pct}%` }}
            ></div>
          </div>
        </div>
      );
    };

    const LoyaltyCardInline = () => {
      if (!formData.loyaltyEnabled) return null;
      const target = formData.loyaltyConfig?.stampsForReward || 10;
      const deviceId = getDeviceId();
      const [have, setHave] = useState(() => {
        const saved = localStorage.getItem(`stamps_${deviceId}`);
        return saved ? parseInt(saved, 10) : 0;
      });
      useEffect(() => {
        const handler = () => {
          const saved = localStorage.getItem(`stamps_${deviceId}`);
          setHave(saved ? parseInt(saved, 10) : 0);
        };
        const interval = setInterval(handler, 500);
        window.addEventListener("storage", handler);
        return () => {
          clearInterval(interval);
          window.removeEventListener("storage", handler);
        };
      }, [deviceId]);
      const pct = Math.min(100, (have / target) * 100);
      return (
        <div className="mt-4 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold">Loyalty Card</div>
            <div className="text-xs font-semibold">
              {have} / {target}
            </div>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className="h-2 rounded-full"
              style={{ width: `${pct}%`, backgroundColor: styles.userPrimary }}
            />
          </div>
        </div>
      );
    };

    const CheckoutFlow = () => {
      if (!formData.onlineOrdering) return null;

      switch (previewState.orderStage) {
        case "payment":
          return (
            <div className="absolute inset-0 bg-white z-50 p-4 flex flex-col">
              <h2 className="text-2xl font-bold mb-4">Payment</h2>
              <div className="flex-1 overflow-y-auto">
                <p className="text-lg font-semibold mb-4">Order Summary</p>
                {cartItems.map((it, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center mb-2"
                  >
                    <span>
                      {it.name} (x{it.quantity})
                    </span>
                    <span>
                      ${(parseFloat(it.price) * it.quantity).toFixed(2)}
                    </span>
                  </div>
                ))}
                <div className="border-t pt-2 mt-2 flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>${cartTotal.toFixed(2)}</span>
                </div>

                <p className="text-lg font-semibold mt-8 mb-4">
                  Payment Method
                </p>
                <div className="space-y-4">
                  {(formData.paymentOptions &&
                  formData.paymentOptions.length > 0
                    ? formData.paymentOptions
                    : ["Credit Card"]
                  ).map((option) => (
                    <Button
                      key={option}
                      className="w-full"
                      variant={option === "Credit Card" ? "default" : "outline"}
                      onClick={() =>
                        setPreviewState((p) => ({ ...p, orderStage: "done" }))
                      }
                    >
                      Pay with {option}
                    </Button>
                  ))}
                </div>
              </div>
              <Button
                variant="link"
                onClick={() => {
                  setPreviewState((p) => ({ ...p, orderStage: "select" }));
                  setShowCart(true);
                }}
              >
                Back to cart
              </Button>
            </div>
          );
        case "done":
          return (
            <div className="absolute inset-0 bg-white z-50 p-4 flex flex-col items-center justify-center text-center">
              <Check className="w-16 h-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold mb-2">Payment Successful!</h2>
              <p className="text-gray-600 mb-8">Your order has been placed.</p>
              <Button
                onClick={() => {
                  const deviceId = getDeviceId();
                  const savedStamps = localStorage.getItem(
                    `stamps_${deviceId}`,
                  );
                  const currentStamps = savedStamps
                    ? parseInt(savedStamps, 10)
                    : 0;
                  const newStamps =
                    (currentStamps +
                      cartItems.reduce((t, i) => t + i.quantity, 0)) %
                    (formData.loyaltyConfig?.stampsForReward || 10);
                  localStorage.setItem(
                    `stamps_${deviceId}`,
                    newStamps.toString(),
                  );

                  setPreviewState((p) => ({ ...p, orderStage: "select" }));
                  setCartItems([]);
                }}
              >
                Back to Menu
              </Button>
            </div>
          );
        default:
          return null;
      }
    };

    const CartSidebar = () => {
      if (!formData.onlineOrdering || !showCart) return null;

      const subtotal = cartItems.reduce(
        (t, it) => t + parseFloat(it.price) * it.quantity,
        0,
      );
      const fees = 0;
      const total = subtotal + fees;

      return (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCart(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-xs flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-3 border-b flex justify-between items-center">
              <div>
                <h3 className="text-sm font-semibold">Cart</h3>
                <p className="text-xs text-gray-500">
                  {cartItemsCount} item{cartItemsCount !== 1 ? "s" : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCart(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {cartItems.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <ShoppingBag className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-4 text-lg font-medium">Your cart is empty</p>
                  <p className="text-sm text-gray-500">
                    Add items to get started
                  </p>
                </div>
              ) : (
                cartItems.map((it, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <img
                      src={normalizeImageSrc(it.image)}
                      alt={it.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-sm text-gray-500">
                        Qty: {it.quantity}
                      </div>
                    </div>
                    <div className="font-semibold text-sm">
                      ${(parseFloat(it.price) * it.quantity).toFixed(2)}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFromCart(it.name)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
            {cartItems.length > 0 && (
              <div className="p-3 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Fees</span>
                  <span className="font-medium">${fees.toFixed(2)}</span>
                </div>
                <div className="flex items-center justify-between text-sm pt-1 border-t">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold">${total.toFixed(2)}</span>
                </div>
                <Button
                  className="w-full bg-teal-600 hover:bg-teal-700 mt-1"
                  onClick={() => {
                    setShowCart(false);
                    setTimeout(
                      () =>
                        setPreviewState((p) => ({
                          ...p,
                          orderStage: "payment",
                        })),
                      150,
                    );
                  }}
                >
                  Checkout
                </Button>
              </div>
            )}
          </motion.div>
        </motion.div>
      );
    };

    switch (selectedIdForSwitch) {
      case "minimalist":
        return (
          <div
            className={`h-full overflow-y-auto ${fontClass} relative`}
            style={{ backgroundColor: formData.backgroundColor || "#FFFFFF" }}
          >
            <CheckoutFlow />

            {/* Status Bar - Space for notch */}
            <div className="h-8 bg-white">
              {/* Empty space for Apple notch */}
            </div>

            {/* Navigation */}
            <nav className="bg-white px-4 py-4 relative z-50 border-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-6 h-6 flex items-center justify-center">
                    <LogoDisplay />
                  </div>
                  <h1
                    onClick={() => navigateToPage("home")}
                    className={`${getFontSizeClass("text-lg")} font-medium cursor-pointer`}
                    style={{
                      color:
                        selectedIdForSwitch === "modern"
                          ? "#FFFFFF"
                          : styles.userFontColor,
                    }}
                    title="Go to Home"
                  >
                    {getBusinessName()}
                  </h1>
                </div>
                <div className="flex items-center space-x-2">
                  {formData.onlineOrdering && (
                    <button
                      className="p-1 hover:bg-gray-50 rounded transition-colors relative"
                      onClick={() => setShowCart(!showCart)}
                    >
                      <ShoppingBag className="w-5 h-5 text-black dark:text-white" />
                      {cartItemsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center">
                          {cartItemsCount}
                        </span>
                      )}
                    </button>
                  )}

                  <button
                    onClick={toggleMenu}
                    className="p-1 hover:bg-gray-50 rounded transition-colors"
                    aria-label="Menu"
                  >
                    <Menu className="w-5 h-5 text-black dark:text-white" />
                  </button>
                </div>
              </div>

              {/* Dropdown Menu under header (Minimalist) */}
              {previewState.menuOpen && (
                <div className="absolute left-0 right-0 top-full bg-white/95 backdrop-blur-sm z-[60] border-t border-gray-200">
                  <div className="space-y-2 text-center py-3">
                    {menuPages.map((page) => (
                      <button
                        key={page}
                        onClick={() => navigateToPage(page)}
                        className={`w-56 mx-auto px-4 py-2 text-black hover:bg-gray-100 rounded-full transition-colors text-sm ${
                          previewState.activePage === page
                            ? "font-semibold"
                            : ""
                        }`}
                      >
                        {pageLabel(page)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </nav>

            <OrderProgress />
            {/* Content */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ backgroundColor: formData.backgroundColor || "#FFFFFF" }}
            >
              {renderPageContent()}
            </div>
            {productModalOpen && selectedProduct && (
              <div className="absolute inset-0 z-[70] flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setProductModalOpen(false)}
                />
                <div className="relative bg-white rounded-xl w-[88%] max-w-xs overflow-hidden shadow-xl">
                  <div className="relative">
                    <Carousel opts={{ loop: true }}>
                      <CarouselContent>
                        {(selectedProduct.images &&
                        selectedProduct.images.length > 0
                          ? selectedProduct.images
                          : [
                              {
                                url: normalizeImageSrc(selectedProduct.image),
                                alt: selectedProduct.name,
                              },
                            ]
                        ).map((img: any, idx: number) => (
                          <CarouselItem key={idx}>
                            <div className="aspect-[4/3] w-full bg-gray-100">
                              <img
                                src={normalizeImageSrc(img)}
                                alt={img.alt || selectedProduct.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                    {showArrowHint && (
                      <motion.div
                        initial={{ opacity: 0, x: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], x: [0, 6, 0, 0] }}
                        transition={{ duration: 1.8, ease: "easeInOut" }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-white drop-shadow"
                      >
                        <ChevronRight className="w-7 h-7" />
                      </motion.div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold">
                      {selectedProduct.name}
                    </h3>
                    {selectedProduct.description && (
                      <p className="text-sm text-gray-600">
                        {selectedProduct.description}
                      </p>
                    )}
                    <div className="text-base font-semibold text-teal-600">
                      ${parseFloat(selectedProduct.price).toFixed(2)}
                    </div>
                    {formData.onlineOrdering && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center border rounded-full overflow-hidden">
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() =>
                                setSelectedQty((q) => Math.max(1, q - 1))
                              }
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={selectedQty}
                              onChange={(e) =>
                                setSelectedQty(
                                  Math.max(1, parseInt(e.target.value || "1")),
                                )
                              }
                              className="w-12 text-center outline-none"
                            />
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() => setSelectedQty((q) => q + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <Button
                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                            onClick={() => {
                              addToCart(selectedProduct, selectedQty);
                              setProductModalOpen(false);
                            }}
                          >
                            Add to cart
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <CartSidebar />
          </div>
        );

      case "modern":
        return (
          <div
            className={`h-full overflow-y-auto text-white ${fontClass} relative`}
            style={{
              background: `linear-gradient(135deg, ${styles.userSecondary || formData.secondaryColor || "#38bdf8"} 0%, ${styles.userPrimary || formData.primaryColor || "#2563eb"} 50%, ${styles.userSecondary || formData.secondaryColor || "#1e40af"} 100%)`,
            }}
          >
            <CheckoutFlow />

            {/* Status Bar - Space for notch */}
            <div className="h-8 bg-white/10">
              {/* Empty space for Apple notch */}
            </div>

            {/* Navigation */}
            <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 px-4 py-3 relative z-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <LogoDisplay />
                  </div>
                  <h1
                    className="text-lg font-bold text-white cursor-pointer"
                    onClick={() => navigateToPage("home")}
                    title="Go to Home"
                  >
                    {getBusinessName()}
                  </h1>
                </div>
                <div className="flex items-center space-x-2">
                  {formData.onlineOrdering && (
                    <button
                      className="p-2 hover:bg-white/10 rounded-xl transition-colors relative"
                      onClick={() => setShowCart(!showCart)}
                    >
                      <ShoppingBag className="w-5 h-5 text-white" />
                      {cartItemsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center">
                          {cartItemsCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={toggleMenu}
                    className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                    aria-label="Menu"
                  >
                    <Menu className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Full-screen Menu */}
              {previewState.menuOpen && (
                <div className="absolute inset-0 z-[60] flex items-start justify-center">
                  <div
                    className="absolute inset-0 bg-black/20"
                    onClick={toggleMenu}
                  />
                  <div
                    className="relative w-full max-w-none p-6 pt-6 backdrop-blur-xl ring-1 ring-white/10"
                    style={{
                      background: `linear-gradient(135deg, ${toRgba(styles.userSecondary || "#38bdf8", 0.65)} 0%, ${toRgba(styles.userPrimary || "#2563eb", 0.65)} 50%, ${toRgba(styles.userSecondary || "#1e40af", 0.65)} 100%)`,
                      borderTop: "1px solid rgba(255,255,255,0.15)",
                      color: "#ffffff",
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-md bg-white/15 flex items-center justify-center">
                          <LogoDisplay />
                        </div>
                        <span className="text-sm font-semibold">
                          {getBusinessName()}
                        </span>
                      </div>
                      <button
                        onClick={toggleMenu}
                        className="p-2 rounded-md hover:bg-white/10"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {menuPages.map((page) => {
                        const isActive = previewState.activePage === page;
                        return (
                          <button
                            key={page}
                            onClick={() => navigateToPage(page)}
                            className="w-full text-left px-4 py-3 text-sm font-semibold rounded-xl border"
                            style={{
                              backgroundColor: isActive
                                ? toRgba(styles.userPrimary || "#2563eb", 0.18)
                                : "rgba(255,255,255,0.06)",
                              borderColor: "rgba(255,255,255,0.12)",
                              color: "#ffffff",
                            }}
                          >
                            {pageLabel(page)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </nav>

            <OrderProgress />
            {/* Content */}
            <div className="flex-1 overflow-y-auto">{renderPageContent()}</div>
            {productModalOpen && selectedProduct && (
              <div className="absolute inset-0 z-[70] flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setProductModalOpen(false)}
                />
                <div className="relative bg-white rounded-xl w-[88%] max-w-xs overflow-hidden shadow-xl">
                  <div className="relative">
                    <Carousel opts={{ loop: true }}>
                      <CarouselContent>
                        {(selectedProduct.images &&
                        selectedProduct.images.length > 0
                          ? selectedProduct.images
                          : [
                              {
                                url: normalizeImageSrc(selectedProduct.image),
                                alt: selectedProduct.name,
                              },
                            ]
                        ).map((img: any, idx: number) => (
                          <CarouselItem key={idx}>
                            <div className="aspect-[4/3] w-full bg-gray-100">
                              <img
                                src={normalizeImageSrc(img)}
                                alt={img.alt || selectedProduct.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                    {showArrowHint && (
                      <motion.div
                        initial={{ opacity: 0, x: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], x: [0, 6, 0, 0] }}
                        transition={{ duration: 1.8, ease: "easeInOut" }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-white drop-shadow"
                      >
                        <ChevronRight className="w-7 h-7" />
                      </motion.div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold">
                      {selectedProduct.name}
                    </h3>
                    {selectedProduct.description && (
                      <p className="text-sm text-gray-600">
                        {selectedProduct.description}
                      </p>
                    )}
                    <div className="text-base font-semibold text-teal-600">
                      ${parseFloat(selectedProduct.price).toFixed(2)}
                    </div>
                    {formData.onlineOrdering && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center border rounded-full overflow-hidden">
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() =>
                                setSelectedQty((q) => Math.max(1, q - 1))
                              }
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={selectedQty}
                              onChange={(e) =>
                                setSelectedQty(
                                  Math.max(1, parseInt(e.target.value || "1")),
                                )
                              }
                              className="w-12 text-center outline-none"
                            />
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() => setSelectedQty((q) => q + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <Button
                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                            onClick={() => {
                              addToCart(selectedProduct, selectedQty);
                              setProductModalOpen(false);
                            }}
                          >
                            Add to cart
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <CartSidebar />
          </div>
        );

      case "stylish":
        return (
          <div
            className={`h-full overflow-y-auto ${fontClass} relative`}
            style={{
              background:
                formData.backgroundType === "gradient"
                  ? `linear-gradient(135deg, ${formData.primaryColor} 0%, ${formData.secondaryColor} 100%)`
                  : styles.userBackground || "#ffffff",
            }}
          >
            <CheckoutFlow />

            {/* Status Bar - Space for notch */}
            <div
              className="h-8"
              style={{ backgroundColor: styles.userSecondary || "#ffffff" }}
            >
              {/* Empty space for Apple notch */}
            </div>

            {/* Navigation */}
            <nav
              className="px-4 py-4 relative z-50 shadow-sm border-b"
              style={{
                backgroundColor: styles.userSecondary || "#ffffff",
                borderColor: (styles.userPrimary || "#000000") + "20",
                color: styles.userFontColor,
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor: styles.userPrimary
                        ? `${styles.userPrimary}20`
                        : "#f0f0f0",
                      border: `1px solid ${styles.userPrimary || "#eee"}`,
                    }}
                  >
                    <LogoDisplay />
                  </div>
                  <h1
                    onClick={() => navigateToPage("home")}
                    className="text-lg font-semibold cursor-pointer"
                    style={{ color: styles.userFontColor }}
                    title="Go to Home"
                  >
                    {getBusinessName()}
                  </h1>
                </div>
                <div className="flex items-center space-x-2">
                  {formData.onlineOrdering && (
                    <button
                      className="p-2 rounded-lg transition-colors relative"
                      onClick={() => setShowCart(!showCart)}
                      style={{
                        border: `1px solid ${styles.userPrimary || "transparent"}`,
                        color: styles.userFontColor,
                        backgroundColor: "transparent",
                      }}
                    >
                      <ShoppingBag
                        className="w-5 h-5"
                        style={{ color: styles.userFontColor }}
                      />
                      {cartItemsCount > 0 && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-teal-500 text-white text-xs rounded-full flex items-center justify-center">
                          {cartItemsCount}
                        </span>
                      )}
                    </button>
                  )}
                  <button
                    onClick={toggleMenu}
                    className="p-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: "transparent",
                      color: styles.userFontColor,
                    }}
                    aria-label="Menu"
                  >
                    <Menu
                      className="w-5 h-5"
                      style={{ color: styles.userFontColor }}
                    />
                  </button>
                </div>
              </div>
            </nav>

            {/* Full-screen menu overlay (covers entire phone screen) */}
            {previewState.menuOpen && (
              <div className="absolute inset-0 z-[60] flex items-start justify-center">
                <div
                  className="absolute inset-0 bg-black/20"
                  onClick={toggleMenu}
                />
                <div
                  className="relative w-full max-w-none p-6 transition-transform duration-300 ease-in-out"
                  style={{
                    background: styles.userSecondary || "#ffffff",
                    borderTop: `1px solid ${styles.userPrimary || "#eee"}`,
                    color: styles.userFontColor,
                  }}
                >
                  <div className="space-y-4 pt-8">
                    {menuPages.map((page) => (
                      <button
                        key={page}
                        onClick={() => navigateToPage(page)}
                        className={`w-full text-left px-4 py-3 transition-colors text-sm font-semibold`}
                        style={{
                          color:
                            previewState.activePage === page
                              ? styles.userPrimary || styles.userFontColor
                              : styles.userFontColor,
                          backgroundColor:
                            previewState.activePage === page
                              ? styles.userPrimary
                                ? `${styles.userPrimary}20`
                                : "transparent"
                              : "transparent",
                        }}
                      >
                        {pageLabel(page)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <OrderProgress />
            {/* Content */}
            <div
              className="flex-1 overflow-y-auto"
              style={{ background: "transparent" }}
            >
              {renderPageContent()}
            </div>
            {productModalOpen && selectedProduct && (
              <div className="absolute inset-0 z-[70] flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setProductModalOpen(false)}
                />
                <div className="relative bg-white rounded-xl w-[88%] max-w-xs overflow-hidden shadow-xl">
                  <div className="relative">
                    <Carousel opts={{ loop: true }}>
                      <CarouselContent>
                        {(selectedProduct.images &&
                        selectedProduct.images.length > 0
                          ? selectedProduct.images
                          : [
                              {
                                url: normalizeImageSrc(selectedProduct.image),
                                alt: selectedProduct.name,
                              },
                            ]
                        ).map((img: any, idx: number) => (
                          <CarouselItem key={idx}>
                            <div className="aspect-[4/3] w-full bg-gray-100">
                              <img
                                src={normalizeImageSrc(img)}
                                alt={img.alt || selectedProduct.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                    {showArrowHint && (
                      <motion.div
                        initial={{ opacity: 0, x: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], x: [0, 6, 0, 0] }}
                        transition={{ duration: 1.8, ease: "easeInOut" }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-white drop-shadow"
                      >
                        <ChevronRight className="w-7 h-7" />
                      </motion.div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold">
                      {selectedProduct.name}
                    </h3>
                    {selectedProduct.description && (
                      <p className="text-sm text-gray-600">
                        {selectedProduct.description}
                      </p>
                    )}
                    <div className="text-base font-semibold text-teal-600">
                      ${parseFloat(selectedProduct.price).toFixed(2)}
                    </div>
                    {formData.onlineOrdering && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center border rounded-full overflow-hidden">
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() =>
                                setSelectedQty((q) => Math.max(1, q - 1))
                              }
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={selectedQty}
                              onChange={(e) =>
                                setSelectedQty(
                                  Math.max(1, parseInt(e.target.value || "1")),
                                )
                              }
                              className="w-12 text-center outline-none"
                            />
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() => setSelectedQty((q) => q + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <Button
                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                            onClick={() => {
                              addToCart(selectedProduct, selectedQty);
                              setProductModalOpen(false);
                            }}
                          >
                            Add to cart
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <CartSidebar />
          </div>
        );

      case "cozy":
        return (
          <div
            className={`h-full overflow-y-auto bg-orange-50 ${fontClass} relative`}
          >
            <CheckoutFlow />

            {/* Status Bar with Notch Space */}
            <div className="h-8 bg-amber-100" />

            {/* Pill Header */}
            <div className="px-3 pt-2 pb-4 relative">
              <div className="flex justify-center">
                <div
                  className="inline-flex items-center space-x-2 px-4 py-2 rounded-full shadow-md border"
                  style={{
                    background: `${styles.userSecondary || "#FEF3C7"}`,
                    borderColor: styles.userPrimary || "#F59E0B",
                    color: styles.userFontColor,
                  }}
                >
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      backgroundColor: (styles.userPrimary || "#F59E0B") + "20",
                    }}
                  >
                    <LogoDisplay />
                  </div>
                  <span
                    className="text-sm font-semibold cursor-pointer"
                    onClick={() => navigateToPage("home")}
                    title="Go to Home"
                  >
                    {getBusinessName()}
                  </span>
                </div>
              </div>
            </div>

            <OrderProgress />
            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-orange-50 pb-16">
              {renderPageContent()}
            </div>
            {productModalOpen && selectedProduct && (
              <div className="absolute inset-0 z-[70] flex items-center justify-center">
                <div
                  className="absolute inset-0 bg-black/40"
                  onClick={() => setProductModalOpen(false)}
                />
                <div className="relative bg-white rounded-xl w-[88%] max-w-xs overflow-hidden shadow-xl">
                  <div className="relative">
                    <Carousel opts={{ loop: true }}>
                      <CarouselContent>
                        {(selectedProduct.images &&
                        selectedProduct.images.length > 0
                          ? selectedProduct.images
                          : [
                              {
                                url: normalizeImageSrc(selectedProduct.image),
                                alt: selectedProduct.name,
                              },
                            ]
                        ).map((img: any, idx: number) => (
                          <CarouselItem key={idx}>
                            <div className="aspect-[4/3] w-full bg-gray-100">
                              <img
                                src={normalizeImageSrc(img)}
                                alt={img.alt || selectedProduct.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                    </Carousel>
                    {showArrowHint && (
                      <motion.div
                        initial={{ opacity: 0, x: 0 }}
                        animate={{ opacity: [0, 1, 1, 0], x: [0, 6, 0, 0] }}
                        transition={{ duration: 1.8, ease: "easeInOut" }}
                        className="absolute top-1/2 -translate-y-1/2 right-3 text-white drop-shadow"
                      >
                        <ChevronRight className="w-7 h-7" />
                      </motion.div>
                    )}
                  </div>
                  <div className="p-4 space-y-2">
                    <h3 className="text-lg font-semibold">
                      {selectedProduct.name}
                    </h3>
                    {selectedProduct.description && (
                      <p className="text-sm text-gray-600">
                        {selectedProduct.description}
                      </p>
                    )}
                    <div className="text-base font-semibold text-teal-600">
                      ${parseFloat(selectedProduct.price).toFixed(2)}
                    </div>
                    {formData.onlineOrdering && (
                      <div className="pt-2">
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center border rounded-full overflow-hidden">
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() =>
                                setSelectedQty((q) => Math.max(1, q - 1))
                              }
                              aria-label="Decrease quantity"
                            >
                              −
                            </button>
                            <input
                              type="number"
                              min={1}
                              value={selectedQty}
                              onChange={(e) =>
                                setSelectedQty(
                                  Math.max(1, parseInt(e.target.value || "1")),
                                )
                              }
                              className="w-12 text-center outline-none"
                            />
                            <button
                              className="px-3 py-1 text-lg"
                              onClick={() => setSelectedQty((q) => q + 1)}
                              aria-label="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                          <Button
                            className="flex-1 bg-teal-600 hover:bg-teal-700"
                            onClick={() => {
                              addToCart(selectedProduct, selectedQty);
                              setProductModalOpen(false);
                            }}
                          >
                            Add to cart
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            <CartSidebar />

            {/* Bottom-right Menu FAB */}
            <button
              onClick={toggleMenu}
              className="absolute bottom-4 right-4 w-12 h-12 rounded-full shadow-lg flex items-center justify-center ring-1 ring-white/40"
              style={{
                backgroundColor: styles.userPrimary || "#EA580C",
                color: "#fff",
              }}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Full-screen Cozy Menu Screen */}
            {previewState.menuOpen && (
              <div className="absolute inset-0 z-[60]">
                <div
                  className="absolute inset-0"
                  style={{
                    background: `${styles.userSecondary || "#FEF3C7"}CC`,
                  }}
                />
                <div className="relative h-full p-6 flex flex-col">
                  <div className="flex items-center justify-between mb-6">
                    <div
                      className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border"
                      style={{
                        background: "#FFFFFF",
                        borderColor: (styles.userPrimary || "#EA580C") + "40",
                        color: styles.userFontColor,
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{
                          backgroundColor: styles.userPrimary || "#EA580C",
                        }}
                      />
                      <span className="text-sm font-semibold">Menu</span>
                    </div>
                    <button
                      onClick={toggleMenu}
                      className="p-2 rounded-full hover:bg-black/5"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="space-y-3">
                    {menuPages.map((page) => (
                      <button
                        key={page}
                        onClick={() => navigateToPage(page)}
                        className="w-full text-left px-4 py-3 rounded-xl border bg-white shadow-sm text-gray-900"
                        style={{
                          borderColor: (styles.userPrimary || "#EA580C") + "30",
                        }}
                      >
                        {pageLabel(page)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return <div className="h-full bg-gray-50"></div>;
    }
  };

  // Universal Cart Dropdown Component
  const CartDropdown = () => {
    if (!formData.onlineOrdering || !showCart) return null;

    return <div className="fixed inset-0 z-50 hidden"></div>;
  };

  // Enhanced Interactive Live Preview Component
  const LivePreview = () => {
    const [previewState, setPreviewState] = useState({
      menuOpen: false,
      activePage: "home",
      hoveredItem: null,
    });

    const getBusinessName = () => {
      if (formData.businessName) return formData.businessName;
      // Use realistic names based on selected template for preview
      const templateNames = {
        minimalist: "Simple",
        modern: "FLUX",
        stylish: "Style",
        cozy: "Cozy",
      };
      const selectedId =
        currentStep === 0
          ? previewTemplateId || formData.template
          : formData.template;
      return templateNames[selectedId] || "Your Business";
    };

    const getBusinessIcon = () => {
      switch (formData.businessType) {
        case "cafe":
          return <Coffee className="w-5 h-5" />;
        case "restaurant":
          return <Utensils className="w-5 h-5" />;
        default:
          return <Building className="w-5 h-5" />;
      }
    };

    // Get pages for navigation
    const getAvailablePages = () => {
      const pageMap = {
        home: "Home",
        menu: "Menu",
        gallery: "Gallery",
        about: "About",
        reservations: "Reservations",
        contact: "Contact",
      };

      return formData.selectedPages.map((pageId) => ({
        id: pageId,
        name:
          pageMap[pageId] || pageId.charAt(0).toUpperCase() + pageId.slice(1),
      }));
    };

    // Sample content for realistic previews - template specific
    const selectedId =
      currentStep === 0
        ? previewTemplateId || formData.template
        : formData.template;
    const templateContent = {
      minimalist: {
        items: [
          { name: "Coffee", description: "Fresh brewed", price: "3.50" },
          { name: "Sandwich", description: "Daily special", price: "7.00" },
          { name: "Salad", description: "Mixed greens", price: "6.50" },
        ],
        tagline: "Simple. Fresh. Good.",
        description: "Minimal design, maximum flavor",
      },
      modern: {
        items: [
          {
            name: "Signature Latte",
            description: "Premium espresso with oat milk",
            price: "5.50",
          },
          {
            name: "Energy Bowl",
            description: "Quinoa, avocado, fresh greens",
            price: "12.00",
          },
          {
            name: "Urban Burger",
            description: "Plant-based patty, local ingredients",
            price: "15.00",
          },
        ],
        tagline: "Bold Flavors, Bright Future",
        description: "Where creativity meets cuisine",
      },
      stylish: {
        items: [
          {
            name: "Organic Latte",
            description: "Fair trade beans, oat milk",
            price: "4.75",
          },
          {
            name: "Fresh Wrap",
            description: "Seasonal vegetables, herbs",
            price: "8.50",
          },
          {
            name: "Green Smoothie",
            description: "Spinach, apple, ginger",
            price: "6.00",
          },
        ],
        tagline: "Fresh, Healthy, Natural",
        description: "Fine dining at its finest",
      },
      cozy: {
        items: [
          {
            name: "Grandma's Pie",
            description: "Warm slice with seasonal fruit",
            price: "7.50",
          },
          {
            name: "House Lemonade",
            description: "Freshly squeezed, lightly sweetened",
            price: "12.00",
          },
          {
            name: "House Roast",
            description: "Slow-brewed, comforting aroma",
            price: "6.00",
          },
        ],
        tagline: "Enter the Digital Realm",
        description: "Next-gen gaming cafe experience",
      },
    };

    const currentContent =
      templateContent[selectedId] || templateContent["minimalist"];

    const sampleContent = {
      menuItems:
        formData.menuItems.length > 0
          ? formData.menuItems
          : currentContent.items,
      tagline: formData.slogan || currentContent.tagline,
      businessDescription:
        formData.uniqueDescription || currentContent.description,
      reviews: [
        { name: "Sarah M.", rating: 5, text: "Amazing experience!" },
        { name: "John D.", rating: 5, text: "Love the atmosphere here." },
      ],
      hours: formData.openingHours?.Monday
        ? formData.openingHours
        : {
            Monday: { open: "7:00", close: "19:00" },
            Tuesday: { open: "7:00", close: "19:00" },
            Wednesday: { open: "7:00", close: "19:00" },
          },
      galleryImages:
        formData.gallery.length > 0
          ? formData.gallery
          : [
              { url: "/api/placeholder/300/300", alt: "Our space" },
              { url: "/api/placeholder/300/300", alt: "Fresh preparation" },
              { url: "/api/placeholder/300/300", alt: "Signature items" },
              { url: "/api/placeholder/300/300", alt: "Our team" },
            ],
    };

    const renderPreviewContent = () => {
      const selectedId =
        currentStep === 0
          ? previewTemplateId || formData.template
          : formData.template;
      if (!selectedId) {
        return (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">
                Choose a template to see preview
              </p>
            </div>
          </div>
        );
      }

      // Apply font family based on user selection
      const fontClass =
        fontOptions.find((f) => f.id === formData.fontFamily)?.class ||
        "font-sans";

      // Common logo display component
      const LogoDisplay = () => {
        if (formData.logo) {
          return (
            <img
              src={
                typeof formData.logo === "string"
                  ? formData.logo
                  : URL.createObjectURL(formData.logo)
              }
              alt="Business logo"
              className="w-8 h-8 object-contain rounded"
            />
          );
        }
        return getBusinessIcon();
      };

      // Render different templates based on selection with INTERACTIVE FEATURES
      const selectedIdForSwitch =
        currentStep === 0
          ? previewTemplateId || formData.template
          : formData.template;
      // Use the main TemplatePreviewContent component for consistent rendering
      return <TemplatePreviewContent />;
    };

    return (
      <div className="sticky top-24 h-[calc(100vh-6rem)]">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="p-2">
                <Smartphone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="p-2">
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Logo Upload Section - Only show until Step 2 */}
          {currentStep >= 1 && currentStep <= 2 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-bold text-gray-700 mb-3">
                Business Logo
              </h4>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                  {formData.logo ? (
                    <img
                      src={
                        typeof formData.logo === "string"
                          ? formData.logo
                          : URL.createObjectURL(formData.logo)
                      }
                      alt="Logo preview"
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <Building className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    document.getElementById("logo-preview-upload")?.click()
                  }
                  className="text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {formData.logo ? "Change" : "Upload"}
                </Button>
                <input
                  id="logo-preview-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateFormData("logo", file);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB</p>
            </div>
          )}

          <div className="flex-1 flex items-center justify-center">
            <LivePhoneFrame widthClass="w-56" heightClass="h-[420px]">
              {renderPreviewContent()}
            </LivePhoneFrame>
          </div>
        </div>
      </div>
    );
  };

  // Welcome Page Component - Enhanced with Persistence Status
  const WelcomePage = () => {
    const [showDebug, setShowDebug] = useState(false);
    const hasSaved = persistence.hasSavedSteps();
    const summary = persistence.getSummary();
    const stepHistory = persistence.getStepHistory();

    return (
      <div className="min-h-[calc(100vh-5rem)] bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
          {/* Persistence Status Banner */}
          <div className="mb-8">
            <Card
              className={`p-4 ${hasSaved ? "bg-green-50 border-green-200" : "bg-orange-50 border-orange-200"}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {hasSaved ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-orange-600" />
                  )}
                  <div>
                    <h3
                      className={`font-semibold ${hasSaved ? "text-green-900" : "text-orange-900"}`}
                    >
                      {hasSaved ? "Progress Restored" : "Fresh Start"}
                    </h3>
                    <p
                      className={`text-sm ${hasSaved ? "text-green-700" : "text-orange-700"}`}
                    >
                      {summary}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDebug(!showDebug)}
                    className="text-xs"
                  >
                    {showDebug ? "Hide" : "Debug"}
                  </Button>
                  {hasSaved && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (
                          confirm(
                            "This will clear all saved progress. Are you sure?",
                          )
                        ) {
                          persistence.clearAll();
                          window.location.reload();
                        }
                      }}
                      className="text-xs text-red-600 hover:text-red-800"
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          </div>

          {/* Debug Panel */}
          {showDebug && (
            <Card className="mb-8 p-6 bg-gray-50 border-gray-200">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Persistence Debug Panel
              </h3>
              <div className="grid md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Current State
                  </h4>
                  <div className="space-y-1 text-gray-600">
                    <p>Step: {currentStep}</p>
                    <p>Config ID: {currentConfigId || "None"}</p>
                    <p>Business: {formData.businessName || "None"}</p>
                    <p>Template: {formData.template || "None"}</p>
                    <p>Published: {publishedUrl ? "Yes" : "No"}</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Step History
                  </h4>
                  <div className="max-h-32 overflow-y-auto space-y-1 text-gray-600">
                    {stepHistory.length === 0 ? (
                      <p className="text-orange-600 font-mono text-xs">
                        nothing was loaded: Your Business © 2025 Your Business
                      </p>
                    ) : (
                      stepHistory.slice(-5).map((step, index) => (
                        <div key={index} className="text-xs font-mono">
                          {new Date(step.timestamp).toLocaleTimeString()}:{" "}
                          {step.action} (Step {step.stepNumber})
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Actions</h4>
                  <div className="space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const exported = persistence.exportData();
                        navigator.clipboard.writeText(exported);
                        toast({
                          title: "Copied",
                          description: "Debug data copied to clipboard",
                        });
                      }}
                      className="w-full text-xs"
                    >
                      Export Debug Data
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const data = prompt("Paste debug data to import:");
                        if (data && persistence.importData(data)) {
                          toast({
                            title: "Imported",
                            description: "Debug data imported successfully",
                          });
                          window.location.reload();
                        }
                      }}
                      className="w-full text-xs"
                    >
                      Import Debug Data
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
                Build Your Perfect{" "}
                <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">
                  Web App
                </span>
              </h1>
              <p className="text-lg text-gray-600 mb-6 leading-relaxed">
                Create a professional web app for your business in minutes.
                Choose a template, preview it live, customize, and publish.
              </p>
              <ul className="space-y-2 text-gray-700 mb-8">
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-teal-600 mr-2" /> Live app-like
                  template previews
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-teal-600 mr-2" /> Minimal,
                  fast, and clean flow
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-teal-600 mr-2" /> Auto-save
                  every step
                </li>
                <li className="flex items-center">
                  <Check className="w-4 h-4 text-teal-600 mr-2" /> One-click
                  publish
                </li>
              </ul>

              {/* Continue or Start Button */}
              <div className="space-y-3">
                <Button
                  onClick={startConfigurator}
                  size="lg"
                  className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-8 py-6 text-lg font-bold rounded-full shadow-xl hover:scale-105 transition-all duration-300 w-full sm:w-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  {hasSaved ? "Continue Configuration" : "Let's Get Started"}
                  <ChevronRight className="w-5 h-5" />
                </Button>

                {hasSaved && publishedUrl && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      onClick={() => window.open(publishedUrl, "_blank")}
                      className="w-full sm:w-auto"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      View Published Site
                    </Button>
                  </div>
                )}
              </div>
            </div>
            <div className="hidden lg:block">
              <div className="w-full h-80 bg-gradient-to-br from-teal-50 to-purple-50 border border-gray-200 rounded-2xl flex items-center justify-center">
                <div className="text-center">
                  {hasSaved && formData.businessName ? (
                    <>
                      <Building className="w-10 h-10 text-teal-500 mx-auto mb-3" />
                      <p className="text-gray-900 font-semibold mb-1">
                        {formData.businessName}
                      </p>
                      <p className="text-gray-600 text-sm">
                        {formData.template
                          ? `${formData.template} template`
                          : "Configuration in progress"}
                      </p>
                    </>
                  ) : (
                    <>
                      <Palette className="w-10 h-10 text-teal-500 mx-auto mb-3" />
                      <p className="text-gray-600">
                        Start by choosing a template on the next step
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Template Selection with Live Preview
  const TemplateStep = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(
      previewTemplateId || formData.template || "modern",
    );

    useEffect(() => {
      if (!previewTemplateId && !formData.template) {
        setPreviewTemplateId("modern");
      }
    }, []);

    const handleTemplateClick = (templateId: string) => {
      setSelectedTemplate(templateId);
      setPreviewTemplateId(templateId);
    };

    const handleUseTemplate = () => {
      if (selectedTemplate) {
        updateFormData("template", selectedTemplate);
        nextStep();
      }
    };

    return (
      <div className="py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
            Choose Your{" "}
            <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">
              Template
            </span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Click on a template to see a live preview. Each template is designed
            for real web apps.
          </p>
        </div>

        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 lg:gap-8">
          {/* Template Selection */}
          <div className="space-y-4 order-2 lg:order-1">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Available Templates
            </h3>
            {templates
              .filter(
                (template) =>
                  !template.businessTypes ||
                  template.businessTypes.includes(formData.businessType) ||
                  !formData.businessType,
              )
              .map((template) => (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all duration-300 border-2 ${
                    selectedTemplate === template.id
                      ? template.id === "modern"
                        ? "border-blue-500 bg-blue-50 shadow-lg"
                        : "border-teal-500 bg-teal-50 shadow-lg"
                      : template.id === "modern"
                        ? "border-gray-200 hover:border-blue-300 hover:shadow-md"
                        : "border-gray-200 hover:border-teal-300 hover:shadow-md"
                  }`}
                  onClick={() => handleTemplateClick(template.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-3 h-3 rounded-full ${template.preview} flex-shrink-0`}
                      ></div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <h4 className="text-md font-bold text-gray-900 truncate">
                            {template.name}
                          </h4>
                          {selectedTemplate === template.id &&
                            (template.id === "modern" ? (
                              <Check className="w-4 h-4 text-blue-600 flex-shrink-0" />
                            ) : (
                              <Check className="w-4 h-4 text-teal-600 flex-shrink-0" />
                            ))}
                        </div>
                        <p className="text-gray-600 text-xs mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      </div>
                      <Eye
                        className={`w-5 h-5 flex-shrink-0 ${selectedTemplate === template.id ? (template.id === "modern" ? "text-blue-600" : "text-teal-600") : "text-gray-400"}`}
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

            {/* Use Template Button */}
            {selectedTemplate && (
              <Card
                className={`p-4 ${selectedTemplate === "modern" ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200" : "bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200"}`}
              >
                <div className="text-center">
                  <p className="text-gray-600 text-sm mb-3">
                    Previewing:{" "}
                    <strong>
                      {templates.find((t) => t.id === selectedTemplate)?.name}
                    </strong>
                  </p>
                  <Button
                    onClick={handleUseTemplate}
                    className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white font-bold w-full"
                  >
                    <Sparkles className="mr-2 w-4 h-4" />
                    Use This Template
                    <ChevronRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Live Preview */}
          <div className="order-1 lg:order-2 lg:sticky lg:top-8">
            <div className="bg-gray-100 rounded-2xl p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base lg:text-lg font-bold text-gray-900">
                  Live Preview
                </h3>
                <div className="text-center">
                  <span className="text-xs text-gray-500 font-mono">
                    Live Preview
                  </span>
                </div>
              </div>

              <div className="flex justify-center">
                <LivePhoneFrame
                  widthClass="w-48 lg:w-56"
                  heightClass="h-[360px] lg:h-[420px]"
                >
                  <TemplatePreviewContent />
                </LivePhoneFrame>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to Welcome
          </Button>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {selectedTemplate
                ? 'Click "Use This Template" to continue'
                : "Select a template to see live preview"}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // [OLD DESIGN CUSTOMIZATION STEP - REMOVED IN REFACTOR]
  const _DeleteOldDesignCode = 1; // placeholder

  // [OLD DUPLICATE PageStructureStep REMOVED IN REFACTOR]

  // Page Structure Step - CORRECT IMPLEMENTATION
  const PageStructureStep = () => (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Select your pages
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose which pages your website will include. You can always add more
          later.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageOptions.map((page) => {
          const isSelected = formData.selectedPages.includes(page.id);
          const isVisible =
            !page.condition || page.condition.includes(formData.businessType);

          if (!isVisible) return null;

          return (
            <Card
              key={page.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${
                isSelected
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              } ${page.required ? "opacity-75" : ""}`}
              onClick={() => {
                if (page.required) return;
                const newPages = isSelected
                  ? formData.selectedPages.filter((p) => p !== page.id)
                  : [...formData.selectedPages, page.id];
                updateFormData("selectedPages", newPages);
              }}
            >
              <CardContent className="p-6 text-center">
                <div
                  className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${
                    isSelected
                      ? "from-teal-500 to-purple-500"
                      : "from-gray-400 to-gray-500"
                  } flex items-center justify-center text-white`}
                >
                  {page.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {page.name}
                </h3>
                {page.required && (
                  <p className="text-xs text-gray-500">Required</p>
                )}
                {isSelected && !page.required && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Page-Specific Configuration Info */}
      <Card className="p-6 mt-8">
        <h3 className="text-lg font-bold text-gray-900 mb-4">
          Homepage Options
        </h3>
        <label className="inline-flex items-center space-x-2 text-sm">
          <input
            type="checkbox"
            checked={!!formData.showHomeHero}
            onChange={(e) => updateFormData("showHomeHero", e.target.checked)}
          />
          <span>Show header block under headline (logo + name)</span>
        </label>
      </Card>

      {formData.selectedPages.length > 1 && (
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            Selected Pages Configuration
          </h3>
          <p className="text-gray-600 text-sm mb-4">
            You've selected multiple pages. During the next steps, you'll be
            able to configure specific content for each page:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {formData.selectedPages.map((pageId) => {
              const pageInfo = {
                home: {
                  name: "Home",
                  config: "Business info, hero section, featured content",
                },
                menu: {
                  name: "Menu",
                  config: "Menu items, categories, pricing",
                },
                gallery: {
                  name: "Gallery",
                  config: "Photo uploads, image organization",
                },
                about: {
                  name: "About",
                  config: "Business story, team members, mission",
                },
                reservations: {
                  name: "Reservations",
                  config: "Booking system, time slots, policies",
                },
                contact: {
                  name: "Contact",
                  config: "Contact details, location, hours",
                },
              };

              const page = pageInfo[pageId];
              if (!page) return null;

              return (
                <div
                  key={pageId}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">
                    {page.name}
                  </h4>
                  <p className="text-xs text-gray-600">{page.config}</p>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* OLD CODE REMOVED - EVERYTHING BELOW THIS WAS DELETED */}
      <div style={{ display: "none" }}>
        {/* DELETED: Color Themes, Custom Colors, Font Selection, etc. */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Color Themes (DELETED)
          </label>
          <p className="text-sm text-gray-500 mb-6">
            Choose a preset or customize your own colors below
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                primary: "#2563EB",
                secondary: "#7C3AED",
                name: "Ocean",
                accent: "#0EA5E9",
              },
              {
                primary: "#059669",
                secondary: "#10B981",
                name: "Forest",
                accent: "#22C55E",
              },
              {
                primary: "#DC2626",
                secondary: "#F59E0B",
                name: "Sunset",
                accent: "#F97316",
              },
              {
                primary: "#7C2D12",
                secondary: "#EA580C",
                name: "Autumn",
                accent: "#F59E0B",
              },
              {
                primary: "#1F2937",
                secondary: "#374151",
                name: "Elegant",
                accent: "#6B7280",
              },
              {
                primary: "#BE185D",
                secondary: "#EC4899",
                name: "Vibrant",
                accent: "#F472B6",
              },
              {
                primary: "#6366F1",
                secondary: "#8B5CF6",
                name: "Purple",
                accent: "#A855F7",
              },
              {
                primary: "#0891B2",
                secondary: "#06B6D4",
                name: "Sky",
                accent: "#38BDF8",
              },
            ].map((preset, index) => {
              const isSelected =
                formData.primaryColor === preset.primary &&
                formData.secondaryColor === preset.secondary;
              return (
                <button
                  key={index}
                  onClick={() => {
                    updateFormData("primaryColor", preset.primary);
                    updateFormData("secondaryColor", preset.secondary);
                    // Set background type to gradient for better visual impact
                    updateFormData("backgroundType", "gradient");
                    // Set background color based on theme
                    updateFormData("backgroundColor", preset.primary);

                    // Update template-specific themes if a template is selected
                    if (formData.template) {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].primary = preset.primary;
                      newThemes[formData.template].secondary = preset.secondary;
                      updateFormData("templateThemes", newThemes);
                    }
                  }}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    isSelected
                      ? "border-teal-500 bg-teal-50 shadow-lg transform scale-105"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <div className="relative mb-3">
                    <div className="flex space-x-1">
                      <div
                        className="w-8 h-8 rounded-lg shadow-sm"
                        style={{ backgroundColor: preset.primary }}
                      ></div>
                      <div
                        className="w-8 h-8 rounded-lg shadow-sm"
                        style={{ backgroundColor: preset.secondary }}
                      ></div>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-sm font-medium transition-colors ${
                      isSelected ? "text-teal-700" : "text-gray-700"
                    }`}
                  >
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Section */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
            Custom Colors
          </h3>
          <div className="grid sm:grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                Primary Color
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateFormData("primaryColor", e.target.value);

                      // Also update template-specific theme if template is selected
                      if (formData.template) {
                        const newThemes = { ...formData.templateThemes };
                        if (!newThemes[formData.template]) {
                          newThemes[formData.template] = {
                            ...newThemes.minimalist,
                          };
                        }
                        newThemes[formData.template].primary = e.target.value;
                        updateFormData("templateThemes", newThemes);
                      }
                    }}
                    className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-all hover:scale-105 shadow-sm"
                    style={{ WebkitAppearance: "none", padding: "4px" }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => {
                      updateFormData("primaryColor", e.target.value);

                      // Also update template-specific theme if template is selected
                      if (formData.template) {
                        const newThemes = { ...formData.templateThemes };
                        if (!newThemes[formData.template]) {
                          newThemes[formData.template] = {
                            ...newThemes.minimalist,
                          };
                        }
                        newThemes[formData.template].primary = e.target.value;
                        updateFormData("templateThemes", newThemes);
                      }
                    }}
                    className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    placeholder="#2563EB"
                  />
                  <p className="text-xs text-gray-500 mt-1">Main brand color</p>
                </div>
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">
                Secondary Color
              </label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateFormData("secondaryColor", e.target.value);

                      // Also update template-specific theme if template is selected
                      if (formData.template) {
                        const newThemes = { ...formData.templateThemes };
                        if (!newThemes[formData.template]) {
                          newThemes[formData.template] = {
                            ...newThemes.minimalist,
                          };
                        }
                        newThemes[formData.template].secondary = e.target.value;
                        updateFormData("templateThemes", newThemes);
                      }
                    }}
                    className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-all hover:scale-105 shadow-sm"
                    style={{ WebkitAppearance: "none", padding: "4px" }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => {
                      updateFormData("secondaryColor", e.target.value);

                      // Also update template-specific theme if template is selected
                      if (formData.template) {
                        const newThemes = { ...formData.templateThemes };
                        if (!newThemes[formData.template]) {
                          newThemes[formData.template] = {
                            ...newThemes.minimalist,
                          };
                        }
                        newThemes[formData.template].secondary = e.target.value;
                        updateFormData("templateThemes", newThemes);
                      }
                    }}
                    className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    placeholder="#7C3AED"
                  />
                  <p className="text-xs text-gray-500 mt-1">Accent color</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Font Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Typography Style
          </label>
          <div className="grid grid-cols-3 gap-4">
            {fontOptions.map((font) => (
              <Card
                key={font.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  formData.fontFamily === font.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                }`}
                onClick={() => updateFormData("fontFamily", font.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`text-lg font-bold mb-2 ${font.class}`}>
                    {font.name}
                  </div>
                  <div className={`text-sm text-gray-600 ${font.class}`}>
                    {font.preview}
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    {font.description}
                  </div>
                  {formData.fontFamily === font.id && (
                    <div className="mt-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Font Color */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Text Color
          </label>
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={formData.fontColor}
              onChange={(e) => updateFormData("fontColor", e.target.value)}
              className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
            />
            <div className="flex-1">
              <input
                type="text"
                value={formData.fontColor}
                onChange={(e) => updateFormData("fontColor", e.target.value)}
                placeholder="#000000"
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-teal-500 focus:outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter a hex color code or use the color picker
              </p>
            </div>
          </div>
        </div>

        {/* Homepage Options */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Homepage Options
          </label>
          <div className="space-y-2">
            <label className="inline-flex items-center space-x-2 text-sm">
              <input
                type="checkbox"
                checked={!!formData.showHomeHero}
                onChange={(e) =>
                  updateFormData("showHomeHero", e.target.checked)
                }
              />
              <span>Show header block under headline (logo + name)</span>
            </label>
          </div>
        </div>

        {/* Font Size */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Text Size
          </label>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                id: "small",
                name: "Small",
                description: "Compact and minimal",
              },
              {
                id: "medium",
                name: "Medium",
                description: "Standard readability",
              },
              { id: "large", name: "Large", description: "Bold and prominent" },
            ].map((size) => (
              <Card
                key={size.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  formData.fontSize === size.id
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300"
                }`}
                onClick={() => updateFormData("fontSize", size.id)}
              >
                <CardContent className="p-4 text-center">
                  <div
                    className={`font-bold mb-2 ${
                      size.id === "small"
                        ? "text-sm"
                        : size.id === "medium"
                          ? "text-base"
                          : "text-lg"
                    }`}
                  >
                    {size.name}
                  </div>
                  <div className="text-xs text-gray-500">
                    {size.description}
                  </div>
                  {formData.fontSize === size.id && (
                    <div className="mt-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Template-Specific Theme Controls */}
        {formData.template && (
          <div className="bg-blue-50 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">
              {templates.find((t) => t.id === formData.template)?.name} Theme
              Settings
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Primary Color */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={
                      formData.templateThemes?.[formData.template]?.primary ||
                      formData.primaryColor
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].primary = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                  />
                  <Input
                    type="text"
                    value={
                      formData.templateThemes?.[formData.template]?.primary ||
                      formData.primaryColor
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].primary = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>

              {/* Homepage Dish Image Visibility */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Homepage Images
                </label>
                <div className="flex items-center justify-between rounded-lg border bg-white p-4">
                  <div className="space-y-0.5">
                    <label
                      htmlFor="homepageDishImageVisibility"
                      className="text-sm font-medium"
                    >
                      Show dish images on homepage
                    </label>
                    <p className="text-xs text-gray-500">
                      Control whether dish images are shown directly on the
                      homepage.
                    </p>
                  </div>
                  <Switch
                    id="homepageDishImageVisibility"
                    checked={formData.homepageDishImageVisibility !== "hidden"}
                    onCheckedChange={(checked) =>
                      updateFormData(
                        "homepageDishImageVisibility",
                        checked ? "visible" : "hidden",
                      )
                    }
                  />
                </div>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Secondary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={
                      formData.templateThemes?.[formData.template]?.secondary ||
                      formData.secondaryColor
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].secondary = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                  />
                  <Input
                    type="text"
                    value={
                      formData.templateThemes?.[formData.template]?.secondary ||
                      formData.secondaryColor
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].secondary = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>

              {/* Text Color */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Text Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={
                      formData.templateThemes?.[formData.template]?.text ||
                      formData.fontColor
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].text = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                  />
                  <Input
                    type="text"
                    value={
                      formData.templateThemes?.[formData.template]?.text ||
                      formData.fontColor
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].text = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>

              {/* Highlight Color */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Highlight Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={
                      formData.templateThemes?.[formData.template]?.highlight ||
                      "#14B8A6"
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].highlight = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                  />
                  <Input
                    type="text"
                    value={
                      formData.templateThemes?.[formData.template]?.highlight ||
                      "#14B8A6"
                    }
                    onChange={(e) => {
                      const newThemes = { ...formData.templateThemes };
                      if (!newThemes[formData.template]) {
                        newThemes[formData.template] = {
                          ...newThemes.minimalist,
                        };
                      }
                      newThemes[formData.template].highlight = e.target.value;
                      updateFormData("templateThemes", newThemes);
                    }}
                    className="font-mono text-sm flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Button Style Controls */}
            <div className="grid md:grid-cols-2 gap-6 mt-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Button Style
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "rounded-lg", name: "Rounded" },
                    { id: "rounded-xl", name: "More Round" },
                    { id: "rounded-full", name: "Pill" },
                  ].map((style) => (
                    <Button
                      key={style.id}
                      variant={
                        (formData.templateThemes?.[formData.template]
                          ?.buttonRadius || "rounded-lg") === style.id
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        const newThemes = { ...formData.templateThemes };
                        if (!newThemes[formData.template]) {
                          newThemes[formData.template] = {
                            ...newThemes.minimalist,
                          };
                        }
                        newThemes[formData.template].buttonRadius = style.id;
                        updateFormData("templateThemes", newThemes);
                      }}
                      className={`${style.id} ${(formData.templateThemes?.[formData.template]?.buttonRadius || "rounded-lg") === style.id ? "bg-teal-500 hover:bg-teal-600" : ""}`}
                    >
                      {style.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-3">
                  Hover Effect
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: "grow", name: "Grow" },
                    { id: "glow", name: "Glow" },
                  ].map((effect) => (
                    <Button
                      key={effect.id}
                      variant={
                        (formData.templateThemes?.[formData.template]
                          ?.buttonHover || "grow") === effect.id
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => {
                        const newThemes = { ...formData.templateThemes };
                        if (!newThemes[formData.template]) {
                          newThemes[formData.template] = {
                            ...newThemes.minimalist,
                          };
                        }
                        newThemes[formData.template].buttonHover = effect.id;
                        updateFormData("templateThemes", newThemes);
                      }}
                      className={
                        (formData.templateThemes?.[formData.template]
                          ?.buttonHover || "grow") === effect.id
                          ? "bg-teal-500 hover:bg-teal-600"
                          : ""
                      }
                    >
                      {effect.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Background Style - Only Color and Gradient */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">
            Background Style
          </label>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                formData.backgroundType === "color"
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              }`}
              onClick={() => updateFormData("backgroundType", "color")}
            >
              <CardContent className="p-4 text-center">
                <div className="w-full h-16 rounded-lg mb-3 bg-white border-2 border-gray-300"></div>
                <div className="text-sm font-bold text-gray-900">
                  Solid Color
                </div>
                {formData.backgroundType === "color" && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                formData.backgroundType === "gradient"
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              }`}
              onClick={() => updateFormData("backgroundType", "gradient")}
            >
              <CardContent className="p-4 text-center">
                <div className="w-full h-16 rounded-lg mb-3 bg-gradient-to-br from-blue-400 to-purple-600"></div>
                <div className="text-sm font-bold text-gray-900">Gradient</div>
                {formData.backgroundType === "gradient" && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {formData.backgroundType === "color" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Background Color
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    updateFormData("backgroundColor", e.target.value)
                  }
                  className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300"
                />
                <Input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) =>
                    updateFormData("backgroundColor", e.target.value)
                  }
                  className="font-mono"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          )}

          {formData.backgroundType === "gradient" && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">
                Gradient Colors
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-2">
                    Start Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        updateFormData("primaryColor", e.target.value)
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                      style={{ WebkitAppearance: "none", padding: "4px" }}
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        updateFormData("primaryColor", e.target.value)
                      }
                      className="font-mono text-sm"
                      placeholder="#2563EB"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">
                    End Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        updateFormData("secondaryColor", e.target.value)
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                      style={{ WebkitAppearance: "none", padding: "4px" }}
                    />
                    <Input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) =>
                        updateFormData("secondaryColor", e.target.value)
                      }
                      className="font-mono text-sm"
                      placeholder="#7C3AED"
                    />
                  </div>
                </div>
              </div>

              {/* Gradient Preview */}
              <div className="mt-4">
                <label className="block text-xs text-gray-600 mb-2">
                  Preview
                </label>
                <div
                  className="w-full h-16 rounded-lg border border-gray-300"
                  style={{
                    background: `linear-gradient(135deg, ${formData.primaryColor} 0%, ${formData.secondaryColor} 100%)`,
                  }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button type="button" onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  // [DUPLICATE REMOVED - PageStructureStep already defined at line 4504]

  // Additional step components
  const OpeningHoursStep = () => {
    const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
    const weekends = ["Saturday", "Sunday"];

    const [useWeekdaySchedule, setUseWeekdaySchedule] = useState(true);
    const [weekdayHours, setWeekdayHours] = useState({
      open: "09:00",
      close: "17:00",
      closed: false,
    });

    // Auto-load default opening hours when reaching this step
    useEffect(() => {
      if (
        !formData.openingHours ||
        Object.keys(formData.openingHours).length === 0
      ) {
        const defaultHours = {
          open: "09:00",
          close: "17:00",
          closed: false,
        };

        const defaultOpeningHours = {};
        // Set weekdays to default hours
        weekdays.forEach((day) => {
          defaultOpeningHours[day] = { ...defaultHours };
        });
        // Set weekends to closed by default
        weekends.forEach((day) => {
          defaultOpeningHours[day] = {
            open: "10:00",
            close: "16:00",
            closed: true,
          };
        });

        updateFormData("openingHours", defaultOpeningHours);
      }
    }, []);

    const applyWeekdaySchedule = () => {
      const newHours = { ...formData.openingHours };
      weekdays.forEach((day) => {
        newHours[day] = { ...weekdayHours };
      });
      updateFormData("openingHours", newHours);
    };

    return (
      <div className="py-8 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Öffnungszeiten festlegen
          </h2>
          <p className="text-gray-600">
            Wann haben Sie geöffnet? Das hilft Kunden zu wissen, wann sie Sie
            besuchen können.
          </p>
        </div>

        <div className="space-y-6">
          {/* Opening Hours Text Color */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-3">Text color</h3>
            <div className="flex items-center space-x-4">
              <input
                type="color"
                value={formData.openingHoursTextColor || "#0F172A"}
                onChange={(e) =>
                  updateFormData("openingHoursTextColor", e.target.value)
                }
                className="w-12 h-10 rounded cursor-pointer border"
                aria-label="Opening hours text color"
              />
              <span className="text-sm text-gray-600">
                This controls the color of the Opening Hours text in the
                preview.
              </span>
            </div>
          </Card>
          {/* Weekdays (Mo-Fr) */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Montag - Freitag
              </h3>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="weekday-schedule"
                  checked={useWeekdaySchedule}
                  onChange={(e) => setUseWeekdaySchedule(e.target.checked)}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label
                  htmlFor="weekday-schedule"
                  className="text-sm text-gray-600"
                >
                  Gleiche Zeiten f���r alle Wochentage
                </label>
              </div>
            </div>

            {useWeekdaySchedule ? (
              <div className="flex items-center space-x-4">
                <Button
                  variant={weekdayHours.closed ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    const newHours = {
                      ...weekdayHours,
                      closed: !weekdayHours.closed,
                    };
                    setWeekdayHours(newHours);
                    applyWeekdaySchedule();
                  }}
                >
                  {weekdayHours.closed ? "Geschlossen" : "Geöffnet"}
                </Button>

                {!weekdayHours.closed && (
                  <>
                    <Input
                      type="time"
                      value={weekdayHours.open}
                      onChange={(e) => {
                        const newHours = {
                          ...weekdayHours,
                          open: e.target.value,
                        };
                        setWeekdayHours(newHours);
                        applyWeekdaySchedule();
                      }}
                      className="w-32"
                    />
                    <span className="text-gray-500">bis</span>
                    <Input
                      type="time"
                      value={weekdayHours.close}
                      onChange={(e) => {
                        const newHours = {
                          ...weekdayHours,
                          close: e.target.value,
                        };
                        setWeekdayHours(newHours);
                        applyWeekdaySchedule();
                      }}
                      className="w-32"
                    />
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {weekdays.map((day) => {
                  const hours = formData.openingHours[day] || {
                    open: "09:00",
                    close: "17:00",
                    closed: false,
                  };
                  return (
                    <div
                      key={day}
                      className="flex items-center justify-between"
                    >
                      <div className="w-24">
                        <span className="text-sm font-medium text-gray-700">
                          {day.slice(0, 3)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant={hours.closed ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const newHours = {
                              ...formData.openingHours,
                              [day]: { ...hours, closed: !hours.closed },
                            };
                            updateFormData("openingHours", newHours);
                          }}
                        >
                          {hours.closed ? "Zu" : "Auf"}
                        </Button>
                        {!hours.closed && (
                          <>
                            <Input
                              type="time"
                              value={hours.open}
                              onChange={(e) => {
                                const newHours = {
                                  ...formData.openingHours,
                                  [day]: { ...hours, open: e.target.value },
                                };
                                updateFormData("openingHours", newHours);
                              }}
                              className="w-24 text-sm"
                            />
                            <span className="text-gray-500 text-sm">-</span>
                            <Input
                              type="time"
                              value={hours.close}
                              onChange={(e) => {
                                const newHours = {
                                  ...formData.openingHours,
                                  [day]: { ...hours, close: e.target.value },
                                };
                                updateFormData("openingHours", newHours);
                              }}
                              className="w-24 text-sm"
                            />
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {/* Weekends & Holidays */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Wochenende & Feiertage
            </h3>
            <div className="space-y-3">
              {weekends.map((day) => {
                const hours = formData.openingHours[day] || {
                  open: "10:00",
                  close: "18:00",
                  closed: false,
                };
                return (
                  <div key={day} className="flex items-center justify-between">
                    <div className="w-24">
                      <span className="text-sm font-medium text-gray-700">
                        {day === "Saturday" ? "Samstag" : "Sonntag"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant={hours.closed ? "default" : "outline"}
                        size="sm"
                        onClick={() => {
                          const newHours = {
                            ...formData.openingHours,
                            [day]: { ...hours, closed: !hours.closed },
                          };
                          updateFormData("openingHours", newHours);
                        }}
                      >
                        {hours.closed ? "Geschlossen" : "Geöffnet"}
                      </Button>
                      {!hours.closed && (
                        <>
                          <Input
                            type="time"
                            value={hours.open}
                            onChange={(e) => {
                              const newHours = {
                                ...formData.openingHours,
                                [day]: { ...hours, open: e.target.value },
                              };
                              updateFormData("openingHours", newHours);
                            }}
                            className="w-24 text-sm"
                          />
                          <span className="text-gray-500 text-sm">-</span>
                          <Input
                            type="time"
                            value={hours.close}
                            onChange={(e) => {
                              const newHours = {
                                ...formData.openingHours,
                                [day]: { ...hours, close: e.target.value },
                              };
                              updateFormData("openingHours", newHours);
                            }}
                            className="w-24 text-sm"
                          />
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Tipp:</strong> Feiertage werden automatisch wie
                Sonntag behandelt. Sie k��nnen diese später in den Einstellungen
                anpassen.
              </p>
            </div>
          </Card>
        </div>

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Zurück
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Weiter
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const OffersStep = ({
    onBack,
    onContinue,
    isModal,
  }: {
    onBack?: () => void;
    onContinue?: () => void;
    isModal?: boolean;
  }) => {
    const [newOffer, setNewOffer] = useState({
      name: "",
      description: "",
      price: "",
      image: null,
    });

    const addOffer = () => {
      if (newOffer.name && newOffer.price) {
        const updatedOffers = [
          ...(formData.offers || []),
          { ...newOffer, id: Date.now().toString() },
        ];
        updateFormData("offers", updatedOffers);
        setNewOffer({ name: "", description: "", price: "", image: null });
      }
    };

    const removeOffer = (index: number) => {
      const updatedOffers = (formData.offers || []).filter(
        (_, i) => i !== index,
      );
      updateFormData("offers", updatedOffers);
    };

    const handleImageForNew = (files: FileList | null) => {
      if (!files || !files[0]) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (e) => {
        setNewOffer((prev) => ({ ...prev, image: e.target.result }));
      };
      reader.readAsDataURL(file);
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Create Your Offers
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Add special offers and promotions to attract customers.
          </p>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border mb-8">
          <h3 className="text-xl font-bold mb-6">Add New Offer</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input
              placeholder="Offer Name (e.g., Lunch Special)"
              value={newOffer.name}
              onChange={(e) =>
                setNewOffer({ ...newOffer, name: e.target.value })
              }
            />
            <Input
              placeholder="Price (e.g., 9.99)"
              value={newOffer.price}
              onChange={(e) =>
                setNewOffer({ ...newOffer, price: e.target.value })
              }
            />
            <Textarea
              placeholder="Description"
              value={newOffer.description}
              onChange={(e) =>
                setNewOffer({ ...newOffer, description: e.target.value })
              }
              className="md:col-span-2"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Offer Image
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageForNew(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100"
              />
              {newOffer.image && (
                <img
                  src={newOffer.image as string}
                  alt="preview"
                  className="mt-4 w-32 h-32 object-cover rounded-lg"
                />
              )}
            </div>
          </div>
          <div className="mt-6 text-right">
            <Button onClick={addOffer}>Add Offer</Button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-lg border mt-8">
          <h3 className="text-xl font-bold mb-6">Customize Offer Banner</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Background Color
              </label>
              <Input
                type="color"
                value={formData.offerBanner?.backgroundColor || "#000000"}
                onChange={(e) =>
                  updateFormData("offerBanner", {
                    ...(formData.offerBanner || {}),
                    backgroundColor: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Color
              </label>
              <Input
                type="color"
                value={formData.offerBanner?.textColor || "#FFFFFF"}
                onChange={(e) =>
                  updateFormData("offerBanner", {
                    ...(formData.offerBanner || {}),
                    textColor: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Button Color
              </label>
              <Input
                type="color"
                value={formData.offerBanner?.buttonColor || "#FFFFFF"}
                onChange={(e) =>
                  updateFormData("offerBanner", {
                    ...(formData.offerBanner || {}),
                    buttonColor: e.target.value,
                  })
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Placement on Home
              </label>
              <div className="flex gap-2">
                <Button
                  variant={
                    (formData.offerBanner?.position || "top") === "top"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      position: "top",
                    })
                  }
                >
                  Head
                </Button>
                <Button
                  variant={
                    (formData.offerBanner?.position || "top") === "bottom"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      position: "bottom",
                    })
                  }
                >
                  Bottom
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Show Offers Page/Tab
              </label>
              <div className="flex items-center gap-2">
                <Switch
                  id="offers-tab"
                  checked={!!formData.offerPageEnabled}
                  onCheckedChange={(v) => updateFormData("offerPageEnabled", v)}
                />
                <label htmlFor="offers-tab" className="text-sm text-gray-600">
                  Adds an Offers tab to your menu
                </label>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <div className="flex gap-2">
                <Button
                  variant={
                    (formData.offerBanner?.size || "big") === "small"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      size: "small",
                    })
                  }
                >
                  Small
                </Button>
                <Button
                  variant={
                    (formData.offerBanner?.size || "big") === "big"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      size: "big",
                    })
                  }
                >
                  Big
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shape
              </label>
              <div className="flex gap-2">
                <Button
                  variant={
                    (formData.offerBanner?.shape || "rounded") === "rounded"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      shape: "rounded",
                    })
                  }
                >
                  Rounded
                </Button>
                <Button
                  variant={
                    (formData.offerBanner?.shape || "rounded") === "pill"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      shape: "pill",
                    })
                  }
                >
                  Pill
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Card Aspect
              </label>
              <div className="flex gap-2">
                <Button
                  variant={
                    (formData.offerBanner?.cardAspect || "rectangle") ===
                    "rectangle"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      cardAspect: "rectangle",
                    })
                  }
                >
                  Rectangle
                </Button>
                <Button
                  variant={
                    (formData.offerBanner?.cardAspect || "rectangle") ===
                    "square"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      cardAspect: "square",
                    })
                  }
                >
                  Square
                </Button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Text Size
              </label>
              <div className="flex gap-2">
                <Button
                  variant={
                    (formData.offerBanner?.textSize || "md") === "sm"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      textSize: "sm",
                    })
                  }
                >
                  Small
                </Button>
                <Button
                  variant={
                    (formData.offerBanner?.textSize || "md") === "md"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      textSize: "md",
                    })
                  }
                >
                  Medium
                </Button>
                <Button
                  variant={
                    (formData.offerBanner?.textSize || "md") === "lg"
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() =>
                    updateFormData("offerBanner", {
                      ...(formData.offerBanner || {}),
                      textSize: "lg",
                    })
                  }
                >
                  Large
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-bold mb-6">Your Offers</h3>
          <div className="space-y-4">
            {(formData.offers || []).map((offer, index) => (
              <div
                key={index}
                className="bg-white p-4 rounded-lg shadow flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {offer.image && (
                    <img
                      src={offer.image as string}
                      alt={offer.name}
                      className="w-16 h-16 object-cover rounded-lg"
                    />
                  )}
                  <div>
                    <p className="font-semibold">{offer.name}</p>
                    <p className="text-sm text-gray-600">${offer.price}</p>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => removeOffer(index)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-between mt-8">
          <Button
            onClick={() => (onBack ? onBack() : prevStep())}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={() => (onContinue ? onContinue() : nextStep())}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const MenuProductsStep = () => {
    const [newItem, setNewItem] = useState({
      name: "",
      description: "",
      price: "",
      images: [] as { url: string; alt: string; file?: File }[],
    });

    const addMenuItem = () => {
      if (newItem.name && newItem.price) {
        const itemToAdd = {
          ...newItem,
          id: Date.now().toString(),
          image: newItem.images?.[0],
        };
        const updatedItems = [...formData.menuItems, itemToAdd];
        updateFormData("menuItems", updatedItems);
        setNewItem({ name: "", description: "", price: "", images: [] });
      }
    };

    const removeMenuItem = (index: number) => {
      const updatedItems = formData.menuItems.filter((_, i) => i !== index);
      updateFormData("menuItems", updatedItems);
    };

    const handleUploadImagesForItem = (
      index: number,
      files: FileList | null,
    ) => {
      if (!files) return;
      const images = Array.from(files).map((file) => ({
        url: URL.createObjectURL(file),
        alt: file.name,
        file,
      }));
      const updated = [...formData.menuItems];
      const existing = updated[index] || {};
      const prevImages = Array.isArray(existing.images) ? existing.images : [];
      const newImages = [...prevImages, ...images];
      updated[index] = { ...existing, images: newImages, image: newImages[0] };
      updateFormData("menuItems", updated);
    };

    const handleUploadImagesForNew = (files: FileList | null) => {
      if (!files) return;
      const images = Array.from(files).map((file) => ({
        url: URL.createObjectURL(file),
        alt: file.name,
        file,
      }));
      setNewItem((prev) => ({ ...prev, images: [...prev.images, ...images] }));
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Add your menu or products
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Showcase what you offer. You can add items manually or upload your
            menu.
          </p>
        </div>

        {/* Upload Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Camera className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Upload Menu Image
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Upload a photo of your existing menu
              </p>
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
                onClick={() =>
                  document.getElementById("menu-img-upload")?.click()
                }
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Image File
              </Button>
              <input
                id="menu-img-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    updateFormData("menuPdf", file);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">JPG, PNG up to 10MB</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Upload CSV File
              </h3>
              <p className="text-gray-600 text-sm mb-4">
                Upload structured menu data as CSV
              </p>
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700"
                onClick={() => document.getElementById("csv-upload")?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose CSV File
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const inputEl = e.target as HTMLInputElement;
                  const file = inputEl.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (event) => {
                    try {
                      let text = String(event.target?.result || "");
                      if (!text) return;
                      // Strip BOM and normalize newlines
                      text = text
                        .replace(/^\uFEFF/, "")
                        .replace(/\r\n?|\n/g, "\n");

                      const firstLine = text.split("\n")[0] || "";
                      const delimiter =
                        (firstLine.match(/;/g)?.length || 0) >
                        (firstLine.match(/,/g)?.length || 0)
                          ? ";"
                          : firstLine.includes("\t")
                            ? "\t"
                            : ",";

                      const parseLine = (line: string) => {
                        const out: string[] = [];
                        let cur = "";
                        let inQuotes = false;
                        for (let i = 0; i < line.length; i++) {
                          const ch = line[i];
                          if (ch === '"') {
                            if (inQuotes && line[i + 1] === '"') {
                              cur += '"';
                              i++;
                            } else {
                              inQuotes = !inQuotes;
                            }
                          } else if (ch === delimiter && !inQuotes) {
                            out.push(cur);
                            cur = "";
                          } else {
                            cur += ch;
                          }
                        }
                        out.push(cur);
                        return out.map((v) => v.trim());
                      };

                      const rows = text.split("\n").filter((l) => l.trim());
                      if (rows.length === 0) return;

                      const headerCells = parseLine(rows[0]).map((h) =>
                        h
                          .toLowerCase()
                          .replace(/^"(.*)"$/, "$1")
                          .trim(),
                      );

                      const nameKeys = [
                        "name",
                        "dish",
                        "item",
                        "title",
                        "produkt",
                        "gericht",
                      ];
                      const descKeys = [
                        "description",
                        "desc",
                        "details",
                        "beschreibung",
                      ];
                      const priceKeys = ["price", "preis", "cost", "amount"];

                      // Decide whether the first row is a header by checking for known header keywords
                      const headerMatched = headerCells.some(
                        (h) =>
                          nameKeys.includes(h) ||
                          priceKeys.includes(h) ||
                          descKeys.includes(h),
                      );

                      let dataRows = headerMatched ? rows.slice(1) : rows;

                      let nameIdx = -1;
                      let descIdx = -1;
                      let priceIdx = -1;

                      if (headerMatched) {
                        const getIdx = (keys: string[]) =>
                          headerCells.findIndex((h) => keys.includes(h));
                        nameIdx = getIdx(nameKeys);
                        descIdx = getIdx(descKeys);
                        priceIdx = getIdx(priceKeys);

                        // fallback to positional columns if headers not found
                        if (nameIdx === -1 && headerCells.length >= 1)
                          nameIdx = 0;
                        if (priceIdx === -1 && headerCells.length >= 2)
                          priceIdx = headerCells.length - 1;
                      } else {
                        // no header, assume columns: name, description, ..., price (price last)
                        const sampleCells = parseLine(rows[0]);
                        const colCount = sampleCells.length;
                        nameIdx = 0;
                        descIdx = colCount >= 2 ? 1 : -1;
                        priceIdx = colCount >= 2 ? colCount - 1 : 1;
                      }

                      const newItems = dataRows
                        .map((line, index) => {
                          const cells = parseLine(line).map((v) =>
                            v.replace(/""/g, '"'),
                          );
                          const clean = (s?: string) =>
                            (s || "")
                              .replace(
                                /[\p{Emoji_Presentation}\p{Emoji}\uFE0F]/gu,
                                "",
                              )
                              .trim();
                          const num = (s?: string) =>
                            (s || "")
                              .replace(/[^0-9,\.\-]/g, "")
                              .replace(/,/g, ".");

                          const name = clean(cells[nameIdx] || "");
                          const description = clean(
                            descIdx !== -1 ? cells[descIdx] || "" : "",
                          );
                          const priceRaw = num(cells[priceIdx] || "");

                          const price = priceRaw
                            ? isNaN(Number(priceRaw))
                              ? priceRaw
                              : Number(priceRaw).toFixed(2)
                            : "";

                          return name && price
                            ? {
                                name,
                                description,
                                price,
                                id: `csv-${Date.now()}-${index}`,
                              }
                            : null;
                        })
                        .filter(Boolean) as any[];

                      if (newItems.length) {
                        // append items (multiple imports supported)
                        setFormData((prev) => ({
                          ...prev,
                          menuItems: [...(prev.menuItems || []), ...newItems],
                        }));
                      }

                      // clear input so same file can be uploaded again if needed
                      try {
                        inputEl.value = "";
                      } catch (e) {}
                    } catch (err) {
                      console.error("CSV parse error", err);
                    }
                  };
                  reader.readAsText(file, "utf-8");
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                Format: name,description,price
              </p>
            </div>
          </Card>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="h-px bg-gray-300 flex-1"></div>
            <span className="text-gray-500 font-medium">OR</span>
            <div className="h-px bg-gray-300 flex-1"></div>
          </div>
        </div>

        {/* Add New Item Form */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Item</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Item Name *
              </label>
              <Input
                type="text"
                placeholder="e.g. Signature Latte"
                value={newItem.name}
                onChange={(e) =>
                  setNewItem((prev) => ({ ...prev, name: e.target.value }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Description
              </label>
              <Input
                type="text"
                placeholder="Brief description"
                value={newItem.description}
                onChange={(e) =>
                  setNewItem((prev) => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Price *
              </label>
              <div className="flex">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={newItem.price}
                  onChange={(e) =>
                    setNewItem((prev) => ({ ...prev, price: e.target.value }))
                  }
                  className="flex-1"
                />
                <Button
                  onClick={addMenuItem}
                  disabled={!newItem.name || !newItem.price}
                  className="ml-2 bg-teal-500 hover:bg-teal-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-bold text-gray-700 mb-2">
              Images
            </label>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() =>
                  document.getElementById("new-item-images")?.click()
                }
              >
                Upload Images
              </Button>
              <input
                id="new-item-images"
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleUploadImagesForNew(e.target.files)}
              />
              <div className="text-xs text-gray-500">
                {newItem.images.length} selected
              </div>
            </div>
            {newItem.images.length > 0 && (
              <div className="mt-2 grid grid-cols-4 gap-2">
                {newItem.images.map((im, idx) => (
                  <div
                    key={idx}
                    className="aspect-square bg-gray-100 rounded overflow-hidden"
                  >
                    <img
                      src={normalizeImageSrc(im)}
                      alt={im.alt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Menu Items List */}
        {formData.menuItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Your Menu Items</h3>
            {formData.menuItems.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {item.description}
                      </p>
                    )}
                    {Array.isArray(item.images) && item.images.length > 0 && (
                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {item.images.slice(0, 4).map((im: any, i2: number) => (
                          <div
                            key={i2}
                            className="aspect-square bg-gray-100 rounded overflow-hidden"
                          >
                            <img
                              src={normalizeImageSrc(im)}
                              alt={im.alt}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-teal-600">
                      ${item.price}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMenuItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      document.getElementById(`item-images-${index}`)?.click()
                    }
                  >
                    Upload Images
                  </Button>
                  <input
                    id={`item-images-${index}`}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) =>
                      handleUploadImagesForItem(index, e.target.files)
                    }
                  />
                  <div className="text-xs text-gray-500">
                    {Array.isArray(item.images) ? item.images.length : 0} images
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const ReservationsStep = () => (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Setup reservations
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Enable table bookings for your business. Perfect for restaurants and
          cafés.
        </p>
      </div>

      <div className="space-y-8">
        {/* Enable Reservations Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">
                Enable Reservations
              </h3>
              <p className="text-gray-600">
                Allow customers to book tables online
              </p>
            </div>
            <Button
              variant={formData.reservationsEnabled ? "default" : "outline"}
              onClick={() =>
                updateFormData(
                  "reservationsEnabled",
                  !formData.reservationsEnabled,
                )
              }
              className={
                formData.reservationsEnabled
                  ? "bg-teal-500 hover:bg-teal-600"
                  : ""
              }
            >
              {formData.reservationsEnabled ? "Enabled" : "Disabled"}
            </Button>
          </div>
        </Card>

        {formData.reservationsEnabled && (
          <>
            {/* Maximum Guests */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Booking Settings
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Maximum party size
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    defaultValue={formData.maxGuests.toString()}
                    onChange={(e) =>
                      updateFormData(
                        "maxGuests",
                        parseInt(e.target.value) || 10,
                      )
                    }
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notification method
                  </label>
                  <select
                    value={formData.notificationMethod}
                    onChange={(e) =>
                      updateFormData("notificationMethod", e.target.value)
                    }
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="both">Email & Phone</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Reservation Button Customization */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Reservation Button Style
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Button Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={formData.reservationButtonColor}
                      onChange={(e) =>
                        updateFormData("reservationButtonColor", e.target.value)
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.reservationButtonColor}
                      onChange={(e) =>
                        updateFormData("reservationButtonColor", e.target.value)
                      }
                      className="font-mono flex-1"
                      placeholder="#2563EB"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Text Color
                  </label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={formData.reservationButtonTextColor || "#FFFFFF"}
                      onChange={(e) =>
                        updateFormData(
                          "reservationButtonTextColor",
                          e.target.value,
                        )
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.reservationButtonTextColor || "#FFFFFF"}
                      onChange={(e) =>
                        updateFormData(
                          "reservationButtonTextColor",
                          e.target.value,
                        )
                      }
                      className="font-mono flex-1"
                      placeholder="#FFFFFF"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Button Shape
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "rounded", name: "Rounded", class: "rounded-lg" },
                      { id: "pill", name: "Pill", class: "rounded-full" },
                      { id: "square", name: "Square", class: "rounded-none" },
                    ].map((shape) => (
                      <Button
                        key={shape.id}
                        variant={
                          formData.reservationButtonShape === shape.id
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() =>
                          updateFormData("reservationButtonShape", shape.id)
                        }
                        className={`${shape.class} ${formData.reservationButtonShape === shape.id ? "bg-teal-500 hover:bg-teal-600" : ""}`}
                      >
                        {shape.name}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
              {/* Button Preview */}
              <div className="mt-4">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Preview
                </label>
                <button
                  className={`px-6 py-3 font-medium transition-colors ${
                    formData.reservationButtonShape === "rounded"
                      ? "rounded-lg"
                      : formData.reservationButtonShape === "pill"
                        ? "rounded-full"
                        : "rounded-none"
                  }`}
                  style={{
                    backgroundColor: formData.reservationButtonColor,
                    color: formData.reservationButtonTextColor || "#FFFFFF",
                  }}
                >
                  <Calendar className="w-4 h-4 mr-2 inline" />
                  Reserve Table
                </button>
              </div>
            </Card>

            {/* Time Slots */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Available Time Slots
              </h3>
              <p className="text-gray-600 mb-4">
                Set the times when customers can make reservations
              </p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 14 }, (_, i) => {
                  const hour = 10 + i;
                  const time = `${hour}:00`;
                  const isSelected = formData.timeSlots.includes(time);

                  return (
                    <Button
                      key={time}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newSlots = isSelected
                          ? formData.timeSlots.filter((slot) => slot !== time)
                          : [...formData.timeSlots, time];
                        updateFormData("timeSlots", newSlots);
                      }}
                      className={
                        isSelected ? "bg-teal-500 hover:bg-teal-600" : ""
                      }
                    >
                      {time}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </>
        )}
      </div>

      <div className="flex justify-between mt-8">
        <Button type="button" onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const ContactSocialStep = () => {
    const contactMethods = [
      {
        id: "phone",
        icon: <Phone className="w-5 h-5" />,
        label: "Phone",
        placeholder: "+1 (555) 123-4567",
      },
      {
        id: "email",
        icon: <Mail className="w-5 h-5" />,
        label: "Email",
        placeholder: "hello@yourbusiness.com",
      },
      {
        id: "address",
        icon: <MapPin className="w-5 h-5" />,
        label: "Address",
        placeholder: "123 Main St, City, State",
      },
    ];

    const socialPlatforms = [
      {
        id: "instagram",
        icon: <Instagram className="w-5 h-5" />,
        label: "Instagram",
        placeholder: "@yourbusiness",
      },
      {
        id: "facebook",
        icon: <Facebook className="w-5 h-5" />,
        label: "Facebook",
        placeholder: "facebook.com/yourbusiness",
      },
    ];

    const getContactValue = (methodId: string) => {
      if (!formData.contactMethods) return "";
      if (Array.isArray(formData.contactMethods)) {
        const contact = formData.contactMethods.find(
          (c) => c.type === methodId,
        );
        return contact ? contact.value : "";
      }
      return formData.contactMethods[methodId] || "";
    };

    const getSocialValue = (platformId: string) => {
      if (!formData.socialMedia) return "";
      return formData.socialMedia[platformId] || "";
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Contact & social media
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            How can customers reach you? Add your contact information and social
            media links.
          </p>
        </div>

        <div className="space-y-8">
          {/* Contact Information */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Contact Information
            </h3>
            <div className="space-y-4">
              {contactMethods.map((method) => (
                <div key={method.id}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {method.label}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400">
                      {method.icon}
                    </div>
                    <Input
                      type="text"
                      placeholder={method.placeholder}
                      defaultValue={getContactValue(method.id)}
                      ref={setInputRef(`contact_${method.id}`)}
                      onBlur={handleInputBlur(`contact_${method.id}`)}
                      className="pl-12"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Social Media */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Social Media
            </h3>
            <div className="space-y-4">
              {socialPlatforms.map((platform) => (
                <div key={platform.id}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    {platform.label}
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400">
                      {platform.icon}
                    </div>
                    <Input
                      type="text"
                      placeholder={platform.placeholder}
                      defaultValue={getSocialValue(platform.id)}
                      ref={setInputRef(`social_${platform.id}`)}
                      onBlur={handleInputBlur(`social_${platform.id}`)}
                      className="pl-12"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Instagram Sync */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-md font-bold text-gray-900">
                    Instagram Integration
                  </h4>
                  <p className="text-sm text-gray-600">
                    Automatically sync your Instagram posts to your website
                  </p>
                </div>
                <Button
                  variant={formData.instagramSync ? "default" : "outline"}
                  onClick={() =>
                    updateFormData("instagramSync", !formData.instagramSync)
                  }
                  className={
                    formData.instagramSync
                      ? "bg-teal-500 hover:bg-teal-600"
                      : ""
                  }
                >
                  {formData.instagramSync ? "Enabled" : "Disabled"}
                </Button>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Media Gallery Step (Step 9)
  const MediaGalleryStep = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleFileUpload = (files: FileList | null) => {
      if (files) {
        const newFiles = Array.from(files);
        setSelectedFiles((prev) => [...prev, ...newFiles]);
        const updatedGallery = [
          ...formData.gallery,
          ...newFiles.map((file) => ({
            url: URL.createObjectURL(file),
            alt: file.name,
            file: file,
          })),
        ];
        updateFormData("gallery", updatedGallery);
      }
    };

    const removeImage = (index: number) => {
      const updatedGallery = formData.gallery.filter((_, i) => i !== index);
      updateFormData("gallery", updatedGallery);
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Upload your photos
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Show off your space, food, and atmosphere. High-quality images help
            attract customers and showcase your business personality.
          </p>
        </div>

        {/* Upload Zone */}
        <Card className="p-8 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Upload Photos
            </h3>
            <p className="text-gray-600 mb-4">
              Drag and drop your images or click to browse
            </p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById("gallery-upload")?.click()}
              className="border-2 border-teal-300 hover:border-teal-400 hover:bg-teal-50 text-teal-700"
            >
              <Upload className="w-5 h-5 mr-2" />
              Choose Images
            </Button>
            <input
              id="gallery-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <p className="text-xs text-gray-500 mt-4">
              JPG, PNG up to 5MB each • Maximum 20 images
            </p>
          </div>
        </Card>

        {/* Gallery Preview */}
        {formData.gallery.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">
              Your Gallery
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.gallery.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={normalizeImageSrc(image)}
                      alt={image.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Advanced Features Step (Step 10)
  const AdvancedFeaturesStep = () => {
    const [activeFeature, setActiveFeature] = useState<string | null>(null);
    const features = [
      {
        id: "onlineOrdering",
        title: "Online Ordering",
        description:
          "Allow customers to place orders directly from your website",
        icon: <ShoppingBag className="w-8 h-8" />,
        premium: false,
      },
      {
        id: "onlineStore",
        title: "Online Store",
        description:
          "Sell products and merchandise online with payment processing",
        icon: <Store className="w-8 h-8" />,
        premium: true,
      },
      {
        id: "teamArea",
        title: "Team Section",
        description: "Showcase your team members and their roles",
        icon: <Users className="w-8 h-8" />,
        premium: false,
      },
      {
        id: "loyaltyEnabled",
        title: "Stamp Card / Loyalty",
        description: "Reward returning customers with digital stamps",
        icon: <Star className="w-8 h-8" />,
        premium: false,
      },
      {
        id: "couponsEnabled",
        title: "Coupons / Vouchers",
        description: "Create and manage digital coupon campaigns",
        icon: <Crown className="w-8 h-8" />,
        premium: false,
      },
      {
        id: "offersEnabled",
        title: "Current Offers / Specials",
        description: "Highlight time-limited deals and bundles",
        icon: <Zap className="w-8 h-8" />,
        premium: false,
      },
    ];

    const handleFeatureClick = (featureId: string, enabled: boolean) => {
      const willEnable = !enabled;
      updateFormData(featureId, willEnable);
      if (willEnable) {
        setPendingFeatureConfig(featureId);
        const idx = configuratorSteps.findIndex(
          (s) => s.id === "feature-config",
        );
        if (idx !== -1) setCurrentStep(idx);
      } else {
        setActiveFeature(null);
      }
    };

    const renderFeatureConfig = () => {
      if (!activeFeature) return null;

      switch (activeFeature) {
        case "onlineOrdering":
          return (
            <Card className="p-6 mt-6">
              <h4 className="text-lg font-bold mb-3">
                Online Ordering Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Show cart in top bar
                  </label>
                  <input
                    type="checkbox"
                    checked={!!formData.showCartInTopBar}
                    onChange={(e) =>
                      updateFormData("showCartInTopBar", e.target.checked)
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Order confirmation message
                  </label>
                  <input
                    type="text"
                    value={
                      formData.orderConfirmationMessage ||
                      "Thanks! We received your order."
                    }
                    onChange={(e) =>
                      updateFormData("orderConfirmationMessage", e.target.value)
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    POS Provider
                  </label>
                  <select
                    value={formData.posProvider}
                    onChange={(e) =>
                      updateFormData("posProvider", e.target.value)
                    }
                    className="w-full"
                  >
                    <option value="none">None</option>
                    <option value="sumup">SumUp</option>
                    <option value="shopify">Shopify POS</option>
                    <option value="local">Local POS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Options
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(["applePay", "googlePay", "card", "cash"] as const).map(
                      (k) => (
                        <label
                          key={k}
                          className="inline-flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={!!formData.paymentMethods?.[k]}
                            onChange={(e) =>
                              updateFormData("paymentMethods", {
                                ...formData.paymentMethods,
                                [k]: e.target.checked,
                              })
                            }
                          />
                          <span className="capitalize">
                            {k.replace(/([A-Z])/g, " $1")}
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Order Options
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {(["delivery", "pickup", "table"] as const).map((k) => (
                      <label
                        key={k}
                        className="inline-flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={!!formData.orderOptions?.[k]}
                          onChange={(e) =>
                            updateFormData("orderOptions", {
                              ...formData.orderOptions,
                              [k]: e.target.checked,
                            })
                          }
                        />
                        <span className="capitalize">{k}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!formData.deliveryAddressRequired}
                      onChange={(e) =>
                        updateFormData(
                          "deliveryAddressRequired",
                          e.target.checked,
                        )
                      }
                    />
                    <span>Require delivery address for delivery orders</span>
                  </label>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-3">
                Configure POS, payments, and order flows. Cart will be
                accessible across pages.
              </p>
            </Card>
          );

        case "onlineStore":
          return (
            <Card className="p-6 mt-6">
              <h4 className="text-lg font-bold mb-3">Online Store Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment provider
                  </label>
                  <select
                    value={
                      (formData.storeConfig && formData.storeConfig.provider) ||
                      "stripe"
                    }
                    onChange={(e) =>
                      updateFormData("storeConfig", {
                        ...(formData.storeConfig || {}),
                        provider: e.target.value,
                      })
                    }
                    className="w-full"
                  >
                    <option value="stripe">Stripe</option>
                    <option value="paypal">PayPal</option>
                    <option value="manual">Manual (offline)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Currency
                  </label>
                  <input
                    type="text"
                    value={
                      (formData.storeConfig && formData.storeConfig.currency) ||
                      "USD"
                    }
                    onChange={(e) =>
                      updateFormData("storeConfig", {
                        ...(formData.storeConfig || {}),
                        currency: e.target.value,
                      })
                    }
                    className="w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Categories
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <Input
                      type="text"
                      placeholder="Add category"
                      onKeyDown={(e) => {
                        const val = (e.target as HTMLInputElement).value.trim();
                        if (e.key === "Enter" && val) {
                          updateFormData("categories", [
                            ...(formData.categories || []),
                            val,
                          ]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500">Press Enter</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(formData.categories || []).map((c: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 rounded text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">
                    Options
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.showStockLevels}
                      onChange={(e) =>
                        updateFormData("showStockLevels", e.target.checked)
                      }
                    />
                    <span>Show stock levels</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.discountsEnabled}
                      onChange={(e) =>
                        updateFormData("discountsEnabled", e.target.checked)
                      }
                    />
                    <span>Enable discounts</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.bundlesEnabled}
                      onChange={(e) =>
                        updateFormData("bundlesEnabled", e.target.checked)
                      }
                    />
                    <span>Enable bundles</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.seasonalOffersEnabled}
                      onChange={(e) =>
                        updateFormData(
                          "seasonalOffersEnabled",
                          e.target.checked,
                        )
                      }
                    />
                    <span>Enable seasonal offers</span>
                  </label>
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-3">
                Manage categories, stock visibility and promotions. Product
                details (images/allergens) are configured per item in
                Menu/Products step.
              </p>
            </Card>
          );

        case "teamArea":
          return (
            <Card className="p-6 mt-6">
              <h4 className="text-lg font-bold mb-3">Team Section Settings</h4>
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Add team members to showcase on your About page.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Name
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. Alex"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const name = (
                            e.target as HTMLInputElement
                          ).value.trim();
                          if (name) {
                            updateFormData("teamMembers", [
                              ...(formData.teamMembers || []),
                              { name, role: "", status: "on_duty" },
                            ]);
                            (e.target as HTMLInputElement).value = "";
                          }
                        }
                      }}
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Press Enter to add
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Quick Roles
                    </label>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {["chef", "barista", "waiter"].map((r) => (
                        <button
                          key={r}
                          className="px-2 py-1 border rounded"
                          onClick={() =>
                            updateFormData("teamMembers", [
                              ...(formData.teamMembers || []),
                              {
                                name: r.charAt(0).toUpperCase() + r.slice(1),
                                role: r,
                                status: "off_duty",
                              },
                            ])
                          }
                        >
                          + {r}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {(formData.teamMembers || []).map((m: any, i: number) => (
                    <div key={i} className="p-2 border rounded">
                      <div className="font-semibold text-sm">{m.name}</div>
                      <div className="text-xs text-gray-600">{m.role}</div>
                      <div className="text-xs">Status: {m.status}</div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );

        case "loyaltyEnabled":
          return (
            <Card className="p-6 mt-6">
              <h4 className="text-lg font-bold mb-3">Loyalty / Stamp Card</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Stamps for reward
                  </label>
                  <Input
                    type="number"
                    value={formData.loyaltyConfig?.stampsForReward || 10}
                    onChange={(e) =>
                      updateFormData("loyaltyConfig", {
                        ...(formData.loyaltyConfig || {}),
                        stampsForReward: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reward type
                  </label>
                  <select
                    value={formData.loyaltyConfig?.rewardType || "discount"}
                    onChange={(e) =>
                      updateFormData("loyaltyConfig", {
                        ...(formData.loyaltyConfig || {}),
                        rewardType: e.target.value,
                      })
                    }
                    className="w-full"
                  >
                    <option value="discount">Discount</option>
                    <option value="free_item">Free Item</option>
                    <option value="voucher">Voucher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expiration date
                  </label>
                  <Input
                    type="date"
                    value={formData.loyaltyConfig?.expiryDate || ""}
                    onChange={(e) =>
                      updateFormData("loyaltyConfig", {
                        ...(formData.loyaltyConfig || {}),
                        expiryDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </Card>
          );

        case "couponsEnabled":
          return (
            <Card className="p-6 mt-6">
              <h4 className="text-lg font-bold mb-3">Coupons / Vouchers</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select id="coupon-type" className="border rounded p-2">
                    <option value="amount">Fixed Amount</option>
                    <option value="percent">Percentage</option>
                    <option value="bogo">2-for-1</option>
                  </select>
                  <Input id="coupon-value" type="text" placeholder="Value" />
                  <Input
                    id="coupon-conditions"
                    type="text"
                    placeholder="Conditions"
                  />
                  <Button
                    onClick={() => {
                      const type = (
                        document.getElementById(
                          "coupon-type",
                        ) as HTMLSelectElement
                      ).value;
                      const value = (
                        document.getElementById(
                          "coupon-value",
                        ) as HTMLInputElement
                      ).value;
                      const conditions = (
                        document.getElementById(
                          "coupon-conditions",
                        ) as HTMLInputElement
                      ).value;
                      if (value) {
                        updateFormData("coupons", [
                          ...(formData.coupons || []),
                          { type, value, conditions },
                        ]);
                        (
                          document.getElementById(
                            "coupon-value",
                          ) as HTMLInputElement
                        ).value = "";
                        (
                          document.getElementById(
                            "coupon-conditions",
                          ) as HTMLInputElement
                        ).value = "";
                      }
                    }}
                  >
                    Add Coupon
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(formData.coupons || []).map((c: any, i: number) => (
                    <div key={i} className="p-3 border rounded">
                      <div className="text-sm font-semibold">
                        {c.type} - {c.value}
                      </div>
                      <div className="text-xs text-gray-600">
                        {c.conditions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );

        case "offersEnabled":
          return (
            <Card className="p-6 mt-6">
              <h4 className="text-lg font-bold mb-3">
                Current Offers / Specials
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input
                  id="offer-window"
                  type="text"
                  placeholder="Time window (e.g., 17:00-19:00)"
                />
                <Input
                  id="offer-products"
                  type="text"
                  placeholder="Products (comma-separated)"
                />
                <Input
                  id="offer-discount"
                  type="text"
                  placeholder="Discount / Bundle"
                />
              </div>
              <div className="mt-3">
                <Button
                  onClick={() => {
                    const time = (
                      document.getElementById(
                        "offer-window",
                      ) as HTMLInputElement
                    ).value;
                    const products = (
                      document.getElementById(
                        "offer-products",
                      ) as HTMLInputElement
                    ).value;
                    const discount = (
                      document.getElementById(
                        "offer-discount",
                      ) as HTMLInputElement
                    ).value;
                    if (time && products) {
                      updateFormData("offers", [
                        ...(formData.offers || []),
                        { time, products, discount },
                      ]);
                      (
                        document.getElementById(
                          "offer-window",
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "offer-products",
                        ) as HTMLInputElement
                      ).value = "";
                      (
                        document.getElementById(
                          "offer-discount",
                        ) as HTMLInputElement
                      ).value = "";
                    }
                  }}
                >
                  Add Offer
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                {(formData.offers || []).map((o: any, i: number) => (
                  <div key={i} className="p-3 border rounded">
                    <div className="text-sm font-semibold">{o.time}</div>
                    <div className="text-xs text-gray-600">{o.products}</div>
                    <div className="text-xs">{o.discount}</div>
                  </div>
                ))}
              </div>
            </Card>
          );

        default:
          return null;
      }
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Optional features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enable advanced functionality to enhance your website and provide
            better customer experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const isEnabled = formData[feature.id];
            return (
              <Card
                key={feature.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${isEnabled ? "border-teal-500 bg-teal-50" : "border-gray-200 hover:border-teal-300"}`}
                onClick={() => handleFeatureClick(feature.id, isEnabled)}
              >
                <CardContent className="p-6 text-center">
                  <div
                    className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isEnabled ? "bg-teal-500 text-white" : "bg-gray-100 text-gray-600"}`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">
                    {feature.title}
                  </h3>
                  {feature.premium && (
                    <div className="mb-2">
                      <span className="px-2 py-1 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold rounded-full">
                        Premium
                      </span>
                    </div>
                  )}
                  <p className="text-gray-600 text-sm mb-4">
                    {feature.description}
                  </p>
                  {isEnabled && (
                    <div className="mt-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {renderFeatureConfig()}

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Feature Config Step (dynamic)
  const FeatureConfigStep = () => {
    useEffect(() => {
      if (!pendingFeatureConfig) {
        nextStep();
      }
    }, [pendingFeatureConfig]);

    const finish = () => {
      setPendingFeatureConfig(null);
      nextStep();
    };

    const goBack = () => {
      setPendingFeatureConfig(null);
      const idx = configuratorSteps.findIndex(
        (s) => s.id === "advanced-features",
      );
      if (idx !== -1) setCurrentStep(idx);
    };

    const render = () => {
      switch (pendingFeatureConfig) {
        case "onlineOrdering":
          return (
            <Card className="p-6">
              <h4 className="text-lg font-bold mb-3">
                Online Ordering Settings
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    POS Provider
                  </label>
                  <select
                    value={formData.posProvider}
                    onChange={(e) =>
                      updateFormData("posProvider", e.target.value)
                    }
                    className="w-full"
                  >
                    <option value="none">None</option>
                    <option value="sumup">SumUp</option>
                    <option value="shopify">Shopify POS</option>
                    <option value="local">Local POS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Payment Options
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {(["applePay", "googlePay", "card", "cash"] as const).map(
                      (k) => (
                        <label
                          key={k}
                          className="inline-flex items-center space-x-2"
                        >
                          <input
                            type="checkbox"
                            checked={!!formData.paymentMethods?.[k]}
                            onChange={(e) =>
                              updateFormData("paymentMethods", {
                                ...formData.paymentMethods,
                                [k]: e.target.checked,
                              })
                            }
                          />
                          <span className="capitalize">
                            {k.replace(/([A-Z])/g, " $1")}
                          </span>
                        </label>
                      ),
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Order Options
                  </label>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    {(["delivery", "pickup", "table"] as const).map((k) => (
                      <label
                        key={k}
                        className="inline-flex items-center space-x-2"
                      >
                        <input
                          type="checkbox"
                          checked={!!formData.orderOptions?.[k]}
                          onChange={(e) =>
                            updateFormData("orderOptions", {
                              ...formData.orderOptions,
                              [k]: e.target.checked,
                            })
                          }
                        />
                        <span className="capitalize">{k}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="inline-flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={!!formData.deliveryAddressRequired}
                      onChange={(e) =>
                        updateFormData(
                          "deliveryAddressRequired",
                          e.target.checked,
                        )
                      }
                    />
                    <span>Require delivery address for delivery orders</span>
                  </label>
                </div>
              </div>
            </Card>
          );
        case "onlineStore":
          return (
            <Card className="p-6">
              <h4 className="text-lg font-bold mb-3">Online Store Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Categories
                  </label>
                  <div className="flex items-center space-x-2 mb-2">
                    <Input
                      type="text"
                      placeholder="Add category"
                      onKeyDown={(e) => {
                        const v = (e.target as HTMLInputElement).value.trim();
                        if (e.key === "Enter" && v) {
                          updateFormData("categories", [
                            ...(formData.categories || []),
                            v,
                          ]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }}
                    />
                    <span className="text-xs text-gray-500">Press Enter</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {(formData.categories || []).map((c: string, i: number) => (
                      <span
                        key={i}
                        className="px-2 py-1 bg-gray-100 rounded text-xs"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">
                    Options
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.showStockLevels}
                      onChange={(e) =>
                        updateFormData("showStockLevels", e.target.checked)
                      }
                    />
                    <span>Show stock levels</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.discountsEnabled}
                      onChange={(e) =>
                        updateFormData("discountsEnabled", e.target.checked)
                      }
                    />
                    <span>Enable discounts</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.bundlesEnabled}
                      onChange={(e) =>
                        updateFormData("bundlesEnabled", e.target.checked)
                      }
                    />
                    <span>Enable bundles</span>
                  </label>
                  <label className="inline-flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={!!formData.seasonalOffersEnabled}
                      onChange={(e) =>
                        updateFormData(
                          "seasonalOffersEnabled",
                          e.target.checked,
                        )
                      }
                    />
                    <span>Enable seasonal offers</span>
                  </label>
                </div>
              </div>
            </Card>
          );
        case "teamArea":
          return (
            <Card className="p-6">
              <h4 className="text-lg font-bold mb-3">Team Section Settings</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input
                    type="text"
                    placeholder="e.g. Alex"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        const name = (
                          e.target as HTMLInputElement
                        ).value.trim();
                        if (name) {
                          updateFormData("teamMembers", [
                            ...(formData.teamMembers || []),
                            { name, role: "", status: "on_duty" },
                          ]);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Press Enter to add
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Quick Roles
                  </label>
                  <div className="flex flex-wrap gap-2 text-xs">
                    {["chef", "barista", "waiter"].map((r) => (
                      <button
                        key={r}
                        className="px-2 py-1 border rounded"
                        onClick={() =>
                          updateFormData("teamMembers", [
                            ...(formData.teamMembers || []),
                            {
                              name: r.charAt(0).toUpperCase() + r.slice(1),
                              role: r,
                              status: "off_duty",
                            },
                          ])
                        }
                      >
                        + {r}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          );
        case "loyaltyEnabled":
          return (
            <Card className="p-6">
              <h4 className="text-lg font-bold mb-3">Loyalty / Stamp Card</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Stamps for reward
                  </label>
                  <Input
                    type="number"
                    value={formData.loyaltyConfig?.stampsForReward || 10}
                    onChange={(e) =>
                      updateFormData("loyaltyConfig", {
                        ...(formData.loyaltyConfig || {}),
                        stampsForReward: Number(e.target.value),
                      })
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Reward type
                  </label>
                  <select
                    value={formData.loyaltyConfig?.rewardType || "discount"}
                    onChange={(e) =>
                      updateFormData("loyaltyConfig", {
                        ...(formData.loyaltyConfig || {}),
                        rewardType: e.target.value,
                      })
                    }
                    className="w-full"
                  >
                    <option value="discount">Discount</option>
                    <option value="free_item">Free Item</option>
                    <option value="voucher">Voucher</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Expiration date
                  </label>
                  <Input
                    type="date"
                    value={formData.loyaltyConfig?.expiryDate || ""}
                    onChange={(e) =>
                      updateFormData("loyaltyConfig", {
                        ...(formData.loyaltyConfig || {}),
                        expiryDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </Card>
          );
        case "couponsEnabled":
          return (
            <Card className="p-6">
              <h4 className="text-lg font-bold mb-3">Coupons / Vouchers</h4>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <select id="coupon-type-step" className="border rounded p-2">
                    <option value="amount">Fixed Amount</option>
                    <option value="percent">Percentage</option>
                    <option value="bogo">2-for-1</option>
                  </select>
                  <Input
                    id="coupon-value-step"
                    type="text"
                    placeholder="Value"
                  />
                  <Input
                    id="coupon-conditions-step"
                    type="text"
                    placeholder="Conditions"
                  />
                  <Button
                    onClick={() => {
                      const type = (
                        document.getElementById(
                          "coupon-type-step",
                        ) as HTMLSelectElement
                      ).value;
                      const value = (
                        document.getElementById(
                          "coupon-value-step",
                        ) as HTMLInputElement
                      ).value;
                      const conditions = (
                        document.getElementById(
                          "coupon-conditions-step",
                        ) as HTMLInputElement
                      ).value;
                      if (value) {
                        updateFormData("coupons", [
                          ...(formData.coupons || []),
                          { type, value, conditions },
                        ]);
                        (
                          document.getElementById(
                            "coupon-value-step",
                          ) as HTMLInputElement
                        ).value = "";
                        (
                          document.getElementById(
                            "coupon-conditions-step",
                          ) as HTMLInputElement
                        ).value = "";
                      }
                    }}
                  >
                    Add Coupon
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {(formData.coupons || []).map((c: any, i: number) => (
                    <div key={i} className="p-3 border rounded">
                      <div className="text-sm font-semibold">
                        {c.type} - {c.value}
                      </div>
                      <div className="text-xs text-gray-600">
                        {c.conditions}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          );
        case "offersEnabled":
          return <OffersStep onBack={goBack} onContinue={finish} />;
        default:
          return null;
      }
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            Feature configuration
          </h2>
        </div>
        {render()}
        <div className="flex justify-between mt-8">
          <Button onClick={goBack} variant="outline" size="lg">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={finish}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Save & Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Domain & Hosting Step (Step 11)
  const DomainHostingStep = () => {
    const [domainSearch, setDomainSearch] = useState("");
    const [availableDomains, setAvailableDomains] = useState([
      { domain: "yourbusiness.com", available: true, price: "$12.99/year" },
      { domain: "yourbusiness.net", available: true, price: "$13.99/year" },
      { domain: "yourbusiness.org", available: false, price: "Taken" },
    ]);

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose your domain
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select how customers will find your website. You can use your own
            domain or get a free subdomain.
          </p>
        </div>

        <div className="space-y-8">
          {/* Domain Options */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                !formData.hasDomain
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              }`}
              onClick={() => updateFormData("hasDomain", false)}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Free Subdomain
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Get started quickly with a free subdomain
                </p>
                <div className="text-green-600 font-bold">FREE</div>
                {!formData.hasDomain && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                formData.hasDomain
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300"
              }`}
              onClick={() => updateFormData("hasDomain", true)}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  Custom Domain
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  Professional domain for your business
                </p>
                <div className="text-blue-600 font-bold">From $12.99/year</div>
                {formData.hasDomain && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Free Subdomain Setup */}
          {!formData.hasDomain && (
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Your Free Website URL
              </h3>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="yourbusiness"
                  defaultValue={formData.businessName
                    .toLowerCase()
                    .replace(/\s+/g, "")}
                  onChange={(e) =>
                    updateFormData("selectedDomain", e.target.value)
                  }
                  className="flex-1"
                />
                <span className="text-gray-500 font-mono">
                  .{getBaseHost()}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your website will be available at: {getDisplayedDomain()}
              </p>
            </Card>
          )}

          {/* Custom Domain Setup */}
          {formData.hasDomain && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Connect Your Custom Domain
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Enter Your Domain
                    </label>
                    <div className="flex space-x-2">
                      <Input
                        type="text"
                        placeholder="e.g. yourbusiness.com"
                        value={formData.domainName || ""}
                        onChange={(e) =>
                          updateFormData("domainName", e.target.value)
                        }
                        className="flex-1"
                      />
                      <Button
                        variant="outline"
                        onClick={() => {
                          if (formData.domainName) {
                            // Simulate domain validation
                            alert(
                              `Domain ${formData.domainName} is ready to connect!`,
                            );
                          }
                        }}
                      >
                        Validate
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Enter a domain you already own or plan to purchase
                    </p>
                  </div>

                  {formData.domainName && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">
                        DNS Configuration Required
                      </h4>
                      <p className="text-sm text-blue-800 mb-3">
                        To connect your domain, add these DNS records:
                      </p>
                      <div className="bg-white rounded border font-mono text-xs p-3 space-y-1">
                        <div>
                          <strong>A Record:</strong> @ → 76.76.19.61
                        </div>
                        <div>
                          <strong>CNAME:</strong> www → your-site.
                          {getBaseHost()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Or Search New Domains
                </h3>
                <div className="flex space-x-2 mb-4">
                  <Input
                    type="text"
                    placeholder="Enter domain name to search"
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                    className="flex-1"
                  />
                  <Button variant="outline">Search</Button>
                </div>

                <div className="space-y-3">
                  {availableDomains.map((domain, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${domain.available ? "bg-green-500" : "bg-red-500"}`}
                        ></div>
                        <span className="font-mono font-medium">
                          {domain.domain}
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span
                          className={`text-sm ${domain.available ? "text-green-600" : "text-red-600"}`}
                        >
                          {domain.price}
                        </span>
                        {domain.available && (
                          <Button
                            size="sm"
                            className="bg-teal-500 hover:bg-teal-600"
                            onClick={() =>
                              updateFormData("domainName", domain.domain)
                            }
                          >
                            Select
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Domain API Integration Info */}
              <Card className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                  <Globe className="w-5 h-5 mr-2 text-purple-600" />
                  Automated Domain Management
                </h3>
                <p className="text-sm text-gray-700 mb-4">
                  We integrate with leading domain and hosting providers for
                  seamless setup:
                </p>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <h4 className="font-semibold text-purple-900 text-sm mb-1">
                      Vercel
                    </h4>
                    <p className="text-xs text-gray-600">
                      Auto-deploy & custom domains
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <h4 className="font-semibold text-purple-900 text-sm mb-1">
                      Netlify
                    </h4>
                    <p className="text-xs text-gray-600">
                      Edge functions & DNS management
                    </p>
                  </div>
                  <div className="bg-white rounded-lg p-3 border border-purple-100">
                    <h4 className="font-semibold text-purple-900 text-sm mb-1">
                      CloudFlare
                    </h4>
                    <p className="text-xs text-gray-600">
                      DNS, SSL & CDN integration
                    </p>
                  </div>
                </div>
                <div className="mt-4 p-3 bg-purple-100 rounded-lg">
                  <p className="text-xs text-purple-800">
                    💡 <strong>Pro Tip:</strong> Custom domains will be
                    automatically configured with SSL, CDN, and optimized for
                    global performance.
                  </p>
                </div>
              </Card>
            </div>
          )}
        </div>

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // SEO Optimization Step (Step 11)
  const SEOOptimizationStep = () => {
    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            SEO Optimization
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Improve your search engine visibility and help customers find your
            business online.
          </p>
        </div>

        <div className="space-y-8">
          {/* Basic SEO Settings */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Search className="w-5 h-5 mr-2 text-blue-600" />
              Basic SEO Settings
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Meta Title
                </label>
                <Input
                  type="text"
                  placeholder={`${formData.businessName} - ${formData.slogan || "Best Local Business"}`}
                  value={formData.metaTitle || ""}
                  onChange={(e) => updateFormData("metaTitle", e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The title that appears in search results (50-60 characters
                  recommended)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Meta Description
                </label>
                <Textarea
                  placeholder={`Discover ${formData.businessName} ${formData.location ? `in ${formData.location}` : ""}. ${formData.uniqueDescription || "Quality service and great experience await you."}`}
                  value={formData.metaDescription || ""}
                  onChange={(e) =>
                    updateFormData("metaDescription", e.target.value)
                  }
                  className="w-full"
                  rows={3}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Description that appears in search results (150-160 characters
                  recommended)
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Keywords
                </label>
                <Input
                  type="text"
                  placeholder={`${formData.businessType}, ${formData.location}, restaurant, food, dining`}
                  value={formData.keywords || ""}
                  onChange={(e) => updateFormData("keywords", e.target.value)}
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated keywords that describe your business
                </p>
              </div>
            </div>
          </Card>

          {/* Social Media Image */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Share2 className="w-5 h-5 mr-2 text-purple-600" />
              Social Media Sharing
            </h3>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Social Media Image
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                {formData.socialMediaImage ? (
                  <div className="space-y-3">
                    <img
                      src={
                        typeof formData.socialMediaImage === "string"
                          ? formData.socialMediaImage
                          : URL.createObjectURL(formData.socialMediaImage)
                      }
                      alt="Social media preview"
                      className="mx-auto h-32 object-cover rounded"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateFormData("socialMediaImage", null)}
                    >
                      Remove Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Camera className="w-12 h-12 text-gray-400 mx-auto" />
                    <div>
                      <Button
                        variant="outline"
                        onClick={() =>
                          document
                            .getElementById("social-image-upload")
                            ?.click()
                        }
                      >
                        Upload Image
                      </Button>
                      <input
                        id="social-image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            updateFormData("socialMediaImage", file);
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Image that appears when your website is shared on social
                      media
                    </p>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Analytics */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Eye className="w-5 h-5 mr-2 text-green-600" />
              Analytics & Tracking
            </h3>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Google Analytics ID (Optional)
              </label>
              <Input
                type="text"
                placeholder="G-XXXXXXXXXX"
                value={formData.googleAnalyticsId || ""}
                onChange={(e) =>
                  updateFormData("googleAnalyticsId", e.target.value)
                }
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">
                Add your Google Analytics tracking ID to monitor website traffic
              </p>
            </div>
          </Card>

          {/* Premium SEO API */}
          <Card className="p-6 bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-200">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Crown className="w-5 h-5 mr-2 text-orange-600" />
              Premium SEO Optimization
            </h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="seo-api"
                  checked={formData.seoApiOptimization}
                  onChange={(e) =>
                    updateFormData("seoApiOptimization", e.target.checked)
                  }
                  className="mt-1"
                />
                <div className="flex-1">
                  <label
                    htmlFor="seo-api"
                    className="text-sm font-bold text-gray-900 cursor-pointer"
                  >
                    Enable AI-Powered SEO Optimization
                  </label>
                  <p className="text-sm text-gray-700 mt-1">
                    Our AI will automatically optimize your content, generate
                    additional meta tags, create structured data, and monitor
                    your search rankings.
                  </p>
                  <div className="mt-3">
                    <span className="text-lg font-bold text-orange-600">
                      ${formData.seoApiCost}/month
                    </span>
                    <span className="text-sm text-gray-600 ml-2">
                      (billed annually)
                    </span>
                  </div>
                </div>
              </div>

              {formData.seoApiOptimization && (
                <div className="bg-white rounded-lg p-4 border border-orange-200">
                  <h4 className="font-semibold text-orange-900 mb-2">
                    Premium Features Include:
                  </h4>
                  <ul className="space-y-1 text-sm text-orange-800">
                    <li>✓ Automatic content optimization for search engines</li>
                    <li>
                      ✓ Schema markup generation for better search visibility
                    </li>
                    <li>
                      ✓ Local SEO optimization for location-based searches
                    </li>
                    <li>✓ Weekly SEO performance reports</li>
                    <li>✓ Competitor analysis and recommendations</li>
                    <li>✓ Priority support and SEO consultation</li>
                  </ul>
                  <div className="mt-3 p-2 bg-orange-100 rounded">
                    <p className="text-xs text-orange-800">
                      <strong>Integration:</strong> We'll connect with leading
                      SEO APIs including SEMrush, Ahrefs, and Google Search
                      Console for comprehensive optimization.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* SEO Preview */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Search Result Preview
            </h3>
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-blue-500">
              <div className="space-y-1">
                <h4 className="text-blue-600 text-lg hover:underline cursor-pointer">
                  {formData.metaTitle ||
                    `${formData.businessName} - ${formData.slogan || "Best Local Business"}`}
                </h4>
                <p className="text-green-700 text-sm">{getDisplayedDomain()}</p>
                <p className="text-gray-700 text-sm">
                  {formData.metaDescription ||
                    `Discover ${formData.businessName} ${formData.location ? `in ${formData.location}` : ""}. ${formData.uniqueDescription || "Quality service and great experience await you."}`}
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Preview & Adjustments Step (Step 12)
  const PreviewAdjustmentsStep = () => {
    const [previewMode, setPreviewMode] = useState<"mobile" | "desktop">(
      "mobile",
    );

    return (
      <div className="py-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Preview & final tweaks
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Review your website and make any final adjustments before going
            live.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Settings */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Quick Adjustments
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Website Title
                  </label>
                  <Input
                    type="text"
                    defaultValue={formData.businessName}
                    onChange={(e) =>
                      updateFormData("businessName", e.target.value)
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Tagline
                  </label>
                  <Input
                    type="text"
                    defaultValue={formData.slogan}
                    onChange={(e) => updateFormData("slogan", e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Primary Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        updateFormData("primaryColor", e.target.value)
                      }
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) =>
                        updateFormData("primaryColor", e.target.value)
                      }
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Performance Score
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Speed</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-4/5"></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">95</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SEO</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-5/6"></div>
                    </div>
                    <span className="text-sm font-bold text-blue-600">92</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mobile</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full w-full"></div>
                    </div>
                    <span className="text-sm font-bold text-purple-600">
                      100
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Enhanced Preview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">
                  Live Preview
                </h3>
                <div className="flex space-x-2">
                  <Button
                    variant={previewMode === "mobile" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("mobile")}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={previewMode === "desktop" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreviewMode("desktop")}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                {previewMode === "mobile" ? (
                  <LivePhoneFrame widthClass="w-64" heightClass="h-[480px]">
                    <TemplatePreviewContent />
                  </LivePhoneFrame>
                ) : (
                  <div className="w-full max-w-4xl h-96 bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
                    <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center justify-center px-4">
                      <span className="text-xs text-gray-600 font-mono">
                        {getDisplayedDomain()}
                      </span>
                    </div>
                    <div className="h-full overflow-hidden">
                      <TemplatePreviewContent />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <Button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              prevStep();
            }}
            variant="outline"
            size="lg"
          >
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Ready to Publish
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Publish Step (Step 13)
  const PublishStep = () => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(false);

    const handlePublish = async () => {
      setIsPublishing(true);
      await saveToBackend(formData as Partial<Configuration>);
      await publishConfiguration();
      setIsPublishing(false);
      setIsPublished(true);
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Publish your website
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything looks perfect! Ready to make your website live and start
            attracting customers?
          </p>
        </div>

        {!isPublished ? (
          <div className="space-y-8">
            {/* Pre-Launch Checklist */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Pre-Launch Checklist
              </h3>
              <div className="space-y-4">
                {[
                  {
                    item: "Business information completed",
                    checked: !!formData.businessName,
                  },
                  {
                    item: "Template and design customized",
                    checked: !!formData.template,
                  },
                  {
                    item: "Pages and content configured",
                    checked: formData.selectedPages.length > 0,
                  },
                  {
                    item: "Contact information added",
                    checked:
                      formData.contactMethods &&
                      formData.contactMethods.length > 0,
                  },
                  {
                    item: "Domain or subdomain selected",
                    checked: !!formData.selectedDomain || !!formData.domainName,
                  },
                ].map((check, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${
                        check.checked ? "bg-green-500" : "bg-gray-300"
                      }`}
                    >
                      {check.checked && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span
                      className={`${check.checked ? "text-gray-900" : "text-gray-500"}`}
                    >
                      {check.item}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Website Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">
                Your Website Summary
              </h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Business Details
                  </h4>
                  <p className="text-gray-600 text-sm mb-1">
                    Name: {formData.businessName}
                  </p>
                  <p className="text-gray-600 text-sm mb-1">
                    Type: {formData.businessType}
                  </p>
                  <p className="text-gray-600 text-sm">
                    Location: {formData.location}
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">
                    Website Features
                  </h4>
                  <p className="text-gray-600 text-sm mb-1">
                    Template: {formData.template}
                  </p>
                  <p className="text-gray-600 text-sm mb-1">
                    Pages: {formData.selectedPages.length}
                  </p>
                  <div className="space-y-1">
                    <p className="text-gray-600 text-sm">
                      Domain: {getDisplayedDomain()}
                    </p>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        Your Live URL:
                      </p>
                      <p className="font-mono text-sm text-green-700 break-all">
                        {getLiveUrl()}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Publish Button */}
            <div className="text-center">
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                size="lg"
                className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-16 py-8 text-2xl font-bold rounded-full shadow-2xl hover:scale-105 transition-all duration-300"
              >
                {isPublishing ? (
                  <>
                    <Cloud className="mr-4 w-8 h-8 animate-pulse" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-4 w-8 h-8" />
                    Publish Website
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Your website will be live in seconds!
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-8">
            <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-16 h-16 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                🎉 Congratulations!
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Your website is now live and ready for customers!
              </p>
              <div className="space-y-4">
                <Button
                  onClick={() => window.open(getLiveUrl(), "_blank")}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white mr-4"
                >
                  <Eye className="mr-2 w-5 h-5" />
                  View Live Website
                </Button>
                <Button
                  onClick={() => (window.location.href = "/")}
                  variant="outline"
                  size="lg"
                >
                  <Home className="mr-2 w-5 h-5" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isPublished && (
          <div className="flex justify-between mt-8">
            <Button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                prevStep();
              }}
              variant="outline"
              size="lg"
            >
              <ArrowLeft className="mr-2 w-5 h-5" />
              Back
            </Button>
            <div></div>
          </div>
        )}
      </div>
    );
  };

  // Deep-link handling for direct feature configuration (e.g., /configurator?feature=offers)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const feature = params.get("feature");
      if (feature === "offers") {
        if (!formData.offersEnabled) updateFormData("offersEnabled", true);
        setPendingFeatureConfig("offersEnabled");
        const idx = configuratorSteps.findIndex(
          (s) => s.id === "feature-config",
        );
        if (idx !== -1) setCurrentStep(idx);
      }
    } catch {}
  }, []);

  // Render main content based on current step
  const renderMainContent = () => {
    if (currentStep === -1) {
      return <WelcomePage />;
    }

    const currentStepConfig = configuratorSteps[currentStep];
    if (!currentStepConfig) return null;

    switch (currentStepConfig.component) {
      case "template":
        return <TemplateStep />;
      case "business-info":
        return <BusinessInfoStep />;
      case "design-customization":
        return <DesignStep />;
      case "page-structure":
        return <PageStructureStep />;
      case "opening-hours":
        return <OpeningHoursStep />;
      case "menu-products":
        return <MenuProductsStep />;
      case "reservations":
        return <ReservationsStep />;
      case "contact-social":
        return <ContactSocialStep />;
      case "media-gallery":
        return <MediaGalleryStep />;
      case "advanced-features":
        return <AdvancedFeaturesStep />;
      case "feature-config":
        return <FeatureConfigStep />;
      case "domain-hosting":
        return <DomainHostingStep />;
      case "seo-optimization":
        return <SEOOptimizationStep />;
      case "preview-adjustments":
        return <PreviewAdjustmentsStep />;
      case "publish":
        return <PublishStep />;
      default:
        return (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentStepConfig.title}
            </h2>
            <p className="text-gray-600 mb-8">
              {currentStepConfig.description}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Step component '{currentStepConfig.component}' is coming soon...
            </p>
            <div className="flex justify-between max-w-lg mx-auto">
              <Button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  prevStep();
                }}
                variant="outline"
                size="lg"
              >
                <ArrowLeft className="mr-2 w-5 h-5" />
                Back
              </Button>
              <Button
                onClick={nextStep}
                size="lg"
                className="bg-gradient-to-r from-teal-500 to-purple-500"
              >
                Continue
                <ChevronRight className="ml-2 w-5 h-5" />
              </Button>
            </div>
          </div>
        );
    }
  };

  return (
    <div
      className={`min-h-screen bg-white transition-opacity duration-1000 ${isVisible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Show navigation on all pages, including landing */}
      <Navigation />

      {currentStep === -1 ? (
        // Welcome page takes full screen with padding for navbar
        <div className="pt-20">{renderMainContent()}</div>
      ) : currentStep === 0 ? (
        // Template selection step - special layout with built-in preview
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderMainContent()}
          </div>
        </div>
      ) : (
        // Other configurator steps with live preview
        <div className="pt-20">
          <div className="flex flex-col lg:grid lg:grid-cols-3 gap-4 lg:gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Mobile Preview Toggle */}
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

            {/* Main Content */}
            <div className="lg:col-span-2 order-2 lg:order-1">
              <div className="min-h-[60vh] lg:min-h-[80vh]">
                {renderMainContent()}
              </div>
            </div>

            {/* Live Preview - Desktop */}
            <div className="hidden lg:block order-1 lg:order-2">
              <LivePreview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
