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
  const [currentStep, setCurrentStep] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    // Template Selection (NEW FIRST STEP)
    template: '',
    
    // Phase 1: Business Basics
    businessName: '',
    businessType: '',
    location: '',
    logo: null,
    slogan: '',
    uniqueDescription: '',
    
    // Phase 2: Design & Style
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    fontFamily: 'sans-serif',
    backgroundType: 'color',
    backgroundColor: '#FFFFFF',
    backgroundImage: null,
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
  }, []);

  // REORDERED Configuration steps with Template Selection FIRST
  const configuratorSteps = [
    // NEW FIRST STEP: Template Selection
    {
      id: 'template',
      title: "Choose your template",
      description: "Select a design that matches your vision",
      phase: 0,
      phaseTitle: "Template Selection",
      component: 'template'
    },
    
    // Phase 1: Business Basics
    {
      id: 'business-info',
      title: "Tell us about your business",
      description: "Basic information to get started",
      phase: 1,
      phaseTitle: "Business Basics",
      component: 'business-info'
    },
    
    // Phase 2: Design & Visual Style
    {
      id: 'branding',
      title: "Define your brand colors & fonts",
      description: "Choose colors, fonts and styling that represent your business",
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
    { value: 'restaurant', label: 'Restaurant', icon: <Utensils className="w-6 h-6" />, gradient: 'from-red-400 to-orange-500' }
  ];

  // Enhanced professional templates
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
      features: ['Clean Design', 'Mobile First', 'Fast Loading']
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
      features: ['Bold Colors', 'Creative Layout', 'Instagram Ready']
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
      features: ['Professional', 'Trustworthy', 'Classic Appeal']
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
      features: ['Dark Theme', 'Modern UI', 'Tech-Forward']
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
    }
  }, [currentStep, updateFormDataFromInputs]);

  // Back to Step 1 (Template) function
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
    return ((currentStep + 1) / configuratorSteps.length) * 100;
  }, [currentStep, configuratorSteps.length]);

  // Current phase data
  const currentPhase = useMemo(() => {
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
            
            {/* Progress indicator */}
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
            
            {/* Save Status */}
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
              {/* Back to Templates button - always visible after step 0 */}
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

  // Enhanced Live Preview Component
  const LivePreview = () => {
    const [previewState, setPreviewState] = useState({
      menuOpen: false,
      activePage: 'home'
    });
    
    const getBusinessName = () => formData.businessName || 'Your Business';
    
    const getTemplateStyles = () => {
      const selected = templates.find(t => t.id === formData.template);
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

    const renderPreviewContent = () => {
      if (!formData.template) {
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

      // Render different templates based on selection
      switch (formData.template) {
        case 'minimalist':
          return (
            <div className={`h-full overflow-y-auto bg-white ${fontClass}`}>
              <nav className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <h1 className="text-lg font-medium text-gray-900">{getBusinessName()}</h1>
                    <button className="p-2 hover:bg-gray-50 rounded-lg">
                      <Menu className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </nav>
              <div className="px-6 py-8" style={{ backgroundColor: formData.backgroundColor }}>
                <div className="text-center mb-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gray-50 flex items-center justify-center" 
                       style={{ backgroundColor: `${styles.userPrimary}15` }}>
                    <div style={{ color: styles.userPrimary }}>
                      {getBusinessIcon()}
                    </div>
                  </div>
                  <h2 className="text-2xl font-light text-gray-900 mb-2">{getBusinessName()}</h2>
                  {formData.slogan && (
                    <p className="text-gray-500 text-sm">{formData.slogan}</p>
                  )}
                </div>
              </div>
            </div>
          );

        case 'vibrant':
          return (
            <div className={`h-full overflow-y-auto text-white ${fontClass}`} 
                 style={{ background: formData.backgroundType === 'color' ? formData.backgroundColor : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              <nav className="p-4">
                <div className="flex items-center justify-between">
                  <h1 className="text-xl font-black text-white">{getBusinessName()}</h1>
                  <button className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                    <Menu className="w-4 h-4 text-white" />
                  </button>
                </div>
              </nav>
              <div className="pt-8 px-4 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center">
                  <div style={{ color: styles.userPrimary }}>
                    {getBusinessIcon()}
                  </div>
                </div>
                <h1 className="text-3xl font-black text-white mb-3">{getBusinessName()}</h1>
                {formData.slogan && (
                  <p className="text-xl font-bold text-white/90">{formData.slogan}</p>
                )}
              </div>
            </div>
          );

        case 'professional':
          return (
            <div className={`h-full overflow-y-auto bg-white ${fontClass}`}>
              <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center">
                        <div style={{ color: styles.userPrimary }}>
                          {getBusinessIcon()}
                        </div>
                      </div>
                      <h1 className="text-lg font-semibold text-gray-900">{getBusinessName()}</h1>
                    </div>
                    <button className="p-2 hover:bg-gray-100 rounded">
                      <Menu className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </nav>
              <div className="p-4" style={{ backgroundColor: formData.backgroundColor }}>
                <div className="text-center py-8 border-b border-gray-100">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{getBusinessName()}</h1>
                  {formData.slogan && (
                    <p className="text-gray-600">{formData.slogan}</p>
                  )}
                </div>
              </div>
            </div>
          );

        case 'modern-dark':
          return (
            <div className={`h-full overflow-y-auto bg-gray-900 text-white ${fontClass}`}>
              <nav className="bg-gray-800/90 backdrop-blur border-b border-gray-700 sticky top-0 z-50">
                <div className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: styles.userPrimary }}></div>
                      <h1 className="text-white font-mono text-lg">{getBusinessName()}</h1>
                    </div>
                    <button className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center">
                      <Menu className="w-4 h-4 text-gray-300" />
                    </button>
                  </div>
                </div>
              </nav>
              <div className="p-4" style={{ backgroundColor: formData.backgroundType === 'color' && formData.backgroundColor !== '#FFFFFF' ? formData.backgroundColor : undefined }}>
                <div className="bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-700">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                      <div style={{ color: styles.userPrimary }}>
                        {getBusinessIcon()}
                      </div>
                    </div>
                    <div>
                      <h1 className="text-xl font-bold text-white">{getBusinessName()}</h1>
                      {formData.slogan && (
                        <p className="text-sm text-gray-400">{formData.slogan}</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
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

  // Step 1: Template Selection (NEW FIRST STEP)
  const TemplateStep = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(formData.template);

    const handleTemplateSelect = useCallback((templateId: string) => {
      setSelectedTemplate(templateId);
      updateFormData('template', templateId);

      // Auto-redirect to next step after template selection
      setTimeout(() => {
        nextStep();
      }, 500);
    }, [updateFormData, nextStep]);

    return (
      <div className="py-12">
        <div className="text-center mb-16">
          <div className="mb-8">
            <div className="w-20 h-20 mx-auto mb-6 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-purple-500 rounded-2xl opacity-20"></div>
              <div className="absolute inset-2 bg-white rounded-xl flex items-center justify-center">
                <Palette className="w-10 h-10 text-teal-500" />
              </div>
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Choose Your Perfect <span className="bg-gradient-to-r from-teal-500 to-purple-600 bg-clip-text text-transparent">Template</span>
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Start with a professionally designed template that matches your business style. Each template is crafted for maximum impact and user experience.
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 ${
                selectedTemplate === template.id 
                  ? 'border-teal-500 shadow-2xl scale-[1.02] bg-gradient-to-br from-teal-50/50 to-purple-50/50' 
                  : 'border-gray-200 hover:border-teal-300 hover:scale-[1.01]'
              }`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <CardContent className="p-0">
                <div className={`w-full h-48 rounded-t-lg ${template.preview} relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10"></div>
                  
                  <div className="absolute top-4 left-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                      selectedTemplate === template.id 
                        ? 'bg-teal-500 text-white' 
                        : 'bg-white/90 text-gray-700'
                    }`}>
                      {template.name}
                    </div>
                  </div>

                  {selectedTemplate === template.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shadow-lg">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="space-y-2">
                      <div className="flex space-x-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-1 bg-white/60 rounded-full"></div>
                        ))}
                      </div>
                      <div className="space-y-1">
                        <div className="w-20 h-2 bg-white/80 rounded"></div>
                        <div className="w-16 h-1 bg-white/60 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6">
                  <h3 className={`text-xl font-bold mb-2 transition-colors ${
                    selectedTemplate === template.id ? 'text-teal-700' : 'text-gray-900'
                  }`}>
                    {template.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed mb-4">{template.description}</p>
                  
                  <div className="flex flex-wrap gap-2">
                    {template.features.map((feature, index) => (
                      <span key={index} className="px-3 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-center">
          <Button
            onClick={nextStep}
            disabled={!selectedTemplate}
            size="lg"
            className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-12 py-6 text-xl font-bold rounded-full shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {selectedTemplate ? (
              <>
                Customize This Template
                <ChevronRight className="ml-3 w-6 h-6" />
              </>
            ) : (
              'Select a Template First'
            )}
          </Button>
        </div>
      </div>
    );
  };

  // Step 2: Business Information
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

        {/* Logo Upload - FIXED */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Business Logo (Optional)</label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-teal-400 transition-colors">
            <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
            <p className="text-sm text-gray-600 mb-2">Upload your logo</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => document.getElementById('logo-upload')?.click()}
            >
              Choose File
            </Button>
            <input
              id="logo-upload"
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
            <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 2MB</p>
            {formData.logo && (
              <div className="mt-3 p-2 bg-teal-50 rounded border border-teal-200">
                <p className="text-xs text-teal-700">✓ Logo uploaded</p>
              </div>
            )}
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

  // Step 3: Branding (FIXED Typography and Background)
  const BrandingStep = () => (
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Define your brand identity
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

        {/* Font Selection - FIXED */}
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

        {/* Background Style - FIXED */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-4">Background Style</label>
          <div className="grid grid-cols-3 gap-4 mb-6">
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
            <Card
              className={`cursor-pointer transition-all duration-300 border-2 ${
                formData.backgroundType === 'image' ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
              }`}
              onClick={() => updateFormData('backgroundType', 'image')}
            >
              <CardContent className="p-4 text-center">
                <div className="w-full h-16 rounded-lg mb-3 bg-gray-200 bg-[url('/api/placeholder/100/100')] bg-cover"></div>
                <div className="text-sm font-bold text-gray-900">Custom Image</div>
                {formData.backgroundType === 'image' && (
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

          {formData.backgroundType === 'image' && (
            <div>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-teal-400 transition-colors">
                <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 mb-2">Upload background image</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => document.getElementById('bg-upload')?.click()}
                >
                  Choose Image
                </Button>
                <input
                  id="bg-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      updateFormData('backgroundImage', file);
                    }
                  }}
                />
                {formData.backgroundImage && (
                  <div className="mt-3 p-2 bg-teal-50 rounded border border-teal-200">
                    <p className="text-xs text-teal-700">✓ Background image uploaded</p>
                  </div>
                )}
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

  // Rest of the original steps...
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

  // Render step content based on current step
  const renderStepContent = () => {
    const currentStepConfig = configuratorSteps[currentStep];
    if (!currentStepConfig) return null;

    switch (currentStepConfig.component) {
      case 'template':
        return <TemplateStep />;
      case 'business-info':
        return <BusinessInfoStep />;
      case 'branding':
        return <BrandingStep />;
      case 'page-structure':
        return <PageStructureStep />;
      // Add other step components here...
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
      <Navigation />
      
      <div className="pt-20">
        <div className="grid lg:grid-cols-3 gap-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <div className="min-h-[80vh]">
              {renderStepContent()}
            </div>
          </div>
          
          {/* Live Preview */}
          <div className="hidden lg:block">
            <LivePreview />
          </div>
        </div>
      </div>
    </div>
  );
}
