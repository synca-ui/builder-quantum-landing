/**
 * Angebote-Seite — EINE Komponente für Konfigurator-Vorschau und
 * veröffentlichte Seite.
 *
 * Anlass: Der Navigationspunkt "Angebote" existierte in beiden Renderern,
 * die Seite dahinter in keinem — wer im Konfigurator Angebote anlegte und
 * den Tab aktivierte, schickte seine Gäste auf "404 – Seite nicht gefunden".
 */
import React from "react";
import { Tag } from "lucide-react";
import { normalizeImageSrc } from "@/lib/helpers";

export interface OfferItem {
  name?: string;
  description?: string;
  price?: string | number;
  image?: string | null;
}

interface OffersSectionProps {
  offers: OfferItem[];
  titleClass: string;
  bodyClass: string;
  priceColor: string;
  fontColor: string;
}

/** "9.99" / 9.99 / "9,99" → "9,99 €"; Freitext bleibt unangetastet. */
export function formatOfferPrice(price: string | number | undefined): string {
  if (price == null || price === "") return "";
  const num = Number(String(price).replace(",", "."));
  if (Number.isFinite(num)) {
    return `${num.toFixed(2).replace(".", ",")} €`;
  }
  return String(price);
}

export function OffersSection({
  offers,
  titleClass,
  bodyClass,
  priceColor,
  fontColor,
}: OffersSectionProps) {
  return (
    <div className="space-y-6 md:space-y-10 animate-in fade-in duration-300">
      <h2 className={titleClass}>Angebote</h2>

      {offers.length === 0 ? (
        <div className="text-center py-16 opacity-60">
          <Tag className="w-10 h-10 mx-auto mb-4 opacity-50" />
          <p className={bodyClass}>Aktuell gibt es keine Angebote.</p>
        </div>
      ) : (
        <div
          // Spaltenzahl nach CONTAINER-Breite, nicht nach Viewport: Diese
          // Komponente läuft auch im 360px-Telefonrahmen der Vorschau,
          // während das Browserfenster breit ist — ein md:-Präfix würde dort
          // fälschlich zwei gequetschte Spalten erzwingen.
          className="grid gap-4 md:gap-6"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          }}
        >
          {offers.map((offer, i) => (
            <div
              key={i}
              className="rounded-2xl border border-current/10 bg-white/5 overflow-hidden shadow-sm backdrop-blur-sm"
            >
              {offer.image && (
                <div className="aspect-[2/1] overflow-hidden">
                  <img
                    src={normalizeImageSrc(offer.image)}
                    alt={offer.name || (offer as any).title || "Angebot"}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="p-5 md:p-6 space-y-2">
                <div className="flex items-baseline justify-between gap-4">
                  <h3
                    className="font-bold text-base md:text-lg"
                    style={{ color: fontColor }}
                  >
                    {offer.name || (offer as any).title}
                  </h3>
                  {formatOfferPrice(offer.price) && (
                    <span
                      className="font-bold text-base md:text-lg whitespace-nowrap"
                      style={{ color: priceColor }}
                    >
                      {formatOfferPrice(offer.price)}
                    </span>
                  )}
                </div>
                {offer.description && (
                  <p className={`${bodyClass} opacity-80`}>
                    {offer.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
