/**
 * Angebots-Banner auf der Startseite — EINE Komponente für
 * Konfigurator-Vorschau und veröffentlichte Seite.
 *
 * Der Betreiber wählt im Angebote-Schritt, OB das Banner erscheint, in
 * welcher GRÖSSE (klein/mittel/groß) und in welchen Farben. Gezeigt wird
 * das erste Angebot; der Klick führt auf die Angebote-Seite.
 *
 *  - klein:  schmale Zeile — Icon, Text, Preis. Dezent über den Highlights.
 *  - mittel: Karte mit Name, Beschreibung, Preis und Pfeil.
 *  - groß:   prominente Karte, mit Bild (falls vorhanden) und CTA-Knopf.
 */
import React from "react";
import { Tag, ArrowRight } from "lucide-react";
import { normalizeImageSrc } from "@/lib/helpers";
import { formatOfferPrice, type OfferItem } from "./OffersSection";

export type OfferBannerSize = "small" | "medium" | "large";

export interface OfferBannerConfig {
  enabled?: boolean;
  size?: string;
  text?: string;
  backgroundColor?: string;
  textColor?: string;
  buttonColor?: string;
}

interface OfferBannerProps {
  offers: OfferItem[];
  banner: OfferBannerConfig;
  onShowOffers: () => void;
}

export function OfferBanner({ offers, banner, onShowOffers }: OfferBannerProps) {
  const offer = offers[0];
  if (!banner?.enabled || !offer) return null;

  const size: OfferBannerSize =
    banner.size === "small" || banner.size === "large"
      ? banner.size
      : "medium";
  const bg = banner.backgroundColor || "#000000";
  const fg = banner.textColor || "#FFFFFF";
  const btn = banner.buttonColor || "#FFFFFF";
  const name = offer.name || (offer as any).title || "Angebot";
  const price = formatOfferPrice(offer.price);
  const line = banner.text || `${name}${price ? ` · ${price}` : ""}`;

  if (size === "small") {
    return (
      <button
        type="button"
        onClick={onShowOffers}
        className="w-full max-w-md mx-auto mb-6 flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
        style={{ backgroundColor: bg, color: fg }}
      >
        <Tag className="w-4 h-4 shrink-0" />
        <span className="truncate">{line}</span>
        <ArrowRight className="w-4 h-4 shrink-0" />
      </button>
    );
  }

  if (size === "large") {
    return (
      <button
        type="button"
        onClick={onShowOffers}
        className="block w-full max-w-2xl mx-auto mb-8 rounded-2xl overflow-hidden text-left shadow-xl hover:shadow-2xl hover:scale-[1.01] transition-all"
        style={{ backgroundColor: bg, color: fg }}
      >
        {offer.image && (
          <div className="aspect-[5/2] overflow-hidden">
            <img
              src={normalizeImageSrc(offer.image)}
              alt={name}
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="p-5 md:p-6 space-y-2">
          <div className="flex items-baseline justify-between gap-4">
            <h3 className="font-bold text-lg md:text-xl">{name}</h3>
            {price && (
              <span className="font-bold text-lg md:text-xl whitespace-nowrap">
                {price}
              </span>
            )}
          </div>
          {(banner.text || offer.description) && (
            <p className="text-sm opacity-85">
              {banner.text || offer.description}
            </p>
          )}
          <span
            className="inline-flex items-center gap-2 mt-2 px-4 py-2 rounded-full text-sm font-bold"
            style={{
              backgroundColor: btn,
              color: bg,
            }}
          >
            Zu den Angeboten <ArrowRight className="w-4 h-4" />
          </span>
        </div>
      </button>
    );
  }

  // "medium" (Standard)
  return (
    <button
      type="button"
      onClick={onShowOffers}
      className="w-full max-w-md mx-auto mb-6 flex items-center gap-4 rounded-2xl px-5 py-4 text-left shadow-lg hover:opacity-95 transition-opacity"
      style={{ backgroundColor: bg, color: fg }}
    >
      <Tag className="w-6 h-6 shrink-0" />
      <span className="flex-1 min-w-0">
        <span className="block font-bold truncate">{name}</span>
        {(banner.text || offer.description) && (
          <span className="block text-xs opacity-80 truncate">
            {banner.text || offer.description}
          </span>
        )}
      </span>
      {price && (
        <span className="font-bold whitespace-nowrap">{price}</span>
      )}
      <ArrowRight className="w-5 h-5 shrink-0" />
    </button>
  );
}
