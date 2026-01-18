import React, { PropsWithChildren } from "react";
import { PhonePortalProvider } from "./phone-portal";

type LivePhoneFrameProps = {
  className?: string;
  widthClass?: string;
  heightClass?: string;
};

export function LivePhoneFrame({
                                 children,
                                 className = "",
                                 widthClass = "w-[320px]",
                                 heightClass = "h-[650px]",
                               }: PropsWithChildren<LivePhoneFrameProps>) {
  return (
    <div className={`relative ${className} flex justify-center`}>
      {/* --- IPHONE 14 PRO GEHÄUSE --- */}
      <div
        className={`
          relative box-content bg-black border-[10px] border-[#1a1a1a] 
          rounded-[3rem] shadow-2xl overflow-hidden ring-1 ring-gray-900/40
          ${widthClass} ${heightClass}
        `}
        style={{
          // Subtiler, realistischer Schatten und leichte Spiegelung am Rand
          boxShadow: "0 0 0 1px #000, 0 20px 40px -10px rgba(0,0,0,0.6)"
        }}
      >
        {/* --- DYNAMIC ISLAND (Die Pille) --- */}
        {/* Sie schwebt jetzt (top-3) und ist kleiner */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 flex justify-center pointer-events-none">
          <div className="w-[96px] h-[26px] bg-black rounded-full flex items-center justify-center gap-2 shadow-sm ring-1 ring-white/5">
            {/* Kamera & Sensoren ganz subtil */}
            <div className="w-2 h-2 rounded-full bg-[#0a0a0a] shadow-inner opacity-60" />
            <div className="w-1.5 h-1.5 rounded-full bg-[#080808] opacity-60" />
          </div>
        </div>

        {/* --- BUTTONS (Seitlich) --- */}
        {/* Power Button (Rechts) */}
        <div className="absolute top-28 -right-[13px] w-[3px] h-14 bg-[#1a1a1a] rounded-r-md" />
        {/* Volume Up (Links) */}
        <div className="absolute top-28 -left-[13px] w-[3px] h-10 bg-[#1a1a1a] rounded-l-md" />
        {/* Volume Down (Links) */}
        <div className="absolute top-44 -left-[13px] w-[3px] h-10 bg-[#1a1a1a] rounded-l-md" />
        {/* Mute Switch (Links oben) */}
        <div className="absolute top-16 -left-[13px] w-[3px] h-6 bg-[#1a1a1a] rounded-l-md" />

        {/* --- SCREEN CONTENT --- */}
        <div className="w-full h-full bg-white overflow-hidden rounded-[2.2rem] pointer-events-auto relative">

          {/* Status Bar (Uhrzeit & Icons passend zur Dynamic Island) */}
          <div className="absolute top-0 left-0 w-full h-12 px-6 pt-3.5 flex justify-between items-start z-40 text-[10px] font-semibold text-black mix-blend-difference pointer-events-none select-none">
            <span className="ml-2">9:41</span>
            <div className="flex gap-1.5 mr-1.5 items-center">
              {/* Signal */}
              <div className="flex gap-0.5 items-end h-2.5">
                <div className="w-0.5 h-1 bg-current rounded-[0.5px]" />
                <div className="w-0.5 h-1.5 bg-current rounded-[0.5px]" />
                <div className="w-0.5 h-2 bg-current rounded-[0.5px]" />
                <div className="w-0.5 h-2.5 bg-current/30 rounded-[0.5px]" />
              </div>
              {/* Wifi */}
              <div className="w-3 h-3 relative">
                <div className="absolute inset-0 border-t-2 border-current rounded-full mt-1" />
              </div>
              {/* Battery */}
              <span className="h-2.5 w-5 border border-current rounded-[3px] relative opacity-90">
                  <span className="absolute inset-0.5 right-1 bg-current rounded-[1px]" />
                </span>
            </div>
          </div>

          {/* Der eigentliche Inhalt */}
          <div className="w-full h-full">
            <PhonePortalProvider>
              {children}
            </PhonePortalProvider>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LivePhoneFrame;