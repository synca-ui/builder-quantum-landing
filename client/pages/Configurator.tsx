import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { ChevronRight, ArrowLeft, Sparkles, Rocket, Menu, X, Settings, Smartphone, Globe, Palette, MapPin, Phone, Mail, Upload, Coffee, Utensils, Building, Check, Star, Heart, Monitor, Cloud, AlertCircle, Camera, Home, Crown, Zap, ChevronDown, Plus } from "lucide-react";
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
    // Template and Design
    template: '',
    primaryColor: '#2563EB',
    secondaryColor: '#7C3AED',
    fontFamily: 'sans-serif',
    backgroundType: 'color', // 'color' or 'image'
    backgroundColor: '#FFFFFF',
    backgroundImage: null,
    
    // Business Information
    businessName: '',
    businessType: '',
    location: '',
    logo: null,
    slogan: '',
    uniqueDescription: '',
    
    // Contact and Social
    contactMethods: [],
    socialMedia: {},
    
    // Files and Media
    menuFile: null, // For file upload
    csvFile: null,  // For CSV upload
    gallery: [],
    
    // Generated/Derived Data
    selectedPages: ['home'],
    openingHours: {},
    menuItems: [],
    reservationsEnabled: false
  });

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // Simplified 3-step configurator structure
  const configuratorSteps = [
    {
      id: 'template-selection',
      title: "Choose Your Template",
      description: "Start by selecting a stunning, professional template",
      component: 'template-selection'
    },
    {
      id: 'design-personalization',
      title: "Personalize Your Design",
      description: "Customize colors, fonts, logo, and background",
      component: 'design-personalization'
    },
    {
      id: 'business-information',
      title: "Add Your Business Information",
      description: "Complete your website with business details and file uploads",
      component: 'business-information'
    }
  ];

  // Business type options
  const businessTypes = [
    { value: 'cafe', label: 'Café', icon: <Coffee className="w-6 h-6" />, gradient: 'from-orange-400 to-yellow-500' },
    { value: 'restaurant', label: 'Restaurant', icon: <Utensils className="w-6 h-6" />, gradient: 'from-red-400 to-orange-500' },
    { value: 'business', label: 'Business', icon: <Building className="w-6 h-6" />, gradient: 'from-blue-400 to-purple-500' }
  ];

  // Enhanced professional templates with distinct visual styles
  const templates = [
    {
      id: 'minimalist',
      name: 'Minimalist Clean',
      description: 'Clean lines, ample white space, perfect for modern cafés and professional services',
      preview: 'bg-gradient-to-br from-gray-50 to-white',
      thumbnail: '/api/placeholder/300/200',
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
      thumbnail: '/api/placeholder/300/200',
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
      thumbnail: '/api/placeholder/300/200',
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
      thumbnail: '/api/placeholder/300/200',
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

  // Font options
  const fontOptions = [
    { id: 'sans-serif', name: 'Sans Serif', class: 'font-sans', preview: 'Modern & Clean', description: 'Perfect for digital readability' },
    { id: 'serif', name: 'Serif', class: 'font-serif', preview: 'Classic & Elegant', description: 'Traditional and sophisticated' },
    { id: 'display', name: 'Display', class: 'font-mono', preview: 'Bold & Creative', description: 'Eye-catching and unique' }
  ];

  // Background options
  const backgroundOptions = [
    { id: 'solid', name: 'Solid Color', type: 'color', preview: 'bg-white border-2 border-gray-300' },
    { id: 'gradient', name: 'Gradient', type: 'gradient', preview: 'bg-gradient-to-br from-blue-400 to-purple-600' },
    { id: 'image', name: 'Custom Image', type: 'image', preview: 'bg-gray-200 bg-[url("/api/placeholder/100/100")] bg-cover' }
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

  // Back to Step 1 function - available throughout the flow
  const backToStep1 = useCallback(() => {
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
          </div>
          
          <div className="hidden md:block">
            <div className="flex items-center space-x-6">
              {/* Back to Step 1 button - always visible after step 1 */}
              {currentStep > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={backToStep1}
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

      // Render different templates based on selection
      switch (formData.template) {
        case 'minimalist':
          return (
            <div className="h-full overflow-y-auto bg-white font-light">
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
              <div className="px-6 py-8">
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
                <div className="space-y-4">
                  <div className="text-center border-b border-gray-100 pb-4">
                    <h4 className="font-medium text-gray-900 mb-1">Featured Item</h4>
                    <p className="text-sm text-gray-500 mb-2">Perfect for your taste</p>
                    <span className="text-lg font-light" style={{ color: styles.userPrimary }}>$12.50</span>
                  </div>
                </div>
              </div>
            </div>
          );

        case 'vibrant':
          return (
            <div className="h-full overflow-y-auto text-white" 
                 style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
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
            <div className="h-full overflow-y-auto bg-white">
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
              <div className="p-4">
                <div className="text-center py-8 border-b border-gray-100">
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{getBusinessName()}</h1>
                  {formData.slogan && (
                    <p className="text-gray-600">{formData.slogan}</p>
                  )}
                </div>
                <div className="py-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Welcome</h2>
                  <p className="text-gray-600">Experience excellence in every detail.</p>
                </div>
              </div>
            </div>
          );

        case 'modern-dark':
          return (
            <div className="h-full overflow-y-auto bg-gray-900 text-white">
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
              <div className="p-4">
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

  // Step 1: Template Selection
  const TemplateSelectionStep = () => {
    const [selectedTemplate, setSelectedTemplate] = useState(formData.template);

    const handleTemplateSelect = useCallback((templateId: string) => {
      setSelectedTemplate(templateId);
      updateFormData('template', templateId);
    }, [updateFormData]);

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

  // Step 2: Design Personalization
  const DesignPersonalizationStep = () => {
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [backgroundFile, setBackgroundFile] = useState<File | null>(null);

    const colorPresets = [
      { name: 'Ocean', primary: '#2563EB', secondary: '#7C3AED' },
      { name: 'Forest', primary: '#059669', secondary: '#10B981' },
      { name: 'Sunset', primary: '#DC2626', secondary: '#F59E0B' },
      { name: 'Purple', primary: '#7C3AED', secondary: '#EC4899' },
      { name: 'Teal', primary: '#0891B2', secondary: '#06B6D4' },
      { name: 'Rose', primary: '#E11D48', secondary: '#F43F5E' }
    ];

    return (
      <div className="py-12 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Personalize Your Design
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Make it yours with custom colors, fonts, logo, and background. See changes instantly in the live preview.
          </p>
        </div>

        <div className="space-y-12">
          {/* Color Themes */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Brand Colors</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {colorPresets.map((preset, index) => {
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
                        ? 'border-teal-500 bg-teal-50 shadow-lg scale-105' 
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
                    <span className={`text-sm font-medium ${isSelected ? 'text-teal-700' : 'text-gray-700'}`}>
                      {preset.name}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Custom Colors */}
            <div className="bg-gray-50 rounded-2xl p-6">
              <h4 className="text-lg font-bold text-gray-900 mb-4">Custom Colors</h4>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Primary Color</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.primaryColor}
                      onChange={(e) => updateFormData('primaryColor', e.target.value)}
                      className="font-mono"
                      placeholder="#2563EB"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">Secondary Color</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="color"
                      value={formData.secondaryColor}
                      onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                      className="w-16 h-16 rounded-xl cursor-pointer border-2 border-gray-300"
                    />
                    <Input
                      type="text"
                      value={formData.secondaryColor}
                      onChange={(e) => updateFormData('secondaryColor', e.target.value)}
                      className="font-mono"
                      placeholder="#7C3AED"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Fonts */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Typography</h3>
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
                  </CardContent>
                </Card>
              ))}
            </div>
          </Card>

          {/* Logo Upload */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Business Logo</h3>
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-teal-400 transition-colors">
                  <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-bold text-gray-900 mb-2">Upload Your Logo</h4>
                  <p className="text-gray-600 text-sm mb-4">PNG, JPG up to 5MB</p>
                  <Button 
                    variant="outline"
                    className="border-teal-500 text-teal-600 hover:bg-teal-50"
                  >
                    Choose Logo File
                  </Button>
                </div>
              </div>
              <div>
                <div className="bg-gray-50 rounded-xl p-6">
                  <h4 className="text-lg font-bold text-gray-900 mb-4">Logo Preview</h4>
                  <div className="w-32 h-32 bg-white rounded-xl border-2 border-gray-200 flex items-center justify-center">
                    {logoFile ? (
                      <img src={URL.createObjectURL(logoFile)} alt="Logo preview" className="max-w-full max-h-full object-contain" />
                    ) : (
                      <div className="text-center">
                        <Building className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <span className="text-xs text-gray-500">No logo uploaded</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Background */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Background Style</h3>
            <div className="grid grid-cols-3 gap-4 mb-6">
              {backgroundOptions.map((bg) => (
                <Card
                  key={bg.id}
                  className={`cursor-pointer transition-all duration-300 border-2 ${
                    formData.backgroundType === bg.type ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                  }`}
                  onClick={() => updateFormData('backgroundType', bg.type)}
                >
                  <CardContent className="p-4 text-center">
                    <div className={`w-full h-16 rounded-lg mb-3 ${bg.preview}`}></div>
                    <div className="text-sm font-bold text-gray-900">{bg.name}</div>
                  </CardContent>
                </Card>
              ))}
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
                  <Button variant="outline" size="sm">
                    Choose Image
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>

        <div className="flex justify-between mt-12">
          <Button onClick={prevStep} variant="outline" size="lg">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to Templates
          </Button>
          <Button
            onClick={nextStep}
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-purple-500"
          >
            Continue to Business Info
            <ChevronRight className="ml-2 w-5 h-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Step 3: Business Information
  const BusinessInformationStep = () => {
    const [menuFile, setMenuFile] = useState<File | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);

    const contactMethods = [
      { id: 'phone', icon: <Phone className="w-5 h-5" />, label: 'Phone', placeholder: '+1 (555) 123-4567' },
      { id: 'email', icon: <Mail className="w-5 h-5" />, label: 'Email', placeholder: 'hello@yourbusiness.com' },
      { id: 'address', icon: <MapPin className="w-5 h-5" />, label: 'Address', placeholder: '123 Main St, City, State' }
    ];

    return (
      <div className="py-12 max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Complete Your Business Information
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Add your business details and upload files to complete your website. Your information will appear across your site.
          </p>
        </div>

        <div className="space-y-12">
          {/* Business Basics */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Business Details</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Business Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Bella's Café"
                  defaultValue={formData.businessName}
                  ref={setInputRef('businessName')}
                  onBlur={handleInputBlur('businessName')}
                  className="text-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Business Type *</label>
                <div className="grid grid-cols-3 gap-2">
                  {businessTypes.map((type) => (
                    <Card
                      key={type.value}
                      className={`cursor-pointer transition-all duration-300 border-2 ${
                        formData.businessType === type.value ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                      }`}
                      onClick={() => updateFormData('businessType', type.value)}
                    >
                      <CardContent className="p-3 text-center">
                        <div className={`w-8 h-8 mx-auto mb-1 rounded-lg bg-gradient-to-r ${type.gradient} flex items-center justify-center text-white`}>
                          {type.icon}
                        </div>
                        <div className="text-xs font-bold text-gray-900">{type.label}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
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
                    className="pl-12"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Business Slogan</label>
                <Input
                  type="text"
                  placeholder="e.g. The best coffee in town"
                  defaultValue={formData.slogan}
                  ref={setInputRef('slogan')}
                  onBlur={handleInputBlur('slogan')}
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">What makes your business unique?</label>
              <Textarea
                placeholder="Tell us what sets you apart from the competition..."
                defaultValue={formData.uniqueDescription}
                ref={setInputRef('uniqueDescription')}
                onBlur={handleInputBlur('uniqueDescription')}
                className="h-24 resize-none"
              />
            </div>
          </Card>

          {/* File Uploads */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Menu & Content Upload</h3>
            <div className="grid md:grid-cols-2 gap-8">
              {/* Menu Image Upload */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Menu Image</h4>
                <div className="border-2 border-dashed border-orange-300 rounded-xl p-6 text-center hover:border-orange-400 transition-colors">
                  <div className="w-12 h-12 mx-auto mb-3 bg-orange-100 rounded-xl flex items-center justify-center">
                    <Camera className="w-6 h-6 text-orange-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Upload a photo of your menu</p>
                  <Button
                    variant="outline"
                    className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    onClick={() => document.getElementById('menu-upload')?.click()}
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Choose Menu Image
                  </Button>
                  <input
                    id="menu-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setMenuFile(file);
                        updateFormData('menuFile', file);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">PNG, JPG, JPEG up to 10MB</p>
                  {menuFile && (
                    <div className="mt-3 p-2 bg-orange-50 rounded border border-orange-200">
                      <p className="text-xs text-orange-700">✓ {menuFile.name}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* CSV Upload */}
              <div>
                <h4 className="text-lg font-bold text-gray-900 mb-4">Menu Data (CSV)</h4>
                <div className="border-2 border-dashed border-green-300 rounded-xl p-6 text-center hover:border-green-400 transition-colors">
                  <div className="w-12 h-12 mx-auto mb-3 bg-green-100 rounded-xl flex items-center justify-center">
                    <Upload className="w-6 h-6 text-green-600" />
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Upload structured menu data</p>
                  <Button
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50"
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
                        setCsvFile(file);
                        updateFormData('csvFile', file);
                      }
                    }}
                  />
                  <p className="text-xs text-gray-500 mt-2">Format: name,description,price</p>
                  {csvFile && (
                    <div className="mt-3 p-2 bg-green-50 rounded border border-green-200">
                      <p className="text-xs text-green-700">✓ {csvFile.name}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Information */}
          <Card className="p-8">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Contact Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
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
                      defaultValue={Array.isArray(formData.contactMethods) 
                        ? formData.contactMethods.find(c => c.type === method.id)?.value || ''
                        : ''}
                      ref={setInputRef(`contact_${method.id}`)}
                      onBlur={handleInputBlur(`contact_${method.id}`)}
                      className="pl-12"
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="flex justify-between mt-12">
          <Button onClick={prevStep} variant="outline" size="lg">
            <ArrowLeft className="mr-2 w-5 h-5" />
            Back to Design
          </Button>
          <Button
            onClick={() => {
              updateFormDataFromInputs();
              saveToBackend(formData as Partial<Configuration>);
            }}
            disabled={!formData.businessName || !formData.businessType}
            size="lg"
            className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600"
          >
            <Rocket className="mr-2 w-5 h-5" />
            Complete & Save Website
          </Button>
        </div>
      </div>
    );
  };

  // Main render function
  const renderStepContent = () => {
    switch (configuratorSteps[currentStep]?.component) {
      case 'template-selection':
        return <TemplateSelectionStep />;
      case 'design-personalization':
        return <DesignPersonalizationStep />;
      case 'business-information':
        return <BusinessInformationStep />;
      default:
        return <TemplateSelectionStep />;
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
