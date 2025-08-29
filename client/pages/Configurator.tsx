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
      // Clean up debounce timeout
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }
    };
  }, [saveToBackend]);

  // Use a ref to store the latest form data to avoid dependency cycles
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Simple debounced save that doesn't cause re-renders
  const debouncedSaveRef = useRef<NodeJS.Timeout | null>(null);

  // Stable form update function that doesn't change between renders
  const updateFormData = useCallback((field: string, value: any) => {
    // Update form data immediately for responsive UI
    setFormData(prev => ({ ...prev, [field]: value }));

    // Debounce saves to prevent rapid API calls
    if (debouncedSaveRef.current) {
      clearTimeout(debouncedSaveRef.current);
    }

    debouncedSaveRef.current = setTimeout(() => {
      if (autoSaverRef.current) {
        const currentData = { ...formDataRef.current, [field]: value };
        autoSaverRef.current.save(currentData as Partial<Configuration>);
      }
    }, 1000); // 1 second debounce for all fields
  }, []); // Empty dependency array for complete stability

  // Input refs for uncontrolled components to completely avoid focus loss
  const inputRefs = useRef<Record<string, HTMLInputElement | HTMLTextAreaElement | null>>({});

  // Update form data from input refs without causing re-renders during typing
  const updateFieldFromRef = useCallback((field: string) => {
    const element = inputRefs.current[field];
    if (element) {
      const value = element.value;

      // Update state without triggering re-renders that could cause focus loss
      setFormData(prev => {
        const newData = { ...prev, [field]: value };
        formDataRef.current = newData; // Keep ref in sync
        return newData;
      });

      // Debounce saves to prevent rapid API calls
      if (debouncedSaveRef.current) {
        clearTimeout(debouncedSaveRef.current);
      }

      debouncedSaveRef.current = setTimeout(() => {
        if (autoSaverRef.current) {
          const currentData = { ...formDataRef.current, [field]: value };
          autoSaverRef.current.save(currentData as Partial<Configuration>);
        }
      }, 1000);
    }
  }, []);

  // Create stable input handlers that don't depend on formData
  const handleInputChange = useCallback((field: string) => {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      // Store the element ref for later access
      inputRefs.current[field] = e.target;
      // Update form data immediately
      updateFieldFromRef(field);
    };
  }, [updateFieldFromRef]);

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

  // COMPLETELY REDESIGNED Live Preview Component with Realistic Templates
  const LivePreview = () => {
    const [previewState, setPreviewState] = useState({
      menuOpen: false,
      activePage: 'home',
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
        case 'cafe': return <Coffee className="w-5 h-5" />;
        case 'restaurant': return <Utensils className="w-5 h-5" />;
        case 'bar': return <Heart className="w-5 h-5" />;
        case 'store': return <ShoppingBag className="w-5 h-5" />;
        default: return <Building className="w-5 h-5" />;
      }
    };

    // Sample content for realistic previews
    const sampleContent = {
      menuItems: formData.menuItems.length > 0 ? formData.menuItems : [
        { name: 'Signature Latte', description: 'Our house special with organic beans', price: '4.50' },
        { name: 'Artisan Sandwich', description: 'Fresh ingredients, homemade bread', price: '8.00' },
        { name: 'Chocolate Croissant', description: 'Buttery, flaky pastry with dark chocolate', price: '3.25' }
      ],
      reviews: [
        { name: 'Sarah M.', rating: 5, text: 'Amazing coffee and friendly staff!' },
        { name: 'John D.', rating: 5, text: 'Love the atmosphere here.' }
      ],
      hours: formData.openingHours?.Monday ? formData.openingHours : {
        Monday: { open: '7:00', close: '19:00' },
        Tuesday: { open: '7:00', close: '19:00' },
        Wednesday: { open: '7:00', close: '19:00' }
      }
    };

    // Realistic Minimalist Template
    const renderMinimalistTemplate = () => (
      <div className="h-full overflow-y-auto bg-white font-light">
        {/* Clean Top Navigation */}
        <nav className="sticky top-0 bg-white/95 backdrop-blur-sm border-b border-gray-100 z-50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <h1 className="text-lg font-medium text-gray-900">{getBusinessName()}</h1>
              <button
                onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                className="p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Menu className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            {/* Navigation Menu */}
            {previewState.menuOpen && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="space-y-1">
                  {['Home', 'Menu', 'About', 'Contact'].map((page) => (
                    <button
                      key={page}
                      onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.toLowerCase(), menuOpen: false }))}
                      className={`block w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                        previewState.activePage === page.toLowerCase()
                          ? 'bg-gray-100 text-gray-900 font-medium'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Page Content */}
        {previewState.activePage === 'home' && (
          <div className="px-6 py-8">
            {/* Hero Section */}
            <div className="text-center mb-12">
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

            {/* Featured Items */}
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 text-center">Featured</h3>
              {sampleContent.menuItems.slice(0, 2).map((item, index) => (
                <div key={index} className="text-center border-b border-gray-100 pb-6">
                  <h4 className="font-medium text-gray-900 mb-1">{item.name}</h4>
                  <p className="text-sm text-gray-500 mb-2">{item.description}</p>
                  <span className="text-lg font-light" style={{ color: styles.userPrimary }}>${item.price}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {previewState.activePage === 'menu' && (
          <div className="px-6 py-8">
            <h2 className="text-xl font-medium text-gray-900 mb-6 text-center">Menu</h2>
            <div className="space-y-6">
              {sampleContent.menuItems.map((item, index) => (
                <div key={index} className="border-b border-gray-100 pb-4">
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

        {previewState.activePage === 'about' && (
          <div className="px-6 py-8">
            <h2 className="text-xl font-medium text-gray-900 mb-6 text-center">About Us</h2>
            <div className="space-y-4 text-center">
              <p className="text-gray-600">
                {formData.uniqueDescription || 'We are passionate about creating exceptional experiences for our customers.'}
              </p>
              <div className="mt-8">
                <h3 className="font-medium text-gray-900 mb-4">Hours</h3>
                <div className="space-y-2 text-sm">
                  {Object.entries(sampleContent.hours).slice(0, 3).map(([day, hours]: [string, any]) => (
                    <div key={day} className="flex justify-between">
                      <span className="text-gray-600">{day}</span>
                      <span className="text-gray-900">{hours.open} - {hours.close}</span>
                    </div>
                  ))}
                </div>
              </div>
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

    // Realistic Creative Template
    const renderCreativeTemplate = () => (
      <div className="h-full overflow-y-auto text-white" 
           style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        {/* Bold Header */}
        <div className="relative">
          <nav className="absolute top-0 left-0 right-0 z-50 p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-black text-white">{getBusinessName()}</h1>
              <button
                onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center transition-all hover:bg-white/30"
              >
                <Menu className="w-4 h-4 text-white" />
              </button>
            </div>
          </nav>

          {/* Full-Screen Menu Overlay */}
          {previewState.menuOpen && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center">
              <div className="text-center space-y-6">
                {['Home', 'Menu', 'Gallery', 'Contact'].map((page, index) => (
                  <button
                    key={page}
                    onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.toLowerCase(), menuOpen: false }))}
                    className="block text-3xl font-black text-white hover:text-pink-300 transition-all duration-300 hover:scale-110"
                    style={{ 
                      animationDelay: `${index * 100}ms`,
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Hero Section */}
          {previewState.activePage === 'home' && (
            <div className="pt-16 pb-8 px-4 text-center">
              <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-white/20 backdrop-blur flex items-center justify-center">
                <div style={{ color: styles.userPrimary }}>
                  {getBusinessIcon()}
                </div>
              </div>
              <h1 className="text-3xl font-black text-white mb-3">{getBusinessName()}</h1>
              {formData.slogan && (
                <p className="text-xl font-bold text-white/90 mb-6">{formData.slogan}</p>
              )}
              
              {/* Creative Grid Layout */}
              <div className="grid grid-cols-2 gap-3 mt-8">
                {sampleContent.menuItems.slice(0, 4).map((item, index) => (
                  <div key={index} className="bg-white/20 backdrop-blur rounded-2xl p-4 hover:bg-white/30 transition-all">
                    <h3 className="text-sm font-bold text-white">{item.name}</h3>
                    <p className="text-xs text-white/80 mt-1">{item.description}</p>
                    <div className="text-lg font-black mt-2" style={{ color: styles.userSecondary }}>${item.price}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {previewState.activePage === 'menu' && (
            <div className="pt-16 px-4">
              <h2 className="text-2xl font-black text-white mb-6 text-center">Our Menu</h2>
              <div className="grid grid-cols-1 gap-4">
                {sampleContent.menuItems.map((item, index) => (
                  <div key={index} className="bg-white/20 backdrop-blur rounded-2xl p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-white">{item.name}</h3>
                        <p className="text-sm text-white/80 mt-1">{item.description}</p>
                      </div>
                      <span className="text-xl font-black" style={{ color: styles.userSecondary }}>${item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );

    // Realistic Professional Template
    const renderProfessionalTemplate = () => (
      <div className="h-full overflow-y-auto bg-white">
        {/* Traditional Top Navigation */}
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
              <button
                onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                className="p-2 hover:bg-gray-100 rounded transition-colors"
              >
                <Menu className="w-4 h-4 text-gray-600" />
              </button>
            </div>
            
            {/* Professional Dropdown */}
            {previewState.menuOpen && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <div className="grid grid-cols-2 gap-2">
                  {['Home', 'Menu', 'About', 'Contact'].map((page) => (
                    <button
                      key={page}
                      onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.toLowerCase(), menuOpen: false }))}
                      className={`text-left px-3 py-2 text-sm rounded transition-colors ${
                        previewState.activePage === page.toLowerCase() 
                          ? 'bg-blue-50 text-blue-900 font-semibold'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Professional Content */}
        {previewState.activePage === 'home' && (
          <div className="p-4">
            <div className="text-center py-8 border-b border-gray-100">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{getBusinessName()}</h1>
              {formData.slogan && (
                <p className="text-gray-600">{formData.slogan}</p>
              )}
            </div>

            <div className="py-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Featured Items</h2>
              <div className="space-y-4">
                {sampleContent.menuItems.slice(0, 3).map((item, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4">
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

            <div className="py-6 border-t border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Customer Reviews</h2>
              <div className="space-y-3">
                {sampleContent.reviews.map((review, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                      <span className="text-sm font-medium text-gray-900">{review.name}</span>
                      <div className="flex">
                        {[...Array(review.rating)].map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                        ))}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600">{review.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {previewState.activePage === 'menu' && (
          <div className="p-4">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Our Menu</h2>
            <div className="space-y-4">
              {sampleContent.menuItems.map((item, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                    </div>
                    <span className="text-lg font-bold" style={{ color: styles.userPrimary }}>${item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );

    // Realistic Modern Template
    const renderModernTemplate = () => (
      <div className="h-full overflow-y-auto bg-gray-900 text-white">
        {/* Modern Header */}
        <nav className="bg-gray-800/90 backdrop-blur border-b border-gray-700 sticky top-0 z-50">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: styles.userPrimary }}></div>
                <h1 className="text-white font-mono text-lg">{getBusinessName()}</h1>
              </div>
              <button
                onClick={() => setPreviewState(prev => ({ ...prev, menuOpen: !prev.menuOpen }))}
                className="w-8 h-8 bg-gray-700 hover:bg-gray-600 rounded flex items-center justify-center transition-colors"
              >
                <Menu className="w-4 h-4 text-gray-300" />
              </button>
            </div>
            
            {/* Modern Slide Menu */}
            {previewState.menuOpen && (
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="space-y-1">
                  {['Home', 'Menu', 'Tech', 'Contact'].map((page) => (
                    <button
                      key={page}
                      onClick={() => setPreviewState(prev => ({ ...prev, activePage: page.toLowerCase(), menuOpen: false }))}
                      className={`w-full text-left px-3 py-2 text-sm font-mono rounded transition-all ${
                        previewState.activePage === page.toLowerCase() 
                          ? 'bg-green-500/20 text-green-400 border-l-2 border-green-400'
                          : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                      }`}
                    >
                      {page.toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Modern Content */}
        {previewState.activePage === 'home' && (
          <div className="p-4">
            {/* Hero Card */}
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

            {/* Modular Grid */}
            <div className="grid gap-3">
              {sampleContent.menuItems.slice(0, 3).map((item, index) => (
                <div key={index} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-gray-600 transition-colors">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{item.name}</h3>
                      <p className="text-xs text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <div className="text-sm font-mono font-bold text-green-400">${item.price}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Status Cards */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs font-mono text-gray-400">OPEN NOW</span>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-3 border border-gray-700">
                <div className="flex items-center space-x-2">
                  <Clock className="w-3 h-3 text-blue-400" />
                  <span className="text-xs font-mono text-gray-400">FAST SERVICE</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {previewState.activePage === 'menu' && (
          <div className="p-4">
            <h2 className="text-xl font-bold text-white mb-6 font-mono">./menu</h2>
            <div className="space-y-3">
              {sampleContent.menuItems.map((item, index) => (
                <div key={index} className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-green-500/50 transition-all">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-white font-mono">{item.name}</h3>
                      <p className="text-sm text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <span className="text-green-400 font-mono font-bold">${item.price}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
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
            defaultValue={formData.businessName}
            onChange={handleInputChange('businessName')}
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
              onChange={handleInputChange('location')}
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
            onChange={handleInputChange('slogan')}
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
            onChange={handleInputChange('uniqueDescription')}
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
    <div className="py-8 max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Define your brand identity
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose colors and fonts that represent your business personality and create a memorable brand experience.
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
                    onChange={inputHandlers.primaryColor}
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
                    onChange={inputHandlers.secondaryColor}
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

  // Render current step
  const renderCurrentStep = () => {
    const step = configuratorSteps[currentStep];
    
    switch (step.component) {
      case 'welcome': return <WelcomeStep />;
      case 'business-info': return <BusinessInfoStep />;
      case 'template': return <TemplateStep />;
      case 'branding': return <BrandingStep />;
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
