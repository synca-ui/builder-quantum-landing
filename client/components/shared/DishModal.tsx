/**
 * Shared DishModal Component
 *
 * Interaktives Bottom-Sheet für Gericht-Details
 *
 * WICHTIG: Nutzt CSS-Variablen für Rundungen und Schatten!
 * - borderRadius: 'var(--radius-modal)'
 * - boxShadow: 'var(--shadow-modal)'
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo, useCallback, useEffect } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import type { MenuItem } from "@/types/domain";

// ============================================
// TYPES
// ============================================

export interface DishModalProps {
  /** Das anzuzeigende Gericht (null = Modal geschlossen) */
  dish: MenuItem | null;
  /** Aktueller Bild-Index bei mehreren Bildern */
  currentImageIndex?: number;
  /** Schriftfarbe */
  fontColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Preisfarbe */
  priceColor: string;
  /** Primärfarbe für Buttons */
  primaryColor: string;
  /** Online-Bestellung aktiviert? */
  onlineOrdering?: boolean;
  /** Modal schließen */
  onClose: () => void;
  /** Vorheriges Bild */
  onPrevImage?: () => void;
  /** Nächstes Bild */
  onNextImage?: () => void;
  /** Bild-Index setzen */
  onSetImageIndex?: (index: number) => void;
  /** Zum Warenkorb hinzufügen */
  onAddToCart?: (dish: MenuItem) => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /**
   * Was die Kuerzel am Gericht bedeuten, wie die Karte selbst es angibt:
   * { "a1": "Weizen", "f": "Milch/Laktose" }.
   *
   * Kommt aus content.allergenLegend und ist je Betrieb verschieden — beim
   * einen Wirt ist "f" die Milch, beim anderen "g". Fehlt die Legende, wird
   * das Kuerzel roh angezeigt statt geraten.
   */
  allergenLegend?: Record<string, string>;
}

// ============================================
// HELPER: Bild-URL normalisieren
// ============================================

function normalizeImageSrc(img: unknown): string {
  // Null/Undefined
  if (!img) return "/placeholder.svg";

  // Direkter String
  if (typeof img === "string") {
    if (img.trim() === "") return "/placeholder.svg";
    return img;
  }

  // Object mit url Property
  if (typeof img === "object") {
    const imgObj = img as { url?: string; file?: File };

    // url Property
    if (imgObj.url && typeof imgObj.url === "string") {
      return imgObj.url;
    }

    // File Object (Browser)
    if (typeof File !== "undefined" && imgObj.file instanceof File) {
      try {
        return URL.createObjectURL(imgObj.file);
      } catch (e) {
        console.error("[normalizeImageSrc] File to URL failed:", e);
      }
    }
  }

  // Fallback
  console.warn("[normalizeImageSrc] Could not normalize:", img);
  return "/placeholder.svg";
}

// ============================================
// COMPONENT
// ============================================

export const DishModal = memo(function DishModal({
  dish,
  currentImageIndex = 0,
  fontColor,
  backgroundColor,
  priceColor,
  primaryColor,
  onlineOrdering = false,
  onClose,
  onPrevImage,
  onNextImage,
  onSetImageIndex,
  onAddToCart,
  isPreview = false,
  allergenLegend,
}: DishModalProps) {
  // Scroll-Lock wenn Modal offen
  useEffect(() => {
    if (dish) {
      document.body.style.overflow = "hidden";
      document.body.style.touchAction = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    }

    return () => {
      document.body.style.overflow = "";
      document.body.style.touchAction = "";
    };
  }, [dish]);

  // ESC-Taste zum Schließen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dish) {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [dish, onClose]);

  const handleAddToCart = useCallback(() => {
    if (dish && onAddToCart) {
      onAddToCart(dish);
      onClose();
    }
  }, [dish, onAddToCart, onClose]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleContentClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // Nicht rendern wenn kein Gericht
  if (!dish) return null;

  // Bilder sammeln
  const images: string[] = [];

  // Priorität 1: imageUrl (direkter String)
  if (
    dish.imageUrl &&
    typeof dish.imageUrl === "string" &&
    dish.imageUrl.trim() !== ""
  ) {
    images.push(dish.imageUrl);
  }

  // Priorität 2: image (kann Object oder String sein)
  if (dish.image) {
    const imgSrc = normalizeImageSrc(dish.image);
    if (imgSrc && imgSrc !== "/placeholder.svg" && !images.includes(imgSrc)) {
      images.push(imgSrc);
    }
  }

  // Priorität 3: images Array
  if (dish.images && Array.isArray(dish.images) && dish.images.length > 0) {
    dish.images.forEach((img) => {
      const imgSrc = normalizeImageSrc(img);
      if (imgSrc && imgSrc !== "/placeholder.svg" && !images.includes(imgSrc)) {
        images.push(imgSrc);
      }
    });
  }

  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentImageIndex] || "/placeholder.svg";

  // Preis formatieren
  const preisText = (wert: number | string | undefined): string =>
    typeof wert === "number" ? `${wert.toFixed(2)}€` : wert ? `${wert}€` : "";

  const formattedPrice = preisText(dish.price);

  // ============================================
  // RENDER: Modal mit Bildern
  // ============================================

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md flex items-end animate-in fade-in duration-200"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${dish.name} Details`}
    >
      {/* Bottom Sheet */}
      <div
        className="w-full max-h-[90%] overflow-hidden animate-in slide-in-from-bottom duration-300"
        style={{
          backgroundColor,
          color: fontColor,
          borderTopLeftRadius: "var(--radius-modal, 24px)",
          borderTopRightRadius: "var(--radius-modal, 24px)",
          boxShadow: "var(--shadow-modal, 0 -10px 40px rgba(0,0,0,0.2))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Grabber Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-12 h-1.5 rounded-full"
            style={{ backgroundColor: `${fontColor}30` }}
          />
        </div>

        {/* ✅ FIX: Image Section mit Close Button */}
        {hasImages ? (
          <div className="relative w-full h-48 overflow-hidden bg-gray-900">
            <img
              src={currentImage}
              alt={dish.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error("[DishModal] Image load error:", currentImage);
                e.currentTarget.src = "/placeholder.svg";
              }}
            />

            {/* ✅ Close Button - Höchste Priorität */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-3 right-3 w-10 h-10 bg-black/70 text-white rounded-full flex items-center justify-center hover:bg-black/90 transition-colors shadow-xl z-[80]"
              aria-label="Schließen"
              style={{
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
              }}
            >
              <X className="w-5 h-5" />
            </button>

            {/* Navigation Buttons (wenn mehrere Bilder) */}
            {hasMultipleImages && (
              <>
                {/* Previous Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPrevImage?.();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-[70]"
                  aria-label="Vorheriges Bild"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                {/* Next Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onNextImage?.();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 transition-colors z-[70]"
                  aria-label="Nächstes Bild"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Dots Indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-[70]">
                  {images.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetImageIndex?.(idx);
                      }}
                      className={`h-2 rounded-full transition-all ${
                        idx === currentImageIndex
                          ? "bg-white w-4"
                          : "bg-white/50 w-2"
                      }`}
                      aria-label={`Bild ${idx + 1} von ${images.length}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          /*
           * Kein Bild -> kein Bildbereich. Vorher stand hier ein 192 px hoher
           * grauer Kasten mit Kamerasymbol und "Kein Bild verfügbar". Der hat
           * nichts gezeigt, aber den halben Bildschirm belegt und die
           * Speisekarte ärmer aussehen lassen, als sie ist: Bei einer
           * automatisch erkannten Karte hat FAST NIE ein Gericht ein Bild —
           * der Wirt lädt sie später einzeln nach. Ein leerer Rahmen war damit
           * der Normalfall, nicht die Ausnahme.
           *
           * Der Schließen-Knopf muss bleiben, er hing vorher am Bildbereich.
           * Deshalb hier eine schmale Zeile statt gar nichts.
           */
          <div className="relative h-11">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="absolute top-0 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-colors z-[80]"
              aria-label="Schließen"
              style={{
                backgroundColor: `${fontColor}12`,
                color: fontColor,
              }}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Dish Details */}
        <div className="p-5 space-y-3 overflow-y-auto max-h-[40vh]">
          {/* Header: Name + Price */}
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <h2
                className="text-xl font-bold leading-tight"
                style={{ color: fontColor }}
              >
                {dish.emoji && <span className="mr-2">{dish.emoji}</span>}
                {dish.name}
              </h2>

              {dish.category && (
                <span
                  className="inline-block mt-1 px-2 py-0.5 text-xs font-medium opacity-60"
                  style={{
                    backgroundColor: `${fontColor}10`,
                    borderRadius: "var(--radius-button, 4px)",
                  }}
                >
                  {dish.category}
                </span>
              )}
            </div>

            <span
              className="text-2xl font-bold whitespace-nowrap"
              style={{ color: priceColor }}
            >
              {formattedPrice}
            </span>
          </div>

          {/* Description */}
          {dish.description && (
            <p
              className="text-sm opacity-80 leading-relaxed"
              style={{ color: fontColor }}
            >
              {dish.description}
            </p>
          )}

          {/*
            Varianten und Aufpreise (A1.2): "große Portion 4,00", "mit extra
            Käse 1,20", "Tasse".

            Sie MÜSSEN hier stehen. Solange die Erkennung nach Regeln lief,
            wurden Varianten fälschlich zu eigenen Gerichten — falsch, aber für
            den Gast wenigstens sichtbar. Seit die Strukturierung über ein
            Modell läuft, hängen sie korrekt als extras am Gericht — und ohne
            diesen Block verschwänden sie damit vollständig von der Karte.
            Die Verbesserung hätte den Wirt also Zeilen gekostet, die er vorher
            hatte.
          */}
          {Array.isArray(dish.extras) && dish.extras.length > 0 && (
            <div className="pt-1">
              <p
                className="text-xs font-semibold opacity-60 mb-1"
                style={{ color: fontColor }}
              >
                Dazu wählbar
              </p>
              <ul className="space-y-1">
                {dish.extras.map((extra, i) => (
                  <li
                    key={`${extra.name}-${i}`}
                    className="flex items-baseline justify-between gap-3 text-sm"
                    style={{ color: fontColor }}
                  >
                    <span className="opacity-90">{extra.name}</span>
                    {extra.price ? (
                      <span
                        className="shrink-0 font-medium tabular-nums"
                        style={{ color: priceColor }}
                      >
                        {preisText(extra.price)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Ernährungs-Labels (A1.3): vegan, vegetarisch, glutenfrei … */}
          {Array.isArray(dish.labels) && dish.labels.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {dish.labels.map((label) => (
                <span
                  key={label}
                  className="px-2 py-0.5 text-xs font-medium capitalize"
                  style={{
                    backgroundColor: `${primaryColor}1f`,
                    color: fontColor,
                    borderRadius: "var(--radius-button, 6px)",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/*
            Allergene und Zusatzstoffe (A1.3).
            Ausgeschrieben, wenn die Karte eine Legende mitbringt — sonst das
            rohe Kürzel. Nicht geraten: Was "f" bedeutet, legt jeder Betrieb
            selbst fest, und eine falsche Allergenangabe ist schlimmer als
            eine unaufgelöste.
          */}
          {Array.isArray(dish.allergens) && dish.allergens.length > 0 && (
            <div className="pt-1">
              <p
                className="text-xs font-semibold opacity-60 mb-1"
                style={{ color: fontColor }}
              >
                Allergene und Zusatzstoffe
              </p>
              <div className="flex flex-wrap gap-1.5">
                {dish.allergens.map((code) => {
                  const klartext = allergenLegend?.[code.toLowerCase()];
                  return (
                    <span
                      key={code}
                      className="px-2 py-0.5 text-xs"
                      style={{
                        backgroundColor: `${fontColor}12`,
                        color: fontColor,
                        borderRadius: "var(--radius-button, 6px)",
                      }}
                      title={klartext ? `${klartext} (${code})` : `Kürzel ${code}`}
                    >
                      {klartext ?? code}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Availability Warning */}
          {dish.available === false && (
            <div
              className="px-3 py-2 text-sm font-medium text-center"
              style={{
                backgroundColor: "rgba(239,68,68,0.1)",
                color: "#EF4444",
                borderRadius: "var(--radius-button, 8px)",
              }}
            >
              Dieses Gericht ist aktuell nicht verfügbar
            </div>
          )}

          {/* Add to Cart Button */}
          {onlineOrdering && dish.available !== false && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (dish && onAddToCart) {
                  onAddToCart(dish);
                  onClose();
                }
              }}
              className="w-full py-3 font-bold text-white shadow-lg mt-4 transition-transform active:scale-[0.98]"
              style={{
                backgroundColor: primaryColor,
                borderRadius: "var(--radius-button, 12px)",
                boxShadow: "var(--shadow-button, 0 4px 14px rgba(0,0,0,0.15))",
              }}
            >
              Zum Warenkorb hinzufügen
            </button>
          )}

          {/* Close Button Alternative (für Barrierefreiheit) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-full py-3 font-medium border transition-colors mt-2"
            style={{
              borderColor: `${fontColor}20`,
              color: fontColor,
              borderRadius: "var(--radius-button, 12px)",
            }}
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
});

export default DishModal;
