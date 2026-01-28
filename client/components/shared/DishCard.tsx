/**
 * Shared DishCard Component
 *
 * Karte für Menü-Items (Highlights und Speisekarte)
 *
 * WICHTIG: Nutzt CSS-Variablen für Rundungen und Schatten!
 * - borderRadius: 'var(--radius-card)'
 * - boxShadow: 'var(--shadow-card)'
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from 'react';
import { Plus } from 'lucide-react';
import type { MenuItem } from '@/types/domain';

// ============================================
// TYPES
// ============================================

export interface DishCardProps {
  /** Menu Item Daten */
  item: MenuItem;
  /** Schriftfarbe */
  fontColor: string;
  /** Preisfarbe (unabhängig von Primary) */
  priceColor: string;
  /** Primärfarbe für Add-Button */
  primaryColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Template-ID für Style-Varianten */
  template?: string;
  /** Online-Bestellung aktiviert? (zeigt Add-Button) */
  onlineOrdering?: boolean;
  /** Bilder auf Homepage anzeigen? */
  showImage?: boolean;
  /** Klick auf die Karte (öffnet Modal) */
  onClick?: () => void;
  /** Zum Warenkorb hinzufügen */
  onAddToCart?: (item: MenuItem) => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// HELPER: Bild-URL normalisieren
// ============================================

function normalizeImageSrc(img: unknown): string {
  if (!img) return '/placeholder.svg';
  if (typeof img === 'string') return img;

  const imgObj = img as { url?: string; file?: File };
  if (imgObj.url) return imgObj.url;

  if (typeof File !== 'undefined' && imgObj.file instanceof File) {
    return URL.createObjectURL(imgObj.file);
  }

  return '/placeholder.svg';
}

// ============================================
// HELPER: Template-spezifische Card-Styles
// ============================================

function getTemplateCardStyle(template: string): React.CSSProperties {
  switch (template) {
    case 'modern':
      return {
        background: 'rgba(255,255,255,0.1)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.2)',
      };
    case 'stylish':
      return {
        background: '#FFFFFF',
        border: '1px solid rgba(0,0,0,0.05)',
      };
    case 'cozy':
      return {
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(245,158,11,0.1)',
      };
    case 'minimalist':
    default:
      return {
        background: 'transparent',
        borderBottom: '1px solid currentColor',
        borderBottomColor: 'rgba(0,0,0,0.1)',
      };
  }
}

// ============================================
// COMPONENT
// ============================================

export const DishCard = memo(function DishCard({
  item,
  fontColor,
  priceColor,
  primaryColor,
  backgroundColor,
  template = 'minimalist',
  onlineOrdering = false,
  showImage = false,
  onClick,
  onAddToCart,
  isPreview = false,
  className = '',
}: DishCardProps) {

  const handleClick = () => {
    if (onClick) onClick();
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation(); // Verhindere Card-Click
    if (onAddToCart) onAddToCart(item);
  };

  const templateStyle = getTemplateCardStyle(template);
  const isMinimalist = template === 'minimalist';

  // Preis formatieren
  const formattedPrice = typeof item.price === 'number'
    ? `${item.price.toFixed(2)}€`
    : item.price
      ? `${item.price}€`
      : '';

  // Bild-URL
  const imageUrl = item.imageUrl || (item.image ? normalizeImageSrc(item.image) : null);

  return (
    <article
      className={`
        cursor-pointer transition-transform active:scale-[0.98]
        ${isMinimalist ? 'py-5 last:border-0' : 'p-4 mb-4'}
        ${className}
      `}
      style={{
        ...templateStyle,
        borderRadius: isMinimalist ? '0' : 'var(--radius-card, 16px)',
        boxShadow: isMinimalist ? 'none' : 'var(--shadow-card, 0 4px 12px rgba(0,0,0,0.08))',
        color: fontColor,
      }}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`${item.name} - ${formattedPrice}`}
    >
      <div className="flex justify-between items-start gap-3">
        {/* Left: Image (optional) */}
        {showImage && imageUrl && (
          <div
            className="w-16 h-16 shrink-0 overflow-hidden"
            style={{ borderRadius: 'var(--radius-card, 12px)' }}
          >
            <img
              src={imageUrl}
              alt={item.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
        )}

        {/* Center: Name + Description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {/* Emoji (wenn vorhanden) */}
            {item.emoji && (
              <span className="text-lg">{item.emoji}</span>
            )}

            {/* Name */}
            <h3
              className="text-base font-bold leading-tight truncate"
              style={{ color: fontColor }}
            >
              {item.name}
            </h3>
          </div>

          {/* Description */}
          {item.description && (
            <p
              className="text-xs opacity-70 mt-1 leading-snug line-clamp-2"
              style={{ color: fontColor }}
            >
              {item.description}
            </p>
          )}

          {/* Category Badge (optional) */}
          {item.category && !isMinimalist && (
            <span
              className="inline-block mt-2 px-2 py-0.5 text-[10px] font-medium opacity-60"
              style={{
                backgroundColor: `${fontColor}10`,
                borderRadius: 'var(--radius-button, 4px)',
              }}
            >
              {item.category}
            </span>
          )}
        </div>

        {/* Right: Price + Add Button */}
        <div className="flex flex-col items-end gap-2 pl-2 shrink-0">
          {/* Price */}
          <span
            className="text-lg font-bold whitespace-nowrap"
            style={{ color: priceColor }}
          >
            {formattedPrice}
          </span>

          {/* Add to Cart Button */}
          {onlineOrdering && (
            <button
              onClick={handleAddToCart}
              className="w-8 h-8 flex items-center justify-center transition-transform active:scale-90"
              style={{
                backgroundColor: primaryColor,
                color: '#FFFFFF',
                borderRadius: 'var(--radius-button, 50%)',
                boxShadow: 'var(--shadow-button, 0 2px 8px rgba(0,0,0,0.15))',
              }}
              aria-label={`${item.name} zum Warenkorb hinzufügen`}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Availability Badge */}
      {item.available === false && (
        <div
          className="mt-2 px-2 py-1 text-xs font-medium text-center"
          style={{
            backgroundColor: 'rgba(239,68,68,0.1)',
            color: '#EF4444',
            borderRadius: 'var(--radius-button, 4px)',
          }}
        >
          Aktuell nicht verfügbar
        </div>
      )}
    </article>
  );
});

export default DishCard;

