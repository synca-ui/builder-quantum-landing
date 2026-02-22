import React, { useEffect, useState } from "react";
import {
  Globe,
  Phone,
  Mail,
  Instagram,
  Utensils,
  Clock,
  TrendingUp,
  ExternalLink,
  Sparkles,
} from "lucide-react";

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

function getRating(s: number) {
  if (s >= 86)
    return {
      label: "Ausgezeichnet",
      accent: "#059669",
      pill: "rgba(5,150,105,0.1)",
      border: "rgba(5,150,105,0.22)",
    };
  if (s >= 71)
    return {
      label: "Gut",
      accent: "#0891b2",
      pill: "rgba(8,145,178,0.1)",
      border: "rgba(8,145,178,0.22)",
    };
  if (s >= 51)
    return {
      label: "Befriedigend",
      accent: "#d97706",
      pill: "rgba(217,119,6,0.1)",
      border: "rgba(217,119,6,0.22)",
    };
  return {
    label: "Verbesserungsbedarf",
    accent: "#ea580c",
    pill: "rgba(234,88,12,0.1)",
    border: "rgba(234,88,12,0.22)",
  };
}

interface BI {
  label: string;
  value: number;
  max: number;
  color: string;
}

function getBreakdown(score: number): BI[] {
  const cats = [
    { label: "Technisch", weight: 0.25, max: 25, color: "#06b6d4" },
    { label: "Inhaltsqualität", weight: 0.2, max: 20, color: "#818cf8" },
    { label: "Geschäftsdaten", weight: 0.3, max: 30, color: "#f97316" },
    { label: "Digitale Präsenz", weight: 0.25, max: 25, color: "#10b981" },
  ];
  const raws = cats.map((c) => Math.min(c.max, score * c.weight));
  const floors = raws.map((r) => Math.floor(r));
  let rem = score - floors.reduce((a, b) => a + b, 0);
  raws
    .map((r, i) => ({ i, f: r - floors[i] }))
    .sort((a, b) => b.f - a.f)
    .forEach(({ i }) => {
      if (rem > 0 && floors[i] < cats[i].max) {
        floors[i]++;
        rem--;
      }
    });
  return cats.map((c, i) => ({
    label: c.label,
    value: floors[i],
    max: c.max,
    color: c.color,
  }));
}

function useCountUp(target: number, delay = 350) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let raf: number;
    let start: number | null = null;
    const t = setTimeout(() => {
      raf = requestAnimationFrame(function run(ts) {
        if (!start) start = ts;
        const pct = Math.min((ts - start) / 1300, 1);
        setVal(Math.round((1 - Math.pow(1 - pct, 3)) * target));
        if (pct < 1) raf = requestAnimationFrame(run);
      });
    }, delay);
    return () => {
      clearTimeout(t);
      cancelAnimationFrame(raf);
    };
  }, [target, delay]);
  return val;
}

function Bar({ label, value, max, color, delay }: BI & { delay: number }) {
  const [w, setW] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setW((value / max) * 100), delay);
    return () => clearTimeout(t);
  }, [value, max, delay]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          minWidth: 120,
          fontSize: 11.5,
          color: "#475569",
          fontWeight: 500,
        }}
      >
        {label}
      </span>
      <div
        style={{
          flex: 1,
          height: 5,
          borderRadius: 99,
          background: "rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${w}%`,
            borderRadius: 99,
            background: `linear-gradient(90deg,${color}99,${color})`,
            transition: "width 1.1s cubic-bezier(0.34,1.1,0.64,1)",
          }}
        />
      </div>
      <span
        style={{
          minWidth: 30,
          fontSize: 11,
          color: "#334155",
          fontWeight: 700,
          textAlign: "right",
        }}
      >
        {value}/{max}
      </span>
    </div>
  );
}

function DataChip({
  icon,
  label,
  value,
  href,
  delay,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  href?: string;
  delay: number;
}) {
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setVis(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const inner = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: "12px 14px",
        borderRadius: 14,
        background: "white",
        border: "1px solid rgba(0,0,0,0.07)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
        opacity: vis ? 1 : 0,
        transform: vis ? "translateY(0)" : "translateY(8px)",
        transition:
          "opacity 0.35s ease, transform 0.35s ease, box-shadow 0.2s ease",
        cursor: href ? "pointer" : "default",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 4px 14px rgba(0,0,0,0.09)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.boxShadow =
          "0 1px 4px rgba(0,0,0,0.05)";
      }}
    >
      <div
        style={{
          width: 34,
          height: 34,
          borderRadius: 10,
          background: "rgba(6,182,212,0.08)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <span style={{ color: "#06b6d4", display: "flex" }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div
          style={{
            fontSize: 10,
            color: "#94a3b8",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 12.5,
            color: "#1e293b",
            fontWeight: 600,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            marginTop: 1,
          }}
        >
          {value}
        </div>
      </div>
      {href && (
        <ExternalLink
          style={{ width: 12, height: 12, color: "#cbd5e1", flexShrink: 0 }}
        />
      )}
    </div>
  );

  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ textDecoration: "none", display: "block" }}
    >
      {inner}
    </a>
  ) : (
    <div>{inner}</div>
  );
}

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
  const displayScore = useCountUp(isLoading ? 0 : score, 350);
  const rating = getRating(score);
  const breakdown = getBreakdown(score);

  const analysisChips = [
    websiteUrl && {
      icon: <Globe size={15} />,
      label: "Website",
      value: websiteUrl,
      href: websiteUrl,
    },
    extractionTime && {
      icon: <Clock size={15} />,
      label: "Analysiert am",
      value: extractionTime,
      href: undefined,
    },
    processingTime && {
      icon: <TrendingUp size={15} />,
      label: "Dauer",
      value: processingTime,
      href: undefined,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    label: string;
    value: string;
    href?: string;
  }[];

  const dataChips = [
    businessName && {
      icon: <Globe size={15} />,
      label: "Unternehmen",
      value: businessName,
      href: undefined,
    },
    businessType && {
      icon: <Utensils size={15} />,
      label: "Typ",
      value: businessType,
      href: undefined,
    },
    phone && {
      icon: <Phone size={15} />,
      label: "Telefon",
      value: phone,
      href: undefined,
    },
    email && {
      icon: <Mail size={15} />,
      label: "E-Mail",
      value: email,
      href: undefined,
    },
    instagramUrl && {
      icon: <Instagram size={15} />,
      label: "Instagram",
      value: "Profil gefunden",
      href: instagramUrl,
    },
    menuUrl && {
      icon: <Utensils size={15} />,
      label: "Speisekarte",
      value: "Online verfügbar",
      href: menuUrl,
    },
    hasReservation && {
      icon: <Clock size={15} />,
      label: "Reservierung",
      value: "System erkannt",
      href: undefined,
    },
  ].filter(Boolean) as {
    icon: React.ReactNode;
    label: string;
    value: string;
    href?: string;
  }[];

  if (isLoading) {
    return (
      <div
        style={{
          borderRadius: 22,
          background: "rgba(255,255,255,0.62)",
          backdropFilter: "blur(28px)",
          WebkitBackdropFilter: "blur(28px)",
          border: "1px solid rgba(255,255,255,0.85)",
          boxShadow:
            "0 16px 48px rgba(0,0,0,0.10), 0 2px 0 rgba(255,255,255,0.95) inset",
          padding: "28px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 160,
          color: "#64748b",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        <Sparkles
          style={{ width: 16, height: 16, marginRight: 8, color: "#06b6d4" }}
        />
        Maitr analysiert…
      </div>
    );
  }

  return (
    <>
      <style>{`
        @keyframes blob1 { 0%,100%{transform:translate(0,0)scale(1)} 40%{transform:translate(40px,-30px)scale(1.12)} 70%{transform:translate(-25px,35px)scale(0.94)} }
        @keyframes blob2 { 0%,100%{transform:translate(0,0)scale(1)} 35%{transform:translate(-35px,40px)scale(1.1)} 65%{transform:translate(40px,-20px)scale(0.92)} }
        @keyframes blob3 { 0%,100%{transform:translate(0,0)scale(1)} 50%{transform:translate(25px,25px)scale(1.08)} }
        @keyframes blob4 { 0%,100%{transform:translate(0,0)scale(1)} 45%{transform:translate(-20px,-30px)scale(1.06)} }
        @keyframes ms-in { from{opacity:0;transform:translateY(18px) scale(0.99)} to{opacity:1;transform:translateY(0) scale(1)} }
        .ms-in { animation: ms-in 0.55s cubic-bezier(0.22,1,0.36,1) both; }
        .ms-card-lift { transition: transform 0.3s cubic-bezier(0.22,1,0.36,1), box-shadow 0.3s ease; }
        .ms-card-lift:hover { transform: translateY(-4px); }
      `}</style>

      {/* ── Card ──
          overflow:hidden NICHT am äußeren Wrapper — schneidet Schatten ab!
          Stattdessen clippt der innere Blob-Container.                        */}
      <div
        className="ms-in ms-card-lift"
        style={{
          position: "relative",
          borderRadius: 22,
          boxShadow: [
            /* Scharfe Kante */ "0 0 0 0.5px rgba(0,0,0,0.06)",
            /* Top-Highlight */ "0 2px 0 rgba(255,255,255,0.85) inset",
            /* Nah-Schatten */ "0 4px 10px rgba(0,0,0,0.07)",
            /* Mid-Schatten */ "0 14px 30px rgba(0,0,0,0.10)",
            /* Tiefer Schatten */ "0 36px 72px rgba(0,0,0,0.09)",
            /* Farbiger Glow */ `0 20px 60px ${rating.accent}28`,
          ].join(", "),
        }}
      >
        {/* Pastell-Blobs — overflow:hidden hier */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: 22,
            overflow: "hidden",
            background:
              "linear-gradient(140deg,#eef9ff 0%,#faf5ff 45%,#fff8f0 100%)",
          }}
        >
          <div
            style={{
              position: "absolute",
              width: 380,
              height: 380,
              top: -100,
              left: -80,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(186,230,255,0.75) 0%,transparent 68%)",
              animation: "blob1 10s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 320,
              height: 320,
              bottom: -80,
              right: 80,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(221,214,254,0.7) 0%,transparent 68%)",
              animation: "blob2 13s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 260,
              height: 260,
              top: 20,
              right: 220,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(254,215,170,0.6) 0%,transparent 68%)",
              animation: "blob3 15s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              width: 240,
              height: 240,
              bottom: 10,
              left: 220,
              borderRadius: "50%",
              background:
                "radial-gradient(circle,rgba(167,243,208,0.5) 0%,transparent 68%)",
              animation: "blob4 18s ease-in-out infinite",
            }}
          />
        </div>

        {/* Glassmorphism — Schatten sitzt am Wrapper, nicht hier */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            background: "rgba(255,255,255,0.56)",
            backdropFilter: "blur(32px)",
            WebkitBackdropFilter: "blur(32px)",
            border: "1px solid rgba(255,255,255,0.92)",
            /* Nur innerer Highlight, kein Box-Shadow mehr (kommt vom Wrapper) */
            boxShadow: "0 1.5px 0 rgba(255,255,255,1) inset",
            borderRadius: 22,
            padding: "28px 28px 26px",
          }}
        >
          {/* Label */}
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.14em",
              marginBottom: 10,
            }}
          >
            Maitr Score
          </div>

          {/* Zahl + /100 + Rating-Badge — alles in einer Zeile */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: businessName ? 6 : 16,
            }}
          >
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span
                style={{
                  fontSize: 62,
                  fontWeight: 900,
                  color: "#0f172a",
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "-0.02em",
                }}
              >
                {displayScore}
              </span>
              <span style={{ fontSize: 17, fontWeight: 600, color: "#cbd5e1" }}>
                /100
              </span>
            </div>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: rating.accent,
                background: rating.pill,
                border: `1px solid ${rating.border}`,
                borderRadius: 99,
                padding: "4px 12px",
              }}
            >
              {rating.label}
            </span>
          </div>

          {/* Business-Name (kein Feedback-Text mehr darunter) */}
          {businessName && (
            <p
              style={{
                fontSize: 13,
                color: "#475569",
                fontWeight: 600,
                margin: "0 0 16px",
              }}
            >
              {businessName}
            </p>
          )}

          {/* Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {breakdown.map((b, i) => (
              <Bar key={b.label} {...b} delay={400 + i * 90} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Sektionen darunter ── */}
      {(analysisChips.length > 0 || dataChips.length > 0) && (
        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexDirection: "column",
            gap: 22,
          }}
        >
          {/* Analyse Details */}
          {analysisChips.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  margin: "0 0 10px",
                }}
              >
                Analyse Details
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {analysisChips.map((c, i) => (
                  <DataChip key={i} {...c} delay={80 + i * 55} />
                ))}
              </div>
            </div>
          )}

          {/* Extrahierte Datenpunkte */}
          {dataChips.length > 0 && (
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748b",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  margin: "0 0 10px",
                }}
              >
                Extrahierte Datenpunkte ·{" "}
                <span style={{ color: "#06b6d4" }}>
                  {dataChips.length} gefunden
                </span>
              </p>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {dataChips.map((c, i) => (
                  <DataChip key={i} {...c} delay={120 + i * 55} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
