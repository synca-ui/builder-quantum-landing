/**
 * AppRenderer.tsx - REFACTORED VERSION
 *
 * Diese Version implementiert 100% visuelle Parität zur Preview durch:
 * 1. Template Intent Berücksichtigung (VISUAL vs. NARRATIVE vs. COMMERCIAL)
 * 2. Globale CSS-Variable-Injektion aus Template-Tokens
 * 3. Glassmorphism, Animationen, Overlays basierend auf Intent
 * 4. Utility Classes statt hartcodierter Tailwind-Klassen
 */

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
import { defaultTemplates, defaultTemplateThemes } from "@/components/template/TemplateRegistry";
import MenuSection from "@/components/sections/MenuSection";
import { generateGlobalStyles } from "@/lib/styleInjector";
import {
  getTemplateTokens,
  getTemplateIntent,
  getVisualConfig,
  type VisualConfig
} from "@/lib/templateTokens";
import { cn } from "@/lib/utils";

interface AppRendererProps {
  config: any; // Akzeptiert flache DB-Daten oder verschachtelte Configuration
}

/**
 * Normalisierungs-Funktion (unverändert)
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

  // ✅ NEU: Template-Metadaten + Tokens laden
  const templateMeta = defaultTemplates.find(t => t.id === design.template) || defaultTemplates[0];
  const theme = defaultTemplateThemes[design.template] || defaultTemplateThemes.modern;
  const templateIntent = getTemplateIntent(design.template);
  const templateTokens = getTemplateTokens(design.template);
  const visualConfig: VisualConfig = getVisualConfig(design.template);

  // ✅ NEU: Globale CSS-Styles generieren
  const globalStyles = generateGlobalStyles(design.template, {
    primaryColor: design.primaryColor,
    secondaryColor: design.secondaryColor,
    backgroundColor: design.backgroundColor,
    fontColor: design.fontColor,
    priceColor: design.priceColor,
  });

  // Font-Mapping
  const fontClass = {
    "sans-serif": "font-sans",
    "serif": "font-serif",
    "monospace": "font-mono"
  }[design.fontFamily] || "font-sans";

  return (
    <div className={`min-h-screen ${fontClass} transition-colors duration-500`}>
      {/* ✅ KRITISCH: Globale Styles injizieren */}
      <style dangerouslySetInnerHTML={{ __html: globalStyles }} />

      {/* --- NAVIGATION mit Intent-basiertem Styling --- */}
      <nav
        className={cn(
          "fixed top-0 w-full z-50 px-6 py-4 transition-all border-b",
          visualConfig.glassmorphism ? "nav-glassmorphic" : "nav-solid"
        )}
      >
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            {business.logo?.url ? (
              <img
                src={business.logo.url}
                alt={business.name}
                className="h-10 w-auto object-contain"
              />
            ) : (
              <span className="text-xl font-black tracking-tighter text-primary">
                {business.name.toUpperCase()}
              </span>
            )}
          </div>
          <div className="hidden md:flex gap-8 text-sm font-bold uppercase tracking-widest opacity-80">
            {content.menuItems.length > 0 && <a href="#menu" className="hover:text-primary transition-colors">Speisekarte</a>}
            {content.gallery.length > 0 && <a href="#gallery" className="hover:text-primary transition-colors">Galerie</a>}
            <a href="#contact" className="hover:text-primary transition-colors">Kontakt</a>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION mit Animations + Overlays --- */}
      <section
        className={cn(
          "pt-32 pb-20 px-6 relative",
          templateMeta.style.layout === 'narrative-fullscreen' && 'min-h-screen flex items-center',
          visualConfig.animations && "animate-fade-in-up"
        )}
        style={{
          backgroundColor: visualConfig.glassmorphism
            ? 'transparent'
            : design.backgroundColor
        }}
      >
        {/* Overlay nur für VISUAL Intent */}
        {visualConfig.overlays && <div className="overlay-dark" />}

        <div
          className={cn(
            "max-w-4xl mx-auto relative z-10",
            design.template === 'minimalist' ? 'text-left' : 'text-center'
          )}
        >
          <h1 className="text-h1 mb-6 leading-tight text-primary">
            {business.slogan || business.name}
          </h1>
          <p className="text-h2 mb-10 opacity-70 max-w-2xl mx-auto">
            {business.uniqueDescription}
          </p>

          {/* CTA Button mit Intent-basiertem Hover */}
          {features.reservationsEnabled && (
            <button
              className={cn(
                "px-8 py-4 text-lg font-bold shadow-xl",
                visualConfig.hoverEffects && "hover:scale-105 active:scale-95 transition-transform duration-300",
                visualConfig.animations && "animate-scale-in stagger-1"
              )}
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

      {/* --- SPEISEKARTE mit Animations --- */}
      {content.menuItems.length > 0 && (
        <section
          id="menu"
          className={cn(
            "py-24 px-6",
            visualConfig.glassmorphism ? "bg-black/5" : "bg-accent",
            visualConfig.animations && "animate-slide-in-left stagger-2"
          )}
        >
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-4 mb-12">
              <UtensilsCrossed className="w-8 h-8 opacity-20" />
              <h2 className="text-h2 uppercase tracking-tighter">Speisekarte</h2>
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

      {/* --- GALERIE mit Visual Config --- */}
      {content.gallery.length > 0 && (
        <section
          id="gallery"
          className={cn(
            "py-24 px-6",
            visualConfig.animations && "animate-fade-in-up stagger-3"
          )}
        >
          <div className="max-w-6xl mx-auto">
            <h2 className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30 mb-12 text-center">
              Impressionen
            </h2>
            <div
              className={cn(
                "grid gap-4",
                templateMeta.style.layout === 'cozy-grid'
                  ? 'grid-cols-2 md:grid-cols-4'
                  : 'grid-cols-1 md:grid-cols-3'
              )}
            >
              {content.gallery.map((img, idx) => (
                <div
                  key={img.id || idx}
                  className={cn(
                    "aspect-square overflow-hidden group",
                    visualConfig.shadows && "shadow-lg",
                    visualConfig.hoverEffects && "hover:shadow-2xl transition-shadow duration-300",
                    visualConfig.animations && `animate-scale-in stagger-${Math.min(idx + 1, 6)}`
                  )}
                  style={{
                    borderRadius: templateMeta.style.layout === 'cozy-grid'
                      ? '2rem'
                      : visualConfig.borderRadius === '2xl'
                        ? '1rem'
                        : '0'
                  }}
                >
                  <img
                    src={img.url}
                    alt={img.alt || "Gallery"}
                    className={cn(
                      "w-full h-full object-cover",
                      visualConfig.hoverEffects && "transition-transform duration-700 group-hover:scale-110"
                    )}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* --- KONTAKT FOOTER mit Glassmorphic/Solid Cards --- */}
      <footer
        id="contact"
        className={cn(
          "py-24 px-6 border-t border-black/5",
          visualConfig.animations && "animate-fade-in-up stagger-4"
        )}
      >
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16">

          {/* Linke Seite: Kontakt-Informationen */}
          <div>
            <h3 className="text-h2 mb-8">Kontakt & Anfahrt</h3>
            <div className="space-y-6 opacity-80">
              {business.location && (
                <div className="flex items-center gap-4">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-body">{business.location}</span>
                </div>
              )}
              {contact.phone && (
                <div className="flex items-center gap-4">
                  <Phone className="w-5 h-5 text-primary flex-shrink-0" />
                  <a
                    href={`tel:${contact.phone}`}
                    className={cn(
                      "text-body",
                      visualConfig.hoverEffects && "hover:text-primary transition-colors"
                    )}
                  >
                    {contact.phone}
                  </a>
                </div>
              )}
              {contact.email && (
                <div className="flex items-center gap-4">
                  <Mail className="w-5 h-5 text-primary flex-shrink-0" />
                  <a
                    href={`mailto:${contact.email}`}
                    className={cn(
                      "text-body",
                      visualConfig.hoverEffects && "hover:text-primary transition-colors"
                    )}
                  >
                    {contact.email}
                  </a>
                </div>
              )}
            </div>

            {/* Social Media */}
            {Object.keys(contact.socialMedia).length > 0 && (
              <div className="flex gap-4 mt-10">
                {Object.entries(contact.socialMedia).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url as string}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "p-3 rounded-full transition-colors",
                      visualConfig.glassmorphism
                        ? "bg-white/10 hover:bg-white/20"
                        : "bg-black/5 hover:bg-black/10"
                    )}
                  >
                    {platform === 'instagram' && <Instagram className="w-5 h-5" />}
                    {platform === 'facebook' && <Facebook className="w-5 h-5" />}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Rechte Seite: Öffnungszeiten mit Glassmorphic/Solid Card */}
          <div
            className={cn(
              "p-8 border",
              visualConfig.glassmorphism ? "card-glassmorphic" : "card-solid"
            )}
            style={{
              borderRadius: visualConfig.borderRadius === '2xl' ? '1.5rem' : '1rem'
            }}
          >
            <div className="flex items-center gap-3 mb-8">
              <Clock className="w-6 h-6 opacity-40" />
              <h3 className="text-xl font-bold">Öffnungszeiten</h3>
            </div>
            <div className="space-y-4">
              {Object.keys(content.openingHours).length > 0 ? (
                Object.entries(content.openingHours).map(([day, hours]: [string, any]) => (
                  <div
                    key={day}
                    className="flex justify-between border-b border-current/5 pb-2 last:border-0"
                  >
                    <span className="capitalize font-medium opacity-60 text-body">
                      {day}
                    </span>
                    <span className="font-bold text-body">
                      {hours.closed ? "Geschlossen" : `${hours.open} - ${hours.close}`}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-sm opacity-60 italic">
                  Keine Öffnungszeiten hinterlegt.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Footer Copyright */}
        <div className="text-center mt-20 opacity-30 text-[10px] font-bold uppercase tracking-widest">
          © {new Date().getFullYear()} {business.name} | Maitr Website Builder
        </div>
      </footer>
    </div>
  );
};

export default AppRenderer;