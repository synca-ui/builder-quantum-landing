/**
 * Eine Zuordnung Schriftfamilie -> Tailwind-Klasse, für Vorschau UND
 * veröffentlichte Seite.
 *
 * WARUM DAS NÖTIG WURDE: Es gab zwei Vokabulare für dieselbe Sache.
 *   client/components/configurator/preview/TemplatePreviewContent.tsx  kannte "mono"
 *   client/components/dynamic/AppRenderer.tsx                          kannte "monospace"
 *   server/schemas/configuration.ts (Zod)                              erlaubte NUR "monospace"
 *   client/components/configurator/steps/DesignStep.tsx                schrieb "mono"
 *
 * Die Auswahl "Display" hatte damit drei Folgen auf einmal:
 *   1. In der Vorschau erschien eine Monospace-Schrift.
 *   2. Auf der veröffentlichten Seite fiel sie still auf font-sans zurück —
 *      obwohl der Kommentar in TemplatePreviewContent ausdrücklich verspricht,
 *      dass Vorschau und Seite identisch rendern.
 *   3. Das manuelle Speichern (POST /api/configurations) scheiterte am
 *      Zod-Enum mit HTTP 400. Der Fehler wurde nur geloggt, der Nutzer sah
 *      nichts — der Knopf sprang kommentarlos auf "idle" zurück.
 *
 * Ab hier gilt "monospace" als der eine gültige Wert (er ist der einzige, den
 * der Server annimmt). "mono" bleibt als Altbestand lesbar: Es liegt in
 * gespeicherten Entwürfen und im localStorage, und ein stiller Rückfall auf
 * eine andere Schrift wäre genau der Fehler, den diese Datei behebt.
 */

/** Der eine Wert je Schriftfamilie, den auch das Zod-Schema des Servers kennt. */
export type FontFamily = "sans-serif" | "serif" | "monospace";

const KLASSEN: Record<string, string> = {
  "sans-serif": "font-sans",
  serif: "font-serif",
  monospace: "font-mono",
  // Altbestand aus der Zeit, als der Konfigurator eigene Namen vergab.
  mono: "font-mono",
  sans: "font-sans",
  "sans serif": "font-sans",
};

/** Tailwind-Klasse zur gespeicherten Schriftfamilie. Unbekanntes -> font-sans. */
export function fontClassFor(fontFamily?: string | null): string {
  if (!fontFamily) return "font-sans";
  return KLASSEN[String(fontFamily).trim().toLowerCase()] ?? "font-sans";
}

/**
 * Bringt einen Altbestandswert auf die Schreibweise, die der Server annimmt.
 * Ohne das lehnt das Zod-Schema beim Speichern ab — mit HTTP 400 und ohne
 * sichtbare Meldung.
 */
export function normalizeFontFamily(fontFamily?: string | null): FontFamily {
  const k = String(fontFamily ?? "").trim().toLowerCase();
  if (k === "serif") return "serif";
  if (k === "monospace" || k === "mono") return "monospace";
  return "sans-serif";
}
