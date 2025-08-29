import { useState, useEffect } from "react";
import { ChevronRight, ArrowLeft, Sparkles, Rocket, Crown, Menu, X, Settings, Smartphone, Globe, Palette, MapPin, Phone, Mail, Upload, Clock, Calendar, Users, Camera, Instagram, Facebook, Share2, Coffee, ShoppingBag, Utensils, Store, Building, Plus, Check, Star, Heart, Zap, Play, Eye, ChevronDown, Monitor, Wifi, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function Configurator() {
  const [isVisible, setIsVisible] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    // Phase 1: Business Basics
    businessName: '',
    businessType: '',
    location: '',
    logo: null,
    slogan: '',
    uniqueDescription: '',
    
    // Phase 2: Design & Style
    template: '',
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    fontFamily: 'sans-serif',
    selectedPages: ['home'],
    customPages: [],
    
    // Phase 3: Content & Features
    openingHours: {},
    menuItems: [],
    menuPdf: null,
    reservationsEnabled: false,
    timeSlots: [],
    maxGuests: 10,
    notificationMethod: 'email',
    contactMethods: [],
    socialMedia: {},
    instagramSync: false,
    
    // Phase 4: Media & Advanced
    gallery: [],
    onlineOrdering: false,
    onlineStore: false,
    teamArea: false,
    
    // Phase 5: Domain & Publishing
    hasDomain: false,
    domainName: '',
    selectedDomain: ''
  });

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

  // Configuration steps definition
  const configuratorSteps = [
    // Phase 1: Introduction & Business Basics
    {
      id: 'welcome',
      title: "Let's build your perfect digital space",
      description: "Create a stunning website for your business in minutes",
      phase: 1,
      phaseTitle: "Introduction & Business Basics",
      component: 'welcome'
    },
    {
      id: 'business-info',
      title: "Tell us about your business",
      description: "Basic information to get started",
      phase: 1,
      phaseTitle: "Introduction & Business Basics",
      component: 'business-info'
    },
    
    // Phase 2: Design & Visual Style
    {
      id: 'template',
      title: "Choose your template",
      description: "Select a design that matches your vision",
      phase: 2,
      phaseTitle: "Design & Visual Style",
      component: 'template'
    },
    {
      id: 'branding',
      title: "Define your brand colors",
      description: "Choose colors and fonts that represent your business",
      phase: 2,
      phaseTitle: "Design & Visual Style",
      component: 'branding'
    },
    {
      id: 'page-structure',
      title: "Select your pages",
      description: "Choose which pages your website will include",
      phase: 2,
      phaseTitle: "Design & Visual Style",
      component: 'page-structure'
    },
    
    // Phase 3: Content & Features
    {
      id: 'opening-hours',
      title: "Set your opening hours",
      description: "When are you open for business?",
      phase: 3,
      phaseTitle: "Content & Features",
      component: 'opening-hours'
    },
    {
      id: 'menu-products',
      title: "Add your menu or products",
      description: "Showcase what you offer",
      phase: 3,
      phaseTitle: "Content & Features",
      component: 'menu-products'
    },
    {
      id: 'reservations',
      title: "Setup reservations",
      description: "Enable table bookings for your business",
      phase: 3,
      phaseTitle: "Content & Features",
      component: 'reservations'
    },
    {
      id: 'contact-social',
      title: "Contact & social media",
      description: "How can customers reach you?",
      phase: 3,
      phaseTitle: "Content & Features",
      component: 'contact-social'
    },
    
    // Phase 4: Media & Advanced Options
    {
      id: 'media-gallery',
      title: "Upload your photos",
      description: "Show off your space, food, and atmosphere",
      phase: 4,
      phaseTitle: "Media & Advanced Options",
      component: 'media-gallery'
    },
    {
      id: 'advanced-features',
      title: "Optional features",
      description: "Enable advanced functionality",
      phase: 4,
      phaseTitle: "Media & Advanced Options",
      component: 'advanced-features'
    },
    
    // Phase 5: Domain, Preview & Publishing
    {
      id: 'domain-hosting',
      title: "Choose your domain",
      description: "Select how customers will find your website",
      phase: 5,
      phaseTitle: "Domain, Preview & Publishing",
      component: 'domain-hosting'
    },
    {
      id: 'preview-adjustments',
      title: "Preview & final tweaks",
      description: "Review and make final adjustments",
      phase: 5,
      phaseTitle: "Domain, Preview & Publishing",
      component: 'preview-adjustments'
    },
    {
      id: 'publish',
      title: "Publish your website",
      description: "Make your website live!",
      phase: 5,
      phaseTitle: "Domain, Preview & Publishing",
      component: 'publish'
    }
  ];

  // Business type options
  const businessTypes = [
    { value: 'cafe', label: 'Café', icon: <Coffee className="w-6 h-6" />, gradient: 'from-orange-400 to-yellow-500' },
    { value: 'restaurant', label: 'Restaurant', icon: <Utensils className="w-6 h-6" />, gradient: 'from-red-400 to-orange-500' },
    { value: 'bar', label: 'Bar', icon: <Heart className="w-6 h-6" />, gradient: 'from-purple-400 to-pink-500' },
    { value: 'store', label: 'Store', icon: <ShoppingBag className="w-6 h-6" />, gradient: 'from-blue-400 to-indigo-500' },
    { value: 'other', label: 'Other', icon: <Building className="w-6 h-6" />, gradient: 'from-gray-400 to-gray-600' }
  ];

  // Template options
  const templates = [
    {
      id: 'minimalistic',
      name: 'Minimalistic',
      description: 'Clean, spacious, modern typography',
      preview: 'bg-gradient-to-br from-gray-50 to-white',
      style: { background: '#FFFFFF', accent: '#374151', text: '#111827' }
    },
    {
      id: 'modern',
      name: 'Modern',
      description: 'Grid layout, bold text, smooth transitions',
      preview: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      style: { background: '#1E40AF', accent: '#3B82F6', text: '#FFFFFF' }
    },
    {
      id: 'intuitive',
      name: 'Intuitive',
      description: 'User-focused, clear navigation, soft colors',
      preview: 'bg-gradient-to-br from-teal-50 to-emerald-100',
      style: { background: '#059669', accent: '#10B981', text: '#FFFFFF' }
    },
    {
      id: 'fancy',
      name: 'Fancy',
      description: 'Rich visuals, creative layout, animations',
      preview: 'bg-gradient-to-br from-purple-50 to-pink-100',
      style: { background: '#7C3AED', accent: '#EC4899', text: '#FFFFFF' }
    }
  ];

  // Font options
  const fontOptions = [
    { id: 'sans-serif', name: 'Sans Serif', class: 'font-sans', preview: 'Modern & Clean' },
    { id: 'serif', name: 'Serif', class: 'font-serif', preview: 'Classic & Elegant' },
    { id: 'display', name: 'Display', class: 'font-mono', preview: 'Bold & Creative' }
  ];

  // Page options
  const pageOptions = [
    { id: 'home', name: 'Home', required: true, icon: <Home className="w-4 h-4" /> },
    { id: 'menu', name: 'Menu', icon: <Coffee className="w-4 h-4" />, condition: ['cafe', 'restaurant', 'bar'] },
    { id: 'gallery', name: 'Gallery', icon: <Camera className="w-4 h-4" /> },
    { id: 'about', name: 'About', icon: <Heart className="w-4 h-4" /> },
    { id: 'reservations', name: 'Reservations', icon: <Calendar className="w-4 h-4" />, condition: ['restaurant', 'bar'] },
    { id: 'contact', name: 'Contact', icon: <Phone className="w-4 h-4" /> }
  ];

  // State management functions
  const updateFormData = (field: string, value: any) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    // Save to localStorage for persistence
    localStorage.setItem('configuratorData', JSON.stringify(newFormData));
    localStorage.setItem('configuratorStep', currentStep.toString());
  };

  // Load persisted data on component mount
  useEffect(() => {
    const savedData = localStorage.getItem('configuratorData');
    const savedStep = localStorage.getItem('configuratorStep');
    
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        setFormData(prev => ({ ...prev, ...parsedData }));
      } catch (error) {
        console.log('Error loading saved data:', error);
      }
    }
    
    if (savedStep) {
      const stepNumber = parseInt(savedStep);
      if (!isNaN(stepNumber) && stepNumber > 0) {
        setCurrentStep(stepNumber);
      }
    }
  }, []);

  const nextStep = () => {
    if (currentStep < configuratorSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      localStorage.setItem('configuratorStep', (currentStep + 1).toString());
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      localStorage.setItem('configuratorStep', (currentStep - 1).toString());
    }
  };

  // Enhanced Navigation component
  const Navigation = () => (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${isDarkMode ? 'bg-gray-900/90' : 'glass'} border-b ${isDarkMode ? 'border-gray-700' : 'border-white/20'} backdrop-blur-xl`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <a href="/" className="text-3xl font-black text-gradient animate-pulse">sync.a</a>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-bounce"></div>
            </div>
            
            {/* Progress indicator */}
            <div className="hidden md:flex items-center ml-8">
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Settings className="w-4 h-4 text-teal-500" />
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Step {currentStep + 1} of {configuratorSteps.length}
                </span>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${((currentStep + 1) / configuratorSteps.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Phase indicator */}
            {currentStep > 0 && (
              <div className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-teal-500/10 to-purple-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                <Crown className="w-3 h-3 text-teal-600" />
                <span className="text-xs font-bold text-teal-700">
                  Phase {configuratorSteps[currentStep].phase}: {configuratorSteps[currentStep].phaseTitle}
                </span>
              </div>
            )}
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              {/* Dark mode toggle */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`p-2 rounded-full transition-all duration-300 ${isDarkMode ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-100 text-gray-600'}`}
              >
                {isDarkMode ? '☀️' : '🌙'}
              </Button>
              
              <Button 
                size="sm"
                className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 shadow-lg animate-glow"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>
          </div>

          <div className="md:hidden">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`${isDarkMode ? 'text-white' : 'text-gray-700'}`}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Live Preview Component with Enhanced Templates
  const LivePreview = () => {
    const getBusinessName = () => formData.businessName || 'Your Business';
    
    const getTemplateStyles = () => {
      const selected = templates.find(t => t.id === formData.template);
      return selected ? selected.style : templates[0].style;
    };

    const styles = getTemplateStyles();

    const renderPreviewContent = () => {
      if (!formData.template) {
        return (
          <div className="pt-8 h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Choose a template to see preview</p>
            </div>
          </div>
        );
      }

      return (
        <div className="pt-8 h-full overflow-y-auto transition-all duration-700 ease-in-out" style={{ backgroundColor: styles.background }}>
          {/* Header based on template */}
          <div className="px-4 py-3" style={{ backgroundColor: styles.background, borderBottom: `1px solid ${styles.accent}20` }}>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold" style={{ color: styles.text }}>
                {getBusinessName()}
              </div>
              <Menu className="w-4 h-4" style={{ color: styles.text }} />
            </div>
          </div>
          
          {/* Hero section */}
          <div className="px-4 py-6 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: styles.accent }}>
              {formData.businessType === 'cafe' ? <Coffee className="w-8 h-8 text-white" /> :
               formData.businessType === 'restaurant' ? <Utensils className="w-8 h-8 text-white" /> :
               formData.businessType === 'bar' ? <Heart className="w-8 h-8 text-white" /> :
               formData.businessType === 'store' ? <ShoppingBag className="w-8 h-8 text-white" /> :
               <Building className="w-8 h-8 text-white" />}
            </div>
            <h2 className="text-lg font-bold mb-2" style={{ color: styles.text }}>{getBusinessName()}</h2>
            {formData.slogan && (
              <p className="text-sm opacity-80" style={{ color: styles.text }}>{formData.slogan}</p>
            )}
          </div>
          
          {/* Content sections based on selected pages */}
          <div className="px-4 space-y-4">
            {formData.selectedPages.includes('menu') && formData.menuItems.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-2" style={{ color: styles.text }}>Menu Highlights</h3>
                <div className="space-y-2">
                  {formData.menuItems.slice(0, 3).map((item: any, index: number) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded" style={{ backgroundColor: `${styles.accent}10` }}>
                      <div>
                        <div className="text-xs font-medium" style={{ color: styles.text }}>{item.name}</div>
                        <div className="text-xs opacity-70" style={{ color: styles.text }}>{item.description}</div>
                      </div>
                      <div className="text-xs font-bold" style={{ color: styles.accent }}>${item.price}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {formData.selectedPages.includes('gallery') && formData.gallery.length > 0 && (
              <div>
                <h3 className="text-sm font-bold mb-2" style={{ color: styles.text }}>Gallery</h3>
                <div className="grid grid-cols-2 gap-2">
                  {formData.gallery.slice(0, 4).map((image: any, index: number) => (
                    <div key={index} className="aspect-square rounded" style={{ backgroundColor: `${styles.accent}20` }}></div>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Footer */}
          <div className="px-4 py-4 mt-6" style={{ borderTop: `1px solid ${styles.accent}20` }}>
            <div className="flex justify-center space-x-3">
              {Object.keys(formData.socialMedia).map((platform, index) => (
                <div key={index} className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: styles.accent }}>
                  <div className="w-3 h-3 bg-white rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="sticky top-24 h-[calc(100vh-6rem)]">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Live Preview</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="p-2">
                <Smartphone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="p-2">
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* iPhone 16 Pro mockup */}
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              {/* iPhone frame */}
              <div className="w-64 h-[520px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                  {/* iPhone notch */}
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-xl z-20"></div>
                  
                  {/* Website preview */}
                  <div className="h-full relative transition-all duration-700 ease-in-out">
                    {renderPreviewContent()}
                  </div>
                </div>
              </div>
              
              {/* Floating template indicator */}
              <div className="absolute -right-4 top-1/2 transform -translate-y-1/2">
                <div className="flex flex-col space-y-2">
                  <div className={`w-3 h-3 rounded-full animate-pulse ${
                    formData.template === 'minimalistic' ? 'bg-gray-400' :
                    formData.template === 'modern' ? 'bg-blue-500' :
                    formData.template === 'intuitive' ? 'bg-teal-500' :
                    formData.template === 'fancy' ? 'bg-purple-500' : 'bg-gray-300'
                  }`}></div>
                  <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                  <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Step Components
  const WelcomeStep = () => (
    <div className="text-center py-16">
      <div className="mb-8">
        <div className="w-32 h-32 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <Rocket className="w-16 h-16 text-teal-500 animate-bounce" />
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
          Let's build your <span className="text-gradient">perfect digital space</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Create a stunning website for your business in minutes. No technical skills needed - we'll guide you every step of the way.
        </p>
      </div>
      
      <Button 
        onClick={nextStep}
        size="lg"
        className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-12 py-6 text-xl font-bold rounded-full transition-all duration-500 hover:scale-110 shadow-2xl animate-glow"
      >
        <Sparkles className="mr-3 w-6 h-6" />
        Let's Go
        <ChevronRight className="ml-3 w-6 h-6" />
      </Button>
    </div>
  );

  const BusinessInfoStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Tell us about your business
        </h2>
        <p className="text-lg text-gray-600">
          Basic information to get started with your website
        </p>
      </div>
      
      <div className="space-y-6">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Business Name *</label>
          <Input
            type="text"
            placeholder="e.g. Bella's Café"
            value={formData.businessName}
            onChange={(e) => updateFormData('businessName', e.target.value)}
            className="w-full px-4 py-3 text-lg"
          />
        </div>

        {/* Business Type */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Business Type *</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {businessTypes.map((type) => (
              <Card
                key={type.value}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  formData.businessType === type.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                }`}
                onClick={() => updateFormData('businessType', type.value)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`w-12 h-12 mx-auto mb-2 rounded-xl bg-gradient-to-r ${type.gradient} flex items-center justify-center text-white`}>
                    {type.icon}
                  </div>
                  <h3 className="text-sm font-bold text-gray-900">{type.label}</h3>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Location</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <Input
              type="text"
              placeholder="123 Main Street, City, State"
              value={formData.location}
              onChange={(e) => updateFormData('location', e.target.value)}
              className="w-full pl-10 px-4 py-3"
            />
          </div>
        </div>

        {/* Slogan */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Slogan (Optional)</label>
          <Input
            type="text"
            placeholder="e.g. The best coffee in town"
            value={formData.slogan}
            onChange={(e) => updateFormData('slogan', e.target.value)}
            className="w-full px-4 py-3"
          />
        </div>

        {/* Unique Description */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">What makes your business unique?</label>
          <Textarea
            placeholder="Tell us what sets you apart from the competition..."
            value={formData.uniqueDescription}
            onChange={(e) => updateFormData('uniqueDescription', e.target.value)}
            className="w-full px-4 py-3 h-24"
          />
        </div>
      </div>
      
      <div className="flex justify-between mt-8">
        <Button onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button 
          onClick={nextStep} 
          disabled={!formData.businessName || !formData.businessType}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const TemplateStep = () => (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Choose your template
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select a design that matches your vision. You can customize colors and content later.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-8">
        {templates.map((template) => (
          <Card
            key={template.id}
            className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 ${
              formData.template === template.id ? 'border-teal-500 shadow-xl scale-105' : 'border-transparent'
            }`}
            onClick={() => updateFormData('template', template.id)}
          >
            <CardContent className="p-0">
              <div className={`w-full h-48 rounded-t-lg ${template.preview} relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/5"></div>
                <div className="absolute bottom-4 left-4 text-gray-900">
                  <div className="text-lg font-bold">{template.name}</div>
                </div>
                {formData.template === template.id && (
                  <div className="absolute top-4 right-4">
                    <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center">
                      <Check className="w-5 h-5 text-white" />
                    </div>
                  </div>
                )}
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-2">{template.name}</h3>
                <p className="text-gray-600">{template.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-between">
        <Button onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          disabled={!formData.template}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const BrandingStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Define your brand colors
        </h2>
        <p className="text-lg text-gray-600">
          Choose colors and fonts that represent your business personality
        </p>
      </div>

      <div className="space-y-8">
        {/* Primary Color */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Primary Color</label>
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={formData.primaryColor}
              onChange={(e) => updateFormData('primaryColor', e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer"
            />
            <div className="flex-1">
              <Input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => updateFormData('primaryColor', e.target.value)}
                className="font-mono"
                placeholder="#2563EB"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">This will be your main brand color for buttons and accents</p>
        </div>

        {/* Secondary Color */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Secondary Color</label>
          <div className="flex items-center space-x-4">
            <input
              type="color"
              value={formData.secondaryColor}
              onChange={(e) => updateFormData('secondaryColor', e.target.value)}
              className="w-12 h-12 rounded-lg cursor-pointer"
            />
            <div className="flex-1">
              <Input
                type="text"
                value={formData.secondaryColor}
                onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                className="font-mono"
                placeholder="#7C3AED"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Supporting color for gradients and highlights</p>
        </div>

        {/* Color Presets */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Quick Presets</label>
          <div className="grid grid-cols-4 gap-3">
            {[
              { primary: '#2563EB', secondary: '#7C3AED', name: 'Ocean' },
              { primary: '#059669', secondary: '#10B981', name: 'Forest' },
              { primary: '#DC2626', secondary: '#F59E0B', name: 'Sunset' },
              { primary: '#7C2D12', secondary: '#EA580C', name: 'Autumn' },
              { primary: '#1F2937', secondary: '#374151', name: 'Elegant' },
              { primary: '#BE185D', secondary: '#EC4899', name: 'Vibrant' },
              { primary: '#6366F1', secondary: '#8B5CF6', name: 'Purple' },
              { primary: '#0891B2', secondary: '#06B6D4', name: 'Sky' }
            ].map((preset, index) => (
              <button
                key={index}
                onClick={() => {
                  updateFormData('primaryColor', preset.primary);
                  updateFormData('secondaryColor', preset.secondary);
                }}
                className="flex flex-col items-center p-3 rounded-lg border-2 border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex space-x-1 mb-2">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.primary }}></div>
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: preset.secondary }}></div>
                </div>
                <span className="text-xs font-medium text-gray-700">{preset.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Font Style</label>
          <div className="grid grid-cols-3 gap-4">
            {fontOptions.map((font) => (
              <Card
                key={font.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  formData.fontFamily === font.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                }`}
                onClick={() => updateFormData('fontFamily', font.id)}
              >
                <CardContent className="p-4 text-center">
                  <div className={`text-lg font-bold mb-2 ${font.class}`}>{font.name}</div>
                  <div className={`text-sm text-gray-600 ${font.class}`}>{font.preview}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-between mt-8">
        <Button onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const PageStructureStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Select your pages
        </h2>
        <p className="text-lg text-gray-600">
          Choose which pages your website will include
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {pageOptions.filter(page =>
          !page.condition || page.condition.includes(formData.businessType)
        ).map((page) => (
          <Card
            key={page.id}
            className={`cursor-pointer transition-all duration-300 border-2 ${
              formData.selectedPages.includes(page.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
            } ${page.required ? 'opacity-75' : ''}`}
            onClick={() => {
              if (page.required) return;
              const newPages = formData.selectedPages.includes(page.id)
                ? formData.selectedPages.filter(p => p !== page.id)
                : [...formData.selectedPages, page.id];
              updateFormData('selectedPages', newPages);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-r from-teal-400 to-purple-500 flex items-center justify-center text-white`}>
                    {page.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{page.name}</h3>
                    {page.required && <span className="text-sm text-gray-500">Required</span>}
                  </div>
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.selectedPages.includes(page.id) || page.required ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                }`}>
                  {(formData.selectedPages.includes(page.id) || page.required) && <Check className="w-4 h-4 text-white" />}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Custom Pages */}
      <div className="mb-8">
        <label className="block text-sm font-bold text-gray-700 mb-4">Custom Pages (Optional)</label>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="e.g. Events, Catering, Gift Cards"
            onKeyPress={(e) => {
              if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                const newCustomPages = [...formData.customPages, e.currentTarget.value.trim()];
                updateFormData('customPages', newCustomPages);
                e.currentTarget.value = '';
              }
            }}
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={(e) => {
              const input = e.currentTarget.parentElement?.querySelector('input') as HTMLInputElement;
              if (input && input.value.trim()) {
                const newCustomPages = [...formData.customPages, input.value.trim()];
                updateFormData('customPages', newCustomPages);
                input.value = '';
              }
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {formData.customPages.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {formData.customPages.map((page, index) => (
              <div key={index} className="flex items-center space-x-2 bg-gray-100 px-3 py-1 rounded-full">
                <span className="text-sm text-gray-700">{page}</span>
                <button
                  onClick={() => {
                    const newCustomPages = formData.customPages.filter((_, i) => i !== index);
                    updateFormData('customPages', newCustomPages);
                  }}
                  className="text-gray-500 hover:text-red-500"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between">
        <Button onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const OpeningHoursStep = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const updateHours = (day: string, field: string, value: string) => {
      const newHours = {
        ...formData.openingHours,
        [day]: {
          ...formData.openingHours[day as keyof typeof formData.openingHours],
          [field]: value
        }
      };
      updateFormData('openingHours', newHours);
    };

    const toggleDay = (day: string) => {
      const dayData = formData.openingHours[day as keyof typeof formData.openingHours];
      if (dayData?.closed) {
        updateHours(day, 'closed', false);
        updateHours(day, 'open', '09:00');
        updateHours(day, 'close', '17:00');
      } else {
        updateHours(day, 'closed', true);
      }
    };

    return (
      <div className="py-8 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Set your opening hours
          </h2>
          <p className="text-lg text-gray-600">
            When are you open for business?
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {days.map((day) => {
            const dayData = formData.openingHours[day as keyof typeof formData.openingHours] || {};
            return (
              <Card key={day} className="border-2 border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-gray-900 w-24">{day}</h3>
                      <Button
                        variant={dayData.closed ? "outline" : "default"}
                        size="sm"
                        onClick={() => toggleDay(day)}
                        className={dayData.closed ? "text-red-600 border-red-300" : "bg-teal-500 text-white"}
                      >
                        {dayData.closed ? 'Closed' : 'Open'}
                      </Button>
                    </div>

                    {!dayData.closed && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="time"
                          value={dayData.open || '09:00'}
                          onChange={(e) => updateHours(day, 'open', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                        <span className="text-gray-500">to</span>
                        <input
                          type="time"
                          value={dayData.close || '17:00'}
                          onChange={(e) => updateHours(day, 'close', e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-lg"
                        />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-2">
            <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-blue-900 mb-1">Pro Tip</h4>
              <p className="text-sm text-blue-700">You can always update your hours later. Consider adding special holiday hours or seasonal changes.</p>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <Button onClick={prevStep} variant="outline" size="lg">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const MenuProductsStep = () => {
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '', category: '' });

    const addMenuItem = () => {
      if (newItem.name && newItem.price) {
        const updatedItems = [...formData.menuItems, { ...newItem, id: Date.now() }];
        updateFormData('menuItems', updatedItems);
        setNewItem({ name: '', description: '', price: '', category: '' });
      }
    };

    const removeMenuItem = (id: number) => {
      const updatedItems = formData.menuItems.filter((item: any) => item.id !== id);
      updateFormData('menuItems', updatedItems);
    };

    return (
      <div className="py-8 max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Add your {formData.businessType === 'store' ? 'products' : 'menu'}
          </h2>
          <p className="text-lg text-gray-600">
            Showcase what you offer to attract customers
          </p>
        </div>

        {/* Quick Add Form */}
        <Card className="mb-8 border-2 border-dashed border-gray-300">
          <CardContent className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">
              Add {formData.businessType === 'store' ? 'Product' : 'Menu Item'}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input
                placeholder={formData.businessType === 'store' ? 'Product name' : 'Dish name'}
                value={newItem.name}
                onChange={(e) => setNewItem({...newItem, name: e.target.value})}
              />
              <Input
                placeholder="Price"
                value={newItem.price}
                onChange={(e) => setNewItem({...newItem, price: e.target.value})}
              />
            </div>
            <Textarea
              placeholder="Description (optional)"
              value={newItem.description}
              onChange={(e) => setNewItem({...newItem, description: e.target.value})}
              className="mb-4"
            />
            <Button onClick={addMenuItem} className="w-full bg-teal-500 hover:bg-teal-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </CardContent>
        </Card>

        {/* Menu Items List */}
        {formData.menuItems.length > 0 && (
          <div className="space-y-3 mb-8">
            <h3 className="text-lg font-bold text-gray-900">Your Items</h3>
            {formData.menuItems.map((item: any) => (
              <Card key={item.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-900">{item.name}</h4>
                      {item.description && (
                        <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-teal-600">${item.price}</span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeMenuItem(item.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* PDF Upload Option */}
        <Card className="mb-8 bg-gray-50">
          <CardContent className="p-6 text-center">
            <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Or upload your existing menu</h3>
            <p className="text-gray-600 mb-4">Have a PDF menu? Upload it and we'll add it to your site</p>
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Upload PDF Menu
            </Button>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button onClick={prevStep} variant="outline" size="lg">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  const ReservationsStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Setup reservations
        </h2>
        <p className="text-lg text-gray-600">
          Enable table bookings for your business
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Enable Reservations</h3>
              <p className="text-gray-600">Allow customers to book tables online</p>
            </div>
            <Button
              variant={formData.reservationsEnabled ? "default" : "outline"}
              onClick={() => updateFormData('reservationsEnabled', !formData.reservationsEnabled)}
              className={formData.reservationsEnabled ? "bg-teal-500 hover:bg-teal-600" : ""}
            >
              {formData.reservationsEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {formData.reservationsEnabled && (
        <div className="space-y-6">
          {/* Max Guests */}
          <Card>
            <CardContent className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-4">Maximum Party Size</label>
              <div className="flex items-center space-x-4">
                <Users className="w-5 h-5 text-gray-400" />
                <Input
                  type="number"
                  value={formData.maxGuests}
                  onChange={(e) => updateFormData('maxGuests', parseInt(e.target.value))}
                  className="w-24"
                  min="1"
                  max="20"
                />
                <span className="text-gray-600">guests</span>
              </div>
            </CardContent>
          </Card>

          {/* Notification Method */}
          <Card>
            <CardContent className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-4">How would you like to receive reservations?</label>
              <div className="grid grid-cols-1 gap-3">
                {[
                  { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
                  { id: 'sms', label: 'SMS', icon: <Phone className="w-4 h-4" /> },
                  { id: 'whatsapp', label: 'WhatsApp', icon: <Share2 className="w-4 h-4" /> }
                ].map((method) => (
                  <Card
                    key={method.id}
                    className={`cursor-pointer transition-all duration-300 border-2 ${
                      formData.notificationMethod === method.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                    }`}
                    onClick={() => updateFormData('notificationMethod', method.id)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                          {method.icon}
                        </div>
                        <span className="font-medium text-gray-900">{method.label}</span>
                        {formData.notificationMethod === method.id && (
                          <Check className="w-5 h-5 text-teal-500 ml-auto" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex justify-between mt-8">
        <Button onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const ContactSocialStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Contact & social media
        </h2>
        <p className="text-lg text-gray-600">
          How can customers reach you?
        </p>
      </div>

      {/* Contact Methods */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Contact Methods</h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { id: 'phone', label: 'Phone', icon: <Phone className="w-4 h-4" /> },
              { id: 'email', label: 'Email', icon: <Mail className="w-4 h-4" /> },
              { id: 'form', label: 'Contact Form', icon: <Users className="w-4 h-4" /> },
              { id: 'whatsapp', label: 'WhatsApp', icon: <Share2 className="w-4 h-4" /> }
            ].map((method) => (
              <Card
                key={method.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  formData.contactMethods.includes(method.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                }`}
                onClick={() => {
                  const newMethods = formData.contactMethods.includes(method.id)
                    ? formData.contactMethods.filter((m: string) => m !== method.id)
                    : [...formData.contactMethods, method.id];
                  updateFormData('contactMethods', newMethods);
                }}
              >
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-teal-100 flex items-center justify-center text-teal-600">
                    {method.icon}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{method.label}</span>
                  {formData.contactMethods.includes(method.id) && (
                    <Check className="w-4 h-4 text-teal-500 mx-auto mt-2" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Social Media */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Social Media Links</h3>
          <div className="space-y-4">
            {[
              { key: 'instagram', name: 'Instagram', icon: <Instagram className="w-5 h-5" />, color: 'from-pink-500 to-purple-500' },
              { key: 'facebook', name: 'Facebook', icon: <Facebook className="w-5 h-5" />, color: 'from-blue-500 to-blue-600' },
              { key: 'tiktok', name: 'TikTok', icon: <Play className="w-5 h-5" />, color: 'from-black to-gray-700' }
            ].map((platform) => (
              <div key={platform.key} className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center text-white`}>
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <Input
                    type="url"
                    placeholder={`Your ${platform.name} URL`}
                    value={formData.socialMedia[platform.key] || ''}
                    onChange={(e) => updateFormData('socialMedia', {
                      ...formData.socialMedia,
                      [platform.key]: e.target.value
                    })}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Instagram Sync Option */}
          <div className="mt-6 p-4 bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg border border-pink-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-1">Auto-sync Instagram photos</h4>
                <p className="text-xs text-gray-600">Automatically display your latest Instagram posts on your website</p>
              </div>
              <Button
                variant={formData.instagramSync ? "default" : "outline"}
                size="sm"
                onClick={() => updateFormData('instagramSync', !formData.instagramSync)}
                className={formData.instagramSync ? "bg-pink-500 hover:bg-pink-600" : ""}
              >
                {formData.instagramSync ? 'On' : 'Off'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button onClick={prevStep} variant="outline" size="lg">
          <ArrowLeft className="mr-2 w-5 h-5" />
          Back
        </Button>
        <Button
          onClick={nextStep}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    const step = configuratorSteps[currentStep];
    if (!step) return null;

    switch (step.component) {
      case 'welcome': return <WelcomeStep />;
      case 'business-info': return <BusinessInfoStep />;
      case 'template': return <TemplateStep />;
      case 'branding': return <BrandingStep />;
      case 'page-structure': return <PageStructureStep />;
      default: return (
        <div className="py-16 text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">{step.title}</h2>
          <p className="text-gray-600 mb-8">{step.description}</p>
          <div className="text-sm text-gray-500 mb-8">This step is coming soon...</div>
          <div className="flex justify-between max-w-md mx-auto">
            <Button onClick={prevStep} variant="outline" size="lg">
              <ArrowLeft className="mr-2 w-5 h-5" />
              Back
            </Button>
            <Button onClick={nextStep} size="lg" className="bg-gradient-to-r from-teal-500 to-purple-500">
              Continue
              <ChevronRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className={`min-h-screen transition-all duration-500 ${isDarkMode ? 'bg-gray-900' : 'bg-white'} overflow-hidden`}>
      <Navigation />
      
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
      
      {/* Main Content */}
      <div className="pt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Configurator Content */}
            <div className="lg:col-span-2">
              <div className={`min-h-[80vh] ${isDarkMode ? 'text-white' : 'text-gray-900'} transition-all duration-500`}>
                {renderCurrentStep()}
              </div>
            </div>
            
            {/* Live Preview Sidebar */}
            <div className="hidden lg:block">
              <LivePreview />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
