import React from "react";
import { Button } from "@/components/ui/button";

// Erweitertes Typ-Interface basierend auf deinen DB-Feldern
export type DynamicConfig = {
  businessName?: string;
  slogan?: string;
  uniqueDescription?: string;
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  fontColor?: string;
  fontFamily?: string;
  headerFontSize?: string;
  selectedPages?: string[];
  menuItems?: Array<{ id?: string; name: string; description?: string; price?: string | number; category?: string }>;
  gallery?: Array<{ id?: string; url: string; alt?: string }>;
  contactMethods?: string[];
  socialMedia?: Record<string, string>;
  openingHours?: Record<string, any>;
};

export default function AppRenderer({ config }: { config: DynamicConfig }) {
  const pages = config.selectedPages && config.selectedPages.length > 0
    ? config.selectedPages
    : ["home", "menu", "gallery", "contact"];

  const businessName = config.businessName || "Your Business";

  // Mapping der Header-Größe (z.B. "2xl" -> "text-5xl")
  const getHeaderSizeClass = (size?: string) => {
    switch (size) {
      case "xl": return "text-4xl";
      case "2xl": return "text-5xl md:text-6xl";
      case "3xl": return "text-7xl";
      default: return "text-4xl";
    }
  };

  return (
    <div
      style={{
        fontFamily: config.fontFamily || "Inter, sans-serif",
        backgroundColor: config.backgroundColor || "#ffffff",
        color: config.fontColor || "#111827"
      }}
      className="min-h-screen transition-colors duration-500"
    >
      {/* Header / Navigation */}
      <header className="sticky top-0 z-50 bg-white/10 backdrop-blur-md border-b border-black/5">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div
            className="font-black text-xl tracking-tighter"
            style={{ color: config.primaryColor || "#111827" }}
          >
            {businessName}
          </div>
          <nav className="flex gap-6 text-sm font-medium opacity-80">
            {pages.includes("menu") && <a href="#menu" className="hover:opacity-100 transition-opacity">Karte</a>}
            {pages.includes("gallery") && <a href="#gallery" className="hover:opacity-100 transition-opacity">Galerie</a>}
            {pages.includes("contact") && <a href="#contact" className="hover:opacity-100 transition-opacity">Kontakt</a>}
          </nav>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        {pages.includes("home") && (
          <section className="py-24 px-6 text-center">
            <div className="max-w-4xl mx-auto">
              <h1
                className={`font-black mb-6 leading-tight ${getHeaderSizeClass(config.headerFontSize)}`}
                style={{ color: config.primaryColor || "#111827" }}
              >
                {businessName}
              </h1>
              {config.slogan && (
                <p className="text-xl md:text-2xl opacity-90 mb-8 font-medium italic">
                  „{config.slogan}“
                </p>
              )}
              {config.uniqueDescription && (
                <p className="text-lg opacity-80 max-w-2xl mx-auto leading-relaxed">
                  {config.uniqueDescription}
                </p>
              )}
              <div className="mt-10">
                <Button
                  size="lg"
                  className="rounded-full px-10 py-7 text-lg font-bold shadow-xl transition-transform hover:scale-105"
                  style={{
                    backgroundColor: config.primaryColor || "#111827",
                    color: "#ffffff"
                  }}
                  onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  Tisch reservieren
                </Button>
              </div>
            </div>
          </section>
        )}

        {/* Menu Section */}
        {pages.includes("menu") && (
          <section id="menu" className="py-20 px-6">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black mb-12 text-center" style={{ color: config.primaryColor }}>
                Highlights der Karte
              </h2>
              <div className="grid md:grid-cols-2 gap-6">
                {(config.menuItems && config.menuItems.length > 0) ? (
                  config.menuItems.map((item) => (
                    <div
                      key={item.id || item.name}
                      className="p-6 rounded-3xl bg-white/30 backdrop-blur-sm border border-white/20 shadow-sm flex flex-col justify-between"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-lg">{item.name}</div>
                        <div className="font-black" style={{ color: config.primaryColor }}>
                          {item.price}€
                        </div>
                      </div>
                      {item.description && <p className="text-sm opacity-70 italic">{item.description}</p>}
                    </div>
                  ))
                ) : (
                  <p className="text-center opacity-50 col-span-2">Noch keine Gerichte eingetragen.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Gallery Section */}
        {pages.includes("gallery") && (
          <section id="gallery" className="py-20 px-6 bg-black/5">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-black mb-12 text-center" style={{ color: config.primaryColor }}>Galerie</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {(config.gallery && config.gallery.length > 0) ? (
                  config.gallery.map((img) => (
                    <div key={img.id || img.url} className="aspect-square overflow-hidden rounded-2xl shadow-md">
                      <img
                        src={img.url}
                        alt={img.alt || "Gallery image"}
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-500"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-center opacity-50 col-span-full">Noch keine Bilder hochgeladen.</p>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Contact & Hours Section */}
        {pages.includes("contact") && (
          <section id="contact" className="py-20 px-6">
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-12">
              <div className="space-y-6">
                <h2 className="text-3xl font-black" style={{ color: config.primaryColor }}>Kontakt</h2>
                {config.contactMethods && config.contactMethods.length > 0 ? (
                  <ul className="space-y-4">
                    {config.contactMethods.map((c, i) => (
                      <li key={i} className="flex items-center gap-3 p-4 bg-white/20 rounded-2xl border border-white/20">
                        <span className="opacity-90 font-medium">{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="opacity-60">Keine Kontaktinfos hinterlegt.</p>
                )}
              </div>

              <div className="p-8 rounded-3xl bg-white/40 border border-white/20 shadow-inner">
                <h3 className="font-black text-xl mb-6">Öffnungszeiten</h3>
                {config.openingHours && Object.keys(config.openingHours).length > 0 ? (
                  <ul className="space-y-3">
                    {Object.entries(config.openingHours).map(([day, sched]: any) => (
                      <li key={day} className="flex justify-between border-b border-black/5 pb-2">
                        <span className="capitalize font-bold opacity-70">{day}</span>
                        <span className="font-mono">
                          {sched.closed ? 'Geschlossen' : `${sched.open} - ${sched.close}`}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="opacity-60">Nicht konfiguriert.</p>
                )}
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="py-12 border-t border-black/5 text-center text-sm opacity-50">
        <div className="max-w-4xl mx-auto px-4">
          <p className="font-bold">© {new Date().getFullYear()} {businessName}</p>
          <p className="mt-1">Handcrafted with Maitr</p>
        </div>
      </footer>
    </div>
  );
}