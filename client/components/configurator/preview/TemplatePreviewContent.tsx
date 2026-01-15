import { useConfiguratorStore, useConfiguratorActions } from "@/store/configuratorStore";
import { Coffee, Utensils, Star, Building, Menu, ShoppingBag, MapPin, Phone, Mail, Clock, Instagram, Facebook, Plus, ChevronRight, X, Camera } from "lucide-react";
import { normalizeImageSrc, fontOptions, defaultTemplates } from "@/lib/configurator-data";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import { motion } from "framer-motion";

export function TemplatePreviewContent() {
  // Store Access
  const formData = useConfiguratorStore((s) => ({
    businessName: s.business.name,
    businessType: s.business.type,
    template: s.design.template,
    primaryColor: s.design.primaryColor,
    secondaryColor: s.design.secondaryColor,
    fontFamily: s.design.fontFamily,
    fontSize: s.design.fontSize,
    language: s.settings.language,
    themeMode: s.settings.themeMode,
    selectedPages: s.content.selectedPages,
    menuItems: s.content.menuItems,
    gallery: s.content.gallery,
    contactMethods: s.business.contactMethods,
    openingHours: s.business.openingHours,
    socialMedia: s.business.socialMedia,
    onlineOrdering: s.features.onlineOrdering,
    // Add other fields as needed
  }));

  // Local State for Preview Interaction
  const [activePage, setActivePage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [showCart, setShowCart] = useState(false);
  const [cartItems, setCartItems] = useState<any[]>([]);

  // Derived Values
  const currentTemplate = defaultTemplates.find(t => t.id === formData.template) || defaultTemplates[0];
  const fontClass = fontOptions.find(f => f.id === formData.fontFamily)?.class || "font-sans";
  
  // Helper to determine text color style
  const styles = {
    userPrimary: formData.primaryColor,
    userSecondary: formData.secondaryColor,
    // Add logic for text colors based on theme if needed
  };

  const getBusinessIcon = () => {
    switch (formData.businessType) {
      case "cafe": return <Coffee className="w-5 h-5" />;
      case "restaurant": return <Utensils className="w-5 h-5" />;
      case "bar": return <Star className="w-5 h-5" />;
      default: return <Building className="w-5 h-5" />;
    }
  };

  // --- Render Helpers ---
  // (Simplified for brevity - assumes logic similar to original file)
  const renderHome = () => (
    <div className="p-4 space-y-4">
       <div className="text-center py-8">
          <h1 className="text-2xl font-bold" style={{ color: styles.userPrimary }}>{formData.businessName || "Your Business"}</h1>
          <p className="text-gray-500 mt-2">Welcome to our new app!</p>
       </div>
       {/* Example Content */}
       <div className="grid grid-cols-2 gap-2">
          {[1,2,3,4].map(i => (
             <div key={i} className="bg-gray-100 rounded-lg h-24 flex items-center justify-center">
                <span className="text-xs text-gray-400">Item {i}</span>
             </div>
          ))}
       </div>
    </div>
  );

  const renderContent = () => {
     switch(activePage) {
        case "home": return renderHome();
        case "menu": return <div className="p-4">Menu Page Placeholder</div>;
        default: return <div className="p-4">Page {activePage}</div>;
     }
  }

  // --- Template Shells ---
  // Minimalist Shell
  if (formData.template === "minimalist") {
    return (
      <div className={`h-full bg-white flex flex-col ${fontClass}`}>
        <div className="flex items-center justify-between p-4 border-b">
           <span className="font-bold">{formData.businessName}</span>
           <Menu className="w-5 h-5" onClick={() => setMenuOpen(!menuOpen)} />
        </div>
        <div className="flex-1 overflow-y-auto pb-20">
           {renderContent()}
        </div>
        {/* Navigation Bar if needed */}
      </div>
    );
  }

  // Modern Shell (Gradient)
  if (formData.template === "modern") {
     return (
      <div className={`h-full flex flex-col ${fontClass}`} style={{ background: `linear-gradient(135deg, ${styles.userSecondary || '#eee'}, ${styles.userPrimary || '#ccc'})` }}>
        <div className="p-4 text-white flex justify-between items-center backdrop-blur-md bg-white/10">
           <span className="font-bold">{formData.businessName}</span>
           <Menu className="w-5 h-5" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-20 text-white">
           {renderContent()}
        </div>
      </div>
     )
  }

  // Default Fallback
  return (
    <div className="h-full bg-gray-50 flex items-center justify-center text-gray-400">
       Select a template to view preview
    </div>
  );
}
