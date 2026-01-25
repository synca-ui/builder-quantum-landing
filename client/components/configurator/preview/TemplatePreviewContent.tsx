import React, { useState, useMemo, useCallback } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import {
  MapPin, Phone, Mail, Clock, Instagram, Facebook,
  Coffee, Utensils, ShoppingBag, Menu, X,
  Plus, ChevronRight, ChevronDown, Camera, ArrowRight,
  Calendar, Users, CalendarCheck, ChevronLeft
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

export function TemplatePreviewContent() {
  // 1. GRANULAR SELECTORS for optimized re-renders
  // Business fields
  const businessName = useConfiguratorStore((s) => s.business.name);
  const businessType = useConfiguratorStore((s) => s.business.type);
  const location = useConfiguratorStore((s) => s.business.location);
  const slogan = useConfiguratorStore((s) => s.business.slogan);
  const uniqueDescription = useConfiguratorStore((s) => s.business.uniqueDescription);

  // Design fields
  const template = useConfiguratorStore((s) => s.design.template);
  const primaryColor = useConfiguratorStore((s) => s.design.primaryColor);
  const secondaryColor = useConfiguratorStore((s) => s.design.secondaryColor);
  const fontFamily = useConfiguratorStore((s) => s.design.fontFamily);
  const backgroundColor = useConfiguratorStore((s) => s.design.backgroundColor);
  const fontColor = useConfiguratorStore((s) => s.design.fontColor);
  const priceColor = useConfiguratorStore((s) => (s.design as any).priceColor);

  // Header/Navigation customization
  const headerFontColor = useConfiguratorStore((s) => (s.design as any).headerFontColor);
  const headerFontSize = useConfiguratorStore((s) => (s.design as any).headerFontSize);
  const headerBackgroundColor = useConfiguratorStore((s) => (s.design as any).headerBackgroundColor);

  // Logo
  const logo = useConfiguratorStore((s) => s.business.logo);

  // Content fields
  const menuItems = useConfiguratorStore((s) => s.content.menuItems);
  const categories = useConfiguratorStore((s) => s.content.categories);
  const gallery = useConfiguratorStore((s) => s.content.gallery);
  const openingHours = useConfiguratorStore((s) => s.content.openingHours);

  // Contact fields
  const contactMethods = useConfiguratorStore((s) => s.contact.contactMethods);
  const phone = useConfiguratorStore((s) => s.contact.phone);
  const email = useConfiguratorStore((s) => s.contact.email);

  // Feature fields
  const onlineOrdering = useConfiguratorStore((s) => s.features.onlineOrderingEnabled);
  const reservationsEnabled = useConfiguratorStore((s) => s.features.reservationsEnabled);
  const reservationButtonColor = useConfiguratorStore((s) => s.features.reservationButtonColor);
  const reservationButtonTextColor = useConfiguratorStore((s) => s.features.reservationButtonTextColor);
  const reservationButtonShape = useConfiguratorStore((s) => s.features.reservationButtonShape);

  // Pages fields
  const selectedPages = useConfiguratorStore((s) => s.pages.selectedPages);

  // 2. ADAPTER - formData built from granular selectors
  const formData = useMemo(() => ({
    businessName: businessName || "Dein Geschäft",
    businessType: businessType || "restaurant",
    location,
    slogan,
    uniqueDescription,
    template: template || "minimalist",
    primaryColor: primaryColor || "#2563EB",
    secondaryColor: secondaryColor || "#7C3AED",
    fontFamily: fontFamily || "sans-serif",
    backgroundColor: backgroundColor || "#FFFFFF",
    fontColor: fontColor || "#000000",
    priceColor: priceColor || "#059669", // Unabhängige Preisfarbe (grün)
    fontSize: "medium",
    // Header customization
    headerFontColor: headerFontColor || fontColor || "#000000",
    headerFontSize: headerFontSize || "medium",
    headerBackgroundColor: headerBackgroundColor || backgroundColor || "#FFFFFF",
    logo: logo?.url || null,
    menuItems: menuItems || [],
    gallery: gallery || [],
    openingHours: openingHours || {},
    contactMethods: contactMethods || [],
    phone,
    email,
    onlineOrdering,
    reservationsEnabled,
    reservationButtonColor: reservationButtonColor || primaryColor || "#2563EB",
    reservationButtonTextColor: reservationButtonTextColor || "#FFFFFF",
    reservationButtonShape: reservationButtonShape || "rounded",
    selectedPages: selectedPages || ["home"],
  }), [
    businessName, businessType, location, slogan, uniqueDescription,
    template, primaryColor, secondaryColor, fontFamily, backgroundColor, fontColor, priceColor,
    headerFontColor, headerFontSize, headerBackgroundColor, logo,
    menuItems, gallery, openingHours,
    contactMethods, phone, email,
    onlineOrdering, reservationsEnabled, reservationButtonColor, reservationButtonTextColor, reservationButtonShape,
    selectedPages
  ]);

  // 3. LOKALER STATE
  const [previewState, setPreviewState] = useState({
    menuOpen: false,
    activePage: "home",
  });

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [hoursExpanded, setHoursExpanded] = useState(false);
  const [activeMenuCategory, setActiveMenuCategory] = useState<string | null>(null);

  // Dish modal state
  const [selectedDish, setSelectedDish] = useState<MenuItem | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
      prev < selectedDish.images!.length - 1 ? prev + 1 : 0
    );
  }, [selectedDish]);

  const prevImage = useCallback(() => {
    if (!selectedDish?.images) return;
    setCurrentImageIndex((prev) =>
      prev > 0 ? prev - 1 : selectedDish.images!.length - 1
    );
  }, [selectedDish]);

  // 4. STYLE HELPER
  const getFontSize = (type: 'title' | 'body' | 'small' | 'price') => {
    const size = formData.fontSize;
    if (type === 'title') return size === 'small' ? 'text-2xl' : size === 'large' ? 'text-4xl' : 'text-3xl';
    if (type === 'body') return size === 'small' ? 'text-xs' : size === 'large' ? 'text-base' : 'text-sm';
    if (type === 'price') return size === 'small' ? 'text-sm' : size === 'large' ? 'text-xl' : 'text-lg';
    return 'text-base';
  };

  const fontClass =
    formData.fontFamily === 'serif' ? 'font-serif' :
      formData.fontFamily === 'mono' ? 'font-mono' : 'font-sans';

  // 5. STYLES GENERATOR
  const styles = useMemo(() => {
    const base = {
      wrapper: { backgroundColor: formData.backgroundColor, color: formData.fontColor },

      // FIX: pt-32 für Abstand unter der absoluten Nav
      page: `px-5 pt-32 pb-24 min-h-full ${fontClass}`,

      titleClass: `${getFontSize('title')} font-bold mb-6 text-center leading-tight`,
      bodyClass: `${getFontSize('body')} opacity-90 leading-relaxed`,
      itemNameClass: `${formData.fontSize === 'large' ? 'text-lg' : 'text-base'} font-bold leading-tight`,
      itemDescClass: `${formData.fontSize === 'large' ? 'text-sm' : 'text-xs'} opacity-80 mt-1 leading-snug`,
      itemPriceClass: `${getFontSize('price')} font-bold`,

      // STICKY NAV: Fixiert unterhalb der Dynamic Island (top-0 + pt-12 = Platz für Island)
      // z-30 = unter Dynamic Island (z-50), aber über Content (z-10)
      nav: `absolute top-0 left-0 right-0 z-30 px-5 pt-12 pb-4 flex items-center justify-between border-b border-black/5 transition-all`,
    };

    switch (formData.template) {
      case "modern":
        return { ...base,
          wrapper: { background: `linear-gradient(135deg, ${formData.backgroundColor} 0%, ${formData.secondaryColor} 100%)`, color: formData.fontColor },
          itemCard: "bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-lg mb-4",
        };
      case "stylish":
        return { ...base,
          itemCard: "bg-white rounded-xl p-4 shadow-lg border border-gray-100 mb-4 transform hover:scale-[1.01] transition-transform",
          wrapper: { backgroundColor: formData.backgroundColor, color: formData.fontColor },
        };
      case "cozy":
        return { ...base,
          itemCard: "bg-white/90 rounded-[2rem] p-5 border border-amber-100/50 shadow-md mb-5",
          wrapper: { backgroundColor: formData.backgroundColor, color: formData.fontColor },
        };
      default: return { ...base,
        itemCard: "py-5 border-b border-current/10 last:border-0",
        wrapper: { backgroundColor: formData.backgroundColor, color: formData.fontColor },
      };
    }
  }, [formData, fontClass]);

  const navigateToPage = (page: string) => setPreviewState(p => ({ ...p, activePage: page, menuOpen: false }));
  const addToCart = (item: any) => setCartItems(prev => [...prev, item]);

  // --- RENDERERS ---

  // Helper for header font size
  const getHeaderFontClass = () => {
    switch (formData.headerFontSize) {
      case 'small': return 'text-xs';
      case 'large': return 'text-base';
      default: return 'text-sm';
    }
  };

  const renderNav = () => (
    <div
      className={styles.nav}
      style={{
        backgroundColor: formData.headerBackgroundColor,
        color: formData.headerFontColor
      }}
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Logo or Icon */}
        {formData.logo ? (
          <img
            src={formData.logo}
            alt="Logo"
            className="w-8 h-8 shrink-0 rounded-lg object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${formData.headerFontColor}15` }}
          >
            {formData.businessType === 'cafe' ? <Coffee className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
          </div>
        )}
        <span
          className={`font-bold cursor-pointer truncate ${getHeaderFontClass()}`}
          onClick={() => navigateToPage('home')}
          style={{ color: formData.headerFontColor }}
        >
          {formData.businessName}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0" style={{ color: formData.headerFontColor }}>
        {formData.onlineOrdering && (
          <div className="relative cursor-pointer">
            <ShoppingBag className="w-5 h-5 opacity-90" />
            {cartItems.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[9px] flex items-center justify-center rounded-full font-bold shadow-sm">
                 {cartItems.length}
               </span>
            )}
          </div>
        )}
        <button onClick={() => setPreviewState(p => ({...p, menuOpen: !p.menuOpen}))} className="p-1 active:scale-90 transition-transform">
          {previewState.menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>
    </div>
  );

  const renderMenuOverlay = () => {
    if (!previewState.menuOpen) return null;
    return (
      <div className="absolute inset-0 z-[60] bg-black/60 backdrop-blur-md transition-opacity" onClick={() => setPreviewState(p => ({...p, menuOpen: false}))}>
        <div
          className="absolute right-0 top-0 bottom-0 w-3/4 bg-white p-6 pt-20 shadow-2xl h-full flex flex-col transform transition-transform duration-300"
          style={{ backgroundColor: formData.backgroundColor, color: formData.fontColor }}
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-bold text-2xl mb-8 opacity-90">Menü</h3>
          <div className="space-y-4 flex-1 overflow-y-auto">
            {['home', ...(formData.selectedPages || [])].map(item => (
              <div
                key={item}
                className={`text-lg font-medium cursor-pointer flex justify-between items-center group pb-3 border-b border-current/10`}
                onClick={() => navigateToPage(item)}
              >
                <span className="capitalize">{item === 'home' ? 'Startseite' : item}</span>
                <ChevronRight className="w-4 h-4 opacity-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (previewState.activePage === 'home') {
      return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="text-center py-8 px-2 flex flex-col items-center">
            <h1 className={styles.titleClass} style={{ color: formData.fontColor }}>
              {formData.slogan || "Willkommen"}
            </h1>
            <p className={`${styles.bodyClass} max-w-[90%] text-center`} style={{ color: formData.fontColor }}>
              {formData.uniqueDescription || "Wir bieten beste Qualität und eine tolle Atmosphäre."}
            </p>

            {formData.onlineOrdering && (
              <div className="mt-6 w-full px-4">
                <button
                  className="w-full py-3 px-6 font-bold text-base rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all bg-black text-white"
                  style={{ backgroundColor: formData.primaryColor }}
                  onClick={() => navigateToPage('menu')}
                >
                  Bestellen
                </button>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 px-1">
              <h3 className={`uppercase tracking-widest font-bold opacity-60 text-[10px]`} style={{ color: formData.fontColor }}>Highlights</h3>
              <span className="text-[10px] font-bold opacity-60 cursor-pointer hover:opacity-100 flex items-center gap-1" onClick={() => navigateToPage('menu')}>
                   Alle <ArrowRight className="w-3 h-3" />
               </span>
            </div>

            <div className="space-y-3">
              {(formData.menuItems.length > 0
                ? formData.menuItems
                : getBusinessTypeDefaults(formData.businessType).menuItems
              ).slice(0, 3).map((item: any, i: number) => (
                <div
                  key={i}
                  className={`${styles.itemCard} cursor-pointer hover:scale-[1.02] transition-transform active:scale-[0.98]`}
                  onClick={() => openDishModal(item)}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className={styles.itemNameClass} style={{ color: formData.fontColor }}>{item.name}</div>
                      <div className={styles.itemDescClass} style={{ color: formData.fontColor }}>{item.description}</div>
                    </div>
                    <div className={styles.itemPriceClass} style={{color: formData.priceColor}}>{item.price}€</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Reservation Button - Between Highlights and Opening Hours */}
          {formData.reservationsEnabled && (
            <div className="mt-8 mb-6">
              <ReservationButton
                color={formData.reservationButtonColor}
                textColor={formData.reservationButtonTextColor}
                shape={formData.reservationButtonShape as "rounded" | "pill" | "square"}
                className="w-full shadow-lg"
                onClick={() => navigateToPage('reservations')}
              >
                Tisch reservieren
              </ReservationButton>
            </div>
          )}

          {/* Interactive Opening Hours & Location Section */}
          <div
            className="text-center py-6 border-t border-current/10 mt-6 space-y-3 cursor-pointer group"
            onClick={() => setHoursExpanded(!hoursExpanded)}
          >
            {/* Collapsed/Expanded Toggle */}
            <div className="flex items-center justify-center gap-2 opacity-70 group-hover:opacity-100 transition-opacity">
              <Clock className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">
                {hoursExpanded ? "Öffnungszeiten" : "Heute: 09:00 - 22:00"}
              </span>
              <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${hoursExpanded ? 'rotate-180' : ''}`} />
            </div>

            {/* Expanded Opening Hours */}
            {hoursExpanded && (
              <div className="mt-3 space-y-1.5 text-left max-w-[200px] mx-auto animate-in fade-in slide-in-from-top-2 duration-200">
                {Object.keys(formData.openingHours).length > 0 ? (
                  Object.entries(formData.openingHours).map(([day, hours]: any) => (
                    <div key={day} className="flex justify-between text-xs opacity-80">
                      <span className="capitalize">{day}</span>
                      <span className="font-medium">
                        {hours.closed ? "Geschlossen" : `${hours.open} - ${hours.close}`}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs italic opacity-50 text-center">Keine Zeiten hinterlegt</p>
                )}
              </div>
            )}

            {/* Location - Always visible, fixed layout */}
            {formData.location && (
              <div className="flex items-center justify-center gap-2 opacity-70 mt-2 max-w-full px-4">
                <MapPin className="w-4 h-4 shrink-0 flex-none" />
                <span className="text-xs font-medium truncate">{formData.location}</span>
              </div>
            )}
          </div>
        </div>
      );
    }

    if (previewState.activePage === 'menu') {
      // Get categories from store or defaults
      const displayCategories = (categories && categories.length > 0)
        ? categories
        : getBusinessTypeDefaults(formData.businessType).categories;

      // Get items from store or defaults
      const allItems = formData.menuItems.length > 0
        ? formData.menuItems
        : getBusinessTypeDefaults(formData.businessType).menuItems;

      // Filter by active category
      const filteredMenuItems = activeMenuCategory
        ? allItems.filter((item: any) => item.category === activeMenuCategory)
        : allItems;

      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className={styles.titleClass}>Karte</h2>
          {/* Swipeable category tabs */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2 -mx-2 px-2">
            <button
              onClick={() => setActiveMenuCategory(null)}
              className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${
                activeMenuCategory === null
                  ? 'shadow-md'
                  : 'border border-current/20 opacity-70'
              }`}
              style={activeMenuCategory === null ? { backgroundColor: formData.fontColor, color: formData.backgroundColor } : {}}
            >
              Alle
            </button>
            {displayCategories.slice(0, 5).map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveMenuCategory(cat)}
                className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${
                  activeMenuCategory === cat
                    ? 'shadow-md'
                    : 'border border-current/20 opacity-70'
                }`}
                style={activeMenuCategory === cat ? { backgroundColor: formData.fontColor, color: formData.backgroundColor } : {}}
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
                      <div className={styles.itemNameClass} style={{ color: formData.fontColor }}>{item.name}</div>
                      <div className={styles.itemDescClass} style={{ color: formData.fontColor }}>{item.description}</div>
                    </div>
                    <div className="flex flex-col items-end gap-2 pl-2">
                      <div className={styles.itemPriceClass} style={{color: formData.priceColor}}>{item.price || "9.50"}€</div>
                      {formData.onlineOrdering && (
                        <button
                          onClick={(e) => { e.stopPropagation(); addToCart(item); }}
                          className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md"
                          style={{ backgroundColor: formData.primaryColor, color: '#FFF' }}
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

    if (previewState.activePage === 'contact') {
      return (
        <div className="space-y-8 animate-in fade-in duration-300">
          <h2 className={styles.titleClass}>Kontakt</h2>
          <div className={`p-6 rounded-2xl border border-current/10 bg-white/5 space-y-6 backdrop-blur-sm shadow-sm`}>
            <div className="space-y-6">
              {formData.location && (
                <div className="flex items-start gap-4">
                  <div className="mt-1 p-2 bg-current/5 rounded-full"><MapPin className="w-4 h-4" /></div>
                  <div>
                    <div className="font-bold text-sm mb-1 opacity-90">Adresse</div>
                    <div className={styles.bodyClass}>{formData.location}</div>
                  </div>
                </div>
              )}
              {formData.contactMethods.map((m: any, i: number) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="p-2 bg-current/5 rounded-full">{m.type === 'phone' ? <Phone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}</div>
                  <div className={styles.bodyClass}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Clock className="w-5 h-5 opacity-70" /> Öffnungszeiten</h3>
            <div className="space-y-2 opacity-90">
              {Object.keys(formData.openingHours).length > 0 ? (
                Object.entries(formData.openingHours).map(([day, hours]: any) => (
                  <div key={day} className="flex justify-between text-xs py-2 border-b border-current/5 last:border-0">
                    <span className="capitalize opacity-80 font-medium">{day}</span>
                    <span className="font-bold">{hours.closed ? "Geschlossen" : `${hours.open} - ${hours.close}`}</span>
                  </div>
                ))
              ) : (
                <div className="text-xs opacity-60 italic">Keine Zeiten hinterlegt.</div>
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

    if (previewState.activePage === 'gallery') {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className={styles.titleClass}>Galerie</h2>
          <div className="grid grid-cols-2 gap-3">
            {(formData.gallery.length > 0 ? formData.gallery : [1,2,3,4,5,6]).map((img: any, i: number) => (
              <div key={i} className="aspect-square rounded-xl overflow-hidden bg-black/5 relative shadow-sm group">
                {img.url ? <img src={normalizeImageSrc(img)} className="w-full h-full object-cover" /> : (
                  <div className="w-full h-full flex items-center justify-center text-current/20"><Camera className="w-6 h-6" /></div>
                )}
              </div>
            ))}
          </div>
        </div>
      );
    }

    // Reservations Page
    if (previewState.activePage === 'reservations') {
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ backgroundColor: `${formData.primaryColor}20` }}>
              <CalendarCheck className="w-8 h-8" style={{ color: formData.primaryColor }} />
            </div>
            <h2 className={styles.titleClass}>Reservierung</h2>
            <p className={`${styles.bodyClass} opacity-70`}>Buchen Sie Ihren Tisch online</p>
          </div>

          {/* Reservation Form */}
          <div className="space-y-4 p-4 rounded-2xl border border-current/10 bg-white/5">
            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">Datum</label>
              <div className="flex items-center gap-2 p-3 rounded-xl border border-current/10 bg-white/50">
                <Calendar className="w-4 h-4 opacity-50" />
                <span className="text-sm">Datum wählen...</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">Uhrzeit</label>
              <div className="flex items-center gap-2 p-3 rounded-xl border border-current/10 bg-white/50">
                <Clock className="w-4 h-4 opacity-50" />
                <span className="text-sm">Zeit wählen...</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">Anzahl Gäste</label>
              <div className="flex items-center gap-2 p-3 rounded-xl border border-current/10 bg-white/50">
                <Users className="w-4 h-4 opacity-50" />
                <span className="text-sm">2 Personen</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">Name</label>
              <div className="p-3 rounded-xl border border-current/10 bg-white/50">
                <span className="text-sm opacity-50">Ihr Name...</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-2 opacity-70">Telefon / E-Mail</label>
              <div className="p-3 rounded-xl border border-current/10 bg-white/50">
                <span className="text-sm opacity-50">Kontakt für Bestätigung...</span>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          {formData.reservationsEnabled && (
            <ReservationButton
              color={formData.reservationButtonColor}
              textColor={formData.reservationButtonTextColor}
              shape={formData.reservationButtonShape as "rounded" | "pill" | "square"}
              className="w-full shadow-lg"
            >
              Reservierung anfragen
            </ReservationButton>
          )}

          {/* Info */}
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

    return <div className="p-10 text-center opacity-50 pt-20">Seite nicht gefunden</div>;
  };

  // --- HAUPT RENDER ---
  return (
    <div
      className="h-full w-full relative flex flex-col transition-colors duration-300 overflow-hidden pointer-events-auto select-none"
      style={styles.wrapper}
      onWheel={(e) => e.stopPropagation()}
    >
      {/* FIXED NAV HEADER - Außerhalb des Scroll-Containers für Sticky-Effekt */}
      {renderNav()}
      {renderMenuOverlay()}

      {/* SCROLL CONTAINER - Content scrollt unter dem fixierten Header */}
      <div
        className="flex-1 overflow-y-auto no-scrollbar scroll-smooth relative z-10"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorY: 'contain'
        }}
      >
        <div className={styles.page}>
          {renderContent()}
        </div>
        {/* Footer Spacer */}
        <div className="h-20 w-full" />
      </div>

      {/* DISH MODAL */}
      {selectedDish && (
        <div
          className="absolute inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end animate-in fade-in duration-200"
          onClick={closeDishModal}
        >
          <div
            className="w-full bg-white rounded-t-3xl max-h-[85%] overflow-hidden animate-in slide-in-from-bottom duration-300"
            style={{ backgroundColor: formData.backgroundColor, color: formData.fontColor }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Image Carousel */}
            {selectedDish.images && selectedDish.images.length > 0 ? (
              <div className="relative aspect-[4/3] bg-gray-100">
                <img
                  src={normalizeImageSrc(selectedDish.images[currentImageIndex])}
                  alt={selectedDish.name}
                  className="w-full h-full object-cover"
                />
                {/* Image Navigation */}
                {selectedDish.images.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    {/* Image Dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                      {selectedDish.images.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`w-2 h-2 rounded-full transition-all ${
                            idx === currentImageIndex
                              ? 'bg-white w-4'
                              : 'bg-white/50'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
                {/* Close Button */}
                <button
                  onClick={closeDishModal}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            ) : (
              <div className="relative aspect-[4/3] bg-gray-100 flex items-center justify-center">
                <Camera className="w-12 h-12 text-gray-300" />
                <button
                  onClick={closeDishModal}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* Dish Details */}
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-start gap-3">
                <h3 className="text-xl font-bold">{selectedDish.name}</h3>
                <span className="text-xl font-bold shrink-0" style={{ color: formData.priceColor }}>
                  {selectedDish.price}€
                </span>
              </div>
              {selectedDish.description && (
                <p className="text-sm opacity-80 leading-relaxed">{selectedDish.description}</p>
              )}

              {/* Add to Cart Button */}
              {formData.onlineOrdering && (
                <button
                  onClick={() => { addToCart(selectedDish); closeDishModal(); }}
                  className="w-full py-3 rounded-xl font-bold text-white shadow-lg mt-4 transition-transform active:scale-[0.98]"
                  style={{ backgroundColor: formData.primaryColor }}
                >
                  <Plus className="w-4 h-4 inline mr-2" />
                  Zum Warenkorb
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
