import React, { useEffect, useState } from "react";
import {
  Globe, Phone, Mail, Instagram, Utensils,
  Clock, TrendingUp, ExternalLink, Sparkles, Activity,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────── */
export interface MaitrScoreCircleProps {
  score: number;
  isLoading: boolean;
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
   Rating
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
function CountUp({ target }: { target: number }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const duration = 1400;
    const run = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / duration, 1);
      setVal(Math.round((1 - Math.pow(1 - pct, 3)) * target));
      if (pct < 1) raf = requestAnimationFrame(run);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, 250);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target]);
  return <>{val}</>;
}

/* ─────────────────────────────────────────────────────────
   SVG Arc helpers
───────────────────────────────────────────────────────── */
function toRad(d: number) { return (d * Math.PI) / 180; }
function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const x1 = cx + r * Math.cos(toRad(a1)), y1 = cy + r * Math.sin(toRad(a1));
  const x2 = cx + r * Math.cos(toRad(a2)), y2 = cy + r * Math.sin(toRad(a2));
  return `M ${x1} ${y1} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/* ─────────────────────────────────────────────────────────
   Arc Ring — minimales Icon: einfaches Balkendiagramm-Symbol
───────────────────────────────────────────────────────── */
function ScoreArc({ score, size = 148 }: { score: number; size?: number }) {
  const [animated, setAnimated] = useState(0);
  const rating = getRating(score);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const run = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / 1400, 1);
      setAnimated((1 - Math.pow(1 - pct, 3)) * score);
      if (pct < 1) raf = requestAnimationFrame(run);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, 250);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [score]);

  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const START = 130, SWEEP = 280;
  const endDeg = START + (animated / 100) * SWEEP;

  // Icon: drei aufsteigende Balken — sauber, kein Kitsch
  const iconCx = cx, iconCy = cy;
  const bw = size * 0.055, gap = size * 0.025;
  const heights = [size * 0.12, size * 0.18, size * 0.24];
  const totalW = bw * 3 + gap * 2;
  const bars = heights.map((h, i) => ({
    x: iconCx - totalW / 2 + i * (bw + gap),
    y: iconCy + size * 0.14 - h,
    w: bw,
    h,
  }));

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
      <defs>
        <linearGradient id="arcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#f97316" />
        </linearGradient>
        <linearGradient id="barGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={rating.color} />
          <stop offset="100%" stopColor={rating.color + "88"} />
        </linearGradient>
        <filter id="arcGlow">
          <feGaussianBlur stdDeviation="2" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Track */}
      <path
        d={arcPath(cx, cy, r, START, START + SWEEP)}
        fill="none" stroke="rgba(255,255,255,0.09)"
        strokeWidth={size * 0.068} strokeLinecap="round"
      />

      {/* Fill */}
      {animated > 0.5 && (
        <path
          d={arcPath(cx, cy, r, START, endDeg)}
          fill="none" stroke="url(#arcGrad)"
          strokeWidth={size * 0.068} strokeLinecap="round"
          filter="url(#arcGlow)"
        />
      )}

      {/* Hintergrundkreis für Icon */}
      <circle cx={cx} cy={cy} r={size * 0.195}
        fill="rgba(255,255,255,0.05)"
        stroke="rgba(255,255,255,0.07)" strokeWidth={1}
      />

      {/* Balken-Icon */}
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x} y={b.y} width={b.w} height={b.h}
          rx={b.w * 0.35}
          fill="url(#barGrad)"
          opacity={0.85 + i * 0.05}
          filter="url(#arcGlow)"
        />
      ))}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
   Breakdown-Balken
───────────────────────────────────────────────────────── */
function Bar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((value / max) * 100), 600);
    return () => clearTimeout(t);
  }, [value, max]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ minWidth: 130, fontSize: 11, color: "rgba(255,255,255,0.45)", fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`, borderRadius: 99,
          background: color,
          boxShadow: `0 0 8px ${color}88`,
          transition: "width 1.1s cubic-bezier(0.34,1.1,0.64,1)",
        }} />
      </div>
      <span style={{ minWidth: 32, fontSize: 11, color: "rgba(255,255,255,0.6)", fontWeight: 700, textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Daten-Chip
───────────────────────────────────────────────────────── */
function Chip({ icon, label, value, href }: {
  icon: React.ReactNode; label: string; value: string; href?: string;
}) {
  const content = (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "9px 13px", borderRadius: 11,
        background: "rgba(255,255,255,0.05)",
        border: "1px solid rgba(255,255,255,0.09)",
        transition: "background 0.15s",
        cursor: href ? "pointer" : "default",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
    >
      <span style={{ color: "#06b6d4", flexShrink: 0, display: "flex" }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.32)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </div>
      </div>
      {href && <ExternalLink style={{ width: 11, height: 11, color: "rgba(255,255,255,0.2)", flexShrink: 0 }} />}
    </div>
  );
  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{content}</a>
    : <div>{content}</div>;
}

/* ─────────────────────────────────────────────────────────
   Hauptkomponente
───────────────────────────────────────────────────────── */
export default function MaitrScoreCircle({
  score, isLoading,
  businessName, businessType, phone, email,
  instagramUrl, menuUrl, hasReservation,
  analysisFeedback, websiteUrl, extractionTime, processingTime,
}: MaitrScoreCircleProps) {

  const rating = getRating(score);

  const breakdown = [
    { label: "Technisch", value: Math.min(25, Math.round(score * 0.30)), max: 25, color: "#06b6d4" },
    { label: "Inhaltsqualität", value: Math.min(20, Math.round(score * 0.25)), max: 20, color: "#818cf8" },
    { label: "Geschäftsdaten", value: Math.min(30, Math.round(score * 0.35)), max: 30, color: "#f97316" },
    { label: "Digitale Präsenz", value: Math.min(25, Math.round(score * 0.25)), max: 25, color: "#10b981" },
  ];

  // Nur Chips für tatsächlich vorhandene Daten
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

  /* Lade-Zustand */
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
        boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
      }}>
        <Sparkles style={{ width: 16, height: 16, marginRight: 8, color: "#06b6d4" }} />
        Maitr analysiert…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes ms-in { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        @keyframes ms-stripe { 0%,100%{opacity:.65} 50%{opacity:1} }
        .ms-in     { animation: ms-in 0.45s ease both; }
        .ms-stripe { animation: ms-stripe 3s ease-in-out infinite; }
      `}</style>

      {/* ── Dunkle Hero-Card ── */}
      <div className="ms-in" style={{
        position: "relative",
        borderRadius: 20,
        background: "linear-gradient(135deg,#0f172a 0%,#1a1035 55%,#0f172a 100%)",
        overflow: "hidden",
        display: "flex", alignItems: "stretch",
        boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06)",
      }}>
        {/* Farbstreifen rechts */}
        <div className="ms-stripe" style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 5,
          background: "linear-gradient(180deg,#06b6d4,#818cf8,#f97316)",
          borderRadius: "0 20px 20px 0",
        }} />

        {/* Hintergrund-Glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 72% 48%, rgba(129,140,248,0.08) 0%, transparent 60%)",
        }} />

        {/* Linke Seite: Score + Balken */}
        <div style={{ flex: 1, padding: "28px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 10 }}>
          {/* Große Zahl */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 5 }}>
            <span style={{ fontSize: 68, fontWeight: 900, lineHeight: 1, color: "#fff", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em" }}>
              <CountUp target={score} />
            </span>
            <span style={{ fontSize: 17, fontWeight: 600, color: "rgba(255,255,255,0.35)", marginBottom: 9 }}>
              / 100
            </span>
          </div>

          {/* Rating-Badge + Name */}
          <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <span style={{
              fontSize: 12, fontWeight: 700, color: rating.color,
              background: rating.bg, borderRadius: 99, padding: "3px 11px", letterSpacing: "0.04em",
            }}>
              {rating.label}
            </span>
            {businessName && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>
                — {businessName}
              </span>
            )}
          </div>

          {/* Feedback */}
          {analysisFeedback && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.38)", lineHeight: 1.55, maxWidth: 360, margin: "2px 0 0" }}>
              {analysisFeedback}
            </p>
          )}

          {/* Breakdown-Balken */}
          <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 7 }}>
            {breakdown.map(b => (
              <Bar key={b.label} label={b.label} value={b.value} max={b.max} color={b.color} />
            ))}
          </div>
        </div>

        {/* Rechte Seite: Arc-Ring */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 36px 24px 0", flexShrink: 0 }}>
          <ScoreArc score={score} size={148} />
        </div>
      </div>

      {/* ── Extrahierte Daten (nur wenn vorhanden) ── */}
      {chips.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "linear-gradient(135deg,#06b6d4,#f97316)" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
              Extrahierte Daten
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.07)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 7 }}>
            {chips.map((c, i) => (
              <Chip key={i} icon={c.icon} label={c.label} value={c.value} href={c.href} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}