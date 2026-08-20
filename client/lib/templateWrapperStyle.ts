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
  // "stylish": dezenter dunkler Schleier oben — wirkt wie ein Editorial-
  // Header, ohne die Lesbarkeit des Inhalts darunter anzutasten.
  // Der 1A-Suffix ist Hex-Alpha (~10 %) und setzt 6-stellige Hexfarben
  // voraus — genau das liefern Farbwähler und Presets.
  if (template === "stylish") {
    return {
      background: `linear-gradient(180deg, ${secondaryColor}1A 0%, transparent 220px), ${backgroundColor}`,
      color: fontColor,
    };
  }
  // "cozy": warmer Lichtschein hinter dem Kopfbereich, wie Lampenlicht.
  if (template === "cozy") {
    return {
      background: `radial-gradient(1100px 420px at 50% -120px, ${secondaryColor}4D 0%, transparent 70%), ${backgroundColor}`,
      color: fontColor,
    };
  }
  // "nocturne": gedämpftes Licht von oben, wie eine Bar am Abend.
  if (template === "nocturne") {
    return {
      background: `radial-gradient(1000px 380px at 50% -120px, ${secondaryColor} 0%, transparent 70%), ${backgroundColor}`,
      color: fontColor,
    };
  }
  // "riviera": Azur-Schimmer am unteren Rand, wie Wasser unter der Terrasse.
  if (template === "riviera") {
    return {
      background: `linear-gradient(0deg, ${secondaryColor}2E 0%, transparent 40%), ${backgroundColor}`,
      color: fontColor,
    };
  }
  // "verde": zarter Salbei-Schleier im Kopfbereich auf Papierton.
  if (template === "verde") {
    return {
      background: `linear-gradient(180deg, ${secondaryColor}33 0%, transparent 240px), ${backgroundColor}`,
      color: fontColor,
    };
  }
  return { backgroundColor, color: fontColor };
}
