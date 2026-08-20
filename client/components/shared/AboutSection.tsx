/**
 * Über-uns-Seite — EINE Komponente für Konfigurator-Vorschau und
 * veröffentlichte Seite.
 *
 * Anlass: "Über uns" war im Schritt "Seiten auswählen" wählbar und stand in
 * der Navigation — die Seite selbst existierte in keinem Renderer (404).
 * Gleichzeitig wurden Teammitglieder aus dem Team-Bereich zwar gespeichert,
 * aber nirgendwo angezeigt. Beides gehört inhaltlich hierher.
 */
import React from "react";

export interface TeamMember {
  name?: string;
  role?: string;
  status?: string;
}

interface AboutSectionProps {
  businessName: string;
  description?: string;
  team: TeamMember[];
  showTeam: boolean;
  titleClass: string;
  bodyClass: string;
  primaryColor: string;
  fontColor: string;
}

const ROLE_LABELS: Record<string, string> = {
  chef: "Koch",
  barista: "Barista",
  waiter: "Service",
};

export function AboutSection({
  businessName,
  description,
  team,
  showTeam,
  titleClass,
  bodyClass,
  primaryColor,
  fontColor,
}: AboutSectionProps) {
  const members = showTeam ? team.filter((m) => m?.name) : [];

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-300">
      <h2 className={titleClass}>Über uns</h2>

      <div className="max-w-2xl mx-auto text-center space-y-4">
        <p className={`${bodyClass} leading-relaxed`}>
          {description ||
            `${businessName} — wir freuen uns auf deinen Besuch.`}
        </p>
      </div>

      {members.length > 0 && (
        <div className="space-y-6">
          <h3
            className="text-center uppercase tracking-widest font-bold opacity-60 text-xs"
            style={{ color: fontColor }}
          >
            Unser Team
          </h3>
          <div className="flex flex-wrap justify-center gap-4 md:gap-6">
            {members.map((m, i) => (
              <div
                key={`${m.name}-${i}`}
                className="flex flex-col items-center gap-2 w-28 md:w-32 p-4 rounded-2xl border border-current/10 bg-white/5 backdrop-blur-sm"
              >
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center font-bold text-lg text-white shadow-sm"
                  style={{ backgroundColor: primaryColor }}
                  aria-hidden
                >
                  {(m.name || "?").trim().charAt(0).toUpperCase()}
                </div>
                <div className="text-sm font-bold text-center leading-tight">
                  {m.name}
                </div>
                {m.role && (
                  <div className="text-xs opacity-70 text-center">
                    {ROLE_LABELS[m.role] || m.role}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
