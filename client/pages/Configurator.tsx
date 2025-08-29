import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronRight, ArrowLeft, Sparkles, Rocket, Crown, Menu, X, Settings, Smartphone, Globe, Palette, MapPin, Phone, Mail, Upload, Clock, Calendar, Users, Camera, Instagram, Facebook, Share2, Coffee, ShoppingBag, Utensils, Store, Building, Plus, Check, Star, Heart, Zap, Play, Eye, ChevronDown, Monitor, Wifi, Shield, Home, Save, Cloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { configurationApi, sessionApi, type Configuration } from "@/lib/api";

export default function Configurator() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1); // Start with welcome page
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Template Selection
    template: '',
    
    // Business Information
    businessName: '',
    businessType: '',
    location: '',
    logo: null,
    slogan: '',
    uniqueDescription: '',
    
    // Design & Style
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    fontFamily: 'sans-serif',
    backgroundType: 'color',
    backgroundColor: '#FFFFFF',
    backgroundImage: null,
    selectedPages: ['home'],
    customPages: [],
    
    // Content & Features
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
    
    // Media & Advanced
    gallery: [],
    onlineOrdering: false,
    onlineStore: false,
    teamArea: false,
    
    // Domain & Publishing
    hasDomain: false,
    domainName: '',
    selectedDomain: ''
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Template preview selection (for step 0 live preview before committing)
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);

  // COMPLETE Configuration steps
  const configuratorSteps = [
    // Step 0: Template Selection
    {
      id: 'template',
      title: "Choose your template",
      description: "Select a design that matches your vision",
      phase: 0,
      phaseTitle: "Template Selection",
      component: 'template'
    },
    
    // Step 1: Business Information
    {
      id: 'business-info',
      title: "Tell us about your business",
      description: "Basic information to get started",
      phase: 1,
      phaseTitle: "Business Information",
      component: 'business-info'
    },
    
    // Step 2: Design Customization
    {
      id: 'design-customization',
      title: "Customize your design",
      description: "Colors, fonts, and styling",
      phase: 2,
      phaseTitle: "Design Customization",
      component: 'design-customization'
    },
    
    // Step 3: Page Structure
    {
      id: 'page-structure',
      title: "Select your pages",
      description: "Choose which pages your website will include",
      phase: 3,
      phaseTitle: "Content Structure",
      component: 'page-structure'
    },
    
    // Step 4: Opening Hours
    {
      id: 'opening-hours',
      title: "Set your opening hours",
      description: "When are you open for business?",
      phase: 4,
      phaseTitle: "Business Details",
      component: 'opening-hours'
    },
    
    // Step 5: Menu/Products
    {
      id: 'menu-products',
      title: "Add your menu or products",
      description: "Showcase what you offer",
      phase: 4,
      phaseTitle: "Business Details",
      component: 'menu-products'
    },
    
    // Step 6: Reservations
    {
      id: 'reservations',
      title: "Setup reservations",
      description: "Enable table bookings for your business",
      phase: 4,
      phaseTitle: "Business Details",
      component: 'reservations'
    },
    
    // Step 7: Contact & Social
    {
      id: 'contact-social',
      title: "Contact & social media",
      description: "How can customers reach you?",
      phase: 4,
      phaseTitle: "Business Details",
      component: 'contact-social'
    },
    
    // Step 8: Media Gallery
    {
      id: 'media-gallery',
      title: "Upload your photos",
      description: "Show off your space, food, and atmosphere",
      phase: 5,
      phaseTitle: "Media & Advanced",
      component: 'media-gallery'
    },
    
    // Step 9: Advanced Features
    {
      id: 'advanced-features',
      title: "Optional features",
      description: "Enable advanced functionality",
      phase: 5,
      phaseTitle: "Media & Advanced",
      component: 'advanced-features'
    },
    
    // Step 10: Domain & Hosting
    {
      id: 'domain-hosting',
      title: "Choose your domain",
      description: "Select how customers will find your website",
      phase: 6,
      phaseTitle: "Publishing",
      component: 'domain-hosting'
    },
    
    // Step 11: Final Preview
    {
      id: 'preview-adjustments',
      title: "Preview & final tweaks",
      description: "Review and make final adjustments",
      phase: 6,
      phaseTitle: "Publishing",
      component: 'preview-adjustments'
    },
    
    // Step 12: Publish
    {
      id: 'publish',
      title: "Publish your website",
      description: "Make your website live!",
      phase: 6,
      phaseTitle: "Publishing",
      component: 'publish'
    }
  ];

  // Business type options
  const businessTypes = [
    { value: 'cafe', label: 'Café', icon: <Coffee className="w-6 h-6" />, gradient: 'from-orange-400 to-yellow-500' },
    { value: 'restaurant', label: 'Restaurant', icon: <Utensils className="w-6 h-6" />, gradient: 'from-red-400 to-orange-500' }
  ];

  // Enhanced professional templates with realistic previews
  const templates = [
    {
      id: 'minimalist',
      name: 'Minimalist Clean',
      description: 'Clean lines, ample white space, perfect for modern cafés and professional services',
      preview: 'bg-gradient-to-br from-gray-50 to-white',
      style: {
        background: '#FFFFFF',
        accent: '#374151',
        text: '#111827',
        secondary: '#F9FAFB',
        layout: 'single-column',
        navigation: 'minimal-top',
        typography: 'clean-sans'
      },
      features: ['Clean Design', 'Mobile First', 'Fast Loading'],
      mockup: {
        nav: { bg: 'bg-white', text: 'text-gray-900', border: 'border-gray-100' },
        hero: { bg: 'bg-gray-50', text: 'text-gray-900' },
        cards: { bg: 'bg-white', border: 'border-gray-200', text: 'text-gray-600' }
      }
    },
    {
      id: 'vibrant',
      name: 'Vibrant & Bold',
      description: 'Eye-catching colors, dynamic layouts, perfect for creative businesses and restaurants',
      preview: 'bg-gradient-to-br from-purple-400 via-pink-500 to-red-500',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        accent: '#EC4899',
        text: '#FFFFFF',
        secondary: '#8B5CF6',
        layout: 'creative-grid',
        navigation: 'overlay-creative',
        typography: 'bold-display'
      },
      features: ['Bold Colors', 'Creative Layout', 'Instagram Ready'],
      mockup: {
        nav: { bg: 'bg-purple-600', text: 'text-white', border: 'border-purple-400' },
        hero: { bg: 'bg-gradient-to-r from-purple-500 to-pink-500', text: 'text-white' },
        cards: { bg: 'bg-white/10 backdrop-blur-sm', border: 'border-white/20', text: 'text-white' }
      }
    },
    {
      id: 'professional',
      name: 'Professional Elite',
      description: 'Sophisticated design, traditional elegance, ideal for upscale establishments',
      preview: 'bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50',
      style: {
        background: '#FFFFFF',
        accent: '#2563EB',
        text: '#1F2937',
        secondary: '#F8FAFC',
        layout: 'traditional-grid',
        navigation: 'classic-top',
        typography: 'elegant-serif'
      },
      features: ['Professional', 'Trustworthy', 'Classic Appeal'],
      mockup: {
        nav: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-500' },
        hero: { bg: 'bg-blue-50', text: 'text-blue-900' },
        cards: { bg: 'bg-white', border: 'border-blue-200', text: 'text-blue-600' }
      }
    },
    {
      id: 'modern-dark',
      name: 'Modern Dark',
      description: 'Sleek dark theme, contemporary aesthetics, perfect for trendy venues',
      preview: 'bg-gradient-to-br from-gray-800 via-gray-900 to-black',
      style: {
        background: '#111827',
        accent: '#10B981',
        text: '#FFFFFF',
        secondary: '#1F2937',
        layout: 'modular-cards',
        navigation: 'floating-modern',
        typography: 'tech-mono'
      },
      features: ['Dark Theme', 'Modern UI', 'Tech-Forward'],
      mockup: {
        nav: { bg: 'bg-gray-800', text: 'text-white', border: 'border-gray-600' },
        hero: { bg: 'bg-gray-900', text: 'text-white' },
        cards: { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-300' }
      }
    }
  ];

  // Font options with working functionality
  const fontOptions = [
    { id: 'sans-serif', name: 'Sans Serif', class: 'font-sans', preview: 'Modern & Clean', description: 'Perfect for digital readability' },
    { id: 'serif', name: 'Serif', class: 'font-serif', preview: 'Classic & Elegant', description: 'Traditional and sophisticated' },
    { id: 'display', name: 'Display', class: 'font-mono', preview: 'Bold & Creative', description: 'Eye-catching and unique' }
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

  // Input handling
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  const collectFormValues = useCallback(() => {
    const values: any = {};
    Object.keys(inputRefs.current).forEach(field => {
      const element = inputRefs.current[field];
      if (element) {
        values[field] = element.value;
      }
    });
    return values;
  }, []);

  const updateFormDataFromInputs = useCallback(() => {
    const inputValues = collectFormValues();
    const contactMethods: any[] = [];
    const socialMedia: any = {};
    const regularFields: any = {};

    Object.keys(inputValues).forEach(key => {
      if (key.startsWith('contact_')) {
        const contactType = key.replace('contact_', '');
        const value = inputValues[key];
        if (value && value.trim()) {
          contactMethods.push({ type: contactType, value: value.trim() });
        }
      } else if (key.startsWith('social_')) {
        const platform = key.replace('social_', '');
        const value = inputValues[key];
        if (value && value.trim()) {
          socialMedia[platform] = value.trim();
        }
      } else {
        regularFields[key] = inputValues[key];
      }
    });

    const processedData = {
      ...regularFields,
      ...(contactMethods.length > 0 && { contactMethods }),
      ...(Object.keys(socialMedia).length > 0 && { socialMedia })
    };

    setFormData(prev => ({ ...prev, ...processedData }));
  }, [collectFormValues]);

  const handleInputBlur = useCallback((field: string) => {
    return () => updateFormDataFromInputs();
  }, [updateFormDataFromInputs]);

  const setInputRef = useCallback((field: string) => {
    return (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      inputRefs.current[field] = element;
    };
  }, []);

  // Form data update helper
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  // Navigation functions
  const startConfigurator = useCallback(() => {
    setCurrentStep(0); // Go to template selection
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < configuratorSteps.length - 1) {
      updateFormDataFromInputs();
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep, configuratorSteps.length, updateFormDataFromInputs]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      updateFormDataFromInputs();
      setCurrentStep(prev => prev - 1);
    } else if (currentStep === 0) {
      // Go back to welcome page
      setCurrentStep(-1);
    }
  }, [currentStep, updateFormDataFromInputs]);

  // Back to Template Selection function
  const backToTemplates = useCallback(() => {
    updateFormDataFromInputs();
    setCurrentStep(0);
  }, [updateFormDataFromInputs]);

  // Save and publish functions
  const saveToBackend = useCallback(async (data: Partial<Configuration>) => {
    setSaveStatus('saving');
    try {
      const configData = {
        ...data,
        userId: sessionApi.getUserId()
      };

      if (currentConfigId) {
        configData.id = currentConfigId;
      }

      const result = await configurationApi.save(configData);

      if (result.success && result.data) {
        setCurrentConfigId(result.data.id || null);
        setSaveStatus('saved');
        localStorage.setItem('configuratorData', JSON.stringify(data));
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
    }
  }, [currentConfigId]);

  const publishConfiguration = useCallback(async () => {
    if (!currentConfigId) {
      await saveToBackend(formData as Partial<Configuration>);
      return;
    }
    
    setPublishStatus('publishing');
    try {
      const result = await configurationApi.publish(currentConfigId);
      
      if (result.success && result.data) {
        setPublishStatus('published');
        setPublishedUrl(result.data.publishedUrl || null);
      } else {
        setPublishStatus('error');
      }
    } catch (error) {
      setPublishStatus('error');
      console.error('Publish error:', error);
    }
  }, [currentConfigId, formData, saveToBackend]);

  // Progress calculation
  const progressPercentage = useMemo(() => {
    if (currentStep < 0) return 0;
    return ((currentStep + 1) / configuratorSteps.length) * 100;
  }, [currentStep, configuratorSteps.length]);

  // Current phase data
  const currentPhase = useMemo(() => {
    if (currentStep < 0) return null;
    return configuratorSteps[currentStep] || null;
  }, [currentStep, configuratorSteps]);

  // Enhanced Navigation component
  const Navigation = () => (
    <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <a href="/" className="text-3xl font-black bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">
                sync.a
              </a>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full opacity-75"></div>
            </div>
            
            {/* Progress indicator - only show when in configurator steps */}
            {currentStep >= 0 && (
              <div className="hidden md:flex items-center ml-8">
                <div className="flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-full">
                  <Settings className="w-4 h-4 text-teal-500" />
                  <span className="text-sm font-bold text-gray-700">
                    Step {currentStep + 1} of {configuratorSteps.length}
                  </span>
                  <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-teal-500 to-purple-500 h-1.5 rounded-full transition-transform duration-300 ease-out"
                      style={{ width: `${progressPercentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Save Status */}
            {currentStep >= 0 && (
              <div className="hidden lg:flex items-center space-x-2 ml-4">
                {saveStatus === 'saving' && (
                  <div className="flex items-center space-x-2 text-orange-600">
                    <Cloud className="w-4 h-4 animate-pulse" />
                    <span className="text-xs">Saving...</span>
                  </div>
                )}
                {saveStatus === 'saved' && (
                  <div className="flex items-center space-x-2 text-green-600">
                    <Check className="w-4 h-4" />
                    <span className="text-xs">Saved</span>
                  </div>
                )}
                {saveStatus === 'error' && (
                  <div className="flex items-center space-x-2 text-red-600">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-xs">Save failed</span>
                  </div>
                )}
              </div>
            )}

            {/* Phase indicator */}
            {currentPhase && (
              <div className="hidden lg:flex items-center space-x-2 bg-gradient-to-r from-teal-500/10 to-purple-500/10 px-3 py-1 rounded-full border border-teal-500/20">
                <Crown className="w-3 h-3 text-teal-600" />
                <span className="text-xs font-bold text-teal-700">
                  {currentPhase.phaseTitle}
                </span>
              </div>
            )}
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              {/* Back to Templates button - only show after template selection */}
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={backToTemplates}
                  className="border-purple-200 text-purple-700 hover:bg-purple-50"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Back to Templates
                </Button>
              )}
              
              {currentStep >= 0 && (
                <div className="flex items-center space-x-2">
                  {publishStatus === 'published' && publishedUrl ? (
                    <Button 
                      size="sm"
                      onClick={() => window.open(publishedUrl, '_blank')}
                      className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm font-bold rounded-full shadow-lg"
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      View Live Site
                    </Button>
                  ) : (
                    <Button 
                      size="sm"
                      onClick={publishConfiguration}
                      disabled={publishStatus === 'publishing'}
                      className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-6 py-2 text-sm font-bold rounded-full shadow-lg"
                    >
                      {publishStatus === 'publishing' ? (
                        <>
                          <Cloud className="w-4 h-4 mr-2 animate-pulse" />
                          Publishing...
                        </>
                      ) : (
                        <>
                          <Rocket className="w-4 h-4 mr-2" />
                          Publish Website
                        </>
                      )}
                    </Button>
                  )}
                </div>
              )}
            </div>
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
    </nav>
  );

  // Enhanced Interactive Live Preview Component
  const LivePreview = () => {
    const [previewState, setPreviewState] = useState({
      menuOpen: false,
      activePage: 'home',
      hoveredItem: null
    });
    
    const getBusinessName = () => {
      if (formData.businessName) return formData.businessName;
      // Use realistic names based on selected template for preview
      const templateNames = {
        'minimalist': 'Brew & Bean',
        'vibrant': 'Fusion Kitchen',
        'professional': 'Sterling Restaurant',
        'modern-dark': 'NEXUS Coffee'
      };
      const selectedId = currentStep === 0 ? (previewTemplateId || formData.template) : formData.template;
      return templateNames[selectedId] || 'Your Business';
    };
    
    const getTemplateStyles = () => {
      const selectedId = currentStep === 0 ? (previewTemplateId || formData.template) : formData.template;
      const selected = templates.find(t => t.id === selectedId);
      const baseStyles = selected ? selected.style : templates[0].style;
      
      return {
        ...baseStyles,
        userPrimary: formData.primaryColor,
        userSecondary: formData.secondaryColor
      };
    };

    const styles = getTemplateStyles();

    const getBusinessIcon = () => {
      switch (formData.businessType) {
        case 'cafe': return <Coffee className="w-5 h-5" />;
        case 'restaurant': return <Utensils className="w-5 h-5" />;
        default: return <Building className="w-5 h-5" />;
      }
    };

    // Get pages for navigation
    const getAvailablePages = () => {
      const pageMap = {
        'home': 'Home',
        'menu': 'Menu',
        'gallery': 'Gallery',
        'about': 'About',
        'reservations': 'Reservations',
        'contact': 'Contact'
      };

      return formData.selectedPages.map(pageId => ({
        id: pageId,
        name: pageMap[pageId] || pageId.charAt(0).toUpperCase() + pageId.slice(1)
      }));
    };

    // Sample content for realistic previews - template specific
    const selectedId = currentStep === 0 ? (previewTemplateId || formData.template) : formData.template;
    const templateContent = {
      'minimalist': {
        items: [
          { name: 'Artisan Coffee', description: 'Single origin, carefully roasted', price: '4.50' },
          { name: 'Avocado Toast', description: 'Fresh sourdough, organic avocado', price: '8.00' },
          { name: 'Matcha Latte', description: 'Premium ceremonial grade matcha', price: '5.25' }
        ],
        tagline: 'Simplicity meets excellence',
        description: 'Minimal design, maximum flavor'
      },
      'vibrant': {
        items: [
          { name: 'Dragon Bowl', description: 'Colorful superfood fusion bowl', price: '12.50' },
          { name: 'Neon Smoothie', description: 'Rainbow fruit blend, energizing', price: '7.00' },
          { name: 'Fusion Tacos', description: 'Asian-Mexican creative fusion', price: '9.25' }
        ],
        tagline: 'Bold flavors, vibrant experience',
        description: 'Where creativity meets cuisine'
      },
      'professional': {
        items: [
          { name: 'Prime Ribeye', description: 'Aged 28 days, chef signature', price: '42.00' },
          { name: 'Lobster Risotto', description: 'Maine lobster, saffron arborio', price: '36.00' },
          { name: 'Chocolate Soufflé', description: 'Classic French technique', price: '14.00' }
        ],
        tagline: 'Excellence in every detail',
        description: 'Fine dining at its finest'
      },
      'modern-dark': {
        items: [
          { name: 'NITRO COLD BREW', description: 'Smooth nitrogen-infused coffee', price: '5.50' },
          { name: 'TECH BOWL', description: 'Future food, plant-based protein', price: '11.00' },
          { name: 'DARK ROAST', description: 'Bold, intense, uncompromising', price: '4.25' }
        ],
        tagline: 'FUTURE OF COFFEE',
        description: 'Next-gen café experience'
      }
    };

    const currentContent = templateContent[selectedId] || templateContent['minimalist'];

    const sampleContent = {
      menuItems: formData.menuItems.length > 0 ? formData.menuItems : currentContent.items,
      tagline: formData.slogan || currentContent.tagline,
      businessDescription: formData.uniqueDescription || currentContent.description,
      reviews: [
        { name: 'Sarah M.', rating: 5, text: 'Amazing experience!' },
        { name: 'John D.', rating: 5, text: 'Love the atmosphere here.' }
      ],
      hours: formData.openingHours?.Monday ? formData.openingHours : {
        Monday: { open: '7:00', close: '19:00' },
        Tuesday: { open: '7:00', close: '19:00' },
        Wednesday: { open: '7:00', close: '19:00' }
      },
      galleryImages: formData.gallery.length > 0 ? formData.gallery : [
        { url: '/api/placeholder/300/300', alt: 'Our space' },
        { url: '/api/placeholder/300/300', alt: 'Fresh preparation' },
        { url: '/api/placeholder/300/300', alt: 'Signature items' },
        { url: '/api/placeholder/300/300', alt: 'Our team' }
      ]
    };

    const renderPreviewContent = () => {
      const selectedId = currentStep === 0 ? (previewTemplateId || formData.template) : formData.template;
      if (!selectedId) {
        return (
          <div className="h-full flex items-center justify-center bg-gray-50">
            <div className="text-center">
              <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-500">Choose a template to see preview</p>
            </div>
          </div>
        );
      }

      // Apply font family based on user selection
      const fontClass = fontOptions.find(f => f.id === formData.fontFamily)?.class || 'font-sans';

      // Common logo display component
      const LogoDisplay = () => {
        if (formData.logo) {
          return (
            <img
              src={typeof formData.logo === 'string' ? formData.logo : URL.createObjectURL(formData.logo)}
              alt="Business logo"
              className="w-8 h-8 object-contain rounded"
            />
          );
        }
        return getBusinessIcon();
      };

      // Render different templates based on selection with INTERACTIVE FEATURES
      const selectedIdForSwitch = currentStep === 0 ? (previewTemplateId || formData.template) : formData.template;
      switch (selectedIdForSwitch) {
        case 'minimalist':
          return (
            <div className={`h-full overflow-y-auto bg-white ${fontClass}`}>
              {/* Interactive Navigation */}
              <nav className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center" 
                           style={{ backgroundColor: `${styles.userPrimary}15` }}>
                        <div style={{ color: styles.userPrimary }}>
                          <LogoDisplay />
                        </div>
                      </div>
                      <h1 className="text-lg font-medium text-gray-900">{getBusinessName()}</h1>
                    </div>
                    <button 
                      className="p-2 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
                      onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                    >
                      <Menu className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  
                  {/* Interactive Menu Dropdown */}
                  {previewState.menuOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top duration-200">
                      <div className="space-y-1">
                        {getAvailablePages().map((page) => (
                          <button
                            key={page.id}
                            onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.id, menuOpen: false }))}
                            className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer ${
                              previewState.activePage === page.id
                                ? 'bg-gray-100 text-gray-900 font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                            }`}
                          >
                            {page.name}
                          </button>
                        ))}

                        {/* Reservation Button in Menu */}
                        {formData.reservationsEnabled && (
                          <div className="pt-2 mt-2 border-t border-gray-100">
                            <button
                              className="block w-full text-left px-3 py-2 text-sm rounded-md transition-colors cursor-pointer bg-teal-50 text-teal-700 hover:bg-teal-100"
                              style={{ backgroundColor: `${styles.userPrimary}15`, color: styles.userPrimary }}
                              onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: false }))}
                            >
                              <Calendar className="w-4 h-4 mr-2 inline" />
                              Reserve Table
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </nav>

              {/* Interactive Content Pages */}
              {previewState.activePage === 'home' && (
                <div className="px-6 py-8" style={{ backgroundColor: formData.backgroundColor }}>
                  <div className="text-center mb-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center" 
                         style={{ backgroundColor: `${styles.userPrimary}15` }}>
                      <div style={{ color: styles.userPrimary }} className="w-8 h-8 flex items-center justify-center">
                        <LogoDisplay />
                      </div>
                    </div>
                    <h2 className="text-2xl font-light text-gray-900 mb-2">{getBusinessName()}</h2>
                    <p className="text-gray-500 text-sm">{sampleContent.tagline}</p>
                    <p className="text-gray-400 text-xs mt-1">{sampleContent.businessDescription}</p>
                  </div>

                  {/* Interactive Menu Items */}
                  <div className="space-y-4">
                    {sampleContent.menuItems.slice(0, 3).map((item, index) => (
                      <div 
                        key={index} 
                        className="text-center border-b border-gray-100 pb-4 cursor-pointer hover:bg-gray-50 px-4 py-2 rounded transition-colors"
                        onMouseEnter={() => setPreviewState(prev => ({ ...prev, hoveredItem: index }))}
                        onMouseLeave={() => setPreviewState(prev => ({ ...prev, hoveredItem: null }))}
                      >
                        <h4 className="font-medium text-gray-900 mb-1">{item.name}</h4>
                        <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                        <span 
                          className={`text-lg font-light transition-all ${previewState.hoveredItem === index ? 'scale-110' : ''}`} 
                          style={{ color: styles.userPrimary }}
                        >
                          ${item.price}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Interactive Reservation Button */}
                  {formData.reservationsEnabled && (
                    <div className="mt-8 text-center">
                      <button
                        className="bg-teal-500 hover:bg-teal-600 text-white px-8 py-3 rounded-full font-medium transition-all hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: styles.userPrimary }}
                      >
                        <Calendar className="w-4 h-4 mr-2 inline" />
                        Reserve a Table
                      </button>
                    </div>
                  )}

                  {/* Enhanced Opening Hours Display */}
                  {Object.keys(sampleContent.hours).length > 0 && (
                    <div className="mt-8">
                      <Card className="p-4 bg-gray-50/50 border border-gray-200">
                        <div className="flex items-center justify-center mb-4">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3"
                               style={{ backgroundColor: `${styles.userPrimary}15` }}>
                            <Clock className="w-4 h-4" style={{ color: styles.userPrimary }} />
                          </div>
                          <h3 className="text-md font-medium text-gray-900">Opening Hours</h3>
                        </div>
                        <div className="space-y-2">
                          {Object.entries(sampleContent.hours).slice(0, 3).map(([day, hours]: [string, any]) => (
                            <div key={day} className="flex justify-between items-center py-1">
                              <span className="text-gray-700 text-sm font-medium">{day}</span>
                              <span className="text-gray-600 text-sm font-mono">
                                {hours.closed ? 'Closed' : `${hours.open} - ${hours.close}`}
                              </span>
                            </div>
                          ))}
                          {Object.keys(sampleContent.hours).length > 3 && (
                            <div className="text-center pt-2">
                              <span className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                View all hours →
                              </span>
                            </div>
                          )}
                        </div>
                      </Card>
                    </div>
                  )}
                </div>
              )}

              {previewState.activePage === 'menu' && (
                <div className="px-6 py-8">
                  <h2 className="text-xl font-medium text-gray-900 mb-6 text-center">Menu</h2>
                  <div className="space-y-6">
                    {sampleContent.menuItems.map((item, index) => (
                      <div key={index} className="border-b border-gray-100 pb-4 hover:bg-gray-50 px-4 py-2 rounded transition-colors cursor-pointer">
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-medium text-gray-900">{item.name}</h3>
                            <p className="text-sm text-gray-500 mt-1">{item.description}</p>
                          </div>
                          <span className="font-light text-lg ml-4" style={{ color: styles.userPrimary }}>${item.price}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewState.activePage === 'gallery' && formData.selectedPages.includes('gallery') && (
                <div className="px-6 py-8">
                  <h2 className="text-xl font-medium text-gray-900 mb-6 text-center">Gallery</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {sampleContent.galleryImages.map((image, index) => (
                      <div key={index} className="aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:scale-105 transition-transform">
                        <img
                          src={image.url}
                          alt={image.alt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {previewState.activePage === 'contact' && (
                <div className="px-6 py-8">
                  <h2 className="text-xl font-medium text-gray-900 mb-6 text-center">Contact</h2>
                  <div className="space-y-4 text-center">
                    {formData.location && (
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Location</h3>
                        <p className="text-gray-600 text-sm">{formData.location}</p>
                      </div>
                    )}
                    <div className="pt-4">
                      <h3 className="font-medium text-gray-900 mb-2">Get in Touch</h3>
                      <p className="text-gray-600 text-sm">Visit us today!</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );

        case 'vibrant':
          return (
            <div className={`h-full overflow-y-auto text-white ${fontClass}`} 
                 style={{ background: formData.backgroundType === 'color' ? formData.backgroundColor : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              {/* Interactive Navigation */}
              <nav className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                      <LogoDisplay />
                    </div>
                    <h1 className="text-xl font-black text-white">{getBusinessName()}</h1>
                  </div>
                  <button 
                    className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center hover:bg-white/30 transition-colors cursor-pointer"
                    onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                  >
                    <Menu className="w-4 h-4 text-white" />
                  </button>
                </div>

                {/* Full-Screen Interactive Menu */}
                {previewState.menuOpen && (
                  <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center animate-in fade-in duration-300">
                    <div className="text-center space-y-6">
                      {getAvailablePages().map((page, index) => (
                        <button
                          key={page.id}
                          onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.id, menuOpen: false }))}
                          className="block text-3xl font-black text-white hover:text-pink-300 transition-all duration-300 hover:scale-110 cursor-pointer"
                          style={{
                            animationDelay: `${index * 100}ms`,
                          }}
                        >
                          {page.name}
                        </button>
                      ))}
                      <button
                        onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: false }))}
                        className="mt-8 text-white/60 hover:text-white transition-colors"
                      >
                        <X className="w-8 h-8 mx-auto" />
                      </button>
                    </div>
                  </div>
                )}
              </nav>

              {/* Interactive Content */}
              {previewState.activePage === 'home' && (
                <div className="pt-8 px-4 text-center">
                  <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center">
                    <div style={{ color: styles.userPrimary }} className="w-10 h-10 flex items-center justify-center">
                      <LogoDisplay />
                    </div>
                  </div>
                  <h1 className="text-3xl font-black text-white mb-3">{getBusinessName()}</h1>
                  <p className="text-lg font-bold text-white/90 mb-2">{sampleContent.tagline}</p>
                  <p className="text-sm text-white/70 mb-6">{sampleContent.businessDescription}</p>
                  
                  {/* Interactive Creative Grid */}
                  <div className="grid grid-cols-2 gap-3 mt-8">
                    {sampleContent.menuItems.slice(0, 4).map((item, index) => (
                      <div 
                        key={index} 
                        className="bg-white/20 backdrop-blur rounded-2xl p-4 hover:bg-white/30 transition-all cursor-pointer hover:scale-105"
                        onMouseEnter={() => setPreviewState(prev => ({ ...prev, hoveredItem: index }))}
                        onMouseLeave={() => setPreviewState(prev => ({ ...prev, hoveredItem: null }))}
                      >
                        <h3 className="text-sm font-bold text-white">{item.name}</h3>
                        <p className="text-xs text-white/80 mt-1">{item.description}</p>
                        <div 
                          className={`text-lg font-black mt-2 transition-all ${previewState.hoveredItem === index ? 'scale-110' : ''}`} 
                          style={{ color: styles.userSecondary }}
                        >
                          ${item.price}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );

        case 'professional':
          return (
            <div className={`h-full overflow-y-auto bg-white ${fontClass}`}>
              {/* Professional Navigation */}
              <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                        <div style={{ color: styles.userPrimary }}>
                          <LogoDisplay />
                        </div>
                      </div>
                      <h1 className="text-lg font-semibold text-gray-900">{getBusinessName()}</h1>
                    </div>
                    <button 
                      className="p-2 hover:bg-gray-100 rounded transition-colors cursor-pointer"
                      onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                    >
                      <Menu className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                  
                  {/* Professional Dropdown */}
                  {previewState.menuOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-100 animate-in slide-in-from-top duration-200">
                      <div className="grid grid-cols-2 gap-2">
                        {getAvailablePages().map((page) => (
                          <button
                            key={page.id}
                            onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.id, menuOpen: false }))}
                            className={`text-left px-3 py-2 text-sm rounded transition-colors cursor-pointer ${
                              previewState.activePage === page.id
                                ? 'bg-blue-50 text-blue-900 font-semibold'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                            }`}
                          >
                            {page.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </nav>

              {/* Professional Content */}
              {previewState.activePage === 'home' && (
                <div className="p-4" style={{ backgroundColor: formData.backgroundColor }}>
                  <div className="text-center py-8 border-b border-gray-100">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-gray-100 flex items-center justify-center">
                      <div style={{ color: styles.userPrimary }} className="w-8 h-8 flex items-center justify-center">
                        <LogoDisplay />
                      </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">{getBusinessName()}</h1>
                    <p className="text-gray-600 font-medium">{sampleContent.tagline}</p>
                    <p className="text-gray-500 text-sm mt-1">{sampleContent.businessDescription}</p>
                  </div>

                  <div className="py-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-4">Featured Items</h2>
                    <div className="space-y-4">
                      {sampleContent.menuItems.slice(0, 3).map((item, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900">{item.name}</h3>
                              <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                            </div>
                            <div className="text-lg font-bold ml-4" style={{ color: styles.userPrimary }}>${item.price}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );

        case 'modern-dark':
          return (
            <div className={`h-full overflow-y-auto bg-gray-900 text-white ${fontClass}`}>
              {/* Modern Header */}
              <nav className="bg-gray-800/90 backdrop-blur border-b border-gray-700 sticky top-0 z-50">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center">
                        <div style={{ color: styles.userPrimary }}>
                          <LogoDisplay />
                        </div>
                      </div>
                      <h1 className="text-white font-mono text-lg">{getBusinessName()}</h1>
                    </div>
                    <button 
                      className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors cursor-pointer"
                      onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                    >
                      <Menu className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                  
                  {/* Modern Slide Menu */}
                  {previewState.menuOpen && (
                    <div className="mt-3 pt-3 border-t border-gray-700 animate-in slide-in-from-top duration-200">
                      <div className="space-y-1">
                        {getAvailablePages().map((page) => (
                          <button
                            key={page.id}
                            onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.id, menuOpen: false }))}
                            className={`w-full text-left px-3 py-2 text-sm font-mono rounded transition-all cursor-pointer ${
                              previewState.activePage === page.id
                                ? 'bg-green-500/20 text-green-400 border-l-2 border-green-400'
                                : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                            }`}
                          >
                            {page.id}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </nav>

              {/* Modern Content */}
              {previewState.activePage === 'home' && (
                <div className="p-4" style={{ backgroundColor: formData.backgroundType === 'color' && formData.backgroundColor !== '#FFFFFF' ? formData.backgroundColor : undefined }}>
                  <div className="bg-black/80 backdrop-blur-sm rounded-2xl p-6 mb-4 border border-green-500/30">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500/20 border border-green-500/50 flex items-center justify-center">
                        <div style={{ color: styles.userPrimary }} className="w-8 h-8 flex items-center justify-center">
                          <LogoDisplay />
                        </div>
                      </div>
                      <div>
                        <h1 className="text-xl font-bold text-white font-mono tracking-wider">{getBusinessName()}</h1>
                        <p className="text-sm text-green-400 font-mono uppercase tracking-widest">{sampleContent.tagline}</p>
                        <p className="text-xs text-gray-400 font-mono mt-1">{sampleContent.businessDescription}</p>
                      </div>
                    </div>
                  </div>

                  {/* Modular Grid with Tech Styling */}
                  <div className="grid gap-3">
                    {sampleContent.menuItems.slice(0, 3).map((item, index) => (
                      <div key={index} className="bg-gray-900/80 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50 hover:border-green-500/50 transition-all cursor-pointer group">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wide group-hover:text-green-400 transition-colors">{item.name}</h3>
                            <p className="text-xs text-gray-400 mt-1 font-mono">{item.description}</p>
                          </div>
                          <div className="text-sm font-mono font-bold text-green-400 bg-green-500/10 px-2 py-1 rounded border border-green-500/30">${item.price}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );

        default:
          return renderPreviewContent();
      }
    };

    return (
      <div className="sticky top-24 h-[calc(100vh-6rem)]">
        <div className="h-full flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" className="p-2">
                <Smartphone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm" className="p-2">
                <Monitor className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Logo Upload Section - Only show until Step 2 */}
          {currentStep >= 1 && currentStep <= 2 && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-bold text-gray-700 mb-3">Business Logo</h4>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                  {formData.logo ? (
                    <img
                      src={typeof formData.logo === 'string' ? formData.logo : URL.createObjectURL(formData.logo)}
                      alt="Logo preview"
                      className="w-full h-full object-contain rounded"
                    />
                  ) : (
                    <Building className="w-6 h-6 text-gray-400" />
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('logo-preview-upload')?.click()}
                  className="text-xs"
                >
                  <Upload className="w-3 h-3 mr-1" />
                  {formData.logo ? 'Change' : 'Upload'}
                </Button>
                <input
                  id="logo-preview-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateFormData('logo', file);
                    }
                  }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB</p>
            </div>
          )}
          
          <div className="flex-1 flex items-center justify-center">
            <div className="relative">
              <div className="w-64 h-[520px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-xl z-20"></div>
                  <div className="h-full relative transition-all duration-500 ease-in-out">
                    {renderPreviewContent()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Welcome Page Component - Simplified and Clean
  const WelcomePage = () => (
    <div className="min-h-[calc(100vh-5rem)] bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-4">
              Build Your Perfect <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">Web App</span>
            </h1>
            <p className="text-lg text-gray-600 mb-6 leading-relaxed">
              Create a professional web app for your business in minutes. Choose a template, preview it live, customize, and publish.
            </p>
            <ul className="space-y-2 text-gray-700 mb-8">
              <li className="flex items-center"><Check className="w-4 h-4 text-teal-600 mr-2"/> Live app-like template previews</li>
              <li className="flex items-center"><Check className="w-4 h-4 text-teal-600 mr-2"/> Minimal, fast, and clean flow</li>
              <li className="flex items-center"><Check className="w-4 h-4 text-teal-600 mr-2"/> One-click publish</li>
            </ul>
            <Button
              onClick={startConfigurator}
              size="lg"
              className="inline-flex items-center justify-center gap-2 whitespace-nowrap bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-8 py-6 text-lg font-bold rounded-full shadow-xl hover:scale-105 transition-all duration-300"
            >
              <Sparkles className="w-5 h-5" />
              Let's Get Started
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <div className="hidden lg:block">
            <div className="w-full h-80 bg-gradient-to-br from-teal-50 to-purple-50 border border-gray-200 rounded-2xl flex items-center justify-center">
              <div className="text-center">
                <Palette className="w-10 h-10 text-teal-500 mx-auto mb-3" />
                <p className="text-gray-600">Start by choosing a template on the next step</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Template Selection with Live Preview
  const TemplateStep = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(previewTemplateId || formData.template);

    const handleTemplateClick = (templateId: string) => {
      setSelectedTemplate(templateId);
      setPreviewTemplateId(templateId);
    };

    const handleUseTemplate = () => {
      if (selectedTemplate) {
        updateFormData('template', selectedTemplate);
        nextStep();
      }
    };

    return (
      <div className="py-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">
            Choose Your <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">Template</span>
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Click on a template to see a live preview. Each template is designed for real web apps.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Template Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Available Templates</h3>
            {templates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  selectedTemplate === template.id
                    ? 'border-teal-500 bg-teal-50 shadow-lg'
                    : 'border-gray-200 hover:border-teal-300 hover:shadow-md'
                }`}
                onClick={() => handleTemplateClick(template.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className={`w-4 h-4 rounded-full mr-3 ${template.preview}`}></div>
                        <h4 className="text-lg font-bold text-gray-900">{template.name}</h4>
                        {selectedTemplate === template.id && (
                          <Check className="w-5 h-5 text-teal-600 ml-2" />
                        )}
                      </div>
                      <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {template.features.map((feature, index) => (
                          <span key={index} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ml-4">
                      <Eye className={`w-6 h-6 ${selectedTemplate === template.id ? 'text-teal-600' : 'text-gray-400'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Use Template Button */}
            {selectedTemplate && (
              <Card className="p-6 bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200">
                <div className="text-center">
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Ready to use this template?</h4>
                  <p className="text-gray-600 text-sm mb-4">
                    You're previewing: <strong>{templates.find(t => t.id === selectedTemplate)?.name}</strong>
                  </p>
                  <Button
                    onClick={handleUseTemplate}
                    size="lg"
                    className="bg-gradient-to-r from-teal-500 to-purple-500 hover:from-teal-600 hover:to-purple-600 text-white font-bold"
                  >
                    <Sparkles className="mr-2 w-5 h-5" />
                    Use This Template
                    <ChevronRight className="ml-2 w-5 h-5" />
                  </Button>
                </div>
              </Card>
            )}
          </div>

          {/* Live Preview */}
          <div className="sticky top-8">
            <div className="bg-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
                <div className="flex space-x-2">
                  <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                </div>
              </div>

              <div className="flex justify-center">
                <div className="w-64 h-[480px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                  <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-xl z-20"></div>
                    <div className="h-full relative transition-all duration-500 ease-in-out">
                      {selectedTemplate ? (
                        <LivePreview />
                      ) : (
                        <div className="h-full flex items-center justify-center bg-gray-50">
                          <div className="text-center">
                            <Palette className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                            <p className="text-sm text-gray-500">Click a template to see preview</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-8">
          <Button onClick={prevStep} variant="outline" size="lg">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to Welcome
          </Button>
          <div className="text-center">
            <p className="text-sm text-gray-500">
              {selectedTemplate ? 'Click "Use This Template" to continue' : 'Select a template to see live preview'}
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Business Information (Step 1)
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
            defaultValue={formData.businessName}
            ref={setInputRef('businessName')}
            onBlur={handleInputBlur('businessName')}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            className="w-full px-4 py-3 text-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
            autoComplete="organization"
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
              defaultValue={formData.location}
              ref={setInputRef('location')}
              onBlur={handleInputBlur('location')}
              onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
              className="w-full pl-10 px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
              autoComplete="street-address"
            />
          </div>
        </div>

        {/* Slogan */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Slogan (Optional)</label>
          <Input
            type="text"
            placeholder="e.g. The best coffee in town"
            defaultValue={formData.slogan}
            ref={setInputRef('slogan')}
            onBlur={handleInputBlur('slogan')}
            onKeyDown={(e) => e.key === 'Enter' && e.preventDefault()}
            className="w-full px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
        </div>

        {/* Unique Description */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">What makes your business unique?</label>
          <Textarea
            placeholder="Tell us what sets you apart from the competition..."
            defaultValue={formData.uniqueDescription}
            ref={setInputRef('uniqueDescription')}
            onBlur={handleInputBlur('uniqueDescription')}
            className="w-full px-4 py-3 h-24 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all resize-none"
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

  // Design Customization (Step 2)
  const DesignCustomizationStep = () => (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Customize your design
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose colors, fonts and styling that represent your business personality and create a memorable brand experience.
        </p>
      </div>

      <div className="space-y-12">
        {/* Color Themes */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Color Themes</label>
          <p className="text-sm text-gray-500 mb-6">Choose a preset or customize your own colors below</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { primary: '#2563EB', secondary: '#7C3AED', name: 'Ocean', accent: '#0EA5E9' },
              { primary: '#059669', secondary: '#10B981', name: 'Forest', accent: '#22C55E' },
              { primary: '#DC2626', secondary: '#F59E0B', name: 'Sunset', accent: '#F97316' },
              { primary: '#7C2D12', secondary: '#EA580C', name: 'Autumn', accent: '#F59E0B' },
              { primary: '#1F2937', secondary: '#374151', name: 'Elegant', accent: '#6B7280' },
              { primary: '#BE185D', secondary: '#EC4899', name: 'Vibrant', accent: '#F472B6' },
              { primary: '#6366F1', secondary: '#8B5CF6', name: 'Purple', accent: '#A855F7' },
              { primary: '#0891B2', secondary: '#06B6D4', name: 'Sky', accent: '#38BDF8' }
            ].map((preset, index) => {
              const isSelected = formData.primaryColor === preset.primary && formData.secondaryColor === preset.secondary;
              return (
                <button
                  key={index}
                  onClick={() => {
                    updateFormData('primaryColor', preset.primary);
                    updateFormData('secondaryColor', preset.secondary);
                  }}
                  className={`flex flex-col items-center p-4 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:scale-105 ${
                    isSelected 
                      ? 'border-teal-500 bg-teal-50 shadow-lg transform scale-105' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="relative mb-3">
                    <div className="flex space-x-1">
                      <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: preset.primary }}></div>
                      <div className="w-8 h-8 rounded-lg shadow-sm" style={{ backgroundColor: preset.secondary }}></div>
                    </div>
                    {isSelected && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-4 h-4 bg-teal-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </div>
                      </div>
                    )}
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    isSelected ? 'text-teal-700' : 'text-gray-700'
                  }`}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Section */}
        <div className="bg-gray-50 rounded-2xl p-8">
          <h3 className="text-xl font-bold text-gray-900 mb-6 text-center">Custom Colors</h3>
          <div className="grid md:grid-cols-2 gap-8">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">Primary Color</label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="color"
                    value={formData.primaryColor}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateFormData('primaryColor', e.target.value);
                    }}
                    className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-all hover:scale-105 shadow-sm"
                    style={{ WebkitAppearance: 'none', padding: '4px' }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formData.primaryColor}
                    onChange={(e) => updateFormData('primaryColor', e.target.value)}
                    className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    placeholder="#2563EB"
                  />
                  <p className="text-xs text-gray-500 mt-1">Main brand color</p>
                </div>
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-4">Secondary Color</label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <input
                    type="color"
                    value={formData.secondaryColor}
                    onChange={(e) => {
                      e.stopPropagation();
                      updateFormData('secondaryColor', e.target.value);
                    }}
                    className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-all hover:scale-105 shadow-sm"
                    style={{ WebkitAppearance: 'none', padding: '4px' }}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    type="text"
                    value={formData.secondaryColor}
                    onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                    className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                    placeholder="#7C3AED"
                  />
                  <p className="text-xs text-gray-500 mt-1">Accent color</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Font Selection */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Typography Style</label>
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
                  <div className="text-xs text-gray-500 mt-2">{font.description}</div>
                  {formData.fontFamily === font.id && (
                    <div className="mt-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Background Style - Only Color and Gradient */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Background Style</label>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                formData.backgroundType === 'color' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
              }`}
              onClick={() => updateFormData('backgroundType', 'color')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-full h-16 rounded-lg mb-3 bg-white border-2 border-gray-300"></div>
                <div className="text-sm font-bold text-gray-900">Solid Color</div>
                {formData.backgroundType === 'color' && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                formData.backgroundType === 'gradient' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
              }`}
              onClick={() => updateFormData('backgroundType', 'gradient')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-full h-16 rounded-lg mb-3 bg-gradient-to-br from-blue-400 to-purple-600"></div>
                <div className="text-sm font-bold text-gray-900">Gradient</div>
                {formData.backgroundType === 'gradient' && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {formData.backgroundType === 'color' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Background Color</label>
              <div className="flex items-center space-x-4">
                <input
                  type="color"
                  value={formData.backgroundColor}
                  onChange={(e) => updateFormData('backgroundColor', e.target.value)}
                  className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300"
                />
                <Input
                  type="text"
                  value={formData.backgroundColor}
                  onChange={(e) => updateFormData('backgroundColor', e.target.value)}
                  className="font-mono"
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
          )}

          {formData.backgroundType === 'gradient' && (
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-3">Gradient Colors</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-2">Start Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="font-mono text-sm"
                      placeholder="#2563EB"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-600 mb-2">End Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                      className="font-mono text-sm"
                      placeholder="#7C3AED"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
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

  // Page Structure Step
  const PageStructureStep = () => (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Select your pages
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose which pages your website will include. You can always add more later.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pageOptions.map((page) => {
          const isSelected = formData.selectedPages.includes(page.id);
          const isVisible = !page.condition || page.condition.includes(formData.businessType);

          if (!isVisible) return null;

          return (
            <Card
              key={page.id}
              className={`cursor-pointer transition-all duration-300 border-2 ${
                isSelected ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
              } ${page.required ? 'opacity-75' : ''}`}
              onClick={() => {
                if (page.required) return;
                const newPages = isSelected
                  ? formData.selectedPages.filter(p => p !== page.id)
                  : [...formData.selectedPages, page.id];
                updateFormData('selectedPages', newPages);
              }}
            >
              <CardContent className="p-6 text-center">
                <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-r ${
                  isSelected ? 'from-teal-500 to-purple-500' : 'from-gray-400 to-gray-500'
                } flex items-center justify-center text-white`}>
                  {page.icon}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">{page.name}</h3>
                {page.required && (
                  <p className="text-xs text-gray-500">Required</p>
                )}
                {isSelected && !page.required && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Page-Specific Configuration Info */}
      {formData.selectedPages.length > 1 && (
        <Card className="p-6 mt-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Selected Pages Configuration</h3>
          <p className="text-gray-600 text-sm mb-4">
            You've selected multiple pages. During the next steps, you'll be able to configure specific content for each page:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {formData.selectedPages.map((pageId) => {
              const pageInfo = {
                home: { name: 'Home', config: 'Business info, hero section, featured content' },
                menu: { name: 'Menu', config: 'Menu items, categories, pricing' },
                gallery: { name: 'Gallery', config: 'Photo uploads, image organization' },
                about: { name: 'About', config: 'Business story, team members, mission' },
                reservations: { name: 'Reservations', config: 'Booking system, time slots, policies' },
                contact: { name: 'Contact', config: 'Contact details, location, hours' }
              };

              const page = pageInfo[pageId];
              if (!page) return null;

              return (
                <div key={pageId} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">{page.name}</h4>
                  <p className="text-xs text-gray-600">{page.config}</p>
                </div>
              );
            })}
          </div>
        </Card>
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

  // Additional step components
  const OpeningHoursStep = () => {
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Set your opening hours
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            When are you open for business? This helps customers know when to visit.
          </p>
        </div>

        <div className="space-y-4">
          {days.map((day) => {
            const hours = formData.openingHours[day] || { open: '09:00', close: '17:00', closed: false };

            return (
              <Card key={day} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-24">
                      <h3 className="font-semibold text-gray-900">{day}</h3>
                    </div>
                    <Button
                      variant={hours.closed ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newHours = {
                          ...formData.openingHours,
                          [day]: { ...hours, closed: !hours.closed }
                        };
                        updateFormData('openingHours', newHours);
                      }}
                    >
                      {hours.closed ? 'Closed' : 'Open'}
                    </Button>
                  </div>

                  {!hours.closed && (
                    <div className="flex items-center space-x-2">
                      <Input
                        type="time"
                        defaultValue={hours.open}
                        onChange={(e) => {
                          const newHours = {
                            ...formData.openingHours,
                            [day]: { ...hours, open: e.target.value }
                          };
                          updateFormData('openingHours', newHours);
                        }}
                        className="w-32"
                      />
                      <span className="text-gray-500">to</span>
                      <Input
                        type="time"
                        defaultValue={hours.close}
                        onChange={(e) => {
                          const newHours = {
                            ...formData.openingHours,
                            [day]: { ...hours, close: e.target.value }
                          };
                          updateFormData('openingHours', newHours);
                        }}
                        className="w-32"
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
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
  };

  const MenuProductsStep = () => {
    const [newItem, setNewItem] = useState({ name: '', description: '', price: '' });

    const addMenuItem = () => {
      if (newItem.name && newItem.price) {
        const updatedItems = [...formData.menuItems, { ...newItem, id: Date.now().toString() }];
        updateFormData('menuItems', updatedItems);
        setNewItem({ name: '', description: '', price: '' });
      }
    };

    const removeMenuItem = (index: number) => {
      const updatedItems = formData.menuItems.filter((_, i) => i !== index);
      updateFormData('menuItems', updatedItems);
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Add your menu or products
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Showcase what you offer. You can add items manually or upload your menu.
          </p>
        </div>

        {/* Upload Options */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-2xl flex items-center justify-center">
                <Camera className="w-8 h-8 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Menu Image</h3>
              <p className="text-gray-600 text-sm mb-4">Upload a photo of your existing menu</p>
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-orange-300 hover:border-orange-400 hover:bg-orange-50 text-orange-700"
                onClick={() => document.getElementById('menu-img-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose Image File
              </Button>
              <input
                id="menu-img-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    updateFormData('menuPdf', file);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">JPG, PNG up to 10MB</p>
            </div>
          </Card>

          <Card className="p-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                <Upload className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Upload CSV File</h3>
              <p className="text-gray-600 text-sm mb-4">Upload structured menu data as CSV</p>
              <Button
                variant="outline"
                className="w-full border-2 border-dashed border-green-300 hover:border-green-400 hover:bg-green-50 text-green-700"
                onClick={() => document.getElementById('csv-upload')?.click()}
              >
                <Upload className="w-4 h-4 mr-2" />
                Choose CSV File
              </Button>
              <input
                id="csv-upload"
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    // Handle CSV file processing here
                    console.log('CSV file uploaded:', file);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">Format: name,description,price</p>
            </div>
          </Card>
        </div>

        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4">
            <div className="h-px bg-gray-300 flex-1"></div>
            <span className="text-gray-500 font-medium">OR</span>
            <div className="h-px bg-gray-300 flex-1"></div>
          </div>
        </div>

        {/* Add New Item Form */}
        <Card className="p-6 mb-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Item</h3>
          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Item Name *</label>
              <Input
                type="text"
                placeholder="e.g. Signature Latte"
                value={newItem.name}
                onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Description</label>
              <Input
                type="text"
                placeholder="Brief description"
                value={newItem.description}
                onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                className="w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Price *</label>
              <div className="flex">
                <Input
                  type="number"
                  step="0.01"
                  placeholder="9.99"
                  value={newItem.price}
                  onChange={(e) => setNewItem(prev => ({ ...prev, price: e.target.value }))}
                  className="flex-1"
                />
                <Button
                  onClick={addMenuItem}
                  disabled={!newItem.name || !newItem.price}
                  className="ml-2 bg-teal-500 hover:bg-teal-600"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Menu Items List */}
        {formData.menuItems.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-lg font-bold text-gray-900">Your Menu Items</h3>
            {formData.menuItems.map((item, index) => (
              <Card key={index} className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{item.name}</h4>
                    {item.description && (
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-lg font-bold text-teal-600">${item.price}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeMenuItem(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
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
  };

  const ReservationsStep = () => (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Setup reservations
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Enable table bookings for your business. Perfect for restaurants and cafés.
        </p>
      </div>

      <div className="space-y-8">
        {/* Enable Reservations Toggle */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Enable Reservations</h3>
              <p className="text-gray-600">Allow customers to book tables online</p>
            </div>
            <Button
              variant={formData.reservationsEnabled ? "default" : "outline"}
              onClick={() => updateFormData('reservationsEnabled', !formData.reservationsEnabled)}
              className={formData.reservationsEnabled ? 'bg-teal-500 hover:bg-teal-600' : ''}
            >
              {formData.reservationsEnabled ? 'Enabled' : 'Disabled'}
            </Button>
          </div>
        </Card>

        {formData.reservationsEnabled && (
          <>
            {/* Maximum Guests */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Booking Settings</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Maximum party size</label>
                  <Input
                    type="number"
                    min="1"
                    max="50"
                    defaultValue={formData.maxGuests.toString()}
                    onChange={(e) => updateFormData('maxGuests', parseInt(e.target.value) || 10)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Notification method</label>
                  <select
                    value={formData.notificationMethod}
                    onChange={(e) => updateFormData('notificationMethod', e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  >
                    <option value="email">Email</option>
                    <option value="phone">Phone</option>
                    <option value="both">Email & Phone</option>
                  </select>
                </div>
              </div>
            </Card>

            {/* Time Slots */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Available Time Slots</h3>
              <p className="text-gray-600 mb-4">Set the times when customers can make reservations</p>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Array.from({ length: 14 }, (_, i) => {
                  const hour = 10 + i;
                  const time = `${hour}:00`;
                  const isSelected = formData.timeSlots.includes(time);

                  return (
                    <Button
                      key={time}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        const newSlots = isSelected
                          ? formData.timeSlots.filter(slot => slot !== time)
                          : [...formData.timeSlots, time];
                        updateFormData('timeSlots', newSlots);
                      }}
                      className={isSelected ? 'bg-teal-500 hover:bg-teal-600' : ''}
                    >
                      {time}
                    </Button>
                  );
                })}
              </div>
            </Card>
          </>
        )}
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

  const ContactSocialStep = () => {
    const contactMethods = [
      { id: 'phone', icon: <Phone className="w-5 h-5" />, label: 'Phone', placeholder: '+1 (555) 123-4567' },
      { id: 'email', icon: <Mail className="w-5 h-5" />, label: 'Email', placeholder: 'hello@yourbusiness.com' },
      { id: 'address', icon: <MapPin className="w-5 h-5" />, label: 'Address', placeholder: '123 Main St, City, State' }
    ];

    const socialPlatforms = [
      { id: 'instagram', icon: <Instagram className="w-5 h-5" />, label: 'Instagram', placeholder: '@yourbusiness' },
      { id: 'facebook', icon: <Facebook className="w-5 h-5" />, label: 'Facebook', placeholder: 'facebook.com/yourbusiness' }
    ];

    const getContactValue = (methodId: string) => {
      if (!formData.contactMethods) return '';
      if (Array.isArray(formData.contactMethods)) {
        const contact = formData.contactMethods.find(c => c.type === methodId);
        return contact ? contact.value : '';
      }
      return formData.contactMethods[methodId] || '';
    };

    const getSocialValue = (platformId: string) => {
      if (!formData.socialMedia) return '';
      return formData.socialMedia[platformId] || '';
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Contact & social media
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            How can customers reach you? Add your contact information and social media links.
          </p>
        </div>

        <div className="space-y-8">
          {/* Contact Information */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Contact Information</h3>
            <div className="space-y-4">
              {contactMethods.map((method) => (
                <div key={method.id}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{method.label}</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400">
                      {method.icon}
                    </div>
                    <Input
                      type="text"
                      placeholder={method.placeholder}
                      defaultValue={getContactValue(method.id)}
                      ref={setInputRef(`contact_${method.id}`)}
                      onBlur={handleInputBlur(`contact_${method.id}`)}
                      className="pl-12"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Social Media */}
          <Card className="p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Social Media</h3>
            <div className="space-y-4">
              {socialPlatforms.map((platform) => (
                <div key={platform.id}>
                  <label className="block text-sm font-bold text-gray-700 mb-2">{platform.label}</label>
                  <div className="relative">
                    <div className="absolute left-3 top-3 text-gray-400">
                      {platform.icon}
                    </div>
                    <Input
                      type="text"
                      placeholder={platform.placeholder}
                      defaultValue={getSocialValue(platform.id)}
                      ref={setInputRef(`social_${platform.id}`)}
                      onBlur={handleInputBlur(`social_${platform.id}`)}
                      className="pl-12"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Instagram Sync */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-md font-bold text-gray-900">Instagram Integration</h4>
                  <p className="text-sm text-gray-600">Automatically sync your Instagram posts to your website</p>
                </div>
                <Button
                  variant={formData.instagramSync ? "default" : "outline"}
                  onClick={() => updateFormData('instagramSync', !formData.instagramSync)}
                  className={formData.instagramSync ? 'bg-teal-500 hover:bg-teal-600' : ''}
                >
                  {formData.instagramSync ? 'Enabled' : 'Disabled'}
                </Button>
              </div>
            </div>
          </Card>
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
  };

  // Media Gallery Step (Step 9)
  const MediaGalleryStep = () => {
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

    const handleFileUpload = (files: FileList | null) => {
      if (files) {
        const newFiles = Array.from(files);
        setSelectedFiles(prev => [...prev, ...newFiles]);
        const updatedGallery = [...formData.gallery, ...newFiles.map(file => ({
          url: URL.createObjectURL(file),
          alt: file.name,
          file: file
        }))];
        updateFormData('gallery', updatedGallery);
      }
    };

    const removeImage = (index: number) => {
      const updatedGallery = formData.gallery.filter((_, i) => i !== index);
      updateFormData('gallery', updatedGallery);
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Upload your photos
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Show off your space, food, and atmosphere. High-quality images help attract customers and showcase your business personality.
          </p>
        </div>

        {/* Upload Zone */}
        <Card className="p-8 mb-8">
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
            <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-gray-900 mb-2">Upload Photos</h3>
            <p className="text-gray-600 mb-4">Drag and drop your images or click to browse</p>
            <Button
              variant="outline"
              size="lg"
              onClick={() => document.getElementById('gallery-upload')?.click()}
              className="border-2 border-teal-300 hover:border-teal-400 hover:bg-teal-50 text-teal-700"
            >
              <Upload className="w-5 h-5 mr-2" />
              Choose Images
            </Button>
            <input
              id="gallery-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileUpload(e.target.files)}
            />
            <p className="text-xs text-gray-500 mt-4">JPG, PNG up to 5MB each • Maximum 20 images</p>
          </div>
        </Card>

        {/* Gallery Preview */}
        {formData.gallery.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-bold text-gray-900 mb-6">Your Gallery</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {formData.gallery.map((image, index) => (
                <div key={index} className="relative group">
                  <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors duration-300 flex items-center justify-center">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeImage(index)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
  };

  // Advanced Features Step (Step 10)
  const AdvancedFeaturesStep = () => {
    const features = [
      {
        id: 'onlineOrdering',
        title: 'Online Ordering',
        description: 'Allow customers to place orders directly from your website',
        icon: <ShoppingBag className="w-8 h-8" />,
        premium: false
      },
      {
        id: 'onlineStore',
        title: 'Online Store',
        description: 'Sell products and merchandise online with payment processing',
        icon: <Store className="w-8 h-8" />,
        premium: true
      },
      {
        id: 'teamArea',
        title: 'Team Section',
        description: 'Showcase your team members and their roles',
        icon: <Users className="w-8 h-8" />,
        premium: false
      }
    ];

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Optional features
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Enable advanced functionality to enhance your website and provide better customer experience.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const isEnabled = formData[feature.id];
            return (
              <Card
                key={feature.id}
                className={`cursor-pointer transition-all duration-300 border-2 ${
                  isEnabled ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                }`}
                onClick={() => updateFormData(feature.id, !isEnabled)}
              >
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                    isEnabled ? 'bg-teal-500 text-white' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {feature.icon}
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{feature.title}</h3>
                  {feature.premium && (
                    <div className="mb-2">
                      <span className="px-2 py-1 bg-gradient-to-r from-orange-400 to-red-500 text-white text-xs font-bold rounded-full">
                        Premium
                      </span>
                    </div>
                  )}
                  <p className="text-gray-600 text-sm mb-4">{feature.description}</p>
                  {isEnabled && (
                    <div className="mt-2">
                      <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
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
  };

  // Domain & Hosting Step (Step 11)
  const DomainHostingStep = () => {
    const [domainSearch, setDomainSearch] = useState('');
    const [availableDomains, setAvailableDomains] = useState([
      { domain: 'yourbusiness.com', available: true, price: '$12.99/year' },
      { domain: 'yourbusiness.net', available: true, price: '$13.99/year' },
      { domain: 'yourbusiness.org', available: false, price: 'Taken' }
    ]);

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose your domain
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select how customers will find your website. You can use your own domain or get a free subdomain.
          </p>
        </div>

        <div className="space-y-8">
          {/* Domain Options */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                !formData.hasDomain ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
              }`}
              onClick={() => updateFormData('hasDomain', false)}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-2xl flex items-center justify-center">
                  <Zap className="w-8 h-8 text-green-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Free Subdomain</h3>
                <p className="text-gray-600 text-sm mb-4">Get started quickly with a free subdomain</p>
                <div className="text-green-600 font-bold">FREE</div>
                {!formData.hasDomain && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                formData.hasDomain ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
              }`}
              onClick={() => updateFormData('hasDomain', true)}
            >
              <CardContent className="p-6 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-blue-100 rounded-2xl flex items-center justify-center">
                  <Globe className="w-8 h-8 text-blue-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">Custom Domain</h3>
                <p className="text-gray-600 text-sm mb-4">Professional domain for your business</p>
                <div className="text-blue-600 font-bold">From $12.99/year</div>
                {formData.hasDomain && (
                  <div className="mt-2">
                    <div className="w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center mx-auto">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Free Subdomain Setup */}
          {!formData.hasDomain && (
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Your Free Website URL</h3>
              <div className="flex items-center space-x-2">
                <Input
                  type="text"
                  placeholder="yourbusiness"
                  defaultValue={formData.businessName.toLowerCase().replace(/\s+/g, '')}
                  onChange={(e) => updateFormData('selectedDomain', e.target.value)}
                  className="flex-1"
                />
                <span className="text-gray-500 font-mono">.sync-a.com</span>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Your website will be available at: {(formData.selectedDomain || formData.businessName.toLowerCase().replace(/\s+/g, ''))}.sync-a.com
              </p>
            </Card>
          )}

          {/* Custom Domain Setup */}
          {formData.hasDomain && (
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Find Your Perfect Domain</h3>
              <div className="flex space-x-2 mb-4">
                <Input
                  type="text"
                  placeholder="Enter domain name"
                  value={domainSearch}
                  onChange={(e) => setDomainSearch(e.target.value)}
                  className="flex-1"
                />
                <Button variant="outline">
                  Search
                </Button>
              </div>

              <div className="space-y-3">
                {availableDomains.map((domain, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${domain.available ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <span className="font-mono font-medium">{domain.domain}</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <span className={`text-sm ${domain.available ? 'text-green-600' : 'text-red-600'}`}>
                        {domain.price}
                      </span>
                      {domain.available && (
                        <Button
                          size="sm"
                          className="bg-teal-500 hover:bg-teal-600"
                          onClick={() => updateFormData('domainName', domain.domain)}
                        >
                          Select
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
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
  };

  // Preview & Adjustments Step (Step 12)
  const PreviewAdjustmentsStep = () => {
    const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');

    return (
      <div className="py-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Preview & final tweaks
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Review your website and make any final adjustments before going live.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Quick Settings */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Adjustments</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Website Title</label>
                  <Input
                    type="text"
                    defaultValue={formData.businessName}
                    onChange={(e) => updateFormData('businessName', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Tagline</label>
                  <Input
                    type="text"
                    defaultValue={formData.slogan}
                    onChange={(e) => updateFormData('slogan', e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Primary Color</label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Performance Score</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Speed</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full w-4/5"></div>
                    </div>
                    <span className="text-sm font-bold text-green-600">95</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">SEO</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full w-5/6"></div>
                    </div>
                    <span className="text-sm font-bold text-blue-600">92</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Mobile</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-500 h-2 rounded-full w-full"></div>
                    </div>
                    <span className="text-sm font-bold text-purple-600">100</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Enhanced Preview */}
          <div className="lg:col-span-2">
            <div className="bg-gray-100 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Live Preview</h3>
                <div className="flex space-x-2">
                  <Button
                    variant={previewMode === 'mobile' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('mobile')}
                  >
                    <Smartphone className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={previewMode === 'desktop' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('desktop')}
                  >
                    <Monitor className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="flex justify-center">
                {previewMode === 'mobile' ? (
                  <div className="w-64 h-[480px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
                    <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                      <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-xl z-20"></div>
                      <div className="h-full relative">
                        <LivePreview />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-full max-w-4xl h-96 bg-white rounded-lg shadow-xl overflow-hidden border border-gray-200">
                    <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-4">
                      <div className="flex space-x-2">
                        <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                      </div>
                      <div className="flex-1 text-center">
                        <span className="text-xs text-gray-600 font-mono">
                          {formData.hasDomain ? formData.domainName : `${formData.selectedDomain || formData.businessName.toLowerCase().replace(/\s+/g, '')}.sync-a.com`}
                        </span>
                      </div>
                    </div>
                    <div className="h-full overflow-hidden">
                      <LivePreview />
                    </div>
                  </div>
                )}
              </div>
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
            Ready to Publish
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Publish Step (Step 13)
  const PublishStep = () => {
    const [isPublishing, setIsPublishing] = useState(false);
    const [isPublished, setIsPublished] = useState(false);

    const handlePublish = async () => {
      setIsPublishing(true);
      await saveToBackend(formData as Partial<Configuration>);
      await publishConfiguration();
      setIsPublishing(false);
      setIsPublished(true);
    };

    return (
      <div className="py-8 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Publish your website
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Everything looks perfect! Ready to make your website live and start attracting customers?
          </p>
        </div>

        {!isPublished ? (
          <div className="space-y-8">
            {/* Pre-Launch Checklist */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Pre-Launch Checklist</h3>
              <div className="space-y-4">
                {[
                  { item: 'Business information completed', checked: !!formData.businessName },
                  { item: 'Template and design customized', checked: !!formData.template },
                  { item: 'Pages and content configured', checked: formData.selectedPages.length > 0 },
                  { item: 'Contact information added', checked: formData.contactMethods && formData.contactMethods.length > 0 },
                  { item: 'Domain or subdomain selected', checked: !!formData.selectedDomain || !!formData.domainName }
                ].map((check, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                      check.checked ? 'bg-green-500' : 'bg-gray-300'
                    }`}>
                      {check.checked && <Check className="w-4 h-4 text-white" />}
                    </div>
                    <span className={`${check.checked ? 'text-gray-900' : 'text-gray-500'}`}>
                      {check.item}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Website Summary */}
            <Card className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Your Website Summary</h3>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Business Details</h4>
                  <p className="text-gray-600 text-sm mb-1">Name: {formData.businessName}</p>
                  <p className="text-gray-600 text-sm mb-1">Type: {formData.businessType}</p>
                  <p className="text-gray-600 text-sm">Location: {formData.location}</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Website Features</h4>
                  <p className="text-gray-600 text-sm mb-1">Template: {formData.template}</p>
                  <p className="text-gray-600 text-sm mb-1">Pages: {formData.selectedPages.length}</p>
                  <p className="text-gray-600 text-sm">Domain: {formData.hasDomain ? formData.domainName : `${formData.selectedDomain || formData.businessName.toLowerCase().replace(/\s+/g, '')}.sync-a.com`}</p>
                </div>
              </div>
            </Card>

            {/* Publish Button */}
            <div className="text-center">
              <Button
                onClick={handlePublish}
                disabled={isPublishing}
                size="lg"
                className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-16 py-8 text-2xl font-bold rounded-full shadow-2xl hover:scale-105 transition-all duration-300"
              >
                {isPublishing ? (
                  <>
                    <Cloud className="mr-4 w-8 h-8 animate-pulse" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Rocket className="mr-4 w-8 h-8" />
                    Publish Website
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-500 mt-4">
                Your website will be live in seconds!
              </p>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-8">
            <div className="w-32 h-32 mx-auto bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-16 h-16 text-green-600" />
            </div>
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">🎉 Congratulations!</h3>
              <p className="text-lg text-gray-600 mb-6">Your website is now live and ready for customers!</p>
              <div className="space-y-4">
                <Button
                  onClick={() => window.open(publishedUrl || '#', '_blank')}
                  size="lg"
                  className="bg-green-500 hover:bg-green-600 text-white mr-4"
                >
                  <Eye className="mr-2 w-5 h-5" />
                  View Live Website
                </Button>
                <Button
                  onClick={() => window.location.href = '/'}
                  variant="outline"
                  size="lg"
                >
                  <Home className="mr-2 w-5 h-5" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          </div>
        )}

        {!isPublished && (
          <div className="flex justify-between mt-8">
            <Button onClick={prevStep} variant="outline" size="lg">
              <ArrowLeft className="mr-2 w-5 h-5" />
              Back
            </Button>
            <div></div>
          </div>
        )}
      </div>
    );
  };

  // Render main content based on current step
  const renderMainContent = () => {
    if (currentStep === -1) {
      return <WelcomePage />;
    }

    const currentStepConfig = configuratorSteps[currentStep];
    if (!currentStepConfig) return null;

    switch (currentStepConfig.component) {
      case 'template':
        return <TemplateStep />;
      case 'business-info':
        return <BusinessInfoStep />;
      case 'design-customization':
        return <DesignCustomizationStep />;
      case 'page-structure':
        return <PageStructureStep />;
      case 'opening-hours':
        return <OpeningHoursStep />;
      case 'menu-products':
        return <MenuProductsStep />;
      case 'reservations':
        return <ReservationsStep />;
      case 'contact-social':
        return <ContactSocialStep />;
      case 'media-gallery':
        return <MediaGalleryStep />;
      case 'advanced-features':
        return <AdvancedFeaturesStep />;
      case 'domain-hosting':
        return <DomainHostingStep />;
      case 'preview-adjustments':
        return <PreviewAdjustmentsStep />;
      case 'publish':
        return <PublishStep />;
      default:
        return (
          <div className="py-16 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              {currentStepConfig.title}
            </h2>
            <p className="text-gray-600 mb-8">
              {currentStepConfig.description}
            </p>
            <p className="text-sm text-gray-500 mb-8">
              Step component '{currentStepConfig.component}' is coming soon...
            </p>
            <div className="flex justify-between max-w-lg mx-auto">
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
    <div className={`min-h-screen bg-white transition-opacity duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
      {/* Show navigation on all pages, including landing */}
      <Navigation />
      
      {currentStep === -1 ? (
        // Welcome page takes full screen with padding for navbar
        <div className="pt-20">
          {renderMainContent()}
        </div>
      ) : currentStep === 0 ? (
        // Template selection step - special layout with built-in preview
        <div className="pt-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {renderMainContent()}
          </div>
        </div>
      ) : (
        // Other configurator steps with live preview
        <div className="pt-20">
          <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              <div className="min-h-[80vh]">
                {renderMainContent()}
              </div>
            </div>

            {/* Live Preview */}
            <div className="hidden lg:block">
              <LivePreview />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
