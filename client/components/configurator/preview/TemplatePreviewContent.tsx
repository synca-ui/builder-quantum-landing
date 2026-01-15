import React, { useState, useMemo } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import {
  Coffee,
  Utensils,
  Star,
  Building,
  Menu,
  ShoppingBag,
} from "lucide-react";

interface TemplatePreviewContentProps {
  currentStep: number;
  previewTemplateId: string | null;
  fontOptions: Array<{ id: string; class: string }>;
  templates: Array<any>;
  formData: any;
  setShowCart: (show: boolean) => void;
  showCart: boolean;
  cartItems: any[];
  cartItemsCount: number;
  addToCart: (item: any, qty: number) => void;
  removeFromCart: (name: string) => void;
  normalizeImageSrc: (img: any) => string;
}

export const TemplatePreviewContent: React.FC<TemplatePreviewContentProps> = ({
  currentStep,
  previewTemplateId,
  fontOptions,
  templates,
  formData,
  setShowCart,
  showCart,
  cartItems,
  cartItemsCount,
  addToCart,
  removeFromCart,
  normalizeImageSrc,
}) => {
  const storeBusinessName = useConfiguratorStore((s) => s.business.name);
  const storeBusinessType = useConfiguratorStore((s) => s.business.type);
  const storeTemplate = useConfiguratorStore((s) => s.design.template);
  const storePrimaryColor = useConfiguratorStore((s) => s.design.primaryColor);
  const storeSecondaryColor = useConfiguratorStore(
    (s) => s.design.secondaryColor,
  );

  const [previewState, setPreviewState] = useState({
    menuOpen: false,
    activePage: "home",
  });

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [selectedQty, setSelectedQty] = useState<number>(1);

  const getBusinessName = () => {
    if (storeBusinessName) return storeBusinessName;
    const templateNames: Record<string, string> = {
      minimalist: "Simple",
      modern: "FLUX",
      stylish: "Style",
      cozy: "Cozy",
    };
    const selectedId =
      currentStep === 0 ? previewTemplateId || storeTemplate : storeTemplate;
    return templateNames[selectedId] || "Your Business";
  };

  const getBusinessIcon = () => {
    switch (storeBusinessType) {
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

  const toRgba = (hex: string, alpha = 1): string => {
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

  const selectedId =
    currentStep === 0 ? previewTemplateId || storeTemplate : storeTemplate;

  const selectedTemplateDef = templates.find((t) => t.id === selectedId);
  const baseTemplateStyle = selectedTemplateDef
    ? selectedTemplateDef.style
    : templates[0]?.style;
  const isDark = formData.themeMode === "dark";

  const styles = {
    ...baseTemplateStyle,
    userPrimary:
      storePrimaryColor || (baseTemplateStyle as any)?.accent || "#4F46E5",
    userSecondary:
      storeSecondaryColor || (baseTemplateStyle as any)?.secondary || "#7C3AED",
    userFontColor: isDark ? "#F8FAFC" : formData.fontColor || "#000000",
    userBackground: isDark ? "#0B1020" : formData.backgroundColor || "#FFFFFF",
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
        />
      );
    }
    return getBusinessIcon();
  };

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

  if (!selectedId) {
    return (
      <div className="h-full max-h-full overflow-y-auto overflow-x-hidden custom-scrollbar flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-xs text-gray-500">Choose a template</p>
        </div>
      </div>
    );
  }

  const fontClass =
    fontOptions.find((f) => f.id === formData.fontFamily)?.class || "font-sans";

  const menuPages = useMemo(() => {
    const set = new Set<string>([
      "home",
      ...(formData.selectedPages || []),
      ...(formData.offerPageEnabled ? ["offers"] : []),
      "settings",
    ]);
    return Array.from(set);
  }, [formData.selectedPages, formData.offerPageEnabled]);

  const CartSidebar = () => {
    if (!formData.onlineOrdering || !showCart) return null;
    return (
      <div className="absolute right-0 top-0 bottom-0 w-48 bg-white shadow-lg p-4 overflow-y-auto z-50">
        <h3 className="font-bold mb-2">Cart ({cartItemsCount})</h3>
        {cartItems.length === 0 ? (
          <p className="text-xs text-gray-500">Empty</p>
        ) : (
          <div className="space-y-2">
            {cartItems.map((item) => (
              <div key={item.name} className="text-xs border-b pb-2">
                <p className="font-semibold">{item.name}</p>
                <p>Qty: {item.quantity}</p>
                <button
                  onClick={() => removeFromCart(item.name)}
                  className="text-red-500 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  switch (selectedId) {
    case "minimalist":
      return (
        <div
          className={`h-full max-h-full overflow-y-auto overflow-x-hidden custom-scrollbar ${fontClass} relative`}
          style={
            {
              backgroundColor: formData.backgroundColor || "#FFFFFF",
              "--primary": styles.userPrimary,
              "--secondary": styles.userSecondary,
            } as React.CSSProperties & {
              "--primary": string;
              "--secondary": string;
            }
          }
        >
          <nav className="bg-white px-4 py-4 border-b sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <LogoDisplay />
                <h1 className="text-lg font-semibold">{getBusinessName()}</h1>
              </div>
              <button onClick={toggleMenu} aria-label="Menu">
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </nav>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center">
              <h2 className="text-lg font-bold mb-4">Welcome</h2>
              <p className="text-sm text-gray-600">Select a page to preview</p>
            </div>
          </div>
          <CartSidebar />
        </div>
      );

    case "modern":
      return (
        <div
          className={`h-full max-h-full overflow-y-auto overflow-x-hidden custom-scrollbar text-white ${fontClass} relative`}
          style={
            {
              background: `linear-gradient(135deg, ${styles.userSecondary} 0%, ${styles.userPrimary} 50%, ${styles.userSecondary} 100%)`,
              "--primary": styles.userPrimary,
              "--secondary": styles.userSecondary,
            } as React.CSSProperties & {
              "--primary": string;
              "--secondary": string;
            }
          }
        >
          <nav className="bg-white/10 backdrop-blur-md border-b border-white/20 px-4 py-3 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                  <LogoDisplay />
                </div>
                <h1 className="text-lg font-bold text-white cursor-pointer">
                  {getBusinessName()}
                </h1>
              </div>
              <button onClick={toggleMenu} aria-label="Menu">
                <Menu className="w-5 h-5 text-white" />
              </button>
            </div>
          </nav>
          <div className="flex-1 overflow-y-auto p-4 text-center">
            <h2 className="text-2xl font-bold mb-4">Modern Experience</h2>
            <p className="text-white/80">Bold flavors, bright future</p>
          </div>
          <CartSidebar />
        </div>
      );

    case "stylish":
      return (
        <div
          className={`h-full max-h-full overflow-y-auto overflow-x-hidden custom-scrollbar ${fontClass} relative`}
          style={
            {
              background:
                formData.backgroundType === "gradient"
                  ? `linear-gradient(135deg, ${styles.userPrimary} 0%, ${styles.userSecondary} 100%)`
                  : styles.userBackground || "#ffffff",
              "--primary": styles.userPrimary,
              "--secondary": styles.userSecondary,
            } as React.CSSProperties & {
              "--primary": string;
              "--secondary": string;
            }
          }
        >
          <nav
            className="px-4 py-4 shadow-sm border-b sticky top-0 z-10"
            style={{
              backgroundColor: styles.userSecondary || "#ffffff",
              borderColor: (styles.userPrimary || "#000000") + "20",
              color: styles.userFontColor,
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <LogoDisplay />
                <h1 className="text-lg font-semibold cursor-pointer">
                  {getBusinessName()}
                </h1>
              </div>
              <button onClick={toggleMenu} aria-label="Menu">
                <Menu
                  className="w-5 h-5"
                  style={{ color: styles.userFontColor }}
                />
              </button>
            </div>
          </nav>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center">
              <h2
                className="text-lg font-bold mb-4"
                style={{ color: styles.userFontColor }}
              >
                Stylish Design
              </h2>
              <p style={{ color: styles.userFontColor }}>
                Fresh, healthy, natural
              </p>
            </div>
          </div>
          <CartSidebar />
        </div>
      );

    case "cozy":
      return (
        <div
          className={`h-full max-h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-orange-50 ${fontClass} relative`}
          style={
            {
              "--primary": styles.userPrimary,
              "--secondary": styles.userSecondary,
            } as React.CSSProperties & {
              "--primary": string;
              "--secondary": string;
            }
          }
        >
          <div className="h-8 bg-amber-100" />
          <div className="px-3 pt-2 pb-4 sticky top-0 z-10 bg-orange-50">
            <div className="flex justify-center">
              <div
                className="inline-flex items-center space-x-2 px-4 py-2 rounded-full shadow-md border"
                style={{
                  background: `${styles.userSecondary || "#FEF3C7"}`,
                  borderColor: styles.userPrimary || "#F59E0B",
                }}
              >
                <LogoDisplay />
                <span className="text-sm font-semibold cursor-pointer">
                  {getBusinessName()}
                </span>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="text-center">
              <h2 className="text-lg font-bold mb-4 text-amber-900">
                Cozy Atmosphere
              </h2>
              <p className="text-amber-700">Warm slice with seasonal fruit</p>
            </div>
          </div>
          <CartSidebar />
        </div>
      );

    default:
      return (
        <div className="h-full max-h-full overflow-y-auto overflow-x-hidden custom-scrollbar bg-gray-50" />
      );
  }
};
