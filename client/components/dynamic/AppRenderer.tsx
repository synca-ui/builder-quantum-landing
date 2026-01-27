import React, { useMemo } from "react";
import {
  Clock,
  MapPin,
  Phone,
  Mail,
  Instagram,
  Facebook,
  ChevronRight,
  UtensilsCrossed
} from "lucide-react";
import { Configuration, MenuItem, OpeningHours } from "@/types/domain";
import { defaultTemplates, defaultTemplateThemes } from "@/components/template/TemplateRegistry.tsx";
import MenuSection from "@/components/sections/MenuSection.tsx";


interface AppRendererProps {
  config: any; // Akzeptiert flache DB-Daten oder verschachtelte Configuration
}

/**
 * ARCHITEKTUR-ENTSCHEIDUNG:
 * Wir nutzen eine Normalisierungs-Funktion, um sicherzustellen, dass der Renderer
 * sowohl mit dem verschachtelten Zustand aus dem Store als auch mit flachen
 * Objekten aus der NeonDB (Legacy/Flat-Migration) umgehen kann.
 */
const normalizeConfig = (rawConfig: any): Configuration => {
  if (rawConfig.business && rawConfig.design) {
    return {
      ...rawConfig,
      userId: rawConfig.userId || "anonymous",
    } as Configuration;
  }

  return {
    userId: rawConfig.userId || "anonymous",
    business: {
      name: rawConfig.businessName || rawConfig.name || "",
      type: rawConfig.businessType || rawConfig.type || "restaurant",
      location: rawConfig.location,
      slogan: rawConfig.slogan,
      uniqueDescription: rawConfig.uniqueDescription,
      logo: rawConfig.logo,
    },
    design: {
      template: rawConfig.template || "modern",
      primaryColor: rawConfig.primaryColor || "#4F46E5",
      secondaryColor: rawConfig.secondaryColor || "#7C3AED",
      backgroundColor: rawConfig.backgroundColor || "#FFFFFF",
      fontColor: rawConfig.fontColor || "#111827",
      fontFamily: rawConfig.fontFamily || "sans-serif",
      priceColor: rawConfig.priceColor || "#059669",
    },
    content: {
      menuItems: rawConfig.menuItems || [],
      gallery: rawConfig.gallery || [],
      openingHours: rawConfig.openingHours || {},
    },
    features: {
      reservationsEnabled: rawConfig.reservationsEnabled || false,
      reservationButtonColor: rawConfig.reservationButtonColor || "#2563EB",
      onlineOrderingEnabled: rawConfig.onlineOrderingEnabled || false,
      onlineStoreEnabled: rawConfig.onlineStoreEnabled || false,
      teamAreaEnabled: rawConfig.teamAreaEnabled || false,
    },
    contact: {
      email: rawConfig.email,
      phone: rawConfig.phone,
      socialMedia: rawConfig.socialMedia || {},
      contactMethods: rawConfig.contactMethods || [],
    },
    publishing: rawConfig.publishing || { status: "draft" },
    pages: rawConfig.pages || { selectedPages: ["home"], customPages: [] },
    payments: rawConfig.payments || {},
  } as Configuration;
};

export const AppRenderer: React.FC<AppRendererProps> = ({ config: rawConfig }) => {
  const config = useMemo(() => normalizeConfig(rawConfig), [rawConfig]);
  const { business, design, content, features, contact } = config;

  // Extraktion der Template-Metadaten aus der Registry
  const templateMeta = defaultTemplates.find(t => t.id === design.template) || defaultTemplates[0];
  const theme = defaultTemplateThemes[design.template] || defaultTemplateThemes.modern;

  // Mapping von Font-Keywords auf CSS-Klassen
  const fontClass = {
    "sans-serif": "font-sans",
    "serif": "font-serif",
    "monospace": "font-mono"
  }[design.fontFamily] || "font-sans";

  // Dynamische Styles für Injektion
  const dynamicStyles = {
    "--primary": design.primaryColor,
    "--secondary": design.secondaryColor,
    "--bg-site": design.backgroundColor,
    "--text-main": design.fontColor,
    "--price": design.priceColor,
    color: design.fontColor,
    backgroundColor: design.backgroundColor,
  } as React.CSSProperties;

  return (
    <div className={`min-h-screen ${fontClass} transition-colors duration-500`} style={dynamicStyles}>

      {/* --- NAVIGATION --- */}
      <nav
        className={`fixed top-0 w-full z-50 px-6 py-4 transition-all border-b ${templateMeta.mockup.nav.bg} ${templateMeta.mockup.nav.border}`}
      >
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {business.logo?.url ? (
              <img src={business.logo.url} alt={business.name} className="h-10 w-auto object-contain" />
            ) : (
              <span className="text-xl font-black tracking-tighter" style={{ color: "var(--primary)" }}>
                {business.name.toUpperCase()}
              </span>
            )}
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest opacity-80">
            {content.menuItems.length > 0 && <a href="#menu">Speisekarte</a>}
            {content.gallery.length > 0 && <a href="#gallery">Galerie</a>}
            <a href="#contact">Kontakt</a>
          </div>
        </div>
      </nav>

      {/* --- HERO SEKTION (Dynamisches Layout) --- */}
      <section className={`pt-32 pb-20 px-6 ${templateMeta.style.layout === 'narrative-fullscreen' ? 'min-h-screen flex items-center' : ''}`}>
        <div className={`max-w-4xl mx-auto ${design.template === 'minimalist' ? 'text-left' : 'text-center'}`}>
          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-[1.1]" style={{ color: "var(--primary)" }}>
            {business.slogan || business.name}
          </h1>
          <p className="text-xl md:text-2xl mb-10 opacity-70 max-w-2xl mx-auto">
            {business.uniqueDescription}
          </p>
          {features.reservationsEnabled && (
            <button
              className={`px-8 py-4 text-lg font-bold transition-transform hover:scale-105 active:scale-95 shadow-xl`}
              style={{
                backgroundColor: features.reservationButtonColor,
                color: "#fff",
                borderRadius: theme.buttonRadius
              }}
            >
              Jetzt Tisch reservieren
            </button>
          )}
        </div>
      </section>

      {/* --- SPEISEKARTE (Content-Driven) --- */}
      {content.menuItems.length > 0 && (
        <section id="menu" className="py-24 px-6 bg-black/5">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <UtensilsCrossed className="w-8 h-8 opacity-20" />
              <h2 className="text-3xl font-black uppercase tracking-tighter">Speisekarte</h2>
            </div>
            <MenuSection
              items={content.menuItems as MenuItem[]}
              templateStyle={design.template}
              primaryColor={design.primaryColor}
              textColor={design.fontColor}
              showSocialProof={true}
            />
          </div>
        </section>
      )}

      {/* --- GALERIE --- */}
      {content.gallery.length > 0 && (
        <section id="gallery" className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30 mb-12 text-center">Impressionen</h2>
            <div className={`grid gap-4 ${templateMeta.style.layout === 'cozy-grid' ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 md:grid-cols-3'}`}>
              {content.gallery.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className="aspect-square overflow-hidden group shadow-lg"
                  style={{ borderRadius: templateMeta.style.layout === 'cozy-grid' ? '2rem' : '0' }}
                >
                  <img
                    src={img.url}
                    alt={img.alt || "Gallery"}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- ÖFFNUNGSZEITEN & KONTAKT --- */}
      <footer id="contact" className="py-24 px-6 border-t border-black/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">

          {/* Linke Seite: Info */}
          <div>
            <h3 className="text-2xl font-black mb-8">Kontakt & Anfahrt</h3>
            <div className="space-y-6 opacity-80">
              {business.location && (
                <div className="flex items-center gap-4">
                  <MapPin className="w-5 h-5" style={{ color: "var(--primary)" }} />
                  <span>{business.location}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-4">
                  <Phone className="w-5 h-5" style={{ color: "var(--primary)" }} />
                  <a href={`tel:${contact.phone}`}>{contact.phone}</a>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5" style={{ color: "var(--primary)" }} />
                  <a href={`mailto:${contact.email}`}>{contact.email}</a>
                </div>
              )}
            </div>

            {/* Social Media */}
            <div className="flex gap-4 mt-10">
              {Object.entries(contact.socialMedia).map(([platform, url]) => (
                <a key={platform} href={url as string} className="p-3 bg-black/5 rounded-full hover:bg-black/10 transition-colors">
                  {platform === 'instagram' && <Instagram className="w-5 h-5" />}
                  {platform === 'facebook' && <Facebook className="w-5 h-5" />}
                </a>
              ))}
            </div>
          </div>

          {/* Rechte Seite: Zeiten */}
          <div className={`p-8 rounded-3xl ${templateMeta.mockup.cards.bg} ${templateMeta.mockup.cards.border} border`}>
            <div className="flex items-center gap-3 mb-8">
              <Clock className="w-6 h-6 opacity-40" />
              <h3 className="text-xl font-bold">Öffnungszeiten</h3>
            </div>
            <div className="space-y-4">
              {Object.entries(content.openingHours || {}).map(([day, hours]: [string, any]) => (
                <div key={day} className="flex justify-between border-b border-black/5 pb-2 last:border-0">
                  <span className="capitalize font-medium opacity-60">{day}</span>
                  <span className="font-bold">
                    {hours.closed ? "Geschlossen" : `${hours.open} - ${hours.close}`}
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>
        <div className="text-center mt-20 opacity-30 text-[10px] font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} {business.name} | Maitr Website Builder
        </div>
      </footer>
    </div>
  );
};

export default AppRenderer;