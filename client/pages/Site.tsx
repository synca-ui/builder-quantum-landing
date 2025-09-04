import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { configurationApi, Configuration } from "@/lib/api";
import { Button } from "@/components/ui/button";
import GalleryGrid from "@/components/sections/GalleryGrid";
import MenuSection from "@/components/sections/MenuSection";

export default function Site() {
  const { subdomain } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuration | null>(null);

  // Resolve tenant slug from route or hostname
  const resolvedSlug = useMemo(() => {
    if (subdomain) return subdomain;
    try {
      const host = window.location.hostname;
      // expect something like tenant.synca.digital
      const parts = host.split(".");
      // If host has at least 3 parts and ends with synca.digital (or current base domain), use first part
      if (parts.length >= 3) {
        return parts[0];
      }
    } catch {}
    return "";
  }, [subdomain]);

  useEffect(() => {
    let mounted = true;
    async function load() {
      console.log('=== Site Load Debug ===');
      console.log('Hostname:', window.location.hostname);
      console.log('Full URL:', window.location.href);
      console.log('useParams subdomain:', subdomain);
      console.log('Resolved slug:', resolvedSlug);
      console.log('======================');

      if (!resolvedSlug) {
        console.warn('No resolved slug, skipping site load');
        setError('No site identifier found in URL');
        setLoading(false);
        return;
      }

      setLoading(true);
      console.log(`Calling API: /api/sites/${resolvedSlug}`);
      const res = await configurationApi.getPublishedSite(resolvedSlug);
      console.log('API Response:', res);

      if (!mounted) return;
      if (res.success && res.data) {
        console.log('Site loaded successfully:', res.data);
        setConfig(res.data);
        setError(null);
      } else {
        console.error('Site load failed:', res.error);
        setError(res.error || "Failed to load site");
      }
      setLoading(false);
    }
    load();
    return () => {
      mounted = false;
    };
  }, [resolvedSlug, subdomain]);

  const theme = useMemo(
    () =>
      ({
        "--primary": config?.primaryColor || "#111827",
        "--secondary": config?.secondaryColor || "#6B7280",
        fontFamily: config?.fontFamily || "Inter, system-ui, sans-serif",
      }) as React.CSSProperties,
    [config],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading...
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-center p-6">
        <h1 className="text-2xl font-bold mb-2">Site unavailable</h1>
        <p className="text-gray-600 mb-4">
          {error || "We could not find this published site."}
        </p>

        <div className="bg-gray-100 p-4 rounded-lg mb-6 text-sm text-left max-w-md">
          <h3 className="font-semibold mb-2">Debug Info:</h3>
          <p><strong>Hostname:</strong> {window.location.hostname}</p>
          <p><strong>Path:</strong> {window.location.pathname}</p>
          <p><strong>Resolved Slug:</strong> {resolvedSlug || 'None'}</p>
          <p><strong>URL Param:</strong> {subdomain || 'None'}</p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            Go home
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/configurator")}
            >
              Create New Site
            </Button>

            <Button
              variant="outline"
              onClick={() => (window.location.href = "/test-site")}
            >
              Debug Tools
            </Button>
          </div>

          <Button
            variant="ghost"
            onClick={() => window.location.reload()}
            className="text-sm"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  // Access all configuration fields properly
  const pages = config.selectedPages || ["home", "menu", "gallery", "contact"];
  const businessName = config.businessName || "Your Business";
  const slogan = config.slogan;
  const uniqueDescription = config.uniqueDescription;
  const location = config.location;
  const openingHours = config.openingHours || {};
  const reservationsEnabled = config.reservationsEnabled || false;
  const contactMethods = config.contactMethods || [];
  const socialMedia = config.socialMedia || {};
  const menuItems = config.menuItems || [];
  const gallery = config.gallery || [];

  return (
    <div style={theme} className="min-h-screen bg-white text-gray-900">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div
            className="font-black text-xl"
            style={{ color: "var(--primary)" }}
          >
            {businessName}
          </div>
          <nav className="text-sm text-gray-600 flex gap-4">
            {pages.includes("menu") && (
              <a href="#menu" className="hover:text-black">
                Menu
              </a>
            )}
            {pages.includes("gallery") && (
              <a href="#gallery" className="hover:text-black">
                Gallery
              </a>
            )}
            {pages.includes("about") && (
              <a href="#about" className="hover:text-black">
                About
              </a>
            )}
            {pages.includes("contact") && (
              <a href="#contact" className="hover:text-black">
                Contact
              </a>
            )}
          </nav>
        </div>
      </header>

      <main>
        {pages.includes("home") && (
          <section className="py-16 bg-gradient-to-br from-gray-50 to-white">
            <div className="max-w-6xl mx-auto px-4">
              <h1
                className="text-4xl md:text-5xl font-extrabold mb-4"
                style={{ color: "var(--primary)" }}
              >
                {businessName}
              </h1>
              {slogan && (
                <p className="text-lg text-gray-600 max-w-2xl mb-4">{slogan}</p>
              )}
              {uniqueDescription && (
                <p className="text-base text-gray-700 max-w-3xl leading-relaxed">
                  {uniqueDescription}
                </p>
              )}
              {reservationsEnabled && (
                <div className="mt-6">
                  <Button
                    onClick={() => alert("Reservation flow coming soon")}
                    style={{
                      backgroundColor: "var(--primary)",
                      color: "white",
                    }}
                  >
                    Reserve a table
                  </Button>
                </div>
              )}
            </div>
          </section>
        )}

        {pages.includes("about") && uniqueDescription && (
          <section id="about" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: "var(--primary)" }}
              >
                About Us
              </h2>
              <p className="text-gray-700 leading-relaxed max-w-3xl">
                {uniqueDescription}
              </p>
              {config.businessType && (
                <p className="text-gray-600 mt-3">
                  <strong>Business Type:</strong> {config.businessType}
                </p>
              )}
            </div>
          </section>
        )}

        {pages.includes("menu") && (
          <section id="menu" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--primary)" }}
              >
                Menu
              </h2>
              {Array.isArray(menuItems) && menuItems.length > 0 ? (
                <MenuSection items={menuItems} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Menu items loading...</p>
                </div>
              )}
            </div>
          </section>
        )}

        {pages.includes("gallery") && (
          <section id="gallery" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4">
              <h2
                className="text-2xl font-bold mb-6"
                style={{ color: "var(--primary)" }}
              >
                Gallery
              </h2>
              {Array.isArray(gallery) && gallery.length > 0 ? (
                <GalleryGrid images={gallery} />
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600">Photo gallery coming soon!</p>
                </div>
              )}
            </div>
          </section>
        )}

        {pages.includes("contact") && (
          <section id="contact" className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4 grid md:grid-cols-2 gap-8">
              <div>
                <h2
                  className="text-2xl font-bold mb-4"
                  style={{ color: "var(--primary)" }}
                >
                  Contact
                </h2>
                {location && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Location
                    </h3>
                    <p className="text-gray-700">{location}</p>
                  </div>
                )}
                {Array.isArray(contactMethods) && contactMethods.length > 0 && (
                  <div className="mb-4">
                    <h3 className="font-semibold text-gray-900 mb-1">
                      Contact Methods
                    </h3>
                    <ul className="text-gray-700 space-y-1">
                      {contactMethods.map((method, i) => (
                        <li key={i}>{method}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {socialMedia && Object.keys(socialMedia).length > 0 && (
                  <div className="mt-4">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Follow Us
                    </h3>
                    <div className="flex gap-3 text-sm">
                      {Object.entries(socialMedia).map(([platform, url]) => (
                        <a
                          key={platform}
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline capitalize"
                        >
                          {platform}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {openingHours && Object.keys(openingHours).length > 0 && (
                <div>
                  <h2
                    className="text-2xl font-bold mb-4"
                    style={{ color: "var(--primary)" }}
                  >
                    Opening Hours
                  </h2>
                  <ul className="text-gray-700 space-y-2">
                    {Object.entries(openingHours).map(
                      ([day, schedule]: [string, any]) => (
                        <li key={day} className="flex justify-between max-w-sm">
                          <span className="font-medium capitalize">{day}</span>
                          <span className="text-gray-600">
                            {typeof schedule === "string"
                              ? schedule
                              : schedule?.open && schedule?.close
                                ? `${schedule.open} – ${schedule.close}`
                                : schedule?.closed
                                  ? "Closed"
                                  : "Closed"}
                          </span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Additional features from configuration */}
        {config.onlineOrdering && (
          <section className="py-14 border-t">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: "var(--primary)" }}
              >
                Online Ordering
              </h2>
              <p className="text-gray-700 mb-6">
                Order your favorite items online for pickup or delivery.
              </p>
              <Button
                style={{ backgroundColor: "var(--primary)", color: "white" }}
              >
                Order Now
              </Button>
            </div>
          </section>
        )}

        {config.onlineStore && (
          <section className="py-14 border-t bg-gray-50">
            <div className="max-w-6xl mx-auto px-4 text-center">
              <h2
                className="text-2xl font-bold mb-4"
                style={{ color: "var(--primary)" }}
              >
                Online Store
              </h2>
              <p className="text-gray-700 mb-6">
                Browse and purchase our products online.
              </p>
              <Button
                style={{ backgroundColor: "var(--primary)", color: "white" }}
              >
                Visit Store
              </Button>
            </div>
          </section>
        )}
      </main>

      <footer className="py-10 border-t mt-10 text-center text-sm text-gray-500 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <p>
            © {new Date().getFullYear()} {businessName}
          </p>
          {config.businessType && (
            <p className="mt-1 text-xs text-gray-400">{config.businessType}</p>
          )}
        </div>
      </footer>
    </div>
  );
}
