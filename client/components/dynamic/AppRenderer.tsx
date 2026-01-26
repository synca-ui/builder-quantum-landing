import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu as MenuIcon, X, ChevronRight, Clock, Camera } from "lucide-react";

export default function AppRenderer({ config }: { config: any }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePage, setActivePage] = useState("home");

  // --- 1. DATEN-EXTRAKTION (Alles aus dem JSON) ---
  const {
    businessName,
    slogan,
    uniqueDescription,
    primaryColor,
    backgroundColor,
    fontColor,
    fontFamily,
    headerFontSize,
    headerFontColor,
    headerBackgroundColor,
    menuItems = [],
    gallery = [],
    openingHours = {},
    selectedPages = [],
    reservationsEnabled,
    priceColor
  } = config;

  // --- 2. DYNAMISCHE STYLE-BERECHNUNG ---
  const styles = useMemo(() => {
    // Mapping der Font-Größe aus dem Konfigurator
    const getFontSize = (size: string) => {
      const map: Record<string, string> = {
        "xs": "text-xs", "small": "text-sm", "medium": "text-base",
        "large": "text-lg", "xl": "text-xl", "2xl": "text-2xl", "3xl": "text-3xl"
      };
      return map[size] || "text-base";
    };

    return {
      root: {
        backgroundColor: backgroundColor,
        color: fontColor,
        fontFamily: fontFamily || "sans-serif",
      },
      header: {
        backgroundColor: headerBackgroundColor || backgroundColor,
        color: headerFontColor || fontColor,
      },
      primaryButton: {
        backgroundColor: primaryColor,
        color: "#FFFFFF", // Kontrastfarbe für Text auf Buttons
      },
      accentText: {
        color: primaryColor,
      },
      priceText: {
        color: priceColor || primaryColor,
      },
      headerFontClass: getFontSize(headerFontSize)
    };
  }, [config]);

  // Hilfsfunktion für Sektions-Check (Nur anzeigen, wenn im JSON ausgewählt)
  const isVisible = (page: string) => selectedPages.includes(page) || activePage === page;

  return (
    <div style={styles.root} className="min-h-screen transition-all duration-500">

      {/* --- DYNAMISCHER HEADER --- */}
      <header
        style={styles.header}
        className="fixed top-0 left-0 right-0 z-50 px-6 py-4 flex items-center justify-between border-b border-black/5 backdrop-blur-md bg-opacity-80"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-sm"
            style={{ backgroundColor: primaryColor }}
          >
            {businessName?.charAt(0)}
          </div>
          <span className={`font-black tracking-tight ${styles.headerFontClass}`}>
            {businessName}
          </span>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 outline-none">
          {menuOpen ? <X /> : <MenuIcon />}
        </button>
      </header>

      {/* --- MOBILE MENU OVERLAY --- */}
      {menuOpen && (
        <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm" onClick={() => setMenuOpen(false)}>
          <div
            style={styles.root}
            className="absolute right-0 top-0 bottom-0 w-4/5 p-12 pt-32 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="space-y-8">
              {["home", ...selectedPages].map((page) => (
                <div
                  key={page}
                  className="text-2xl font-black capitalize cursor-pointer flex justify-between items-center border-b border-current/10 pb-4"
                  onClick={() => { setActivePage(page); setMenuOpen(false); }}
                >
                  {page === "home" ? "Startseite" : page}
                  <ChevronRight className="opacity-30" />
                </div>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto px-6 pt-32 pb-20">

        {/* --- HERO / HOME --- */}
        {activePage === "home" && (
          <section className="py-12 text-center animate-in fade-in slide-in-from-bottom-4">
            <h1 className="text-5xl md:text-6xl font-black mb-6 leading-tight" style={styles.accentText}>
              {slogan}
            </h1>
            <p className="text-lg opacity-80 mb-10 leading-relaxed">
              {uniqueDescription || "Willkommen bei uns."}
            </p>
            {reservationsEnabled && (
              <Button
                style={styles.primaryButton}
                className="w-full py-8 rounded-2xl text-lg font-bold shadow-xl hover:scale-[1.02] transition-transform"
              >
                <Clock className="mr-2" /> Tisch reservieren
              </Button>
            )}
          </section>
        )}

        {/* --- MENU SEKTION --- */}
        {isVisible("menu") && (
          <section id="menu" className="mt-16">
            <div className="flex justify-between items-baseline mb-8">
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40">Speisekarte</h2>
              <button className="text-xs font-bold" style={styles.accentText}>Alle ansehen</button>
            </div>
            <div className="space-y-6">
              {menuItems.map((item: any, i: number) => (
                <div key={i} className="flex justify-between items-start border-b border-black/5 pb-6 last:border-0">
                  <div className="flex-1 pr-4">
                    <h3 className="font-bold text-xl mb-1">{item.name}</h3>
                    <p className="text-sm opacity-60 italic">{item.description}</p>
                  </div>
                  <span className="font-black text-xl" style={styles.priceText}>
                    {item.price}€
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* --- GALERIE SEKTION --- */}
        {isVisible("gallery") && (
          <section id="gallery" className="mt-20">
            <h2 className="text-[10px] uppercase tracking-[0.2em] font-black opacity-40 mb-8">Galerie</h2>
            <div className="grid grid-cols-2 gap-4">
              {gallery.map((img: any, i: number) => (
                <div key={i} className="aspect-square rounded-[2rem] overflow-hidden bg-black/5 border border-white/20">
                  <img src={img.url} alt={img.alt} className="w-full h-full object-cover" />
                </div>
              ))}
              {gallery.length === 0 && <div className="col-span-2 py-10 text-center opacity-30"><Camera className="mx-auto mb-2" />Keine Bilder</div>}
            </div>
          </section>
        )}

        {/* --- ÖFFNUNGSZEITEN --- */}
        {isVisible("contact") && (
          <section id="contact" className="mt-20 p-8 rounded-[2.5rem] bg-black/5 border border-black/5">
            <h3 className="text-xl font-black mb-6 flex items-center gap-2">
              <Clock className="opacity-40" /> Öffnungszeiten
            </h3>
            <div className="space-y-3">
              {Object.entries(openingHours).map(([day, sched]: any) => (
                <div key={day} className="flex justify-between text-sm py-2 border-b border-black/5 last:border-0">
                  <span className="capitalize font-bold opacity-60">{day}</span>
                  <span className="font-mono font-bold">
                    {sched.closed ? "Geschlossen" : `${sched.open} - ${sched.close}`}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

      </main>

      <footer className="py-12 text-center opacity-30 text-[10px] font-black uppercase tracking-[0.3em]">
        © {new Date().getFullYear()} {businessName}
      </footer>
    </div>
  );
}