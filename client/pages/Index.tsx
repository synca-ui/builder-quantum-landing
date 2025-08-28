import { useState, useEffect } from "react";
import { ChevronRight, Play, Star, Check, ArrowRight, Zap, Palette, Smartphone, Globe, Sparkles, Rocket, Crown, Menu, X, Settings, Home, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Index() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    setIsVisible(true);

    let animationFrame: number;
    const handleMouseMove = (e: MouseEvent) => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
      animationFrame = requestAnimationFrame(() => {
        setMousePosition({ x: e.clientX, y: e.clientY });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, []);

  const features = [
    {
      icon: <Zap className="w-8 h-8 text-teal-500" />,
      title: "Quick Setup",
      description: "Get your café or restaurant online in minutes. No technical skills needed - just add your info and go live.",
      gradient: "from-teal-400 to-cyan-500"
    },
    {
      icon: <Palette className="w-8 h-8 text-purple-500" />,
      title: "Local Business Templates",
      description: "Beautiful designs crafted specifically for restaurants, cafés, bakeries, and local shops.",
      gradient: "from-purple-400 to-pink-500"
    },
    {
      icon: <Smartphone className="w-8 h-8 text-orange-500" />,
      title: "Mobile-First Design",
      description: "Your customers will love browsing your menu and location info on their phones.",
      gradient: "from-orange-400 to-red-500"
    },
    {
      icon: <Globe className="w-8 h-8 text-teal-500" />,
      title: "Local SEO Ready",
      description: "Get found by local customers with built-in SEO optimization for your neighborhood.",
      gradient: "from-blue-400 to-indigo-500"
    }
  ];


  const pricingPlans = [
    {
      name: "Starter",
      price: "$12",
      period: "/month",
      description: "Perfect for cafés & small shops",
      features: [
        "Beautiful Website",
        "Menu/Product Display",
        "Contact & Location Info",
        "Mobile Optimized",
        "Basic Analytics"
      ],
      cta: "Start Your Site",
      popular: false,
      gradient: "from-orange-400 to-red-500"
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
        "Priority Support"
      ],
      cta: "Grow Your Business",
      popular: true,
      gradient: "from-teal-400 to-purple-600"
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
        "Custom Domain"
      ],
      cta: "Scale Your Brand",
      popular: false,
      gradient: "from-purple-400 to-indigo-600"
    }
  ];

  const configuratorSteps = [
    {
      title: "Choose Your Business Type",
      description: "Select what best describes your business",
      options: [
        { name: "Coffee Shop", icon: "☕", gradient: "from-orange-400 to-amber-500" },
        { name: "Restaurant", icon: "🍽️", gradient: "from-red-400 to-rose-500" },
        { name: "Retail Store", icon: "🛍️", gradient: "from-teal-400 to-emerald-500" },
        { name: "Bakery", icon: "🥖", gradient: "from-purple-400 to-pink-500" }
      ]
    },
    {
      title: "Pick Your Style",
      description: "Choose a design that matches your vibe",
      options: [
        { name: "Modern & Clean", icon: "✨", gradient: "from-blue-400 to-indigo-500" },
        { name: "Warm & Cozy", icon: "🔥", gradient: "from-orange-400 to-red-500" },
        { name: "Elegant & Sophisticated", icon: "💎", gradient: "from-purple-400 to-indigo-500" },
        { name: "Fun & Playful", icon: "🎨", gradient: "from-pink-400 to-purple-500" }
      ]
    },
    {
      title: "Add Your Details",
      description: "Tell us about your business",
      isForm: true
    }
  ];

  const demoTemplates = [
    {
      name: "Coffee Shop",
      preview: "bg-gradient-to-br from-orange-50 to-amber-100",
      color: "from-orange-500 to-amber-600"
    },
    {
      name: "Restaurant",
      preview: "bg-gradient-to-br from-red-50 to-rose-100",
      color: "from-red-500 to-rose-600"
    },
    {
      name: "Local Store",
      preview: "bg-gradient-to-br from-teal-50 to-emerald-100",
      color: "from-teal-500 to-emerald-600"
    }
  ];

  // Particle component
  const Particles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-pulse opacity-20"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}
    </div>
  );

  // Navigation component
  const Navigation = () => (
    <nav className="fixed top-0 w-full z-50 glass border-b border-white/20 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <h1 className="text-2xl font-black text-gradient">sync.a</h1>
          </div>

          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              <a href="#configurator" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-bold transition-all duration-300 hover:bg-teal-50">
                <Settings className="w-4 h-4 inline mr-2" />
                Configurator
              </a>
              <a href="#features" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-bold transition-all duration-300 hover:bg-teal-50">
                <Layers className="w-4 h-4 inline mr-2" />
                Features
              </a>
              <a href="#demo" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-bold transition-all duration-300 hover:bg-teal-50">
                <Play className="w-4 h-4 inline mr-2" />
                Demo
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-teal-600 px-3 py-2 rounded-md text-sm font-bold transition-all duration-300 hover:bg-teal-50">
                <Crown className="w-4 h-4 inline mr-2" />
                Pricing
              </a>
            </div>
          </div>

          <div className="hidden md:block">
            <Button
              size="sm"
              className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 shadow-lg"
            >
              Get Started
            </Button>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-700"
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="md:hidden glass border-t border-white/20">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            <a href="#configurator" className="text-gray-700 hover:text-teal-600 block px-3 py-2 rounded-md text-base font-bold">Configurator</a>
            <a href="#features" className="text-gray-700 hover:text-teal-600 block px-3 py-2 rounded-md text-base font-bold">Features</a>
            <a href="#demo" className="text-gray-700 hover:text-teal-600 block px-3 py-2 rounded-md text-base font-bold">Demo</a>
            <a href="#pricing" className="text-gray-700 hover:text-teal-600 block px-3 py-2 rounded-md text-base font-bold">Pricing</a>
            <div className="px-3 py-2">
              <Button
                size="sm"
                className="w-full bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white font-bold rounded-full"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );

  return (
    <div className="min-h-screen bg-white overflow-hidden">
      <Navigation />

      {/* Configurator Section */}
      <section id="configurator" className="relative min-h-screen flex items-center bg-gradient-to-br from-teal-50 via-white to-purple-50 pt-16">
        <Particles />

        {/* Interactive cursor follower */}
        <div
          className="fixed w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full pointer-events-none mix-blend-difference opacity-40 z-50"
          style={{
            left: mousePosition.x - 6,
            top: mousePosition.y - 6,
            transform: `translate3d(0, 0, 0) scale(0.8)`,
            transition: 'transform 0.1s ease-out'
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 z-10">
          <div className="text-center mb-16">
            <div className={`transition-all duration-1500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Settings className="w-12 h-12 text-teal-500" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                </div>
              </div>

              <h1 className="text-5xl md:text-7xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
                <span className="font-display text-gradient animate-gradient">Create Your</span>
                <br />
                <span className="bg-gradient-to-r from-teal-600 via-purple-600 to-orange-600 bg-clip-text text-transparent animate-gradient">
                  Digital Presence
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-4xl mx-auto leading-relaxed font-medium">
                Answer a few simple questions and we'll build your perfect website in minutes
              </p>
            </div>
          </div>

          {/* Configurator Steps */}
          <div className="max-w-4xl mx-auto">
            {configuratorSteps.map((step, stepIndex) => (
              <div key={stepIndex} className={`mb-12 transition-all duration-700 ease-out ${currentStep === stepIndex ? 'opacity-100 scale-100' : currentStep > stepIndex ? 'opacity-50 scale-95' : 'opacity-30 scale-90'}`}>
                {currentStep >= stepIndex && (
                  <Card className="glass border-0 shadow-2xl overflow-hidden">
                    <CardContent className="p-8">
                      <div className="text-center mb-8">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-gray-600 font-medium">{step.description}</p>
                      </div>

                      {step.isForm ? (
                        <div className="space-y-6">
                          <div className="grid md:grid-cols-2 gap-6">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Business Name</label>
                              <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300" placeholder="Your amazing business name" />
                            </div>
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
                              <input type="text" className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300" placeholder="City, State" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Tell us about your business</label>
                            <textarea className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all duration-300 h-24" placeholder="What makes your business special?"></textarea>
                          </div>
                          <div className="text-center">
                            <Button
                              size="lg"
                              className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white px-12 py-4 text-lg font-bold rounded-full transition-all duration-500 ease-out hover:scale-110 shadow-2xl"
                            >
                              <Rocket className="mr-3 w-6 h-6" />
                              Create My Website
                              <Sparkles className="ml-3 w-6 h-6" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {step.options?.map((option, optionIndex) => (
                            <Card
                              key={optionIndex}
                              className="group hover:shadow-xl transition-all duration-500 ease-out transform hover:-translate-y-2 cursor-pointer border-2 border-transparent hover:border-teal-400"
                              onClick={() => setCurrentStep(Math.min(currentStep + 1, configuratorSteps.length - 1))}
                            >
                              <CardContent className="p-6 text-center">
                                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${option.gradient} flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300`}>
                                  <span className="text-2xl">{option.icon}</span>
                                </div>
                                <h4 className="font-bold text-gray-900 group-hover:text-gradient transition-all duration-300">{option.name}</h4>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-gray-50 via-white to-teal-50">
        <Particles />
        
        {/* Floating geometric shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-10 w-32 h-32 bg-gradient-to-br from-teal-400 to-teal-500 rounded-full opacity-10 animate-float blur-xl"></div>
          <div className="absolute bottom-1/4 right-10 w-40 h-40 bg-gradient-to-br from-purple-400 to-purple-500 opacity-10 animate-float-reverse blur-xl animate-morphing"></div>
          <div className="absolute top-1/3 right-1/4 w-24 h-24 bg-gradient-to-br from-orange-400 to-orange-500 rounded-full opacity-10 animate-float blur-lg" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-1/3 left-1/4 w-28 h-28 bg-gradient-to-br from-pink-400 to-pink-500 opacity-10 animate-float-reverse blur-lg" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 z-10">
          <div className="text-center">
            <div className={`transition-all duration-1500 ease-out ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'}`}>
              
              {/* Sparkle decoration */}
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <Sparkles className="w-8 h-8 text-teal-500" />
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse"></div>
                </div>
              </div>

              <h1 className="text-6xl md:text-8xl font-black text-gray-900 mb-6 leading-tight tracking-tight">
                <span className="font-display text-gradient animate-gradient">Build a Stunning</span>
                <br />
                <span className="bg-gradient-to-r from-teal-600 via-purple-600 to-orange-600 bg-clip-text text-transparent animate-gradient">
                  Website in Minutes
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-4xl mx-auto leading-relaxed font-medium">
                Create your <span className="text-gradient font-bold">digital presence</span> in minutes. Perfect for cafés, restaurants,
                and local businesses ready to <span className="text-gradient font-bold">thrive online</span>.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
                <Button 
                  size="lg" 
                  className="group relative bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-12 py-6 text-xl font-bold rounded-full transform transition-all duration-500 ease-out hover:scale-110 shadow-2xl hover:shadow-purple-500/25 animate-glow overflow-hidden"
                >
                  <span className="relative z-10 flex items-center">
                    <Rocket className="mr-3 w-6 h-6 group-hover:animate-pulse" />
                    Get Started Now
                    <ChevronRight className="ml-3 w-6 h-6 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Button>
                
                <Button 
                  variant="outline" 
                  size="lg"
                  className="group glass border-2 border-gray-300/50 hover:border-purple-400/50 px-10 py-6 text-xl font-bold rounded-full transition-all duration-500 ease-out hover:scale-105 backdrop-blur-sm"
                >
                  <Play className="mr-3 w-6 h-6 group-hover:scale-110 transition-transform" />
                  Watch Demo
                </Button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="features" className="py-32 bg-gradient-to-br from-white to-gray-50 relative overflow-hidden">
        <div className={"absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23f1f5f9\" fill-opacity=\"0.3\"%3E%3Ccircle cx=\"7\" cy=\"7\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-50"}></div>
        
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
              From empty storefront to online success. Our platform helps local businesses create their digital presence effortlessly.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index}
                className="group hover:shadow-2xl transition-all duration-700 ease-out transform hover:-translate-y-6 hover:rotate-2 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-10 transition-opacity duration-500" style={{ background: `linear-gradient(to bottom right, ${feature.gradient.split(' ')[1]}, ${feature.gradient.split(' ')[3]})` }}></div>
                
                <CardContent className="p-8 text-center relative z-10">
                  <div className="mb-6 flex justify-center">
                    <div className={`p-6 rounded-3xl bg-gradient-to-br ${feature.gradient} group-hover:scale-125 transition-all duration-700 ease-out shadow-lg group-hover:shadow-xl animate-float`} style={{ animationDelay: `${index * 0.5}s` }}>
                      <div className="text-white">
                        {feature.icon}
                      </div>
                    </div>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-gradient transition-all duration-500 ease-out">{feature.title}</h3>
                  <p className="text-gray-600 leading-relaxed font-medium">{feature.description}</p>
                  
                  {/* Step number */}
                  <div className="absolute -top-4 -right-4 w-12 h-12 bg-gradient-to-br from-teal-400 to-purple-400 rounded-full flex items-center justify-center text-white font-black text-lg group-hover:scale-110 transition-transform duration-300">
                    {index + 1}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="text-center mt-16">
            <Button 
              variant="outline"
              size="lg"
              className="group border-2 border-teal-500 text-teal-600 hover:bg-gradient-to-r hover:from-teal-500 hover:to-purple-500 hover:text-white px-10 py-4 text-xl font-bold rounded-full transition-all duration-700 ease-out hover:scale-105 hover:shadow-xl"
            >
              <Sparkles className="mr-3 w-6 h-6 group-hover:animate-spin" />
              See All Features
              <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-32 bg-gradient-to-br from-gray-900 to-purple-900 relative overflow-hidden">
        <div className={"absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"7\" cy=\"7\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 font-display">
              Try It <span className="text-gradient">Live</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto font-medium">
              Experience the magic of our website builder with this interactive demo
            </p>
          </div>

          <div className="glass rounded-3xl shadow-2xl p-10 max-w-6xl mx-auto border border-white/20">
            <div className="flex flex-wrap gap-4 justify-center mb-10">
              {demoTemplates.map((template, index) => (
                <Button
                  key={index}
                  variant={activeDemo === index ? "default" : "outline"}
                  onClick={() => setActiveDemo(index)}
                  className={`px-8 py-4 rounded-full transition-all duration-500 font-bold text-lg ${
                    activeDemo === index 
                      ? `bg-gradient-to-r ${template.color} text-white shadow-xl transform scale-110 animate-glow` 
                      : 'glass border-white/30 text-white hover:scale-105 hover:bg-white/10'
                  }`}
                >
                  {template.name}
                </Button>
              ))}
            </div>
            
            <div className="relative group">
              <div className={`aspect-video rounded-2xl ${demoTemplates[activeDemo].preview} transition-all duration-1000 ease-out flex items-center justify-center relative overflow-hidden transform group-hover:scale-105`}>
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/20"></div>
                <div className="text-center relative z-10">
                  <div className={`w-24 h-24 rounded-full bg-gradient-to-r ${demoTemplates[activeDemo].color} mx-auto mb-6 flex items-center justify-center shadow-2xl animate-pulse group-hover:animate-bounce`}>
                    <Play className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800 mb-3">{demoTemplates[activeDemo].name}</h3>
                  <p className="text-gray-600 font-medium">Click to customize this template</p>
                </div>
                
                {/* Animated elements */}
                <div className="absolute top-4 left-4 w-4 h-4 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-ping"></div>
                <div className="absolute bottom-4 right-4 w-6 h-6 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse"></div>
              </div>
              
              <Button 
                size="lg"
                className="absolute bottom-8 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white px-10 py-4 rounded-full shadow-2xl font-bold text-lg transition-all duration-500 ease-out hover:scale-110 animate-float"
              >
                <Sparkles className="mr-3 w-6 h-6" />
                Try it Live
                <ArrowRight className="ml-3 w-6 h-6" />
              </Button>
            </div>
          </div>
        </div>
      </section>


      {/* Pricing Section */}
      <section id="pricing" className="py-32 bg-gradient-to-br from-gray-900 via-purple-900 to-teal-900 relative overflow-hidden">
        <div className={"absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\"60\" height=\"60\" viewBox=\"0 0 60 60\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cg fill=\"none\" fill-rule=\"evenodd\"%3E%3Cg fill=\"%23ffffff\" fill-opacity=\"0.1\"%3E%3Ccircle cx=\"7\" cy=\"7\" r=\"1\"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30"}></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-black text-white mb-6 font-display">
              Simple <span className="text-gradient">Pricing</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto font-medium">
              Affordable plans designed for local businesses. Start small, scale as you grow.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, index) => (
              <Card 
                key={index}
                className={`group transition-all duration-700 ease-out transform hover:-translate-y-10 border-0 shadow-lg relative overflow-hidden ${
                  plan.popular 
                    ? 'shadow-2xl scale-110 glass ring-2 ring-teal-400 animate-glow' 
                    : 'glass hover:shadow-2xl'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-20">
                    <span className="bg-gradient-to-r from-teal-500 to-purple-500 text-white px-6 py-3 rounded-full text-sm font-bold shadow-xl animate-pulse">
                      <Crown className="w-4 h-4 inline mr-2" />
                      Most Popular
                    </span>
                  </div>
                )}
                
                <div className={`absolute inset-0 bg-gradient-to-br ${plan.gradient} opacity-5 group-hover:opacity-15 transition-opacity duration-500`}></div>
                
                <CardContent className="p-10 text-center relative z-10">
                  <h3 className="text-3xl font-bold text-white mb-3">{plan.name}</h3>
                  <p className="text-gray-300 mb-8 font-medium">{plan.description}</p>
                  <div className="mb-8">
                    <span className="text-6xl font-black text-white">{plan.price}</span>
                    <span className="text-gray-300 text-lg">{plan.period}</span>
                  </div>
                  <ul className="space-y-4 mb-10">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center justify-center">
                        <Check className="w-5 h-5 text-teal-400 mr-3 animate-pulse" />
                        <span className="text-gray-300 font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    size="lg"
                    className={`w-full py-4 text-lg font-bold rounded-full transition-all duration-700 ease-out transform hover:scale-105 ${
                      plan.popular
                        ? 'bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white shadow-xl hover:shadow-2xl animate-glow'
                        : 'border-2 border-gray-400 hover:border-teal-400 hover:bg-gradient-to-r hover:from-teal-500 hover:to-purple-500 text-gray-300 hover:text-white'
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Section */}
      <section className="py-32 bg-gradient-to-r from-teal-600 via-purple-600 to-orange-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-20"></div>
        <div className="absolute inset-0 animate-gradient bg-gradient-to-r from-teal-400 via-purple-400 to-orange-400 opacity-30"></div>
        
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center z-10">
          <div className="mb-8">
            <Sparkles className="w-16 h-16 text-white mx-auto animate-pulse" />
          </div>
          <h2 className="text-6xl md:text-8xl font-black text-white mb-8 leading-tight font-display">
            Ready to Go
            <br />
            <span className="bg-gradient-to-r from-yellow-300 to-white bg-clip-text text-transparent animate-gradient">
              Digital?
            </span>
          </h2>
          <p className="text-2xl md:text-3xl text-white/90 mb-12 max-w-3xl mx-auto font-medium">
            Join local businesses already thriving online with their digital presence.
          </p>
          <Button 
            size="lg"
            className="bg-white text-gray-900 hover:bg-gray-100 px-16 py-8 text-2xl font-black rounded-full transform transition-all duration-700 ease-out hover:scale-110 shadow-2xl hover:shadow-white/25 animate-float"
          >
            <Rocket className="mr-4 w-8 h-8" />
            Start Building
            <ArrowRight className="ml-4 w-8 h-8" />
          </Button>
          
          <div className="mt-12 text-white/80 font-medium">
            <p>✨ No credit card required • 🚀 Go live in minutes • 💎 Cancel anytime</p>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-10 left-10 w-32 h-32 bg-white opacity-10 rounded-full animate-float blur-xl"></div>
        <div className="absolute bottom-10 right-10 w-40 h-40 bg-white opacity-10 rounded-full animate-float-reverse blur-xl"></div>
        <div className="absolute top-1/2 right-20 w-24 h-24 bg-white opacity-10 rounded-full animate-float blur-lg"></div>
      </section>

      {/* Footer Section */}
      <footer className="bg-gray-900 text-white py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black"></div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 z-10">
          <div className="grid md:grid-cols-4 gap-12 mb-16">
            <div>
              <h3 className="text-3xl font-black mb-6 text-gradient font-display">
                sync.a
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg font-medium">
                The easiest way for cafés, restaurants, and local shops to create their digital presence.
              </p>
              <div className="flex space-x-4 mt-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className={`w-3 h-3 rounded-full bg-gradient-to-r from-teal-400 to-purple-400 animate-pulse`} style={{ animationDelay: `${i * 0.5}s` }}></div>
                ))}
              </div>
            </div>
            
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Product</h4>
              <ul className="space-y-3">
                {['Features', 'Templates', 'Pricing', 'Enterprise'].map((item, i) => (
                  <li key={i}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300 font-medium hover:text-gradient">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Company</h4>
              <ul className="space-y-3">
                {['About', 'Blog', 'Careers', 'Contact'].map((item, i) => (
                  <li key={i}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300 font-medium hover:text-gradient">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h4 className="text-xl font-bold mb-6 text-white">Support</h4>
              <ul className="space-y-3">
                {['Help Center', 'Terms of Service', 'Privacy Policy', 'Status'].map((item, i) => (
                  <li key={i}>
                    <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300 font-medium hover:text-gradient">
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 font-medium text-lg">© 2024 sync.a. All rights reserved. Made with ❤️</p>
            <div className="flex space-x-8 mt-6 md:mt-0">
              {['Twitter', 'GitHub', 'LinkedIn'].map((social, i) => (
                <a key={i} href="#" className="text-gray-400 hover:text-white transition-colors duration-300 group">
                  <span className="sr-only">{social}</span>
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-purple-500 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <div className="w-6 h-6 bg-white rounded-full"></div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
