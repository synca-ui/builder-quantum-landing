/**
 * Shared ReservationCta Component
 *
 * Reservieren-Aufruf der Startseite — für ALLE Templates (templateLayout.ts):
 * geteilte Leiste (presse, kiosk, roesterei, markt), voller Block (izakaya),
 * Textlink (morgen), Pille (vitrine, gelato, aperitivo), Rahmen (brauhaus,
 * ramen, hofladen), Schild mit Schlagschatten (imbiss), Zierlinie
 * (konditorei) und der gefüllte Knopf mit Kalenderzeichen für den Bestand
 * („standard“).
 * Vorher hatten Vorschau und Live-Seite für den Bestand zwei verschiedene
 * eigene Knöpfe: die Vorschau den ReservationButton (eckige Form = keine
 * Rundung), die Live-Seite einen eigenen Block (eckige Form = 0,5 rem) ohne
 * Kalenderzeichen.
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 *
 * Mit `reservationUrl` (bestehendes Buchungssystem) wird ein Link mit
 * noopener gerendert, sonst ein Knopf, der ins eigene Formular führt —
 * dieselbe Regel wie im AppRenderer, damit kein Tisch zweimal vergeben wird.
 */

import React, { memo } from "react";
import { getTemplateLayout, textAufFarbe } from "@/lib/templateLayout";
import {
  reservationButtonKlassen,
  ReservationButtonInhalt,
  type ReservationShape,
} from "@/components/ui/ReservationButton";

export interface ReservationCtaProps {
  template: string;
  primaryColor: string;
  fontColor: string;
  backgroundColor: string;
  /**
   * Vom Nutzer gewählte Knopffarben (Reservierungs-Schritt). Sie gelten für
   * den gefüllten Block (izakaya). Leiste und Textlink setzen Schrift auf
   * Papier — dort trägt die Primärfarbe, eine FÜLLfarbe als Schriftfarbe
   * wäre auf hellem Grund oft unlesbar.
   */
  buttonColor?: string;
  buttonTextColor?: string;
  /** Knopfform aus dem Reservierungs-Schritt — gilt für die Bestandsform. */
  buttonShape?: ReservationShape;
  /** Externes Buchungssystem: Link statt eigenem Formular. */
  reservationUrl?: string;
  reservationProvider?: string;
  onReservation: () => void;
  /** Zweite Zelle der geteilten Leiste („Karte“). */
  onMenu?: () => void;
  menuLabel?: string;
  className?: string;
}

const LABEL = "Tisch reservieren";

export const ReservationCta = memo(function ReservationCta({
  template,
  primaryColor,
  fontColor,
  backgroundColor,
  buttonColor,
  buttonTextColor,
  buttonShape = "rounded",
  reservationUrl,
  reservationProvider,
  onReservation,
  onMenu,
  menuLabel,
  className = "",
}: ReservationCtaProps) {
  const layout = getTemplateLayout(template);

  // Zweite Zelle: der Aushang sagt „Ganze Karte“, die Bistrokarte „Karte“.
  const karteLabel =
    menuLabel ?? (layout.linie === "kraeftig" ? "Ganze Karte" : "Karte");

  const linie =
    layout.linie === "kraeftig"
      ? `2px solid ${fontColor}`
      : layout.linie === "gestrichelt"
        ? `1px dashed ${fontColor}80`
        : `1px solid ${fontColor}40`;
  const caps =
    "uppercase tracking-[0.2em] text-[11px] font-bold whitespace-nowrap";

  /** Link oder Knopf — je nachdem, ob ein Buchungssystem hinterlegt ist. */
  const aktion = (
    inhalt: React.ReactNode,
    klasse: string,
    style: React.CSSProperties,
  ) =>
    reservationUrl ? (
      <a
        href={reservationUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={klasse}
        style={style}
        data-reservation-cta
      >
        {inhalt}
      </a>
    ) : (
      <button
        type="button"
        onClick={onReservation}
        className={klasse}
        style={style}
        data-reservation-cta
      >
        {inhalt}
      </button>
    );

  const anbieter =
    reservationUrl && reservationProvider ? (
      <p
        className={
          layout.cta === "standard"
            ? "mt-2 text-center text-xs opacity-70"
            : "mt-2 text-[10px] uppercase tracking-[0.14em] opacity-60"
        }
        style={{ color: fontColor }}
      >
        über {reservationProvider}
      </p>
    ) : null;

  // Bestand: derselbe Knopf, den die Vorschau schon immer zeigte —
  // Kalenderzeichen, Form aus dem Reservierungs-Schritt, volle Breite.
  if (layout.cta === "standard") {
    return (
      <div
        className={`mt-8 w-full max-w-md mx-auto px-4 ${className}`}
        data-template-cta={template}
      >
        {aktion(
          <ReservationButtonInhalt>{LABEL}</ReservationButtonInhalt>,
          reservationButtonKlassen(
            buttonShape,
            "md",
            "w-full shadow-lg block text-center",
          ),
          {
            backgroundColor: buttonColor || primaryColor,
            color: buttonTextColor || "#FFFFFF",
          },
        )}
        {anbieter}
      </div>
    );
  }

  if (layout.cta === "block") {
    return (
      <div className={className} data-template-cta={template}>
        {aktion(
          <>
            <span>{LABEL}</span>
            <span aria-hidden>→</span>
          </>,
          `w-full flex items-center justify-between px-4 py-4 ${caps} transition-opacity hover:opacity-90 active:opacity-80`,
          {
            backgroundColor: buttonColor || primaryColor,
            color: buttonTextColor || "#FFFFFF",
            borderRadius: "var(--radius-button, 0px)",
          },
        )}
        {anbieter}
      </div>
    );
  }

  if (layout.cta === "textlink") {
    return (
      <div
        className={`flex items-center justify-between pt-4 ${className}`}
        style={{ borderTop: linie }}
        data-template-cta={template}
      >
        {aktion(
          <>
            <span>{LABEL}</span>
            <span aria-hidden>→</span>
          </>,
          `flex items-center gap-2 ${caps} hover:opacity-80`,
          { color: primaryColor },
        )}
        {anbieter}
      </div>
    );
  }

  // ---- Zweite Runde ----

  // rund: volle Pille in der Knopffarbe (vitrine, gelato, aperitivo).
  if (layout.cta === "rund") {
    const fuellung = buttonColor || primaryColor;
    return (
      <div className={className} data-template-cta={template}>
        {aktion(
          <>
            <span>{LABEL}</span>
            <span aria-hidden>→</span>
          </>,
          "w-full flex items-center justify-center gap-2 px-4 py-3.5 text-[14px] font-bold rounded-full transition-opacity hover:opacity-90 active:opacity-80",
          {
            backgroundColor: fuellung,
            color: buttonTextColor || textAufFarbe(fuellung),
          },
        )}
        {anbieter}
      </div>
    );
  }

  // rahmen: umrandeter Knopf in der Textfarbe — kräftig (brauhaus), Haarlinie
  // (ramen) oder gestrichelt (hofladen) folgt der Linienstärke des Templates.
  if (layout.cta === "rahmen") {
    return (
      <div className={className} data-template-cta={template}>
        {aktion(
          LABEL,
          `w-full flex items-center justify-center px-4 py-3.5 ${caps} transition-opacity hover:opacity-80`,
          {
            border: linie,
            color: fontColor,
            borderRadius: "var(--radius-button, 0px)",
          },
        )}
        {anbieter}
      </div>
    );
  }

  // schild: gefüllter Block mit dickem Rahmen und hartem Schlagschatten (imbiss).
  if (layout.cta === "schild") {
    const fuellung = buttonColor || primaryColor;
    return (
      <div className={`mr-1.5 mb-1.5 ${className}`} data-template-cta={template}>
        {aktion(
          <>
            <span>{LABEL}</span>
            <span aria-hidden>→</span>
          </>,
          `w-full flex items-center justify-between px-4 py-4 ${caps} transition-transform active:translate-x-0.5 active:translate-y-0.5`,
          {
            backgroundColor: fuellung,
            color: buttonTextColor || textAufFarbe(fuellung),
            border: `3px solid ${fontColor}`,
            boxShadow: `5px 5px 0 ${fontColor}`,
          },
        )}
        {anbieter}
      </div>
    );
  }

  // zierlinie: Textlink auf der Mittelachse zwischen zwei Haarlinien (konditorei).
  if (layout.cta === "zierlinie") {
    return (
      <div className={className} data-template-cta={template}>
        <div className="flex items-center gap-4">
          <span aria-hidden className="flex-1 h-px" style={{ backgroundColor: fontColor, opacity: 0.25 }} />
          {aktion(
            LABEL,
            `${caps} hover:opacity-80`,
            { color: primaryColor },
          )}
          <span aria-hidden className="flex-1 h-px" style={{ backgroundColor: fontColor, opacity: 0.25 }} />
        </div>
        {anbieter && <div className="text-center">{anbieter}</div>}
      </div>
    );
  }

  // geteilt: Reservieren links, Karte rechts, Linien oben und unten.
  return (
    <div className={className} data-template-cta={template}>
      <div
        className="flex items-stretch"
        style={{ borderTop: linie, borderBottom: linie, color: fontColor }}
      >
        {aktion(
          LABEL,
          `flex-1 text-left px-3 py-3.5 ${caps} hover:opacity-80`,
          { color: primaryColor },
        )}
        {onMenu && (
          <button
            type="button"
            onClick={onMenu}
            className={`px-4 py-3.5 ${caps} hover:opacity-80`}
            style={{ borderLeft: linie, color: fontColor }}
          >
            {karteLabel}
          </button>
        )}
      </div>
      {anbieter}
    </div>
  );
});

export default ReservationCta;
