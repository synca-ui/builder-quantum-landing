/**
 * Shared ReservationClassicForm
 *
 * Die klassische Reservierungsseite — EIN Markup für Vorschau
 * (TemplatePreviewContent) und veröffentlichte Seite (AppRenderer).
 * Vorher hatte jeder Renderer sein eigenes: die Vorschau fünf Felder mit
 * Template-Rundung, die Live-Seite drei Felder mit fester rounded-2xl-Ecke
 * und einem eckigen Knopf von 0,5 rem — auf der Bistrokarte stand damit ein
 * abgerundetes Formular unter einer Karte ohne jede Rundung.
 *
 * Rundungen kommen aus den Design-Tokens des Templates (styleInjector.ts):
 * Karte --radius-card, Felder --radius-input, Knopf nach gewählter Form.
 * Die Felder sind Anzeige, keine Eingabe: Das eigentliche Buchen läuft
 * über das „modern“-Formular (ReservationFormModern), diese Seite ist der
 * klassische Auftritt dazu.
 */
import React, { memo } from "react";
import { Calendar, CalendarCheck, Clock, Phone, Users } from "lucide-react";
import type { ReservationShape } from "@/components/ui/ReservationButton";

export interface ReservationClassicFormProps {
  primaryColor: string;
  fontColor: string;
  buttonColor?: string;
  buttonTextColor?: string;
  buttonShape?: ReservationShape;
  /** Stil des Seitentitels (Display-Schrift der Papier-Templates). */
  titleStyle?: React.CSSProperties;
  onSubmit?: () => void;
}

export const ReservationClassicForm = memo(function ReservationClassicForm({
  primaryColor,
  fontColor,
  buttonColor,
  buttonTextColor,
  buttonShape = "rounded",
  titleStyle,
  onSubmit,
}: ReservationClassicFormProps) {
  const knopfRadius =
    buttonShape === "pill"
      ? "9999px"
      : buttonShape === "square"
        ? "0px"
        : "var(--radius-button, 12px)";
  const feld: React.CSSProperties = {
    borderRadius: "var(--radius-input, 12px)",
    color: fontColor,
  };

  const felder = [
    { label: "Datum", icon: Calendar, text: "Datum wählen..." },
    { label: "Uhrzeit", icon: Clock, text: "Zeit wählen..." },
    { label: "Anzahl Gäste", icon: Users, text: "2 Personen" },
  ];

  return (
    <div
      className="space-y-6 md:space-y-10 animate-in fade-in duration-300 max-w-2xl mx-auto"
      data-reservation-form="classic"
      style={{ color: fontColor }}
    >
      <div className="text-center">
        <div
          className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <CalendarCheck
            className="w-8 h-8 md:w-10 md:h-10"
            style={{ color: primaryColor }}
          />
        </div>
        {/* Titelklassen stehen HIER, nicht in den Renderern: Die beiden
            Seitentitel-Stile (Vorschau mb-2, Live mb-6 md:mb-10) waren die
            letzte Abweichung dieser Seite. */}
        <h2
          className="text-3xl md:text-5xl font-bold mb-2 md:mb-6 text-center leading-tight"
          style={titleStyle}
        >
          Reservierung
        </h2>
        <p className="text-sm md:text-base opacity-70 leading-relaxed">
          Buchen Sie Ihren Tisch online
        </p>
      </div>

      <div
        className="space-y-4 md:space-y-5 p-4 md:p-8 border border-current/10 bg-white/5"
        style={{ borderRadius: "var(--radius-card, 16px)" }}
      >
        {felder.map(({ label, icon: Icon, text }) => (
          <div key={label}>
            <label className="block text-xs md:text-sm font-bold mb-2 opacity-70">
              {label}
            </label>
            <div
              className="flex items-center gap-2 md:gap-3 p-3 md:p-4 border border-current/10 bg-white/50"
              style={feld}
            >
              <Icon className="w-4 h-4 md:w-5 md:h-5 opacity-50" />
              <span className="text-sm md:text-base opacity-70">{text}</span>
            </div>
          </div>
        ))}

        <div>
          <label className="block text-xs md:text-sm font-bold mb-2 opacity-70">
            Name
          </label>
          <div className="p-3 md:p-4 border border-current/10 bg-white/50" style={feld}>
            <span className="text-sm md:text-base opacity-50">Ihr Name...</span>
          </div>
        </div>

        <div>
          <label className="block text-xs md:text-sm font-bold mb-2 opacity-70">
            Telefon / E-Mail
          </label>
          <div className="p-3 md:p-4 border border-current/10 bg-white/50" style={feld}>
            <span className="text-sm md:text-base opacity-50">
              Kontakt für Bestätigung...
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onSubmit}
        className="w-full py-3 md:py-4 font-bold text-base md:text-lg shadow-lg transition-transform active:scale-[0.98] hover:shadow-xl"
        style={{
          // Rückfall auf die Markenfarbe — seit der Server keine Ersatzfarbe
          // mehr unterschiebt, wäre der Knopf sonst durchsichtig.
          backgroundColor: buttonColor || primaryColor,
          color: buttonTextColor || "#FFFFFF",
          borderRadius: knopfRadius,
        }}
      >
        Reservierung anfragen
      </button>

      <div className="text-center opacity-60 text-xs md:text-sm space-y-1">
        <p>Sie erhalten eine Bestätigung per E-Mail</p>
        <p className="flex items-center justify-center gap-1">
          <Phone className="w-3 h-3 md:w-4 md:h-4" />
          Oder rufen Sie uns an
        </p>
      </div>
    </div>
  );
});

export default ReservationClassicForm;
