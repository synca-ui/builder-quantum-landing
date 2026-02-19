import React, { useEffect, useRef, useState } from "react";
import {
  Globe, Phone, Mail, Instagram, Utensils,
  Clock, TrendingUp, ExternalLink, Sparkles,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Props
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   Rating
───────────────────────────────────────────────────────────────────────────── */
function getRating(s: number) {
  if (s >= 86) return { label: "Ausgezeichnet", accent: "#059669", pill: "rgba(5,150,105,0.1)", border: "rgba(5,150,105,0.25)" };
  if (s >= 71) return { label: "Gut", accent: "#0891b2", pill: "rgba(8,145,178,0.1)", border: "rgba(8,145,178,0.25)" };
  if (s >= 51) return { label: "Befriedigend", accent: "#d97706", pill: "rgba(217,119,6,0.1)", border: "rgba(217,119,6,0.25)" };
  return { label: "Verbesserungsbedarf", accent: "#ea580c", pill: "rgba(234,88,12,0.1)", border: "rgba(234,88,12,0.25)" };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Breakdown — Summe ergibt exakt den Score (largest-remainder Methode)
───────────────────────────────────────────────────────────────────────────── */
interface BreakdownItem { label: string; value: number; max: number; color: string; }

function getBreakdown(score: number): BreakdownItem[] {
  const cats = [
    { label: "Technisch", weight: 0.25, max: 25, color: "#06b6d4" },
    { label: "Inhaltsqualität", weight: 0.20, max: 20, color: "#818cf8" },
    { label: "Geschäftsdaten", weight: 0.30, max: 30, color: "#f97316" },
    { label: "Digitale Präsenz", weight: 0.25, max: 25, color: "#10b981" },
  ];
  const raws = cats.map(c => Math.min(c.max, score * c.weight));
  const floors = raws.map(r => Math.floor(r));
  let remaining = score - floors.reduce((a, b) => a + b, 0);

  // Restpunkte nach größten Nachkommastellen vergeben
  const fracs = raws.map((r, i) => ({ i, f: r - floors[i] })).sort((a, b) => b.f - a.f);
  for (const { i } of fracs) {
    if (remaining <= 0) break;
    if (floors[i] < cats[i].max) { floors[i]++; remaining--; }
  }

  return cats.map((c, i) => ({ label: c.label, value: floors[i], max: c.max, color: c.color }));
}

/* ─────────────────────────────────────────────────────────────────────────────
   Count-up hook
───────────────────────────────────────────────────────────────────────────── */
function useCountUp(target: number, delay = 350) {
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

/* ─────────────────────────────────────────────────────────────────────────────
   Breakdown Bar
───────────────────────────────────────────────────────────────────────────── */
function Bar({ label, value, max, color, delay }: BreakdownItem & { delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((value / max) * 100), delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ minWidth: 118, fontSize: 11.5, color: "#475569", fontWeight: 500 }}>{label}</span>
      <div style={{ flex: 1, height: 5, borderRadius: 99, background: "rgba(0,0,0,0.06)", overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${w}%`, borderRadius: 99,
          background: `linear-gradient(90deg,${color}bb,${color})`,
          transition: "width 1.1s cubic-bezier(0.34,1.1,0.64,1)",
        }} />
      </div>
      <span style={{ minWidth: 30, fontSize: 11, color: "#334155", fontWeight: 700, textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Rechte Seite: Radial-Progress + Kategorie-Kacheln
   Minimal, sauber, aussagekräftig
───────────────────────────────────────────────────────────────────────────── */
function ScoreVisual({ score, breakdown }: { score: number; breakdown: BreakdownItem[] }) {
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const run = (ts: number) => {
      if (!start) start = ts;
      const pct = Math.min((ts - start) / 1300, 1);
      setAnimated((1 - Math.pow(1 - pct, 3)) * score);
      if (pct < 1) raf = requestAnimationFrame(run);
    };
    const t = setTimeout(() => { raf = requestAnimationFrame(run); }, 350);
    return () => { clearTimeout(t); cancelAnimationFrame(raf); };
  }, [score]);

  const SIZE = 120;
  const cx = SIZE / 2, cy = SIZE / 2;
  const R = 46;
  const CIRC = 2 * Math.PI * R;
  const offset = CIRC - (animated / 100) * CIRC;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>

      {/* Donut-Ring — clean, kein Icon, nur Zahl */}
      <div style={{ position: "relative", width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} style={{ transform: "rotate(-90deg)" }}>
          <defs>
            <linearGradient id="donutGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="50%" stopColor="#818cf8" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle cx={cx} cy={cy} r={R}
            fill="none" stroke="rgba(0,0,0,0.07)"
            strokeWidth={9} strokeLinecap="round"
          />
          {/* Progress */}
          <circle cx={cx} cy={cy} r={R}
            fill="none" stroke="url(#donutGrad)"
            strokeWidth={9} strokeLinecap="round"
            strokeDasharray={CIRC}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.08s linear", filter: "drop-shadow(0 0 4px rgba(129,140,248,0.5))" }}
          />
        </svg>

        {/* Zentrum: nur Prozent */}
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <span style={{ fontSize: 26, fontWeight: 900, color: "#0f172a", lineHeight: 1, fontVariantNumeric: "tabular-nums" }}>
            {Math.round(animated)}
          </span>
          <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, letterSpacing: "0.05em" }}>
            /100
          </span>
        </div>
      </div>

      {/* Kategorie-Kacheln 2×2 */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, width: "100%" }}>
        {breakdown.map(b => (
          <div key={b.label} style={{
            padding: "8px 10px",
            borderRadius: 10,
            background: "rgba(255,255,255,0.5)",
            border: "1px solid rgba(255,255,255,0.7)",
            backdropFilter: "blur(8px)",
          }}>
            {/* Farbpunkt + Label */}
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: b.color, flexShrink: 0 }} />
              <span style={{ fontSize: 9, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {b.label}
              </span>
            </div>
            {/* Score */}
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>
              {b.value}<span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>/{b.max}</span>
            </div>
            {/* Mini-Fortschrittsbalken */}
            <div style={{ height: 3, borderRadius: 99, background: "rgba(0,0,0,0.06)", marginTop: 4, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${(b.value / b.max) * 100}%`,
                background: b.color,
                borderRadius: 99,
                transition: "width 1.2s cubic-bezier(0.34,1.1,0.64,1)",
              }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Daten-Chip (unterhalb der Card, heller Hintergrund)
───────────────────────────────────────────────────────────────────────────── */
function DataChip({ icon, label, value, href, delay }: {
  icon: React.ReactNode; label: string; value: string; href?: string; delay: number;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const content = (
    <div style={{
      display: "flex", alignItems: "center", gap: 9,
      padding: "9px 12px", borderRadius: 12,
      background: "white",
      border: "1px solid rgba(0,0,0,0.07)",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      opacity: visible ? 1 : 0,
      transform: visible ? "translateY(0)" : "translateY(8px)",
      transition: "opacity 0.35s ease, transform 0.35s ease",
      cursor: href ? "pointer" : "default",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.08)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.05)"; }}
    >
      <span style={{ color: "#06b6d4", flexShrink: 0, display: "flex" }}>{icon}</span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.07em" }}>
          {label}
        </div>
        <div style={{ fontSize: 12, color: "#1e293b", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {value}
        </div>
      </div>
      {href && <ExternalLink style={{ width: 11, height: 11, color: "#cbd5e1", flexShrink: 0 }} />}
    </div>
  );

  return href
    ? <a href={href} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", display: "block" }}>{content}</a>
    : <div>{content}</div>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Hauptkomponente
───────────────────────────────────────────────────────────────────────────── */
export default function MaitrScoreCircle({
  score, isLoading,
  businessName, businessType, phone, email,
  instagramUrl, menuUrl, hasReservation,
  analysisFeedback, websiteUrl, extractionTime, processingTime,
}: MaitrScoreCircleProps) {

  const displayScore = useCountUp(isLoading ? 0 : score, 350);
  const rating = getRating(score);
  const breakdown = getBreakdown(score);

  // Nur tatsächlich vorhandene Datenpunkte
  const chips = [
    businessName && { icon: <Globe size={13} />, label: "Unternehmen", value: businessName, href: undefined },
    businessType && { icon: <Utensils size={13} />, label: "Typ", value: businessType, href: undefined },
    phone && { icon: <Phone size={13} />, label: "Telefon", value: phone, href: undefined },
    email && { icon: <Mail size={13} />, label: "E-Mail", value: email, href: undefined },
    instagramUrl && { icon: <Instagram size={13} />, label: "Instagram", value: "Profil", href: instagramUrl },
    menuUrl && { icon: <Utensils size={13} />, label: "Speisekarte", value: "Online", href: menuUrl },
    hasReservation && { icon: <Clock size={13} />, label: "Reservierung", value: "Vorhanden", href: undefined },
    websiteUrl && { icon: <Globe size={13} />, label: "Website", value: websiteUrl, href: websiteUrl },
    extractionTime && { icon: <Clock size={13} />, label: "Analysiert am", value: extractionTime, href: undefined },
    processingTime && { icon: <TrendingUp size={13} />, label: "Dauer", value: processingTime, href: undefined },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; value: string; href?: string }[];

  /* ── Lade-Zustand ── */
  if (isLoading) {
    return (
      <div style={{
        borderRadius: 20,
        background: "rgba(255,255,255,0.55)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.75)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
        padding: "28px 24px",
        display: "flex", alignItems: "center", justifyContent: "center",
        minHeight: 160, color: "#64748b", fontSize: 13, fontWeight: 500,
      }}>
        <Sparkles style={{ width: 16, height: 16, marginRight: 8, color: "#06b6d4" }} />
        Maitr analysiert…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes ms-blob1 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(30px,-20px) scale(1.1); }
          66%      { transform: translate(-20px,25px) scale(0.95); }
        }
        @keyframes ms-blob2 {
          0%,100% { transform: translate(0,0) scale(1); }
          33%      { transform: translate(-25px,30px) scale(1.08); }
          66%      { transform: translate(30px,-15px) scale(0.92); }
        }
        @keyframes ms-blob3 {
          0%,100% { transform: translate(0,0) scale(1); }
          50%      { transform: translate(20px,20px) scale(1.05); }
        }
        @keyframes ms-fadein {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .ms-in { animation: ms-fadein 0.45s ease both; }
      `}</style>

      {/* ── Äußerer Wrapper mit animiertem Pastell-Hintergrund ── */}
      <div className="ms-in" style={{ borderRadius: 22, overflow: "hidden", position: "relative" }}>

        {/* Animierte Pastell-Blobs */}
        <div aria-hidden style={{
          position: "absolute", inset: 0, overflow: "hidden",
          background: "linear-gradient(135deg, #f0f9ff 0%, #fdf4ff 50%, #fff7ed 100%)",
        }}>
          <div style={{
            position: "absolute", width: 320, height: 320,
            top: -80, left: -60,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(186,230,255,0.7) 0%, transparent 70%)",
            animation: "ms-blob1 9s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", width: 280, height: 280,
            bottom: -60, right: 60,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(221,214,254,0.65) 0%, transparent 70%)",
            animation: "ms-blob2 11s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", width: 220, height: 220,
            top: 30, right: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(254,215,170,0.55) 0%, transparent 70%)",
            animation: "ms-blob3 13s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", width: 200, height: 200,
            bottom: 20, left: 200,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(167,243,208,0.45) 0%, transparent 70%)",
            animation: "ms-blob1 15s ease-in-out infinite reverse",
          }} />
        </div>

        {/* ── Glassmorphism Card ── */}
        <div style={{
          position: "relative", zIndex: 1,
          margin: 0,
          background: "rgba(255,255,255,0.52)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.85)",
          boxShadow: "0 1px 0 rgba(255,255,255,1) inset, 0 12px 40px rgba(0,0,0,0.08)",
          display: "flex",
          borderRadius: 22,
        }}>

          {/* ── LINKS: Score + Bewertung + Breakdown ── */}
          <div style={{ flex: 1, padding: "28px 24px 26px", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Label */}
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.12em" }}>
              Maitr Score
            </div>

            {/* Große Zahl + Badge */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 3 }}>
                <span style={{
                  fontSize: 60, fontWeight: 900, color: "#0f172a", lineHeight: 1,
                  fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em",
                }}>
                  {displayScore}
                </span>
                <span style={{ fontSize: 16, fontWeight: 600, color: "#cbd5e1" }}>/100</span>
              </div>

              <span style={{
                fontSize: 12, fontWeight: 700,
                color: rating.accent,
                background: rating.pill,
                border: `1px solid ${rating.border}`,
                borderRadius: 99, padding: "4px 11px",
              }}>
                {rating.label}
              </span>
            </div>

            {/* Business-Name */}
            {businessName && (
              <p style={{ fontSize: 13, color: "#475569", fontWeight: 600, margin: 0 }}>
                {businessName}
              </p>
            )}

            {/* Feedback */}
            {analysisFeedback && (
              <p style={{ fontSize: 11.5, color: "#94a3b8", lineHeight: 1.55, margin: 0, maxWidth: 340 }}>
                {analysisFeedback}
              </p>
            )}

            {/* Breakdown */}
            <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 6 }}>
              {breakdown.map((b, i) => (
                <Bar key={b.label} {...b} delay={450 + i * 90} />
              ))}
            </div>
          </div>

          {/* Trennlinie */}
          <div style={{ width: 1, background: "rgba(0,0,0,0.06)", margin: "22px 0", flexShrink: 0 }} />

          {/* ── RECHTS: Donut + Kategorie-Kacheln ── */}
          <div style={{
            width: 210, flexShrink: 0,
            padding: "28px 20px 26px",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
          }}>
            <ScoreVisual score={score} breakdown={breakdown} />
          </div>
        </div>
      </div>

      {/* ── Extrahierte Daten (unterhalb der Card) ── */}
      {chips.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b" }}>
              {chips.length} Datenpunkte extrahiert
            </span>
            <div style={{ flex: 1, height: 1, background: "rgba(0,0,0,0.07)" }} />
          </div>

          {/* Grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 7,
          }}>
            {chips.map((c, i) => (
              <DataChip
                key={i}
                icon={c.icon}
                label={c.label}
                value={c.value}
                href={c.href}
                delay={200 + i * 60}
              />
            ))}
          </div>
        </div>
      )}
    </>
  );
}