import React, { useEffect, useRef, useState } from "react";
import {
  Globe, Phone, Mail, Instagram, Utensils,
  Clock, TrendingUp, ExternalLink, Sparkles, ChefHat,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */
export interface MaitrScoreCircleProps {
  score: number;
  isLoading: boolean;
  // Optional extracted data — only passed when available
  businessName?: string;
  businessType?: string;
  phone?: string | null;
  email?: string | null;
  instagramUrl?: string | null;
  menuUrl?: string | null;
  hasReservation?: boolean;
  analysisFeedback?: string | null;
  websiteUrl?: string | null;
  extractionTime?: string;
  processingTime?: string;
}

/* ─────────────────────────────────────────────────────────
   Score rating config
───────────────────────────────────────────────────────── */
function getRating(score: number) {
  if (score >= 86) return { label: "Ausgezeichnet", color: "#10b981", bg: "rgba(16,185,129,0.15)" };
  if (score >= 71) return { label: "Gut", color: "#06b6d4", bg: "rgba(6,182,212,0.15)" };
  if (score >= 51) return { label: "Befriedigend", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" };
  return { label: "Verbesserungsbedarf", color: "#f97316", bg: "rgba(249,115,22,0.15)" };
}

/* ─────────────────────────────────────────────────────────
   Animated counter
───────────────────────────────────────────────────────── */
function CountUp({ target, delay = 200 }: { target: number; delay?: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const duration = 1500;
    const run = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - pct, 3);
      setVal(Math.round(ease * target));
      if (pct < 1) raf = requestAnimationFrame(run);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delay]);
  return <>{val}</>;
}

/* ─────────────────────────────────────────────────────────
   SVG Arc helpers
───────────────────────────────────────────────────────── */
function toRad(deg: number) { return (deg * Math.PI) / 180; }

function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const x1 = cx + r * Math.cos(toRad(a1));
  const y1 = cy + r * Math.sin(toRad(a1));
  const x2 = cx + r * Math.cos(toRad(a2));
  const y2 = cy + r * Math.sin(toRad(a2));
  return `M ${x1} ${y1} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/* ─────────────────────────────────────────────────────────
   Arc Ring with ChefHat icon
───────────────────────────────────────────────────────── */
function ScoreArc({ score, size = 152 }: { score: number; size?: number }) {
  const [animated, setAnimated] = useState(0);
  const rating = getRating(score);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const duration = 1500;
    const run = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      setAnimated((1 - Math.pow(1 - pct, 3)) * score);
      if (pct < 1) raf = requestAnimationFrame(run);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, 200);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [score]);

  const cx = size / 2, cy = size / 2, r = size * 0.39;
  const START = 128, SWEEP = 284;
  const endDeg = START + (animated / 100) * SWEEP;
  const iconSize = size * 0.22;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      <defs>
        <linearGradient id="msArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <filter id="msArcGlow">
          <feGaussianBlur stdDeviation="2.5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path
        d={arcPath(cx, cy, r, START, START + SWEEP)}
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth={size * 0.07}
        strokeLinecap="round"
      />

      {/* Fill */}
      {animated > 0.5 && (
        <path
          d={arcPath(cx, cy, r, START, endDeg)}
          fill="none"
          stroke="url(#msArcGrad)"
          strokeWidth={size * 0.07}
          strokeLinecap="round"
          filter="url(#msArcGlow)"
        />
      )}

      {/* Center icon */}
      <foreignObject x={cx - iconSize * 0.9} y={cy - iconSize * 0.9} width={iconSize * 1.8} height={iconSize * 1.8}>
        <div style={{
          width: "100%", height: "100%",
          display: "flex", alignItems: "center", justifyContent: "center",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.06)",
        }}>
          <ChefHat style={{
            width: iconSize, height: iconSize,
            color: rating.color,
            filter: `drop-shadow(0 0 7px ${rating.color}99)`,
          }} />
        </div>
      </foreignObject>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   Breakdown bar
───────────────────────────────────────────────────────── */
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((value / max) * 100), 500);
    return () => clearTimeout(t);
  }, [value, max]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ minWidth: 132, fontSize: 11, color: "rgba(255,255,255,0.48)", fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`, borderRadius: 99,
          background: color,
          boxShadow: `0 0 8px ${color}88`,
          transition: "width 1.1s cubic-bezier(0.34,1.1,0.64,1)",
        }} />
      </div>
      <span style={{ minWidth: 32, fontSize: 11, color: "rgba(255,255,255,0.65)", fontWeight: 700, textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Data chip
───────────────────────────────────────────────────────── */
function Chip({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  const base: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 9,
    padding: "9px 13px", borderRadius: 11,
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.09)",
    cursor: href ? "pointer" : "default",
    textDecoration: "none",
    transition: "background 0.18s",
  };
  const inner = (
    <div style={base}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
    >
      <span style={{ color: "#06b6d4", flexShrink: 0, display: "flex" }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
      {href && <ExternalLink style={{ width: 11, height: 11, color: "rgba(255,255,255,0.22)", flexShrink: 0 }} />}
    </div>
  );
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{inner}</a>
    : inner;
}

/* ─────────────────────────────────────────────────────────
   Main export — drop-in replacement for old MaitrScoreCirclee
───────────────────────────────────────────────────────── */
export default function MaitrScoreCircle({
  score,
  isLoading,
  businessName,
  businessType,
  phone,
  email,
  instagramUrl,
  menuUrl,
  hasReservation,
  analysisFeedback,
  websiteUrl,
  extractionTime,
  processingTime,
}: MaitrScoreCircleProps) {
  const rating = getRating(score);

  const breakdown = [
    { label: "Technisch", value: Math.min(25, Math.round(score * 0.30)), max: 25, color: "#06b6d4" },
    { label: "Inhaltsqualität", value: Math.min(20, Math.round(score * 0.25)), max: 20, color: "#818cf8" },
    { label: "Geschäftsdaten", value: Math.min(30, Math.round(score * 0.35)), max: 30, color: "#f97316" },
    { label: "Digitale Präsenz", value: Math.min(25, Math.round(score * 0.25)), max: 25, color: "#10b981" },
  ];

  const chips = [
    businessName && { icon: <Globe size={13} />, label: "Unternehmen", value: businessName, href: undefined },
    businessType && { icon: <Utensils size={13} />, label: "Typ", value: businessType, href: undefined },
    phone && { icon: <Phone size={13} />, label: "Telefon", value: phone, href: undefined },
    email && { icon: <Mail size={13} />, label: "E-Mail", value: email, href: undefined },
    instagramUrl && { icon: <Instagram size={13} />, label: "Instagram", value: "Profil gefunden", href: instagramUrl },
    menuUrl && { icon: <Utensils size={13} />, label: "Speisekarte", value: "Online verfügbar", href: menuUrl },
    hasReservation && { icon: <Clock size={13} />, label: "Reservierung", value: "System erkannt", href: undefined },
    websiteUrl && { icon: <Globe size={13} />, label: "Website", value: websiteUrl, href: websiteUrl },
    extractionTime && { icon: <Clock size={13} />, label: "Analysiert am", value: extractionTime, href: undefined },
    processingTime && { icon: <TrendingUp size={13} />, label: "Dauer", value: processingTime, href: undefined },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href?: string }[];

  /* ── Loading skeleton ── */
  if (isLoading) {
    return (
      <div style={{
        borderRadius: 20,
        background: "linear-gradient(135deg,#0f172a,#1e1b4b)",
        padding: "28px 24px",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 160,
        color: "rgba(255,255,255,0.35)",
        fontSize: 13, fontWeight: 500,
        boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
      }}>
        <Sparkles style={{ width: 16, height: 16, marginRight: 8, color: "#06b6d4" }} />
        Maitr analysiert…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes ms-card-in {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes ms-stripe-pulse {
          0%,100% { opacity: 0.7; }
          50%      { opacity: 1;   }
        }
        .ms-card-in { animation: ms-card-in 0.45s ease both; }
        .ms-stripe  { animation: ms-stripe-pulse 3s ease-in-out infinite; }
      `}</style>

      {/* ── Hero Card ── */}
      <div className="ms-card-in" style={{
        position: "relative",
        borderRadius: 20,
        background: "linear-gradient(135deg,#0f172a 0%,#1a1035 55%,#0f172a 100%)",
        overflow: "hidden",
        display: "flex",
        alignItems: "stretch",
        boxShadow: "0 24px 64px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.06)",
      }}>

        {/* Right accent stripe */}
        <div className="ms-stripe" style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 5,
          background: "linear-gradient(180deg,#06b6d4,#818cf8,#f97316)",
          borderRadius: "0 20px 20px 0",
        }} />

        {/* Purple glow bg */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 72% 48%, rgba(129,140,248,0.09) 0%, transparent 60%)",
        }} />

        {/* ── Left: score + breakdown ── */}
        <div style={{ flex: 1, padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>

          {/* Big number */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
            <span style={{
              fontSize: 68, fontWeight: 900, lineHeight: 1, color: "#fff",
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
            }}>
              <CountUp target={score} />
            </span>
            <span style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.38)", marginBottom: 9 }}>
              / 100
            </span>
          </div>

          {/* Rating badge + name */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, color: rating.color,
              background: rating.bg, borderRadius: 99,
              padding: "3px 11px", letterSpacing: "0.04em",
            }}>
              {rating.label}
            </span>
            {businessName && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
                — {businessName}
              </span>
            )}
          </div>

          {/* Feedback */}
          {analysisFeedback && (
            <p style={{
              fontSize: 12, color: "rgba(255,255,255,0.4)", lineHeight: 1.55,
              maxWidth: 360, margin: "2px 0 0",
            }}>
              {analysisFeedback}
            </p>
          )}

          {/* Breakdown bars */}
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 7 }}>
            {breakdown.map(b => (
              <Bar key={b.label} label={b.label} value={b.value} max={b.max} color={b.color} />
            ))}
          </div>
        </div>

        {/* ── Right: Arc Ring ── */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: "24px 36px 24px 0", flexShrink: 0,
        }}>
          <ScoreArc score={score} size={152} />
        </div>
      </div>

      {/* ── Extracted Data Chips ── */}
      {chips.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#f97316)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.3)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
              Extrahierte Daten
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
            gap: 7,
          }}>
            {chips.map((c, i) => (
              <Chip key={i} icon={c.icon} label={c.label} value={c.value} href={c.href} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}