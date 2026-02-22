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
import { X, ChevronLeft, ChevronRight, Camera } from "lucide-react";
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

  // Debug Log
  console.log("[DishModal] Images:", {
    dish: dish.name,
    rawImageUrl: dish.imageUrl,
    rawImage: dish.image,
    rawImagesArray: dish.images,
    normalizedImages: images,
  });

  const hasImages = images.length > 0;
  const hasMultipleImages = images.length > 1;
  const currentImage = images[currentImageIndex] || "/placeholder.svg";

  // Preis formatieren
  const formattedPrice =
    typeof dish.price === "number"
      ? `${dish.price.toFixed(2)}€`
      : dish.price
        ? `${dish.price}€`
        : "";

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
          // ✅ Fallback wenn keine Bilder vorhanden
          <div className="relative w-full h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
            <div className="text-center text-gray-400">
              <Camera className="w-12 h-12 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium opacity-50">
                Kein Bild verfügbar
              </p>
            </div>

            {/* ✅ Close Button auch ohne Bild */}
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
