import React, { useEffect, useState, memo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight,
  Play,
  Star,
  Check,
  ArrowRight,
  Zap,
  Palette,
  Smartphone,
  Globe,
  Sparkles,
  Rocket,
  Crown,
  Menu,
  X,
  Settings,
  Home,
  Layers,
  LayoutDashboard,
  Link as LinkIcon,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { sessionApi } from "@/lib/api";
import { useAuth as useClerkAuth, SignInButton, SignUpButton } from "@clerk/clerk-react";

export default function Index() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const { isSignedIn } = useClerkAuth();

  // Magic Input state
  const [magicLink, setMagicLink] = useState("");
  const [isLoadingMagic, setIsLoadingMagic] = useState(false);
  const navigate = useNavigate();

  const isMagicLinkValid = (link: string) => /^https?:\/\//i.test(link.trim());

  const handleMagicSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMagicLinkValid(magicLink)) {
      return;
    }
    setIsLoadingMagic(true);
    try {
      const res = await fetch(`/api/forward-to-n8n`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          link: magicLink,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!res.ok) throw new Error("Network response was not ok");
      const encoded = encodeURIComponent(magicLink);
      navigate(`/mode-selection?sourceLink=${encoded}`);
    } catch (err) {
      console.error(err);
      setIsLoadingMagic(false);
    }
  };

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-teal-500" />,
      title: "Quick Setup",
      description:
        "Get your café or restaurant online in minutes. No technical skills needed - just add your info and go live.",
      gradient: "from-teal-400 to-cyan-500",
    },
    {
      icon: <Palette className="w-8 h-8 text-purple-500" />,
      title: "Local Business Templates",
      description:
        "Beautiful designs crafted specifically for restaurants, cafés, bakeries, and local shops.",
      gradient: "from-purple-400 to-pink-500",
    },
    {
      icon: <Smartphone className="w-8 h-8 text-orange-500" />,
      title: "Mobile-First Design",
      description:
        "Your customers will love browsing your menu and location info on their phones.",
      gradient: "from-orange-400 to-red-500",
    },
    {
      icon: <Globe className="w-8 h-8 text-teal-500" />,
      title: "Local SEO Ready",
      description:
        "Get found by local customers with built-in SEO optimization for your neighborhood.",
      gradient: "from-blue-400 to-indigo-500",
    },
  ];

  const pricingPlans = [
    {
      name: "Starter",
      price: "$12",
      period: "/month",
      description: "Perfect for cafés & small shops",
      features: [
        "Beautiful App",
        "Menu/Product Display",
        "Contact & Location Info",
        "Mobile Optimized",
        "Basic Analytics",
      ],
      cta: "Start Your App",
      popular: false,
      gradient: "from-orange-400 to-red-500",
    },
    {
      name: "Business",
      price: "$24",
      period: "/month",
      description: "Ideal for restaurants & stores",
      features: [
        "Online Ordering System",
        "Customer Reviews",
        "Social Media Integration",
        "Advanced Analytics",
        "Email Marketing",
        "Priority Support",
      ],
      cta: "Create Your App",
      popular: true,
      gradient: "from-teal-400 to-purple-600",
    },
    {
      name: "Premium",
      price: "$49",
      period: "/month",
      description: "For multi-location businesses",
      features: [
        "Multiple Locations",
        "Advanced E-commerce",
        "Custom Integrations",
        "White-label Options",
        "Dedicated Manager",
        "Custom Domain",
      ],
      cta: "Scale Your App",
      popular: false,
      gradient: "from-purple-400 to-indigo-600",
    },
  ];

  const demoTemplates = [
    {
      name: "Coffee Shop",
      preview: "bg-gradient-to-br from-orange-50 to-amber-100",
      color: "from-orange-500 to-amber-600",
    },
    {
      name: "Restaurant",
      preview: "bg-gradient-to-br from-red-50 to-rose-100",
      color: "from-red-500 to-rose-600",
    },
    {
      name: "Local Store",
      preview: "bg-gradient-to-br from-teal-50 to-emerald-100",
      color: "from-teal-500 to-emerald-600",
    },
  ];

  const Particles = memo(() => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-teal-400 rounded-full opacity-30"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </div>
  ));

  const Navigation = () => {
    const [scrolled, setScrolled] = useState(false);
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    useEffect(() => {
      let ticking = false;
      const handleScroll = () => {
        if (!ticking) {
          requestAnimationFrame(() => {
            setScrolled(window.scrollY > 50);
            ticking = false;
          });
          ticking = true;
        }
      };
      window.addEventListener("scroll", handleScroll, { passive: true });
      return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const navItems = [
      {
        id: "features",
        label: "Features",
        icon: <Layers className="w-4 h-4" />,
        href: "#features",
      },
      {
        id: "demo",
        label: "Demo",
        icon: <Play className="w-4 h-4" />,
        href: "#demo",
      },
      {
        id: "pricing",
        label: "Pricing",
        icon: <Crown className="w-4 h-4" />,
        href: "#pricing",
      },
      {
        id: "dashboard",
        label: "Dashboard",
        icon: <LayoutDashboard className="w-4 h-4" />,
        href: "/dashboard",
      },
    ];

    return (
      <nav
        className={`fixed top-0 w-full z-50 transition-all duration-700 ease-out ${scrolled ? "glass border-b border-white/30 backdrop-blur-xl shadow-xl py-2" : "bg-transparent border-b border-transparent py-4"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <div className="relative group">
                <h1 className="text-2xl font-black text-gradient cursor-pointer transition-all duration-500 group-hover:scale-110">
                  Maitr
                </h1>
                <div className="absolute -inset-2 bg-gradient-to-r from-teal-400/20 to-purple-400/20 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-500 blur-lg"></div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-bounce group-hover:animate-pulse"></div>
              </div>
            </div>

            <div className="hidden md:block">
              <div className="flex items-center space-x-1 bg-white/5 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
                {navItems
                  .filter((n) => (user ? true : n.id !== "dashboard"))
                  .map((item) => (
                    <a
                      key={item.id}
                      href={item.href}
                      className="relative px-4 py-2 text-sm font-bold transition-all duration-500 ease-out rounded-full group"
                      onMouseEnter={() => setHoveredItem(item.id)}
                      onMouseLeave={() => setHoveredItem(null)}
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-r from-teal-500/20 to-purple-500/20 rounded-full transition-all duration-500 ${hoveredItem === item.id ? "opacity-100 scale-100" : "opacity-0 scale-95"}`}
                      ></div>
                      <div
                        className={`relative flex items-center space-x-2 transition-all duration-500 ${hoveredItem === item.id ? "text-teal-600 transform translate-y-[-1px]" : "text-gray-700"}`}
                      >
                        <div
                          className={`transition-all duration-500 ${hoveredItem === item.id ? "rotate-12 scale-110" : "rotate-0 scale-100"}`}
                        >
                          {item.icon}
                        </div>
                        <span>{item.label}</span>
                      </div>
                      <div
                        className={`absolute bottom-0 left-1/2 h-0.5 bg-gradient-to-r from-teal-500 to-purple-500 transition-all duration-500 ${hoveredItem === item.id ? "w-8 -translate-x-1/2" : "w-0 -translate-x-1/2"}`}
                      ></div>
                    </a>
                  ))}
              </div>
            </div>

            <div className="hidden md:flex items-center space-x-3">
              {isSignedIn ? (
                <>
                  <a href="/profile">
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-2 border-gray-300/60"
                    >
                      Profile
                    </Button>
                  </a>
                  <a href="/dashboard">
                    <Button
                      variant="outline"
                      size="sm"
                      className="group relative overflow-hidden border-2 border-teal-500/30 text-teal-600 hover:text-white hover:bg-teal-500 px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105"
                    >
                      <div className="relative flex items-center space-x-2">
                        <LayoutDashboard className="w-4 h-4" />
                        <span>Dashboard</span>
                      </div>
                    </Button>
                  </a>
                </>
              ) : (
                <>
                  <SignInButton mode="modal">
                    <Button variant="outline" size="sm">
                      Log in
                    </Button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                    >
                      Sign up
                    </Button>
                  </SignUpButton>
                </>
              )}
              <a href="/mode-selection">
                <Button
                  size="sm"
                  className="group relative overflow-hidden bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white px-8 py-3 text-sm font-bold rounded-full transition-all duration-500 hover:scale-110 shadow-lg hover:shadow-teal-500/25"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <div className="relative flex items-center space-x-2">
                    <div className="transition-all duration-300 group-hover:rotate-45">
                      <Settings className="w-4 h-4" />
                    </div>
                    <span>Start Building</span>
                    <div className="w-2 h-2 bg-white/40 rounded-full animate-pulse group-hover:animate-bounce"></div>
                  </div>
                </Button>
              </a>
            </div>

            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="relative p-2 text-gray-700 transition-all duration-300"
              >
                <div
                  className={`transition-all duration-300 ${isMenuOpen ? "rotate-90 scale-110" : "rotate-0 scale-100"}`}
                >
                  {isMenuOpen ? (
                    <X className="w-6 h-6" />
                  ) : (
                    <Menu className="w-6 h-6" />
                  )}
                </div>
              </Button>
            </div>
          </div>
        </div>

        <div
          className={`md:hidden transition-all duration-500 ease-out overflow-hidden ${isMenuOpen ? "max-h-64 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div className="glass border-t border-white/20 backdrop-blur-xl mx-4 mt-2 rounded-2xl">
            <div className="px-4 py-4 space-y-2">
              {navItems.map((item, index) => (
                <a
                  key={item.id}
                  href={item.href}
                  className="group flex items-center space-x-3 px-4 py-3 rounded-xl text-gray-700 hover:text-teal-600 hover:bg-teal-50/50 font-bold transition-all duration-300"
                  style={{ animationDelay: `${index * 100}ms` }}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <div className="transition-all duration-300 group-hover:scale-110 group-hover:rotate-12">
                    {item.icon}
                  </div>
                  <span>{item.label}</span>
                  <div className="ml-auto w-0 group-hover:w-2 h-2 bg-gradient-to-r from-teal-500 to-purple-500 rounded-full transition-all duration-300"></div>
                </a>
              ))}

              <div className="pt-2 border-t border-gray-200/50 space-y-2">
                {!user && (
                  <>
                    <SignInButton mode="modal">
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Log in
                      </Button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <Button
                        size="sm"
                        className="w-full bg-gradient-to-r from-teal-500 to-purple-500 text-white"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign up
                      </Button>
                    </SignUpButton>
                  </>
                )}
                {isSignedIn && (
                  <a href="/profile" onClick={() => setIsMenuOpen(false)}>
                    <Button size="sm" variant="outline" className="w-full">
                      Profile
                    </Button>
                  </a>
                )}
                <a href="/mode-selection" onClick={() => setIsMenuOpen(false)}>
                  <Button
                    size="sm"
                    className="w-full bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white font-bold rounded-xl py-3 transition-all duration-300 hover:scale-105"
                  >
                    <div className="flex items-center justify-center space-x-2">
                      <Settings className="w-4 h-4" />
                      <span>Start Building</span>
                      <Sparkles className="w-4 h-4" />
                    </div>
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation />

      <div
        className="fixed w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full pointer-events-none mix-blend-difference opacity-40 z-50"
        style={{
          left: mousePosition.x - 6,
          top: mousePosition.y - 6,
          transform: `translate3d(0, 0, 0) scale(0.8)`,
          willChange: "transform",
        }}
      />

      <section className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-teal-50 min-h-screen flex items-center">
        <Particles />
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-10 w-32 h-32 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full opacity-5"></div>
          <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-gradient-to-br from-purple-400 to-purple-500 rounded-full opacity-5"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 z-10">
          <div className="text-center">
            <div
              className={`transition-all duration-1500 ease-out ${isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-16"}`}
            >
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Sparkles className="w-8 h-8 text-teal-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                </div>
              </div>
              <h1 className="text-6xl md:text-8xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
                <span className="font-display text-gradient">
                  Your Restaurant App.
                </span>
                <br />
                <span className="bg-gradient-to-r from-teal-600 via-purple-600 to-orange-600 bg-clip-text text-transparent">
                  Ready in 30 Seconds
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
                Paste your link. Maitr designs your app, menu, and bookings
                instantly. You just{" "}
                <span className="text-gradient font-bold">
                  add the cherry on top
                </span>{" "}
                🍒
              </p>

              <div className="w-full max-w-3xl mx-auto mt-6">
                <div className="flex flex-col md:flex-row items-center gap-4">
                  <form
                    onSubmit={handleMagicSubmit}
                    className="flex items-center rounded-full bg-white/90 backdrop-blur shadow-2xl border border-white/20 p-1.5 flex-1"
                  >
                    <div className="flex items-center gap-3 px-4 flex-1">
                      <LinkIcon className="w-5 h-5 text-gray-500" />
                      <input
                        value={magicLink}
                        onChange={(e) => setMagicLink(e.target.value)}
                        placeholder="Paste Google Maps or Website Link..."
                        className="bg-transparent outline-none w-full text-gray-800 placeholder-gray-400 px-2 py-3"
                        disabled={isLoadingMagic}
                        aria-label="Paste link"
                      />
                    </div>
                    <div className="px-2">
                      <button
                        type="submit"
                        aria-busy={isLoadingMagic}
                        className={`inline-flex items-center rounded-full text-white px-6 py-3 font-bold shadow-lg ${isLoadingMagic ? "opacity-80 cursor-wait" : ""} bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500`}
                        disabled={
                          isLoadingMagic || !isMagicLinkValid(magicLink)
                        }
                      >
                        {isLoadingMagic ? (
                          <>
                            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                            Building...
                          </>
                        ) : (
                          <>
                            <Rocket className="mr-3 w-5 h-5" />
                            Get Started Now
                            <ChevronRight className="ml-3 w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  <div className="flex-shrink-0">
                    <a href="#demo" className="inline-flex">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-gray-600 px-4 py-2"
                      >
                        <Play className="mr-2 w-4 h-4" /> Watch Demo
                      </Button>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <h2 className="text-4xl font-black">Example Dashboard</h2>
            <p className="text-gray-600 mt-2">
              A quick preview of what you get after logging in.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="rounded-2xl border p-6 bg-gradient-to-br from-teal-50 to-white">
              <div className="text-sm font-semibold text-teal-700">Traffic</div>
              <div className="mt-2 text-3xl font-bold">1,284</div>
              <div className="text-xs text-gray-500 mt-1">
                visits last 7 days
              </div>
            </div>
            <div className="rounded-2xl border p-6 bg-gradient-to-br from-purple-50 to-white">
              <div className="text-sm font-semibold text-purple-700">
                Orders
              </div>
              <div className="mt-2 text-3xl font-bold">76</div>
              <div className="text-xs text-gray-500 mt-1">this week</div>
            </div>
            <div className="rounded-2xl border p-6 bg-gradient-to-br from-orange-50 to-white">
              <div className="text-sm font-semibold text-orange-700">
                Ratings
              </div>
              <div className="mt-2 text-3xl font-bold">4.8</div>
              <div className="text-xs text-gray-500 mt-1">average</div>
            </div>
          </div>
          <div className="text-center mt-8">
            {user ? (
              <a href="/dashboard">
                <Button className="bg-gradient-to-r from-teal-500 to-purple-500 text-white">
                  Go to Dashboard
                </Button>
              </a>
            ) : (
              <SignInButton mode="modal">
                <Button className="bg-gradient-to-r from-teal-500 to-purple-500 text-white">
                  Log in to access Dashboard
                </Button>
              </SignInButton>
            )}
          </div>
        </div>
      </section>


      <section
        id="features"
        className="py-32 bg-gradient-to-br from-white to-gray-50 relative overflow-hidden"
      >
        <div
          className={
            'absolute inset-0 bg-[url(\'data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23f1f5f9" fill-opacity="0.3"%3E%3Ccircle cx="7" cy="7" r="1"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\')] opacity-50'
          }
        ></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-100 to-purple-100 px-6 py-3 rounded-full mb-6">
              <Crown className="w-5 h-5 text-teal-600" />
              <span className="text-teal-700 font-bold">How It Works</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black text-gray-900 mb-6 font-display">
              <span className="text-gradient">Three Simple Steps</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto font-medium">
              From empty storefront to online success. Our platform helps local
              businesses create their digital presence effortlessly.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card
                key={index}
                className="group hover:shadow-2xl transition-all duration-700 ease-out transform hover:-translate-y-6 hover:rotate-2 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden relative"
              >
                <div
                  className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(to bottom right, ${feature.gradient.split(" ")[1]}, ${feature.gradient.split(" ")[3]})`,
                  }}
                ></div>
                <CardContent className="p-8 text-center relative z-10">
                  <div className="mb-6 flex justify-center">
                    <div
                      className={`p-6 rounded-3xl bg-gradient-to-br ${feature.gradient} group-hover:scale-105 transition-transform duration-300 ease-out shadow-lg`}
                    >
                      {feature.icon}
                    </div>
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-gradient-to-t from-gray-50 to-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h4 className="text-lg font-bold">Creative Studio</h4>
              <p className="mt-2 text-gray-600">
                Fine-tune styles, colors and content. Your app, your brand —
                with delightful defaults.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold">Backstage</h4>
              <p className="mt-2 text-gray-600">
                Manage menus, opening hours, and orders from a simple dashboard
                — built for hospitality.
              </p>
            </div>
            <div>
              <h4 className="text-lg font-bold">Concierge</h4>
              <p className="mt-2 text-gray-600">
                Need help? Our team can finish the setup for you, or provide
                custom integrations.
              </p>
            </div>
          </div>

          <div className="mt-10 flex flex-col md:flex-row items-center justify-between">
            <div className="text-sm text-gray-600">
              © {new Date().getFullYear()} Maitr — The digital host for
              hospitality.
            </div>
            <div className="mt-4 md:mt-0 flex items-center space-x-4">
              <a
                href="/pricing"
                className="text-sm font-medium text-gray-700 hover:text-teal-600"
              >
                Pricing
              </a>
              <a
                href="/docs"
                className="text-sm font-medium text-gray-700 hover:text-teal-600"
              >
                Docs
              </a>
              <a
                href="/contact"
                className="text-sm font-medium text-gray-700 hover:text-teal-600"
              >
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
