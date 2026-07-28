import type { CSSProperties } from "react";

/**
 * Seitenhintergrund pro Template — EINE Quelle für Konfigurator-Vorschau
 * (TemplatePreviewContent) und veröffentlichte Seite (AppRenderer).
 *
 * Hintergrund: Die Vorschau renderte für "modern" einen Verlauf
 * (backgroundColor → secondaryColor), der AppRenderer dagegen immer nur die
 * flache backgroundColor — veröffentlichte Seiten sahen anders aus als die
 * Vorschau, mit der sie konfiguriert wurden. Beide Renderer beziehen den
 * Wrapper-Style jetzt hier.
 */
export interface WrapperColors {
  backgroundColor: string;
  secondaryColor: string;
  fontColor: string;
}

export function getTemplateWrapperStyle(
  template: string,
  { backgroundColor, secondaryColor, fontColor }: WrapperColors,
): CSSProperties {
  if (template === "modern") {
    return {
      background: `linear-gradient(135deg, ${backgroundColor} 0%, ${secondaryColor} 100%)`,
      color: fontColor,
    };
  }
  return { backgroundColor, color: fontColor };
}
