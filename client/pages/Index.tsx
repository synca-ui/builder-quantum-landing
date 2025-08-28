import { useState, useEffect } from "react";
import { ChevronRight, Play, Star, Check, ArrowRight, Zap, Palette, Smartphone, Globe, Sparkles, Rocket, Crown, Menu, X, Settings, Home, Layers, Coffee, ShoppingBag, Utensils, Briefcase, Instagram, Facebook, Twitter, Linkedin, MapPin, Phone, Mail, CreditCard, Upload, ArrowLeft, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Index() {
  const [isVisible, setIsVisible] = useState(false);
  const [activeDemo, setActiveDemo] = useState(0);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [formData, setFormData] = useState({
    businessType: '',
    style: '',
    pages: [],
    socialMedia: {},
    contactInfo: {},
    menuItems: [],
    paymentMethods: []
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

  const configuratorSteps = [
    {
      id: 'welcome',
      title: "Let's Build Your Perfect Website!",
      description: "Answer a few simple questions, and we'll help you create a website tailored to your business. Fast. Easy. Professional.",
      component: 'welcome'
    },
    {
      id: 'business-type',
      title: "What type of business are you setting up a website for?",
      description: "Choose the category that best describes your business",
      component: 'business-type',
      options: [
        { name: "Restaurant", icon: <Utensils className="w-8 h-8" />, gradient: "from-red-400 to-orange-500", value: "restaurant" },
        { name: "Retail Store", icon: <ShoppingBag className="w-8 h-8" />, gradient: "from-blue-400 to-purple-500", value: "retail" },
        { name: "Café", icon: <Coffee className="w-8 h-8" />, gradient: "from-orange-400 to-yellow-500", value: "cafe" },
        { name: "Services", icon: <Briefcase className="w-8 h-8" />, gradient: "from-teal-400 to-green-500", value: "services" }
      ]
    },
    {
      id: 'style',
      title: "What style suits your brand?",
      description: "Choose a design aesthetic that reflects your business personality",
      component: 'style',
      options: [
        { name: "Minimalistic", preview: "Clean lines, lots of white space", gradient: "from-gray-400 to-gray-600", value: "minimalistic" },
        { name: "Modern & Creative", preview: "Bold layouts, creative elements", gradient: "from-purple-400 to-pink-500", value: "modern" },
        { name: "Professional & Elegant", preview: "Sophisticated, trustworthy design", gradient: "from-blue-400 to-indigo-600", value: "professional" },
        { name: "Bold & Eye-catching", preview: "Vibrant colors, dynamic layouts", gradient: "from-orange-400 to-red-500", value: "bold" }
      ]
    },
    {
      id: 'pages',
      title: "What pages do you need on your website?",
      description: "Select all the pages that are relevant to your business",
      component: 'pages',
      options: [
        { name: "Home Page", required: true, value: "home" },
        { name: "Menu", value: "menu", condition: "restaurant|cafe" },
        { name: "Shop", value: "shop", condition: "retail" },
        { name: "About Us", value: "about" },
        { name: "Contact", value: "contact" },
        { name: "Blog", value: "blog" },
        { name: "FAQ", value: "faq" },
        { name: "Services", value: "services", condition: "services" }
      ]
    },
    {
      id: 'social',
      title: "Connect your social media accounts and external links",
      description: "Link your social media to increase engagement with customers",
      component: 'social'
    },
    {
      id: 'payment',
      title: "Set up your payment options",
      description: "Choose how customers can pay for your products or services",
      component: 'payment',
      condition: "restaurant|retail|services"
    },
    {
      id: 'menu-products',
      title: "Add items to your menu or product catalog",
      description: "Showcase what you offer to attract customers",
      component: 'menu-products',
      condition: "restaurant|cafe|retail"
    },
    {
      id: 'contact',
      title: "Enter your contact information and location",
      description: "Help customers find and contact your business",
      component: 'contact'
    },
    {
      id: 'review',
      title: "Review your website setup",
      description: "Check all your settings and make any final adjustments",
      component: 'review'
    },
    {
      id: 'launch',
      title: "Congratulations, your website is ready to launch!",
      description: "Your beautiful website is ready to go live",
      component: 'launch'
    }
  ];

  const filteredSteps = configuratorSteps.filter(step => {
    if (!step.condition) return true;
    return step.condition.split('|').includes(formData.businessType);
  });

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const nextStep = () => {
    if (currentStep < filteredSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Enhanced Navigation component
  const Navigation = () => (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${isDarkMode ? 'bg-gray-900/90' : 'glass'} border-b ${isDarkMode ? 'border-gray-700' : 'border-white/20'} backdrop-blur-xl`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <h1 className="text-3xl font-black text-gradient animate-pulse">sync.a</h1>
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-bounce"></div>
            </div>
            
            {/* Progress indicator */}
            <div className="hidden md:flex items-center ml-8">
              <div className="flex items-center space-x-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                <Settings className="w-4 h-4 text-teal-500" />
                <span className={`text-sm font-bold ${isDarkMode ? 'text-white' : 'text-gray-700'}`}>
                  Step {currentStep + 1} of {filteredSteps.length}
                </span>
                <div className="w-16 bg-gray-200 rounded-full h-1.5">
                  <div 
                    className="bg-gradient-to-r from-teal-500 to-purple-500 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${((currentStep + 1) / filteredSteps.length) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
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
                <Rocket className="w-4 h-4 mr-2" />
                Launch Preview
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

  // Live Preview Component
  const LivePreview = () => (
    <div className="sticky top-24 h-[calc(100vh-6rem)]">
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Live Preview</h3>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm" className="p-2">
              <Smartphone className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" className="p-2">
              <Globe className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* iPhone mockup */}
        <div className="flex-1 flex items-center justify-center">
          <div className="relative">
            {/* iPhone frame */}
            <div className="w-64 h-[520px] bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
              <div className="w-full h-full bg-white rounded-[2rem] overflow-hidden relative">
                {/* iPhone notch */}
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-20 h-6 bg-gray-900 rounded-b-xl z-10"></div>
                
                {/* Website preview */}
                <div className="pt-8 h-full overflow-y-auto">
                  {/* Header */}
                  <div className={`px-4 py-3 border-b ${formData.style === 'bold' ? 'bg-gradient-to-r from-orange-400 to-red-500' : formData.style === 'modern' ? 'bg-gradient-to-r from-purple-400 to-pink-500' : 'bg-white'}`}>
                    <div className="flex items-center justify-between">
                      <div className={`text-lg font-bold ${formData.style === 'bold' || formData.style === 'modern' ? 'text-white' : 'text-gray-900'}`}>
                        {formData.businessType === 'restaurant' ? 'Bella Vista' : 
                         formData.businessType === 'cafe' ? 'Brew & Co' :
                         formData.businessType === 'retail' ? 'Style Shop' : 'Your Business'}
                      </div>
                      <Menu className={`w-4 h-4 ${formData.style === 'bold' || formData.style === 'modern' ? 'text-white' : 'text-gray-600'}`} />
                    </div>
                  </div>
                  
                  {/* Hero section */}
                  <div className="px-4 py-6 text-center">
                    <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-teal-400 to-purple-500 rounded-full flex items-center justify-center">
                      {formData.businessType === 'restaurant' ? <Utensils className="w-8 h-8 text-white" /> :
                       formData.businessType === 'cafe' ? <Coffee className="w-8 h-8 text-white" /> :
                       formData.businessType === 'retail' ? <ShoppingBag className="w-8 h-8 text-white" /> :
                       <Briefcase className="w-8 h-8 text-white" />}
                    </div>
                    <h2 className="text-sm font-bold text-gray-900 mb-1">Welcome to Your Business</h2>
                    <p className="text-xs text-gray-600">Experience the best in town</p>
                  </div>
                  
                  {/* Navigation pills */}
                  {formData.pages.length > 0 && (
                    <div className="px-4 mb-4">
                      <div className="flex flex-wrap gap-1">
                        {formData.pages.map((page: string, index: number) => (
                          <div key={index} className="px-2 py-1 bg-gray-100 rounded-full">
                            <span className="text-xs text-gray-600 capitalize">{page}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Content based on business type */}
                  <div className="px-4 space-y-3">
                    {formData.businessType === 'restaurant' && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Featured Menu</h3>
                        <div className="space-y-2">
                          {formData.menuItems.slice(0, 3).map((item: any, index: number) => (
                            <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                              <div>
                                <div className="text-xs font-medium text-gray-900">{item.name}</div>
                                <div className="text-xs text-gray-600">{item.description}</div>
                              </div>
                              <div className="text-xs font-bold text-teal-600">${item.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {formData.businessType === 'retail' && (
                      <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-2">Featured Products</h3>
                        <div className="grid grid-cols-2 gap-2">
                          {formData.menuItems.slice(0, 4).map((item: any, index: number) => (
                            <div key={index} className="bg-gray-50 rounded p-2">
                              <div className="w-full h-16 bg-gray-200 rounded mb-1"></div>
                              <div className="text-xs font-medium text-gray-900">{item.name}</div>
                              <div className="text-xs font-bold text-teal-600">${item.price}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Social media icons */}
                  {Object.keys(formData.socialMedia).length > 0 && (
                    <div className="px-4 py-3 border-t mt-4">
                      <div className="flex justify-center space-x-3">
                        {Object.keys(formData.socialMedia).map((platform, index) => (
                          <div key={index} className="w-6 h-6 bg-gray-300 rounded-full flex items-center justify-center">
                            {platform === 'instagram' && <Instagram className="w-3 h-3 text-gray-600" />}
                            {platform === 'facebook' && <Facebook className="w-3 h-3 text-gray-600" />}
                            {platform === 'twitter' && <Twitter className="w-3 h-3 text-gray-600" />}
                            {platform === 'linkedin' && <Linkedin className="w-3 h-3 text-gray-600" />}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Floating indicators */}
            <div className="absolute -right-4 top-1/2 transform -translate-y-1/2">
              <div className="flex flex-col space-y-2">
                <div className="w-3 h-3 bg-gradient-to-r from-teal-400 to-purple-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gradient-to-r from-orange-400 to-pink-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                <div className="w-2 h-2 bg-gradient-to-r from-green-400 to-blue-400 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

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
          Let's Build Your <span className="text-gradient">Perfect Website!</span>
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Answer a few simple questions, and we'll help you create a website tailored to your business. Fast. Easy. Professional.
        </p>
      </div>
      
      <Button 
        onClick={nextStep}
        size="lg"
        className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-12 py-6 text-xl font-bold rounded-full transition-all duration-500 hover:scale-110 shadow-2xl animate-glow"
      >
        <Sparkles className="mr-3 w-6 h-6" />
        Get Started
        <ChevronRight className="ml-3 w-6 h-6" />
      </Button>
    </div>
  );

  const BusinessTypeStep = () => (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          What type of business are you setting up a website for?
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose the category that best describes your business
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {filteredSteps[currentStep].options?.map((option: any, index: number) => (
          <Card 
            key={index}
            className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl hover:-translate-y-4 border-2 ${
              formData.businessType === option.value ? 'border-teal-500 shadow-xl' : 'border-transparent'
            }`}
            onClick={() => {
              updateFormData('businessType', option.value);
              setTimeout(nextStep, 500);
            }}
          >
            <CardContent className="p-8 text-center">
              <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${option.gradient} flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 text-white`}>
                {option.icon}
              </div>
              <h3 className="text-xl font-bold text-gray-900 group-hover:text-gradient transition-all duration-300">
                {option.name}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const StyleStep = () => (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          What style suits your brand?
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Choose a design aesthetic that reflects your business personality
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        {filteredSteps[currentStep].options?.map((option: any, index: number) => (
          <Card 
            key={index}
            className={`group cursor-pointer transition-all duration-500 hover:shadow-2xl border-2 ${
              formData.style === option.value ? 'border-teal-500 shadow-xl' : 'border-transparent'
            }`}
            onClick={() => {
              updateFormData('style', option.value);
            }}
          >
            <CardContent className="p-8">
              <div className={`w-full h-32 rounded-lg bg-gradient-to-br ${option.gradient} mb-6 relative overflow-hidden`}>
                <div className="absolute inset-0 bg-black/20"></div>
                <div className="absolute bottom-4 left-4 text-white">
                  <div className="text-sm font-bold">{option.name}</div>
                </div>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{option.name}</h3>
              <p className="text-gray-600">{option.preview}</p>
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
          disabled={!formData.style}
          size="lg"
          className="bg-gradient-to-r from-teal-500 to-purple-500"
        >
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const PagesStep = () => (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          What pages do you need on your website?
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Select all the pages that are relevant to your business
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {filteredSteps[currentStep].options?.filter((option: any) => 
          !option.condition || option.condition.split('|').includes(formData.businessType)
        ).map((option: any, index: number) => (
          <Card 
            key={index}
            className={`cursor-pointer transition-all duration-300 border-2 ${
              formData.pages.includes(option.value) ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
            } ${option.required ? 'opacity-75' : ''}`}
            onClick={() => {
              if (option.required) return;
              const newPages = formData.pages.includes(option.value)
                ? formData.pages.filter((p: string) => p !== option.value)
                : [...formData.pages, option.value];
              updateFormData('pages', newPages);
            }}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{option.name}</h3>
                  {option.required && <span className="text-sm text-gray-500">Required</span>}
                </div>
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  formData.pages.includes(option.value) || option.required ? 'border-teal-500 bg-teal-500' : 'border-gray-300'
                }`}>
                  {(formData.pages.includes(option.value) || option.required) && <Check className="w-4 h-4 text-white" />}
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
        <Button onClick={nextStep} size="lg" className="bg-gradient-to-r from-teal-500 to-purple-500">
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const SocialStep = () => (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Connect your social media accounts
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Link your social media to increase engagement with customers
        </p>
      </div>
      
      <div className="max-w-2xl mx-auto space-y-4 mb-8">
        {[
          { name: 'Instagram', icon: <Instagram className="w-6 h-6" />, key: 'instagram', color: 'from-pink-500 to-purple-500' },
          { name: 'Facebook', icon: <Facebook className="w-6 h-6" />, key: 'facebook', color: 'from-blue-500 to-blue-600' },
          { name: 'Twitter', icon: <Twitter className="w-6 h-6" />, key: 'twitter', color: 'from-blue-400 to-blue-500' },
          { name: 'LinkedIn', icon: <Linkedin className="w-6 h-6" />, key: 'linkedin', color: 'from-blue-600 to-blue-700' }
        ].map((platform, index) => (
          <Card key={index} className="border-2 border-gray-200 hover:border-teal-300 transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 rounded-full bg-gradient-to-r ${platform.color} flex items-center justify-center text-white`}>
                  {platform.icon}
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{platform.name}</h3>
                  <input 
                    type="url" 
                    placeholder={`Enter your ${platform.name} URL`}
                    className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    onChange={(e) => updateFormData('socialMedia', { ...formData.socialMedia, [platform.key]: e.target.value })}
                  />
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
        <Button onClick={nextStep} size="lg" className="bg-gradient-to-r from-teal-500 to-purple-500">
          Continue
          <ChevronRight className="ml-2 w-5 h-5" />
        </Button>
      </div>
    </div>
  );

  const ContactStep = () => (
    <div className="py-8">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
          Enter your contact information and location
        </h2>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
          Help customers find and contact your business
        </p>
      </div>
      
      <div className="max-w-2xl mx-auto space-y-6 mb-8">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-2" />
              Phone Number
            </label>
            <input 
              type="tel" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="(555) 123-4567"
              onChange={(e) => updateFormData('contactInfo', { ...formData.contactInfo, phone: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              <Mail className="w-4 h-4 inline mr-2" />
              Email Address
            </label>
            <input 
              type="email" 
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="hello@yourbusiness.com"
              onChange={(e) => updateFormData('contactInfo', { ...formData.contactInfo, email: e.target.value })}
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            <MapPin className="w-4 h-4 inline mr-2" />
            Business Address
          </label>
          <input 
            type="text" 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            placeholder="123 Main Street, City, State 12345"
            onChange={(e) => updateFormData('contactInfo', { ...formData.contactInfo, address: e.target.value })}
          />
        </div>
        
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Business Description</label>
          <textarea 
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent h-24"
            placeholder="Tell customers what makes your business special..."
            onChange={(e) => updateFormData('contactInfo', { ...formData.contactInfo, description: e.target.value })}
          />
        </div>
      </div>
      
      <div className="flex justify-between">
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

  const LaunchStep = () => (
    <div className="text-center py-16">
      <div className="mb-8">
        <div className="w-32 h-32 mx-auto mb-6 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400 to-purple-500 rounded-full animate-pulse"></div>
          <div className="absolute inset-2 bg-white rounded-full flex items-center justify-center">
            <PartyPopper className="w-16 h-16 text-teal-500 animate-bounce" />
          </div>
        </div>
        <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
          <span className="text-gradient">Congratulations!</span>
          <br />Your website is ready to launch!
        </h2>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8 leading-relaxed">
          Your beautiful website is ready to go live and start attracting customers
        </p>
      </div>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
        <Button 
          size="lg"
          className="bg-gradient-to-r from-teal-500 via-purple-500 to-orange-500 hover:from-teal-600 hover:via-purple-600 hover:to-orange-600 text-white px-12 py-6 text-xl font-bold rounded-full transition-all duration-500 hover:scale-110 shadow-2xl animate-glow"
        >
          <Rocket className="mr-3 w-6 h-6" />
          Launch My Website
          <Sparkles className="ml-3 w-6 h-6" />
        </Button>
        
        <Button 
          onClick={() => setCurrentStep(filteredSteps.length - 2)}
          variant="outline" 
          size="lg"
          className="px-8 py-4 text-lg font-bold rounded-full"
        >
          Review Changes
        </Button>
      </div>
      
      <div className="mt-12 text-center">
        <p className="text-gray-500 font-medium">
          ✨ Launch in seconds • 🚀 No technical skills needed • 💎 30-day money-back guarantee
        </p>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    const step = filteredSteps[currentStep];
    if (!step) return null;

    switch (step.component) {
      case 'welcome': return <WelcomeStep />;
      case 'business-type': return <BusinessTypeStep />;
      case 'style': return <StyleStep />;
      case 'pages': return <PagesStep />;
      case 'social': return <SocialStep />;
      case 'contact': return <ContactStep />;
      case 'launch': return <LaunchStep />;
      default: return <div>Step not implemented</div>;
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
