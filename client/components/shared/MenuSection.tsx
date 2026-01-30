/**
 * Shared MenuSection Component
 *
 * Zeigt das komplette Menü mit Kategorien, Gerichten und Preisen
 *
 * Wird verwendet in:
 * - TemplatePreviewContent.tsx (Editor)
 * - AppRenderer.tsx (Live-Seite)
 */

import React, { memo } from 'react';
import { CategoryFilter } from './CategoryFilter';
import type { MenuItem } from '@/types/domain';

// ============================================
// TYPES
// ============================================

export interface MenuSectionProps {
  /** Menü-Items mit Kategorien */
  menuItems: MenuItem[];
  /** Preisfarbe */
  priceColor?: string;
  /** Primärfarbe für Buttons */
  primaryColor: string;
  /** Schriftfarbe */
  fontColor: string;
  /** Hintergrundfarbe */
  backgroundColor: string;
  /** Aktuelle ausgewählte Kategorie */
  selectedCategory?: string;
  /** Callback für Kategorie-Änderung */
  onCategoryChange?: (category: string) => void;
  /** Callback für "In Warenkorb" */
  onAddToCart?: (item: MenuItem) => void;
  /** Preview-Modus (Editor) */
  isPreview?: boolean;
  /** Zusätzliche CSS-Klassen */
  className?: string;
}

// ============================================
// PRICE TAG COMPONENT
// ============================================

interface PriceTagProps {
  price: number;
  color?: string;
  currency?: string;
  className?: string;
}

const PriceTag = memo(({ price, color = '#000', currency = '€', className = '' }: PriceTagProps) => (
  <span
    className={`font-semibold ${className}`}
    style={{ color }}
  >
    {price.toFixed(2)} {currency}
  </span>
));

PriceTag.displayName = 'PriceTag';

// ============================================
// MAIN COMPONENT
// ============================================

export const MenuSection = memo(({
  menuItems = [],
  priceColor = '#000',
  primaryColor,
  fontColor,
  backgroundColor,
  selectedCategory = 'alle',
  onCategoryChange,
  onAddToCart,
  isPreview = false,
  className = ''
}: MenuSectionProps) => {
  // Kategorien extrahieren
  const categories = React.useMemo(() => {
    const uniqueCategories = new Set(menuItems.map(item => item.category));
    return ['alle', ...Array.from(uniqueCategories)];
  }, [menuItems]);

  // Gefilterte Items
  const filteredItems = React.useMemo(() => {
    if (selectedCategory === 'alle') return menuItems;
    return menuItems.filter(item => item.category === selectedCategory);
  }, [menuItems, selectedCategory]);

  if (!menuItems.length) {
    return (
      <section
        className={`py-16 px-4 ${className}`}
        style={{ backgroundColor, color: fontColor }}
      >
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Unsere Speisekarte</h2>
          <p className="text-gray-600">Menü wird geladen...</p>
        </div>
      </section>
    );
  }

  return (
    <section
      className={`${isPreview ? 'py-8' : 'py-16'} px-4 ${className}`}
      style={{ backgroundColor, color: fontColor }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Unsere Speisekarte</h2>
          <p className="text-lg opacity-80">Entdecken Sie unsere köstlichen Gerichte</p>
        </div>

        {/* Category Filter */}
        {categories.length > 2 && (
          <CategoryFilter
            categories={categories}
            activeCategory={selectedCategory === 'alle' ? null : selectedCategory}
            onCategoryChange={(category) => onCategoryChange?.(category || 'alle')}
            fontColor={fontColor}
            backgroundColor={backgroundColor}
            className="mb-8"
          />
        )}

        {/* Menu Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item, index) => (
            <div
              key={`${item.name}-${index}`}
              className="bg-white/5 backdrop-blur-sm rounded-lg p-6 border border-white/10 hover:border-white/20 transition-colors"
            >
              {/* Item Image */}
              {(item.image?.url || item.imageUrl) && (
                <div className="aspect-video mb-4 overflow-hidden rounded-lg">
                  <img
                    src={item.image?.url || item.imageUrl}
                    alt={item.image?.alt || item.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Item Info */}
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold">{item.name}</h3>
                {item.price && (
                  <PriceTag
                    price={typeof item.price === 'string' ? parseFloat(item.price) : item.price}
                    color={priceColor}
                    className="ml-4 flex-shrink-0"
                  />
                )}
              </div>

              {/* Description */}
              {item.description && (
                <p className="text-sm opacity-80 mb-4 line-clamp-2">
                  {item.description}
                </p>
              )}

              {/* Category Badge */}
              {item.category && selectedCategory === 'alle' && (
                <span
                  className="inline-block px-3 py-1 text-xs rounded-full text-white mb-4"
                  style={{ backgroundColor: primaryColor }}
                >
                  {item.category}
                </span>
              )}

              {/* Add to Cart Button (if callback provided) */}
              {onAddToCart && !isPreview && (
                <button
                  onClick={() => onAddToCart(item)}
                  className="w-full py-2 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: primaryColor }}
                >
                  In Warenkorb
                </button>
              )}
            </div>
          ))}
        </div>

        {/* No items message */}
        {filteredItems.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg opacity-60">
              Keine Gerichte in der Kategorie "{selectedCategory}" gefunden.
            </p>
          </div>
        )}
      </div>
    </section>
  );
});

MenuSection.displayName = 'MenuSection';

// Export PriceTag separately for reuse
export { PriceTag };
