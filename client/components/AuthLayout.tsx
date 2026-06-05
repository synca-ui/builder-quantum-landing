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
      
      {/* ══ LEFT: Clean Brand Image Panel ═════════════════════════════════════ */}
      <div className="relative hidden lg:flex w-1/2 p-10 h-screen overflow-hidden items-center justify-center bg-[#E6EFEC]">
        
        {/* Background gradient hint */}
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-purple-500/5 pointer-events-none" />

        {/* Clean central image container */}
        <div className="relative w-full max-w-[620px] aspect-[4/3] rounded-3xl overflow-hidden shadow-[0_20px_50px_-20px_rgba(0,0,0,0.15)] bg-white p-4 animate-in fade-in zoom-in-95 duration-700">
          <img 
            src={mode === "login" ? "/images/auth/login_hero.png" : "/images/auth/signup_hero.jpg"} 
            alt={mode === "login" ? "Maitr Login Dashboard" : "Maitr Restaurant Web-App Builder"} 
            className="w-full h-full object-cover rounded-2xl select-none"
            draggable="false"
          />
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
          <div className="mb-8 text-center lg:text-left block">
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
