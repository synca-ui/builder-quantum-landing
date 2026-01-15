import { useConfiguratorStore } from "@/store/configuratorStore";
import { Coffee, Utensils, Star, Building, Menu } from "lucide-react";
// FIX: defaultTemplates entfernt, da es hier nicht existiert
import { normalizeImageSrc, fontOptions } from "@/lib/configurator-data"; 
// FIX: defaultTemplates von hier importieren
import { defaultTemplates } from "@/components/template/TemplateRegistry"; 
import { useState } from "react";

// Types für Props (optional, aber gut für Typescript)
interface TemplatePreviewContentProps {
  currentStep?: number;
  previewTemplateId?: string | null;
  fontOptions?: any[];
  templates?: any[];
  formData?: any;
  setShowCart?: (show: boolean) => void;
  showCart?: boolean;
  cartItems?: any[];
  cartItemsCount?: number;
  addToCart?: (item: any) => void;
  removeFromCart?: (item: string) => void;
  normalizeImageSrc?: (img: any) => string;
}

export function TemplatePreviewContent({
  // Wir akzeptieren Props, greifen aber zur Sicherheit auch auf den Store zu
  previewTemplateId
}: TemplatePreviewContentProps) {
  
  // 1. Store Access (als Fallback/Source of Truth)
  const storeData = useConfiguratorStore((s) => ({
    businessName: s.business.name,
    businessType: s.business.type,
    template: s.design.template,
    primaryColor: s.design.primaryColor,
    secondaryColor: s.design.secondaryColor,
    fontFamily: s.design.fontFamily,
    // ... andere Felder bei Bedarf
  }));

  // 2. Bestimme das aktive Template (Prop > Store > Default)
  const activeTemplateId = previewTemplateId || storeData.template || "modern";
  
  // 3. Suche die Template-Daten
  const currentTemplate = defaultTemplates.find(t => t.id === activeTemplateId) || defaultTemplates[0];
  const fontClass = fontOptions.find(f => f.id === storeData.fontFamily)?.class || "font-sans";

  // 4. Styles berechnen
  const styles = {
    color: storeData.primaryColor || "#000",
    // Hier können weitere dynamische Styles hin
  };

  const [menuOpen, setMenuOpen] = useState(false);

  // --- Render Helpers ---
  const renderHome = () => (
    <div className="p-4 space-y-4">
       <div className="text-center py-8">
          <h1 className="text-2xl font-bold" style={{ color: styles.color }}>
            {storeData.businessName || "Your Business"}
          </h1>
          <p className="text-gray-500 mt-2">Welcome to our new app!</p>
       </div>
       <div className="grid grid-cols-2 gap-2">
          {[1,2,3,4].map(i => (
             <div key={i} className="bg-gray-100 rounded-lg h-24 flex items-center justify-center">
                <span className="text-xs text-gray-400">Item {i}</span>
             </div>
          ))}
       </div>
    </div>
  );

  // --- Template Shells ---
  
  // Minimalist Shell
  if (activeTemplateId === "minimalist") {
    return (
      <div className={`h-full bg-white flex flex-col ${fontClass}`}>
        <div className="flex items-center justify-between p-4 border-b">
           <span className="font-bold">{storeData.businessName}</span>
           <Menu className="w-5 h-5" onClick={() => setMenuOpen(!menuOpen)} />
        </div>
        <div className="flex-1 overflow-y-auto pb-20">
           {renderHome()}
        </div>
      </div>
    );
  }

  // Modern Shell
  if (activeTemplateId === "modern") {
     return (
      <div className={`h-full flex flex-col ${fontClass}`} style={{ background: `linear-gradient(135deg, ${storeData.secondaryColor || '#f3f4f6'}, ${storeData.primaryColor || '#e5e7eb'})` }}>
        <div className="p-4 text-white flex justify-between items-center backdrop-blur-md bg-white/10">
           <span className="font-bold">{storeData.businessName}</span>
           <Menu className="w-5 h-5" />
        </div>
        <div className="flex-1 overflow-y-auto p-4 pb-20">
           <div className="bg-white/80 backdrop-blur-sm rounded-xl min-h-full shadow-lg overflow-hidden">
              {renderHome()}
           </div>
        </div>
      </div>
     )
  }

  // Fallback / Generic View
  return (
    <div className={`h-full bg-gray-50 flex flex-col ${fontClass}`}>
      <div className="p-4 bg-white shadow-sm flex justify-between items-center">
         <span className="font-bold text-gray-800">{storeData.businessName || "Preview"}</span>
      </div>
      <div className="flex-1 p-4 flex items-center justify-center text-gray-400 text-sm text-center">
         Select a template to view content.<br/>
         Current: {currentTemplate?.name}
      </div>
    </div>
  );
}
