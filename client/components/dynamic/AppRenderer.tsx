import React from "react";
import { Button } from "@/components/ui/button";

export type DynamicConfig = {
  businessName?: string;
  slogan?: string;
  uniqueDescription?: string;
  primaryColor?: string;
  fontFamily?: string;
  selectedPages?: string[];
  menuItems?: Array<{ id?: string; name: string; description?: string; price?: number }>;
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

  return (
    <div style={{ fontFamily: config.fontFamily || "Inter, system-ui, sans-serif" }} className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 bg-white/90 backdrop-blur border-b">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="font-bold text-lg" style={{ color: config.primaryColor || "#111827" }}>{businessName}</div>
          <nav className="flex gap-4 text-sm text-gray-600">
            {pages.includes("menu") && <a href="#menu" className="hover:text-black">Menu</a>}
            {pages.includes("gallery") && <a href="#gallery" className="hover:text-black">Gallery</a>}
            {pages.includes("contact") && <a href="#contact" className="hover:text-black">Contact</a>}
          </nav>
        </div>
      </header>

      <main>
        {pages.includes("home") && (
          <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-4xl mx-auto px-4 text-center">
              <h1 className="text-4xl font-extrabold mb-4" style={{ color: config.primaryColor || "#111827" }}>{businessName}</h1>
              {config.slogan && <p className="text-lg text-gray-600 mb-4">{config.slogan}</p>}
              {config.uniqueDescription && <p className="text-base text-gray-700 max-w-3xl mx-auto">{config.uniqueDescription}</p>}
              <div className="mt-6">
                <Button onClick={() => alert("Reserve - sample flow")}>Reserve a table</Button>
              </div>
            </div>
          </section>
        )}

        {pages.includes("menu") && (
          <section id="menu" className="py-14 border-t">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6" style={{ color: config.primaryColor || "#111827" }}>Menu</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {(config.menuItems && config.menuItems.length > 0) ? (
                  config.menuItems.map((item: any) => (
                    <div key={item.id || item.name} className="p-4 border rounded">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          {item.description && <div className="text-sm text-gray-600">{item.description}</div>}
                        </div>
                        {typeof item.price !== 'undefined' && <div className="font-medium text-gray-800">${Number(item.price).toFixed(2)}</div>}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-600 py-8">No menu items yet.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {pages.includes("gallery") && (
          <section id="gallery" className="py-14 border-t">
            <div className="max-w-4xl mx-auto px-4">
              <h2 className="text-2xl font-bold mb-6" style={{ color: config.primaryColor || "#111827" }}>Gallery</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {(config.gallery && config.gallery.length > 0) ? (
                  config.gallery.map((img: any) => (
                    <img key={img.id || img.url} src={img.url} alt={img.alt || ""} className="w-full h-36 object-cover rounded" />
                  ))
                ) : (
                  <div className="text-gray-600">No images yet.</div>
                )}
              </div>
            </div>
          </section>
        )}

        {pages.includes("contact") && (
          <section id="contact" className="py-14 border-t">
            <div className="max-w-4xl mx-auto px-4 grid md:grid-cols-2 gap-8">
              <div>
                <h2 className="text-2xl font-bold mb-4" style={{ color: config.primaryColor || "#111827" }}>Contact</h2>
                {config.contactMethods && config.contactMethods.length > 0 ? (
                  <ul className="text-gray-700 space-y-2">
                    {config.contactMethods.map((c: string, i: number) => <li key={i}>{c}</li>)}
                  </ul>
                ) : (
                  <p className="text-gray-600">No contact info provided.</p>
                )}
              </div>

              <div>
                <h3 className="font-semibold mb-2">Opening Hours</h3>
                {config.openingHours && Object.keys(config.openingHours).length > 0 ? (
                  <ul className="text-gray-700">
                    {Object.entries(config.openingHours).map(([day, sched]: any) => (
                      <li key={day} className="flex justify-between"><span className="capitalize">{day}</span><span className="text-gray-600">{typeof sched === 'string' ? sched : (sched.open ? `${sched.open} - ${sched.close}` : 'Closed')}</span></li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-600">Opening hours not set.</p>
                )}
              </div>
            </div>
          </section>
        )}

      </main>

      <footer className="py-8 border-t mt-10 text-center text-sm text-gray-500 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <p>© {new Date().getFullYear()} {businessName}</p>
        </div>
      </footer>
    </div>
  );
}
