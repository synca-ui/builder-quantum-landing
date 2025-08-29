import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronRight, ArrowLeft, Sparkles, Rocket, Crown, Menu, X, Settings, Smartphone, Globe, Palette, MapPin, Phone, Mail, Upload, Clock, Calendar, Users, Camera, Instagram, Facebook, Share2, Coffee, ShoppingBag, Utensils, Store, Building, Plus, Check, Star, Heart, Zap, Play, Eye, ChevronDown, Monitor, Wifi, Shield, Home, Save, Cloud, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { configurationApi, AutoSaver, sessionApi, handleApiError, type Configuration } from "@/lib/api";

export default function Configurator() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [currentConfigId, setCurrentConfigId] = useState<string | null>(null);
  const [publishStatus, setPublishStatus] = useState<'idle' | 'publishing' | 'published' | 'error'>('idle');
  const [publishedUrl, setPublishedUrl] = useState<string | null>(null);
  const autoSaverRef = useRef<AutoSaver | null>(null);
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

  // Template options with dramatically different designs
  const templates = [
    {
      id: 'minimalist',
      name: 'Minimalist',
      description: 'Clean lines, ample white space, simple navigation, single-column layout',
      preview: 'bg-gradient-to-br from-gray-50 to-white',
      style: {
        background: '#FFFFFF',
        accent: '#374151',
        text: '#111827',
        secondary: '#F9FAFB',
        layout: 'single-column',
        navigation: 'floating-minimal',
        typography: 'clean'
      }
    },
    {
      id: 'creative',
      name: 'Creative & Bold',
      description: 'Vibrant colors, large typography, dynamic full-screen images, creative animations, multi-column layout',
      preview: 'bg-gradient-to-br from-purple-400 to-pink-500',
      style: {
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        accent: '#EC4899',
        text: '#FFFFFF',
        secondary: '#8B5CF6',
        layout: 'multi-column',
        navigation: 'full-screen-creative',
        typography: 'bold-experimental'
      }
    },
    {
      id: 'professional',
      name: 'Professional & Elegant',
      description: 'Subtle colors, classic typography, balanced whitespace, traditional navigation',
      preview: 'bg-gradient-to-br from-blue-50 to-indigo-100',
      style: {
        background: '#FFFFFF',
        accent: '#2563EB',
        text: '#1F2937',
        secondary: '#F8FAFC',
        layout: 'traditional-grid',
        navigation: 'top-traditional',
        typography: 'classic-serif'
      }
    },
    {
      id: 'modern',
      name: 'Modern & Sleek',
      description: 'Dark mode, sharp lines, subtle animations, sleek menu transitions, modular grid layout',
      preview: 'bg-gradient-to-br from-gray-800 to-black',
      style: {
        background: '#111827',
        accent: '#10B981',
        text: '#FFFFFF',
        secondary: '#1F2937',
        layout: 'modular-grid',
        navigation: 'sticky-side',
        typography: 'modern-sans'
      }
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

  // Auto-save to backend
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

        // Also save to localStorage as backup
        try {
          localStorage.setItem('configuratorData', JSON.stringify(data));
          localStorage.setItem('configuratorStep', currentStep.toString());
          localStorage.setItem('currentConfigId', result.data.id || '');
        } catch (error) {
          console.warn('Failed to save to localStorage:', error);
        }
      } else {
        setSaveStatus('error');
        console.error('Save failed:', result.error);
      }
    } catch (error) {
      setSaveStatus('error');
      console.error('Save error:', error);
    }
  }, [currentConfigId, currentStep]);

  // Initialize auto-saver with longer debounce for better UX
  useEffect(() => {
    autoSaverRef.current = new AutoSaver(saveToBackend, 5000); // 5 second debounce for better input stability

    return () => {
      if (autoSaverRef.current) {
        autoSaverRef.current.destroy();
      }
    };
  }, [saveToBackend]);

  // Create a separate debounced save function for inputs to prevent focus loss
  const debouncedInputSave = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    return (field: string, value: any) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (autoSaverRef.current) {
          autoSaverRef.current.save({ ...formData, [field]: value } as Partial<Configuration>);
        }
      }, 1000); // 1 second delay for text inputs
    };
  }, [formData]);

  // Optimized form data updates - immediate UI update, debounced save
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // For text inputs, use debounced save to prevent focus loss
    if (typeof value === 'string' && field !== 'template') {
      debouncedInputSave(field, value);
    } else {
      // For non-text inputs (like template selection), save immediately
      if (autoSaverRef.current) {
        autoSaverRef.current.save({ ...formData, [field]: value } as Partial<Configuration>);
      }
    }
  }, [formData, debouncedInputSave]);

  // Optimized input handlers to prevent unnecessary re-renders
  const createInputHandler = useCallback((field: string) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      updateFormData(field, value);
    };
  }, [updateFormData]);

  // Load persisted data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Try to load from backend first
        const latestConfig = await sessionApi.getLatestConfiguration();

        if (latestConfig) {
          setFormData(prev => ({ ...prev, ...latestConfig }));
          setCurrentConfigId(latestConfig.id || null);
          setSaveStatus('saved');

          if (latestConfig.publishedUrl) {
            setPublishedUrl(latestConfig.publishedUrl);
            setPublishStatus('published');
          }
        } else {
          // Fallback to localStorage
          const savedData = localStorage.getItem('configuratorData');
          const savedConfigId = localStorage.getItem('currentConfigId');

          if (savedData) {
            try {
              const parsedData = JSON.parse(savedData);
              setFormData(prev => ({ ...prev, ...parsedData }));
              setCurrentConfigId(savedConfigId);
            } catch (error) {
              console.log('Error loading saved data:', error);
            }
          }
        }

        // Load saved step
        const savedStep = localStorage.getItem('configuratorStep');
        if (savedStep) {
          const stepNumber = parseInt(savedStep);
          if (!isNaN(stepNumber) && stepNumber > 0) {
            setCurrentStep(stepNumber);
          }
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        // Fallback to localStorage on error
        const savedData = localStorage.getItem('configuratorData');
        if (savedData) {
          try {
            const parsedData = JSON.parse(savedData);
            setFormData(prev => ({ ...prev, ...parsedData }));
          } catch (e) {
            console.log('Error loading saved data:', e);
          }
        }
      }
    };

    loadData();
  }, []);

  const nextStep = useCallback(() => {
    if (currentStep < configuratorSteps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      try {
        localStorage.setItem('configuratorStep', newStep.toString());
      } catch (error) {
        console.warn('Failed to save step to localStorage:', error);
      }

      // Force save current progress when moving to next step
      if (autoSaverRef.current) {
        autoSaverRef.current.saveNow(formData as Partial<Configuration>);
      }
    }
  }, [currentStep, configuratorSteps.length, formData]);

  const prevStep = useCallback(() => {
    if (currentStep > 0) {
      const newStep = currentStep - 1;
      setCurrentStep(newStep);
      try {
        localStorage.setItem('configuratorStep', newStep.toString());
      } catch (error) {
        console.warn('Failed to save step to localStorage:', error);
      }
    }
  }, [currentStep]);

  // Publish configuration
  const publishConfiguration = useCallback(async () => {
    if (!currentConfigId) {
      // Save first if not saved
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
        console.error('Publish failed:', result.error);
      }
    } catch (error) {
      setPublishStatus('error');
      console.error('Publish error:', error);
    }
  }, [currentConfigId, formData, saveToBackend]);

  // Memoized progress percentage to prevent recalculation
  const progressPercentage = useMemo(() => {
    return ((currentStep + 1) / configuratorSteps.length) * 100;
  }, [currentStep, configuratorSteps.length]);

  // Memoized current phase data
  const currentPhase = useMemo(() => {
    return currentStep > 0 ? configuratorSteps[currentStep] : null;
  }, [currentStep, configuratorSteps]);

  // Enhanced Navigation component
  const Navigation = () => (
    <nav
      className={`fixed top-0 w-full z-50 ${isDarkMode ? 'bg-gray-900/90' : 'glass'} border-b ${isDarkMode ? 'border-gray-700' : 'border-white/20'} backdrop-blur-xl transition-colors duration-300`}
      style={{
        transform: 'translate3d(0, 0, 0)',
        willChange: 'transform'
      }}
    >
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
                <div className="w-16 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-teal-500 to-purple-500 h-1.5 rounded-full transition-transform duration-500 ease-out"
                    style={{
                      transform: `translateX(${progressPercentage - 100}%)`,
                      willChange: 'transform'
                    }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Save Status Indicator */}
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
                  Phase {currentPhase.phase}: {currentPhase.phaseTitle}
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
              
              <div className="flex items-center space-x-2">
                {publishStatus === 'published' && publishedUrl ? (
                  <Button
                    size="sm"
                    onClick={() => window.open(publishedUrl, '_blank')}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 shadow-lg"
                  >
                    <Globe className="w-4 h-4 mr-2" />
                    Live Site
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={publishConfiguration}
                    disabled={publishStatus === 'publishing'}
                    className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-6 py-2 text-sm font-bold rounded-full transition-all duration-300 hover:scale-105 shadow-lg animate-glow"
                  >
                    {publishStatus === 'publishing' ? (
                      <>
                        <Cloud className="w-4 h-4 mr-2 animate-pulse" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Rocket className="w-4 h-4 mr-2" />
                        Publish
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
              className={`${isDarkMode ? 'text-white' : 'text-gray-700'}`}
            >
              {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );

  // Color theme presets for quick switching
  const colorPresets = [
    { name: 'Ocean', primary: '#2563EB', secondary: '#7C3AED', accent: '#0891B2' },
    { name: 'Forest', primary: '#059669', secondary: '#10B981', accent: '#34D399' },
    { name: 'Sunset', primary: '#DC2626', secondary: '#F59E0B', accent: '#FB923C' },
    { name: 'Purple', primary: '#7C3AED', secondary: '#EC4899', accent: '#A855F7' }
  ];

  // Enhanced Live Preview Component with Dramatically Different Template Designs
  const LivePreview = () => {
    const [previewState, setPreviewState] = useState({
      menuOpen: false,
      activeSection: 'home',
      hoveredItem: null,
      scrollY: 0
    });

    const getBusinessName = () => formData.businessName || 'Your Business';

    const getTemplateStyles = () => {
      const selected = templates.find(t => t.id === formData.template);
      const baseStyles = selected ? selected.style : templates[0].style;

      // Apply user's custom colors to the template
      return {
        ...baseStyles,
        userPrimary: formData.primaryColor,
        userSecondary: formData.secondaryColor
      };
    };

    const styles = getTemplateStyles();

    const getBusinessIcon = () => {
      switch (formData.businessType) {
        case 'cafe': return <Coffee className="w-8 h-8" />;
        case 'restaurant': return <Utensils className="w-8 h-8" />;
        case 'bar': return <Heart className="w-8 h-8" />;
        case 'store': return <ShoppingBag className="w-8 h-8" />;
        default: return <Building className="w-8 h-8" />;
      }
    };

    const renderMinimalistTemplate = () => (
      <div className="h-full overflow-y-auto bg-white transition-all duration-700 ease-in-out">
        {/* Floating minimal navigation */}
        <div className="absolute top-8 left-4 right-4 z-10">
          <div className={`bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-gray-200 transition-all duration-300 ${
            previewState.menuOpen ? 'shadow-xl scale-105' : ''
          }`}>
            <div className="flex items-center justify-between">
              <div className="text-sm font-bold text-gray-900">{getBusinessName()}</div>
              <button
                onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                className={`w-6 h-6 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-all duration-200 ${
                  previewState.menuOpen ? 'rotate-90' : ''
                }`}
              >
                <Menu className="w-3 h-3 text-gray-600" />
              </button>
            </div>

            {/* Dropdown menu */}
            {previewState.menuOpen && (
              <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="space-y-2">
                  {['Home', 'Menu', 'About', 'Contact'].map((item, index) => (
                    <button
                      key={item}
                      onClick={() => setPreviewState(prev => ({ ...prev, activeSection: item.toLowerCase(), menuOpen: false }))}
                      className={`w-full text-left px-2 py-1 text-xs rounded-lg transition-colors ${
                        previewState.activeSection === item.toLowerCase()
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Single column layout with lots of whitespace */}
        <div className="pt-20 px-6">
          {/* Hero - very minimal */}
          <div className="text-center py-12">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gray-100 flex items-center justify-center">
              <div className="w-10 h-10 rounded-full" style={{ backgroundColor: styles.userPrimary }}>
                <div className="w-full h-full flex items-center justify-center text-white text-xs">
                  {getBusinessIcon()}
                </div>
              </div>
            </div>
            <h1 className="text-xl font-light text-gray-900 mb-2">{getBusinessName()}</h1>
            {formData.slogan && (
              <p className="text-sm text-gray-500 font-light">{formData.slogan}</p>
            )}
          </div>

          {/* Minimal menu display */}
          {formData.selectedPages.includes('menu') && formData.menuItems.length > 0 && (
            <div className="py-8">
              <div className="space-y-6">
                {formData.menuItems.slice(0, 3).map((item: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                    onMouseEnter={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                    onMouseLeave={() => setPreviewState(prev => ({ ...prev, hoveredItem: null }))}
                    className={`w-full border-b border-gray-100 pb-4 transition-all duration-200 ${
                      previewState.hoveredItem === item.name ? 'transform scale-105 bg-gray-50 rounded-lg px-2 py-2' : ''
                    }`}
                  >
                    <div className="flex justify-between items-baseline">
                      <div className="text-left">
                        <h3 className="text-sm font-medium text-gray-900">{item.name}</h3>
                        <p className="text-xs text-gray-500 mt-1">{item.description}</p>
                      </div>
                      <div className={`text-sm font-light transition-colors ${
                        previewState.hoveredItem === item.name ? 'text-blue-600 font-medium' : 'text-gray-600'
                      }`}>${item.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const renderCreativeTemplate = () => (
      <div className="h-full overflow-y-auto transition-all duration-700 ease-in-out"
           style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        {/* Full-screen creative navigation */}
        <div className="relative">
          {/* Bold header with overlay */}
          <div className="absolute top-0 left-0 right-0 z-20 p-4">
            <div className="flex items-center justify-between">
              <div className="text-white font-black text-lg">{getBusinessName()}</div>
              <button
                onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                className={`w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all duration-300 hover:bg-white/30 hover:scale-110 ${
                  previewState.menuOpen ? 'rotate-180 bg-white/40' : ''
                }`}
              >
                <Menu className="w-4 h-4 text-white" />
              </button>
            </div>

            {/* Creative full-screen menu overlay */}
            {previewState.menuOpen && (
              <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 animate-in fade-in duration-300">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-8">
                    {['Home', 'Menu', 'Gallery', 'Contact'].map((item, index) => (
                      <button
                        key={item}
                        onClick={() => setPreviewState(prev => ({ ...prev, activeSection: item.toLowerCase(), menuOpen: false }))}
                        className="block text-4xl font-black text-white hover:text-pink-300 transition-all duration-300 hover:scale-110"
                        style={{
                          animationDelay: `${index * 100}ms`,
                          animation: 'slideInLeft 0.5s ease-out forwards'
                        }}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dynamic hero with large typography */}
          <div className="relative pt-16 pb-8 px-4 text-center">
            <div className="relative z-10">
              <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <div className="w-16 h-16 rounded-2xl" style={{ backgroundColor: styles.userPrimary }}>
                  <div className="w-full h-full flex items-center justify-center text-white">
                    {getBusinessIcon()}
                  </div>
                </div>
              </div>
              <h1 className="text-2xl font-black text-white mb-3">{getBusinessName()}</h1>
              {formData.slogan && (
                <p className="text-lg font-bold text-white/90">{formData.slogan}</p>
              )}
            </div>

            {/* Floating geometric shapes */}
            <div className="absolute top-20 left-8 w-12 h-12 bg-white/10 rounded-2xl transform rotate-12 animate-pulse"></div>
            <div className="absolute bottom-12 right-6 w-8 h-8 bg-white/15 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
          </div>

          {/* Multi-column creative layout */}
          {formData.selectedPages.includes('menu') && formData.menuItems.length > 0 && (
            <div className="px-4 pb-8">
              <div className="grid grid-cols-2 gap-3">
                {formData.menuItems.slice(0, 4).map((item: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                    onMouseEnter={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                    onMouseLeave={() => setPreviewState(prev => ({ ...prev, hoveredItem: null }))}
                    className={`bg-white/20 backdrop-blur-sm rounded-2xl p-4 transition-all duration-300 hover:bg-white/30 hover:scale-105 ${
                      previewState.hoveredItem === item.name ? 'transform scale-105 bg-white/30 shadow-lg' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="text-white">
                      <h3 className="text-sm font-bold">{item.name}</h3>
                      <p className="text-xs text-white/80 mt-1">{item.description}</p>
                      <div className="text-lg font-black mt-2" style={{ color: styles.userSecondary }}>${item.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const renderProfessionalTemplate = () => (
      <div className="h-full overflow-y-auto bg-white transition-all duration-700 ease-in-out">
        {/* Traditional top navigation */}
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center transition-colors hover:bg-gray-200">
                <div className="w-5 h-5" style={{ color: styles.userPrimary }}>
                  {getBusinessIcon()}
                </div>
              </div>
              <div className="text-base font-semibold text-gray-900">{getBusinessName()}</div>
            </div>
            <button
              onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <Menu className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Professional dropdown menu */}
          {previewState.menuOpen && (
            <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="grid grid-cols-2 gap-2">
                {['Home', 'Menu', 'About', 'Contact'].map((item, index) => (
                  <button
                    key={item}
                    onClick={() => setPreviewState(prev => ({ ...prev, activeSection: item.toLowerCase(), menuOpen: false }))}
                    className={`text-left px-3 py-2 text-sm rounded transition-colors ${
                      previewState.activeSection === item.toLowerCase()
                        ? 'bg-blue-50 text-blue-900 font-semibold'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Traditional grid layout */}
        <div className="p-4">
          {/* Professional hero */}
          <div className="text-center py-8 border-b border-gray-100">
            <h1 className="text-xl font-bold text-gray-900 mb-2">{getBusinessName()}</h1>
            {formData.slogan && (
              <p className="text-sm text-gray-600">{formData.slogan}</p>
            )}
          </div>

          {/* Traditional menu layout */}
          {formData.selectedPages.includes('menu') && formData.menuItems.length > 0 && (
            <div className="py-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Our Menu</h2>
              <div className="space-y-4">
                {formData.menuItems.slice(0, 3).map((item: any, index: number) => (
                  <button
                    key={index}
                    onClick={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                    onMouseEnter={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                    onMouseLeave={() => setPreviewState(prev => ({ ...prev, hoveredItem: null }))}
                    className={`w-full bg-gray-50 rounded-lg p-4 transition-all duration-200 hover:bg-gray-100 hover:shadow-md ${
                      previewState.hoveredItem === item.name ? 'transform scale-102 bg-gray-100 shadow-md border-l-4' : ''
                    }`}
                    style={previewState.hoveredItem === item.name ? { borderLeftColor: styles.userPrimary } : {}}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1 text-left">
                        <h3 className="text-sm font-semibold text-gray-900">{item.name}</h3>
                        <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                      </div>
                      <div className={`text-sm font-bold ml-4 transition-colors ${
                        previewState.hoveredItem === item.name ? 'scale-110' : ''
                      }`} style={{ color: styles.userPrimary }}>${item.price}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    const renderModernTemplate = () => (
      <div className="h-full overflow-y-auto bg-gray-900 transition-all duration-700 ease-in-out">
        {/* Sticky side navigation indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-1 z-20" style={{ backgroundColor: styles.userPrimary }}></div>

        {/* Modern header */}
        <div className="bg-gray-800/90 backdrop-blur-sm px-4 py-3 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: styles.userPrimary }}></div>
              <div className="text-white font-mono text-sm">{getBusinessName()}</div>
            </div>
            <button
              onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
              className={`w-6 h-6 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-all duration-200 ${
                previewState.menuOpen ? 'rotate-90' : ''
              }`}
            >
              <Menu className="w-3 h-3 text-gray-300" />
            </button>
          </div>

          {/* Modern slide-down menu */}
          {previewState.menuOpen && (
            <div className="mt-3 pt-3 border-t border-gray-700 animate-in fade-in slide-in-from-top-2 duration-300">
              <div className="space-y-1">
                {['Home', 'Menu', 'Gallery', 'Contact'].map((item, index) => (
                  <button
                    key={item}
                    onClick={() => setPreviewState(prev => ({ ...prev, activeSection: item.toLowerCase(), menuOpen: false }))}
                    className={`w-full text-left px-3 py-2 text-xs font-mono rounded transition-all duration-200 ${
                      previewState.activeSection === item.toLowerCase()
                        ? 'bg-green-500/20 text-green-400 border-l-2 border-green-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    {item.toLowerCase()}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modular grid layout */}
        <div className="p-4">
          {/* Modern hero card */}
          <div className="bg-gray-800 rounded-2xl p-6 mb-4 border border-gray-700">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-gray-700 flex items-center justify-center">
                <div className="w-6 h-6" style={{ color: styles.userPrimary }}>
                  {getBusinessIcon()}
                </div>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{getBusinessName()}</h1>
                {formData.slogan && (
                  <p className="text-sm text-gray-400">{formData.slogan}</p>
                )}
              </div>
            </div>
          </div>

          {/* Modular content cards */}
          {formData.selectedPages.includes('menu') && formData.menuItems.length > 0 && (
            <div className="grid gap-3">
              {formData.menuItems.slice(0, 3).map((item: any, index: number) => (
                <button
                  key={index}
                  onClick={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                  onMouseEnter={() => setPreviewState(prev => ({ ...prev, hoveredItem: item.name }))}
                  onMouseLeave={() => setPreviewState(prev => ({ ...prev, hoveredItem: null }))}
                  className={`w-full bg-gray-800 rounded-xl p-4 border border-gray-700 transition-all duration-200 hover:border-gray-600 hover:bg-gray-750 ${
                    previewState.hoveredItem === item.name ? 'transform scale-105 border-green-500 bg-gray-750 shadow-lg' : ''
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <div className="text-left">
                      <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className={`text-sm font-mono font-bold text-green-400 transition-transform ${
                      previewState.hoveredItem === item.name ? 'scale-110' : ''
                    }`}>${item.price}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );

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

      // Render dramatically different templates
      switch (formData.template) {
        case 'minimalist':
          return renderMinimalistTemplate();
        case 'creative':
          return renderCreativeTemplate();
        case 'professional':
          return renderProfessionalTemplate();
        case 'modern':
          return renderModernTemplate();
        default:
          return renderMinimalistTemplate();
      }
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
            onChange={createInputHandler('businessName')}
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
              value={formData.location}
              onChange={createInputHandler('location')}
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
            value={formData.slogan}
            onChange={createInputHandler('slogan')}
            className="w-full px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
          />
        </div>

        {/* Unique Description */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">What makes your business unique?</label>
          <Textarea
            placeholder="Tell us what sets you apart from the competition..."
            value={formData.uniqueDescription}
            onChange={createInputHandler('uniqueDescription')}
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

  const TemplateStep = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(formData.template);

    const handleTemplateSelect = useCallback((templateId: string) => {
      setSelectedTemplate(templateId);
      updateFormData('template', templateId);
    }, [updateFormData]);

    return (
      <div className="py-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Choose your template
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Select a design that matches your vision. Each template offers a unique look and feel.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {templates.map((template) => (
            <Card
              key={template.id}
              className={`group cursor-pointer transition-all duration-300 hover:shadow-xl border-2 hover:border-teal-300 ${
                selectedTemplate === template.id
                  ? 'border-teal-500 shadow-xl transform scale-[1.02] bg-teal-50/30'
                  : 'border-gray-200 hover:bg-gray-50/50'
              }`}
              onClick={() => handleTemplateSelect(template.id)}
            >
              <CardContent className="p-0">
                <div className={`w-full h-52 rounded-t-lg ${template.preview} relative overflow-hidden`}>
                  {/* Template Preview Content */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-black/10"></div>

                  {/* Template Name Badge */}
                  <div className="absolute top-4 left-4">
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                      selectedTemplate === template.id
                        ? 'bg-teal-500 text-white'
                        : 'bg-white/90 text-gray-700'
                    }`}>
                      {template.name}
                    </div>
                  </div>

                  {/* Selection Indicator */}
                  {selectedTemplate === template.id && (
                    <div className="absolute top-4 right-4">
                      <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center shadow-lg animate-in zoom-in duration-200">
                        <Check className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  )}

                  {/* Interactive Preview Elements */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="space-y-2">
                      {/* Mock navigation */}
                      <div className="flex space-x-1">
                        {[1, 2, 3].map(i => (
                          <div key={i} className="w-8 h-1 bg-white/60 rounded-full"></div>
                        ))}
                      </div>
                      {/* Mock content */}
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
                  <p className="text-gray-600 text-sm leading-relaxed">{template.description}</p>

                  {/* Template Features */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {template.style.layout && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {template.style.layout.replace('-', ' ')}
                      </span>
                    )}
                    {template.style.navigation && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                        {template.style.navigation.replace('-', ' ')}
                      </span>
                    )}
                  </div>
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
            disabled={!selectedTemplate}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Continue
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

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
            <div className="relative">
              <input
                key="primary-color-picker"
                type="color"
                value={formData.primaryColor}
                onChange={(e) => {
                  e.stopPropagation();
                  updateFormData('primaryColor', e.target.value);
                }}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-colors"
                style={{ WebkitAppearance: 'none', padding: '2px' }}
              />
            </div>
            <div className="flex-1">
              <Input
                type="text"
                value={formData.primaryColor}
                onChange={createInputHandler('primaryColor')}
                className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
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
            <div className="relative">
              <input
                key="secondary-color-picker"
                type="color"
                value={formData.secondaryColor}
                onChange={(e) => {
                  e.stopPropagation();
                  updateFormData('secondaryColor', e.target.value);
                }}
                onFocus={(e) => e.stopPropagation()}
                onBlur={(e) => e.stopPropagation()}
                className="w-12 h-12 rounded-lg cursor-pointer border-2 border-gray-300 hover:border-teal-400 transition-colors"
                style={{ WebkitAppearance: 'none', padding: '2px' }}
              />
            </div>
            <div className="flex-1">
              <Input
                type="text"
                value={formData.secondaryColor}
                onChange={createInputHandler('secondaryColor')}
                className="font-mono focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-all"
                placeholder="#7C3AED"
              />
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-2">Supporting color for gradients and highlights</p>
        </div>

        {/* Color Presets */}
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

  // Phase 4: Media & Advanced Options
  const MediaGalleryStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Upload your photos
        </h2>
        <p className="text-lg text-gray-600">
          Show off your space, food, and atmosphere
        </p>
      </div>

      {/* Photo Upload Area */}
      <Card className="mb-8 border-2 border-dashed border-gray-300 hover:border-teal-400 transition-colors">
        <CardContent className="p-12 text-center">
          <Camera className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900 mb-2">Upload high-quality photos</h3>
          <p className="text-gray-600 mb-6">
            Drag and drop images or click to select. Show your space, food, team, and atmosphere.
          </p>
          <Button variant="outline" size="lg">
            <Upload className="w-5 h-5 mr-2" />
            Choose Photos
          </Button>
          <p className="text-xs text-gray-500 mt-3">
            Supports JPG, PNG up to 10MB each. Recommended: 1200x800px or higher
          </p>
        </CardContent>
      </Card>

      {/* Gallery Grid */}
      {formData.gallery.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Gallery ({formData.gallery.length} photos)</h3>
          <div className="grid grid-cols-3 gap-4">
            {formData.gallery.map((photo: any, index: number) => (
              <div key={index} className="relative aspect-square bg-gray-200 rounded-lg overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 to-purple-500/20"></div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-8 h-8 p-0 bg-white/90 hover:bg-white"
                    onClick={() => {
                      const newGallery = formData.gallery.filter((_: any, i: number) => i !== index);
                      updateFormData('gallery', newGallery);
                    }}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Instagram Sync */}
      {formData.instagramSync && (
        <Card className="mb-8 bg-gradient-to-r from-pink-50 to-purple-50 border-pink-200">
          <CardContent className="p-6">
            <div className="flex items-center space-x-3 mb-3">
              <Instagram className="w-6 h-6 text-pink-600" />
              <h3 className="text-lg font-bold text-gray-900">Instagram Integration</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Your latest Instagram posts will automatically appear in your gallery. We'll sync 12 of your most recent photos.
            </p>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-700 font-medium">Connected and syncing</span>
            </div>
          </CardContent>
        </Card>
      )}

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

  const AdvancedFeaturesStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Optional features
        </h2>
        <p className="text-lg text-gray-600">
          Enable advanced functionality for your business
        </p>
      </div>

      <div className="space-y-6">
        {/* Online Ordering */}
        <Card className={`transition-all duration-300 border-2 ${formData.onlineOrdering ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center text-white">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Online Ordering</h3>
                  <p className="text-gray-600">Enable pickup and delivery orders</p>
                </div>
              </div>
              <Button
                variant={formData.onlineOrdering ? "default" : "outline"}
                onClick={() => updateFormData('onlineOrdering', !formData.onlineOrdering)}
                className={formData.onlineOrdering ? "bg-teal-500 hover:bg-teal-600" : ""}
              >
                {formData.onlineOrdering ? 'Enabled' : 'Enable'}
              </Button>
            </div>
            {formData.onlineOrdering && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-teal-200">
                <p className="text-sm text-teal-700">
                  ��� Customers can order directly from your website. Includes payment processing, order management, and delivery tracking.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Online Store */}
        <Card className={`transition-all duration-300 border-2 ${formData.onlineStore ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white">
                  <Store className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Online Store</h3>
                  <p className="text-gray-600">Sell merchandise, gift cards, or products</p>
                </div>
              </div>
              <Button
                variant={formData.onlineStore ? "default" : "outline"}
                onClick={() => updateFormData('onlineStore', !formData.onlineStore)}
                className={formData.onlineStore ? "bg-teal-500 hover:bg-teal-600" : ""}
              >
                {formData.onlineStore ? 'Enabled' : 'Enable'}
              </Button>
            </div>
            {formData.onlineStore && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-teal-200">
                <p className="text-sm text-teal-700">
                  🛍️ Perfect for selling branded merchandise, gift cards, or specialty products. Full e-commerce functionality included.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Team Area */}
        <Card className={`transition-all duration-300 border-2 ${formData.teamArea ? 'border-teal-500 bg-teal-50' : 'border-gray-200'}`}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Internal Team Area</h3>
                  <p className="text-gray-600">Staff schedules, notes, and internal tools</p>
                </div>
              </div>
              <Button
                variant={formData.teamArea ? "default" : "outline"}
                onClick={() => updateFormData('teamArea', !formData.teamArea)}
                className={formData.teamArea ? "bg-teal-500 hover:bg-teal-600" : ""}
              >
                {formData.teamArea ? 'Enabled' : 'Enable'}
              </Button>
            </div>
            {formData.teamArea && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-teal-200">
                <p className="text-sm text-teal-700">
                  👥 Private area for your team to manage schedules, share notes, and access internal resources.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-start space-x-2">
          <Zap className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-bold text-blue-900 mb-1">Pro Tip</h4>
            <p className="text-sm text-blue-700">You can always enable or disable these features later from your dashboard. Start simple and add more as your business grows!</p>
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

  // Phase 5: Domain, Preview & Publishing
  const DomainHostingStep = () => (
    <div className="py-8 max-w-2xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Choose your domain
        </h2>
        <p className="text-lg text-gray-600">
          Select how customers will find your website
        </p>
      </div>

      {/* Domain Options */}
      <div className="space-y-6 mb-8">
        {/* Existing Domain */}
        <Card
          className={`cursor-pointer transition-all duration-300 border-2 ${
            formData.hasDomain ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
          }`}
          onClick={() => updateFormData('hasDomain', true)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-blue-400 to-indigo-500 flex items-center justify-center text-white">
                  <Globe className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">I have my own domain</h3>
                  <p className="text-gray-600">Connect your existing domain name</p>
                </div>
              </div>
              {formData.hasDomain && (
                <Check className="w-6 h-6 text-teal-500" />
              )}
            </div>
            {formData.hasDomain && (
              <div className="mt-4">
                <Input
                  type="text"
                  placeholder="yourbusiness.com"
                  value={formData.domainName}
                  onChange={(e) => updateFormData('domainName', e.target.value)}
                  className="w-full"
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sync.a Subdomain */}
        <Card
          className={`cursor-pointer transition-all duration-300 border-2 ${
            !formData.hasDomain ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
          }`}
          onClick={() => updateFormData('hasDomain', false)}
        >
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-teal-400 to-purple-500 flex items-center justify-center text-white">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Use a sync.a domain</h3>
                  <p className="text-gray-600">Get started instantly with a free subdomain</p>
                </div>
              </div>
              {!formData.hasDomain && (
                <Check className="w-6 h-6 text-teal-500" />
              )}
            </div>
            {!formData.hasDomain && (
              <div className="mt-4">
                <div className="flex items-center space-x-2">
                  <Input
                    type="text"
                    placeholder="yourbusiness"
                    value={formData.selectedDomain}
                    onChange={(e) => updateFormData('selectedDomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                    className="flex-1"
                  />
                  <span className="text-gray-600 font-mono">.sync.app</span>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Your website will be available at: <strong>{formData.selectedDomain || 'yourbusiness'}.sync.app</strong>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Hosting Benefits */}
      <Card className="mb-8 bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-teal-600" />
            What's included with sync.a hosting
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: <Wifi className="w-4 h-4" />, text: 'Lightning-fast CDN' },
              { icon: <Shield className="w-4 h-4" />, text: 'SSL Certificate' },
              { icon: <Zap className="w-4 h-4" />, text: '99.9% Uptime guarantee' },
              { icon: <Settings className="w-4 h-4" />, text: 'Automatic updates' }
            ].map((benefit, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-teal-100 rounded flex items-center justify-center text-teal-600">
                  {benefit.icon}
                </div>
                <span className="text-sm text-gray-700">{benefit.text}</span>
              </div>
            ))}
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

  const PreviewAdjustmentsStep = () => (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Preview & final tweaks
        </h2>
        <p className="text-lg text-gray-600">
          Review your website and make any final adjustments before going live
        </p>
      </div>

      {/* Preview Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-full">
          <Button variant="default" size="sm" className="bg-white shadow-sm">
            <Smartphone className="w-4 h-4 mr-2" />
            Mobile
          </Button>
          <Button variant="ghost" size="sm">
            <Monitor className="w-4 h-4 mr-2" />
            Desktop
          </Button>
        </div>
      </div>

      {/* Full Preview */}
      <div className="max-w-lg mx-auto mb-8">
        <div className="relative">
          <div className="w-full max-w-sm mx-auto">
            <div className="w-full h-[600px] bg-gray-900 rounded-[2.5rem] p-3 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-xl z-20"></div>

                <div className="pt-8 h-full overflow-y-auto">
                  {/* Preview of the actual website */}
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-bold text-gray-900">
                        {formData.businessName || 'Your Business'}
                      </div>
                      <Menu className="w-4 h-4 text-gray-600" />
                    </div>
                  </div>

                  <div className="px-4 py-6 text-center bg-gradient-to-br from-gray-50 to-white">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-teal-400 to-purple-500 flex items-center justify-center">
                      {businessTypes.find(t => t.value === formData.businessType)?.icon || <Store className="w-8 h-8 text-white" />}
                    </div>
                    <h2 className="text-lg font-bold text-gray-900 mb-2">
                      {formData.businessName || 'Your Business'}
                    </h2>
                    {formData.slogan && (
                      <p className="text-sm text-gray-600">{formData.slogan}</p>
                    )}
                  </div>

                  <div className="px-4 space-y-4">
                    {formData.menuItems.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Menu Highlights</h3>
                        {formData.menuItems.slice(0, 2).map((item: any, index: number) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                            <div>
                              <div className="text-xs font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs text-gray-600">{item.description}</div>
                            </div>
                            <div className="text-xs font-bold text-teal-600">${item.price}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Adjustments */}
      <Card className="max-w-2xl mx-auto mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Adjustments</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Primary Color</label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => updateFormData('primaryColor', e.target.value)}
                  className="w-8 h-8 rounded cursor-pointer"
                />
                <span className="text-sm text-gray-600 font-mono">{formData.primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Template</label>
              <select
                value={formData.template}
                onChange={(e) => updateFormData('template', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between max-w-2xl mx-auto">
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
          <Rocket className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const PublishStep = () => (
    <div className="text-center py-16">
      <div className="mb-8">
        <div className="w-32 h-32 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <Rocket className="w-16 h-16 text-teal-500 animate-bounce" />
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
          <span className="text-gradient">Congratulations!</span>
          <br />Your website is ready to launch!
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Your beautiful website for <strong>{formData.businessName || 'your business'}</strong> is ready to go live and start attracting customers.
        </p>
      </div>

      {/* Final Website URL */}
      <Card className="max-w-lg mx-auto mb-8 bg-gradient-to-r from-teal-50 to-purple-50 border-teal-200">
        <CardContent className="p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Your website will be live at:</h3>
          <div className="text-2xl font-bold text-teal-600 font-mono bg-white px-4 py-2 rounded-lg">
            {formData.hasDomain
              ? formData.domainName || 'yourdomain.com'
              : `${formData.selectedDomain || 'yourbusiness'}.sync.app`
            }
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button
          size="lg"
          className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-12 py-6 text-xl font-bold rounded-full transition-all duration-500 hover:scale-110 shadow-2xl animate-glow"
          onClick={() => {
            // Handle actual publishing logic here
            alert('🎉 Website published successfully! Check your email for next steps.');
          }}
        >
          <Rocket className="mr-3 w-6 h-6" />
          Publish My Website
          <Sparkles className="ml-3 w-6 h-6" />
        </Button>

        <Button
          onClick={() => setCurrentStep(configuratorSteps.length - 2)}
          variant="outline"
          size="lg"
          className="px-8 py-4 text-lg font-bold rounded-full"
        >
          <Eye className="mr-2 w-5 h-5" />
          Preview Again
        </Button>
      </div>

      <div className="mt-12 text-center">
        <p className="text-gray-500 font-medium">
          ✨ Instant deployment • 🚀 SSL security included • 💎 30-day money-back guarantee
        </p>
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
      case 'opening-hours': return <OpeningHoursStep />;
      case 'menu-products': return <MenuProductsStep />;
      case 'reservations': return <ReservationsStep />;
      case 'contact-social': return <ContactSocialStep />;
      case 'media-gallery': return <MediaGalleryStep />;
      case 'advanced-features': return <AdvancedFeaturesStep />;
      case 'domain-hosting': return <DomainHostingStep />;
      case 'preview-adjustments': return <PreviewAdjustmentsStep />;
      case 'publish': return <PublishStep />;
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
