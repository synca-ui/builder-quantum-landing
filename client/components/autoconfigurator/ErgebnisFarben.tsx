/**
 * Farben direkt am Ergebnis anpassen (A2.3).
 *
 * Bis hierher stand auf der Ergebnisseite des automatischen Modus nur der Satz
 * "Alles lässt sich danach im Konfigurator ändern" — für die Farben also:
 * 15 Schritte durchklicken, um einen Grünton zu ändern, den man sofort sieht.
 *
 * WARUM NICHT das ColorInput aus DesignStep.tsx:
 * Das ist ein 64px-Feld mit Beschriftung, Hex-Eingabe und Hinweis-Symbol — die
 * richtige Form für einen eigenen Bildschirm, auf dem Farben das Thema sind.
 * Hier stehen sie in einer schmalen Seitenspalte neben Speisekarte, Bildern und
 * Öffnungszeiten. Das ist eine andere Aufgabe, keine zweite Umsetzung
 * derselben.
 *
 * DIE HINTERGRUNDFARBE WIRD ENTSCHÄRFT, AUCH WENN DER WIRT SIE SELBST WÄHLT —
 * und zwar sichtbar: Der Farbtupfer zeigt sofort den Ton, der tatsächlich
 * ausgeliefert wird. A4.1 verlangt die weiche Farbe als Regel im Code. Sie
 * still im Hintergrund anzuwenden hieße, dem Wirt eine andere Farbe zu zeigen
 * als die, die er bekommt.
 */
import { useCallback } from "react";
import {
  deriveCohesiveColors,
  softenBackground,
} from "@shared/autoPublish";
import type { DesignConfig } from "@shared/suggestedConfig";

export interface ErgebnisFarbenProps {
  design: Partial<DesignConfig>;
  onChange: (design: Partial<DesignConfig>) => void;
}

/** Was der Wirt anfassen darf. Alles Weitere leitet sich daraus ab. */
const FELDER = [
  { key: "primaryColor", label: "Primär", hinweis: "Knöpfe und Akzente" },
  { key: "secondaryColor", label: "Sekundär", hinweis: "Preise und Details" },
  { key: "backgroundColor", label: "Hintergrund", hinweis: "Seitengrund" },
] as const;

export function ErgebnisFarben({ design, onChange }: ErgebnisFarbenProps) {
  const setzen = useCallback(
    (key: (typeof FELDER)[number]["key"], wert: string) => {
      const naechste: Partial<DesignConfig> = { ...design, [key]: wert };

      /*
       * Die abgeleiteten Farben (Schrift, Preise, Kopfzeile) müssen neu
       * berechnet werden — sonst steht nach einem Wechsel auf einen dunklen
       * Grund weiterhin dunkle Schrift darauf. deriveCohesiveColors füllt nur
       * LEERE Felder, deshalb werden die abgeleiteten vorher entfernt.
       */
      delete naechste.fontColor;
      delete naechste.priceColor;
      delete naechste.headerFontColor;
      delete naechste.headerBackgroundColor;

      onChange(deriveCohesiveColors(naechste));
    },
    [design, onChange],
  );

  return (
    <div className="p-3.5 rounded-xl border border-gray-200 bg-white">
      <p className="text-xs font-semibold text-gray-800 mb-2.5">Farben</p>
      <div className="space-y-2">
        {FELDER.map(({ key, label, hinweis }) => {
          // Für den Hintergrund den Ton zeigen, der wirklich ausgeliefert wird.
          const roh = design[key] ?? "#ffffff";
          const gezeigt =
            key === "backgroundColor" ? (softenBackground(roh) ?? roh) : roh;
          return (
            <label
              key={key}
              className="flex items-center gap-2.5 cursor-pointer group"
            >
              <input
                type="color"
                value={gezeigt}
                onChange={(e) => setzen(key, e.target.value)}
                aria-label={`${label} – ${hinweis}`}
                className="w-8 h-8 shrink-0 rounded-lg cursor-pointer border border-gray-300 group-hover:border-teal-400 transition-colors"
                style={{ WebkitAppearance: "none", padding: "2px" }}
              />
              <span className="min-w-0">
                <span className="block text-xs font-medium text-gray-700">
                  {label}
                </span>
                <span className="block text-[11px] text-gray-400 truncate">
                  {hinweis}
                </span>
              </span>
              <span className="ml-auto font-mono text-[11px] uppercase text-gray-400">
                {gezeigt}
              </span>
            </label>
          );
        })}
      </div>
      <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">
        Der Seitengrund bleibt immer weich — kräftige Töne werden abgemildert,
        damit die Karte lesbar bleibt.
      </p>
    </div>
  );
}

export default ErgebnisFarben;
