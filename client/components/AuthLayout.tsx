/**
 * Shared layout used by both Login.tsx and Signup.tsx.
 * Left: immersive autoplaying video panel with brand overlay.
 * Right: Clerk widget in a clean, bright panel.
 */
import { type ReactNode } from "react";
import { Link } from "react-router-dom";

const VIDEO_SRC = "/images/auth/Generated Video June 07, 2026 - 2_10PM.mp4";

export function AuthLayout({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "login" | "signup";
}) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden font-sans" style={{ background: "#d4b896" }}>

      {/* ══ LEFT: Video Brand Panel ═════════════════════════════════════════════ */}
      <div className="relative hidden lg:flex w-[52%] h-screen overflow-hidden items-end justify-start">

        {/* Autoplay video – covers the entire left panel */}
        <video
          src={VIDEO_SRC}
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Multi-stop gradient overlay: transparent top → rich bottom for text legibility */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.65) 80%, rgba(0,0,0,0.80) 100%)",
          }}
        />

        {/* Top-left Maitr logo on the video side */}
        <div className="absolute top-10 left-10 z-10">
          <span
            className="text-3xl font-black tracking-tight"
            style={{
              background: "linear-gradient(90deg, #5eead4, #c084fc, #fb923c)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Maitr
          </span>
        </div>

        {/* Bottom brand copy */}
        <div className="relative z-10 p-12 pb-14 space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="inline-block w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
            <span className="text-teal-300 text-xs font-semibold uppercase tracking-widest">
              Deine Web-App in 5 Minuten
            </span>
          </div>
          <h2 className="text-4xl xl:text-5xl font-black text-white leading-tight tracking-tight">
            Dein Restaurant.<br />
            <span
              style={{
                background: "linear-gradient(90deg, #5eead4, #c084fc)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Online. Sofort.
            </span>
          </h2>
          <p className="text-white/60 text-sm max-w-xs leading-relaxed">
            No-Code. Kein Designer. Kein Entwickler. Maitr übernimmt alles – du gibst einfach an, wer du bist.
          </p>

          {/* Stat pills */}
          <div className="flex items-center gap-3 pt-2 flex-wrap">
            {[
              { label: "5 Min", sub: "Setup" },
              { label: "100%", sub: "No-Code" },
              { label: "Zero", sub: "Vorkenntnisse" },
            ].map(({ label, sub }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 bg-white/10 backdrop-blur-sm border border-white/15 rounded-full px-4 py-1.5"
              >
                <span className="text-white font-bold text-sm">{label}</span>
                <span className="text-white/50 text-xs">{sub}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══ RIGHT: Auth form panel ══════════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12 relative z-20"
        style={{
          /* Warm sandy base matching the video's background tone */
          background: "linear-gradient(135deg, #e8d5bb 0%, #dfc9a8 30%, #d4b896 60%, #c9a87e 100%)",
          boxShadow: "-40px 0 80px -10px rgba(0,0,0,0.35), inset 40px 0 60px -20px rgba(255,255,255,0.25)",
        }}
      >

        {/* Depth layers: top light catch + bottom shadow for 3D box feel */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.08) 25%, transparent 55%, rgba(0,0,0,0.10) 100%)",
          }}
        />
        {/* Left-edge specular highlight simulating light from the video scene */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to right, rgba(255,255,255,0.18) 0%, transparent 30%)",
          }}
        />

        {/* Logo (mobile only – desktop logo is on the video panel) */}
        <div className="absolute top-8 left-8 z-10 lg:hidden" style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.15))" }}>
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

          {/* Page header */}
          <div className="mb-8 text-center lg:text-left">
            <h1 className="text-3xl font-bold mb-2 tracking-tight" style={{ color: "#2d1f0e" }}>
              {mode === "login" ? "Willkommen zurück" : "Starte jetzt"}
            </h1>
            <p className="text-sm" style={{ color: "rgba(45,31,14,0.55)" }}>
              {mode === "login"
                ? "Melde dich an, um deine Web-App zu verwalten."
                : "Erstelle dein Konto und sei in 5 Minuten online."}
            </p>
          </div>

          {/* Clerk component */}
          {children}

        </div>

        {/* Footer */}
        <p className="absolute bottom-8 text-xs text-center w-full max-w-sm" style={{ color: "rgba(45,31,14,0.45)" }}>
          Mit der Anmeldung akzeptierst du unsere{" "}
          <Link to="/agb" className="underline transition-colors" style={{ color: "rgba(45,31,14,0.6)" }} onMouseEnter={e => (e.currentTarget.style.color = "#92400e")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(45,31,14,0.6)")}>AGB</Link>
          {" & "}
          <Link to="/datenschutz" className="underline transition-colors" style={{ color: "rgba(45,31,14,0.6)" }} onMouseEnter={e => (e.currentTarget.style.color = "#92400e")} onMouseLeave={e => (e.currentTarget.style.color = "rgba(45,31,14,0.6)")}>Datenschutz</Link>
        </p>

      </div>
    </div>
  );
}
