import React, { useEffect, useState } from "react";
import {
  Globe, Phone, Mail, Instagram, Utensils,
  Clock, TrendingUp, ExternalLink, Sparkles, CheckCircle2,
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
    const run = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / 1400, 1);
      setVal(Math.round((1 - Math.pow(1 - pct, 3)) * target));
      if (pct < 1) raf = requestAnimationFrame(run);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, 250);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target]);
  return <>{val}</>;
}

/* ─────────────────────────────────────────────────────────
   SVG Arc
───────────────────────────────────────────────────────── */
function toRad(d: number) { return (d * Math.PI) / 180; }
function arcPath(cx: number, cy: number, r: number, a1: number, a2: number) {
  const x1 = cx + r * Math.cos(toRad(a1)), y1 = cy + r * Math.sin(toRad(a1));
  const x2 = cx + r * Math.cos(toRad(a2)), y2 = cy + r * Math.sin(toRad(a2));
  return `M ${x1} ${y1} A ${r} ${r} 0 ${a2 - a1 > 180 ? 1 : 0} 1 ${x2} ${y2}`;
}

/* ─────────────────────────────────────────────────────────
   Rechte Seite: Sauberer Score-Ring, KEIN Icon
   — nur Zahl + Rating-Label im Zentrum, reiner Arc-Kreis
───────────────────────────────────────────────────────── */
function ScoreRing({ score, size = 140 }: { score: number; size?: number }) {
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

  const cx = size / 2, cy = size / 2;
  const rOuter = size * 0.42;   // Äußerer Arc
  const rInner = size * 0.32;   // Innerer dünner Arc (Track)
  const START = 130, SWEEP = 280;
  const endDeg = START + (animated / 100) * SWEEP;

  // Tick-Marks alle 20 Punkte (0, 20, 40, 60, 80, 100)
  const ticks = [0, 20, 40, 60, 80, 100].map(v => {
    const deg = START + (v / 100) * SWEEP;
    const inner = rOuter - size * 0.06;
    const outer = rOuter + size * 0.04;
    return {
      x1: cx + inner * Math.cos(toRad(deg)),
      y1: cy + inner * Math.sin(toRad(deg)),
      x2: cx + outer * Math.cos(toRad(deg)),
      y2: cy + outer * Math.sin(toRad(deg)),
    };
  });

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>
          <filter id="ringGlow">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Track (äußer) */}
        <path
          d={arcPath(cx, cy, rOuter, START, START + SWEEP)}
          fill="none" stroke="rgba(255,255,255,0.08)"
          strokeWidth={size * 0.055} strokeLinecap="round"
        />

        {/* Innerer dünner Track */}
        <path
          d={arcPath(cx, cy, rInner, START, START + SWEEP)}
          fill="none" stroke="rgba(255,255,255,0.04)"
          strokeWidth={size * 0.015} strokeLinecap="round"
        />

        {/* Fill */}
        {animated > 0.5 && (
          <path
            d={arcPath(cx, cy, rOuter, START, endDeg)}
            fill="none" stroke="url(#ringGrad)"
            strokeWidth={size * 0.055} strokeLinecap="round"
            filter="url(#ringGlow)"
          />
        )}

        {/* Tick-Marks */}
        {ticks.map((t, i) => (
          <line
            key={i}
            x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2}
            stroke="rgba(255,255,255,0.18)"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        ))}

        {/* Zentrum: Prozent-Zahl */}
        <text
          x={cx} y={cy - size * 0.04}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.22} fontWeight={800}
          fill="white" fontFamily="system-ui, sans-serif"
          style={{ fontVariantNumeric: "tabular-nums" }}
        >
          {Math.round(animated)}
        </text>
        {/* Unter-Label */}
        <text
          x={cx} y={cy + size * 0.15}
          textAnchor="middle" dominantBaseline="middle"
          fontSize={size * 0.09} fontWeight={600}
          fill={rating.color} fontFamily="system-ui, sans-serif"
          letterSpacing="0.04em"
        >
          {rating.label.toUpperCase()}
        </text>
      </svg>
    </div>
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
      <span style={{ minWidth: 126, fontSize: 11, color: "rgba(255,255,255,0.42)", fontWeight: 500 }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`, borderRadius: 99,
          background: color,
          boxShadow: `0 0 6px ${color}88`,
          transition: "width 1.1s cubic-bezier(0.34,1.1,0.64,1)",
        }} />
      </div>
      <span style={{ minWidth: 32, fontSize: 11, color: "rgba(255,255,255,0.58)", fontWeight: 700, textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   Daten-Chip (unter der Card)
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
        border: "1px solid rgba(255,255,255,0.08)",
        transition: "background 0.15s",
        cursor: href ? "pointer" : "default",
      }}
      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.09)")}
      onMouseLeave={e => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
    >
      <span style={{ color: "#06b6d4", flexShrink: 0, display: "flex" }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
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

  // Chips nur für tatsächlich vorhandene Felder
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
        @keyframes ms-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        @keyframes ms-stripe { 0%,100%{opacity:.6} 50%{opacity:1} }
        .ms-in     { animation: ms-in 0.45s ease both; }
        .ms-stripe { animation: ms-stripe 3.5s ease-in-out infinite; }
      `}</style>

      {/* ── Dunkle Hero-Card ── */}
      <div className="ms-in" style={{
        position: "relative",
        borderRadius: 20,
        background: "linear-gradient(135deg,#0c1220 0%,#131030 55%,#0c1220 100%)",
        overflow: "hidden",
        display: "flex", alignItems: "stretch",
        boxShadow: "0 24px 64px rgba(0,0,0,0.32), 0 0 0 1px rgba(255,255,255,0.05)",
      }}>

        {/* Farbstreifen rechts */}
        <div className="ms-stripe" style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: 4,
          background: "linear-gradient(180deg,#06b6d4,#818cf8,#f97316)",
          borderRadius: "0 20px 20px 0",
        }} />

        {/* Subtiler Glow */}
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse at 75% 50%, rgba(129,140,248,0.07) 0%, transparent 55%)",
        }} />

        {/* ── Linke Seite: Score + Breakdown ── */}
        <div style={{ flex: 1, padding: "26px 22px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 8 }}>

          {/* Große animierte Zahl */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 4 }}>
            <span style={{
              fontSize: 64, fontWeight: 900, lineHeight: 1, color: "#fff",
              fontVariantNumeric: "tabular-nums", letterSpacing: "-0.03em",
            }}>
              <CountUp target={score} />
            </span>
            <span style={{ fontSize: 16, fontWeight: 600, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>
              / 100
            </span>
          </div>

          {/* Business-Name */}
          {businessName && (
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.38)", fontWeight: 500, margin: 0 }}>
              {businessName}
            </p>
          )}

          {/* Feedback */}
          {analysisFeedback && (
            <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.32)", lineHeight: 1.55, maxWidth: 340, margin: "2px 0 0" }}>
              {analysisFeedback}
            </p>
          )}

          {/* Breakdown-Balken */}
          <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
            {breakdown.map(b => (
              <Bar key={b.label} label={b.label} value={b.value} max={b.max} color={b.color} />
            ))}
          </div>
        </div>

        {/* Trennlinie */}
        <div style={{
          width: 1,
          background: "rgba(255,255,255,0.06)",
          margin: "20px 0",
          flexShrink: 0,
        }} />

        {/* ── Rechte Seite: Score-Ring + extrahierte Felder als Mini-Badges ── */}
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "24px 28px 24px 20px",
          flexShrink: 0, gap: 16,
          minWidth: 180,
        }}>
          {/* Sauberer Score-Ring, kein Icon */}
          <ScoreRing score={score} size={138} />

          {/* Extrahierte Felder als kompakte Mini-Badges */}
          {chips.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 2 }}>
                Gefundene Daten
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {chips.map((c, i) => (
                  <div
                    key={i}
                    title={`${c.label}: ${c.value}`}
                    style={{
                      display: "flex", alignItems: "center", gap: 4,
                      padding: "3px 8px",
                      borderRadius: 99,
                      background: "rgba(6,182,212,0.12)",
                      border: "1px solid rgba(6,182,212,0.2)",
                      fontSize: 10, fontWeight: 600,
                      color: "rgba(255,255,255,0.65)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ color: "#06b6d4", display: "flex" }}>{c.icon}</span>
                    {c.label}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Ausführliche Datenpunkte darunter (aufklappbar/sichtbar) ── */}
      {chips.length > 0 && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <CheckCircle2 style={{ width: 12, height: 12, color: "#06b6d4" }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.28)", textTransform: "uppercase", letterSpacing: "0.09em" }}>
              {chips.length} Datenpunkte extrahiert
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.06)" }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(185px, 1fr))", gap: 6 }}>
            {chips.map((c, i) => (
              <Chip key={i} icon={c.icon} label={c.label} value={c.value} href={c.href} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}