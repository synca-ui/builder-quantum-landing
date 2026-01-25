import React, { useState, useMemo, useCallback, memo } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import {
  MapPin,
  Phone,
  Mail,
  Clock,
  Instagram,
  Facebook,
  Coffee,
  Utensils,
  ShoppingBag,
  Menu,
  X,
  Plus,
  ChevronRight,
  ChevronDown,
  Camera,
  ArrowRight,
  Calendar,
  Users,
  CalendarCheck,
  ChevronLeft,
} from "lucide-react";
import { ReservationButton } from "@/components/ui/ReservationButton";
import { getBusinessTypeDefaults } from "@/lib/businessTypeDefaults";
import type { MenuItem } from "@/types/domain";

// --- HELPER: Bild-URLs normalisieren ---
function normalizeImageSrc(img: any): string {
  if (!img) return "/placeholder.svg";
  if (typeof img === "string") return img;
  const url = img?.url;
  if (typeof url === "string") return url;
  const file = (img as any)?.file || img;
  if (typeof File !== "undefined" && file instanceof File)
    return URL.createObjectURL(file);
  return "/placeholder.svg";
}

// --- HELPER: Header font size to tailwind class ---
function getHeaderFontClass(size: string): string {
  switch (size) {
    case "xs":
      return "text-[10px]";
    case "small":
      return "text-xs";
    case "medium":
      return "text-sm";
    case "large":
      return "text-base";
    case "xl":
      return "text-lg";
    case "2xl":
      return "text-xl";
    case "3xl":
      return "text-2xl";
    case "4xl":
      return "text-[28px]";
    case "5xl":
      return "text-[32px]";
    default:
      return "text-sm";
  }
}

// ============================================
// MEMOIZED SUB-COMPONENTS
// ============================================

interface PreviewNavProps {
  businessName: string;
  businessType: string;
  logo: string | null;
  headerFontColor: string;
  headerFontSize: string;
  headerBackgroundColor: string;
  onlineOrdering: boolean;
  cartCount: number;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onNavigateHome: () => void;
  navClassName: string;
}

const PreviewNav = memo(function PreviewNav({
  businessName,
  businessType,
  logo,
  headerFontColor,
  headerFontSize,
  headerBackgroundColor,
  onlineOrdering,
  cartCount,
  menuOpen,
  onToggleMenu,
  onNavigateHome,
  navClassName,
}: PreviewNavProps) {
  const fontClass = getHeaderFontClass(headerFontSize);

  return (
    <div
      className={navClassName}
      style={{
        backgroundColor: headerBackgroundColor,
        color: headerFontColor,
      }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {logo ? (
          <img
            src={logo}
            alt="Logo"
            className="w-8 h-8 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${headerFontColor}15` }}
          >
            {businessType === "cafe" ? (
              <Coffee className="w-4 h-4" />
            ) : (
              <Utensils className="w-4 h-4" />
            )}
          </div>
        )}
        <span
          className={`font-bold cursor-pointer truncate ${fontClass}`}
          onClick={onNavigateHome}
          style={{ color: headerFontColor }}
        >
          {businessName}
        </span>
      </div>

      <div
        className="flex items-center gap-3 shrink-0"
        style={{ color: headerFontColor }}
      >
        {onlineOrdering && (
          <div className="relative cursor-pointer">
            <ShoppingBag className="w-5 h-5 opacity-90" />
            {cartCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold shadow-sm">
                {cartCount}
              </span>
            )}
          </div>
        )}
        <button
          onClick={onToggleMenu}
          className="p-1 active:scale-90 transition-transform"
        >
          {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );
});

interface MenuOverlayProps {
  isOpen: boolean;
  backgroundColor: string;
  fontColor: string;
  selectedPages: string[];
  onClose: () => void;
  onNavigate: (page: string) => void;
}

const MenuOverlay = memo(function MenuOverlay({
  isOpen,
  backgroundColor,
  fontColor,
  selectedPages,
  onClose,
  onNavigate,
}: MenuOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="absolute right-0 top-0 bottom-0 w-3/4 bg-white p-6 pt-20 shadow-2xl h-full flex flex-col transform transition-transform duration-300"
        style={{ backgroundColor, color: fontColor }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-bold text-2xl mb-8 opacity-90">Menü</h3>
        <div className="space-y-4 flex-1 overflow-y-auto">
          {["home", ...selectedPages].map((item) => (
            <div
              key={item}
              className="text-lg font-medium cursor-pointer flex justify-between items-center group pb-3 border-b border-current/10"
              onClick={() => onNavigate(item)}
            >
              <span className="capitalize">
                {item === "home" ? "Startseite" : item}
              </span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

interface DishModalProps {
  dish: MenuItem | null;
  currentImageIndex: number;
  fontColor: string;
  backgroundColor: string;
  priceColor: string;
  primaryColor: string;
  onlineOrdering: boolean;
  onClose: () => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  onSetImageIndex: (idx: number) => void;
  onAddToCart: (dish: MenuItem) => void;
}

const DishModal = memo(function DishModal({
  dish,
  currentImageIndex,
  fontColor,
  backgroundColor,
  priceColor,
  primaryColor,
  onlineOrdering,
  onClose,
  onPrevImage,
  onNextImage,
  onSetImageIndex,
  onAddToCart,
}: DishModalProps) {
  if (!dish) return null;

  return (
    <div
      className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-3xl max-h-[85%] overflow-hidden animate-in slide-in-from-bottom duration-300"
        style={{ backgroundColor, color: fontColor }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image Carousel */}
        {dish.images && dish.images.length > 0 ? (
          <div className="relative aspect-[4/3] bg-gray-100">
            <img
              src={normalizeImageSrc(dish.images[currentImageIndex])}
              alt={dish.name}
              className="w-full h-full object-cover"
            />
            {dish.images.length > 1 && (
              <>
                <button
                  onClick={onPrevImage}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={onNextImage}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {dish.images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => onSetImageIndex(idx)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? "bg-white w-4"
                          : "bg-white/50"
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        ) : (
          <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center">
            <Camera className="w-12 h-12 text-gray-300" />
            <button
              onClick={onClose}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dish Details */}
        <div className="p-5 space-y-3">
          <div className="flex justify-between items-start gap-3">
            <h3 className="text-xl font-bold">{dish.name}</h3>
            <span
              className="text-xl font-bold shrink-0"
              style={{ color: priceColor }}
            >
              {dish.price}€
            </span>
          </div>
          {dish.description && (
            <p className="text-sm opacity-80 leading-relaxed">
              {dish.description}
            </p>
          )}

          {onlineOrdering && (
            <button
              onClick={() => {
                onAddToCart(dish);
                onClose();
              }}
              className="w-full py-3 rounded-xl font-bold text-white shadow-lg mt-4 transition-transform active:scale-[0.98]"
              style={{ backgroundColor: primaryColor }}
            >
              <Plus className="w-4 h-4 inline mr-2" />
              Zum Warenkorb
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ============================================
// MAIN COMPONENT
// ============================================

export function TemplatePreviewContent() {
  // GRANULAR SELECTORS - select individual primitives to avoid reference issues
  // Business fields
  const businessName =
    useConfiguratorStore((s) => s.business.name) || "Dein Geschäft";
  const businessType =
    useConfiguratorStore((s) => s.business.type) || "restaurant";
  const location = useConfiguratorStore((s) => s.business.location);
  const slogan = useConfiguratorStore((s) => s.business.slogan);
  const uniqueDescription = useConfiguratorStore(
    (s) => s.business.uniqueDescription,
  );
  const logo = useConfiguratorStore((s) => s.business.logo);

  // Design fields
  const template =
    useConfiguratorStore((s) => s.design.template) || "minimalist";
  const primaryColor =
    useConfiguratorStore((s) => s.design.primaryColor) || "#2563EB";
  const secondaryColor =
    useConfiguratorStore((s) => s.design.secondaryColor) || "#7C3AED";
  const fontFamily =
    useConfiguratorStore((s) => s.design.fontFamily) || "sans-serif";
  const backgroundColor =
    useConfiguratorStore((s) => s.design.backgroundColor) || "#FFFFFF";
  const fontColor =
    useConfiguratorStore((s) => s.design.fontColor) || "#000000";
  const priceColor =
    useConfiguratorStore((s) => (s.design as any).priceColor) || "#059669";
  const headerFontColor =
    useConfiguratorStore((s) => (s.design as any).headerFontColor) || fontColor;
  const headerFontSize =
    useConfiguratorStore((s) => (s.design as any).headerFontSize) || "medium";
  const headerBackgroundColor =
    useConfiguratorStore((s) => (s.design as any).headerBackgroundColor) ||
    backgroundColor;

  // Content fields
  const menuItems = useConfiguratorStore((s) => s.content.menuItems) || [];
  const categories = useConfiguratorStore((s) => s.content.categories) || [];
  const gallery = useConfiguratorStore((s) => s.content.gallery) || [];
  const openingHours =
    useConfiguratorStore((s) => s.content.openingHours) || {};

  // Contact fields
  const contactMethods =
    useConfiguratorStore((s) => s.contact.contactMethods) || [];

  // Feature fields
  const onlineOrdering = useConfiguratorStore(
    (s) => s.features.onlineOrderingEnabled,
  );
  const reservationsEnabled = useConfiguratorStore(
    (s) => s.features.reservationsEnabled,
  );
  const reservationButtonColor =
    useConfiguratorStore((s) => s.features.reservationButtonColor) ||
    primaryColor;
  const reservationButtonTextColor =
    useConfiguratorStore((s) => s.features.reservationButtonTextColor) ||
    "#FFFFFF";
  const reservationButtonShape =
    useConfiguratorStore((s) => s.features.reservationButtonShape) || "rounded";

  // Pages fields
  const selectedPages =
    useConfiguratorStore((s) => s.pages.selectedPages) || [];

  // Local state
  const [previewState, setPreviewState] = useState({
    menuOpen: false,
    activePage: "home",
  });
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(
    null,
  );
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Handlers
  const openDishModal = useCallback((dish: MenuItem) => {
    setSelectedDish(dish);
    setCurrentImageIndex(0);
  }, []);

  const closeDishModal = useCallback(() => {
    setSelectedDish(null);
    setCurrentImageIndex(0);
  }, []);

  const nextImage = useCallback(() => {
    if (!selectedDish?.images) return;
    setCurrentImageIndex((prev) =>
      prev < selectedDish.images!.length - 1 ? prev + 1 : 0,
    );
  }, [selectedDish]);

  const prevImage = useCallback(() => {
    if (!selectedDish?.images) return;
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : selectedDish.images!.length - 1,
    );
  }, [selectedDish]);

  const toggleMenu = useCallback(() => {
    setPreviewState((p) => ({ ...p, menuOpen: !p.menuOpen }));
  }, []);

  const closeMenu = useCallback(() => {
    setPreviewState((p) => ({ ...p, menuOpen: false }));
  }, []);

  const navigateToPage = useCallback((page: string) => {
    setPreviewState((p) => ({ ...p, activePage: page, menuOpen: false }));
  }, []);

  const addToCart = useCallback((item: any) => {
    setCartItems((prev) => [...prev, item]);
  }, []);

  // Style helpers
  const fontClass =
    fontFamily === "serif"
      ? "font-serif"
      : fontFamily === "mono"
        ? "font-mono"
        : "font-sans";

  // Memoized styles
  const styles = useMemo(() => {
    const base = {
      wrapper: { backgroundColor, color: fontColor },
      page: `px-5 pt-32 pb-24 min-h-full ${fontClass}`,
      titleClass: `text-3xl font-bold mb-6 text-center leading-tight`,
      bodyClass: `text-sm opacity-90 leading-relaxed`,
      itemNameClass: `text-base font-bold leading-tight`,
      itemDescClass: `text-xs opacity-80 mt-1 leading-snug`,
      itemPriceClass: `text-lg font-bold`,
      nav: `absolute top-0 left-0 right-0 z-30 px-5 pt-12 pb-4 flex items-center justify-between border-b border-black/5 transition-all`,
    };

    switch (template) {
      case "modern":
        return {
          ...base,
          wrapper: {
            background: `linear-gradient(135deg, ${backgroundColor} 0%, ${secondaryColor} 100%)`,
            color: fontColor,
          },
          itemCard:
            "bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg mb-4",
        };
      case "stylish":
        return {
          ...base,
          itemCard:
            "bg-white rounded-xl p-4 shadow-lg border border-gray-100 mb-4 transform hover:scale-[1.01] transition-transform",
        };
      case "cozy":
        return {
          ...base,
          itemCard:
            "bg-white/90 rounded-[2rem] p-5 border border-amber-100/50 shadow-md mb-5",
        };
      default:
        return {
          ...base,
          itemCard: "py-5 border-b border-current/10 last:border-0",
        };
    }
  }, [template, backgroundColor, secondaryColor, fontColor, fontClass]);

  // Content renderers
  const renderContent = () => {
    if (previewState.activePage === "home") {
      const displayItems =
        menuItems.length > 0
          ? menuItems
          : getBusinessTypeDefaults(businessType).menuItems;

      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center py-8 px-2 flex flex-col items-center">
            <h1 className={styles.titleClass} style={{ color: fontColor }}>
              {slogan || "Willkommen"}
            </h1>
            <p
              className={`${styles.bodyClass} max-w-[90%] text-center`}
              style={{ color: fontColor }}
            >
              {uniqueDescription ||
                "Wir bieten beste Qualität und eine tolle Atmosphäre."}
            </p>

            {onlineOrdering && (
              <div className="mt-6 w-full px-4">
                <button
                  className="w-full py-3 px-6 font-bold text-base rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all bg-black text-white"
                  style={{ backgroundColor: primaryColor }}
                  onClick={() => navigateToPage("menu")}
                >
                  Bestellen
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3
                className="uppercase tracking-widest font-bold opacity-60 text-[10px]"
                style={{ color: fontColor }}
              >
                Highlights
              </h3>
              <span
                className="text-[10px] font-bold opacity-60 cursor-pointer hover:opacity-100 flex items-center gap-1"
                onClick={() => navigateToPage("menu")}
              >
                Alle <ArrowRight className="w-3 h-3" />
              </span>
            </div>

            <div className="space-y-3">
              {displayItems.slice(0, 3).map((item: any, i: number) => (
                <div
                  key={i}
                  className={`${styles.itemCard} cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]`}
                  onClick={() => openDishModal(item)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div
                        className={styles.itemNameClass}
                        style={{ color: fontColor }}
                      >
                        {item.name}
                      </div>
                      <div
                        className={styles.itemDescClass}
                        style={{ color: fontColor }}
                      >
                        {item.description}
                      </div>
                    </div>
                    <div
                      className={styles.itemPriceClass}
                      style={{ color: priceColor }}
                    >
                      {item.price}€
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {reservationsEnabled && (
            <div className="mt-8 mb-6">
              <ReservationButton
                color={reservationButtonColor}
                textColor={reservationButtonTextColor}
                shape={reservationButtonShape as "rounded" | "pill" | "square"}
                className="w-full shadow-lg"
                onClick={() => navigateToPage("reservations")}
              >
                Tisch reservieren
              </ReservationButton>
            </div>
          )}

          <div
            className="text-center py-6 border-t border-current/10 mt-6 space-y-3 cursor-pointer group"
            onClick={() => setHoursExpanded(!hoursExpanded)}
          >
            <div className="flex items-center justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">
                {hoursExpanded ? "Öffnungszeiten" : "Heute: 09:00 - 22:00"}
              </span>
              <ChevronDown
                className={`w-3 h-3 transition-transform duration-200 ${hoursExpanded ? "rotate-180" : ""}`}
              />
            </div>

            {hoursExpanded && (
              <div className="mt-3 space-y-1.5 text-left max-w-[200px] mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
                {Object.keys(openingHours).length > 0 ? (
                  Object.entries(openingHours).map(([day, hours]: any) => (
                    <div
                      key={day}
                      className="flex justify-between text-xs opacity-80"
                    >
                      <span className="capitalize">{day}</span>
                      <span className="font-medium">
                        {hours.closed
                          ? "Geschlossen"
                          : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic opacity-50 text-center">
                    Keine Zeiten hinterlegt
                  </p>
                )}
              </div>
            )}

            {location && (
              <div className="flex items-center justify-center gap-2 opacity-70 mt-2 max-w-full px-4">
                <MapPin className="w-4 h-4 shrink-0 flex-none" />
                <span className="text-xs font-medium truncate">{location}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (previewState.activePage === "menu") {
      const displayCategories =
        categories.length > 0
          ? categories
          : getBusinessTypeDefaults(businessType).categories;

      const allItems =
        menuItems.length > 0
          ? menuItems
          : getBusinessTypeDefaults(businessType).menuItems;

      const filteredMenuItems = activeMenuCategory
        ? allItems.filter((item: any) => item.category === activeMenuCategory)
        : allItems;

      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className={styles.titleClass}>Karte</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
            <button
              onClick={() => setActiveMenuCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${
                activeMenuCategory === null
                  ? "shadow-md"
                  : "border border-current/20 opacity-70"
              }`}
              style={
                activeMenuCategory === null
                  ? { backgroundColor: fontColor, color: backgroundColor }
                  : {}
              }
            >
              Alle
            </button>
            {displayCategories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveMenuCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${
                  activeMenuCategory === cat
                    ? "shadow-md"
                    : "border border-current/20 opacity-70"
                }`}
                style={
                  activeMenuCategory === cat
                    ? { backgroundColor: fontColor, color: backgroundColor }
                    : {}
                }
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="space-y-4 pb-8">
            {filteredMenuItems.length > 0 ? (
              filteredMenuItems.map((item: any, i: number) => (
                <div
                  key={i}
                  className={`${styles.itemCard} cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]`}
                  onClick={() => openDishModal(item)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div
                        className={styles.itemNameClass}
                        style={{ color: fontColor }}
                      >
                        {item.name}
                      </div>
                      <div
                        className={styles.itemDescClass}
                        style={{ color: fontColor }}
                      >
                        {item.description}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 pl-2">
                      <div
                        className={styles.itemPriceClass}
                        style={{ color: priceColor }}
                      >
                        {item.price || "9.50"}€
                      </div>
                      {onlineOrdering && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addToCart(item);
                          }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md"
                          style={{
                            backgroundColor: primaryColor,
                            color: "#FFF",
                          }}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 opacity-50 text-sm">
                Keine Artikel in dieser Kategorie
              </div>
            )}
          </div>
        </div>
      );
    }

    if (previewState.activePage === "contact") {
      return (
        <div className="space-y-8 animate-in fade-in duration-300">
          <h2 className={styles.titleClass}>Kontakt</h2>
          <div className="p-6 rounded-2xl border border-current/10 bg-white/5 space-y-6 backdrop-blur-sm shadow-sm">
            <div className="space-y-6">
              {location && (
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-current/5 rounded-full">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-sm mb-1 opacity-90">
                      Adresse
                    </div>
                    <div className={styles.bodyClass}>{location}</div>
                  </div>
                </div>
              )}
              {contactMethods.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="p-2 bg-current/5 rounded-full">
                    {m.type === "phone" ? (
                      <Phone className="w-4 h-4" />
                    ) : (
                      <Mail className="w-4 h-4" />
                    )}
                  </div>
                  <div className={styles.bodyClass}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 opacity-70" /> Öffnungszeiten
            </h3>
            <div className="space-y-2 opacity-90">
              {Object.keys(openingHours).length > 0 ? (
                Object.entries(openingHours).map(([day, hours]: any) => (
                  <div
                    key={day}
                    className="flex justify-between text-xs py-2 border-b border-current/5 last:border-0"
                  >
                    <span className="capitalize opacity-80 font-medium">
                      {day}
                    </span>
                    <span className="font-bold">
                      {hours.closed
                        ? "Geschlossen"
                        : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-xs opacity-60 italic">
                  Keine Zeiten hinterlegt.
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-center gap-6 py-6 opacity-80">
            <Instagram className="w-6 h-6 cursor-pointer hover:opacity-100 transition-all" />
            <Facebook className="w-6 h-6 cursor-pointer hover:opacity-100 transition-all" />
          </div>
        </div>
      );
    }

    if (previewState.activePage === "gallery") {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className={styles.titleClass}>Galerie</h2>
          <div className="grid grid-cols-2 gap-3">
            {(gallery.length > 0 ? gallery : [1, 2, 3, 4, 5, 6]).map(
              (img: any, i: number) => (
                <div
                  key={i}
                  className="aspect-square rounded-xl overflow-hidden bg-black/5 relative shadow-sm group"
                >
                  {img.url ? (
                    <img
                      src={normalizeImageSrc(img)}
                      className="w-full h-full object-cover"
                      alt=""
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-current/20">
                      <Camera className="w-6 h-6" />
                    </div>
                  )}
                </div>
              ),
            )}
          </div>
        </div>
      );
    }

    if (previewState.activePage === "reservations") {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div
              className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <CalendarCheck
                className="w-8 h-8"
                style={{ color: primaryColor }}
              />
            </div>
            <h2 className={styles.titleClass}>Reservierung</h2>
            <p className={`${styles.bodyClass} opacity-70`}>
              Buchen Sie Ihren Tisch online
            </p>
          </div>

          <div className="space-y-4 p-4 rounded-2xl border border-current/10 bg-white/5">
            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">
                Datum
              </label>
              <div className="flex items-center gap-2 p-3 rounded-xl border border-current/10 bg-white/50">
                <Calendar className="w-4 h-4 opacity-50" />
                <span className="text-sm">Datum wählen...</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">
                Uhrzeit
              </label>
              <div className="flex items-center gap-2 p-3 rounded-xl border border-current/10 bg-white/50">
                <Clock className="w-4 h-4 opacity-50" />
                <span className="text-sm">Zeit wählen...</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">
                Anzahl Gäste
              </label>
              <div className="flex items-center gap-2 p-3 rounded-xl border border-current/10 bg-white/50">
                <Users className="w-4 h-4 opacity-50" />
                <span className="text-sm">2 Personen</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">
                Name
              </label>
              <div className="p-3 rounded-xl border border-current/10 bg-white/50">
                <span className="text-sm opacity-50">Ihr Name...</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">
                Telefon / E-Mail
              </label>
              <div className="p-3 rounded-xl border border-current/10 bg-white/50">
                <span className="text-sm opacity-50">
                  Kontakt für Bestätigung...
                </span>
              </div>
            </div>
          </div>

          {reservationsEnabled && (
            <ReservationButton
              color={reservationButtonColor}
              textColor={reservationButtonTextColor}
              shape={reservationButtonShape as "rounded" | "pill" | "square"}
              className="w-full shadow-lg"
            >
              Reservierung anfragen
            </ReservationButton>
          )}

          <div className="text-center opacity-60 text-xs space-y-1">
            <p>Sie erhalten eine Bestätigung per E-Mail</p>
            <p className="flex items-center justify-center gap-1">
              <Phone className="w-3 h-3" />
              Oder rufen Sie uns an
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-10 text-center opacity-50 pt-20">
        Seite nicht gefunden
      </div>
    );
  };

  return (
    <div
      className="h-full w-full relative flex flex-col transition-colors duration-300 overflow-hidden pointer-events-auto select-none"
      style={styles.wrapper}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* MEMOIZED NAV HEADER */}
      <PreviewNav
        businessName={businessName}
        businessType={businessType}
        logo={logo?.url || null}
        headerFontColor={headerFontColor}
        headerFontSize={headerFontSize}
        headerBackgroundColor={headerBackgroundColor}
        onlineOrdering={onlineOrdering}
        cartCount={cartItems.length}
        menuOpen={previewState.menuOpen}
        onToggleMenu={toggleMenu}
        onNavigateHome={() => navigateToPage("home")}
        navClassName={styles.nav}
      />

      {/* MEMOIZED MENU OVERLAY */}
      <MenuOverlay
        isOpen={previewState.menuOpen}
        backgroundColor={backgroundColor}
        fontColor={fontColor}
        selectedPages={selectedPages}
        onClose={closeMenu}
        onNavigate={navigateToPage}
      />

      {/* SCROLL CONTAINER */}
      <div
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10"
        style={{
          WebkitOverflowScrolling: "touch",
          overscrollBehaviorY: "contain",
        }}
      >
        <div className={styles.page}>{renderContent()}</div>
        <div className="h-20 w-full" />
      </div>

      {/* MEMOIZED DISH MODAL */}
      <DishModal
        dish={selectedDish}
        currentImageIndex={currentImageIndex}
        fontColor={fontColor}
        backgroundColor={backgroundColor}
        priceColor={priceColor}
        primaryColor={primaryColor}
        onlineOrdering={onlineOrdering}
        onClose={closeDishModal}
        onPrevImage={prevImage}
        onNextImage={nextImage}
        onSetImageIndex={setCurrentImageIndex}
        onAddToCart={addToCart}
      />
    </div>
  );
}
