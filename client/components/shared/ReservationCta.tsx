/**
 * Shared ReservationCta Component
 *
 * Reservieren-Aufruf der Startseite für Templates mit eigenem Layout
 * (templateLayout.ts): geteilte Leiste (presse, kiosk), voller Block
 * (izakaya) oder Textlink (morgen). Bestands-Templates rendern hier nichts —
 * Vorschau und Live-Seite behalten dort ihre bisherigen Knöpfe.
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
import { getTemplateLayout } from "@/lib/templateLayout";

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
  reservationUrl,
  reservationProvider,
  onReservation,
  onMenu,
  menuLabel,
  className = "",
}: ReservationCtaProps) {
  const layout = getTemplateLayout(template);
  if (!layout.eigen) return null;

  // Zweite Zelle: der Aushang sagt „Ganze Karte“, die Bistrokarte „Karte“.
  const karteLabel =
    menuLabel ?? (layout.linie === "kraeftig" ? "Ganze Karte" : "Karte");

  const linie =
    layout.linie === "kraeftig"
      ? `2px solid ${fontColor}`
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
        className="mt-2 text-[10px] uppercase tracking-[0.14em] opacity-60"
        style={{ color: fontColor }}
      >
        über {reservationProvider}
      </p>
    ) : null;

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
