import React, { useEffect, useState } from "react";
import { Globe, Phone, Mail, Instagram, Utensils, Clock, TrendingUp, ExternalLink, Sparkles } from "lucide-react";

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

/* ── Rating ── */
function getRating(s: number) {
  if (s >= 86) return { label: "Ausgezeichnet", accent: "#10b981", light: "rgba(16,185,129,0.12)", bar: "#10b981" };
  if (s >= 71) return { label: "Gut", accent: "#06b6d4", light: "rgba(6,182,212,0.12)", bar: "#06b6d4" };
  if (s >= 51) return { label: "Befriedigend", accent: "#f59e0b", light: "rgba(245,158,11,0.12)", bar: "#f59e0b" };
  return { label: "Verbesserungsbedarf", accent: "#f97316", light: "rgba(249,115,22,0.12)", bar: "#f97316" };
}

/* ── Count-up ── */
function useCountUp(target: number, delay = 300) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const run = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / 1300, 1);
      setVal(Math.round((1 - Math.pow(1 - pct, 3)) * target));
      if (pct < 1) raf = requestAnimationFrame(run);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, delay);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [target, delay]);
  return val;
}

/* ── Breakdown bar ── */
function Bar({ label, value, max, color, delay }: { label: string; value: number; max: number; color: string; delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((value / max) * 100), delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ minWidth: 118, fontSize: 11, color: "#64748b", fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`, borderRadius: 99,
          background: `linear-gradient(90deg, ${color}cc, ${color})`,
          transition: "width 1.1s cubic-bezier(0.34,1.1,0.64,1)",
        }} />
      </div>
      <span style={{ minWidth: 30, fontSize: 11, color: "#475569", fontWeight: 700, textAlign: "right" }}>{value}/{max}</span>
    </div>
  );
}

/* ── Daten-Chip (rechte Seite, animiert einblenden) ── */
function DataChip({
  icon, label, value, href, delay,
}: { icon: React.ReactNode; label: string; value: string; href?: string; delay: number }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const inner = (
    <div style={{
      display: "flex", alignItems: "center", gap: 8,
      padding: "8px 10px", borderRadius: 10,
      background: "rgba(255,255,255,0.55)",
      border: "1px solid rgba(255,255,255,0.7)",
      boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(6px)",
      transition: "opacity 0.35s ease, transform 0.35s ease",
      cursor: href ? "pointer" : "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.75)"; }}
      onMouseLeave={e => { e.currentTarget.style.background = "rgba(255,255,255,0.55)"; }}
    >
      <span style={{ color: "#06b6d4", flexShrink: 0, display: "flex" }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>{label}</div>
        <div style={{ fontSize: 11.5, color: "#1e293b", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{value}</div>
      </div>
      {href && <ExternalLink style={{ width: 10, height: 10, color: "#94a3b8", flexShrink: 0 }} />}
    </div>
  );

  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{inner}</a>
    : inner;
}

/* ── Hauptkomponente ── */
export default function MaitrScoreCircle({
  score, isLoading,
  businessName, businessType, phone, email,
  instagramUrl, menuUrl, hasReservation,
  analysisFeedback, websiteUrl, extractionTime, processingTime,
}: MaitrScoreCircleProps) {

  const displayScore = useCountUp(isLoading ? 0 : score, 350);
  const rating = getRating(score);

  const breakdown = [
    { label: "Technisch", value: Math.min(25, Math.round(score * 0.30)), max: 25, color: "#06b6d4" },
    { label: "Inhaltsqualität", value: Math.min(20, Math.round(score * 0.25)), max: 20, color: "#818cf8" },
    { label: "Geschäftsdaten", value: Math.min(30, Math.round(score * 0.35)), max: 30, color: "#f97316" },
    { label: "Digitale Präsenz", value: Math.min(25, Math.round(score * 0.25)), max: 25, color: "#10b981" },
  ];

  // Nur vorhandene Datenpunkte
  const chips = [
    businessName && { icon: <Globe size={12} />, label: "Unternehmen", value: businessName, href: undefined },
    businessType && { icon: <Utensils size={12} />, label: "Typ", value: businessType, href: undefined },
    phone && { icon: <Phone size={12} />, label: "Telefon", value: phone, href: undefined },
    email && { icon: <Mail size={12} />, label: "E-Mail", value: email, href: undefined },
    instagramUrl && { icon: <Instagram size={12} />, label: "Instagram", value: "Profil", href: instagramUrl },
    menuUrl && { icon: <Utensils size={12} />, label: "Speisekarte", value: "Online", href: menuUrl },
    hasReservation && { icon: <Clock size={12} />, label: "Reservierung", value: "Vorhanden", href: undefined },
    websiteUrl && { icon: <Globe size={12} />, label: "Website", value: websiteUrl, href: websiteUrl },
    extractionTime && { icon: <Clock size={12} />, label: "Analysiert am", value: extractionTime, href: undefined },
    processingTime && { icon: <TrendingUp size={12} />, label: "Dauer", value: processingTime, href: undefined },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href?: string }[];

  /* Lade-Zustand */
  if (isLoading) {
    return (
      <div style={{
        borderRadius: 20,
        background: "rgba(255,255,255,0.6)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        border: "1px solid rgba(255,255,255,0.75)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08), 0 1px 0 rgba(255,255,255,0.9) inset",
        padding: "28px 24px",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 160,
        color: "#64748b", fontSize: 13, fontWeight: 500,
      }}>
        <Sparkles style={{ width: 16, height: 16, marginRight: 8, color: "#06b6d4" }} />
        Maitr analysiert…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes ms-fadein { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        .ms-card { animation: ms-fadein 0.45s ease both; }
      `}</style>

      {/* ── Glassmorphism Card ── */}
      <div className="ms-card" style={{
        borderRadius: 20,
        background: "rgba(255,255,255,0.62)",
        backdropFilter: "blur(22px)",
        WebkitBackdropFilter: "blur(22px)",
        border: "1px solid rgba(255,255,255,0.78)",
        boxShadow: "0 8px 40px rgba(0,0,0,0.10), 0 1px 0 rgba(255,255,255,0.95) inset, 0 0 0 0.5px rgba(0,0,0,0.04)",
        display: "flex",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* Farbstreifen oben */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 3,
          background: "linear-gradient(90deg,#06b6d4,#818cf8,#f97316)",
          borderRadius: "20px 20px 0 0",
        }} />

        {/* ── LINKE SEITE: Score + Label + Breakdown ── */}
        <div style={{ flex: 1, padding: "28px 24px 24px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 12 }}>

          {/* Score-Bereich */}
          <div>
            {/* "Maitr Score" Label */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
              Maitr Score
            </div>

            {/* Große Zahl + Rating inline */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                <span style={{ fontSize: 62, fontWeight: 900, lineHeight: 1, color: "#0f172a", fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
                  {displayScore}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, color: "#94a3b8" }}>/100</span>
              </div>

              {/* Rating-Badge */}
              <span style={{
                fontSize: 12, fontWeight: 700,
                color: rating.accent,
                background: rating.light,
                border: `1px solid ${rating.accent}33`,
                borderRadius: 99, padding: "3px 10px",
                letterSpacing: "0.03em",
              }}>
                {rating.label}
              </span>
            </div>

            {/* Business-Name */}
            {businessName && (
              <p style={{ fontSize: 12, color: "#64748b", fontWeight: 500, marginTop: 4 }}>{businessName}</p>
            )}

            {/* Feedback */}
            {analysisFeedback && (
              <p style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.5, marginTop: 6, maxWidth: 340 }}>
                {analysisFeedback}
              </p>
            )}
          </div>

          {/* Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 4 }}>
            {breakdown.map((b, i) => (
              <Bar key={b.label} label={b.label} value={b.value} max={b.max} color={b.color} delay={400 + i * 100} />
            ))}
          </div>
        </div>

        {/* Trennlinie */}
        <div style={{ width: 1, background: "rgba(0,0,0,0.06)", margin: "20px 0", flexShrink: 0 }} />

        {/* ── RECHTE SEITE: Extrahierte Datenpunkte ── */}
        <div style={{
          width: 220, flexShrink: 0,
          padding: "28px 16px 24px",
          display: "flex", flexDirection: "column", gap: 6,
        }}>
          {/* Header */}
          <div style={{ marginBottom: 4 }}>
            <div style={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              Extrahierte Daten
            </div>
            {chips.length > 0 && (
              <div style={{ fontSize: 11, color: "#06b6d4", fontWeight: 600, marginTop: 1 }}>
                {chips.length} Datenpunkte gefunden
              </div>
            )}
          </div>

          {/* Chips animiert einblenden */}
          {chips.length > 0 ? (
            chips.map((c, i) => (
              <DataChip
                key={i}
                icon={c.icon}
                label={c.label}
                value={c.value}
                href={c.href}
                delay={300 + i * 80}
              />
            ))
          ) : (
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center",
              gap: 6, opacity: 0.4,
            }}>
              <Globe style={{ width: 20, height: 20, color: "#94a3b8" }} />
              <span style={{ fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
                Keine Daten<br />extrahiert
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}