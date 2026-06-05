/**
 * Shared layout used by both Login.tsx and Signup.tsx.
 * Left: dynamic masonry-style grid with isometric restaurant photos and stats.
 * Right: Clerk widget in a clean, bright panel.
 */
import { type ReactNode } from "react";
import { Link } from "react-router-dom";

export function AuthLayout({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "login" | "signup";
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#E6EFEC] overflow-hidden font-sans">
      
      {/* ══ LEFT: Dynamic Photo & Stats Grid ═════════════════════════════════════ */}
      <div className="relative hidden lg:flex w-1/2 p-6 xl:p-10 h-screen overflow-hidden items-center justify-center">
        
        {/* Background gradient hint */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 to-purple-500/5 pointer-events-none" />

        {/* CSS Grid for masonry-style layout */}
        <div className="relative w-full max-w-[700px] aspect-[4/3] grid grid-cols-3 grid-rows-3 gap-3 xl:gap-4 z-10">
          
          {/* Top Left: Stat Block (Orange) */}
          <div className="col-span-1 row-span-1 rounded-2xl p-6 flex flex-col justify-center bg-[#f97316] text-white shadow-md transform transition-transform hover:scale-[1.02]">
            <h3 className="text-4xl xl:text-5xl font-bold tracking-tight mb-2">5 Min</h3>
            <p className="text-xs xl:text-sm font-medium opacity-90 leading-snug">
              bis deine fertige Web-App live und für Kunden erreichbar ist.
            </p>
          </div>

          {/* Top Middle: Image 1 */}
          <div className="col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-md group">
            <img 
              src="/images/auth/kitchen_1.jpg" 
              alt="Restaurant Interior Isometric" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>

          {/* Top Right: Image 2 */}
          <div className="col-span-1 row-span-1 rounded-2xl overflow-hidden shadow-md group">
            <img 
              src="/images/auth/kitchen_2.jpg" 
              alt="Kitchen Isometric" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>

          {/* Middle Left: Image 3 (Large) */}
          <div className="col-span-1 row-span-2 rounded-2xl overflow-hidden shadow-md group">
            <img 
              src="/images/auth/kitchen_3.png" 
              alt="Chef Isometric" 
              className="w-full h-full object-cover object-left transition-transform duration-700 group-hover:scale-110"
            />
          </div>

          {/* Middle Right: Stat Block (Green) */}
          <div className="col-span-1 row-span-1 rounded-2xl p-6 flex flex-col justify-center bg-[#10b981] text-white shadow-md transform transition-transform hover:scale-[1.02]">
            <h3 className="text-4xl xl:text-5xl font-bold tracking-tight mb-2">100%</h3>
            <p className="text-xs xl:text-sm font-medium opacity-90 leading-snug">
              No-Code. Maitr übernimmt Design, Technik und Hosting komplett.
            </p>
          </div>

          {/* Bottom Middle: Stat Block (Dark) */}
          <div className="col-span-1 row-span-1 rounded-2xl p-6 flex flex-col justify-center bg-slate-900 text-white shadow-md transform transition-transform hover:scale-[1.02]">
            <h3 className="text-3xl xl:text-4xl font-bold tracking-tight mb-2 bg-gradient-to-r from-teal-400 to-purple-400 bg-clip-text text-transparent">Zero</h3>
            <p className="text-xs xl:text-sm font-medium opacity-90 leading-snug">
              Vorkenntnisse benötigt. Sag uns einfach wer du bist.
            </p>
          </div>

          {/* Bottom Right: Image 4 */}
          <div className="col-span-1 row-span-1 rounded-2xl overflow-hidden shadow-md group">
            <img 
              src="/images/auth/kitchen_4.jpg" 
              alt="Detailed Kitchen" 
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
            />
          </div>

        </div>
      </div>

      {/* ══ RIGHT: Auth form panel ════════════════════════════════════════════ */}
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12 relative bg-white lg:rounded-l-[2.5rem] shadow-[-20px_0_40px_rgba(0,0,0,0.03)] z-20">
        
        {/* Decorative background blur inside the right panel */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: "radial-gradient(ellipse 80% 80% at 50% -20%, rgba(20,184,166,0.15), transparent)",
          }}
        />

        {/* Logo */}
        <div className="absolute top-8 left-8 lg:top-12 lg:left-12 z-10">
          <Link to="/" className="inline-flex items-center gap-2">
            <span
              className="text-3xl font-black tracking-tight"
              style={{
                background: "linear-gradient(90deg, #14b8a6, #a855f7, #f97316)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Maitr
            </span>
          </Link>
        </div>

        {/* Content Wrapper */}
        <div className="w-full max-w-md relative z-10 flex flex-col pt-12 lg:pt-0">
          
          {/* Header text for the form area */}
          <div className="mb-8 text-center lg:text-left hidden lg:block">
            <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">
              {mode === "login" ? "Willkommen zurück" : "Starte jetzt"}
            </h1>
            <p className="text-gray-500 text-sm">
              {mode === "login" 
                ? "Melde dich an, um deine Web-App zu verwalten." 
                : "Erstelle dein Konto und sei in 5 Minuten online."}
            </p>
          </div>

          {/* The Clerk component is injected here */}
          {children}

        </div>

        {/* Footer */}
        <p className="absolute bottom-8 text-xs text-gray-400 text-center w-full max-w-sm">
          Mit der Anmeldung akzeptierst du unsere{" "}
          <Link to="/agb" className="underline hover:text-teal-600 transition-colors">AGB</Link>
          {" & "}
          <Link to="/datenschutz" className="underline hover:text-teal-600 transition-colors">Datenschutz</Link>
        </p>

      </div>
    </div>
  );
}
