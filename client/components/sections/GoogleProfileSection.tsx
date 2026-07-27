import { useState } from "react";
import { Sparkles, MessageSquare, Megaphone, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export const GOOGLE_SECTION_HEADING =
  "Dein digitaler Gastgeber";

export const GOOGLE_SECTION_BODY =
  "Maitr hilft Cafés und Restaurants, ihr Google Unternehmensprofil, Instagram & Co. aktuell zu halten. Mit ausdrücklicher Zustimmung des Inhabers beantwortet Maitr Bewertungen, veröffentlicht Beiträge und pflegt Öffnungszeiten. Jede Aktion wird vor der Veröffentlichung vom Inhaber freigegeben.";

const featuresData = {
  bewertungen: {
    title: "Bewertungen",
    icon: MessageSquare,
    description: "Maitr beantwortet deine Bewertungen vollautomatisch und professionell in Sekunden. Du behältst jederzeit die Kontrolle und gibst Antworten mit einem Klick frei."
  },
  instagram: {
    title: "Instagram & Co.",
    icon: Megaphone,
    description: "Maitr synchronisiert deine Inhalte und pflegt dein Google Profil, Instagram und weitere Kanäle gleichzeitig – ohne doppelten Aufwand."
  },
  performance: {
    title: "Performance",
    icon: Calendar,
    description: "Alle wichtigen Metriken wie Profilaufrufe, Routenanfragen und Reservierungen auf einen Blick. So siehst du sofort, wie Maitr dein Geschäft wachsen lässt."
  }
};

export default function GoogleProfileSection() {
  const [activeFeature, setActiveFeature] = useState<keyof typeof featuresData | null>(null);

  return (
    <section
      id="google-profil"
      aria-labelledby="google-profil-titel"
      className="py-24 md:py-32 bg-white relative overflow-hidden"
    >
      {/* Colorful Concentric Circles Background */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className="w-[400px] h-[400px] rounded-full border-2 border-teal-500/30 absolute"
          style={{ animation: 'ring-breath 4s ease-in-out infinite' }}
        />
        <div 
          className="w-[600px] h-[600px] rounded-full border-2 border-purple-500/25 absolute"
          style={{ animation: 'ring-breath 5s ease-in-out infinite 1s' }}
        />
        <div 
          className="w-[800px] h-[800px] rounded-full border-2 border-indigo-500/20 absolute"
          style={{ animation: 'ring-breath 6s ease-in-out infinite 2s' }}
        />
        <div 
          className="w-[1000px] h-[1000px] rounded-full border-2 border-blue-500/15 absolute"
          style={{ animation: 'ring-breath 7s ease-in-out infinite 3s' }}
        />
        <div 
          className="w-[1200px] h-[1200px] rounded-full border-2 border-teal-500/10 absolute"
          style={{ animation: 'ring-breath 8s ease-in-out infinite 4s' }}
        />
      </div>

      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* LEFT: Text Content */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-6">
              
              {/* Badge matching "So funktioniert es" */}
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-teal-100 to-purple-100 px-6 py-3 rounded-full shadow-sm">
                <Sparkles className="w-5 h-5 text-teal-600" />
                <span className="text-teal-700 font-bold">
                  Google, Instagram & Co. in einer App
                </span>
              </div>

              <h2
                id="google-profil-titel"
                className="text-4xl md:text-6xl font-black text-gray-900 font-display tracking-tight leading-[1.05]"
              >
                Willkommen bei <br />
                <span className="text-gradient">
                  Deinem Gastgeber
                </span>
              </h2>

              <p className="text-lg text-gray-600 font-medium leading-relaxed max-w-xl">
                {GOOGLE_SECTION_BODY}
              </p>
            </div>

            {/* Clickable Feature Pills */}
            <div className="pt-4 space-y-6">
              <div className="flex flex-wrap gap-3">
                {(Object.entries(featuresData) as [keyof typeof featuresData, typeof featuresData[keyof typeof featuresData]][]).map(([key, feature]) => {
                  const Icon = feature.icon;
                  const isActive = activeFeature === key;
                  
                  return (
                    <button
                      key={key}
                      onClick={() => setActiveFeature(isActive ? null : key)}
                      className={cn(
                        "px-5 py-2.5 rounded-full font-bold text-sm flex items-center gap-2 transition-all duration-300 shadow-sm border-2",
                        isActive 
                          ? "bg-slate-900 border-slate-900 text-white shadow-lg scale-105" 
                          : "bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50"
                      )}
                    >
                      <Icon className="w-4 h-4" /> {feature.title}
                    </button>
                  );
                })}
              </div>

              {/* Feature Explanation Area */}
              <div 
                className={cn(
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  activeFeature ? "max-h-[200px] opacity-100" : "max-h-0 opacity-0"
                )}
              >
                {activeFeature && (
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-100 shadow-inner">
                    <p className="text-slate-700 font-medium leading-relaxed">
                      {featuresData[activeFeature].description}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* RIGHT: Floating Image Only */}
          <div className="lg:col-span-7 relative min-h-[600px] flex items-center justify-center lg:justify-end">
            
            <div 
              className="relative w-full max-w-[900px] flex items-center justify-center z-20"
            >
              <img
                src="/iPhone 16.png"
                alt="Maitr App Mockups"
                className="w-[140%] h-auto max-w-none object-contain drop-shadow-2xl"
                style={{ 
                  filter: 'drop-shadow(0 45px 55px rgba(0,0,0,0.35))',
                  imageRendering: 'high-quality'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Global Style for the float animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes float {
          0% { transform: translateY(0px); }
          50% { transform: translateY(-25px); }
          100% { transform: translateY(0px); }
        }
        @keyframes ring-breath {
          0%, 100% { opacity: 0.5; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
      `}} />
    </section>
  );
}
