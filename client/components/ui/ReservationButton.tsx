import React from "react";
import { Calendar } from "lucide-react";

export type ReservationShape = "rounded" | "pill" | "square";

interface ReservationButtonProps {
  color?: string;
  textColor?: string;
  shape?: ReservationShape;
  size?: "sm" | "md" | "lg";
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
}

const SHAPE_CLASSES: Record<ReservationShape, string> = {
  rounded: "rounded-lg",
  pill: "rounded-full",
  square: "rounded-none",
};

const SIZE_CLASSES = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-base",
  lg: "px-6 py-3 text-lg",
};

/**
 * Klassen des Reservieren-Knopfs — auch von ReservationCta gelesen, damit
 * die veröffentlichte Seite denselben Knopf trägt wie die Vorschau. Der
 * Aufruf kann ein <button> oder (bei fremdem Buchungssystem) ein <a> sein;
 * ohne diese gemeinsame Quelle drifteten die beiden Formen auseinander.
 */
export function reservationButtonKlassen(
  shape: ReservationShape = "rounded",
  size: keyof typeof SIZE_CLASSES = "md",
  className = "",
): string {
  return `font-medium transition-all duration-200 hover:scale-105 active:scale-95 ${SHAPE_CLASSES[shape]} ${SIZE_CLASSES[size]} ${className}`;
}

/** Inhalt des Knopfs: Kalenderzeichen und Beschriftung. */
export function ReservationButtonInhalt({
  children,
}: {
  children?: React.ReactNode;
}) {
  return (
    <>
      <Calendar className="w-4 h-4 mr-2 inline" />
      {children}
    </>
  );
}

export function ReservationButton({
  color = "#2563EB",
  textColor = "#FFFFFF",
  shape = "rounded",
  size = "md",
  className = "",
  onClick,
  children = "Reserve Table",
}: ReservationButtonProps) {
  return (
    <button
      className={reservationButtonKlassen(shape, size, className)}
      style={{ backgroundColor: color, color: textColor }}
      onClick={onClick}
    >
      <ReservationButtonInhalt>{children}</ReservationButtonInhalt>
    </button>
  );
}

export default ReservationButton;
