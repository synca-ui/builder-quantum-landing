import React, { useState, useMemo } from "react";
import { useConfiguratorStore } from "@/store/configuratorStore";
import {
  MapPin, Phone, Mail, Clock, Instagram, Facebook,
  Coffee, Utensils, ShoppingBag, Menu, X,
  Plus, ChevronRight, ChevronDown, Camera, ArrowRight,
  Calendar, Users, CalendarCheck
} from "lucide-react";
import { ReservationButton } from "@/components/ui/ReservationButton";
import { getBusinessTypeDefaults } from "@/lib/businessTypeDefaults";

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

  // Content fields
  const menuItems = useConfiguratorStore((s) => s.content.menuItems);
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
    priceColor: primaryColor || "#2563EB",
    fontSize: "medium",
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
    template, primaryColor, secondaryColor, fontFamily, backgroundColor, fontColor,
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

  const renderNav = () => (
    <div className={styles.nav} style={{ backgroundColor: formData.backgroundColor }}>
      <div className="flex items-center gap-2 overflow-hidden">
        <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center bg-current opacity-10 text-current`}>
          {formData.businessType === 'cafe' ? <Coffee className="w-4 h-4" /> : <Utensils className="w-4 h-4" />}
        </div>
        <span className="font-bold text-sm cursor-pointer truncate" onClick={() => navigateToPage('home')}>
          {formData.businessName}
        </span>
      </div>

      <div className="flex items-center gap-3 shrink-0">
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
              {(formData.menuItems.length > 0 ? formData.menuItems : [
                {name: "Burger Klassik", description: "Rindfleisch, Salat, Tomate", price: "12.50"},
                {name: "Pasta Pesto", description: "Frisches Basilikum, Pinienkerne", price: "14.00"},
                {name: "Hauslimo", description: "Zitrone & Minze", price: "4.50"}
              ]).slice(0, 3).map((item: any, i: number) => (
                <div key={i} className={styles.itemCard}>
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
      return (
        <div className="space-y-6 animate-in fade-in duration-300">
          <h2 className={styles.titleClass}>Karte</h2>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {['Alle', 'Speisen', 'Getränke', 'Desserts'].map((cat, i) => (
              <span key={cat} className={`px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap cursor-pointer transition-all hover:scale-105 ${i === 0 ? 'bg-current text-white/90 shadow-md' : 'border border-current/20 opacity-70'}`} style={i === 0 ? { backgroundColor: formData.fontColor, color: formData.backgroundColor } : {}}>{cat}</span>
            ))}
          </div>
          <div className="space-y-4 pb-8">
            {(formData.menuItems.length > 0 ? formData.menuItems : [1,2,3,4,5,6]).map((item: any, i: number) => (
              <div key={i} className={styles.itemCard}>
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className={styles.itemNameClass} style={{ color: formData.fontColor }}>{item.name || `Gericht ${i+1}`}</div>
                    <div className={styles.itemDescClass} style={{ color: formData.fontColor }}>{item.description || "Lecker und frisch zubereitet."}</div>
                  </div>
                  <div className="flex flex-col items-end gap-2 pl-2">
                    <div className={styles.itemPriceClass} style={{color: formData.priceColor}}>{item.price || "9.50"}€</div>
                    {formData.onlineOrdering && (
                      <button onClick={() => addToCart(item)} className="w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 shadow-md" style={{ backgroundColor: formData.primaryColor, color: '#FFF' }}><Plus className="w-4 h-4" /></button>
                    )}
                  </div>
                </div>
              </div>
            ))}
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
    </div>
  );
}
