/**
 * Shared layout used by both Login.tsx and Signup.tsx.
 * Left: animated Maitr brand panel with floating UI mockup + orbs.
 * Right: Clerk widget in a frosted-glass card.
 */
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

// ── Floating emoji / icon that bobs up and down ────────────────────────────
function FloatingBadge({
  emoji,
  label,
  style,
  delay = 0,
}: {
  emoji: string;
  label: string;
  style: React.CSSProperties;
  delay?: number;
}) {
  return (
    <div
      className="absolute flex items-center gap-1.5 rounded-2xl px-3 py-1.5 text-xs font-semibold text-white shadow-lg select-none"
      style={{
        background: "rgba(255,255,255,0.14)",
        backdropFilter: "blur(12px)",
        border: "1px solid rgba(255,255,255,0.22)",
        animation: `float 3.5s ease-in-out ${delay}s infinite`,
        ...style,
      }}
    >
      <span className="text-base leading-none">{emoji}</span>
      {label}
    </div>
  );
}

// ── Animated cursor that "types" ──────────────────────────────────────────
function TypingDemo() {
  const phrases = [
    "Restaurant am Dom",
    "Café Sonnenschein",
    "Pizzeria Bella Napoli",
    "Sushi Bar Tokyo",
  ];
  const [phraseIdx, setPhraseIdx] = useState(0);
  const [displayed, setDisplayed] = useState("");
  const [deleting, setDeleting] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    const target = phrases[phraseIdx];
    if (!deleting && displayed.length < target.length) {
      timeoutRef.current = setTimeout(
        () => setDisplayed(target.slice(0, displayed.length + 1)),
        60,
      );
    } else if (!deleting && displayed.length === target.length) {
      timeoutRef.current = setTimeout(() => setDeleting(true), 1800);
    } else if (deleting && displayed.length > 0) {
      timeoutRef.current = setTimeout(
        () => setDisplayed(displayed.slice(0, -1)),
        35,
      );
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setPhraseIdx((i) => (i + 1) % phrases.length);
    }
    return () => clearTimeout(timeoutRef.current);
  });

  return (
    <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur px-4 py-2.5 border border-white/20 w-full max-w-xs">
      <span className="text-white/40 text-xs font-medium shrink-0">🔗 URL:</span>
      <span className="text-white text-sm font-mono flex-1 truncate">
        {displayed}
        <span className="animate-pulse">|</span>
      </span>
    </div>
  );
}

// ── Mini phone mockup ─────────────────────────────────────────────────────
function PhoneMockup() {
  return (
    <div
      className="relative mx-auto"
      style={{ width: 140, height: 280 }}
    >
      {/* Phone shell */}
      <div
        className="absolute inset-0 rounded-[2.2rem]"
        style={{
          background: "rgba(255,255,255,0.12)",
          border: "2px solid rgba(255,255,255,0.25)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.3)",
        }}
      />
      {/* Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-10 h-2 bg-black/60 rounded-full" />
      {/* Screen content */}
      <div className="absolute inset-2 top-8 rounded-[1.6rem] overflow-hidden flex flex-col gap-1.5 p-2"
        style={{ background: "rgba(255,255,255,0.07)" }}
      >
        {/* App bar */}
        <div className="h-6 rounded-xl bg-white/15 flex items-center px-2 gap-1">
          <div className="w-2 h-2 rounded-full bg-teal-300/80" />
          <div className="h-1.5 flex-1 rounded bg-white/20" />
        </div>
        {/* Hero card */}
        <div className="h-14 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, rgba(20,184,166,0.6), rgba(168,85,247,0.6))" }}
        >
          <span className="text-white text-lg">🍽️</span>
        </div>
        {/* List items */}
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex gap-1.5 items-center">
            <div className="w-5 h-5 rounded-lg bg-white/15 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="h-1.5 rounded bg-white/25 w-3/4" />
              <div className="h-1 rounded bg-white/15 w-1/2" />
            </div>
            <div className="h-1.5 w-6 rounded bg-teal-300/50 shrink-0" />
          </div>
        ))}
        {/* Bottom button */}
        <div className="mt-auto h-6 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(90deg, #14b8a6, #a855f7)" }}
        >
          <div className="h-1.5 w-16 rounded bg-white/50" />
        </div>
      </div>
      {/* Home indicator */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full bg-white/40" />
    </div>
  );
}

// ── Main shared layout ────────────────────────────────────────────────────
export function AuthLayout({
  children,
  mode,
}: {
  children: ReactNode;
  mode: "login" | "signup";
}) {
  return (
    <>
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-10px) rotate(1deg); }
        }
        @keyframes orb-drift {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%       { transform: translate(18px, -22px) scale(1.05); }
          66%       { transform: translate(-12px, 14px) scale(0.96); }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      <div className="min-h-screen flex flex-col lg:flex-row overflow-hidden">

        {/* ══ LEFT: Brand panel ══════════════════════════════════════════════ */}
        <div
          className="relative hidden lg:flex flex-col justify-between w-1/2 p-10 overflow-hidden"
          style={{
            background:
              "linear-gradient(140deg, #0d1117 0%, #0f172a 40%, #14103a 75%, #0d1117 100%)",
          }}
        >
          {/* Ambient orbs */}
          {[
            { color: "rgba(20,184,166,0.30)", size: 380, top: "-8%", left: "-10%", dur: "9s" },
            { color: "rgba(168,85,247,0.22)", size: 440, top: "30%", right: "-15%", dur: "12s", delay: "2s" },
            { color: "rgba(249,115,22,0.16)", size: 280, bottom: "-5%", left: "20%", dur: "7s", delay: "1s" },
          ].map((orb, i) => (
            <div
              key={i}
              className="absolute rounded-full pointer-events-none"
              style={{
                width: orb.size,
                height: orb.size,
                background: `radial-gradient(circle, ${orb.color} 0%, transparent 70%)`,
                filter: "blur(60px)",
                animation: `orb-drift ${orb.dur} ease-in-out ${"delay" in orb ? orb.delay : "0s"} infinite`,
                top: "top" in orb ? orb.top : undefined,
                bottom: "bottom" in orb ? orb.bottom : undefined,
                left: "left" in orb ? orb.left : undefined,
                right: "right" in orb ? orb.right : undefined,
              }}
            />
          ))}

          {/* Grid overlay */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage:
                "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Logo */}
          <div className="relative z-10">
            <Link to="/" className="inline-flex items-center gap-2">
              <span
                className="text-2xl font-black tracking-tight"
                style={{
                  background: "linear-gradient(90deg, #5eead4, #c084fc, #fb923c)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Maitr
              </span>
            </Link>
          </div>

          {/* Center hero */}
          <div className="relative z-10 flex flex-col items-center gap-8">
            {/* Typing input */}
            <TypingDemo />

            {/* Phone + floating badges */}
            <div className="relative" style={{ width: 260, height: 320 }}>
              {/* Floating badges */}
              <FloatingBadge emoji="⚡" label="In 5 Min live" style={{ top: -10, left: -30 }} delay={0} />
              <FloatingBadge emoji="🎯" label="Zero-Code" style={{ top: 40, right: -40 }} delay={0.8} />
              <FloatingBadge emoji="📱" label="Mobile-first" style={{ bottom: 60, left: -40 }} delay={1.4} />
              <FloatingBadge emoji="✨" label="KI-generiert" style={{ bottom: 10, right: -30 }} delay={0.4} />

              {/* Spinning ring */}
              <div
                className="absolute inset-0 m-auto rounded-full pointer-events-none"
                style={{
                  width: 220,
                  height: 220,
                  border: "1px dashed rgba(168,85,247,0.35)",
                  animation: "spin-slow 20s linear infinite",
                }}
              />
              <div
                className="absolute inset-0 m-auto rounded-full pointer-events-none"
                style={{
                  width: 260,
                  height: 260,
                  border: "1px dashed rgba(20,184,166,0.25)",
                  animation: "spin-slow 30s linear infinite reverse",
                }}
              />

              <div className="absolute inset-0 flex items-center justify-center">
                <PhoneMockup />
              </div>
            </div>

            <div className="text-center space-y-1">
              <p className="text-white font-bold text-xl">
                Deine Web-App. In Minuten.
              </p>
              <p className="text-white/40 text-sm max-w-xs">
                Kein Code. Kein Designer. Nur du und dein Business.
              </p>
            </div>
          </div>

          {/* Bottom stats */}
          <div className="relative z-10 flex items-center gap-6">
            {[
              { value: "5 Min", label: "bis live" },
              { value: "100%", label: "No-Code" },
              { value: "∞", label: "Möglichkeiten" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div
                  className="text-lg font-black"
                  style={{
                    background: "linear-gradient(90deg, #5eead4, #c084fc)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {s.value}
                </div>
                <div className="text-white/35 text-xs">{s.label}</div>
              </div>
            ))}
            <div className="ml-auto flex items-center gap-2">
              {["🍕", "☕", "🍣", "🍔"].map((e, i) => (
                <span key={i} className="text-lg" style={{ animation: `float 3s ease-in-out ${i * 0.4}s infinite` }}>
                  {e}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ══ RIGHT: Auth form ═══════════════════════════════════════════════ */}
        <div
          className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12 relative overflow-hidden"
          style={{
            background:
              "radial-gradient(ellipse 120% 80% at 60% 30%, rgba(20,184,166,0.07) 0%, rgba(168,85,247,0.05) 50%, #f8fafc 100%)",
          }}
        >
          {/* Subtle pattern */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.025]"
            style={{
              backgroundImage:
                "radial-gradient(circle, #14b8a6 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          {/* Mobile logo */}
          <div className="lg:hidden mb-8 relative z-10">
            <Link to="/" className="inline-flex items-center gap-2">
              <span
                className="text-3xl font-black"
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

          {/* Clerk widget wrapper */}
          <div
            className="relative z-10 w-full"
            style={{ maxWidth: 420 }}
          >
            {/* Decorative glow behind card */}
            <div
              className="absolute -inset-6 rounded-[2rem] pointer-events-none"
              style={{
                background:
                  "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(20,184,166,0.12) 0%, rgba(168,85,247,0.08) 60%, transparent 100%)",
                filter: "blur(20px)",
              }}
            />
            {children}
          </div>

          {/* Footer */}
          <p className="relative z-10 mt-8 text-xs text-gray-400 text-center">
            Mit der Anmeldung akzeptierst du unsere{" "}
            <Link to="/agb" className="underline hover:text-teal-600 transition-colors">AGB</Link>
            {" & "}
            <Link to="/datenschutz" className="underline hover:text-teal-600 transition-colors">Datenschutz</Link>
          </p>
        </div>
      </div>
    </>
  );
}
