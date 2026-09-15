import { memo } from "react";
import { DishCard } from "@/components/shared/DishCard";
import { getTemplateDesignDefaults } from "@/lib/templateTokens";
import { getTemplateLayout } from "@/lib/templateLayout";
import { getTemplateWrapperStyle } from "@/lib/templateWrapperStyle";
import type { MenuItem } from "@/types/domain";

/**
 * Stilprobe einer Vorlage für den Picker: Hintergrund, Titelschrift und zwei
 * Gerichtzeilen genau so, wie die Vorlage sie später rendert.
 *
 * Vorher bestand die Template-Wahl aus 16 reinen Textkarten. "Egyptienne mit
 * Doppelrahmen und Strichlinien zum Preis" sagt einem Wirt nichts; er musste
 * jede Karte anklicken und dann rechts im Telefon nachsehen. Die Stilprobe
 * zeigt das Wesentliche direkt in der Karte.
 *
 * Kein Screenshot und keine zweite Beschreibung des Looks: Die Probe nimmt
 * dieselben Quellen wie Vorschau und Live-Seite — Palette aus
 * templateTokens, Schrift und Zeilenform aus templateLayout, Hintergrund aus
 * templateWrapperStyle und die echte DishCard. Ändert sich die Vorlage,
 * ändert sich die Probe mit; sie kann nicht veralten.
 *
 * Die Probe ist ein Bild, kein Bedienelement: aria-hidden, keine Zeiger-
 * Ereignisse (der Klick geht an die Karte darum herum), Texte sind fest.
 */
const PROBE_GERICHTE: MenuItem[] = [
  {
    id: "stilprobe-1",
    name: "Tagessuppe",
    description: "Mit frischen Kräutern und Brot",
    price: 6.5,
    category: "Vorspeisen",
    available: true,
  },
  {
    id: "stilprobe-2",
    name: "Hausgemachte Pasta",
    description: "Tomate, Basilikum, Parmesan",
    price: 14.9,
    category: "Hauptgerichte",
    available: true,
  },
];

/** Breite, in der die Vorlage gerendert wird — wie das Telefon der Vorschau. */
const PROBE_BREITE = 360;
/** Verkleinerung auf Kartenbreite; die Karte im Picker ist etwa 290 px breit. */
const PROBE_MASSSTAB = 0.62;

export const TemplateStilprobe = memo(function TemplateStilprobe({
  template,
}: {
  template: string;
}) {
  const farben = getTemplateDesignDefaults(template);
  const layout = getTemplateLayout(template);
  const huelle = getTemplateWrapperStyle(template, {
    backgroundColor: farben.backgroundColor,
    secondaryColor: farben.secondaryColor,
    fontColor: farben.fontColor,
  });

  return (
    <div
      aria-hidden
      data-testid={`stilprobe-${template}`}
      className="relative h-40 overflow-hidden rounded-lg border border-black/5 pointer-events-none select-none"
      style={huelle}
    >
      <div
        className="origin-top-left"
        style={{ width: PROBE_BREITE, transform: `scale(${PROBE_MASSSTAB})` }}
      >
        <div
          className="px-5 pt-5 pb-3"
          style={{
            fontFamily: layout.schrift.display,
            color: farben.headerFontColor,
          }}
        >
          <div className="text-[24px] font-semibold leading-tight">
            Dein Geschäft
          </div>
          <div className="text-[13px] opacity-70 mt-1">Restaurant in Köln</div>
        </div>
        <div className="px-5 flex flex-col gap-2">
          {PROBE_GERICHTE.map((gericht, index) => (
            <DishCard
              key={gericht.id}
              item={gericht}
              index={index}
              template={template}
              fotoForm="zeile"
              showImage={false}
              isPreview
              fontColor={farben.fontColor}
              priceColor={farben.priceColor}
              primaryColor={farben.primaryColor}
              secondaryColor={farben.secondaryColor}
              backgroundColor={farben.backgroundColor}
            />
          ))}
        </div>
      </div>
    </div>
  );
});
